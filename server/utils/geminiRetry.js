/**
 * Helper utility to call Gemini API with automatic retry on overload (503) and rate limit (429) errors.
 * Used across all services that interact with Gemini.
 */

async function callGeminiWithRetry(ai, params, { maxRetries = 3, delayMs = 5000, label = 'Gemini' } = {}) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[${label}] Retry attempt ${attempt + 1}/${maxRetries + 1} after ${delayMs / 1000}s delay...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      
      return await ai.models.generateContent(params);
      
    } catch (error) {
      lastError = error;
      
      const isOverloaded = 
        error.status === 503 || 
        (error.error && error.error.code === 503) ||
        error.message?.includes('overloaded') ||
        error.message?.includes('RESOURCE_EXHAUSTED') ||
        error.message?.includes('503');

      const isRateLimited =
        error.status === 429 ||
        (error.error && error.error.code === 429) ||
        error.message?.includes('429') ||
        error.message?.includes('Too Many Requests') ||
        error.message?.includes('RATE_LIMIT_EXCEEDED') ||
        error.message?.includes('rate limit') ||
        error.message?.includes('quota');
      
      if (isOverloaded && attempt < maxRetries) {
        console.log(`[${label}] Model overloaded (503). Will retry in ${delayMs / 1000}s...`);
        continue;
      }

      if (isRateLimited && attempt < maxRetries) {
        console.log(`[${label}] Rate limited (429). Will retry in ${delayMs / 1000}s...`);
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
}

module.exports = { callGeminiWithRetry };

