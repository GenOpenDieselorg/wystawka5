const db = require('../config/database');
const imageProcessor = require('./imageProcessor');
const marketplaceServices = require('./marketplace');
const aiGenerator = require('./aiGenerator');
const eanDbService = require('./eanDb');
const walletService = require('./walletService'); // Dodano import walletService
const path = require('path');
const fs = require('fs');
const sanitizeHtml = require('sanitize-html');

const { decrypt } = require('../utils/encryption');

class BackgroundJobService {
  
  async createJob(userId, type, data) {
    const [result] = await db.execute(
      'INSERT INTO background_jobs (user_id, type, data, status) VALUES (?, ?, ?, ?)',
      [userId, type, JSON.stringify(data), 'pending']
    );
    
    // Trigger processing (fire and forget)
    this.processJob(result.insertId).catch(err => console.error(`Error processing job ${result.insertId}:`, err));
    
    return result.insertId;
  }

  async getJob(jobId, userId) {
    const [jobs] = await db.execute(
      'SELECT * FROM background_jobs WHERE id = ? AND user_id = ?',
      [jobId, userId]
    );
    return jobs[0];
  }

  async getUserJobs(userId, limit = 10) {
    const [jobs] = await db.execute(
      'SELECT * FROM background_jobs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
      [userId, limit]
    );
    return jobs.map(job => ({
      ...job,
      data: typeof job.data === 'string' ? JSON.parse(job.data) : job.data,
      result: typeof job.result === 'string' ? JSON.parse(job.result) : job.result
    }));
  }

  async getActiveJobs(userId) {
    const [jobs] = await db.execute(
      "SELECT * FROM background_jobs WHERE user_id = ? AND status IN ('pending', 'processing') ORDER BY created_at DESC",
      [userId]
    );
    return jobs.map(job => ({
      ...job,
      data: typeof job.data === 'string' ? JSON.parse(job.data) : job.data
    }));
  }

  async updateJobStatus(jobId, status, progress, result = null, error = null) {
    await db.execute(
      'UPDATE background_jobs SET status = ?, progress = ?, result = ?, error_message = ? WHERE id = ?',
      [status, progress, result ? JSON.stringify(result) : null, error, jobId]
    );
  }

  async processJob(jobId) {
    try {
      const [jobs] = await db.execute('SELECT * FROM background_jobs WHERE id = ?', [jobId]);
      if (jobs.length === 0) return;
      const job = jobs[0];

      if (job.status !== 'pending') return;

      await this.updateJobStatus(jobId, 'processing', 0);
      
      const data = typeof job.data === 'string' ? JSON.parse(job.data) : job.data;
      
      if (job.type === 'process_images_and_publish') {
        await this.handleProcessImagesAndPublish(job, data);
      } else {
        throw new Error(`Unknown job type: ${job.type}`);
      }

    } catch (error) {
      console.error(`Job ${jobId} failed:`, error);
      await this.updateJobStatus(jobId, 'failed', 0, null, error.message);
    }
  }

  // Helper function to check if description is valid (contains HTML tags)
  isDescriptionValid(description) {
    if (!description || typeof description !== 'string') return false;
    return /<[a-z][\s\S]*>/i.test(description);
  }

