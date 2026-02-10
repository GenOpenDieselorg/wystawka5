const fs = require('fs');
const path = require('path');

/**
 * Marketplace Registry
 * 
 * Automatycznie wykrywa i rejestruje wszystkie adaptery marketplace'ów
 * z katalogu marketplaces/. Każdy adapter musi rozszerzać BaseMarketplaceAdapter.
 */
class MarketplaceRegistry {
  constructor() {
    this.adapters = new Map();
    this._autoRegister();
  }

  /**
   * Automatycznie rejestruje wszystkie adaptery z katalogu
   */
  _autoRegister() {
    const marketplacesDir = __dirname;
    const files = fs.readdirSync(marketplacesDir);
    
    // Wyklucz base.js i registry.js
    const adapterFiles = files.filter(file => 
      file.endsWith('.js') && 
      file !== 'base.js' && 
      file !== 'registry.js'
    );

    for (const file of adapterFiles) {
      try {
        const adapterPath = path.join(marketplacesDir, file);
        const AdapterClass = require(adapterPath);
        
        // Sprawdź czy to klasa rozszerzająca BaseMarketplaceAdapter
        if (typeof AdapterClass === 'function') {
          const adapterInstance = new AdapterClass();
          
          // Sprawdź czy ma wymagane metody
          if (typeof adapterInstance.testConnection === 'function' && 
              typeof adapterInstance.publishProduct === 'function' &&
              typeof adapterInstance.getName === 'function') {
            
            const name = adapterInstance.getName().toLowerCase();
            this.adapters.set(name, adapterInstance);
            console.log(`✓ Registered marketplace adapter: ${name}`);
          } else {
            console.warn(`⚠ Skipping ${file}: Missing required methods (testConnection, publishProduct, getName)`);
          }
        } else {
          console.warn(`⚠ Skipping ${file}: Not a valid adapter class`);
        }
      } catch (error) {
        console.error(`✗ Failed to register adapter from ${file}:`, error.message);
      }
    }
  }

  /**
   * Zwraca adapter dla danego marketplace'u
   * @param {string} marketplaceName - Nazwa marketplace'u (case-insensitive)
   * @returns {BaseMarketplaceAdapter|null}
   */
  getAdapter(marketplaceName) {
    if (!marketplaceName) {
      return null;
    }
    return this.adapters.get(marketplaceName.toLowerCase()) || null;
  }

  /**
   * Sprawdza czy marketplace jest zarejestrowany
   * @param {string} marketplaceName - Nazwa marketplace'u
   * @returns {boolean}
   */
  hasAdapter(marketplaceName) {
    return this.adapters.has(marketplaceName.toLowerCase());
  }

  /**
   * Zwraca listę wszystkich zarejestrowanych marketplace'ów
   * @returns {Array<string>}
   */
  getRegisteredMarketplaces() {
    return Array.from(this.adapters.keys());
  }

  /**
   * Zwraca wszystkie adaptery
   * @returns {Map<string, BaseMarketplaceAdapter>}
   */
  getAllAdapters() {
    return this.adapters;
  }

  /**
   * Ręczna rejestracja adaptera (opcjonalna, zwykle niepotrzebna dzięki auto-register)
   * @param {BaseMarketplaceAdapter} adapter - Instancja adaptera
   */
  register(adapter) {
    if (!adapter || typeof adapter.getName !== 'function') {
      throw new Error('Invalid adapter: must have getName() method');
    }
    
    const name = adapter.getName().toLowerCase();
    this.adapters.set(name, adapter);
    console.log(`✓ Manually registered marketplace adapter: ${name}`);
  }
}

// Singleton instance
const registry = new MarketplaceRegistry();

module.exports = registry;

