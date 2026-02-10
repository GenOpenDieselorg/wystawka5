const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const db = require('../config/database');
const authenticate = require('../middleware/auth');
const checkResourceOwnership = require('../middleware/ownership'); // Import ownership middleware
const { detectDataScraping } = require('../middleware/security');
const marketplaceServices = require('../services/marketplace');
const walletService = require('../services/walletService');
const eanDbService = require('../services/eanDb');
const axios = require('axios');
const logActivity = require('../utils/activityLogger');
const crypto = require('crypto');
const { decrypt } = require('../utils/encryption');
const { scanFile } = require('../utils/fileScanner'); // SECURITY: File scanning for malware detection

// SECURITY: Whitelist of allowed domains for remote image URLs (prevents SSRF)
const { validatePath } = require('../utils/pathValidator'); // Import path validator
const { validateUrl, safeAxiosRequest } = require('../utils/ssrfValidator');

const ALLOWED_IMAGE_DOMAINS = [
  'allegro.pl',
  'a.allegroimg.com',
  'assets.allegrostatic.com',
  'ean-search.org',
  'images.ean-search.org',
  'ean-db.com',
  'product-images.ean-db.com',
  'openapi.ean-db.com',
  'cdn.olx.pl',
  'apollo-ireland.akamaized.net' // OLX CDN
];

// SECURITY: Whitelist of allowed MIME types for file uploads
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
];

