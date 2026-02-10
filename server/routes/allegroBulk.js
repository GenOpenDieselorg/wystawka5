const express = require('express');
const router = express.Router();
const db = require('../config/database');
const authenticate = require('../middleware/auth');
const logActivity = require('../utils/activityLogger');
const AllegroAdapter = require('../services/marketplaces/allegro');
const eanDbService = require('../services/eanDb');
const aiGenerator = require('../services/aiGenerator');
const imageProcessor = require('../services/imageProcessor');
const walletService = require('../services/walletService');
const crypto = require('crypto');
const { decrypt, encrypt } = require('../utils/encryption');

const allegroAdapter = new AllegroAdapter();

// Job storage (in-memory)
// structure: { id, status: 'pending'|'processing'|'completed'|'failed', total, processed, success, failed, details: [], createdAt }
const jobs = new Map();

// Cleanup old jobs every hour
setInterval(() => {
    const now = new Date();
    for (const [id, job] of jobs.entries()) {
        // Remove jobs older than 24 hours
        if (now - new Date(job.createdAt) > 24 * 60 * 60 * 1000) {
            jobs.delete(id);
        }
    }
}, 60 * 60 * 1000);

// Helper to chunk array
const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));

// Helper: Sanitize HTML description for Allegro (copied from AllegroAdapter)
const sanitizeDescriptionForAllegro = (html) => {
    if (!html) return '';

    let content = html;

    // 1. Remove AI placeholders
    content = content.replace(/\[ZDJĘCIE\]/gi, '');

    // 2. Remove all attributes from tags (e.g. class, style, etc.)
    // This removes everything after the tag name until the closing >
    content = content.replace(/<([a-z0-9]+)\s+[^>]*>/gi, '<$1>');

    // 3. Replace <br> with space (to avoid concatenation)
    // Allegro API explicitly forbids <br> tags in description sections
    content = content.replace(/<br\s*\/?>/gi, ' ');

    // 4. Remove all tags EXCEPT allowed ones: h1, h2, p, ul, ol, li, b
    const allowedTags = ['h1', 'h2', 'p', 'ul', 'ol', 'li', 'b'];
    
    // Replace disallowed tags with empty string (keeping content)
    content = content.replace(/<\/?([a-z0-9]+)[^>]*>/gi, (match, tagName) => {
        if (allowedTags.includes(tagName.toLowerCase())) {
            return match;
        }
        return ''; // Remove disallowed tag but keep content
    });
    
    return content;
};

