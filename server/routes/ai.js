const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const authenticate = require('../middleware/auth');
const logActivity = require('../utils/activityLogger');
const db = require('../config/database');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');
const FormData = require('form-data');

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/temp/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const aiGenerator = require('../services/aiGenerator');
const eanDbService = require('../services/eanDb');
const imageProcessor = require('../services/imageProcessor');
const { callGeminiWithRetry } = require('../utils/geminiRetry');
const { scanFile } = require('../utils/fileScanner'); // SECURITY: File scanning for malware detection

// Generate product description from images using Vision AI
router.post('/generate-description-from-images', authenticate, upload.array('images', 10), async (req, res) => {
  try {
    const { productName, dimensions, price, templateId, productId, customInstructions } = req.body;
    const userId = req.userId;
    let imageFiles = req.files || [];
    let existingImageFiles = []; // Track existing images separately for cleanup

    // If no uploaded files but productId provided, read images from product
    if (imageFiles.length === 0 && productId) {
      console.log(`[Vision AI] No uploaded files, reading images from product ${productId}`);
      const [productImages] = await db.execute(
        'SELECT pi.* FROM product_images pi JOIN products p ON pi.product_id = p.id WHERE pi.product_id = ? AND p.user_id = ?',
        [productId, userId]
      );
      
      if (productImages.length > 0) {
        existingImageFiles = productImages.map(img => {
          const imagePath = img.image_url.startsWith('/') ? img.image_url.substring(1) : img.image_url;
          const fullPath = path.isAbsolute(imagePath) ? imagePath : path.join(process.cwd(), imagePath);
          return {
            path: fullPath,
            mimetype: 'image/jpeg',
            isExisting: true // Flag to prevent cleanup
          };
        }).filter(f => fs.existsSync(f.path));
        
        console.log(`[Vision AI] Found ${existingImageFiles.length} existing images on disk for product ${productId}`);
        imageFiles = existingImageFiles;
      }
    }

    if (imageFiles.length === 0) {
      return res.status(400).json({ error: 'Przynajmniej jedno zdjęcie jest wymagane' });
    }

    // SECURITY: Scan uploaded files for malware (skip existing files from DB)
    for (const file of imageFiles) {
      if (!file.isExisting && file.path) {
        const mimeType = file.mimetype || 'image/jpeg';
        const scanResult = await scanFile(file.path, mimeType);
        if (!scanResult.valid) {
          // Clean up malicious file
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          return res.status(400).json({ 
            error: `Plik nie przeszedł skanowania bezpieczeństwa: ${scanResult.errors.join(', ')}` 
          });
        }
      }
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    // Parse dimensions if it's a string
    let parsedDimensions = null;
    if (dimensions) {
      try {
        parsedDimensions = typeof dimensions === 'string' ? JSON.parse(dimensions) : dimensions;
      } catch (e) {
        console.error('Error parsing dimensions:', e);
      }
    }

    // Get user preferences
    const [preferences] = await db.execute(
      'SELECT * FROM user_preferences WHERE user_id = ?',
      [userId]
    );
    const prefs = preferences.length > 0 ? preferences[0] : {};
    const aiProvider = prefs.ai_provider || 'gemini';

    // Get template if provided
    let templateContent = null;
    if (templateId) {
      const [templates] = await db.execute(
        'SELECT content FROM ai_templates WHERE id = ? AND (user_id = ? OR is_global = TRUE)',
        [templateId, userId]
      );
      if (templates.length > 0) {
        templateContent = templates[0].content;
      }
    }

    // Prepare images for Gemini Vision API
    const imageParts = [];
    for (const file of imageFiles) {
      try {
        const imageBuffer = fs.readFileSync(file.path);
        const base64Image = imageBuffer.toString('base64');
        const mimeType = file.mimetype || 'image/jpeg';
        
        imageParts.push({
          inlineData: {
            mimeType: mimeType,
            data: base64Image
          }
        });
      } catch (readErr) {
        console.error(`[Vision AI] Error reading image file ${file.path}:`, readErr.message);
      }
    }

    if (imageParts.length === 0) {
      return res.status(400).json({ error: 'Nie udało się odczytać żadnego zdjęcia' });
    }

    // Build dimensions string
    let dimensionsStr = '';
    if (parsedDimensions) {
      const dimParts = [];
      if (parsedDimensions.width) dimParts.push(`Szerokość: ${parsedDimensions.width} cm`);
      if (parsedDimensions.height) dimParts.push(`Wysokość: ${parsedDimensions.height} cm`);
      if (parsedDimensions.depth) dimParts.push(`Głębokość: ${parsedDimensions.depth} cm`);
      if (parsedDimensions.weight) dimParts.push(`Waga: ${parsedDimensions.weight} kg`);
      if (dimParts.length > 0) {
        dimensionsStr = `Wymiary: ${dimParts.join(', ')}`;
      }
    }

    // Get style instructions
    let aiStylePrompts = {};
    try { aiStylePrompts = JSON.parse(prefs.ai_style_prompts || '{}'); } catch (e) {}
    const styleInstructions = aiStylePrompts[prefs.description_style] || 'Styl profesjonalny, ekspercki, budzący zaufanie.';

    // Try to find EAN code from product name and image using Perplexity AI
    let foundEan = null;
    let productDataFromEan = null;
    if (imageParts.length > 0 && imageParts[0].inlineData) {
      try {
        console.log('[Vision AI] Attempting to find EAN code from product name and image...');
        const firstImage = imageParts[0];
        
        // Use both product name and image to find EAN
        if (productName && productName.trim()) {
          foundEan = await eanDbService.lookupEanFromNameAndImageWithPerplexity(
            productName,
            firstImage.inlineData.data,
            firstImage.inlineData.mimeType
          );
        } else {
          // Fallback to image-only lookup if no product name provided
          console.log('[Vision AI] No product name provided, using image-only lookup...');
          foundEan = await eanDbService.lookupEanFromImageWithPerplexity(
            firstImage.inlineData.data,
            firstImage.inlineData.mimeType
          );
        }
        
        if (foundEan) {
          console.log(`[Vision AI] Found EAN from name and image: ${foundEan}`);
          // Try to get product data using the found EAN
          productDataFromEan = await eanDbService.getProduct(foundEan);
          if (productDataFromEan) {
            console.log(`[Vision AI] Found product data for EAN ${foundEan}: ${productDataFromEan.name}`);
          }
        } else {
          console.log('[Vision AI] No EAN code found from name and image');
        }
      } catch (eanError) {
        console.error('[Vision AI] Error during EAN lookup from name and image:', eanError.message);
        // Continue with description generation even if EAN lookup fails
      }
    }

    // Generate description using shared Core Vision Logic
    const description = await aiGenerator.generateVisionDescriptionCore(
        { 
          productName: productDataFromEan?.name || productName, 
          dimensionsStr, 
          price, 
          customInstructions 
        },
        templateContent,
        imageParts,
        styleInstructions
    );

    // Clean up uploaded temp files (NOT existing product images)
    imageFiles.forEach(file => {
      if (!file.isExisting && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    });

    // Log AI activity
    await logActivity(req, userId, 'ai_description_generated_from_images', { 
      productName: productName || 'Unknown',
      templateId,
      imageCount: imageFiles.length
    });

    res.json({
      success: true,
      description,
      provider: 'gemini-vision',
      ean: foundEan || null,
      productData: productDataFromEan ? {
        name: productDataFromEan.name,
        manufacturer: productDataFromEan.manufacturer,
        category: productDataFromEan.category,
        dimensions: productDataFromEan.dimensions
      } : null
    });

  } catch (error) {
    console.error('AI description generation from images error:', error.response?.data || error.message);
    
    // Clean up temp files on error (NOT existing product images)
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          try {
            fs.unlinkSync(file.path);
          } catch (e) {
            console.error('Error cleaning up file:', e);
          }
        }
      });
    }

    const errorMessage = error.message.includes('quota') || error.message.includes('billing')
      ? 'Brak środków na koncie API. Sprawdź ustawienia płatności.'
      : 'Nie udało się wygenerować opisu produktu na podstawie zdjęć.';

    res.status(500).json({
      error: errorMessage,
      details: error.response?.data || error.message
    });
  }
});