// SECURITY: Validate remote image URL to prevent SSRF attacks
const isAllowedImageUrl = async (url) => {
  try {
    // Validate protocol and IP/DNS (SSRF protection)
    const validation = await validateUrl(url);
    if (!validation.safe) {
      console.warn(`Blocked potentially unsafe URL: ${url} (${validation.error})`);
      return false;
    }

    const parsed = new URL(url);
    
    // Only allow HTTPS
    if (parsed.protocol !== 'https:') {
      return false;
    }
    
    // Check if domain is in whitelist
    const hostname = parsed.hostname.toLowerCase();
    return ALLOWED_IMAGE_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch (e) {
    return false;
  }
};

// SECURITY: Validate image content using sharp (magic bytes check) + file scanner (malware detection)
const validateImageContent = async (filePath, mimeType = 'image/jpeg') => {
  try {
    // SECURITY: First scan file for malware and suspicious content
    const scanResult = await scanFile(filePath, mimeType);
    if (!scanResult.valid) {
      throw new Error(`File scan failed: ${scanResult.errors.join(', ')}`);
    }

    // SECURITY: Validate image format using sharp
    const metadata = await sharp(filePath).metadata();
    const validFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif'];
    if (!validFormats.includes(metadata.format)) {
      throw new Error(`Invalid image format: ${metadata.format}`);
    }
    return true;
  } catch (error) {
    throw new Error(`Image validation failed: ${error.message}`);
  }
};

// SECURITY: Generate cryptographically secure random filename using UUID
const generateSecureFilename = (originalExt) => {
  const uuid = crypto.randomUUID();
  const ext = originalExt.toLowerCase().replace(/[^a-z0-9.]/g, '') || '.jpg';
  return `${uuid}${ext}`;
};

// Helper to charge wallet when offer becomes ready
const checkAndChargeIfReady = async (userId, productId, newStatus) => {
  if (newStatus === 'ready') {
    // Check if already charged
    const [existingCharges] = await db.execute(
      'SELECT * FROM transactions WHERE user_id = ? AND product_id = ? AND type = ? AND status = ?',
      [userId, productId, 'offer_creation', 'completed']
    );
    
    if (existingCharges.length === 0) {
      // Calculate price
      const wallet = await walletService.getUserWallet(userId);
      const offersCreated = parseInt(wallet.offers_created || 0);
      const offerPrice = walletService.calculateOfferPrice(offersCreated);
      
      // Get product name for description
      let description = 'Wystawienie oferty';
      try {
        const [products] = await db.execute('SELECT product_name FROM products WHERE id = ?', [productId]);
        if (products.length > 0) {
          description = `Wystawienie oferty: ${products[0].product_name}`;
        }
      } catch (e) {
        console.error('Error fetching product name for charge:', e);
      }

      // Charge wallet
      await walletService.chargeWallet(userId, offerPrice, 'offer_creation', productId, null, description);
      
      // Update offers_created count
      const newOffersCreated = offersCreated + 1;
      await db.execute(
        'UPDATE wallet SET offers_created = ? WHERE user_id = ?',
        [newOffersCreated, userId]
      );
      
      return true; // Charged
    }
  }
  return false; // Not charged (not ready or already charged)
};

// Helper function to get product with images
const getProductWithImages = async (productId) => {
  const [products] = await db.execute(
    'SELECT * FROM products WHERE id = ? AND deleted_at IS NULL',
    [productId]
  );
  
  if (products.length === 0) return null;
  
  const [images] = await db.execute(
    'SELECT * FROM product_images WHERE product_id = ?',
    [productId]
  );
  
  return {
    ...products[0],
    images: images.map(img => ({
      id: img.id,
      url: img.image_url,
      processedUrl: img.processed_image_url,
      isPrimary: img.is_primary
    }))
  };
};

// Helper function to get products with images for a user
const getProductsWithImages = async (userId) => {
  const [products] = await db.execute(
    'SELECT * FROM products WHERE user_id = ? AND deleted_at IS NULL',
    [userId]
  );
  
  const productsWithImages = await Promise.all(
    products.map(async (product) => {
      const [images] = await db.execute(
        'SELECT * FROM product_images WHERE product_id = ?',
        [product.id]
      );
      
      return {
        ...product,
        images: images.map(img => ({
          id: img.id,
          url: img.image_url,
          processedUrl: img.processed_image_url,
          isPrimary: img.is_primary
        }))
      };
    })
  );
  
  // Sort by created_at DESC
  return productsWithImages.sort((a, b) => 
    new Date(b.created_at) - new Date(a.created_at)
  );
};

// Get category parameters
router.get('/categories/:categoryId/parameters', authenticate, async (req, res) => {
  try {
    const { categoryId } = req.params;
    const userId = req.userId;

    // Check if user has Allegro integration
    const [integrations] = await db.execute(
      'SELECT * FROM marketplace_integrations WHERE marketplace = ? AND user_id = ? AND is_active = ?',
      ['allegro', userId, true]
    );
    
    if (integrations.length === 0 || !integrations[0].access_token) {
      return res.status(400).json({ error: 'Allegro integration not active' });
    }

    const accessToken = decrypt(integrations[0].access_token);
    const parameters = await marketplaceServices.getCategoryParameters('allegro', accessToken, categoryId);
    
    res.json({ parameters });
  } catch (error) {
    console.error('Get category parameters error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/products';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // SECURITY: Use cryptographically secure random filename (UUID)
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, generateSecureFilename(ext));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    // SECURITY: Whitelist of allowed MIME types
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`));
    }
  }
});

// Helper function to extract data from Allegro product
const extractAllegroProductData = (allegroProduct) => {
  if (!allegroProduct) return null;

  const data = {
    name: allegroProduct.name || null,
    categoryId: allegroProduct.category ? allegroProduct.category.id : null,
    description: null,
    manufacturer: null,
    dimensions: {
      width: null,
      height: null,
      depth: null,
      weight: null
    },
    images: []
  };

  // Extract manufacturer from parameters
  if (allegroProduct.parameters && Array.isArray(allegroProduct.parameters)) {
    // Save all parameters for future use
    data.parameters = allegroProduct.parameters;
    
    const manufacturerParam = allegroProduct.parameters.find(p => 
      p.name === 'Kod producenta' || p.name === 'Producent'
    );
    if (manufacturerParam && manufacturerParam.values && manufacturerParam.values.length > 0) {
      data.manufacturer = manufacturerParam.values[0];
    }
  }

  // Extract images
  if (allegroProduct.images && Array.isArray(allegroProduct.images)) {
    data.images = allegroProduct.images.map(img => img.url).filter(Boolean);
  }

  return data;
};

// Lookup EAN data (with Allegro fallback option B)
router.post('/lookup-ean/:ean', authenticate, async (req, res) => {
  try {
    const { ean } = req.params;
    const { allegroProduct } = req.body; // Optional Allegro product data
    
    // Try EAN-DB first
    const productData = await eanDbService.getProduct(ean);
    
    if (productData) {
      return res.json(productData);
    }

    // Option B: Use Allegro product data if provided
    if (allegroProduct) {
      const allegroData = extractAllegroProductData(allegroProduct);
      if (allegroData) {
        return res.json({
          ...allegroData,
          ean: ean,
          source: 'allegro'
        });
      }
    }

    return res.status(404).json({ error: 'Product not found in EAN-DB and no Allegro data provided' });
  } catch (error) {
    console.error('EAN lookup error:', error);
    res.status(500).json({ error: 'Server error during EAN lookup' });
  }
});

// Helper function to search product in Allegro API (NO CACHING - fresh request every time)
const searchAllegroProductByEan = async (userId, ean) => {
  try {
    // Check if user has Allegro integration
    const [integrations] = await db.execute(
      'SELECT * FROM marketplace_integrations WHERE marketplace = ? AND user_id = ? AND is_active = ?',
      ['allegro', userId, true]
    );
    
    if (integrations.length === 0 || !integrations[0].access_token) {
      return null;
    }

    const accessToken = decrypt(integrations[0].access_token);

    // Search product in Allegro Catalog by EAN/Code - NO CACHING
    const timestamp = Date.now();
    
    const isGtin = /^\d{8,14}$/.test(ean);
    
    const params = {
      phrase: ean,
      _t: timestamp // Cache buster
    };

    if (isGtin) {
      params.mode = 'GTIN';
    }
    
    const response = await axios.get(`https://api.allegro.pl/sale/products`, {
      params,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.allegro.public.v1+json',
        'Accept-Language': 'pl-PL',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    if (response.data.products && response.data.products.length > 0) {
      return response.data.products.slice(0, 10);
    }

    return null;
  } catch (error) {
    console.error('Allegro product search error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      ean: ean
    });
    return null;
  }
};

// GET endpoint for EAN lookup
router.get('/lookup-ean/:ean', authenticate, async (req, res) => {
  try {
    const { ean } = req.params;
    const userId = req.userId;
    
    // Step 1 & 2: Try AI/EAN-DB service (AI is primary)
    const productData = await eanDbService.getProduct(ean);
    
    if (productData) {
      return res.json(productData);
    }

    // Step 3: Check user preferences for Allegro EAN lookup
    const [preferences] = await db.execute(
      'SELECT use_allegro_ean_lookup FROM user_preferences WHERE user_id = ?',
      [userId]
    );
    
    const useAllegroEanLookup = preferences.length === 0 || (preferences[0].use_allegro_ean_lookup !== false && preferences[0].use_allegro_ean_lookup !== 0);
    
    // Step 4: Try Allegro API if AI/EAN-DB didn't return data AND user has enabled it
    if (useAllegroEanLookup) {
      const allegroProducts = await searchAllegroProductByEan(userId, ean);
      
      if (allegroProducts && Array.isArray(allegroProducts)) {
        const candidates = allegroProducts.map(prod => {
            const data = extractAllegroProductData(prod);
            return data ? { ...data, ean: ean, source: 'allegro', originalId: prod.id } : null;
        }).filter(Boolean);

        if (candidates.length > 0) {
          return res.json({
            ...candidates[0],
            candidates: candidates
          });
        }
      }
    }

    const errorMsg = useAllegroEanLookup 
      ? 'Product not found in AI, EAN-DB, or Allegro' 
      : 'Product not found in AI or EAN-DB (Allegro lookup disabled)';
      
    return res.status(404).json({ error: errorMsg });
  } catch (error) {
    console.error('EAN lookup error:', error);
    res.status(500).json({ error: 'Server error during EAN lookup' });
  }
});

// Create product (draft)
router.post('/', authenticate, upload.array('images', 10), async (req, res) => {
  try {
    let { eanCode, catalogCode, productName, price, vatRate, parameters, description } = req.body;
    const userId = req.userId;

    if (!productName && !eanCode && !catalogCode) {
      return res.status(400).json({ error: 'Product name or code is required' });
    }

    let manufacturer = req.body.manufacturer || null;
    let width = req.body.width || null;
    let height = req.body.height || null;
    let depth = req.body.depth || null;
    let weight = req.body.weight || null;

    let productData = null;
    if (eanCode && (!productName || !description)) {
      try {
        productData = await eanDbService.getProduct(eanCode);
        if (productData) {
          if (productData.name) {
            productName = productData.name;
          }
          if (productData.description && !description) {
            description = productData.description;
          }
          if (productData.manufacturer && !manufacturer) {
            manufacturer = productData.manufacturer;
          }
          if (productData.dimensions) {
            if (!width) width = productData.dimensions.width;
            if (!height) height = productData.dimensions.height;
            if (!depth) depth = productData.dimensions.depth;
            if (!weight) weight = productData.dimensions.weight;
          }
        }
      } catch (err) {
        console.error('Error fetching data from EAN-DB:', err);
      }
    }

    if (!productData && req.body.allegroProduct) {
      const allegroData = extractAllegroProductData(req.body.allegroProduct);
      if (allegroData) {
        if (allegroData.parameters) {
          parameters = allegroData.parameters;
        }
        if (allegroData.name) {
          productName = allegroData.name;
        }
        if (allegroData.manufacturer) {
          manufacturer = allegroData.manufacturer;
        }
        if (allegroData.images && allegroData.images.length > 0) {
          if (!req.body.remoteImages) {
            req.body.remoteImages = allegroData.images;
          } else {
            const existingImages = Array.isArray(req.body.remoteImages) 
              ? req.body.remoteImages 
              : [req.body.remoteImages];
            const mergedImages = [...existingImages];
            allegroData.images.forEach(imgUrl => {
              if (!mergedImages.includes(imgUrl)) {
                mergedImages.push(imgUrl);
              }
            });
            req.body.remoteImages = mergedImages;
          }
        }
      }
    }

    const initialStatus = 'draft';

    const [result] = await db.execute(
      'INSERT INTO products (user_id, ean_code, catalog_code, product_name, price, vat_rate, status, description, manufacturer, width, height, depth, weight, parameters) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        userId, 
        eanCode || null, 
        catalogCode || null, 
        productName || null, 
        price || null, 
        vatRate || '23%',
        initialStatus,
        description || null,
        manufacturer || null,
        width || null,
        height || null,
        depth || null,
        weight || null,
        parameters ? JSON.stringify(parameters) : null
      ]
    );

    const productId = result.insertId;

    // Helper to process and save an image from a path (local or downloaded)
    // Always create a completely new file with UUID
    const processAndSaveImage = async (inputPath, originalFilename, isPrimary) => {
      const uniqueId = crypto.randomUUID();
      const compressedFilename = `${uniqueId}.jpg`; // Always use clean UUID filename
      const uploadDir = 'uploads/products';
      const compressedPath = path.join(uploadDir, compressedFilename);

      try {
        // SECURITY: Validate file content before processing
        await validateImageContent(inputPath);

        await sharp(inputPath)
          .jpeg({ quality: 85, mozjpeg: true })
          .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
          .toFile(compressedPath);

        // Delete temp file if it's a download
        if (inputPath.includes('temp-')) {
          fs.unlinkSync(inputPath);
        }

        const imageUrl = `/uploads/products/${compressedFilename}`;
        return db.execute(
          'INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, ?)',
          [productId, imageUrl, isPrimary]
        );
      } catch (error) {
        console.error('Error processing image:', originalFilename, error);
        if (inputPath.includes('temp-') && fs.existsSync(inputPath)) {
          fs.unlinkSync(inputPath);
        }
      }
    };

    // Handle remote images (URLs) and local generated images
    if (req.body.remoteImages) {
      const remoteImages = Array.isArray(req.body.remoteImages) ? req.body.remoteImages : [req.body.remoteImages];
      
      const remoteImagePromises = remoteImages.map(async (url, index) => {
        try {
          // Check if it's a local file path (generated or processed images)
          // Handle both relative paths and full URLs pointing to our own server
          let localPath = null;
          if (url.startsWith('/uploads/generated/') || url.startsWith('/uploads/processed/') || url.startsWith('uploads/generated/') || url.startsWith('uploads/processed/')) {
            localPath = url.startsWith('/') ? url.substring(1) : url;
          } else if (url.includes('/uploads/generated/') || url.includes('/uploads/processed/')) {
            // Full URL pointing to our server - extract the path
            const urlMatch = url.match(/\/(uploads\/(?:generated|processed)\/[^?#]+)/);
            if (urlMatch) {
              localPath = urlMatch[1];
            }
          }
          
          if (localPath) {
            // It's a local file - use it directly
            let fullPath;
            try {
              // SECURITY: Validate path before reading
              const resolved = path.isAbsolute(localPath) ? localPath : path.join(process.cwd(), localPath);
              fullPath = validatePath(resolved);
            } catch (e) {
              console.warn('Invalid local path:', e.message);
              return;
            }
            
            if (fs.existsSync(fullPath)) {
              const isPrimary = (!req.files || req.files.length === 0) && index === 0;
              await processAndSaveImage(fullPath, path.basename(fullPath), isPrimary);
            } else {
              console.warn(`Local image file not found: ${fullPath}`);
            }
            return;
          }

          if (!(await isAllowedImageUrl(url))) {
            console.warn('Blocked remote image from untrusted or unsafe domain:', url);
            return;
          }

          const response = await safeAxiosRequest({
            url,
            method: 'GET',
            responseType: 'stream',
            timeout: 30000,
            maxContentLength: 10 * 1024 * 1024,
            maxBodyLength: 10 * 1024 * 1024
          });

          const tempFilename = `temp-${generateSecureFilename('.jpg')}`;
          const tempPath = path.join('uploads/products', tempFilename);
          
          const writer = fs.createWriteStream(tempPath);
          response.data.pipe(writer);

          await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
          });

          const isPrimary = (!req.files || req.files.length === 0) && index === 0;
          await processAndSaveImage(tempPath, 'remote-image.jpg', isPrimary);
        } catch (error) {
          console.error('Error downloading remote image:', url, error.message);
        }
      });
      
      await Promise.all(remoteImagePromises);
    }

    // Save and compress uploaded images
    if (req.files && req.files.length > 0) {
      const imagePromises = req.files.map(async (file, index) => {
        const originalPath = file.path;
        
        const [existing] = await db.execute('SELECT * FROM product_images WHERE product_id = ?', [productId]);
        const isPrimary = existing.length === 0 && index === 0;

        // Generate completely new unique filename for the compressed version
        const uniqueId = crypto.randomUUID();
        const compressedFilename = `${uniqueId}.jpg`;
        const compressedPath = path.join(path.dirname(originalPath), compressedFilename);
        
        try {
          // SECURITY: Validate file content
          await validateImageContent(originalPath);

          await sharp(originalPath)
            .jpeg({ 
              quality: 85,
              mozjpeg: true
            })
            .resize(1920, 1920, {
              fit: 'inside',
              withoutEnlargement: true
            })
            .toFile(compressedPath);
          
          // Delete original raw upload
          if (fs.existsSync(originalPath)) {
            fs.unlinkSync(originalPath);
          }
          
          const imageUrl = `/uploads/products/${compressedFilename}`;
          return db.execute(
            'INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, ?)',
            [productId, imageUrl, isPrimary]
          );
        } catch (error) {
          console.error('Error compressing image:', file.filename, error);
          if (fs.existsSync(originalPath)) {
            fs.unlinkSync(originalPath);
          }
          return null;
        }
      });
      await Promise.all(imagePromises);
    }

    const product = await getProductWithImages(productId);

    if (product.product_name && product.price && (product.ean_code || product.catalog_code) && product.images && product.images.length > 0) {
      try {
        await checkAndChargeIfReady(userId, productId, 'ready');
        await db.execute('UPDATE products SET status = ? WHERE id = ?', ['ready', productId]);
        product.status = 'ready';
      } catch (e) {
        console.error('Failed to charge for ready status on creation:', e);
      }
    }

    await logActivity(req, userId, 'product_created', { productId, productName: productName || 'Bez nazwy' });

    res.status(201).json({
      message: 'Product created successfully',
      product: product || { id: productId, images: [] }
    });
  } catch (error) {
    console.error('Product creation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's products
router.get('/', authenticate, detectDataScraping, async (req, res) => {
  try {
    const userId = req.userId;

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    const products = await getProductsWithImages(userId);

    res.json({ products });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get analytics data
router.get('/analytics', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Get all products for user
    const [products] = await db.execute(
      "SELECT created_at FROM transactions WHERE user_id = ? AND type = 'offer_creation' AND status = 'completed' ORDER BY created_at DESC",
      [userId]
    );

    // Get activities for user (AI generation + Manual updates)
    const [activities] = await db.execute(
        "SELECT created_at, type, details FROM user_activities WHERE user_id = ? AND type IN ('ai_description_generated', 'ai_bulk_description_generated', 'description_updated') ORDER BY created_at DESC",
        [userId]
    );
    
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    
    const dailyData = {};
    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgo);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      dailyData[dateKey] = {
          count: 0,
          aiCount: 0,
          descriptionChanges: 0
      };
    }
    
    products.forEach(product => {
      if (product.created_at) {
        const productDate = new Date(product.created_at);
        if (productDate >= thirtyDaysAgo && productDate <= today) {
          const dateKey = productDate.toISOString().split('T')[0];
          if (dailyData.hasOwnProperty(dateKey)) {
            dailyData[dateKey].count++;
          }
        }
      }
    });

    const monthlyChanges = {};
    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    for (let i = 0; i < 6; i++) {
        const d = new Date(sixMonthsAgo);
        d.setMonth(d.getMonth() + i);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = d.toLocaleDateString('pl-PL', { month: 'short', year: 'numeric' });
        monthlyChanges[monthKey] = {
            month: monthKey,
            monthLabel,
            count: 0
        };
    }

    activities.forEach(activity => {
        if (activity.created_at) {
            const activityDate = new Date(activity.created_at);
            const dateKey = activityDate.toISOString().split('T')[0];
            const monthKey = `${activityDate.getFullYear()}-${String(activityDate.getMonth() + 1).padStart(2, '0')}`;
            
            let changeCount = 0;
            if (activity.type === 'ai_description_generated' || activity.type === 'description_updated') {
                changeCount = 1;
            } else if (activity.type === 'ai_bulk_description_generated') {
                 try {
                    const details = typeof activity.details === 'string' ? JSON.parse(activity.details) : activity.details;
                    changeCount = details.count || 1;
                 } catch (e) {
                     changeCount = 1;
                 }
            }

            if (activityDate >= thirtyDaysAgo && activityDate <= today) {
                if (dailyData.hasOwnProperty(dateKey)) {
                    if (activity.type.startsWith('ai_')) {
                        dailyData[dateKey].aiCount += changeCount;
                    }
                    dailyData[dateKey].descriptionChanges += changeCount;
                }
            }

            if (monthlyChanges.hasOwnProperty(monthKey)) {
                monthlyChanges[monthKey].count += changeCount;
            }
        }
    });
    
    const chartData = Object.keys(dailyData)
      .sort()
      .map(date => ({
        date: date,
        dateFormatted: new Date(date).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' }),
        count: dailyData[date].count,
        aiCount: dailyData[date].aiCount,
        descriptionChanges: dailyData[date].descriptionChanges
      }));
    
    const monthlyDescriptionChanges = Object.values(monthlyChanges).sort((a, b) => a.month.localeCompare(b.month));
    
    res.json({ data: chartData, monthlyDescriptionChanges });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all images for gallery (all images from user's products)
router.get('/gallery', authenticate, async (req, res) => {
  try {
    const userId = req.userId;

    // Get all products for the user
    const [products] = await db.execute(
      'SELECT id, product_name FROM products WHERE user_id = ? AND deleted_at IS NULL',
      [userId]
    );

    // Get all images for these products
    const productIds = products.map(p => p.id);
    if (productIds.length === 0) {
      return res.json({ images: [] });
    }

    const placeholders = productIds.map(() => '?').join(',');
    const [images] = await db.execute(
      `SELECT 
        pi.id,
        pi.product_id,
        pi.image_url,
        pi.processed_image_url,
        pi.is_primary,
        pi.created_at,
        p.product_name
      FROM product_images pi
      INNER JOIN products p ON pi.product_id = p.id
      WHERE pi.product_id IN (${placeholders})
      ORDER BY pi.created_at DESC`,
      productIds
    );

    // Build image list with both original and processed images
    const allImages = [];
    images.forEach(img => {
      // Add original image if exists
      if (img.image_url) {
        allImages.push({
          id: `orig-${img.id}`,
          imageId: img.id,
          productId: img.product_id,
          productName: img.product_name,
          url: img.image_url,
          type: 'original',
          isPrimary: img.is_primary,
          createdAt: img.created_at
        });
      }
      // Add processed image if exists
      if (img.processed_image_url) {
        allImages.push({
          id: `proc-${img.id}`,
          imageId: img.id,
          productId: img.product_id,
          productName: img.product_name,
          url: img.processed_image_url,
          type: 'processed',
          isPrimary: img.is_primary,
          createdAt: img.created_at
        });
      }
    });

    res.json({ images: allImages });
  } catch (error) {
    console.error('Get gallery images error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== WAREHOUSE (MAGAZYN) ENDPOINTS ==========

// Get warehouse items (products with status 'done' and their marketplace listings)
router.get('/warehouse', authenticate, async (req, res) => {
  try {
    const userId = req.userId;

    // Get all 'done' and 'sold' products for user
    const [products] = await db.execute(
      'SELECT * FROM products WHERE user_id = ? AND status IN (?, ?) AND deleted_at IS NULL ORDER BY updated_at DESC',
      [userId, 'done', 'sold']
    );

    if (products.length === 0) {
      return res.json({ products: [] });
    }

    // Get images and marketplace listings for these products
    const productsWithData = await Promise.all(
      products.map(async (product) => {
        const [images] = await db.execute(
          'SELECT * FROM product_images WHERE product_id = ?',
          [product.id]
        );

        let listings = [];
        try {
          const [listingRows] = await db.execute(
            'SELECT * FROM marketplace_listings WHERE product_id = ? AND user_id = ?',
            [product.id, userId]
          );
          listings = listingRows;
        } catch (e) {
          // Table might not exist yet
          console.warn('marketplace_listings table might not exist:', e.message);
        }

        return {
          ...product,
          images: images.map(img => ({
            id: img.id,
            url: img.image_url,
            processedUrl: img.processed_image_url,
            isPrimary: img.is_primary
          })),
          listings: listings.map(l => ({
            id: l.id,
            marketplace: l.marketplace,
            externalId: l.external_id,
            status: l.status,
            createdAt: l.created_at
          }))
        };
      })
    );

    res.json({ products: productsWithData });
  } catch (error) {
    console.error('Get warehouse products error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single product
router.get('/:id', authenticate, checkResourceOwnership('products'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Ownership already checked by middleware, but we need product data
    // We can just query by ID now since we know it belongs to user (or middleware would have failed)
    const [products] = await db.execute(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );

    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = await getProductWithImages(id);

    res.json({ product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add images to existing product
router.post('/:id/images', authenticate, checkResourceOwnership('products'), upload.array('images', 10), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const [products] = await db.execute(
      'SELECT * FROM products WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const productId = parseInt(id);
    const addedImages = [];

    // Helper to process and save an image
    const processAndSaveImage = async (inputPath, originalFilename) => {
      const uniqueId = crypto.randomUUID();
      const compressedFilename = `${uniqueId}.jpg`;
      const uploadDir = 'uploads/products';
      const compressedPath = path.join(uploadDir, compressedFilename);

      try {
        // SECURITY: Validate file content
        await validateImageContent(inputPath);

        await sharp(inputPath)
          .jpeg({ quality: 85, mozjpeg: true })
          .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
          .toFile(compressedPath);

        // Delete temp file if it's a download
        if (inputPath.includes('temp-')) {
          fs.unlinkSync(inputPath);
        }

        const imageUrl = `/uploads/products/${compressedFilename}`;
        const [result] = await db.execute(
          'INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, ?)',
          [productId, imageUrl, false]
        );
        
        return { id: result.insertId, url: imageUrl };
      } catch (error) {
        console.error('Error processing image:', originalFilename, error);
        if (inputPath.includes('temp-') && fs.existsSync(inputPath)) {
          fs.unlinkSync(inputPath);
        }
        return null;
      }
    };

    // Handle remote images (URLs from EAN/Allegro) and local generated images
    if (req.body.remoteImages) {
      const remoteImages = Array.isArray(req.body.remoteImages) ? req.body.remoteImages : [req.body.remoteImages];
      
      for (const url of remoteImages) {
        try {
          // Check if it's a local file path (generated or processed images)
          // Handle both relative paths and full URLs pointing to our own server
          let localPath = null;
          if (url.startsWith('/uploads/generated/') || url.startsWith('/uploads/processed/') || url.startsWith('uploads/generated/') || url.startsWith('uploads/processed/')) {
            localPath = url.startsWith('/') ? url.substring(1) : url;
          } else if (url.includes('/uploads/generated/') || url.includes('/uploads/processed/')) {
            // Full URL pointing to our server - extract the path
            const urlMatch = url.match(/\/(uploads\/(?:generated|processed)\/[^?#]+)/);
            if (urlMatch) {
              localPath = urlMatch[1];
            }
          }
          
          if (localPath) {
            // It's a local file - use it directly
            let fullPath;
            try {
              // SECURITY: Validate path before reading
              const resolved = path.isAbsolute(localPath) ? localPath : path.join(process.cwd(), localPath);
              fullPath = validatePath(resolved);
            } catch (e) {
              console.warn('Invalid local path:', e.message);
              continue; // Skip invalid paths
            }
            
            if (fs.existsSync(fullPath)) {
              const result = await processAndSaveImage(fullPath, path.basename(fullPath));
              if (result) {
                addedImages.push(result);
              }
            } else {
              console.warn(`Local image file not found: ${fullPath}`);
            }
            continue;
          }

          // SECURITY: Validate URL to prevent SSRF attacks
          if (!isAllowedImageUrl(url)) {
            console.warn(`Blocked remote image from untrusted domain: ${url}`);
            continue;
          }

          const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream',
            timeout: 30000,
            maxContentLength: 10 * 1024 * 1024, // 10MB limit
            maxBodyLength: 10 * 1024 * 1024     // 10MB limit
          });

          // SECURITY: Use cryptographically secure filename
          const tempFilename = `temp-${generateSecureFilename('.jpg')}`;
          const tempPath = path.join('uploads/products', tempFilename);
          
          const writer = fs.createWriteStream(tempPath);
          response.data.pipe(writer);

          await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
          });

          const result = await processAndSaveImage(tempPath, 'remote-image.jpg');
          if (result) {
            addedImages.push(result);
          }
        } catch (error) {
          console.error('Error downloading remote image:', url, error.message);
        }
      }
    }

    // Handle uploaded images
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const originalPath = file.path;
        
        const uniqueId = crypto.randomUUID();
        const compressedFilename = `${uniqueId}.jpg`;
        const compressedPath = path.join(path.dirname(originalPath), compressedFilename);
        
        try {
          // SECURITY: Validate file content
          await validateImageContent(originalPath);

          await sharp(originalPath)
            .jpeg({ quality: 85, mozjpeg: true })
            .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
            .toFile(compressedPath);
          
          if (fs.existsSync(originalPath)) {
            fs.unlinkSync(originalPath);
          }
          
          const imageUrl = `/uploads/products/${compressedFilename}`;
          const [result] = await db.execute(
            'INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, ?)',
            [productId, imageUrl, false]
          );
          
          addedImages.push({ id: result.insertId, url: imageUrl });
        } catch (error) {
          console.error('Error compressing image:', file.filename, error);
          // SECURITY: Delete failed upload
          if (fs.existsSync(originalPath)) {
            fs.unlinkSync(originalPath);
          }
        }
      }
    }

    // Check if we can promote to 'ready'
    const [prodRows] = await db.execute('SELECT * FROM products WHERE id = ?', [productId]);
    if (prodRows.length > 0 && prodRows[0].status === 'draft') {
      const p = prodRows[0];
      // We know we just added images so count >= 1.
      if (p.product_name && p.price && (p.ean_code || p.catalog_code)) {
        try {
          await checkAndChargeIfReady(userId, productId, 'ready');
          await db.execute('UPDATE products SET status = ? WHERE id = ?', ['ready', productId]);
        } catch (err) {
          console.error('Failed to charge for ready status:', err);
          // If insufficient funds, we don't update status
          // But continue to return success for image upload
        }
      }
    }

    // Get updated product with all images
    const product = await getProductWithImages(productId);

    res.json({
      message: 'Images added successfully',
      addedImages,
      product
    });
  } catch (error) {
    console.error('Add images error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete single image from product
router.delete('/:id/images/:imageId', authenticate, checkResourceOwnership('products'), async (req, res) => {
  try {
    const { id, imageId } = req.params;
    
    // Verify image belongs to product (ownership of product checked by middleware)
    const [images] = await db.execute(
      'SELECT * FROM product_images WHERE id = ? AND product_id = ?',
      [imageId, id]
    );

    if (images.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const image = images[0];

    // Delete image files
    if (image.image_url) {
      try {
        const imagePath = path.join(__dirname, '../..', image.image_url);
        // SECURITY: Validate path before deletion
        const safePath = validatePath(imagePath);
        if (fs.existsSync(safePath)) {
          fs.unlinkSync(safePath);
        }
      } catch (e) {
        console.warn('File deletion skipped:', e.message);
      }
    }
    if (image.processed_image_url) {
      try {
        const processedPath = path.join(__dirname, '../..', image.processed_image_url);
        // SECURITY: Validate path before deletion
        const safePath = validatePath(processedPath);
        if (fs.existsSync(safePath)) {
          fs.unlinkSync(safePath);
        }
      } catch (e) {
        console.warn('File deletion skipped:', e.message);
      }
    }

    // Delete from database
    await db.execute('DELETE FROM product_images WHERE id = ?', [imageId]);

    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update product
router.put('/:id', authenticate, checkResourceOwnership('products'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { description, productName, eanCode, catalogCode, status, price, vatRate, parameters, width, height, depth, weight, manufacturer } = req.body;

    // Get product data (ownership confirmed by middleware)
    const [products] = await db.execute(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );

    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Log description change if it's being updated and is different
    if (description !== undefined && description !== products[0].description) {
       await logActivity(req, userId, 'description_updated', {
          productId: id,
          type: 'manual',
          oldLength: products[0].description ? products[0].description.length : 0,
          newLength: description ? description.length : 0
       });
    }

    const oldStatus = products[0].status;
    let newStatus = status || products[0].status;

    // Auto-promote to 'ready' if draft and all requirements are met
    if (newStatus === 'draft') {
       const pName = productName || products[0].product_name;
       const pPrice = price !== undefined ? price : products[0].price;
       const pEan = eanCode !== undefined ? eanCode : products[0].ean_code;
       const pCatalog = catalogCode !== undefined ? catalogCode : products[0].catalog_code;
       
       // Check images
       const [images] = await db.execute('SELECT * FROM product_images WHERE product_id = ?', [id]);
       const hasImages = images.length > 0;

       if (pName && pPrice && (pEan || pCatalog) && hasImages) {
          newStatus = 'ready';
       }
    }

    // Charge wallet if status is becoming 'ready'
    if (newStatus === 'ready' && oldStatus !== 'ready') {
      try {
        await checkAndChargeIfReady(userId, id, 'ready');
      } catch (err) {
        console.error('Failed to charge for ready status:', err);
        return res.status(402).json({ error: 'Niewystarczające saldo aby aktywować ofertę (status Ready).' });
      }
    }

    // Normalize decimal fields: convert empty strings to null
    const normalizeDecimal = (value, defaultValue) => {
      if (value === undefined) return defaultValue;
      if (value === '' || value === null) return null;
      return value;
    };

    // Update product - including ean_code, catalog_code, vat_rate, parameters, dimensions and manufacturer
    // Extra safety: ensure user_id matches
    await db.execute(
      'UPDATE products SET description = ?, product_name = ?, price = ?, vat_rate = ?, status = ?, ean_code = ?, catalog_code = ?, parameters = ?, width = ?, height = ?, depth = ?, weight = ?, manufacturer = ? WHERE id = ? AND user_id = ?',
      [
        description || products[0].description, 
        productName || products[0].product_name, 
        price !== undefined ? price : products[0].price, 
        vatRate !== undefined ? vatRate : (products[0].vat_rate || '23%'),
        newStatus,
        eanCode !== undefined ? eanCode : products[0].ean_code,
        catalogCode !== undefined ? catalogCode : products[0].catalog_code,
        parameters ? JSON.stringify(parameters) : (products[0].parameters || null),
        normalizeDecimal(width, products[0].width),
        normalizeDecimal(height, products[0].height),
        normalizeDecimal(depth, products[0].depth),
        normalizeDecimal(weight, products[0].weight),
        manufacturer !== undefined ? manufacturer : products[0].manufacturer,
        id,
        userId
      ]
    );

    // Update processed images if provided
    if (req.body.processedImages) {
      for (const img of req.body.processedImages) {
        await db.execute(
          'UPDATE product_images SET processed_image_url = ? WHERE id = ? AND product_id = ?',
          [img.processedUrl, img.id, id]
        );
      }
    }

    res.json({ message: 'Product updated successfully' });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

    // Publish product (change status to 'done')
router.patch('/:id/publish', authenticate, checkResourceOwnership('products'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Get current offer price based on user's history
    const wallet = await walletService.getUserWallet(userId);
    const offersCreated = parseInt(wallet.offers_created || 0);
    const OFFER_PRICE = walletService.calculateOfferPrice(offersCreated);

    // Get product (ownership confirmed by middleware)
    const [products] = await db.execute(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );

    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (products[0].status !== 'ready') {
      return res.status(400).json({ error: 'Product must be ready to publish' });
    }

    // Check if product was already charged (to avoid double charging on retry)
    const [existingCharges] = await db.execute(
      'SELECT * FROM transactions WHERE user_id = ? AND product_id = ? AND type = ? AND status = ?',
      [userId, id, 'offer_creation', 'completed']
    );
    const alreadyCharged = existingCharges.length > 0;

    // Get product with images
    const product = await getProductWithImages(id);
    
    // Get all active integrations for user
    const [integrations] = await db.execute(
      'SELECT * FROM marketplace_integrations WHERE user_id = ? AND is_active = ?',
      [userId, true]
    );

    // Get base URL for images
    const baseUrl = req.protocol + '://' + req.get('host');

    // Publish to all active marketplaces
    const publishResults = [];
    if (integrations.length > 0) {
      for (const integration of integrations) {
        try {
          const decryptedIntegration = {
            ...integration,
            access_token: decrypt(integration.access_token),
            refresh_token: decrypt(integration.refresh_token)
          };
          
          const result = await marketplaceServices.publishProduct(
            integration.marketplace,
            decryptedIntegration, // Pass full decrypted integration object
            null, // Deprecated: accessToken (now inside integration)
            product,
            baseUrl
          );
          publishResults.push({
            marketplace: integration.marketplace,
            success: result.success,
            message: result.message,
            externalId: result.externalId,
            details: result.details
          });
        } catch (error) {
          publishResults.push({
            marketplace: integration.marketplace,
            success: false,
            message: error.message
          });
        }
      }
    }

    // Check if at least one marketplace succeeded
    const anySuccess = publishResults.some(r => r.success);
    const allFailed = publishResults.length > 0 && !anySuccess;

    // If ALL marketplaces failed, don't charge and don't change status
    if (allFailed) {
      const errorMessages = publishResults.map(r => `${r.marketplace}: ${r.message}`).join('; ');
      return res.status(400).json({ 
        error: 'Publikacja nie powiodła się na żadnym marketplace',
        details: errorMessages,
        marketplaceResults: publishResults
      });
    }

    // Charge wallet only if at least one marketplace succeeded AND not already charged
    if (anySuccess && !alreadyCharged) {
      try {
        const description = `Wystawienie oferty: ${product.product_name}`;
        
        // Use walletService to charge wallet (handles balance check, update and transaction record)
        await walletService.chargeWallet(userId, OFFER_PRICE, 'offer_creation', id, null, description);
        
        // Update offers_created count separately
        await db.execute(
          'UPDATE wallet SET offers_created = offers_created + 1 WHERE user_id = ?',
          [userId]
        );
      } catch (error) {
        if (error.message === 'Insufficient funds') {
             // Fetch current balance for error message
             const wallet = await walletService.getUserWallet(userId);
             return res.status(402).json({ 
                error: 'Niewystarczające saldo. Proszę doładować portfel.', 
                balance: parseFloat(wallet.balance), 
                required: OFFER_PRICE,
                marketplaceResults: publishResults
             });
        }
        // If wallet not found, create it and return error (mimic original behavior)
        if (error.message === 'Wallet not found') {
             await db.execute(
               'INSERT INTO wallet (user_id, balance, offers_created) VALUES (?, ?, ?)',
               [userId, 0, 0]
             );
             return res.status(402).json({ 
               error: 'Niewystarczające saldo. Proszę doładować portfel.', 
               balance: 0, 
               required: OFFER_PRICE,
               marketplaceResults: publishResults
             });
        }
        throw error;
      }
    }

    // Update status to 'done' only if at least one succeeded
    if (anySuccess) {
      await db.execute(
        'UPDATE products SET status = ? WHERE id = ?',
        ['done', id]
      );

      // Save marketplace listings (external IDs) for future reference (mark as sold, etc.)
      for (const result of publishResults) {
        if (result.success && result.externalId) {
          try {
            await db.execute(
              `INSERT INTO marketplace_listings (product_id, user_id, marketplace, external_id, status)
               VALUES (?, ?, ?, ?, 'active')
               ON DUPLICATE KEY UPDATE external_id = VALUES(external_id), status = 'active', updated_at = NOW()`,
              [id, userId, result.marketplace, result.externalId]
            );
          } catch (listingErr) {
            console.error(`Error saving marketplace listing for ${result.marketplace}:`, listingErr.message);
          }
        }
      }
    }

    res.json({ 
      message: anySuccess ? 'Product published successfully' : 'No active integrations',
      marketplaceResults: publishResults,
      charged: anySuccess && !alreadyCharged
    });
  } catch (error) {
    console.error('Publish product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

    // Bulk publish products
router.post('/bulk-publish', authenticate, async (req, res) => {
  try {
    const { productIds } = req.body;
    const userId = req.userId;
    
    // Get current offer price based on user's history
    const wallet = await walletService.getUserWallet(userId);
    const offersCreated = parseInt(wallet.offers_created || 0);
    const OFFER_PRICE = walletService.calculateOfferPrice(offersCreated);

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: 'Product IDs array is required' });
    }

    // Verify ownership and get products
    const placeholders = productIds.map(() => '?').join(',');
    const [products] = await db.execute(
      `SELECT * FROM products WHERE id IN (${placeholders}) AND user_id = ? AND status = ?`,
      [...productIds, userId, 'ready']
    );

    if (products.length === 0) {
      return res.status(404).json({ error: 'No ready products found for bulk publish' });
    }

    // Get all active integrations for user
    const [integrations] = await db.execute(
      'SELECT * FROM marketplace_integrations WHERE user_id = ? AND is_active = ?',
      [userId, true]
    );

    if (integrations.length === 0) {
      return res.status(400).json({ error: 'No active marketplace integrations found' });
    }

    // Get base URL for images
    const baseUrl = req.protocol + '://' + req.get('host');

    const results = [];
    let totalCharged = 0;
    let totalSuccess = 0;
    let totalFailed = 0;

    for (const product of products) {
      const productResult = {
        productId: product.id,
        productName: product.product_name,
        results: []
      };

      // Check if product was already charged
      const [existingCharges] = await db.execute(
        'SELECT * FROM transactions WHERE user_id = ? AND product_id = ? AND type = ? AND status = ?',
        [userId, product.id, 'offer_creation', 'completed']
      );
      const alreadyCharged = existingCharges.length > 0;

      // Get product with images
      const productWithImages = await getProductWithImages(product.id);

      // Publish to all active marketplaces
      const publishResults = [];
      for (const integration of integrations) {
        try {
          const decryptedIntegration = {
            ...integration,
            access_token: decrypt(integration.access_token),
            refresh_token: decrypt(integration.refresh_token)
          };

          const result = await marketplaceServices.publishProduct(
            integration.marketplace,
            decryptedIntegration,
            null,
            productWithImages,
            baseUrl
          );
          publishResults.push({
            marketplace: integration.marketplace,
            success: result.success,
            message: result.message,
            externalId: result.externalId,
            details: result.details
          });
        } catch (error) {
          publishResults.push({
            marketplace: integration.marketplace,
            success: false,
            message: error.message
          });
        }
      }

      const anySuccess = publishResults.some(r => r.success);
      const allFailed = publishResults.length > 0 && !anySuccess;

      productResult.results = publishResults;

      // If at least one marketplace succeeded, charge and update status
      if (anySuccess && !allFailed) {
            // Charge wallet only if not already charged
        if (!alreadyCharged) {
          try {
            // Recalculate price for each product to respect tiers if crossing a threshold during bulk operation?
            // For simplicity and performance, we use the price calculated at start of batch.
            // OR: we should increment a local counter and recalculate.
            // Let's use the initial price for the whole batch for consistency/simplicity 
            // OR update it as we go.
            // Given the tiers are 100, 200, it's better to stay with one price or recalculate.
            // Let's recalculate to be fair to the system, but maybe user expects one price.
            // The user requirement "do 99sztuk 1zł, od 100sztuk 0,90" implies per unit.
            // So if I have 99 items and add 2, the 100th should be cheaper?
            // "od 100sztuk" usually means if I have created >= 100 offers, new ones are cheaper.
            // So if I am at 99, next one is #100. Is #100 cheaper?
            // Code says: if (offersCount >= 100) return 0.90;
            // So if offersCount is 99, price is 1.00. Then offersCount becomes 100.
            // Next one (offersCount=100) will be 0.90.
            // So for bulk publish, we should ideally recalculate or at least increment our local counter.
            
            // Let's stick to the simple implementation first: use the price determined at start of request.
            // Wait, if I publish 50 items and I'm at 90, I cross the 100 boundary.
            // Ideally the 10 items from 90 to 99 are 1.00, and 100 to 140 are 0.90.
            // To be precise, we should recalculate.
            
            // Re-fetch wallet or just increment local counter?
            // Let's use a local counter for price calculation in the loop.
             
            // Calculate price based on current count + success count so far
            const currentCount = offersCreated + totalSuccess; 
            const currentPrice = walletService.calculateOfferPrice(currentCount);

            const description = `Wystawienie oferty: ${product.product_name}`;
            await walletService.chargeWallet(userId, currentPrice, 'offer_creation', product.id, null, description);
            
            // Update offers_created count
            await db.execute(
              'UPDATE wallet SET offers_created = offers_created + 1 WHERE user_id = ?',
              [userId]
            );
            
            totalCharged += currentPrice;
          } catch (error) {
             if (error.message === 'Insufficient funds') {
               productResult.error = 'Insufficient balance';
             } else if (error.message === 'Wallet not found') {
               productResult.error = 'Wallet not found';
             } else {
               console.error('Charge error in bulk publish:', error);
               productResult.error = 'Payment error';
             }
             totalFailed++;
             results.push(productResult);
             continue;
          }
        }

        // Update status to 'done'
        await db.execute(
          'UPDATE products SET status = ? WHERE id = ?',
          ['done', product.id]
        );

        // Save marketplace listings (external IDs) for future reference
        for (const result of publishResults) {
          if (result.success && result.externalId) {
            try {
              await db.execute(
                `INSERT INTO marketplace_listings (product_id, user_id, marketplace, external_id, status)
                 VALUES (?, ?, ?, ?, 'active')
                 ON DUPLICATE KEY UPDATE external_id = VALUES(external_id), status = 'active', updated_at = NOW()`,
                [product.id, userId, result.marketplace, result.externalId]
              );
            } catch (listingErr) {
              console.error(`Error saving marketplace listing for ${result.marketplace}:`, listingErr.message);
            }
          }
        }

        totalSuccess++;
      } else {
        totalFailed++;
        productResult.error = allFailed ? 'All marketplaces failed' : 'No active integrations';
      }

      results.push(productResult);
    }

    res.json({
      message: `Bulk publish completed: ${totalSuccess} succeeded, ${totalFailed} failed`,
      totalSuccess,
      totalFailed,
      totalCharged,
      results
    });
  } catch (error) {
    console.error('Bulk publish error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark product as sold - removes offers from all marketplaces
router.patch('/:id/mark-sold', authenticate, checkResourceOwnership('products'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Get product (ownership confirmed by middleware)
    const [products] = await db.execute(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );

    if (products.length === 0) {
      return res.status(404).json({ error: 'Produkt nie znaleziony' });
    }

    if (products[0].status !== 'done') {
      return res.status(400).json({ error: 'Tylko wystawione produkty mogą być oznaczone jako sprzedane' });
    }

    // Get marketplace listings for this product
    let listings = [];
    try {
      const [listingRows] = await db.execute(
        'SELECT * FROM marketplace_listings WHERE product_id = ? AND user_id = ? AND status = ?',
        [id, userId, 'active']
      );
      listings = listingRows;
    } catch (e) {
      console.warn('marketplace_listings table might not exist:', e.message);
    }

    // Get all active integrations for user (needed for auth tokens)
    const [integrations] = await db.execute(
      'SELECT * FROM marketplace_integrations WHERE user_id = ? AND is_active = ?',
      [userId, true]
    );

    // Build integration map for quick lookup
    const integrationMap = {};
    integrations.forEach(i => {
      integrationMap[i.marketplace] = i;
    });

    // Delete offers from all marketplaces
    const deleteResults = [];
    for (const listing of listings) {
      const integration = integrationMap[listing.marketplace];
      if (!integration) {
        deleteResults.push({
          marketplace: listing.marketplace,
          success: false,
          message: `Brak aktywnej integracji z ${listing.marketplace}`
        });
        continue;
      }

      try {
        const decryptedIntegration = {
          ...integration,
          access_token: decrypt(integration.access_token),
          refresh_token: decrypt(integration.refresh_token)
        };

        const result = await marketplaceServices.deleteOffer(
          listing.marketplace,
          decryptedIntegration,
          listing.external_id
        );
        deleteResults.push({
          marketplace: listing.marketplace,
          success: result.success,
          message: result.message
        });

        // Update listing status
        if (result.success) {
          await db.execute(
            'UPDATE marketplace_listings SET status = ? WHERE id = ?',
            ['sold', listing.id]
          );
        }
      } catch (error) {
        deleteResults.push({
          marketplace: listing.marketplace,
          success: false,
          message: error.message
        });
      }
    }

    // Update product status to 'sold'
    await db.execute(
      'UPDATE products SET status = ? WHERE id = ?',
      ['sold', id]
    );

    await logActivity(req, userId, 'product_sold', { 
      productId: id, 
      productName: products[0].product_name,
      marketplaceResults: deleteResults
    });

    res.json({
      message: 'Produkt oznaczony jako sprzedany',
      deleteResults,
      allDeleted: deleteResults.every(r => r.success) || deleteResults.length === 0
    });
  } catch (error) {
    console.error('Mark sold error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Bulk mark products as sold
router.post('/bulk-mark-sold', authenticate, async (req, res) => {
  try {
    const { productIds } = req.body;
    const userId = req.userId;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: 'Product IDs array is required' });
    }

    // Verify ownership and get 'done' products
    const placeholders = productIds.map(() => '?').join(',');
    const [products] = await db.execute(
      `SELECT * FROM products WHERE id IN (${placeholders}) AND user_id = ? AND status = ?`,
      [...productIds, userId, 'done']
    );

    if (products.length === 0) {
      return res.status(404).json({ error: 'Nie znaleziono wystawionych produktów do oznaczenia' });
    }

    // Get all active integrations for user
    const [integrations] = await db.execute(
      'SELECT * FROM marketplace_integrations WHERE user_id = ? AND is_active = ?',
      [userId, true]
    );

    const integrationMap = {};
    integrations.forEach(i => {
      integrationMap[i.marketplace] = i;
    });

    const results = [];
    let totalSuccess = 0;
    let totalFailed = 0;

    for (const product of products) {
      const productResult = {
        productId: product.id,
        productName: product.product_name,
        deleteResults: []
      };

      // Get marketplace listings for this product
      let listings = [];
      try {
        const [listingRows] = await db.execute(
          'SELECT * FROM marketplace_listings WHERE product_id = ? AND user_id = ? AND status = ?',
          [product.id, userId, 'active']
        );
        listings = listingRows;
      } catch (e) {
        // Table might not exist
      }

      // Delete from each marketplace
      for (const listing of listings) {
        const integration = integrationMap[listing.marketplace];
        if (!integration) {
          productResult.deleteResults.push({
            marketplace: listing.marketplace,
            success: false,
            message: `Brak aktywnej integracji z ${listing.marketplace}`
          });
          continue;
        }

        try {
          const decryptedIntegration = {
            ...integration,
            access_token: decrypt(integration.access_token),
            refresh_token: decrypt(integration.refresh_token)
          };

          const result = await marketplaceServices.deleteOffer(
            listing.marketplace,
            decryptedIntegration,
            listing.external_id
          );
          productResult.deleteResults.push({
            marketplace: listing.marketplace,
            success: result.success,
            message: result.message
          });

          if (result.success) {
            await db.execute(
              'UPDATE marketplace_listings SET status = ? WHERE id = ?',
              ['sold', listing.id]
            );
          }
        } catch (error) {
          productResult.deleteResults.push({
            marketplace: listing.marketplace,
            success: false,
            message: error.message
          });
        }
      }

      // Update product status to 'sold'
      await db.execute(
        'UPDATE products SET status = ? WHERE id = ?',
        ['sold', product.id]
      );

      totalSuccess++;
      results.push(productResult);
    }

    res.json({
      message: `Oznaczono jako sprzedane: ${totalSuccess} produkt(ów)`,
      totalSuccess,
      totalFailed,
      results
    });
  } catch (error) {
    console.error('Bulk mark sold error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Bulk delete products (soft delete)
router.post('/bulk-delete', authenticate, async (req, res) => {
  try {
    const { productIds } = req.body;
    const userId = req.userId;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: 'Product IDs array is required' });
    }

    // Verify ownership
    const placeholders = productIds.map(() => '?').join(',');
    const [products] = await db.execute(
      `SELECT * FROM products WHERE id IN (${placeholders}) AND user_id = ? AND deleted_at IS NULL`,
      [...productIds, userId]
    );

    if (products.length === 0) {
      return res.status(404).json({ error: 'No products found for bulk delete' });
    }

    const results = [];
    let totalSuccess = 0;
    let totalFailed = 0;

    for (const product of products) {
      try {
        // Soft delete product
        await db.execute('UPDATE products SET deleted_at = NOW() WHERE id = ?', [product.id]);

        results.push({
          productId: product.id,
          productName: product.product_name,
          success: true
        });
        totalSuccess++;
      } catch (error) {
        console.error(`Error deleting product ${product.id}:`, error);
        results.push({
          productId: product.id,
          productName: product.product_name,
          success: false,
          error: error.message
        });
        totalFailed++;
      }
    }

    res.json({
      message: `Bulk delete completed: ${totalSuccess} succeeded, ${totalFailed} failed`,
      totalSuccess,
      totalFailed,
      results
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete product (soft delete)
router.delete('/:id', authenticate, checkResourceOwnership('products'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Get product to check if it exists (ownership confirmed by middleware)
    const [products] = await db.execute(
      'SELECT * FROM products WHERE id = ? AND deleted_at IS NULL',
      [id]
    );

    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Soft delete product
    await db.execute('UPDATE products SET deleted_at = NOW() WHERE id = ?', [id]);

    // Note: We do not delete image files or records here for soft delete.
    // Cleanup/Archiving script should handle old soft-deleted records.

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;