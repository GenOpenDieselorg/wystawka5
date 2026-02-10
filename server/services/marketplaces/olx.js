const axios = require('axios');
const BaseMarketplaceAdapter = require('./base');

/**
 * OLX Marketplace Adapter
 */
class OLXAdapter extends BaseMarketplaceAdapter {
  constructor() {
    super('olx');
  }

  async testConnection(accessToken, refreshToken = null) {
    try {
      const response = await axios.get('https://www.olx.pl/api/partner/users/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Version': '2.0',
          'Content-Type': 'application/json'
        }
      });
      return { success: true, message: 'OLX connection successful', user: response.data };
    } catch (error) {
      return { 
        success: false, 
        message: `OLX connection failed: ${error.response?.data?.error?.detail || error.message}` 
      };
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

      // Prepare images URLs
      const images = (product.images || []).map(img => ({
        url: `${baseUrl}${img.processedUrl || img.url}`
      }));

      // OLX API payload according to OpenAPI spec
      const payload = {
        title: product.product_name || 'Produkt',
        description: product.description || '',
        category_id: product.category_id || 0, // Required - user should select category
        advertiser_type: product.advertiser_type || 'private', // 'private' or 'business'
        contact: {
          name: product.contact_name || 'Sprzedawca',
          phone: product.contact_phone || ''
        },
        location: {
          city_id: product.city_id || 0, // Required
          district_id: product.district_id || null,
          latitude: product.latitude || null,
          longitude: product.longitude || null
        },
        images: images,
        attributes: product.attributes || [] // Array of {code: string, value: string or values: string[]}
      };

      // Add price if provided
      if (product.price !== undefined && product.price !== null) {
        payload.price = {
          value: product.price,
          currency: product.currency || 'PLN',
          negotiable: product.negotiable || false,
          trade: product.trade || false,
          budget: product.budget || false
        };
      }

      // Add salary if provided (for jobs category)
      if (product.salary !== undefined && product.salary !== null) {
        payload.salary = {
          value_from: product.salary_from || product.salary,
          value_to: product.salary_to || product.salary,
          currency: product.currency || 'PLN',
          negotiable: product.negotiable || false,
          type: product.salary_type || 'monthly' // 'monthly' or 'hourly'
        };
      }

      // Add external_id and external_url if provided
      if (product.external_id) {
        payload.external_id = product.external_id;
      }
      if (product.external_url) {
        payload.external_url = product.external_url;
      }

      // Add delivery settings if provided
      if (product.delivery_package_ids && Array.isArray(product.delivery_package_ids)) {
        payload.ad_delivery = {
          delivery_package_ids: product.delivery_package_ids,
          delivery_change_allowed: product.delivery_change_allowed || true
        };
      }

      // Add auto extend if provided
      if (product.auto_extend_enabled !== undefined) {
        payload.auto_extend_enabled = product.auto_extend_enabled;
      }

      const response = await axios.post('https://www.olx.pl/api/partner/adverts', payload, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Version': '2.0',
          'Content-Type': 'application/json'
        }
      });

      const advertData = response.data.data || response.data;
      return { 
        success: true, 
        message: 'Product published to OLX', 
        externalId: advertData.id,
        status: advertData.status,
        url: advertData.url
      };
    } catch (error) {
      const errorDetail = error.response?.data?.error?.detail || error.response?.data?.error?.title || error.message;
      const validationErrors = error.response?.data?.error?.validation || [];
      return { 
        success: false, 
        message: `OLX publish failed: ${errorDetail}`,
        validation: validationErrors
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
        return { success: false, message: 'OLX delete failed: External ID is required' };
      }

      // Delete offer using OLX API
      // DELETE /api/partner/adverts/{advertId}
      await axios.delete(`https://www.olx.pl/api/partner/adverts/${externalId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Version': '2.0',
          'Content-Type': 'application/json'
        }
      });

      return { success: true, message: 'Offer deleted from OLX successfully' };
    } catch (error) {
      const errorDetail = error.response?.data?.error?.detail || error.response?.data?.error?.title || error.message;
      return { 
        success: false, 
        message: `OLX delete failed: ${errorDetail}`,
        details: error.response?.data 
      };
    }
  }
}

module.exports = OLXAdapter;

