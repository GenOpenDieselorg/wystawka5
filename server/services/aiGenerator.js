const axios = require('axios');
const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const { callGeminiWithRetry } = require('../utils/geminiRetry');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Fallback template structure to ensure sectional generation works even if DB is empty/corrupted
const FALLBACK_TEMPLATE_STRUCTURE = [
  {
    type: 'text',
    name: 'Nagłówek i Wstęp',
    content: 'Napisz nagłówek <H1> z nazwą produktu: {productName}. Następnie napisz akapit wstępu marketingowego (język korzyści), opisujący główne zastosowanie produktu. Potwierdź jakość i skuteczność. Nie używaj list punktowanych w tej sekcji.'
  },
  {
    type: 'image',
    name: 'Zdjęcie produktu 1'
  },
  {
    type: 'text',
    name: 'Kluczowe Cechy',
    content: 'Napisz nagłówek <H2> "Kluczowe cechy" lub "Zalety". Następnie stwórz listę punktowaną (<ul><li>) wymieniającą najważniejsze atuty produktu, innowacyjną formułę lub unikalne funkcje. Używaj tagu <b> do pogrubiania kluczowych fraz.'
  },
  {
    type: 'image',
    name: 'Zdjęcie produktu 2'
  },
  {
    type: 'text',
    name: 'Specyfikacja i Zastosowanie',
    content: 'Napisz nagłówek <H2> "Specyfikacja i Zastosowanie". Opisz dokładnie jak używać produktu lub gdzie znajduje zastosowanie. Poniżej wypisz dane techniczne, skład, wymiary lub parametry (na podstawie {parameters} i {eanCode}) w czytelnej formie.'
  },
  {
    type: 'text',
    name: 'Dodatkowe Dane (Wymiary/Waga)',
    content: 'Napisz nagłówek <H2> "Wymiary i Waga". Wypisz podane wymiary: {user_wymiary} oraz wagę: {user_waga}. Przedstaw te dane w czytelnej liście punktowanej.',
    is_optional: true,
    requires_input: true,
    input_fields: [
        { name: 'user_wymiary', label: 'Wymiary (np. 10x20x5 cm)' },
        { name: 'user_waga', label: 'Waga (np. 0.5 kg)' }
    ]
  },
  {
    type: 'image',
    name: 'Zdjęcie produktu 3'
  },
  {
    type: 'text',
    name: 'Podsumowanie',
    content: 'Napisz nagłówek <H2> "Dlaczego warto?". Krótkie podsumowanie zachęcające do zakupu. Jeśli produkt posiada certyfikaty lub jest ekologiczny, wspomnij o tym tutaj.'
  }
];

// Helper function to check if error is quota-related
const isQuotaError = (error) => {
  const errorData = error.response?.data;
  return errorData?.error?.code === 'insufficient_quota' || 
         errorData?.error?.type === 'insufficient_quota' ||
         error.message?.includes('quota') ||
         error.message?.includes('billing');
};