// Generate product description using user's preferred AI provider
router.post('/generate-description', authenticate, async (req, res) => {
  try {
    const { productName, eanCode, catalogCode, manufacturer, dimensions, parameters, categoryName, templateId, description, catalogDescription, aiOptions } = req.body;
    const userId = req.userId;

    const result = await aiGenerator.generateDescription({
      productName, eanCode, catalogCode, manufacturer, dimensions, parameters, categoryName, description, catalogDescription, aiOptions
    }, userId, templateId);

    // Log AI activity
    await logActivity(req, userId, 'ai_description_generated', { 
      productName: productName || 'Unknown', 
      templateId,
      ean: eanCode
    });

    res.json(result);

  } catch (error) {
    console.error('AI description generation error:', error.response?.data || error.message);
    
    // Check if it's a quota error (helper now internal to service, but error message might bubble up)
    const isQuota = error.message.includes('quota') || error.message.includes('billing');

    const errorMessage = isQuota
      ? 'Brak środków na koncie API. Sprawdź ustawienia płatności.'
      : 'Nie udało się wygenerować opisu produktu.';

    res.status(500).json({
      error: errorMessage,
      details: error.response?.data || error.message
    });
  }
});

// Generate image using Gemini 3 Pro (Nano Banana Pro)
router.post('/generate-image', authenticate, async (req, res) => {
  try {
    const { prompt, aspectRatio = '1:1' } = req.body;
    const userId = req.userId;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    // Call Gemini API (Imagen 3.0 via Gemini 3 Pro Image)
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const response = await callGeminiWithRetry(ai, {
      model: "gemini-3-pro-image-preview",
      contents: [{ text: prompt }],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: "1K"
        }
      }
    }, { label: 'Gemini generate-image' });

    const generatedImages = [];
    const uploadDir = 'uploads/generated';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Debug: log response structure
    if (!response.candidates || response.candidates.length === 0) {
      console.error('[Gemini Image] No candidates in response:', JSON.stringify(response, null, 2));
      throw new Error('No candidates returned by Gemini API');
    }

    const candidate = response.candidates[0];
    if (!candidate.content || !candidate.content.parts) {
      console.error('[Gemini Image] Invalid response structure:', JSON.stringify(candidate, null, 2));
      throw new Error('Invalid response structure from Gemini API');
    }

    // Filter out thought parts - Gemini 3 Pro Image generates interim "thought" images
    // Only save final non-thought image parts
    let imageIndex = 0;
    candidate.content.parts.forEach((part) => {
      if (part.inlineData && !part.thought) {
        const base64Data = part.inlineData.data;
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `gemini-${Date.now()}-${imageIndex}.png`;
        const filepath = path.join(uploadDir, filename);
        fs.writeFileSync(filepath, buffer);
        
        // Return relative URL
        generatedImages.push(`/uploads/generated/${filename}`);
        imageIndex++;
      } else if (part.text && !part.thought) {
        // Log if we get text instead of image (might be an error message)
        console.warn('[Gemini Image] Received text part instead of image:', part.text.substring(0, 200));
      }
    });

    if (generatedImages.length === 0) {
      console.error('[Gemini Image] No images in response. Full response:', JSON.stringify(response, null, 2));
      throw new Error('No images generated by Gemini');
    }

    // Log activity
    await logActivity(req, userId, 'ai_image_generated', { prompt });

    res.json({
      success: true,
      images: generatedImages
    });

  } catch (error) {
    console.error('Gemini image generation error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to generate image',
      details: error.response?.data || error.message
    });
  }
});

