const axios = require('axios');

const EAN_DB_API_URL = 'https://ean-db.com/api/v2/product';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

/**
 * Helper: call Perplexity API with automatic retry on 429 (rate limit) errors.
 * Waits 5 seconds and retries up to maxRetries times.
 */
async function callPerplexityWithRetry(requestData, headers, { maxRetries = 3, delayMs = 5000, label = 'Perplexity' } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[${label}] Retry attempt ${attempt + 1}/${maxRetries + 1} after ${delayMs / 1000}s delay...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      return await axios.post('https://api.perplexity.ai/chat/completions', requestData, { headers });
    } catch (error) {
      lastError = error;
      const status = error.response?.status || error.status;
      const isRateLimited =
        status === 429 ||
        error.message?.includes('429') ||
        error.message?.includes('Too Many Requests') ||
        error.message?.includes('rate limit');

      if (isRateLimited && attempt < maxRetries) {
        console.log(`[${label}] Rate limited (429). Will retry in ${delayMs / 1000}s...`);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

/**
 * Service for interacting with EAN-DB API and AI-powered product lookup
 */
const eanDbService = {
  /**
   * Lookup product by EAN or product name using Perplexity AI (Web Search)
   * This is the primary method - gives more accurate product identification using live web data
   * @param {string} barcodeOrName EAN code or product name
   * @returns {Promise<Object|null>} Product data or null if not found
   */
  async lookupEanWithAI(barcodeOrName) {
    if (!barcodeOrName) {
      return null;
    }

    // Try Perplexity First (Web Search)
    if (PERPLEXITY_API_KEY) {
      try {
        return await this.lookupWithPerplexity(barcodeOrName);
      } catch (error) {
        console.error('[EAN-AI] Perplexity failed, trying fallback to OpenAI...', error.message);
      }
    } else {
        console.warn('[EAN-AI] PERPLEXITY_API_KEY not set. Skipping Perplexity.');
    }

    // Fallback to OpenAI if Perplexity fails or key missing
    if (OPENAI_API_KEY) {
        return await this.lookupWithOpenAI(barcodeOrName);
    }
    
    return null;
  },

  /**
   * Lookup EAN code from product name and image using Perplexity AI Vision
   * This method uses both product name and image to find EAN code via web search
   * @param {string} productName Product name
   * @param {string} base64Image Base64 encoded image data
   * @param {string} mimeType Image MIME type (e.g., 'image/jpeg', 'image/png')
   * @returns {Promise<string|null>} EAN code or null if not found
   */
  async lookupEanFromNameAndImageWithPerplexity(productName, base64Image, mimeType = 'image/jpeg') {
    if (!PERPLEXITY_API_KEY) {
      console.warn('[EAN-IMAGE-NAME] PERPLEXITY_API_KEY not set. Skipping EAN lookup from name and image.');
      return null;
    }

    if (!base64Image) {
      return null;
    }

    if (!productName || !productName.trim()) {
      console.warn('[EAN-IMAGE-NAME] Product name not provided, falling back to image-only lookup');
      return await this.lookupEanFromImageWithPerplexity(base64Image, mimeType);
    }

    console.log(`[EAN-IMAGE-NAME] Attempting to find EAN code for product "${productName}" using Perplexity AI with image...`);

    try {
      const response = await callPerplexityWithRetry(
        {
          model: 'sonar', // Using online model for web search capabilities
          messages: [
            {
              role: 'system',
              content: `Jesteś ekspertem od identyfikacji produktów. Twoim zadaniem jest znalezienie kodu EAN (kod kreskowy) produktu na podstawie jego nazwy i zdjęcia.

Kroki:
1. Przeanalizuj zdjęcie produktu i nazwę produktu: "${productName}"
2. Zidentyfikuj dokładnie produkt (marka, model, pełna nazwa)
3. Wyszukaj w internecie kod EAN tego konkretnego produktu
4. Zwróć TYLKO kod EAN jako ciąg cyfr (8-14 cyfr) lub null jeśli nie udało się znaleźć

Format odpowiedzi (TYLKO JSON):
{
  "ean": "1234567890123" lub null,
  "productName": "Pełna nazwa produktu jeśli znaleziona" lub null
}

Jeśli nie znajdziesz kodu EAN, zwróć {"ean": null, "productName": null}.`
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Na podstawie nazwy produktu "${productName}" i zdjęcia, znajdź kod EAN (kod kreskowy) tego produktu. Wyszukaj w internecie dokładny kod EAN dla tego konkretnego produktu.`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          temperature: 0.2,
          max_tokens: 500
        },
        {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        { label: 'Perplexity EAN-IMAGE-NAME' }
      );

      const rawContent = response.data.choices[0].message.content.trim();
      // Clean up markdown code blocks if present
      const cleanJson = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
      
      let result;
      try {
        result = JSON.parse(cleanJson);
      } catch (e) {
        // Try to extract EAN from text if JSON parsing fails
        const eanMatch = rawContent.match(/\b\d{8,14}\b/);
        if (eanMatch) {
          console.log(`[EAN-IMAGE-NAME] Extracted EAN from text: ${eanMatch[0]}`);
          return eanMatch[0];
        }
        console.error('[EAN-IMAGE-NAME] Failed to parse Perplexity JSON response', e);
        return null;
      }

      if (result && result.ean) {
        // Validate EAN format (8-14 digits)
        const ean = result.ean.toString().replace(/\s/g, '');
        if (/^\d{8,14}$/.test(ean)) {
          console.log(`[EAN-IMAGE-NAME] Found EAN for "${productName}": ${ean}`);
          if (result.productName) {
            console.log(`[EAN-IMAGE-NAME] Product identified: ${result.productName}`);
          }
          return ean;
        }
      }

      console.log(`[EAN-IMAGE-NAME] No valid EAN found for product "${productName}"`);
      return null;
    } catch (error) {
      console.error('[EAN-IMAGE-NAME] Perplexity AI error:', error.response?.data || error.message);
      return null;
    }
  },

  /**
   * Lookup EAN code from product image using Perplexity AI Vision
   * @param {string} base64Image Base64 encoded image data
   * @param {string} mimeType Image MIME type (e.g., 'image/jpeg', 'image/png')
   * @returns {Promise<string|null>} EAN code or null if not found
   */
  async lookupEanFromImageWithPerplexity(base64Image, mimeType = 'image/jpeg') {
    if (!PERPLEXITY_API_KEY) {
      console.warn('[EAN-IMAGE] PERPLEXITY_API_KEY not set. Skipping EAN lookup from image.');
      return null;
    }

    if (!base64Image) {
      return null;
    }

    console.log('[EAN-IMAGE] Attempting to find EAN code from image using Perplexity AI...');

    try {
      // Perplexity AI supports vision through messages with image content
      // Format similar to OpenAI Vision API
      const response = await callPerplexityWithRetry(
        {
          model: 'sonar', // Using online model for web search capabilities
          messages: [
            {
              role: 'system',
              content: `Jesteś ekspertem od identyfikacji produktów. Twoim zadaniem jest znalezienie kodu EAN (kod kreskowy) produktu widocznego na zdjęciu.

Przeanalizuj zdjęcie produktu i:
1. Spróbuj odczytać kod kreskowy (EAN) jeśli jest widoczny na zdjęciu
2. Jeśli kod kreskowy nie jest widoczny, zidentyfikuj produkt (marka, model, nazwa) i wyszukaj w internecie jego kod EAN
3. Zwróć TYLKO kod EAN jako ciąg cyfr (8-14 cyfr) lub null jeśli nie udało się znaleźć

Format odpowiedzi (TYLKO JSON):
{
  "ean": "1234567890123" lub null,
  "productName": "Nazwa produktu jeśli znaleziona" lub null
}

Jeśli nie znajdziesz kodu EAN, zwróć {"ean": null, "productName": null}.`
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Przeanalizuj to zdjęcie produktu i znajdź kod EAN (kod kreskowy). Jeśli kod kreskowy nie jest widoczny na zdjęciu, zidentyfikuj produkt i wyszukaj jego kod EAN w internecie.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          temperature: 0.2,
          max_tokens: 500
        },
        {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        { label: 'Perplexity EAN-IMAGE' }
      );

      const rawContent = response.data.choices[0].message.content.trim();
      // Clean up markdown code blocks if present
      const cleanJson = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
      
      let result;
      try {
        result = JSON.parse(cleanJson);
      } catch (e) {
        // Try to extract EAN from text if JSON parsing fails
        const eanMatch = rawContent.match(/\b\d{8,14}\b/);
        if (eanMatch) {
          console.log(`[EAN-IMAGE] Extracted EAN from text: ${eanMatch[0]}`);
          return eanMatch[0];
        }
        console.error('[EAN-IMAGE] Failed to parse Perplexity JSON response', e);
        return null;
      }

      if (result && result.ean) {
        // Validate EAN format (8-14 digits)
        const ean = result.ean.toString().replace(/\s/g, '');
        if (/^\d{8,14}$/.test(ean)) {
          console.log(`[EAN-IMAGE] Found EAN from image: ${ean}`);
          if (result.productName) {
            console.log(`[EAN-IMAGE] Product identified: ${result.productName}`);
          }
          return ean;
        }
      }

      console.log('[EAN-IMAGE] No valid EAN found in image');
      return null;
    } catch (error) {
      console.error('[EAN-IMAGE] Perplexity AI error:', error.response?.data || error.message);
      return null;
    }
  },

  async lookupWithPerplexity(barcodeOrName) {
    const cleanInput = barcodeOrName.trim();
    const isEan = /^\d{8,14}$/.test(cleanInput.replace(/\s/g, ''));
    
    console.log(`[EAN-AI] Searching for product with Perplexity (${isEan ? 'EAN' : 'name'}): ${cleanInput}`);

    const response = await callPerplexityWithRetry(
      {
        model: 'sonar-pro', // Using sonar-pro for web search capabilities
        messages: [
          {
            role: 'system',
            content: `Jesteś ekspertem e-commerce i researcherem produktów.
Twoim zadaniem jest znalezienie i opisanie produktu na podstawie kodu EAN lub nazwy, używając aktualnych informacji z sieci.

Format odpowiedzi (TYLKO JSON):
{
  "name": "Pełna nazwa produktu (Marka Model)",
  "manufacturer": "Producent",
  "description": "Szczegółowy opis znaleziony w sieci. Opisz funkcje, parametry, zastosowanie. Bądź dokładny.",
  "category": "Kategoria produktu",
  "dimensions": {
     "width": number (cm) lub null,
     "height": number (cm) lub null,
     "depth": number (cm) lub null,
     "weight": number (kg) lub null
  }
}

Jeśli nie znajdziesz produktu, zwróć null dla pola name.`
          },
          {
            role: 'user',
            content: isEan 
              ? `Znajdź informacje o produkcie z kodem EAN: ${cleanInput.replace(/\s/g, '')}`
              : `Znajdź informacje o produkcie: ${cleanInput}`
          }
        ],
        temperature: 0.2,
        max_tokens: 1000 // Perplexity doesn't support response_format: json_object well in all models, so we rely on prompt
      },
      {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      { label: 'Perplexity EAN-AI' }
    );

    const rawContent = response.data.choices[0].message.content.trim();
    // Clean up markdown code blocks if present
    const cleanJson = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let productInfo;
    try {
        productInfo = JSON.parse(cleanJson);
    } catch (e) {
        console.error('[EAN-AI] Failed to parse Perplexity JSON response', e);
        return null;
    }

    if (!productInfo || !productInfo.name) return null;

    console.log(`[EAN-AI] Found product via Perplexity: ${productInfo.name}`);

    return {
        ean: isEan ? cleanInput.replace(/\s/g, '') : null,
        name: productInfo.name,
        description: productInfo.description || null,
        manufacturer: productInfo.manufacturer || null,
        category: productInfo.category || null,
        dimensions: {
          width: productInfo.dimensions?.width || null,
          height: productInfo.dimensions?.height || null,
          depth: productInfo.dimensions?.depth || null,
          weight: productInfo.dimensions?.weight || null
        },
        images: [],
        source: 'ai-perplexity'
    };
  },

  async lookupWithOpenAI(barcodeOrName) {
    const cleanInput = barcodeOrName.trim();
    const isEan = /^\d{8,14}$/.test(cleanInput.replace(/\s/g, ''));
    
    console.log(`[EAN-AI] Searching for product with OpenAI (${isEan ? 'EAN' : 'name'}): ${cleanInput}`);
      
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `Jesteś ekspertem od identyfikacji produktów na podstawie kodów EAN/GTIN lub nazw produktów.
Twoim zadaniem jest dostarczenie SZCZEGÓŁOWYCH informacji o produkcie na podstawie Twojej szerokiej wiedzy.

Kroki:
1. Zidentyfikuj produkt na podstawie kodu EAN lub nazwy.
2. Przypomnij sobie/wyszukaj w swojej wiedzy wszystkie dostępne szczegóły: Marka, Model, Dokładna Specyfikacja, Skład (jeśli dotyczy), Wymiary, Waga.
3. Jeśli jest to produkt spożywczy, podaj składniki i wartości odżywcze jeśli znasz.
4. Jeśli jest to elektronika, podaj parametry techniczne.

WAŻNE:
- Jeśli nie jesteś pewien na 100% co to za produkt, zwróć {"name": null}.
- Zwróć TYLKO poprawny JSON, bez żadnych dodatkowych komentarzy.

Format odpowiedzi (TYLKO JSON):
{
  "name": "Pełna nazwa produktu (Marka Model)",
  "manufacturer": "Producent",
  "description": "Szczegółowy opis produktu, zawierający wszystkie znane Ci cechy, parametry, skład, zastosowanie. Bądź wylewny.",
  "category": "Kategoria produktu",
  "dimensions": {
     "width": number (cm) lub null,
     "height": number (cm) lub null,
     "depth": number (cm) lub null,
     "weight": number (kg) lub null
  }
}`
            },
            {
              role: 'user',
              content: isEan 
                ? `Zidentyfikuj i opisz szczegółowo produkt o kodzie EAN: ${cleanInput.replace(/\s/g, '')}`
                : `Zidentyfikuj i opisz szczegółowo produkt o nazwie: ${cleanInput}`
            }
          ],
          temperature: 0.3,
          max_tokens: 1000,
          response_format: { type: "json_object" }
        },
        {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const rawContent = response.data.choices[0].message.content.trim();
      
      let productInfo;
      try {
        productInfo = JSON.parse(rawContent);
        if (!productInfo) {
          return null;
        }
      } catch (parseError) {
        // Fallback extraction logic
        try {
            const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) productInfo = JSON.parse(jsonMatch[0]);
        } catch(e) {}
        
        if (!productInfo) return null;
      }

      if (!productInfo || !productInfo.name || productInfo.name === 'null') {
        return null;
      }

      console.log(`[EAN-AI] Found product via OpenAI: ${productInfo.name}`);
      
      return {
        ean: isEan ? cleanInput.replace(/\s/g, '') : null,
        name: productInfo.name,
        description: productInfo.description || null,
        manufacturer: productInfo.manufacturer || null,
        category: productInfo.category || null,
        dimensions: {
          width: productInfo.dimensions?.width || null,
          height: productInfo.dimensions?.height || null,
          depth: productInfo.dimensions?.depth || null,
          weight: productInfo.dimensions?.weight || null
        },
        images: [],
        source: 'ai-openai'
      };
  },

  /**
   * Fetch product details by EAN code from EAN-DB API (fallback)
   * @param {string} barcode 
   * @returns {Promise<Object|null>} Product data or null if not found
   */
  async getProductFromEanDb(barcode) {
    if (!barcode) return null;
    
    // Normalize barcode (remove spaces)
    const cleanBarcode = barcode.replace(/\s/g, '');
    
    // Validate barcode format (digits only, max 20 chars to be safe)
    if (!/^\d+$/.test(cleanBarcode)) {
      console.warn(`Invalid barcode format: ${cleanBarcode}`);
      return null;
    }

    if (!process.env.EAN_DB_JWT) {
      console.warn('EAN_DB_JWT is not set. Skipping EAN-DB lookup.');
      return null;
    }

    try {
      const response = await axios.get(`${EAN_DB_API_URL}/${cleanBarcode}`, {
        headers: {
          'Authorization': `Bearer ${process.env.EAN_DB_JWT}`,
          'Accept': 'application/json'
        }
      });

      if (response.data && response.data.product) {
        const data = this.normalizeProductData(response.data.product);
        data.source = 'ean-db';
        return data;
      }
      
      return null;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log(`Product not found in EAN-DB: ${cleanBarcode}`);
        return null;
      }
      console.error('EAN-DB API error:', error.message);
      return null;
    }
  },

  /**
   * Fetch product details by EAN code or product name
   * Strategy: 1. Try AI lookup first (Primary method) - works for both EAN and product name
   *           2. Fall back to EAN-DB if AI fails and input is EAN code
   * @param {string} barcodeOrName EAN code or product name
   * @returns {Promise<Object|null>} Product data or null if not found
   */
  async getProduct(barcodeOrName) {
    if (!barcodeOrName) return null;
    
    const cleanInput = barcodeOrName.trim();
    const isEan = /^\d{8,14}$/.test(cleanInput.replace(/\s/g, ''));
    
    // 1. First try AI-powered lookup (User requirement: AI search first via web/knowledge)
    // Works for both EAN codes and product names
    const aiResult = await this.lookupEanWithAI(cleanInput);
    if (aiResult) {
      console.log(`[EAN] Product found via AI: ${aiResult.name}`);
      return aiResult;
    }
    
    // 2. Fall back to EAN-DB API only if input is EAN code (not product name)
    if (isEan) {
      console.log(`[EAN] AI lookup failed, trying EAN-DB...`);
      const eanDbResult = await this.getProductFromEanDb(cleanInput);
      if (eanDbResult) {
        console.log(`[EAN] Product found via EAN-DB: ${eanDbResult.name}`);
        return eanDbResult;
      }
    }
    
    console.log(`[EAN] Product not found in any source for: ${cleanInput}`);
    return null;
  },

  /**
   * Normalize EAN-DB product data to our internal structure
   * @param {Object} product EAN-DB product object
   * @returns {Object} Normalized data
   */
  normalizeProductData(product) {
    const data = {
      ean: product.barcode,
      name: null,
      description: null,
      manufacturer: null,
      dimensions: {
        width: null,
        height: null,
        depth: null, // length
        weight: null
      },
      images: []
    };

    // Extract name (prefer PL, then EN, then first available)
    if (product.titles) {
        data.name = product.titles.pl || product.titles.en || Object.values(product.titles)[0];
    }

    // Extract manufacturer
    if (product.manufacturer && product.manufacturer.titles) {
        data.manufacturer = product.manufacturer.titles.pl || product.manufacturer.titles.en || Object.values(product.manufacturer.titles)[0];
    }

    // Extract images
    if (product.images && Array.isArray(product.images)) {
        data.images = product.images.map(img => img.url);
    }

    // Extract dimensions from metadata if available
    if (product.metadata) {
      const md = product.metadata;

      // Helper to extract value from nested structure
      const extractValue = (obj, keys) => {
        let current = obj;
        for (const key of keys) {
          if (!current || !current[key]) return null;
          current = current[key];
        }
        return current;
      };

      // Try to find weight (generic.weight.net.equals.value)
      if (md.generic?.weight?.net?.equals?.value) {
        let val = parseFloat(md.generic.weight.net.equals.value);
        const unit = md.generic.weight.net.equals.unit;
        // Convert to kg if grams
        if (unit === 'grams' || unit === 'g') val = val / 1000;
        data.dimensions.weight = val;
      } else if (md.weight) {
        data.dimensions.weight = parseFloat(md.weight);
      }

      // Try to find dimensions (generic.dimensions.packaging)
      const dims = md.generic?.dimensions?.packaging;
      if (dims) {
        if (dims.width?.equals?.value) data.dimensions.width = parseFloat(dims.width.equals.value); // cm usually
        if (dims.height?.equals?.value) data.dimensions.height = parseFloat(dims.height.equals.value);
        if (dims.depth?.equals?.value) data.dimensions.depth = parseFloat(dims.depth.equals.value);
      } else {
        // Fallback to flat structure
        if (md.width) data.dimensions.width = parseFloat(md.width);
        if (md.height) data.dimensions.height = parseFloat(md.height);
        if (md.depth) data.dimensions.depth = parseFloat(md.depth);
        if (md.length) data.dimensions.depth = parseFloat(md.length);
      }
    }

    return data;
  }
};

module.exports = eanDbService;