// Helper function to generate text using AI provider
async function generateText(prompt, provider, openAiKey = OPENAI_API_KEY, geminiKey = GEMINI_API_KEY) {
  let description;
  let usedProvider = provider;
  let fallbackAttempted = false;

  try {
    if (provider === 'gemini') {
      if (!geminiKey) throw new Error('Gemini API key not configured');
      
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        
        const response = await callGeminiWithRetry(ai, {
          model: "gemini-3-flash-preview",
          contents: prompt,
        }, { label: 'Gemini generateText' });
        
        description = response.text ? response.text.trim() : '';
        
        if (!description) {
            console.warn('[Gemini] Generated text is empty after trim');
            throw new Error('Gemini returned empty response');
        }
      } catch (geminiError) {
        console.error('[Gemini] Error:', geminiError);
        throw geminiError;
      }

    } else {
      if (!openAiKey) throw new Error('OpenAI API key not configured');
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'Jesteś ekspertem e-commerce. Tworzysz opisy HTML na Allegro.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 4000,
          temperature: 0.7
        },
        { headers: { 'Authorization': `Bearer ${openAiKey}`, 'Content-Type': 'application/json' } }
      );
      description = response.data.choices[0].message.content.trim();
    }
  } catch (primaryError) {
    if (isQuotaError(primaryError) || provider === 'gemini') { // Also catch general Gemini errors for fallback
      console.warn(`${provider} error or quota exceeded, trying fallback provider...`, primaryError.message);
      fallbackAttempted = true;
      usedProvider = provider === 'gemini' ? 'chatgpt' : 'gemini';
      try {
        if (usedProvider === 'gemini') {
             // Gemini Fallback logic...
             if (!geminiKey) throw new Error('Gemini API key not configured for fallback');
             
             const { GoogleGenAI } = await import('@google/genai');
             const ai = new GoogleGenAI({ apiKey: geminiKey });
             
             const response = await callGeminiWithRetry(ai, {
               model: "gemini-3-flash-preview",
               contents: prompt,
             }, { label: 'Gemini fallback' });
             
             description = response.text ? response.text.trim() : '';

             if (!description) {
                 throw new Error('Gemini fallback returned empty response');
             }
        } else {
             // OpenAI Fallback logic...
             if (!openAiKey) throw new Error('OpenAI API key not configured for fallback');
             const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                  model: 'gpt-3.5-turbo',
                  messages: [{ role: 'user', content: prompt }],
                  max_tokens: 4000,
                  temperature: 0.7
                },
                { headers: { 'Authorization': `Bearer ${openAiKey}`, 'Content-Type': 'application/json' } }
             );
             description = response.data.choices[0].message.content.trim();
        }
      } catch (fallbackError) {
        throw new Error(isQuotaError(primaryError) && isQuotaError(fallbackError)
          ? 'Brak środków na koncie API.'
          : 'Nie udało się wygenerować opisu (Błąd API).');
      }
    } else {
      throw primaryError;
    }
  }
  return { description, provider: usedProvider, fallbackAttempted };
}

