const axios = require('axios');

/**
 * Verifies Cloudflare Turnstile token
 * @param {string} token - The token from the client
 * @param {string} ip - The client's IP address (optional)
 * @returns {Promise<boolean>} - True if valid, false otherwise
 */
const verifyTurnstileToken = async (token, ip) => {
  const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
  
  // If no secret key is configured, we can't verify. 
  // In production this should probably throw an error, but for now we'll log warning and allow.
  if (!secretKey) {
    console.warn('CLOUDFLARE_TURNSTILE_SECRET_KEY is not defined. Skipping Turnstile verification.');
    return true;
  }

  if (!token) {
    return false;
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (ip) {
      formData.append('remoteip', ip);
    }

    const result = await axios.post('https://challenges.cloudflare.com/turnstile/v0/siteverify', formData);
    const data = result.data;

    if (!data.success) {
      console.warn('Turnstile verification failed:', data['error-codes']);
    }

    return data.success;
  } catch (error) {
    console.error('Turnstile verification error:', error);
    // If external service fails, we might want to fail open or closed. 
    // Usually closed for security, but open for UX if service is down.
    // Let's return false to be safe against bots.
    return false;
  }
};

module.exports = { verifyTurnstileToken };

