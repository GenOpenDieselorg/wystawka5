const axios = require('axios');
const BaseMarketplaceAdapter = require('./base');
const path = require('path');
const fs = require('fs');
const db = require('../../config/database');
const allegroOAuth = require('../allegroOAuth');
const { validatePath } = require('../../utils/pathValidator'); // Import path validator

/**
 * Allegro Marketplace Adapter
 */
class AllegroAdapter extends BaseMarketplaceAdapter {
  constructor() {
    super('allegro');
  }

  /**
   * Validate Allegro offer ID to prevent malformed paths / SSRF-like issues.
   * Allegro offer IDs are typically UUID-like strings; we conservatively allow
   * only alphanumerics and dashes, with a bounded length.
   */
  _validateAllegroOfferId(offerId) {
    if (typeof offerId !== 'string') {
      throw new Error('Invalid offer ID: must be a string');
    }
    const trimmed = offerId.trim();
    // Allow 1-64 characters: letters, digits, and hyphen
    const idPattern = /^[A-Za-z0-9\-]{1,64}$/;
    if (!idPattern.test(trimmed)) {
      throw new Error('Invalid offer ID format');
    }
    return trimmed;
  }

  _validateOfferId(offerId) {
    if (!offerId) throw new Error('Offer ID is required');
    const id = String(offerId);
    if (!/^[a-zA-Z0-9-]+$/.test(id)) {
        throw new Error('Invalid offerId format (alphanumeric only)');
    }
    return id;
  }

  async testConnection(accessToken, refreshToken = null) {
    // First try with current token
    let result = await this._testAllegroConnection(accessToken, refreshToken);
    
    // If failed with 403/401 and we have refresh token, try to refresh
    if (!result.success && (result.errorCode === 403 || result.errorCode === 401) && refreshToken) {
      try {
        const allegroOAuth = require('../allegroOAuth');
        const newTokenData = await allegroOAuth.refreshAccessToken(refreshToken);
        
        // Try again with new token
        result = await this._testAllegroConnection(newTokenData.access_token, refreshToken);
        
        if (result.success) {
          result.message = 'Allegro connection successful (token was refreshed)';
          result.tokenRefreshed = true;
          result.newAccessToken = newTokenData.access_token;
          result.newRefreshToken = newTokenData.refresh_token;
        }
      } catch (refreshError) {
        console.error('Failed to refresh Allegro token:', refreshError);
        result.message = `Allegro connection failed: Token expired and refresh failed. Please reconnect to Allegro.`;
      }
    }
    
    return result;
  }