async function generateDescription(productData, userId, templateId = null) {
    const { productName, eanCode, manufacturer, parameters, catalogDescription, description, dimensions, aiOptions } = productData;
    
    console.log(`[AI Gen] Processing single offer: ${productName} (EAN: ${eanCode})`);

    // Pobierz preferencje
    const [preferences] = await db.execute('SELECT * FROM user_preferences WHERE user_id = ?', [userId]);
    const prefs = preferences.length > 0 ? preferences[0] : {};
    // User requested Gemini as primary for templates
    const aiProvider = prefs.ai_provider || 'gemini';
    
    // Pobierz instrukcje stylu
    let aiStylePrompts = {};
    try { aiStylePrompts = JSON.parse(prefs.ai_style_prompts || '{}'); } catch (e) {}
    
    const styleInstructions = aiStylePrompts[prefs.description_style] || 'Styl profesjonalny, ekspercki, budzący zaufanie.';

    // 1. Pobierz Szablon
    let rawTemplate = null;

    if (templateId) {
      const [templates] = await db.execute(
        'SELECT content FROM ai_templates WHERE id = ? AND (user_id = ? OR is_global = TRUE)',
        [templateId, userId]
      );
      if (templates.length > 0) rawTemplate = templates[0].content;
    }

    if (!rawTemplate) {
      // Pobierz domyślny - preferuj "Sekcyjny"
      const [sysTemplates] = await db.execute(
        'SELECT content FROM ai_templates WHERE name LIKE ? AND is_global = TRUE LIMIT 1',
        ['%Domyślny szablon Allegro (Sekcyjny)%']
      );
      if (sysTemplates.length > 0) {
        rawTemplate = sysTemplates[0].content;
      } else {
        // Fallback do starej nazwy, jeśli nowej nie ma
        const [oldTemplates] = await db.execute(
          'SELECT content FROM ai_templates WHERE name LIKE ? AND is_global = TRUE LIMIT 1',
          ['%Domyślny szablon Allegro%']
        );
        if (oldTemplates.length > 0) rawTemplate = oldTemplates[0].content;
      }
    }

    // 2. Analiza Szablonu (Czy to JSON/Tablica czy Stary String?)
    let templateStructure = [];
    let isStructured = false;

    // Próba parsowania pobranego szablonu
    if (rawTemplate) {
        try {
            const parsed = JSON.parse(rawTemplate);
            if (Array.isArray(parsed)) {
                templateStructure = parsed;
                isStructured = true;
            }
        } catch (e) {
            // Jeśli nie jest JSONem, traktujemy jako stary format (prosty string)
            isStructured = false;
        }
    }

    // OSTATECZNY FALLBACK: Jeśli nadal brak szablonu lub jest to stary string, a my chcemy wymusić sekcje (dla domyślnych)
    // To używamy wbudowanego szablonu
    if (!isStructured && !templateId) {
        console.log('[AI Gen] No structured template found in DB, using HARDCODED FALLBACK structure.');
        templateStructure = FALLBACK_TEMPLATE_STRUCTURE;
        isStructured = true;
    }

    // Przygotowanie danych produktu (Context)
    let paramStr = '';
    if (parameters) {
        if (Array.isArray(parameters)) {
             paramStr = parameters.map(p => `${p.name}: ${p.values || p.valuesIds}`).join(', ');
        } else if (typeof parameters === 'object') {
             paramStr = Object.entries(parameters).map(([key, val]) => `${key}: ${val}`).join(', ');
        }
    }

    // Handle Dimensions and Weight from aiOptions
    let customInstructions = '';
    if (aiOptions) {
        const { includeDimensions, includeWeight, customInstructions: instructions } = aiOptions;
        
        if (instructions) {
            customInstructions = instructions;
        }
        
        if (dimensions) {
            const dimParts = [];
            if (includeDimensions) {
                if (dimensions.width) dimParts.push(`Szerokość: ${dimensions.width} cm`);
                if (dimensions.height) dimParts.push(`Wysokość: ${dimensions.height} cm`);
                if (dimensions.depth) dimParts.push(`Głębokość: ${dimensions.depth} cm`);
            }
            if (includeWeight && dimensions.weight) {
                dimParts.push(`Waga: ${dimensions.weight} kg`);
            }
            
            if (dimParts.length > 0) {
                paramStr += (paramStr ? ', ' : '') + dimParts.join(', ');
            }
        }
    }
    
    const contextData = `
    DANE PRODUKTU (Używaj TYLKO tych danych):
    Nazwa: ${productName}
    Producent: ${manufacturer || 'Brak danych'}
    EAN: ${eanCode || 'Brak'}
    Parametry: ${paramStr}
    ${productData.aiOptions && productData.aiOptions.customInputs ? 'DANE DODATKOWE OD UŻYTKOWNIKA:\n    ' + Object.entries(productData.aiOptions.customInputs).map(([k, v]) => `${k}: ${v}`).join('\n    ') : ''}
    ${customInstructions ? 'DODATKOWE INSTRUKCJE / DANE OD UŻYTKOWNIKA:\n    ' + customInstructions : ''}
    Stary opis/Katalog/Web Search: ${catalogDescription ? catalogDescription.substring(0, 3000) : ''}
    Obecny opis oferty (jeśli dostępny): ${description ? description.substring(0, 3000) : 'Brak'}
    
    WAŻNE ZASADY (BEZWZGLĘDNE):
    1. NIE ZMYŚLAJ! Nie dodawaj funkcji, parametrów ani akcesoriów, których nie ma w powyższych danych.
    2. Jeśli brakuje informacji, nie pisz o nich.
    3. Opieraj się WYŁĄCZNIE na dostarczonych danych (katalog Allegro + Web Search AI).
    `;

    // 3. Generowanie w zależności od formatu szablonu
    let finalHtml = '';
    let usedProvider = aiProvider;
    let fallbackUsed = false;

    if (isStructured) {
        // --- NOWY SYSTEM (SEKCJE) ---
        console.log("Using Structured Template Generation");
        
        // Zbieramy wszystkie prompty tekstowe z szablonu, aby wysłać je w jednym zapytaniu (lepsza spójność)
        // lub budujemy zapytanie o JSON.
        // Najlepiej poprosić AI o wygenerowanie treści dla oznaczonych sekcji.
        
        let promptRequest = `Jesteś profesjonalnym copywriterem. Twoim zadaniem jest napisanie treści dla poszczególnych sekcji opisu produktu na Allegro.
        
        ${contextData}
        
        WYTYCZNE STYLU: ${styleInstructions}
        
        INSTRUKCJE KRYTYCZNE:
        - Korzystaj TYLKO z dostarczonych danych (DANE PRODUKTU).
        - Absolutny zakaz konfabulacji (nie zmyślaj cech produktu).
        - Jeśli dane nie zawierają jakiejś informacji, pomiń ją zamiast zgadywać.
        - ODPOWIEDŹ MUSI BYĆ POPRAWNYM KODEM JSON (bez znaczników markdown typu \`\`\`json).
        
        Twoim zadaniem jest wygenerowanie treści HTML dla poniższych sekcji.
        Zwróć odpowiedź WYŁĄCZNIE jako obiekt JSON w formacie:
        {
           "section_0": "Treść HTML sekcji 0...",
           "section_2": "Treść HTML sekcji 2...",
           ...
        }
        (Klucze odpowiadają indeksom sekcji z listy poniżej).
        
        LISTA SEKCJI DO NAPISANIA:
        `;

        const textIndices = [];
        templateStructure.forEach((section, index) => {
            // Check Toggles (Optional Sections)
            if (section.is_optional && productData.aiOptions && productData.aiOptions.includedSections) {
                // If explicitly disabled (false) or not present (undefined usually means disabled if we assume whitelist, but let's check logic)
                // In frontend we init with true.
                if (productData.aiOptions.includedSections[index] === false) {
                     return; // Skip this section
                }
            }

            if (section.type === 'text') {
                // Podmiana zmiennych w treści prompta
                let contentPrompt = section.content;
                
                // Generic Custom Inputs Replacement
                if (productData.aiOptions && productData.aiOptions.customInputs) {
                    for (const [key, val] of Object.entries(productData.aiOptions.customInputs)) {
                        const regex = new RegExp(`{${key}}`, 'g');
                        contentPrompt = contentPrompt.replace(regex, val || '');
                    }
                }

                contentPrompt = contentPrompt.replace(/{productName}/g, productName || '');
                contentPrompt = contentPrompt.replace(/{manufacturer}/g, manufacturer || '');
                contentPrompt = contentPrompt.replace(/{eanCode}/g, eanCode || '');
                contentPrompt = contentPrompt.replace(/{parameters}/g, paramStr || '');
                contentPrompt = contentPrompt.replace(/{description}/g, catalogDescription || '');

                promptRequest += `\nSEKCJA INDEKS [${index}]: ${contentPrompt}\n`;
                textIndices.push(index);
            }
        });

        // Wywołanie AI
        const aiResult = await generateText(promptRequest, aiProvider, OPENAI_API_KEY, GEMINI_API_KEY);
        usedProvider = aiResult.provider;
        fallbackUsed = aiResult.fallbackAttempted;

        if (!aiResult.description || aiResult.description.trim().length === 0) {
            console.error(`[AI Gen] Empty description returned for product: ${productName}`);
            throw new Error('AI returned empty description');
        }

        // Parsowanie odpowiedzi
        let generatedSections = {};
        try {
            // Usuwanie ewentualnych znaczników markdown
            let jsonStr = aiResult.description
                .replace(/^```json\s*/, '')
                .replace(/^```\s*/, '')
                .replace(/\s*```$/, '')
                .trim();
            
            // Próba znalezienia obiektu JSON jeśli jest otoczony tekstem
            const start = jsonStr.indexOf('{');
            const end = jsonStr.lastIndexOf('}');
            if (start !== -1 && end !== -1) {
                jsonStr = jsonStr.substring(start, end + 1);
            }
            
            generatedSections = JSON.parse(jsonStr);
            console.log(`[AI Gen] Successfully parsed ${Object.keys(generatedSections).length} sections from JSON`);
        } catch (e) {
            console.warn('[AI Gen] Error parsing structured AI response for', productName, ':', e.message);
            console.log(`[AI Gen] Raw response (first 500 chars):`, aiResult.description.substring(0, 500));
            // Fallback: jeśli AI zwróciło plain text zamiast JSON, spróbujmy to jakoś uratować lub zwróćmy błąd
            // W tym przypadku po prostu wstawimy cały tekst do pierwszej sekcji tekstowej
            if (textIndices.length > 0) {
                generatedSections[`section_${textIndices[0]}`] = aiResult.description;
                console.log(`[AI Gen] Using fallback: inserted full text into section ${textIndices[0]}`);
            } else {
                console.error(`[AI Gen] No text sections available for fallback!`);
                throw new Error('Failed to parse AI response and no fallback sections available');
            }
        }

        // Składanie finalnego HTML
        templateStructure.forEach((section, index) => {
             // Check Toggles (must match logic above)
             if (section.is_optional && productData.aiOptions && productData.aiOptions.includedSections) {
                if (productData.aiOptions.includedSections[index] === false) {
                     return; // Skip
                }
            }

            if (section.type === 'text') {
                const content = generatedSections[`section_${index}`] || generatedSections[`${index}`];
                if (content && content.trim().length > 0) {
                    finalHtml += content + '\n';
                } else {
                    console.warn(`[AI Gen] Section ${index} is empty or missing for product: ${productName}`);
                }
            } else if (section.type === 'image') {
                finalHtml += '[ZDJĘCIE]\n';
            }
        });

        // Validate final HTML is not empty
        if (!finalHtml || finalHtml.trim().length === 0) {
            console.error(`[AI Gen] Final HTML is empty for product: ${productName}`);
            throw new Error('Generated description is empty after processing all sections');
        }

    } else {
        // --- STARY SYSTEM (STRING) ---
        // Ten blok wykona się tylko jeśli użytkownik wybrał konkretny szablon (templateId), który jest starym stringiem
        // Jeśli nie wybrano szablonu, wpadnie w FALLBACK_TEMPLATE_STRUCTURE powyżej
        
        console.log("Using Legacy String Template Generation");
        let prompt = rawTemplate || `Stwórz opis produktu Allegro HTML. Podziel na 5 sekcji znacznikiem [ZDJĘCIE].`;
        
        // Podmiana zmiennych
        prompt = prompt.replace(/{productName}/g, productName || '');
        prompt = prompt.replace(/{manufacturer}/g, manufacturer || '');
        prompt = prompt.replace(/{eanCode}/g, eanCode || '');
        prompt = prompt.replace(/{parameters}/g, paramStr || '');
        prompt = prompt.replace(/{description}/g, catalogDescription || '');
        
        prompt += `\n\n${contextData}\nStyl: ${styleInstructions}\n\nWAŻNE: NIE ZMYŚLAJ. Opieraj się TYLKO na dostarczonych danych.`;

        const result = await generateText(prompt, aiProvider, OPENAI_API_KEY, GEMINI_API_KEY);
        if (!result.description || result.description.trim().length === 0) {
            console.error(`[AI Gen] Empty description returned (legacy mode) for product: ${productName}`);
            throw new Error('AI returned empty description');
        }
        finalHtml = result.description;
        usedProvider = result.provider;
        fallbackUsed = result.fallbackAttempted;
    }
    
    // Final validation
    if (!finalHtml || finalHtml.trim().length === 0) {
        console.error(`[AI Gen] Final description is empty for product: ${productName}`);
        throw new Error('Generated description is empty');
    }
    
    return {
      description: finalHtml,
      success: true,
      provider: usedProvider,
      fallbackUsed: fallbackUsed
    };
}

/**
 * CORE VISION GENERATION LOGIC
 * Shared between route (immediate) and service (background job)
 */
async function generateVisionDescriptionCore(productData, templateContent, imageParts, styleInstructions) {
    const { productName, dimensionsStr, price, paramStr, customInstructions } = productData;

    // 1. Parse Template
    let templateStructure = [];
    let isStructured = false;

    if (templateContent) {
        try {
            const parsed = JSON.parse(templateContent);
            if (Array.isArray(parsed)) {
                templateStructure = parsed;
                isStructured = true;
            }
        } catch (e) {
            isStructured = false;
        }
    }

    if (!isStructured) {
        // Fallback to unstructured prompt logic
        let promptText = `Jesteś ekspertem e-commerce. Twoim absolutnym priorytetem jest opisanie TEGO KONKRETNEGO PRZEDMIOTU ze zdjęcia.
Nie pisz ogólnego tekstu marketingowego o "biurku". Opisz to konkretne biurko, które widzisz.

WAŻNE: Jeśli korzystasz z wyszukiwarki Google do identyfikacji modelu, PAMIĘTAJ: zdjęcia w internecie mogą przedstawiać ten model w innym kolorze. Ty opisujesz egzemplarz ze ZDJĘCIA UŻYTKOWNIKA (załączonego do tego prompta).
Kolor i stan faktyczny bierz TYLKO ze zdjęcia użytkownika.

${productName ? `Nazwa produktu podana przez użytkownika: "${productName}" (UWAGA: Jeśli zdjęcie przedstawia coś innego lub bardziej szczegółowego, np. inny kolor, kieruj się ZDJĘCIEM, a nie nazwą)` : 'Nazwa produktu: określ na podstawie zdjęcia.'}
${dimensionsStr || ''}
${price ? `Cena: ${price} PLN` : ''}
${paramStr ? `Parametry: ${paramStr}` : ''}

Zadania PRIORYTETOWE (MUSISZ TO ZROBIĆ):
1. PRZEANALIZUJ KOLOR I MATERIAŁ: Jaki to kolor? (np. biały, dąb, czarny). Jaki materiał? (drewno, płyta, metal). Opisz to w tekście.
2. PRZEANALIZUJ STAN I KONSTRUKCJĘ: Czy ma szuflady? Czy jest proste, czy narożne? Czy ma widoczne uszkodzenia lub cechy charakterystyczne?
3. STWÓRZ OPIS TEGO KONKRETNEGO EGZEMPLARZA: Nie generuj "lorem ipsum" o zaletach biurek ogólnie. Opisz to, co widzi klient.

Zadania ogólne:
4. Określ markę/model (jeśli rozpoznajesz lub znajdziesz w sieci).
5. Stwórz profesjonalny opis w formacie HTML.
`;

        if (templateContent) {
             promptText += `\nUżyj następującego szablonu:\n${templateContent}\n\nINSTRUKCJA KRYTYCZNA: Wypełnij ten szablon informacjami o KOLORZE, MATERIALE i KONSTRUKCJI widocznej na zdjęciach.`;
        } else {
             promptText += '\nStwórz opis w formacie HTML z sekcjami: Opis ogólny, Cechy produktu, Specyfikacja techniczna (jeśli dotyczy), Zastosowanie. W treści MUSISZ zawrzeć opis koloru i materiału widocznego na zdjęciu.';
        }

        if (customInstructions) {
            promptText += `\n\nDODATKOWE INSTRUKCJE OD UŻYTKOWNIKA: ${customInstructions}`;
        }

        promptText += '\nOdpowiedź powinna być w formacie HTML gotowym do użycia w ofercie Allegro.';

        // Call Gemini
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        
        const response = await callGeminiWithRetry(ai, {
            model: "gemini-3-pro-preview",
            contents: [{ role: 'user', parts: [{ text: promptText }, ...imageParts] }],
            config: {
                tools: [{ googleSearch: {} }],
                maxOutputTokens: 2048,
                thinkingConfig: { thinkingLevel: "high" }
            }
        }, { label: 'Vision AI (unstructured)' });

        let description = '';
        if (response.candidates && response.candidates.length > 0) {
            description = response.text ? response.text.trim() : '';
            if (!description && response.candidates[0]?.content?.parts?.[0]?.text) {
                description = response.candidates[0].content.parts[0].text.trim();
            }
        }
        return description;
    }

    // --- STRUCTURED GENERATION (JSON) ---
    console.log("[Vision AI] Using Structured Template Generation");
    
    let promptRequest = `Jesteś profesjonalnym copywriterem i ekspertem wizualnym. Twoim zadaniem jest stworzenie opisu produktu na podstawie jego ZDJĘĆ oraz danych.
    
    KONTEKST:
    ${productName ? `Nazwa: "${productName}"` : ''}
    ${dimensionsStr || ''}
    ${price ? `Cena: ${price} PLN` : ''}
    ${paramStr ? `Parametry: ${paramStr}` : ''}
    
    WYTYCZNE STYLU: ${styleInstructions || 'Profesjonalny, rzetelny'}
    
    INSTRUKCJE KRYTYCZNE (VISION):
    1. ANALIZA OBRAZU: Opisuj to, co FAKTYCZNIE widzisz na zdjęciach (kolor, materiał, faktura, kształt, uszkodzenia, porty, złącza).
    2. Jeśli nazwa produktu sugeruje inny kolor niż na zdjęciu -> OPISUJ TO CO NA ZDJĘCIU.
    3. Nie zmyślaj cech, których nie widać (chyba że wynikają z wiedzy o modelu zidentyfikowanym przez Google Search).
    4. ODPOWIEDŹ MUSI BYĆ POPRAWNYM KODEM JSON.
    
    Twoim zadaniem jest wygenerowanie treści HTML dla poniższych sekcji.
    Zwróć odpowiedź WYŁĄCZNIE jako obiekt JSON w formacie:
    {
       "section_0": "Treść HTML sekcji 0...",
       "section_2": "Treść HTML sekcji 2...",
       ...
    }
    
    LISTA SEKCJI DO NAPISANIA:
    `;

    const textIndices = [];
    templateStructure.forEach((section, index) => {
        // Skip optional checks here, assume caller handled or we handle all
        if (section.type === 'text') {
            let contentPrompt = section.content;
            
            // Basic replacements
            contentPrompt = contentPrompt.replace(/{productName}/g, productName || 'produkt');
            contentPrompt = contentPrompt.replace(/{manufacturer}/g, 'producent');
            contentPrompt = contentPrompt.replace(/{eanCode}/g, 'kod EAN');
            contentPrompt = contentPrompt.replace(/{parameters}/g, paramStr || 'parametry');
            contentPrompt = contentPrompt.replace(/{description}/g, 'opis');

            promptRequest += `\nSEKCJA INDEKS [${index}] (${section.name || 'Tekst'}): ${contentPrompt}\n(Opisz cechy WIZUALNE widoczne na zdjęciach).\n`;
            textIndices.push(index);
        }
    });

    if (customInstructions) {
        promptRequest += `\nDODATKOWE INSTRUKCJE: ${customInstructions}\n`;
    }

    // Call Gemini with JSON prompt
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    
    const response = await callGeminiWithRetry(ai, {
        model: "gemini-3-pro-preview",
        contents: [{ role: 'user', parts: [{ text: promptRequest }, ...imageParts] }],
        config: {
            tools: [{ googleSearch: {} }],
            maxOutputTokens: 4000,
            thinkingConfig: { thinkingLevel: "high" }
        }
    }, { label: 'Vision AI (structured)' });

    let jsonStr = '';
    if (response.candidates && response.candidates.length > 0) {
        jsonStr = response.text ? response.text.trim() : '';
        if (!jsonStr && response.candidates[0]?.content?.parts?.[0]?.text) {
            jsonStr = response.candidates[0].content.parts[0].text.trim();
        }
    }

    if (!jsonStr) throw new Error("Empty response from Gemini Vision");

    // Parse JSON
    let generatedSections = {};
    try {
        let cleanJson = jsonStr
            .replace(/^```json\s*/, '')
            .replace(/^```\s*/, '')
            .replace(/\s*```$/, '')
            .trim();
        
        const start = cleanJson.indexOf('{');
        const end = cleanJson.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
            cleanJson = cleanJson.substring(start, end + 1);
        }
        
        generatedSections = JSON.parse(cleanJson);
    } catch (e) {
        console.warn("[Vision AI] Failed to parse JSON response, falling back to raw text:", e.message);
        // Fallback: put everything in first text section
        if (textIndices.length > 0) {
            generatedSections[`section_${textIndices[0]}`] = jsonStr;
        } else {
            return jsonStr; // Return raw text if no sections
        }
    }

    // Assemble HTML
    let finalHtml = '';
    templateStructure.forEach((section, index) => {
        if (section.type === 'text') {
            const content = generatedSections[`section_${index}`] || generatedSections[`${index}`];
            if (content && content.trim().length > 0) {
                finalHtml += content + '\n';
            }
        } else if (section.type === 'image') {
            finalHtml += '[ZDJĘCIE]\n';
        }
    });

    return finalHtml;
}

