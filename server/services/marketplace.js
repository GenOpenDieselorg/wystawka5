const registry = require('./marketplaces/registry');

/**
 * Marketplace Services
 * 
 * Wrapper service używający rejestru adapterów marketplace'ów.
 * Wszystkie adaptery są automatycznie rejestrowane z katalogu marketplaces/.
 */
const marketplaceServices = {
  /**
   * Test connection to marketplace
   * @param {string} marketplace - Nazwa marketplace'u
   * @param {string} accessToken - Token dostępu
   * @param {string|null} refreshToken - Token odświeżania (opcjonalny)
   * @returns {Promise<{success: boolean, message: string, ...}>}
   */
  async testConnection(marketplace, accessToken, refreshToken) {
    try {
      const adapter = registry.getAdapter(marketplace);
      
      if (!adapter) {
        return { 
          success: false, 
          message: `Unknown marketplace: ${marketplace}. Available: ${registry.getRegisteredMarketplaces().join(', ')}` 
        };
      }
      
      return await adapter.testConnection(accessToken, refreshToken);
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  /**
   * Publish product to marketplace
   * @param {string} marketplace - Nazwa marketplace'u
   * @param {Object|string} authData - Dane autoryzacyjne (integration object lub accessToken)
   * @param {Object|null} extraData - Dodatkowe dane (refreshToken lub null)
   * @param {Object} product - Obiekt produktu do publikacji
   * @param {string} baseUrl - Bazowy URL aplikacji (dla obrazów)
   * @returns {Promise<{success: boolean, message: string, externalId?: string, ...}>}
   */
  async publishProduct(marketplace, authData, extraData, product, baseUrl) {
    try {
      const adapter = registry.getAdapter(marketplace);
      
      if (!adapter) {
        return { 
          success: false, 
          message: `Unknown marketplace: ${marketplace}. Available: ${registry.getRegisteredMarketplaces().join(', ')}` 
        };
      }
      
      // Determine arguments based on whether authData is an integration object or token
      let integration;
      if (authData && typeof authData === 'object' && authData.access_token) {
        integration = authData;
      } else {
        // Create integration object from tokens
        integration = {
          access_token: authData,
          refresh_token: extraData || null
        };
      }
      
      return await adapter.publishProduct(integration, product, baseUrl);
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  /**
   * Zwraca listę wszystkich zarejestrowanych marketplace'ów
   * @returns {Array<string>}
   */
  getRegisteredMarketplaces() {
    return registry.getRegisteredMarketplaces();
  },

  /**
   * Sprawdza czy marketplace jest dostępny
   * @param {string} marketplaceName - Nazwa marketplace'u
   * @returns {boolean}
   */
  hasMarketplace(marketplaceName) {
    return registry.hasAdapter(marketplaceName);
  },

  /**
   * Pobiera parametry kategorii dla marketplace'u
   * @param {string} marketplace - Nazwa marketplace'u
   * @param {string} accessToken - Token dostępu
   * @param {string} categoryId - ID kategorii
   * @returns {Promise<Array>} Lista parametrów kategorii
   */
  async getCategoryParameters(marketplace, accessToken, categoryId) {
    try {
      const adapter = registry.getAdapter(marketplace);
      
      if (!adapter) {
        throw new Error(`Unknown marketplace: ${marketplace}. Available: ${registry.getRegisteredMarketplaces().join(', ')}`);
      }
      
      // Sprawdź czy adapter ma metodę getCategoryParameters
      if (typeof adapter.getCategoryParameters === 'function') {
        return await adapter.getCategoryParameters(accessToken, categoryId);
      }
      
      throw new Error(`Marketplace ${marketplace} does not support getCategoryParameters`);
    } catch (error) {
      console.error('Get category parameters error:', error);
      throw error;
    }
  },

  /**
   * Usuwa ofertę z marketplace
   * @param {string} marketplace - Nazwa marketplace'u
   * @param {Object|string} authData - Dane autoryzacyjne (integration object lub accessToken)
   * @param {string} externalId - ID oferty w marketplace
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async deleteOffer(marketplace, authData, externalId) {
    try {
      const adapter = registry.getAdapter(marketplace);
      
      if (!adapter) {
        return { 
          success: false, 
          message: `Unknown marketplace: ${marketplace}. Available: ${registry.getRegisteredMarketplaces().join(', ')}` 
        };
      }
      
      return await adapter.deleteOffer(authData, externalId);
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
};

module.exports = marketplaceServices;
