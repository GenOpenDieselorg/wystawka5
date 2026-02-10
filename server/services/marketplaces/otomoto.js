const axios = require('axios');
const BaseMarketplaceAdapter = require('./base');

/**
 * Otomoto Marketplace Adapter
 */
class OtomotoAdapter extends BaseMarketplaceAdapter {
  constructor() {
    super('otomoto');
    this.apiBaseUrl = 'https://www.otomoto.pl/open/api';
  }

  /**
   * Testuje połączenie z marketplace'em
   * @param {string} accessToken - Token dostępu
   * @param {string|null} refreshToken - Token odświeżania (opcjonalny)
   * @returns {Promise<{success: boolean, message: string, ...}>}
   */
  async testConnection(accessToken, refreshToken = null) {
    try {
      // Use GET /categories to test connection as it requires authentication (usually) or at least verifies API access
      // The Postman collection uses {{base_url}}/categories
      const response = await axios.get(`${this.apiBaseUrl}/categories`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      return { success: true, message: 'Otomoto connection successful' };
    } catch (error) {
      const errorDetail = error.response?.data?.error?.message || error.response?.data?.error_description || error.message;
      return { 
        success: false, 
        message: `Otomoto connection failed: ${errorDetail}` 
      };
    }
  }

  /**
   * Helper to create image collection
   */
  async createImageCollection(images, accessToken) {
    if (!images || images.length === 0) {
      throw new Error('No images provided');
    }

    const payload = {};
    images.forEach((img, index) => {
      // Otomoto expects keys like "1", "2", "3"...
      payload[String(index + 1)] = img.url;
    });

    const response = await axios.post(`${this.apiBaseUrl}/imageCollections/`, payload, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-BULK-ERROR': 'PER_ITEM'
      }
    });

    return response.data.id;
  }

  /**
   * Publikuje produkt na marketplace
   * @param {Object} authData - Dane autoryzacyjne (może być integration object lub accessToken)
   * @param {Object} product - Obiekt produktu do publikacji
   * @param {string} baseUrl - Bazowy URL aplikacji (dla obrazów)
   * @returns {Promise<{success: boolean, message: string, externalId?: string, ...}>}
   */
  async publishProduct(authData, product, baseUrl) {
    try {
      let accessToken;
      
      // Extract access token from authData
      if (authData && typeof authData === 'object' && authData.access_token) {
        accessToken = authData.access_token;
      } else {
        accessToken = authData;
      }

      // Prepare images URLs
      const images = (product.images || []).map(img => ({
        url: img.processedUrl || img.url
        // If relative URL, prepend baseUrl? 
        // Logic in OLX adapter: url: `${baseUrl}${img.processedUrl || img.url}`
        // We should probably check if it starts with http
      })).map(img => ({
        url: img.url.startsWith('http') ? img.url : `${baseUrl}${img.url}`
      }));

      // 1. Create Image Collection
      let imageCollectionId = null;
      if (images.length > 0) {
        imageCollectionId = await this.createImageCollection(images, accessToken);
      }

      // 2. Prepare Advert Payload
      const params = {};
      
      // Map attributes to params
      if (product.attributes && Array.isArray(product.attributes)) {
        product.attributes.forEach(attr => {
          params[attr.name] = attr.value;
        });
      } else if (product.attributes && typeof product.attributes === 'object') {
        Object.assign(params, product.attributes);
      }

      // Helper to safely add params if they exist
      const addParam = (key, value) => {
        if (value !== undefined && value !== null) {
          params[key] = value;
        }
      };

      // Map basic fields if they are not already in attributes
      // Note: Otomoto params are quite specific (make, model, year, etc.)
      // We assume they are passed in product.attributes or product fields mapped here
      addParam('make', product.make);
      addParam('model', product.model);
      addParam('year', product.year);
      addParam('mileage', product.mileage);
      addParam('engine_capacity', product.engine_capacity);
      addParam('fuel_type', product.fuel_type);
      addParam('engine_power', product.engine_power);
      addParam('gearbox', product.gearbox);
      addParam('body_type', product.body_type);
      addParam('door_count', product.door_count);
      addParam('color', product.color);
      
      // Price structure
      // Otomoto expects price as object: { "0": "price", "1": amount, "currency": "PLN", "gross_net": "gross" }
      if (product.price) {
        params.price = {
          "0": "price",
          "1": product.price,
          "currency": product.currency || 'PLN',
          "gross_net": product.gross_net || 'gross'
        };
      }

      const payload = {
        title: product.product_name || product.title,
        description: product.description,
        category_id: product.category_id, // Required
        new_used: product.new_used || 'used', // 'new' or 'used'
        params: params
      };

      if (imageCollectionId) {
        payload.image_collection_id = imageCollectionId;
      }

      // 3. Create Advert
      const response = await axios.post(`${this.apiBaseUrl}/account/adverts/`, payload, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const advertId = response.data.id;

      // 4. Activate Advert (optional, but requested in flow)
      // Usually creating creates a draft or inactive advert.
      // We might want to activate it if requested.
      // For now, we just return the ID. User might need to pay/activate separately.
      // But based on provided JSON, there is an "ACTIVATE ADVERT" request.
      
      // Attempt activation if specified
      let activationStatus = 'created';
      if (product.activate) {
        try {
          await axios.post(`${this.apiBaseUrl}/account/adverts/${advertId}/activate`, {}, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          });
          activationStatus = 'active';
        } catch (actError) {
          // Activation might fail due to payment required, etc.
          // We don't fail the whole process, just report it.
          console.warn('Otomoto activation failed:', actError.response?.data);
          activationStatus = 'created_inactive';
        }
      }

      return { 
        success: true, 
        message: 'Product published to Otomoto', 
        externalId: String(advertId),
        status: activationStatus,
        url: response.data.url
      };

    } catch (error) {
      console.error('Otomoto publish error:', error.response?.data || error.message);
      const errorDetail = error.response?.data?.error?.message || 
                          (error.response?.data?.error?.details ? JSON.stringify(error.response?.data?.error?.details) : error.message);
      
      return { 
        success: false, 
        message: `Otomoto publish failed: ${errorDetail}`,
        details: error.response?.data
      };
    }
  }

  /**
   * Usuwa ofertę z marketplace
   * @param {Object} authData - Dane autoryzacyjne
   * @param {string} externalId - ID oferty w marketplace
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async deleteOffer(authData, externalId) {
    try {
      let accessToken;
      if (authData && typeof authData === 'object' && authData.access_token) {
        accessToken = authData.access_token;
      } else {
        accessToken = authData;
      }

      if (!externalId) {
        return { success: false, message: 'Otomoto delete failed: External ID is required' };
      }

      // DELETE /adverts/:id
      await axios.delete(`${this.apiBaseUrl}/adverts/${externalId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return { success: true, message: 'Offer deleted from Otomoto successfully' };
    } catch (error) {
      const errorDetail = error.response?.data?.error?.message || error.message;
      return { 
        success: false, 
        message: `Otomoto delete failed: ${errorDetail}`,
        details: error.response?.data 
      };
    }
  }
}

module.exports = OtomotoAdapter;

