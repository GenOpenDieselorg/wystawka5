/**
 * Base Marketplace Adapter
 * 
 * Wszystkie adaptery marketplace'ów muszą rozszerzać tę klasę
 * i implementować wymagane metody.
 */
class BaseMarketplaceAdapter {
  constructor(name) {
    this.name = name;
  }

  /**
   * Zwraca nazwę marketplace'u (używana do identyfikacji)
   */
  getName() {
    return this.name;
  }

  /**
   * Testuje połączenie z marketplace'em
   * @param {string} accessToken - Token dostępu
   * @param {string|null} refreshToken - Token odświeżania (opcjonalny)
   * @returns {Promise<{success: boolean, message: string, ...}>}
   */
  async testConnection(accessToken, refreshToken = null) {
    throw new Error(`testConnection must be implemented by ${this.name} adapter`);
  }

  /**
   * Publikuje produkt na marketplace
   * @param {Object} authData - Dane autoryzacyjne (może być integration object lub accessToken)
   * @param {Object} product - Obiekt produktu do publikacji
   * @param {string} baseUrl - Bazowy URL aplikacji (dla obrazów)
   * @returns {Promise<{success: boolean, message: string, externalId?: string, ...}>}
   */
  async publishProduct(authData, product, baseUrl) {
    throw new Error(`publishProduct must be implemented by ${this.name} adapter`);
  }

  /**
   * Usuwa ofertę z marketplace
   * @param {Object} authData - Dane autoryzacyjne (może być integration object lub accessToken)
   * @param {string} externalId - ID oferty w marketplace (zwrócone przez publishProduct)
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async deleteOffer(authData, externalId) {
    throw new Error(`deleteOffer must be implemented by ${this.name} adapter`);
  }

  /**
   * Zwraca wymagane pola konfiguracyjne dla tego marketplace'u
   * @returns {Array<{name: string, type: string, required: boolean, description: string}>}
   */
  getRequiredConfigFields() {
    return [];
  }

  /**
   * Waliduje konfigurację integracji
   * @param {Object} config - Konfiguracja do walidacji
   * @returns {{valid: boolean, errors: Array<string>}}
   */
  validateConfig(config) {
    return { valid: true, errors: [] };
  }
}

module.exports = BaseMarketplaceAdapter;