// Generate description from product images using Gemini Vision AI
// Used by background jobs for image-based product creation
async function generateDescriptionFromImages({ productId, productName, dimensions, price, templateId, customInstructions }, userId) {
    if (!GEMINI_API_KEY) {
        throw new Error('Gemini API key not configured');
    }

    console.log(`[Vision AI] Generating description from images for product ${productId} (user ${userId})`);

    // 1. Read images from product
    const [productImages] = await db.execute(
        'SELECT pi.* FROM product_images pi JOIN products p ON pi.product_id = p.id WHERE pi.product_id = ? AND p.user_id = ?',
        [productId, userId]
    );

    if (productImages.length === 0) {
        throw new Error('Brak zdjęć produktu do analizy');
    }

    // 2. Read image files from disk and convert to base64
    const imageParts = [];
    for (const img of productImages) {
        const imagePath = img.image_url.startsWith('/') ? img.image_url.substring(1) : img.image_url;
        const fullPath = path.isAbsolute(imagePath) ? imagePath : path.join(process.cwd(), imagePath);

        if (fs.existsSync(fullPath)) {
            try {
                const imageBuffer = fs.readFileSync(fullPath);
                const base64Image = imageBuffer.toString('base64');
                imageParts.push({
                    inlineData: {
                        mimeType: img.mime_type || 'image/jpeg',
                        data: base64Image
                    }
                });
            } catch (readErr) {
                console.error(`[Vision AI] Error reading image file ${fullPath}:`, readErr.message);
            }
        } else {
            console.warn(`[Vision AI] Image file not found: ${fullPath}`);
        }
    }

    if (imageParts.length === 0) {
        throw new Error('Nie udało się odczytać żadnego zdjęcia produktu z dysku');
    }

    console.log(`[Vision AI] Loaded ${imageParts.length} images for analysis`);

    // 3. Get template if provided
    let templateContent = null;
    if (templateId) {
        const [templates] = await db.execute(
            'SELECT content FROM ai_templates WHERE id = ? AND (user_id = ? OR is_global = TRUE)',
            [templateId, userId]
        );
        if (templates.length > 0) {
            templateContent = templates[0].content;
        }
    }

    // If no template specified, try default
    if (!templateContent) {
        const [sysTemplates] = await db.execute(
            'SELECT content FROM ai_templates WHERE name LIKE ? AND is_global = TRUE LIMIT 1',
            ['%Domyślny szablon Allegro (Sekcyjny)%']
        );
        if (sysTemplates.length > 0) {
            templateContent = sysTemplates[0].content;
        } else {
            const [oldTemplates] = await db.execute(
                'SELECT content FROM ai_templates WHERE name LIKE ? AND is_global = TRUE LIMIT 1',
                ['%Domyślny szablon Allegro%']
            );
            if (oldTemplates.length > 0) templateContent = oldTemplates[0].content;
        }
    }

    // 4. Parse dimensions
    let parsedDimensions = null;
    if (dimensions) {
        try {
            parsedDimensions = typeof dimensions === 'string' ? JSON.parse(dimensions) : dimensions;
        } catch (e) { /* ignore */ }
    }

    let dimensionsStr = '';
    if (parsedDimensions) {
        const dimParts = [];
        if (parsedDimensions.width) dimParts.push(`Szerokość: ${parsedDimensions.width} cm`);
        if (parsedDimensions.height) dimParts.push(`Wysokość: ${parsedDimensions.height} cm`);
        if (parsedDimensions.depth) dimParts.push(`Głębokość: ${parsedDimensions.depth} cm`);
        if (parsedDimensions.weight) dimParts.push(`Waga: ${parsedDimensions.weight} kg`);
        if (dimParts.length > 0) {
            dimensionsStr = `Wymiary: ${dimParts.join(', ')}`;
        }
    }

    // 5. Generate description using Core Vision Logic
    const description = await generateVisionDescriptionCore(
        { productName, dimensionsStr, price, customInstructions },
        templateContent,
        imageParts
    );

    if (!description || description.trim().length === 0) {
        throw new Error('Gemini Vision returned empty description');
    }

    console.log(`[Vision AI] Successfully generated description (${description.length} chars) for product ${productId}`);

    return {
        description,
        success: true,
        provider: 'gemini-vision'
    };
}

