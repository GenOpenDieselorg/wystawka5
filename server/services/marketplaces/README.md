# Marketplace Adapters

System adapterów marketplace'ów umożliwia łatwe dodawanie nowych platform bez modyfikacji core'u aplikacji.

## Architektura

System używa wzorca **Strategy Pattern** z automatyczną rejestracją:

- **BaseMarketplaceAdapter** - Bazowa klasa, którą muszą rozszerzać wszystkie adaptery
- **Registry** - Automatycznie wykrywa i rejestruje wszystkie adaptery z katalogu
- **Marketplace Services** - Wrapper używający rejestru do routingu

## Jak dodać nowy marketplace?

### Krok 1: Stwórz nowy plik adaptera

Stwórz plik `server/services/marketplaces/[nazwa].js` (np. `ceneo.js`, `morele.js`):

```javascript
const BaseMarketplaceAdapter = require('./base');
const axios = require('axios');

class CeneoAdapter extends BaseMarketplaceAdapter {
  constructor() {
    super('ceneo'); // Nazwa marketplace'u (lowercase)
  }

  async testConnection(accessToken, refreshToken = null) {
    try {
      // Test połączenia z API marketplace'u
      const response = await axios.get('https://api.ceneo.pl/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      return { success: true, message: 'Ceneo connection successful' };
    } catch (error) {
      return { 
        success: false, 
        message: `Ceneo connection failed: ${error.message}` 
      };
    }
  }

  async publishProduct(authData, product, baseUrl) {
    try {
      let accessToken;
      
      // Extract access token from authData
      if (authData && typeof authData === 'object' && authData.access_token) {
        accessToken = authData.access_token;
      } else {
        accessToken = authData;
      }

      // Przygotuj payload zgodny z API marketplace'u
      const payload = {
        name: product.product_name,
        description: product.description,
        price: product.price,
        images: (product.images || []).map(img => ({
          url: `${baseUrl}${img.processedUrl || img.url}`
        }))
        // ... inne pola wymagane przez API
      };

      // Wyślij żądanie do API
      const response = await axios.post('https://api.ceneo.pl/products', payload, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return { 
        success: true, 
        message: 'Product published to Ceneo', 
        externalId: response.data.id 
      };
    } catch (error) {
      return { 
        success: false, 
        message: `Ceneo publish failed: ${error.response?.data?.message || error.message}` 
      };
    }
  }
}

module.exports = CeneoAdapter;
```

### Krok 2: To wszystko!

Rejestr automatycznie wykryje nowy adapter przy starcie serwera. Nie musisz:

- ❌ Modyfikować `marketplace.js`
- ❌ Modyfikować `routes/marketplace.js`
- ❌ Dodawać case'a do switch
- ❌ Aktualizować listy validMarketplaces

System automatycznie:
- ✅ Zarejestruje adapter
- ✅ Doda go do listy dostępnych marketplace'ów
- ✅ Umożliwi publikację produktów
- ✅ Umożliwi testowanie połączenia

## Wymagane metody

Każdy adapter musi implementować:

### `testConnection(accessToken, refreshToken)`

Testuje połączenie z marketplace'em.

**Parametry:**
- `accessToken` (string) - Token dostępu
- `refreshToken` (string|null) - Token odświeżania (opcjonalny)

**Zwraca:**
```javascript
{
  success: boolean,
  message: string,
  // ... dodatkowe pola (opcjonalne)
}
```

### `publishProduct(authData, product, baseUrl)`

Publikuje produkt na marketplace.

**Parametry:**
- `authData` (Object|string) - Dane autoryzacyjne (integration object lub accessToken)
- `product` (Object) - Obiekt produktu
- `baseUrl` (string) - Bazowy URL aplikacji (dla obrazów)

**Zwraca:**
```javascript
{
  success: boolean,
  message: string,
  externalId?: string, // ID oferty na marketplace
  // ... dodatkowe pola (opcjonalne)
}
```

## Obiekt produktu

Standardowy obiekt produktu zawiera:

```javascript
{
  id: number,
  product_name: string,
  description: string,
  price: number,
  currency: string,
  ean_code: string,
  catalog_code: string,
  stock: number,
  weight: number,
  images: [
    {
      url: string,
      processedUrl: string
    }
  ],
  parameters: Array, // Parametry specyficzne dla marketplace'u
  // ... inne pola
}
```

## Opcjonalne metody

### `getRequiredConfigFields()`

Zwraca wymagane pola konfiguracyjne dla tego marketplace'u.

**Zwraca:**
```javascript
[
  {
    name: string,
    type: string, // 'text', 'select', 'number', etc.
    required: boolean,
    description: string
  }
]
```

### `validateConfig(config)`

Waliduje konfigurację integracji.

**Parametry:**
- `config` (Object) - Konfiguracja do walidacji

**Zwraca:**
```javascript
{
  valid: boolean,
  errors: Array<string>
}
```

## Przykłady

Zobacz istniejące adaptery:
- `olx.js` - Prosty adapter OAuth
- `allegro.js` - Złożony adapter z helper methods
- `erli.js` - Adapter z API key (bez OAuth)

## Debugowanie

Rejestr loguje wszystkie zarejestrowane adaptery przy starcie:

```
✓ Registered marketplace adapter: olx
✓ Registered marketplace adapter: allegro
✓ Registered marketplace adapter: erli
✓ Registered marketplace adapter: ceneo
```

Jeśli adapter nie został zarejestrowany, sprawdź:
1. Czy plik ma rozszerzenie `.js`
2. Czy klasa rozszerza `BaseMarketplaceAdapter`
3. Czy implementuje wymagane metody
4. Czy `getName()` zwraca poprawną nazwę (lowercase)

## Testowanie

Po dodaniu adaptera możesz przetestować:

1. **Test połączenia:**
```javascript
POST /api/marketplace/integrations/:id/test
```

2. **Publikacja produktu:**
```javascript
PATCH /api/products/:id/publish
```

System automatycznie użyje odpowiedniego adaptera na podstawie nazwy marketplace'u w integracji.

