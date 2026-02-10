const axios = require('axios');
const crypto = require('crypto');

const ALLEGRO_AUTH_URL = process.env.ALLEGRO_AUTH_URL || 'https://allegro.pl/auth/oauth';
const ALLEGRO_API_URL = process.env.ALLEGRO_API_URL || 'https://api.allegro.pl';
const ALLEGRO_CLIENT_ID = process.env.ALLEGRO_CLIENT_ID;
const ALLEGRO_CLIENT_SECRET = process.env.ALLEGRO_CLIENT_SECRET;
// Redirect URI should point to backend endpoint, not frontend
const BACKEND_URL = process.env.BACKEND_URL || process.env.API_URL || 'https://api.wystawoferte.pl';
const ALLEGRO_REDIRECT_URI = process.env.ALLEGRO_REDIRECT_URI || `${BACKEND_URL}/api/marketplace/allegro/callback`;

/**
 * Generate PKCE code verifier and challenge
 * @returns {Object} {codeVerifier, codeChallenge}
 */
function generatePKCE() {
  // Generate random code verifier (43-128 characters)
  const codeVerifier = crypto.randomBytes(64).toString('base64url');
  
  // Generate code challenge (SHA256 hash of verifier, base64url encoded)
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  
  return {
    codeVerifier,
    codeChallenge
  };
}

/**
 * Generate authorization URL for Allegro OAuth
 * @param {string} state - Optional state parameter for CSRF protection
 * @param {string[]} scopes - Optional array of scopes
 * @param {boolean} usePKCE - Whether to use PKCE (default: true)
 * @returns {Object} {authUrl, codeVerifier} - Authorization URL and code verifier (if PKCE)
 */
function generateAuthorizationUrl(state = null, scopes = null, usePKCE = true) {
  if (!ALLEGRO_CLIENT_ID) {
    throw new Error('ALLEGRO_CLIENT_ID is not configured');
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: ALLEGRO_CLIENT_ID,
    redirect_uri: ALLEGRO_REDIRECT_URI
  });

  // Add PKCE if enabled
  let codeVerifier = null;
  if (usePKCE) {
    const pkce = generatePKCE();
    codeVerifier = pkce.codeVerifier;
    params.append('code_challenge_method', 'S256');
    params.append('code_challenge', pkce.codeChallenge);
  }

  // Add optional state parameter
  if (state) {
    params.append('state', state);
  }

  // Add optional scopes - if not provided, Allegro will use all scopes assigned to the application
  // We do not send 'allegro_api' as it is not a valid scope for authorization request
  if (scopes && Array.isArray(scopes) && scopes.length > 0) {
    params.append('scope', scopes.join(' '));
  }

  const authUrl = `${ALLEGRO_AUTH_URL}/authorize?${params.toString()}`;

  return {
    authUrl,
    codeVerifier
  };
}

/**
 * Exchange authorization code for access token
 * @param {string} code - Authorization code from callback
 * @param {string} codeVerifier - PKCE code verifier (if PKCE was used)
 * @returns {Promise<Object>} Token response with access_token, refresh_token, etc.
 */
async function exchangeCodeForToken(code, codeVerifier = null) {
  if (!ALLEGRO_CLIENT_ID || !ALLEGRO_CLIENT_SECRET) {
    throw new Error('ALLEGRO_CLIENT_ID and ALLEGRO_CLIENT_SECRET must be configured');
  }

  const tokenUrl = `${ALLEGRO_AUTH_URL}/token`;
  
  // Prepare request body
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: ALLEGRO_REDIRECT_URI
  });

  // Prepare headers
  let headers = {
    'Content-Type': 'application/x-www-form-urlencoded'
  };

  // If PKCE is used, send client_id and code_verifier instead of Basic auth
  if (codeVerifier) {
    body.append('client_id', ALLEGRO_CLIENT_ID);
    body.append('code_verifier', codeVerifier);
  } else {
    // Use Basic authentication
    const credentials = Buffer.from(`${ALLEGRO_CLIENT_ID}:${ALLEGRO_CLIENT_SECRET}`).toString('base64');
    headers['Authorization'] = `Basic ${credentials}`;
  }

  try {
    const response = await axios.post(tokenUrl, body.toString(), { headers });
    
    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      token_type: response.data.token_type || 'bearer',
      expires_in: response.data.expires_in,
      scope: response.data.scope,
      jti: response.data.jti
    };
  } catch (error) {
    console.error('Allegro token exchange error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error_description || error.response?.data?.error || 'Failed to exchange code for token');
  }
}

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object>} New token response
 */
async function refreshAccessToken(refreshToken) {
  if (!ALLEGRO_CLIENT_ID || !ALLEGRO_CLIENT_SECRET) {
    throw new Error('ALLEGRO_CLIENT_ID and ALLEGRO_CLIENT_SECRET must be configured');
  }

  const tokenUrl = `${ALLEGRO_AUTH_URL}/token`;
  
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  });

  const credentials = Buffer.from(`${ALLEGRO_CLIENT_ID}:${ALLEGRO_CLIENT_SECRET}`).toString('base64');
  
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': `Basic ${credentials}`
  };

  try {
    const response = await axios.post(tokenUrl, body.toString(), { headers });
    
    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      token_type: response.data.token_type || 'bearer',
      expires_in: response.data.expires_in,
      scope: response.data.scope,
      jti: response.data.jti
    };
  } catch (error) {
    console.error('Allegro token refresh error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error_description || error.response?.data?.error || 'Failed to refresh token');
  }
}

/**
 * Get user info from Allegro API
 * @param {string} accessToken - Access token
 * @returns {Promise<Object>} User information
 */
async function getUserInfo(accessToken) {
  try {
    const response = await axios.get(`${ALLEGRO_API_URL}/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.allegro.public.v1+json'
      }
    });
    return response.data;
  } catch (error) {
    // Log detailed error for debugging
    console.error('Allegro get user info error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      url: `${ALLEGRO_API_URL}/me`
    });
    
    // Try to extract more detailed error message
    const errorDetail = error.response?.data?.error_description 
      || error.response?.data?.error 
      || error.response?.data?.message
      || error.message;
    
    throw new Error(`Failed to get user info: ${errorDetail}`);
  }
}

module.exports = {
  generateAuthorizationUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  getUserInfo,
  generatePKCE
};