  async _testAllegroConnection(accessToken, refreshToken = null) {
    try {
      const response = await axios.get('https://api.allegro.pl/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.allegro.public.v1+json'
        }
      });
      return { success: true, message: 'Allegro connection successful', data: response.data };
    } catch (error) {
      // If 403 or 401, token might be expired - try to provide more details
      if (error.response?.status === 403 || error.response?.status === 401) {
        const errorDetail = error.response?.data?.error_description 
          || error.response?.data?.error 
          || error.response?.data?.message
          || 'Token may be expired or invalid. Try refreshing the connection.';
        
        return { 
          success: false, 
          message: `Allegro connection failed: ${errorDetail}`,
          errorCode: error.response?.status,
          suggestion: refreshToken ? 'Token may be expired. Try refreshing the connection.' : 'Token may be invalid or expired. Please reconnect to Allegro.'
        };
      }
      
      return { 
        success: false, 
        message: `Allegro connection failed: ${error.response?.data?.error_description || error.response?.data?.error || error.message}`,
        errorCode: error.response?.status
      };
    }
  }

  // Helper: Sanitize HTML description for Allegro
  _sanitizeDescriptionForAllegro(html) {
    if (!html) return '';

    console.log('[Allegro Sanitizer] Original length:', html.length);
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
        // console.log('[Allegro Sanitizer] Removing disallowed tag:', tagName);
        return ''; // Remove disallowed tag but keep content
    });
    
    console.log('[Allegro Sanitizer] Final length:', content.length);
    return content;
  }

  async publishProduct(authData, product, baseUrl) {
    let integrationId = null;
    let userId = null;
    let accessToken;
    let refreshToken;
    
    // Extract access token from authData (can be integration object or token string)
    if (authData && typeof authData === 'object' && authData.access_token) {
      integrationId = authData.id;
      userId = authData.user_id;
      accessToken = authData.access_token;
      refreshToken = authData.refresh_token;
    } else {
      accessToken = authData;
      // Legacy support where authData might be just the token string
    }
    
    // Retry loop for token refresh
    for (let attempt = 1; attempt <= 2; attempt++) {
      let categoryId = null;
      // Use current authData (might be updated if object)
      // Note: we mainly use accessToken variable which we update manually
      
      // Determine integration object for accessing settings like return_policy_id
      // If authData is just a string, we create a mock object
      let integration = (authData && typeof authData === 'object') ? authData : { access_token: accessToken };
      
      try {
        // Validation for required fields
        if (!product.product_name) {
          return { success: false, message: 'Allegro publish failed: Product name is required' };
        }

        // Allegro specific validation for name
        // Rules: max 75 chars, min 12 chars, min 3 words
        // We check against the truncated version we will send
        const nameToSend = product.product_name.substring(0, 75);
        
        if (nameToSend.length < 12) {
             return { success: false, message: `Allegro publish failed: Product name is too short. It must be at least 12 characters long (current: ${nameToSend.length}).` };
        }
        
        const wordCount = nameToSend.trim().split(/\s+/).length;
        if (wordCount < 3) {
             return { success: false, message: `Allegro publish failed: Product name has too few words. It must contain at least 3 words (current: ${wordCount}).` };
        }
        
        // 1. Find product in Allegro Catalog
        let allegroProductId = null;
        let catalogProduct = null;
        
        if (product.ean_code) {
          const foundProduct = await this._findAllegroProduct(accessToken, product.ean_code);
          if (foundProduct) {
            allegroProductId = foundProduct.id;
            categoryId = foundProduct.categoryId;
            
            // Fetch full product details including parameters from Allegro Catalog
            console.log(`Allegro publish: Fetching full product details for ${allegroProductId} in category ${categoryId}`);
            catalogProduct = await this._getAllegroProductDetails(accessToken, allegroProductId, categoryId);
            if (catalogProduct) {
              console.log(`Allegro publish: Got catalog product with ${catalogProduct.parameters?.length || 0} parameters`);
            }
          }
        }
        
        if (!allegroProductId) {
          // Try searching by name if no EAN or EAN not found (optional, maybe too risky?)
          // For now, let's return a clear error
          if (!product.ean_code) {
            return { success: false, message: 'Allegro publish failed: EAN code is required to match product in Allegro Catalog.' };
          }
          return { success: false, message: `Allegro publish failed: Product with EAN ${product.ean_code} not found in Allegro Catalog.` };
        }

        // Fetch responsible producers (GPSR compliance)
        const responsibleProducers = await this._getResponsibleProducers(accessToken);
        const responsibleProducer = responsibleProducers.length > 0 ? responsibleProducers[0] : null;

        // 2. Upload images to Allegro server
        const productImages = product.images || [];
        console.log(`Allegro publish: Found ${productImages.length} images to upload, baseUrl:`, baseUrl);
        
        const allegroImagePromises = productImages.map((img, idx) => {
          const imageSource = img.processedUrl || img.url;
          console.log(`Allegro publish: Image ${idx} source:`, imageSource);
          // Pass baseUrl for local files so they can be uploaded via public URL
          return this._uploadImageToAllegro(accessToken, imageSource, baseUrl);
        });
        
        const uploadedImageLocations = (await Promise.all(allegroImagePromises)).filter(url => url !== null && url !== undefined);
        
        console.log(`Allegro publish: Successfully uploaded ${uploadedImageLocations.length}/${productImages.length} images`);
        
        // Validate all uploaded image locations
        const validImageLocations = uploadedImageLocations.filter(location => {
          if (typeof location !== 'string' || location.trim() === '') {
            console.warn('Allegro publish: Invalid image location filtered out:', location);
            return false;
          }
          // Validate URL format
          try {
            new URL(location);
          } catch (e) {
            console.warn('Allegro publish: Invalid URL format filtered out:', location);
            return false;
          }
          return true;
        });
        
        console.log('Allegro publish: Valid image locations:', validImageLocations);
        
        // Allegro API expects images as array of strings (URLs), not objects
        const imagesPayload = validImageLocations;

        // 3. Prepare description
        let descriptionContent;
        const rawDescription = product.description || product.product_name;

        // Check if description already contains HTML tags
        if (/<[a-z][\s\S]*>/i.test(rawDescription)) {
          // Sanitize HTML content for Allegro (remove disallowed tags like br)
          descriptionContent = this._sanitizeDescriptionForAllegro(rawDescription);
        } else {
          // Convert plain text to HTML
          // Replace newlines with paragraph breaks since <br> is not allowed
          descriptionContent = rawDescription
            .split(/\n\n+/) // Split by double newlines into paragraphs
            .map(para => `<p>${para.replace(/\n/g, ' ')}</p>`)
            .join('');
        }

        const descriptionSections = [
          {
            items: [
              {
                type: 'TEXT',
                content: descriptionContent
              }
            ]
          }
        ];

        // 4. Prepare parameters payload from Allegro Catalog product
        // According to Allegro API, parameters should be in format:
        // { id: "paramId", values: ["textValue"], valuesIds: ["dictionaryValueId"], rangeValue: { from, to } }
        let parametersPayload = [];
        const processedParamIds = new Set();
        
        // Helper function to map a parameter to the offer format
        const mapParameterToPayload = (p) => {
          // Catalog format: { id, name, values: ["val"], valuesIds: ["id"], valuesLabels: ["label"], rangeValue: {from, to} }
          // Offer format: { id, values: ["val"], valuesIds: ["id"], rangeValue: {from, to} }
          
          const paramPayload = {
            id: p.id
          };
          
          // Handle valuesIds (dictionary values) - most common
          // IMPORTANT: If valuesIds are present, do NOT send values (which might be just labels in catalog)
          // because sending both can cause "Unprocessable Entity" for dictionary parameters
          if (p.valuesIds && Array.isArray(p.valuesIds) && p.valuesIds.length > 0) {
            paramPayload.valuesIds = p.valuesIds;
          } else if (p.values && Array.isArray(p.values) && p.values.length > 0) {
            // Only send values (text) if no valuesIds
            paramPayload.values = p.values;
          }
          
          // Handle rangeValue
          if (p.rangeValue) {
            paramPayload.rangeValue = p.rangeValue;
          }
          
          // Only include if we have actual values
          if (paramPayload.valuesIds || paramPayload.values || paramPayload.rangeValue) {
            return paramPayload;
          }
          
          return null;
        };
        
        // First, use parameters from offerRequirements (these are REQUIRED for the offer)
        // But they usually come without values, just definitions.
        // We will collect them, but we must prioritize user-provided parameters (saved in product.parameters)
        
        const userParams = product.parameters ? (typeof product.parameters === 'string' ? JSON.parse(product.parameters) : product.parameters) : [];
        const userParamsMap = new Map();
        
        if (Array.isArray(userParams)) {
          userParams.forEach(p => {
              const paramPayload = { id: p.id };
              if (p.valuesIds && Array.isArray(p.valuesIds) && p.valuesIds.length > 0) {
                  paramPayload.valuesIds = p.valuesIds;
              }
              if (p.values && Array.isArray(p.values) && p.values.length > 0) {
                   // Check format (string vs object) - handle both
                   if (typeof p.values[0] === 'object' && p.values[0] !== null) {
                      const valuesIds = p.values.filter(v => v.id).map(v => v.id);
                      const textValues = p.values.filter(v => v.value && !v.id).map(v => v.value);
                      if (valuesIds.length > 0) paramPayload.valuesIds = [...(paramPayload.valuesIds || []), ...valuesIds];
                      if (textValues.length > 0) paramPayload.values = textValues;
                   } else {
                      if (!paramPayload.valuesIds) paramPayload.values = p.values;
                   }
              }
              if (p.rangeValue) paramPayload.rangeValue = p.rangeValue;
              
              if (paramPayload.valuesIds || paramPayload.values || paramPayload.rangeValue) {
                  userParamsMap.set(p.id, paramPayload);
              }
          });
        }

        if (catalogProduct && catalogProduct.offerRequirements && catalogProduct.offerRequirements.parameters) {
          console.log('Allegro publish: Found offerRequirements.parameters - these are REQUIRED for the offer');
          for (const p of catalogProduct.offerRequirements.parameters) {
            // Check if we have a user value for this parameter
            if (userParamsMap.has(p.id)) {
               console.log(`Allegro publish: Using user value for required param ${p.id} (${p.name})`);
               parametersPayload.push(userParamsMap.get(p.id));
               processedParamIds.add(p.id);
               continue;
            }

            const mapped = mapParameterToPayload(p);
            if (mapped) {
              parametersPayload.push(mapped);
              processedParamIds.add(p.id);
              console.log(`Allegro publish: Required param ${p.id} (${p.name}):`, JSON.stringify(mapped));
            } else {
              console.warn(`Allegro publish: Required param ${p.id} (${p.name}) has no value in offerRequirements and no user value!`);
            }
          }
        }
        
        // Add remaining user parameters that were not in requirements
        for (const [id, payload] of userParamsMap.entries()) {
            if (!processedParamIds.has(id)) {
                parametersPayload.push(payload);
                processedParamIds.add(id);
            }
        }

        // Prepare productSet element
        const productSetElement = {
          product: {
            id: allegroProductId
          }
        };

        // Add responsible producer if found (GPSR) - MUST be inside productSet element
        if (responsibleProducer) {
          productSetElement.responsibleProducer = {
            id: responsibleProducer.id,
            type: 'ID'
          };
        }

        // 5. Construct payload for POST /sale/product-offers
        const payload = {
          productSet: [ productSetElement ],
          name: product.product_name.substring(0, 75),
          description: {
            sections: descriptionSections
          },
          // Images are array of strings (URLs) for product-offers endpoint
          images: imagesPayload.length > 0 ? imagesPayload : undefined,
          
          // Add parameters - these come from catalog product or saved product data
          // Format: [{ id: "paramId", values: ["text"], valuesIds: ["dictId"], rangeValue: {...} }]
          parameters: parametersPayload.length > 0 ? parametersPayload : undefined,
          
          sellingMode: {
            format: 'BUY_NOW',
            price: { 
              amount: product.price ? String(product.price) : '100.00', 
              currency: product.currency || 'PLN' 
            }
          },
          stock: {
            available: product.stock || 1,
            unit: 'UNIT'
          },
          publication: {
            status: 'ACTIVE',
            republish: false
          },
          location: {
            city: product.location_city || 'Warszawa',
            province: product.location_province || 'MAZOWIECKIE',
            countryCode: 'PL',
            postCode: product.location_postcode || '00-001'
          },
          
          // After sales services
          afterSalesServices: {
            impliedWarranty: integration.implied_warranty_id ? { id: integration.implied_warranty_id } : undefined,
            returnPolicy: integration.return_policy_id ? { id: integration.return_policy_id } : undefined,
            warranty: integration.warranty_id ? { id: integration.warranty_id } : undefined
          },
          
          // Delivery
          delivery: integration.shipping_rates_id ? {
            shippingRates: { id: integration.shipping_rates_id }
          } : undefined,
          
          // Invoice
          payments: {
            invoice: integration.invoice_type ? (integration.invoice_type === 'vat' ? 'VAT' : 'VAT_MARGIN') : 'NO_INVOICE'
          }
        };

        // Clean up undefined fields
        if (!payload.images) delete payload.images;
        if (!payload.parameters || payload.parameters.length === 0) delete payload.parameters;
        
        if (!payload.afterSalesServices.impliedWarranty) delete payload.afterSalesServices.impliedWarranty;
        if (!payload.afterSalesServices.returnPolicy) delete payload.afterSalesServices.returnPolicy;
        if (!payload.afterSalesServices.warranty) delete payload.afterSalesServices.warranty;
        if (Object.keys(payload.afterSalesServices).length === 0) delete payload.afterSalesServices;
        if (!payload.delivery) delete payload.delivery;

        console.log('Sending Allegro product-offer payload:', JSON.stringify(payload, null, 2));

        const response = await axios.post('https://api.allegro.pl/sale/product-offers', payload, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.allegro.public.v1+json',
            'Content-Type': 'application/vnd.allegro.public.v1+json'
          }
        });

        return { success: true, message: 'Product published to Allegro (Product Offer)', externalId: response.data.id };
      } catch (error) {
        console.error('Allegro publish error full:', error.response?.data);
        
        // CHECK FOR 401 AND RETRY
        if (error.response?.status === 401 && attempt === 1 && refreshToken) {
           console.log('Allegro publish: Token expired (401), attempting refresh...');
           try {
               const newTokenData = await allegroOAuth.refreshAccessToken(refreshToken);
               accessToken = newTokenData.access_token;
               const newRefreshToken = newTokenData.refresh_token;
               
               // Update DB if we have integration info
               if (integrationId && userId) {
                   await db.execute(
                      'UPDATE marketplace_integrations SET access_token = ?, refresh_token = ? WHERE id = ?',
                      [accessToken, newRefreshToken, integrationId]
                   );
                   console.log('Allegro publish: Token refreshed and saved to DB');
               }
               
               // Update local variables for next iteration
               if (typeof authData === 'object') {
                   authData.access_token = accessToken;
                   authData.refresh_token = newRefreshToken;
               }
               refreshToken = newRefreshToken;
               
               continue; // Retry
           } catch (refreshError) {
               console.error('Allegro publish: Token refresh failed:', refreshError.message);
               // Fall through to standard error handling
           }
        }
        
        let errorDetail = error.response?.data?.errors?.map(e => `${e.message} (${e.path})`).join(', ') 
          || error.response?.data?.message 
          || error.message;

        // Check for missing parameters error
        if (errorDetail.includes('Missing required parameters') && categoryId) {
          try {
            // Extract parameter ID if possible (e.g., from "Missing required parameters: 249829")
            const match = errorDetail.match(/Missing required parameters: (\d+)/);
            if (match) {
               const missingParamId = match[1];
               // Try to fetch parameter definition
               console.log(`Allegro publish: Identified missing parameter ${missingParamId}, fetching definition for category ${categoryId}...`);
               const categoryParams = await this._getCategoryParameters(accessToken, categoryId);
               const paramDef = categoryParams.find(p => p.id === missingParamId);
               
               if (paramDef) {
                  console.log('Allegro publish: Found missing parameter definition:', JSON.stringify(paramDef));
                  const paramName = paramDef.name;
                  errorDetail = `Allegro publish failed: Missing required parameter: "${paramName}" (ID: ${missingParamId}). Please provide this parameter in product settings.`;
               }
            }
          } catch (lookupError) {
            console.error('Failed to lookup category parameters:', lookupError);
          }
        }

        // Check for account type restriction
        if (errorDetail.includes('You cannot use the Public API method when selling with a Regular Account')) {
          return {
            success: false,
            message: 'Allegro publish failed: This feature requires an Allegro Business Account. Regular accounts cannot publish via API.',
            details: error.response?.data
          };
        }
          
        return { 
          success: false, 
          message: `Allegro publish failed: ${errorDetail}`,
          details: error.response?.data 
        };
      }
    }
  }

  // Public method: Upload image to Allegro
  async uploadImage(authData, imageUrl, baseUrl = null) {
    const accessToken = (authData && authData.access_token) ? authData.access_token : authData;
    return await this._uploadImageToAllegro(accessToken, imageUrl, baseUrl);
  }

  // Helper: Upload image to Allegro
  async _uploadImageToAllegro(accessToken, imageUrl, baseUrl = null) {
    try {
      // Validate imageUrl
      if (!imageUrl) {
        console.warn('Allegro image upload: imageUrl is empty or undefined');
        return null;
      }

      // Check if it's a full URL or relative path
      const isRemoteUrl = imageUrl.startsWith('http');
      
      if (isRemoteUrl) {
        // METHOD 1: URL-based upload - send URL to Allegro and they download it
        console.log('Allegro image upload: Using URL-based upload for:', imageUrl);
        
        const response = await axios.post('https://upload.allegro.pl/sale/images', 
          { url: imageUrl },
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/vnd.allegro.public.v1+json',
              'Content-Type': 'application/vnd.allegro.public.v1+json'
            },
            timeout: 60000
          }
        );

        const location = response.data?.location;
        if (!location) {
          console.warn('Allegro image upload: No location returned. Response:', JSON.stringify(response.data));
          return null;
        }
        
        console.log('Allegro image upload: Success (URL method), location:', location);
        return location;
        
      } else {
        // METHOD 2: Binary upload for local files
        // Check if we have a baseUrl to construct a public URL
        if (baseUrl) {
          // Try URL-based upload with public URL first (more reliable)
          const publicUrl = `${baseUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
          console.log('Allegro image upload: Trying URL-based upload with public URL:', publicUrl);
          
          try {
            const response = await axios.post('https://upload.allegro.pl/sale/images', 
              { url: publicUrl },
              {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Accept': 'application/vnd.allegro.public.v1+json',
                  'Content-Type': 'application/vnd.allegro.public.v1+json'
                },
                timeout: 60000
              }
            );

            const location = response.data?.location;
            if (location) {
              console.log('Allegro image upload: Success (public URL method), location:', location);
              return location;
            }
          } catch (urlError) {
            console.warn('Allegro image upload: URL-based upload failed, falling back to binary:', urlError.message);
          }
        }
        
        // Fall back to binary upload
        // Remove leading slash if present for path joining
        const relativePath = imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl;
        
        let absolutePath;
        try {
          // Resolve relative to server root
          const resolved = path.join(__dirname, '../../', relativePath);
          // SECURITY: Validate path to prevent directory traversal
          // Ensure it's within uploads directory (relative to server root)
          const baseDir = path.join(__dirname, '../../uploads');
          absolutePath = validatePath(resolved, baseDir);
        } catch (e) {
          console.warn('Allegro image upload: Invalid path detected:', e.message);
          return null;
        }
        
        console.log('Allegro image upload: Reading local file for binary upload:', absolutePath);
        
        if (!fs.existsSync(absolutePath)) {
          console.warn(`Allegro image upload: File not found at ${absolutePath}`);
          return null;
        }
        
        const imageBuffer = fs.readFileSync(absolutePath);
        
        if (!imageBuffer || imageBuffer.length === 0) {
          console.warn('Allegro image upload: Image buffer is empty');
          return null;
        }
        
        // Detect content type
        let contentType = 'image/jpeg';
        if (absolutePath.toLowerCase().endsWith('.png')) contentType = 'image/png';
        else if (absolutePath.toLowerCase().endsWith('.gif')) contentType = 'image/gif';
        else if (absolutePath.toLowerCase().endsWith('.webp')) contentType = 'image/webp';

        console.log(`Allegro image upload: Uploading ${imageBuffer.length} bytes as ${contentType}`);

        const response = await axios.post('https://upload.allegro.pl/sale/images', imageBuffer, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.allegro.public.v1+json',
            'Content-Type': contentType
          },
          timeout: 60000,
          maxBodyLength: Infinity,
          maxContentLength: Infinity
        });

        const location = response.data?.location;
        if (!location) {
          console.warn('Allegro image upload: No location returned. Response:', JSON.stringify(response.data));
          return null;
        }
        
        console.log('Allegro image upload: Success (binary method), location:', location);
        return location;
      }
    } catch (error) {
      // Rethrow 401 errors for retry logic
      if (error.response?.status === 401) {
        throw error;
      }

      console.error('Allegro image upload error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        imageUrl: imageUrl
      });
      return null;
    }
  }

  // Helper: Find product in Allegro Catalog
  async _findAllegroProduct(accessToken, ean) {
    try {
      const timestamp = Date.now();
      const response = await axios.get(`https://api.allegro.pl/sale/products`, {
        params: {
          phrase: ean,
          mode: 'GTIN',
          _t: timestamp // Cache buster
        },
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
        return {
          id: response.data.products[0].id,
          categoryId: response.data.products[0].category.id
        };
      }
      return null;
    } catch (error) {
      // Rethrow 401 errors for retry logic
      if (error.response?.status === 401) {
        throw error;
      }

      console.error('Allegro product search error:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        ean: ean
      });
      return null;
    }
  }

  // Helper: Get full product data from Allegro Catalog
  async _getAllegroProductDetails(accessToken, productId, categoryId = null) {
    try {
      const params = { language: 'pl-PL' };
      if (categoryId) {
        params['category.id'] = categoryId;
      }
      
      const response = await axios.get(`https://api.allegro.pl/sale/products/${productId}`, {
        params,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.allegro.public.v1+json',
          'Accept-Language': 'pl-PL'
        }
      });
      
      return response.data;
    } catch (error) {
      // Rethrow 401 errors for retry logic
      if (error.response?.status === 401) {
        throw error;
      }

      console.error('Allegro get product details error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        productId: productId
      });
      return null;
    }
  }

  // Helper: Get category parameters (private method)
  async _getCategoryParameters(accessToken, categoryId) {
    try {
      const response = await axios.get(`https://api.allegro.pl/sale/categories/${categoryId}/parameters`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.allegro.public.v1+json',
          'Accept-Language': 'pl-PL'
        }
      });
      return response.data.parameters || [];
    } catch (error) {
      // Rethrow 401 errors for retry logic
      if (error.response?.status === 401) {
        throw error;
      }

      console.error('Allegro get category parameters error:', error.message);
      return [];
    }
  }

  // Public method: Get category parameters
  async getCategoryParameters(accessToken, categoryId) {
    return await this._getCategoryParameters(accessToken, categoryId);
  }

  // Helper: Get list of responsible producers
  async _getResponsibleProducers(accessToken) {
    try {
      const response = await axios.get('https://api.allegro.pl/sale/responsible-producers', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.allegro.public.v1+json'
        }
      });
      return response.data.responsibleProducers || [];
    } catch (error) {
      // Rethrow 401 errors for retry logic
      if (error.response?.status === 401) {
        throw error;
      }
      
      console.error('Allegro getResponsibleProducers error:', error.message);
      return [];
    }
  }

  // Public method: Get full product details from Catalog
  async getProductDetails(authData, productId, categoryId = null) {
    const accessToken = (authData && authData.access_token) ? authData.access_token : authData;
    return await this._getAllegroProductDetails(accessToken, productId, categoryId);
  }

  // Public method: Find product by EAN
  async findProductByEan(authData, ean) {
    const accessToken = (authData && authData.access_token) ? authData.access_token : authData;
    return await this._findAllegroProduct(accessToken, ean);
  }

  async deleteOffer(authData, externalId) {
    try {
      this._validateOfferId(externalId);
      const safeExternalId = this._validateAllegroOfferId(externalId);
      let accessToken;
      
      // Extract access token from authData (can be integration object or token string)
      if (authData && typeof authData === 'object' && authData.access_token) {
        accessToken = authData.access_token;
      } else {
        accessToken = authData;
      }

      if (!externalId) {
        return { success: false, message: 'Allegro delete failed: External ID is required' };
      }

      // Delete offer using Allegro API
      // For product-offers, we use DELETE /sale/product-offers/{offerId}
      await axios.delete(`https://api.allegro.pl/sale/product-offers/${safeExternalId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.allegro.public.v1+json'
        }
      });

      return { success: true, message: 'Offer deleted from Allegro successfully' };
    } catch (error) {
      const errorDetail = error.response?.data?.errors?.map(e => `${e.message} (${e.path})`).join(', ') 
        || error.response?.data?.message 
        || error.message;
      
      return { 
        success: false, 
        message: `Allegro delete failed: ${errorDetail}`,
        details: error.response?.data 
      };
    }
  }

  // Helper: Get offer details
  async getOffer(authData, offerId) {
    try {
      this._validateOfferId(offerId);
      const safeOfferId = this._validateAllegroOfferId(offerId);
      const accessToken = (authData && authData.access_token) ? authData.access_token : authData;
      const response = await axios.get(`https://api.allegro.pl/sale/product-offers/${safeOfferId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.allegro.public.v1+json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Allegro getOffer error:', error.message);
      return null;
    }
  }

  // Helper: Update offer (full PUT)
  async updateOffer(authData, offerId, payload) {
    try {
      const safeOfferId = this._validateAllegroOfferId(offerId);
      this._validateOfferId(offerId);
      const accessToken = (authData && authData.access_token) ? authData.access_token : authData;
      const response = await axios.patch(`https://api.allegro.pl/sale/product-offers/${safeOfferId}`, payload, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.allegro.public.v1+json',
          'Content-Type': 'application/vnd.allegro.public.v1+json'
        }
      });
      return { success: true, data: response.data };
    } catch (error) {
      const errorDetail = error.response?.data?.errors?.map(e => `${e.message} (${e.path})`).join(', ') 
        || error.response?.data?.message 
        || error.message;
      return { success: false, message: errorDetail, details: error.response?.data };
    }
  }

  // Helper: Change Price (Command API - Async) (For single offer, but can be used in loop)
  // Note: For bulk, we might want to use UUIDs but keeping it simple for now
  async changePrice(authData, offerId, amount, currency = 'PLN') {
    try {
      const accessToken = (authData && authData.access_token) ? authData.access_token : authData;
      const commandId = require('crypto').randomUUID();
      
      const payload = {
        modification: {
          type: 'FIXED_PRICE',
          price: {
            amount: String(amount),
            currency: currency
          }
        },
        offerCriteria: [
          {
            type: 'CONTAINS_OFFERS',
            offers: [
              { id: offerId }
            ]
          }
        ]
      };

      await axios.put(`https://api.allegro.pl/sale/offer-price-change-commands/${commandId}`, payload, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.allegro.public.v1+json',
            'Content-Type': 'application/vnd.allegro.public.v1+json'
        }
      });
      
      return { success: true, message: 'Price change command submitted', commandId: commandId };
    } catch (error) {
        // Detailed error logging
        const errorDetail = error.response?.data?.errors?.map(e => `${e.message} (${e.path})`).join(', ') 
          || error.response?.data?.message 
          || error.message;
        
        console.error('Allegro changePrice error:', errorDetail, JSON.stringify(error.response?.data));
        return { success: false, message: errorDetail };
    }
  }

  // Helper: Check Price Change Command Status
  async checkPriceChangeCommand(authData, commandId) {
    try {
        const accessToken = (authData && authData.access_token) ? authData.access_token : authData;
        
        const response = await axios.get(`https://api.allegro.pl/sale/offer-price-change-commands/${commandId}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/vnd.allegro.public.v1+json'
            }
        });
        
        return { success: true, data: response.data };
    } catch (error) {
        console.error('Allegro checkPriceChangeCommand error:', error.message);
        return { success: false, error: error.message };
    }
  }
}

module.exports = AllegroAdapter;