  async handleProcessImagesAndPublish(job, data) {
    let { productId, selectedImageIds, imageEditSettings, editType, backgroundImageUrl, publish, baseUrl, generateDescription, wizardType, templateId, customInstructions } = data;
    const userId = job.user_id;

    // --- KLUCZOWA ZMIANA: Pobieranie ustawień z bazy danych ---
    let defaultEditType = editType;
    let defaultBgUrl = backgroundImageUrl;
    
    try {
        const [prefs] = await db.execute(
            'SELECT default_image_edit_mode, default_bg_image_url FROM user_preferences WHERE user_id = ?', 
            [userId]
        );
        
        if (prefs.length > 0) {
            const userPref = prefs[0];
            
            if (!defaultEditType || defaultEditType === 'enhance') {
                if (userPref.default_image_edit_mode) {
                    defaultEditType = userPref.default_image_edit_mode;
                    console.log(`[Job ${job.id}] Applying global preference for defaultEditType: ${defaultEditType}`);
                }
            }
            
            if (!defaultBgUrl && userPref.default_bg_image_url) {
                defaultBgUrl = userPref.default_bg_image_url;
                console.log(`[Job ${job.id}] Applying global preference for defaultBgUrl: ${defaultBgUrl}`);
            }
        }
    } catch (prefError) {
        console.error(`[Job ${job.id}] Failed to load user preferences:`, prefError);
    }
    // -----------------------------------------------------------

    let descriptionValid = false;

    // 0. Generate Description (Optional)
    if (generateDescription) {
      try {
        const [products] = await db.execute('SELECT * FROM products WHERE id = ?', [productId]);
        if (products.length > 0) {
            const product = products[0];

            if (wizardType === 'image-based') {
                console.log(`Job ${job.id}: Using image-based description generation (Vision AI) with templateId=${templateId}`);
                await this.updateJobStatus(job.id, 'processing', 3);

                const genResult = await aiGenerator.generateDescriptionFromImages({
                    productId,
                    productName: product.product_name,
                    dimensions: {
                        width: product.width,
                        height: product.height,
                        depth: product.depth,
                        weight: product.weight
                    },
                    price: product.price,
                    templateId: templateId || null,
                    customInstructions: customInstructions || null
                }, userId);

                if (genResult.success && genResult.description) {
                    descriptionValid = this.isDescriptionValid(genResult.description);
                    await db.execute('UPDATE products SET description = ? WHERE id = ?', [genResult.description, productId]);
                    
                    // Extract product name from description if not provided
                    let detectedProductName = product.product_name;
                    if (!product.product_name || product.product_name.trim() === '') {
                        const h1Match = genResult.description.match(/<h1[^>]*>(.*?)<\/h1>/i);
                        if (h1Match && h1Match[1]) {
                            const extractedName = sanitizeHtml(h1Match[1], { allowedTags: [], allowedAttributes: {} }).trim();
                            if (extractedName) {
                                detectedProductName = extractedName;
                                await db.execute('UPDATE products SET product_name = ? WHERE id = ?', [extractedName, productId]);
                            }
                        }
                    }

                    // --- EAN LOOKUP from images + product name ---
                    // If product has no EAN code yet, try to find one using images and detected name
                    if (!product.ean_code) {
                        try {
                            console.log(`[Job ${job.id}] Attempting EAN lookup from images and product name: "${detectedProductName}"`);
                            
                            // Read first product image as base64
                            const [productImages] = await db.execute(
                                'SELECT * FROM product_images WHERE product_id = ? LIMIT 1',
                                [productId]
                            );
                            
                            if (productImages.length > 0) {
                                const img = productImages[0];
                                const imagePath = img.image_url.startsWith('/') ? img.image_url.substring(1) : img.image_url;
                                const fullPath = path.isAbsolute(imagePath) ? imagePath : path.join(process.cwd(), imagePath);
                                
                                if (fs.existsSync(fullPath)) {
                                    const imageBuffer = fs.readFileSync(fullPath);
                                    const base64Image = imageBuffer.toString('base64');
                                    const mimeType = img.mime_type || 'image/jpeg';
                                    
                                    // Use name + image lookup (more accurate) or image-only fallback
                                    let foundEan = null;
                                    if (detectedProductName && detectedProductName.trim()) {
                                        foundEan = await eanDbService.lookupEanFromNameAndImageWithPerplexity(
                                            detectedProductName, base64Image, mimeType
                                        );
                                    } else {
                                        foundEan = await eanDbService.lookupEanFromImageWithPerplexity(
                                            base64Image, mimeType
                                        );
                                    }
                                    
                                    if (foundEan) {
                                        console.log(`[Job ${job.id}] Found EAN from image: ${foundEan}`);
                                        await db.execute('UPDATE products SET ean_code = ? WHERE id = ?', [foundEan, productId]);
                                        
                                        // Try to enrich product data using the found EAN
                                        try {
                                            const enrichedData = await eanDbService.getProduct(foundEan);
                                            if (enrichedData) {
                                                const updates = [];
                                                const values = [];
                                                
                                                if (enrichedData.manufacturer && !product.manufacturer) {
                                                    updates.push('manufacturer = ?');
                                                    values.push(enrichedData.manufacturer);
                                                }
                                                if (enrichedData.name && (!detectedProductName || detectedProductName.trim() === '')) {
                                                    updates.push('product_name = ?');
                                                    values.push(enrichedData.name);
                                                }
                                                
                                                if (updates.length > 0) {
                                                    values.push(productId);
                                                    await db.execute(
                                                        `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
                                                        values
                                                    );
                                                    console.log(`[Job ${job.id}] Product enriched with EAN data: ${updates.join(', ')}`);
                                                }
                                            }
                                        } catch (enrichErr) {
                                            console.error(`[Job ${job.id}] Error enriching product with EAN data:`, enrichErr.message);
                                        }
                                    } else {
                                        console.log(`[Job ${job.id}] No EAN found from image/name lookup`);
                                    }
                                }
                            }
                        } catch (eanErr) {
                            console.error(`[Job ${job.id}] EAN lookup from image failed:`, eanErr.message);
                        }
                    }
                    // --- END EAN LOOKUP ---
                }
            } else {
                if (product.ean_code && (!product.product_name || /^\d+$/.test(product.product_name))) {
                     try {
                         await this.updateJobStatus(job.id, 'processing', 2);
                         const enrichedData = await eanDbService.getProduct(product.ean_code);
                         if (enrichedData && enrichedData.name) {
                             product.product_name = enrichedData.name;
                             if (enrichedData.manufacturer) product.manufacturer = enrichedData.manufacturer;
                             await db.execute(
                                 'UPDATE products SET product_name = ?, manufacturer = ? WHERE id = ?', 
                                 [product.product_name, product.manufacturer || null, productId]
                             );
                         }
                     } catch (e) {
                         console.error('Error enriching product data:', e);
                     }
                }

                let parameters = [];
                try {
                   parameters = typeof product.parameters === 'string' ? JSON.parse(product.parameters) : product.parameters;
                } catch(e) {}

                await this.updateJobStatus(job.id, 'processing', 5);

                const genResult = await aiGenerator.generateDescription({
                    productName: product.product_name,
                    eanCode: product.ean_code,
                    manufacturer: product.manufacturer,
                    parameters: parameters,
                    description: product.description
                }, userId, templateId || null);

                if (genResult.success) {
                    descriptionValid = this.isDescriptionValid(genResult.description);
                    await db.execute('UPDATE products SET description = ? WHERE id = ?', [genResult.description, productId]);
                }
            }
        }
      } catch (err) {
        console.error(`Error generating description for job ${job.id}:`, err);
      }
      await this.updateJobStatus(job.id, 'processing', 10);
    } else {
      try {
        const [products] = await db.execute('SELECT description FROM products WHERE id = ?', [productId]);
        if (products.length > 0 && products[0].description) {
          descriptionValid = this.isDescriptionValid(products[0].description);
        }
      } catch (e) {
        console.error('Error checking existing description:', e);
      }
    }

    // 1. Get Product Images
    const [images] = await db.execute(
      'SELECT * FROM product_images WHERE product_id = ?',
      [productId]
    );

    // Normalize selectedImageIds to handle type mismatches (string vs number from JSON serialization)
    const normalizedSelectedIds = (selectedImageIds || []).map(id => Number(id));
    
    let imagesToProcess = images.filter(img => normalizedSelectedIds.includes(Number(img.id)));
    
    // FALLBACK: If no images matched selectedImageIds, process ALL product images
    // This handles cases where image IDs changed (e.g., re-upload) or type mismatch
    if (imagesToProcess.length === 0 && images.length > 0) {
      console.warn(`[Job ${job.id}] No images matched selectedImageIds (${JSON.stringify(selectedImageIds)}). DB image IDs: ${images.map(i => i.id).join(', ')}. Falling back to ALL ${images.length} product images.`);
      imagesToProcess = images;
    }
    
    const totalImages = imagesToProcess.length;
    const processedResults = [];

    // 2. Process Images with individual settings
    console.log(`[Job ${job.id}] Starting image processing. Images: ${totalImages}, selectedImageIds: ${JSON.stringify(normalizedSelectedIds)}, DB images: ${images.map(i => i.id).join(',')}, Using individual settings: ${!!imageEditSettings}`);

    for (let i = 0; i < totalImages; i++) {
      const img = imagesToProcess[i];
      try {
        // Get individual settings for this image, or use defaults
        let imgEditType = defaultEditType || 'enhance';
        let imgBgUrl = defaultBgUrl;
        
        if (imageEditSettings && imageEditSettings[img.id]) {
          const settings = imageEditSettings[img.id];
          imgEditType = settings.editType || imgEditType;
          imgBgUrl = settings.backgroundImageUrl || imgBgUrl;
          console.log(`[Job ${job.id}] Image ${img.id}: Using custom settings - editType: ${imgEditType}`);
        } else {
          console.log(`[Job ${job.id}] Image ${img.id}: Using default settings - editType: ${imgEditType}`);
        }
        
        const result = await imageProcessor.processImage({
          imageUrl: img.image_url,
          editType: imgEditType,
          backgroundImageUrl: imgBgUrl
        });

        // Update image in DB
        await db.execute(
          'UPDATE product_images SET processed_image_url = ? WHERE id = ?',
          [result.processedUrl, img.id]
        );

        processedResults.push({ id: img.id, url: result.processedUrl, success: true });
      } catch (err) {
        console.error(`Error processing image ${img.id}:`, err);
        processedResults.push({ id: img.id, error: err.message, success: false });
      }

      const progress = Math.round(((i + 1) / (totalImages + (publish ? 1 : 0))) * 100);
      await this.updateJobStatus(job.id, 'processing', progress);
    }

    // 3. Update Product Status & CHARGE WALLET IF READY
    const productStatus = descriptionValid ? 'ready' : 'in_production';
    await db.execute(
        'UPDATE products SET status = ? WHERE id = ?',
        [productStatus, productId]
    );

    // --- POPRAWKA: Pobieranie opłaty gdy status = ready ---
    if (productStatus === 'ready') {
      try {
        // Sprawdź czy już nie pobrano opłaty (aby uniknąć dublowania)
        const [existingCharges] = await db.execute(
          'SELECT * FROM transactions WHERE user_id = ? AND product_id = ? AND type = ? AND status = ?',
          [userId, productId, 'offer_creation', 'completed']
        );

        if (existingCharges.length === 0) {
           // Pobierz aktualny cennik
           const wallet = await walletService.getUserWallet(userId);
           const offersCreated = parseInt(wallet.offers_created || 0);
           const offerPrice = walletService.calculateOfferPrice(offersCreated);
           
           // Pobierz nazwę produktu
           const [prods] = await db.execute('SELECT product_name FROM products WHERE id = ?', [productId]);
           const pName = prods[0]?.product_name || 'Produkt';

           // Pobierz środki
           await walletService.chargeWallet(
             userId, 
             offerPrice, 
             'offer_creation', 
             productId, 
             null, 
             `Utworzenie oferty (AI): ${pName}`
           );
           
           // Zaktualizuj licznik
           await db.execute('UPDATE wallet SET offers_created = offers_created + 1 WHERE user_id = ?', [userId]);
           console.log(`[Job ${job.id}] Wallet charged for READY product ${productId}`);
        }
      } catch (e) {
        console.error(`[Job ${job.id}] Failed to charge wallet for READY status:`, e);
        // Jeśli brak środków, można ewentualnie cofnąć status na 'draft' lub zostawić 'ready' ale zablokować pobieranie/publikację
        // W tym przypadku logujemy błąd.
      }
    }
    // -----------------------------------------------------

    // 4. Publish (Optional)
    let publishResult = null;
    if (publish) {
      const [products] = await db.execute('SELECT * FROM products WHERE id = ?', [productId]);
      const product = products[0];
      const [updatedImages] = await db.execute('SELECT * FROM product_images WHERE product_id = ?', [productId]);
      
      const productWithImages = {
        ...product,
        images: updatedImages.map(img => ({
            id: img.id,
            url: img.image_url,
            processedUrl: img.processed_image_url,
            isPrimary: img.is_primary
        }))
      };

      const [integrations] = await db.execute(
        'SELECT * FROM marketplace_integrations WHERE user_id = ? AND is_active = ?',
        [userId, true]
      );

      const marketResults = [];
      
      if (integrations.length > 0) {
        for (const integration of integrations) {
            try {
                // Decrypt tokens before passing to service
                const decryptedIntegration = {
                  ...integration,
                  access_token: decrypt(integration.access_token),
                  refresh_token: decrypt(integration.refresh_token)
                };

                const res = await marketplaceServices.publishProduct(
                    integration.marketplace,
                    decryptedIntegration,
                    null,
                    productWithImages,
                    baseUrl || 'https://wystawoferte.pl'
                );
                marketResults.push({ marketplace: integration.marketplace, success: res.success, message: res.message, externalId: res.externalId });
            } catch (e) {
                marketResults.push({ marketplace: integration.marketplace, success: false, error: e.message });
            }
        }
      }

      publishResult = marketResults;
      
      // Save marketplace listings (external IDs)
      for (const result of marketResults) {
        if (result.success && result.externalId) {
          try {
            await db.execute(
              `INSERT INTO marketplace_listings (product_id, user_id, marketplace, external_id, status)
               VALUES (?, ?, ?, ?, 'active')
               ON DUPLICATE KEY UPDATE external_id = VALUES(external_id), status = 'active', updated_at = NOW()`,
              [productId, userId, result.marketplace, result.externalId]
            );
          } catch (listingErr) {
            console.error(`Error saving marketplace listing for ${result.marketplace}:`, listingErr.message);
          }
        }
      }

      // FIX: Charge wallet if published successfully
      if (marketResults.some(r => r.success)) {
          try {
              // Get current offer price based on user's history
              const wallet = await walletService.getUserWallet(userId);
              const offersCreated = parseInt(wallet.offers_created || 0);
              const offerPrice = walletService.calculateOfferPrice(offersCreated);
              
              // Check if already charged for this product (to avoid double charging if retry happens)
              const [existingCharges] = await db.execute(
                'SELECT * FROM transactions WHERE user_id = ? AND product_id = ? AND type = ? AND status = ?',
                [userId, productId, 'offer_creation', 'completed']
              );

              if (existingCharges.length === 0) {
                   await walletService.chargeWallet(
                      userId, 
                      offerPrice, 
                      'offer_creation', 
                      productId, 
                      null, 
                      `Automatyczne wystawienie: ${product.product_name}`
                   );
                   
                   // Update offers_created count
                   await db.execute(
                      'UPDATE wallet SET offers_created = offers_created + 1 WHERE user_id = ?',
                      [userId]
                   );
                   console.log(`[Job ${job.id}] Wallet charged for PUBLISHED product ${productId}`);
              }
          } catch (chargeError) {
              console.error(`[Job ${job.id}] Failed to charge wallet for product ${productId}:`, chargeError);
              // Note: We still mark as done even if charge fails here, or we could handle it differently.
              // Ideally, this should be transactional or robust enough.
          }

          await db.execute('UPDATE products SET status = ? WHERE id = ?', ['done', productId]);
      }
    }

    await this.updateJobStatus(job.id, 'completed', 100, {
        processedImages: processedResults,
        publishResult
    });
  }
}

module.exports = new BackgroundJobService();