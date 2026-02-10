const axios = require('axios');
const BaseMarketplaceAdapter = require('./base');

/**
 * Erli Marketplace Adapter
 * Note: Erli uses static API key (not OAuth), so no refresh_token is needed
 */
class ErliAdapter extends BaseMarketplaceAdapter {
  constructor() {
    super('erli');
  }

  async testConnection(accessToken, refreshToken = null) {
    try {
      // Erli API endpoint for testing - get shop info
      // accessToken is actually the API key from Erli panel
      const response = await axios.get('https://erli.pl/svc/shop-api/products', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'wystawoferte.pl v1.0',
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        params: {
          limit: 1
        }
      });
      return { success: true, message: 'Erli connection successful' };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message;
      return { success: false, message: `Erli connection failed: ${errorMessage}` };
    }
  }

  async publishProduct(authData, product, baseUrl) {
    try {
      let accessToken;
      
      // Extract access token from authData (can be integration object or token string)
      if (authData && typeof authData === 'object' && authData.access_token) {
        accessToken = authData.access_token;
      } else {
        accessToken = authData;
      }

      // Prepare external ID - Erli uses externalId from shop system
      // According to documentation: "W API posługujemy się ID produktów z systemu sklepowego sprzedawcy"
      // If several products have same ID, enrich it: "123-czerwony"
      const externalId = product.ean_code || product.catalog_code || `product-${product.id}`;

      // Check if product already exists (for PATCH vs POST)
      // According to documentation, we should check local DB first, but for simplicity we'll try GET
      let productExists = false;
      try {
        await axios.get(`https://erli.pl/svc/shop-api/products/${externalId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': 'wystawoferte.pl v1.0',
            'Accept': 'application/json'
          }
        });
        productExists = true;
      } catch (error) {
        if (error.response?.status !== 404) {
          // If it's not 404, it might be a real error, but we'll continue
          console.warn('Erli product check error:', error.response?.status);
        }
      }

      // Prepare images URLs - Erli expects array of objects with url
      // Images should be high resolution (up to 5120x5120), WebP, PNG, or JPEG
      const images = (product.images || []).map(img => ({
        url: `${baseUrl}${img.processedUrl || img.url}`
      }));

      // Prepare description sections according to Erli API
      // Erli expects description in format: { sections: [{ items: [{ type: "TEXT", content: "..." }] }] }
      // Each section can contain 1-2 items displayed side by side
      const descriptionSections = [];
      if (product.description) {
        // Convert description to Erli format
        // For simplicity, we'll create one section with one TEXT item
        // HTML is allowed but will be converted to allowed tags only
        descriptionSections.push({
          items: [{
            type: 'TEXT',
            content: product.description
          }]
        });
      } else if (product.product_name) {
        descriptionSections.push({
          items: [{
            type: 'TEXT',
            content: `<p>${product.product_name}</p>`
          }]
        });
      }

      // Calculate price in grosze (integer)
      const priceInGrosze = Math.round((product.price || 0) * 100);

      // Prepare payload according to Erli API documentation
      // According to docs, we should send only changed fields for PATCH
      const payload = {
        name: product.product_name || 'Produkt',
        price: priceInGrosze, // Price in grosze
        stock: product.stock || 1,
        status: product.status === 'done' ? 'active' : 'inactive',
        dispatchTime: { period: 1, unit: 'day' } // Default dispatch time 24h
      };

      // Add description if available
      if (descriptionSections.length > 0) {
        payload.description = { sections: descriptionSections };
      }

      // Add images if available
      if (images.length > 0) {
        payload.images = images;
      }

      // Add weight - in grams
      // Replaces deprecated 'packaging' field
      if (product.weight) {
        payload.weight = Math.round(product.weight * 1000); // Convert kg to grams
      } else {
        // Default weight if not provided
        payload.weight = 100; // Default 100g
      }

      // Add EAN and SKU if available
      if (product.ean_code) {
        payload.ean = product.ean_code;
      }
      if (product.sku || product.catalog_code) {
        payload.sku = product.sku || product.catalog_code;
      }

      let response;
      if (productExists) {
        // Use PATCH to update existing product - send only changed fields
        // According to documentation: "Gorąco zachęcamy też do nie wykonywania niepotrzebnych zapytań gdy w produkcie nie wystąpiły żadne zmiany"
        response = await axios.patch(`https://erli.pl/svc/shop-api/products/${externalId}`, payload, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': 'wystawoferte.pl v1.0',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
      } else {
        // Use POST to create new product
        // According to documentation: "no point in sending some old products" if stock <= 0 or status === 'inactive'
        if ((product.stock <= 0 || product.status === 'inactive') && !productExists) {
          return { 
            success: false, 
            message: 'Erli publish skipped: Product has no stock or is inactive' 
          };
        }

        // Remove externalId from payload for POST (it's in URL)
        const postPayload = { ...payload };
        response = await axios.post(`https://erli.pl/svc/shop-api/products/${externalId}`, postPayload, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': 'wystawoferte.pl v1.0',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
      }

      // Erli returns 202 Accepted for async processing
      // "pozytywna odpowiedź https (kod 202) potwierdza tylko, że dane przeszły podstawową walidację i zostały zapisane w bazie danych"
      return { 
        success: true, 
        message: 'Product published to Erli (processing asynchronously)', 
        externalId: externalId,
        status: response.status === 202 ? 'accepted' : 'created'
      };
    } catch (error) {
      // Handle rate limiting (429)
      if (error.response?.status === 429) {
        return { 
          success: false, 
          message: 'Erli publish failed: Rate limit exceeded. Please try again later.',
          details: error.response?.data
        };
      }

      const errorDetail = error.response?.data?.message || error.response?.data?.error || error.message;
      return { 
        success: false, 
        message: `Erli publish failed: ${errorDetail}`,
        details: error.response?.data
      };
    }
  }

  async deleteOffer(authData, externalId) {
    try {
      let accessToken;
      
      // Extract access token from authData (can be integration object or token string)
      if (authData && typeof authData === 'object' && authData.access_token) {
        accessToken = authData.access_token;
      } else {
        accessToken = authData;
      }

      if (!externalId) {
        return { success: false, message: 'Erli delete failed: External ID is required' };
      }

      // Delete offer using Erli API
      // DELETE /svc/shop-api/products/{externalId}
      await axios.delete(`https://erli.pl/svc/shop-api/products/${externalId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'wystawoferte.pl v1.0',
          'Accept': 'application/json'
        }
      });

      return { success: true, message: 'Offer deleted from Erli successfully' };
    } catch (error) {
      const errorDetail = error.response?.data?.message || error.response?.data?.error || error.message;
      return { 
        success: false, 
        message: `Erli delete failed: ${errorDetail}`,
        details: error.response?.data 
      };
    }
  }
}

module.exports = ErliAdapter;