// Edit image using AI (Gemini 3 Pro Image)
router.post('/edit-image', authenticate, upload.single('backgroundImage'), async (req, res) => {
  try {
    const { imageUrl, imageIndex, editType = 'enhance', backgroundImageUrl } = req.body;
    const userId = req.userId;
    const backgroundImageFile = req.file;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    // SECURITY: Scan uploaded background image file if provided
    if (backgroundImageFile && backgroundImageFile.path) {
      const mimeType = backgroundImageFile.mimetype || 'image/jpeg';
      const scanResult = await scanFile(backgroundImageFile.path, mimeType);
      if (!scanResult.valid) {
        // Clean up malicious file
        if (fs.existsSync(backgroundImageFile.path)) {
          fs.unlinkSync(backgroundImageFile.path);
        }
        return res.status(400).json({ 
          error: `Plik nie przeszedł skanowania bezpieczeństwa: ${scanResult.errors.join(', ')}` 
        });
      }
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    // Use shared image processing service
    const result = await imageProcessor.processImage({
        imageUrl,
        editType,
        backgroundImageUrl,
        backgroundImageFile
    });

    res.json({
        processedUrl: result.processedUrl,
        success: true,
        provider: 'gemini'
    });

  } catch (error) {
    console.error('Image editing error:', error);
    res.status(500).json({
      error: 'Failed to edit image',
      details: error.message
    });
  }
});

module.exports = router;