// Helper to parse AI description into Allegro sections
const parseAiDescription = (text, productImages = []) => {
    if (!text) return { sections: [] };

    // Helper: Escape HTML characters to prevent breakage, then apply Bold formatting
    const formatLineContent = (str) => {
        // First sanitize to remove bad tags and attributes
        const sanitized = sanitizeDescriptionForAllegro(str);
        
        return sanitized
            // Restore Bold support: **text** -> <b>text</b>
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>'); 
    };

    // Normalize newlines
    const processedText = text.replace(/\r\n/g, '\n');

    // Split by image placeholders
    const parts = processedText.split(/\[ZDJĘCIE(?::.*?)?\]|<zdjecie>|\[IMAGE\]/i);
    const sections = [];
    let imageIndex = 0;

    parts.forEach((part, index) => {
        // Pre-process part to clean up HTML before splitting lines
        // This helps avoid issues with tags spanning multiple lines or being split incorrectly
        let cleanPart = part;
        
        // Remove empty lines and trim
        const lines = cleanPart.split('\n').map(l => l.trim()).filter(l => l);
        
        if (lines.length > 0) {
            let htmlBuffer = '';
            let isListOpen = false;

            lines.forEach(line => {
                // Sanitize the line first
                let sanitizedLine = sanitizeDescriptionForAllegro(line);
                if (!sanitizedLine.trim()) return;

                // Check if line contains HTML tags - if so, use it directly (it's already sanitized)
                // Pattern matches: <tag>content</tag>, <tag/>, <tag>, or any combination
                const htmlTagPattern = /<[a-z][a-z0-9]*(?:\s[^>]*)?(?:\s*\/)?>|<\/[a-z][a-z0-9]*>/i;
                const hasHtmlTags = htmlTagPattern.test(sanitizedLine);
                
                if (hasHtmlTags) {
                    // Close list if open
                    if (isListOpen) { htmlBuffer += '</ul>'; isListOpen = false; }
                    
                    // Use HTML directly
                    htmlBuffer += sanitizedLine;
                }
                // 1. Check for Headers (# H1, ## H2, ### -> H2)
                else if (sanitizedLine.startsWith('#')) {
                    // Close list if open
                    if (isListOpen) { htmlBuffer += '</ul>'; isListOpen = false; }
                    
                    let level = sanitizedLine.startsWith('##') ? 'h2' : 'h1';
                    // Force H2 for ### as H3 is not supported
                    if (sanitizedLine.startsWith('###')) level = 'h2';
                    
                    const content = sanitizedLine.replace(/^#+\s*/, '');
                    // formatLineContent also sanitizes, but we already sanitized line. 
                    // However, we want to handle **bold** inside headers too.
                    htmlBuffer += `<${level}>${content.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')}</${level}>`;
                }
                // 2. Check for List Items (- item or * item)
                else if (sanitizedLine.match(/^[-*]\s/)) {
                    // Open list if not open
                    if (!isListOpen) { htmlBuffer += '<ul>'; isListOpen = true; }
                    
                    const content = sanitizedLine.replace(/^[-*]\s*/, '');
                    htmlBuffer += `<li>${content.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')}</li>`;
                }
                // 3. Regular Paragraph
                else {
                    // Close list if open
                    if (isListOpen) { htmlBuffer += '</ul>'; isListOpen = false; }
                    
                    htmlBuffer += `<p>${sanitizedLine.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')}</p>`;
                }
            });

            // Close any remaining open list at end of part
            if (isListOpen) { htmlBuffer += '</ul>'; }

            if (htmlBuffer) {
                sections.push({
                    items: [{ type: 'TEXT', content: htmlBuffer }]
                });
            }
        }

        // Add image if available
        if (index < parts.length - 1) {
            if (imageIndex < productImages.length) {
                const imgUrl = productImages[imageIndex];
                
                // Try to append to previous section if it's a single TEXT item (standard Allegro layout)
                const lastSection = sections[sections.length - 1];
                if (lastSection && lastSection.items.length === 1 && lastSection.items[0].type === 'TEXT') {
                     lastSection.items.push({ type: 'IMAGE', url: imgUrl });
                } else {
                     sections.push({
                        items: [{ type: 'IMAGE', url: imgUrl }]
                     });
                }
                imageIndex++;
            }
        }
    });
    
    // Fallback
    if (sections.length === 0 && processedText) {
        return { sections: [{ items: [{ type: 'TEXT', content: `<p>${sanitizeDescriptionForAllegro(processedText)}</p>` }] }] };
    }

    return { sections };
};
// Helper to gather product data for AI
const prepareProductDataForAi = async (authData, currentOffer, categoryParamsCache, useEanLookup = true) => {
    const categoryId = currentOffer.category?.id;
    let parametersWithNames = [];

    // Try to fetch category parameters to get names for the parameter IDs
    if (categoryId) {
        if (!categoryParamsCache[categoryId]) {
            try {
                categoryParamsCache[categoryId] = await allegroAdapter.getCategoryParameters(authData.access_token, categoryId);
            } catch (e) {
                console.error(`Failed to fetch params for category ${categoryId}`, e.message);
                categoryParamsCache[categoryId] = [];
            }
        }
        
        const catParams = categoryParamsCache[categoryId];
        if (currentOffer.parameters && Array.isArray(currentOffer.parameters)) {
            parametersWithNames = currentOffer.parameters.map(p => {
                const def = catParams.find(cp => cp.id === p.id);
                return {
                    name: def ? def.name : p.id,
                    values: p.values || p.valuesIds
                };
            });
        }
    }

    // --- Fetch Product Catalog Data ---
    let catalogData = null;
    let catalogDescriptionText = '';
    let webSearchData = null;
    
    // Extract current description
    let currentDescriptionText = '';
    if (currentOffer.description && currentOffer.description.sections) {
        currentDescriptionText = currentOffer.description.sections
            .map(section => section.items
                .filter(item => item.type === 'TEXT')
                .map(item => item.content) // Keep HTML tags for context
                .join(' ')
            )
            .join('\n');
    }
    
    try {
        // 1. Try to get ID from productSet
        let productId = currentOffer.product?.id;
        if (!productId && currentOffer.productSet && currentOffer.productSet.length > 0) {
            productId = currentOffer.productSet[0].product?.id;
        }

        // 2. Fetch details if we have an ID (PRIORITY: Get EAN from Catalog)
        if (productId) {
            catalogData = await allegroAdapter.getProductDetails(authData, productId);
            
            if (catalogData) {
                // Extract description from catalog
                if (catalogData.description && catalogData.description.sections) {
                    catalogDescriptionText = catalogData.description.sections
                        .map(section => section.items
                            .filter(item => item.type === 'TEXT')
                            .map(item => item.content.replace(/<[^>]*>/g, ' ')) // Strip HTML
                            .join(' ')
                        )
                        .join('\n');
                }
                
                // Merge/Add catalog parameters if not already present
                if (catalogData.parameters) {
                    catalogData.parameters.forEach(cp => {
                        // If we don't have this param in our list, add it
                        if (cp.name && !parametersWithNames.some(p => p.name === cp.name)) {
                            parametersWithNames.push({
                                name: cp.name,
                                values: cp.valuesLabels || cp.values || []
                            });
                        }
                    });
                }
            }
        }

        // 3. Resolve EAN
        let ean = currentOffer.ean || (currentOffer.parameters && currentOffer.parameters.find(p => p.id === '225693')?.valuesIds?.[0]); // 225693 is often EAN
        
        // If not found in offer, try Catalog Data
        if (!ean && catalogData) {
            if (catalogData.gtins && catalogData.gtins.length > 0) {
                ean = catalogData.gtins[0];
                console.log(`[BulkEdit] Found EAN in Catalog Data: ${ean}`);
            } else if (catalogData.parameters) {
                 // Try to find EAN/GTIN in catalog parameters
                 const eanParam = catalogData.parameters.find(p => p.name && (p.name.toLowerCase() === 'ean' || p.name.toLowerCase() === 'gtin' || p.name.toLowerCase() === 'kod producenta'));
                 if (eanParam && eanParam.valuesLabels && eanParam.valuesLabels.length > 0) {
                     ean = eanParam.valuesLabels[0];
                      console.log(`[BulkEdit] Found EAN in Catalog Parameters: ${ean}`);
                 }
            }
        }

        // 4. Web Search AI (Primary Source for Context)
        if (ean) {
            try {
                console.log(`[BulkEdit] Identifying product via Web Search AI for EAN: ${ean}`);
                webSearchData = await eanDbService.getProduct(ean);
            } catch (e) {
                console.error('[BulkEdit] Web Search AI failed:', e.message);
            }
        }

        // 5. Fallback: If no productId yet, but we have EAN (maybe from offer), try to find product by EAN
        if (useEanLookup && !productId && ean) {
            const found = await allegroAdapter.findProductByEan(authData, ean);
            if (found && found.id) {
                productId = found.id;
                // If we found a product now, we could theoretically fetch catalogData here if it was missing
                // but we already have ean for Web Search, so it's fine.
            }
        }

    } catch (catalogError) {
        console.error('[BulkEdit] Error fetching catalog data:', catalogError.message);
        // Continue without catalog data
    }

    // Merge Web Search Data into Catalog Description Context
    if (webSearchData) {
        if (webSearchData.description) {
            catalogDescriptionText = `[AI WEB SEARCH INFO]:\n${webSearchData.description}\n\n[ALLEGRO CATALOG INFO]:\n${catalogDescriptionText}`;
        }
        
        // Add Web Search parameters if useful
        if (webSearchData.manufacturer && !parametersWithNames.some(p => p.name && p.name.toLowerCase().includes('producent'))) {
             parametersWithNames.push({ name: 'Producent (AI)', values: [webSearchData.manufacturer] });
        }
        
        if (webSearchData.dimensions) {
             const dims = webSearchData.dimensions;
             if (dims.width) parametersWithNames.push({ name: 'Szerokość (AI)', values: [`${dims.width} cm`] });
             if (dims.height) parametersWithNames.push({ name: 'Wysokość (AI)', values: [`${dims.height} cm`] });
             if (dims.depth) parametersWithNames.push({ name: 'Głębokość (AI)', values: [`${dims.depth} cm`] });
             if (dims.weight) parametersWithNames.push({ name: 'Waga (AI)', values: [`${dims.weight} kg`] });
        }
    }

    return {
        id: currentOffer.id,
        productName: (catalogData && catalogData.name) ? catalogData.name : (webSearchData && webSearchData.name ? webSearchData.name : currentOffer.name),
        eanCode: (catalogData && catalogData.gtins && catalogData.gtins[0]) || currentOffer.ean || (currentOffer.parameters && currentOffer.parameters.find(p => p.id === '225693')?.valuesIds?.[0]) || '',
        parameters: parametersWithNames,

        categoryName: categoryId,
        catalogDescription: catalogDescriptionText,
        description: currentDescriptionText,
        manufacturer: (catalogData && catalogData.parameters) ? catalogData.parameters.find(p => p.name && p.name.toLowerCase().includes('producent'))?.valuesLabels?.[0] : (webSearchData && webSearchData.manufacturer ? webSearchData.manufacturer : ''),
        images: currentOffer.images || []
    };
};

// Helper to ensure bulk_edits_count column exists
const ensureBulkEditsColumn = async () => {
    try {
        await db.execute('SELECT bulk_edits_count FROM wallet LIMIT 1');
    } catch (e) {
        if (e.code === 'ER_BAD_FIELD_ERROR') {
             console.log('Adding bulk_edits_count column to wallet table...');
             await db.execute('ALTER TABLE wallet ADD COLUMN bulk_edits_count INT DEFAULT 0');
        }
    }
};

// Background processing function
const processBulkEdit = async (jobId, offerIds, modifications, authData, userId, reqContext = null) => {
    const job = jobs.get(jobId);
    if (!job) return;

    job.status = 'processing';
    
    // Cache for category parameters to avoid redundant API calls
    const categoryParamsCache = {};
    
    // Determine mode and chunk size
    const isAiMode = !!modifications.aiTemplateId;
    const isImageMode = !!modifications.imageProcessing && modifications.imageProcessing.enabled;
    const isComplexMode = isAiMode || isImageMode;
    const BATCH_SIZE = isComplexMode ? 3 : 2; // Reduced AI batch size to avoid token limits
    
    // Process in chunks
    const chunks = chunk(offerIds, BATCH_SIZE);
    
    for (const batchIds of chunks) {
        let batchResults = [];

        try {
            if (isComplexMode) {
                // --- BULK AI / IMAGE MODE ---
                
                // 1. Fetch all offers in batch
                const offersData = await Promise.all(batchIds.map(async (id) => {
                    try {
                        const offer = await allegroAdapter.getOffer(authData, id);
                        return { id, offer, error: null };
                    } catch (e) {
                        return { id, offer: null, error: e.message };
                    }
                }));

                const validOffers = offersData.filter(i => i.offer && !i.error);
                const failedOffers = offersData.filter(i => i.error);

                // 2. Prepare data for AI (Only if AI Mode)
                let productsForAi = [];
                if (isAiMode) {
                    productsForAi = await Promise.all(validOffers.map(async (item) => {
                        const data = await prepareProductDataForAi(authData, item.offer, categoryParamsCache, true);
                        if (modifications.aiOptions) {
                            data.aiOptions = modifications.aiOptions;
                        }
                        return data;
                    }));
                }

                // 3. Generate Bulk Descriptions (Only if AI Mode)
                let aiDescriptions = {};
                if (isAiMode && productsForAi.length > 0) {
                    console.log(`[Batch] Generating AI for ${productsForAi.length} items: ${productsForAi.map(p => p.id).join(', ')}`);
                    try {
                        const aiResult = await aiGenerator.generateBulkDescriptions(productsForAi, userId, modifications.aiTemplateId);
                        if (aiResult.success) {
                            aiDescriptions = aiResult.descriptionsMap;
                            console.log(`[Batch] AI generated descriptions for ${Object.keys(aiDescriptions).length} offers: ${Object.keys(aiDescriptions).join(', ')}`);
                            
                            // Log bulk AI generation activity
                            try {
                                const logReq = reqContext || {
                                    headers: {},
                                    socket: { remoteAddress: null }
                                };
                                await logActivity(logReq, userId, 'ai_bulk_description_generated', {
                                    count: Object.keys(aiDescriptions).length,
                                    offerIds: Object.keys(aiDescriptions),
                                    jobId: jobId,
                                    templateId: modifications.aiTemplateId
                                });
                            } catch (logError) {
                                console.error(`Failed to log bulk AI generation activity:`, logError);
                            }
                        } else {
                            console.warn(`[Batch] AI generation failed or returned no descriptions`);
                        }
                    } catch (aiError) {
                        console.error("AI Bulk Generation Error:", aiError);
                    }
                }

                // 4. Update Offers
                const updatePromises = validOffers.map(async (item) => {
                    const offerId = item.id;
                    const generatedDesc = aiDescriptions[offerId];
                    const currentOffer = item.offer;
                    
                    try {
                        const patchPayload = {};
                        
                        // AI Description
                        if (generatedDesc && generatedDesc.trim().length > 0) {
                            const parsed = parseAiDescription(generatedDesc, currentOffer.images || []);
                            if (parsed.sections && parsed.sections.length > 0) {
                                patchPayload.description = { sections: parsed.sections };
                                console.log(`[Batch] Adding AI description for offer ${offerId} (${parsed.sections.length} sections)`);
                            } else {
                                console.warn(`[Batch] Parsed description for offer ${offerId} resulted in empty sections`);
                            }
                        } else {
                            if (isAiMode) {
                                console.warn(`[Batch] No AI description generated for offer ${offerId}`);
                            }
                        }

                        // Image Processing
                        if (isImageMode && currentOffer.images && currentOffer.images.length > 0) {
                            console.log(`[Batch] Processing images for offer ${offerId}...`);
                            const processedImageUrls = [];
                            
                            // Process all images
                            for (let i = 0; i < currentOffer.images.length; i++) {
                                const imgUrl = currentOffer.images[i];
                                try {
                                    // 1. Process Image
                                    const result = await imageProcessor.processImage({
                                        imageUrl: imgUrl,
                                        editType: modifications.imageProcessing.type || 'enhance',
                                        backgroundImageUrl: modifications.imageProcessing.backgroundImageUrl
                                    });
                                    
                                    // 2. Upload to Allegro
                                    // Use local path for upload
                                    const allegroUrl = await allegroAdapter.uploadImage(authData, result.localPath || result.processedUrl);
                                    
                                    if (allegroUrl) {
                                        processedImageUrls.push(allegroUrl);
                                        // Cleanup local processed file
                                        if (result.localPath && require('fs').existsSync(result.localPath)) {
                                            require('fs').unlinkSync(result.localPath);
                                        }
                                    } else {
                                        // Fallback to original if upload fails
                                        console.warn(`Failed to upload processed image for ${offerId}, keeping original.`);
                                        processedImageUrls.push(imgUrl);
                                    }
                                } catch (imgError) {
                                    console.error(`Error processing image ${i} for offer ${offerId}:`, imgError);
                                    // Fallback to original
                                    processedImageUrls.push(imgUrl);
                                }
                            }
                            
                            if (processedImageUrls.length > 0) {
                                patchPayload.images = processedImageUrls.map(url => ({ url }));
                            }
                        }

                        // Other modifications
                        if (modifications.price) {
                            patchPayload.sellingMode = { 
                                price: { 
                                    amount: String(modifications.price.amount), 
                                    currency: modifications.price.currency || 'PLN' 
                                } 
                            };
                        }
                        if (modifications.stock) {
                            if (!patchPayload.stock) patchPayload.stock = {};
                            patchPayload.stock.available = parseInt(modifications.stock);
                            patchPayload.stock.unit = 'UNIT';
                        }
                        if (modifications.status) {
                            if (!patchPayload.publication) patchPayload.publication = {};
                            patchPayload.publication.status = modifications.status;
                        }

                        // Execute Update
                        if (Object.keys(patchPayload).length > 0) {
                            const result = await allegroAdapter.updateOffer(authData, offerId, patchPayload);
                            if (result.success) {
                                // Log activity for description or image updates
                                try {
                                    const activityTypes = [];
                                    if (patchPayload.description) {
                                        activityTypes.push('description_updated');
                                    }
                                    if (patchPayload.images) {
                                        activityTypes.push('image_updated');
                                    }
                                    
                                    // Log each activity type
                                    // Create a minimal request-like object for logActivity
                                    const logReq = reqContext || {
                                        headers: {},
                                        socket: { remoteAddress: null }
                                    };
                                    
                                    for (const activityType of activityTypes) {
                                        await logActivity(logReq, userId, activityType, {
                                            offerId: offerId,
                                            type: 'bulk_edit',
                                            jobId: jobId
                                        });
                                    }
                                } catch (logError) {
                                    console.error(`Failed to log activity for offer ${offerId}:`, logError);
                                }
                                
                                return { 
                                    id: offerId, 
                                    success: true, 
                                    shouldCharge: !!(generatedDesc && generatedDesc.trim().length > 0) || (isImageMode && patchPayload.images && patchPayload.images.length > 0),
                                    hasAiDescription: !!(generatedDesc && generatedDesc.trim().length > 0),
                                    hasImageProcessing: !!(isImageMode && patchPayload.images && patchPayload.images.length > 0)
                                };
                            } else {
                                throw new Error(result.message);
                            }
                        } else {
                            // Provide more specific error message
                            let errorMsg = 'No changes to apply';
                            if (isAiMode && !generatedDesc) {
                                errorMsg = 'AI description generation failed or returned empty result';
                            } else if (isAiMode && generatedDesc && generatedDesc.trim().length === 0) {
                                errorMsg = 'AI description was generated but is empty';
                            }
                            console.warn(`[Batch] No changes for offer ${offerId}: ${errorMsg}`);
                            return { id: offerId, success: false, error: errorMsg };
                        }
                    } catch (e) {
                        return { id: offerId, success: false, error: e.message };
                    }
                });

                const updates = await Promise.all(updatePromises);
                
                // Process Payments SEQUENTIALLY
                // Create map for product names if available
                const productsMap = new Map((productsForAi || []).map(p => [p.id, p]));

                for (const updateResult of updates) {
                    if (updateResult.success && updateResult.shouldCharge) {
                        try {
                            const wallet = await walletService.getUserWallet(userId);
                            const offersCreated = parseInt(wallet.offers_created || 0);
                            const price = walletService.calculateAiDescriptionPrice(offersCreated);
                            
                            // Determine description (use same type 'ai_description_update' for all bulk edits - same pricing)
                            let description = '';
                            let productId = null;
                            
                            const productInfo = productsMap.get(updateResult.id);
                            
                            if (updateResult.hasAiDescription && updateResult.hasImageProcessing) {
                                // Both AI description and image processing
                                description = productInfo ? `Masowa edycja (AI + Grafiki): ${productInfo.productName}` : `Masowa edycja (AI + Grafiki) dla oferty ${updateResult.id}`;
                            } else if (updateResult.hasAiDescription) {
                                // Only AI description
                                description = productInfo ? `Masowa edycja (AI): ${productInfo.productName}` : `Masowa edycja (AI) dla oferty ${updateResult.id}`;
                            } else if (updateResult.hasImageProcessing) {
                                // Only image processing
                                description = productInfo ? `Masowa edycja (Grafiki): ${productInfo.productName}` : `Masowa edycja (Grafiki) dla oferty ${updateResult.id}`;
                            }
                            
                            // Try to find product_id based on EAN if available
                            if (productInfo && productInfo.eanCode) {
                                try {
                                    const [products] = await db.execute(
                                        'SELECT id FROM products WHERE user_id = ? AND ean_code = ? LIMIT 1',
                                        [userId, productInfo.eanCode]
                                    );
                                    if (products.length > 0) {
                                        productId = products[0].id;
                                    }
                                } catch (e) {
                                    console.error(`Failed to find product_id for EAN ${productInfo.eanCode}:`, e);
                                }
                            }
                            
                            // Charge wallet with progressive pricing (use 'ai_description_update' type for all bulk edits - same pricing)
                            await walletService.chargeWallet(
                                userId, 
                                price, 
                                'ai_description_update', 
                                productId, 
                                updateResult.id, 
                                description
                            );
                            
                            // Update offers_created count (both AI and image processing count towards the same counter)
                            const newOffersCreated = offersCreated + 1;
                            await db.execute('UPDATE wallet SET offers_created = ? WHERE user_id = ?', [newOffersCreated, userId]);
                            
                            console.log(`[BulkEdit] Charged ${price.toFixed(2)} PLN for offer ${updateResult.id} (${updateResult.hasAiDescription ? 'AI' : ''}${updateResult.hasAiDescription && updateResult.hasImageProcessing ? ' + ' : ''}${updateResult.hasImageProcessing ? 'Grafiki' : ''})`);
                        } catch (chargeError) {
                            console.error(`Failed to charge wallet for offer ${updateResult.id}:`, chargeError);
                        }
                    }
                }

                batchResults = [...updates, ...failedOffers.map(f => ({ id: f.id, success: false, error: f.error }))];

            } else {
                // --- STANDARD MODE (No AI/Image) ---
                const promises = batchIds.map(async (offerId) => {
                    try {
                        // 1. Simple Price Update (Command API)
                        if (modifications.price && Object.keys(modifications).length === 1) {
                            const result = await allegroAdapter.changePrice(authData, offerId, modifications.price.amount, modifications.price.currency || 'PLN');
                            
                            if (result.success && result.commandId) {
                                // POLL FOR COMPLETION (Wait for Allegro to actually process it)
                                let retries = 0;
                                let completed = false;
                                while (retries < 15 && !completed) { // Wait up to 30 seconds
                                    await new Promise(resolve => setTimeout(resolve, 2000));
                                    const statusCheck = await allegroAdapter.checkPriceChangeCommand(authData, result.commandId);
                                    
                                    if (statusCheck.success && statusCheck.data.taskCount) {
                                        const { total, success, failed } = statusCheck.data.taskCount;
                                        if (success + failed === total) {
                                            completed = true;
                                            if (failed > 0) {
                                                // Try to get error details if available
                                                 throw new Error('Price change rejected by Allegro');
                                            }
                                        }
                                    }
                                    retries++;
                                }
                                if (!completed) {
                                    // Timeout
                                    console.warn(`Price change command ${result.commandId} timed out waiting for confirmation`);
                                }
                                return { id: offerId, success: true, method: 'command' };
                            } else if (result.success) {
                                return { id: offerId, success: true, method: 'command' };
                            }
                            else throw new Error(result.message);
                        }

                        // 2. Fetch Offer
                        const currentOffer = await allegroAdapter.getOffer(authData, offerId);
                        if (!currentOffer) throw new Error('Offer not found or access denied');

                        // 3. Prepare Payload
                        const patchPayload = {};
                        if (modifications.price) {
                            patchPayload.sellingMode = { 
                                price: { amount: String(modifications.price.amount), currency: modifications.price.currency || 'PLN' } 
                            };
                        }
                        if (modifications.stock) {
                            if (!patchPayload.stock) patchPayload.stock = {};
                            patchPayload.stock.available = parseInt(modifications.stock);
                            patchPayload.stock.unit = 'UNIT';
                        }
                        if (modifications.status) {
                            if (!patchPayload.publication) patchPayload.publication = {};
                            patchPayload.publication.status = modifications.status;
                        }

                        // 4. Update
                        if (Object.keys(patchPayload).length > 0) {
                            const result = await allegroAdapter.updateOffer(authData, offerId, patchPayload);
                            if (result.success) {
                                // Log activity for description or image updates (if any in future)
                                // For now, standard mode doesn't update descriptions/images, but we can log other changes
                                return { id: offerId, success: true };
                            }
                            else throw new Error(result.message);
                        } else {
                            return { id: offerId, success: true, message: 'No changes applied' };
                        }

                    } catch (error) {
                        return { id: offerId, success: false, error: error.message };
                    }
                });

                batchResults = await Promise.all(promises);
            }
        } catch (error) {
            console.error('Batch processing error:', error);
            console.error(error.stack); // Log stack trace
            // Mark all in batch as failed
            batchResults = batchIds.map(id => ({ id, success: false, error: `Critical batch error: ${error.message}` }));
        }

        // Process results for job
        batchResults.forEach(r => {
            job.processed++;
            if (r.success) job.success++;
            else {
                job.failed++;
                job.details.push(r);
            }
        });
        
        // Update job timestamp
        job.updatedAt = new Date();
    }
    
    // Update bulk edits count in wallet
    if (job.success > 0) {
        try {
            await ensureBulkEditsColumn();
            await db.execute('UPDATE wallet SET bulk_edits_count = COALESCE(bulk_edits_count, 0) + ? WHERE user_id = ?', [job.success, userId]);
        } catch (e) {
            console.error('Failed to update bulk_edits_count:', e);
        }
    }

    job.status = 'completed';
    job.completedAt = new Date();
};

// Get offers from Allegro (Active/Inactive)
router.get('/offers', authenticate, async (req, res) => {
  try {
    const { status = 'ACTIVE', offset = 0, limit = 50, sortBy = 'default' } = req.query;
    const userId = req.userId;

    // Get Allegro Integration
    const [integrations] = await db.execute(
      'SELECT * FROM marketplace_integrations WHERE marketplace = ? AND user_id = ?',
      ['allegro', userId]
    );

    if (integrations.length === 0 || !integrations[0].access_token) {
      return res.status(404).json({ error: 'Allegro integration not connected' });
    }

    const accessToken = decrypt(integrations[0].access_token);

    // Use axios directly or adapter helper if exists (adapter usually for single ops)
    const axios = require('axios');
    
    // Fetch more offers if we need to sort (we'll sort and then paginate)
    const fetchLimit = sortBy !== 'default' ? Math.max(limit * 3, 300) : limit;
    
    const response = await axios.get('https://api.allegro.pl/sale/offers', {
      params: {
        'publication.status': status,
        limit: fetchLimit,
        offset: 0 // Start from beginning if sorting
      },
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.allegro.public.v1+json'
      }
    });

    // Identify offers currently being processed
    const processingOfferIds = new Set();
    for (const job of jobs.values()) {
        if ((job.status === 'processing' || job.status === 'pending') && job.userId === userId && job.offerIds) {
            job.offerIds.forEach(id => processingOfferIds.add(id));
        }
    }

    let offers = response.data.offers.map(o => ({
      id: o.id,
      name: o.name,
      price: o.sellingMode?.price?.amount,
      currency: o.sellingMode?.price?.currency,
      stock: o.stock?.available,
      status: o.publication?.status,
      image: o.primaryImage?.url,
      ean: o.ean || (o.parameters && o.parameters.find(p => p.id === '225693')?.valuesIds?.[0]),
      updatedAt: o.updatedAt, // Get direct from Allegro
      lastUpdated: null, // Will be populated from user_activities (fallback/history)
      isProcessing: processingOfferIds.has(o.id)
    }));

    // Get last update dates from user_activities for each offer
    if (offers.length > 0) {
      const offerIds = offers.map(o => o.id);
      
      try {
        // Fetch all relevant activities for this user
        const [activities] = await db.execute(
          `SELECT details, created_at, type 
           FROM user_activities
           WHERE user_id = ? 
           AND type IN ('description_updated', 'image_updated', 'ai_description_generated', 'ai_bulk_description_generated')
           ORDER BY created_at DESC`,
          [userId]
        );

        // Create a map of offerId -> last_updated
        const lastUpdateMap = new Map();
        activities.forEach(activity => {
          try {
            const details = typeof activity.details === 'string' ? JSON.parse(activity.details) : activity.details;
            const offerId = details?.offerId || details?.productId;
            if (offerId && offerIds.includes(offerId) && activity.created_at) {
              const existing = lastUpdateMap.get(offerId);
              if (!existing || new Date(activity.created_at) > new Date(existing)) {
                lastUpdateMap.set(offerId, activity.created_at);
              }
            }
          } catch (parseError) {
            // Skip invalid JSON
          }
        });

        // Add lastUpdated to offers
        offers = offers.map(offer => ({
          ...offer,
          lastUpdated: lastUpdateMap.get(offer.id) || null
        }));
      } catch (dbError) {
        console.error('Error fetching last update dates:', dbError);
        // Continue without lastUpdated dates
      }
    }

    // Sort offers based on sortBy parameter
    if (sortBy === 'last_updated_desc') {
      offers.sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt) : (a.lastUpdated ? new Date(a.lastUpdated) : new Date(0));
        const dateB = b.updatedAt ? new Date(b.updatedAt) : (b.lastUpdated ? new Date(b.lastUpdated) : new Date(0));
        return dateB - dateA;
      });
    } else if (sortBy === 'last_updated_asc') {
      offers.sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt) : (a.lastUpdated ? new Date(a.lastUpdated) : new Date(0));
        const dateB = b.updatedAt ? new Date(b.updatedAt) : (b.lastUpdated ? new Date(b.lastUpdated) : new Date(0));
        return dateA - dateB;
      });
    }

    // Apply pagination after sorting
    const startIndex = parseInt(offset);
    const endIndex = startIndex + parseInt(limit);
    const paginatedOffers = offers.slice(startIndex, endIndex);

    res.json({ 
      offers: paginatedOffers, 
      count: paginatedOffers.length, 
      totalCount: response.data.totalCount || offers.length 
    });

  } catch (error) {
    console.error('Error fetching Allegro offers:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

// Get single offer details
router.get('/offer/:offerId', authenticate, async (req, res) => {
  try {
    const { offerId } = req.params;
    const userId = req.userId;

    // Get Allegro Integration
    const [integrations] = await db.execute(
      'SELECT * FROM marketplace_integrations WHERE marketplace = ? AND user_id = ?',
      ['allegro', userId]
    );

    if (integrations.length === 0 || !integrations[0].access_token) {
      return res.status(404).json({ error: 'Allegro integration not connected' });
    }

    const authData = {
      access_token: decrypt(integrations[0].access_token),
      refresh_token: integrations[0].refresh_token ? decrypt(integrations[0].refresh_token) : null,
      id: integrations[0].id,
      user_id: userId
    };

    const offer = await allegroAdapter.getOffer(authData, offerId);
    
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    res.json(offer);

  } catch (error) {
    console.error('Error fetching Allegro offer details:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch offer details' });
  }
});

router.post('/bulk-edit', authenticate, async (req, res) => {
  try {
    const { offerIds, modifications } = req.body;
    const userId = req.userId;

    if (!offerIds || !Array.isArray(offerIds) || offerIds.length === 0) {
      return res.status(400).json({ error: 'No offer IDs provided' });
    }
    
    // Check if any offers are already processing
    const processingOfferIds = new Set();
    for (const job of jobs.values()) {
        if ((job.status === 'processing' || job.status === 'pending') && job.userId === userId && job.offerIds) {
            job.offerIds.forEach(id => processingOfferIds.add(id));
        }
    }
    
    const conflicts = offerIds.filter(id => processingOfferIds.has(id));
    if (conflicts.length > 0) {
        return res.status(409).json({ 
            error: 'Niektóre oferty są już przetwarzane. Poczekaj na zakończenie obecnych zadań.', 
            conflictingIds: conflicts 
        });
    }

    if (!modifications) {
      return res.status(400).json({ error: 'No modifications provided' });
    }

    // CHECK WALLET BALANCE if AI Template or Image Processing is used
    const isAiMode = !!modifications.aiTemplateId;
    const isImageMode = !!modifications.imageProcessing && modifications.imageProcessing.enabled;
    
    if (isAiMode || isImageMode) {
        const wallet = await walletService.getUserWallet(userId);
        const offersCreated = parseInt(wallet.offers_created || 0);
        // Use progressive pricing - calculate total cost for all offers
        const totalCost = walletService.calculateTotalPrice(offersCreated, offerIds.length);
        
        const { hasBalance, balance } = await walletService.checkBalance(userId, totalCost);
        
        if (!hasBalance) {
            return res.status(402).json({ 
                error: 'Niewystarczające środki w portfelu', 
                details: `Koszt operacji: ${totalCost.toFixed(2)} PLN, Twój bilans: ${balance.toFixed(2)} PLN. Doładuj konto aby kontynuować.`
            });
        }
    }

    // Get Allegro Integration Token
    const [integrations] = await db.execute(
      'SELECT * FROM marketplace_integrations WHERE marketplace = ? AND user_id = ?',
      ['allegro', userId]
    );

    if (integrations.length === 0 || !integrations[0].access_token) {
      return res.status(404).json({ error: 'Allegro integration not connected' });
    }

    const authData = {
      access_token: decrypt(integrations[0].access_token),
      refresh_token: integrations[0].refresh_token ? decrypt(integrations[0].refresh_token) : null,
      id: integrations[0].id,
      user_id: userId
    };

    // Verify connection & refresh token if needed
    const connectionTest = await allegroAdapter.testConnection(authData.access_token, authData.refresh_token);
    if (!connectionTest.success && !connectionTest.tokenRefreshed) {
        return res.status(401).json({ error: 'Allegro connection failed. Please reconnect.' });
    }
    if (connectionTest.tokenRefreshed) {
        authData.access_token = connectionTest.newAccessToken;
        authData.refresh_token = connectionTest.newRefreshToken;
        // Update DB (encrypt tokens before saving)
        await db.execute(
            'UPDATE marketplace_integrations SET access_token = ?, refresh_token = ? WHERE id = ?',
            [encrypt(authData.access_token), encrypt(authData.refresh_token), authData.id]
        );
    }

    // Create Background Job
    const jobId = crypto.randomUUID();
    
    // Create request context for logging
    const reqContext = {
        headers: req.headers,
        socket: { remoteAddress: req.ip || (req.socket ? req.socket.remoteAddress : null) },
        ip: req.ip
    };
    
    jobs.set(jobId, {
      id: jobId,
      status: 'pending',
      offerIds: offerIds, // Store offerIds to track processing status
      total: offerIds.length,
      processed: 0,
      success: 0,
      failed: 0,
      details: [],
      createdAt: new Date(),
      userId: userId
    });

    // Start processing in background (async, don't await)
    processBulkEdit(jobId, offerIds, modifications, authData, userId, reqContext).catch(err => {
        console.error('Background job failed fatally:', err);
        const job = jobs.get(jobId);
        if (job) {
            job.status = 'failed';
            job.error = err.message;
        }
    });

    res.json({ 
        success: true, 
        message: 'Bulk edit started in background', 
        jobId: jobId,
        info: 'Use GET /bulk-edit/status/:jobId to check progress'
    });

  } catch (error) {
    console.error('Bulk edit error:', error);
    res.status(500).json({ error: 'Internal server error during bulk edit' });
  }
});

// Check Job Status
router.get('/bulk-edit/status/:jobId', authenticate, (req, res) => {
    const { jobId } = req.params;
    const userId = req.userId;
    
    const job = jobs.get(jobId);
    
    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }
    
    // Security check: ensure user owns the job
    if (job.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({
        id: job.id,
        status: job.status,
        total: job.total,
        processed: job.processed,
        success: job.success,
        failed: job.failed,
        details: job.details,
        createdAt: job.createdAt,
        completedAt: job.completedAt
    });
});

// Generate Description for Single Offer
router.post('/offer/:offerId/generate-description', authenticate, async (req, res) => {
    try {
        const { offerId } = req.params;
        const { templateId } = req.body;
        const userId = req.userId;

        // CHECK WALLET BALANCE
        const wallet = await walletService.getUserWallet(userId);
        const price = walletService.calculateAiDescriptionPrice(wallet.offers_created);
        const { hasBalance, balance } = await walletService.checkBalance(userId, price);
        
        if (!hasBalance) {
            return res.status(402).json({ 
                error: 'Niewystarczające środki w portfelu', 
                details: `Koszt operacji: ${price.toFixed(2)} PLN, Twój bilans: ${balance.toFixed(2)} PLN.`
            });
        }

        // Get Allegro Integration
        const [integrations] = await db.execute(
            'SELECT * FROM marketplace_integrations WHERE marketplace = ? AND user_id = ?',
            ['allegro', userId]
        );

        if (integrations.length === 0 || !integrations[0].access_token) {
            return res.status(404).json({ error: 'Allegro integration not connected' });
        }

        const authData = {
            access_token: decrypt(integrations[0].access_token),
            refresh_token: integrations[0].refresh_token ? decrypt(integrations[0].refresh_token) : null,
            id: integrations[0].id,
            user_id: userId
        };

        // Fetch Offer Data
        const currentOffer = await allegroAdapter.getOffer(authData, offerId);
        if (!currentOffer) {
            return res.status(404).json({ error: 'Offer not found' });
        }

        // Check user preferences for EAN lookup
        const [prefs] = await db.execute('SELECT use_allegro_ean_lookup FROM user_preferences WHERE user_id = ?', [userId]);
        const useEanLookup = prefs.length > 0 ? (prefs[0].use_allegro_ean_lookup !== 0 && prefs[0].use_allegro_ean_lookup !== false) : true;

        // Prepare Data for AI
        const productData = await prepareProductDataForAi(authData, currentOffer, {}, useEanLookup);
        
        // Add manual inputs/options if provided (not yet in UI for single generate, but ready for future)
        // For single generate endpoint, we can accept aiOptions in body if we want
        if (req.body.aiOptions) {
            productData.aiOptions = req.body.aiOptions;
        }

        // Generate Description
        const result = await aiGenerator.generateDescription(productData, userId, templateId);

        // Parse result to Allegro format for preview
        const parsed = parseAiDescription(result.description, currentOffer.images || []);

        // CHARGE WALLET
        const description = `Zmiana opisu AI: ${productData.productName}`;
        await walletService.chargeForAiDescription(userId, offerId, description);

        res.json({
            success: true,
            description: result.description,
            parsedDescription: parsed,
            provider: result.provider
        });

    } catch (error) {
        console.error('Single offer AI generation error:', error);
        res.status(500).json({ 
            error: 'Failed to generate description', 
            details: error.message 
        });
    }
});

module.exports = router;