// Bulk generation now processes offers INDIVIDUALLY to ensure quality and uniqueness
// 1 offer = 1 independent AI request
async function generateBulkDescriptions(productsList, userId, templateId = null) {
    console.log(`[Bulk Gen] Processing ${productsList.length} offers individually (1 request per offer)...`);

    // Map each product to a generateDescription call
    const promises = productsList.map(async (product) => {
        try {
            // Reuse the single description logic which handles templates and sections correctly
            const result = await generateDescription(product, userId, templateId);
            return {
                id: product.id,
                success: result.success,
                description: result.description,
                provider: result.provider
            };
        } catch (error) {
            console.error(`[Bulk Gen] Error for offer ${product.id}:`, error.message);
            return {
                id: product.id,
                success: false,
                error: error.message
            };
        }
    });

    // Execute in parallel (concurrency controlled by batch size in allegroBulk.js)
    const results = await Promise.all(promises);
    
    const descriptionsMap = {};
    let lastProvider = 'unknown';

    results.forEach(res => {
        if (res.success) {
            descriptionsMap[res.id] = res.description;
            if (res.provider) lastProvider = res.provider;
        }
    });

    return { 
        success: true, 
        descriptionsMap, 
        provider: lastProvider 
    };
}

module.exports = {
  generateText,
  generateDescription,
  generateDescriptionFromImages,
  generateBulkDescriptions,
  generateVisionDescriptionCore
};
