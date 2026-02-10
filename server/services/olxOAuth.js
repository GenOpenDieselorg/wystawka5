const axios = require('axios');
const crypto = require('crypto');

const OLX_AUTH_URL = process.env.OLX_AUTH_URL || 'https://www.olx.pl/oauth/authorize';
const OLX_TOKEN_URL = process.env.OLX_TOKEN_URL || 'https://www.olx.pl/api/open/oauth/token';
const OLX_API_URL = process.env.OLX_API_URL || 'https://www.olx.pl/api/partner';
const OLX_CLIENT_ID = process.env.OLX_CLIENT_ID;
const OLX_CLIENT_SECRET = process.env.OLX_CLIENT_SECRET;
const BACKEND_URL = process.env.BACKEND_URL || process.env.API_URL || 'https://api.wystawoferte.pl';
const OLX_REDIRECT_URI = process.env.OLX_REDIRECT_URI || `${BACKEND_URL}/api/marketplace/olx/callback`;

/**
 * Generate authorization URL for OLX OAuth
 * @param {string} state - State parameter for CSRF protection
 * @param {string[]} scopes - Optional array of scopes (default: ['v2', 'read', 'write'])
 * @returns {string} Authorization URL
 */
function generateAuthorizationUrl(state = null, scopes = null) {
  if (!OLX_CLIENT_ID) {
    throw new Error('OLX_CLIENT_ID is not configured');
  }

  const defaultScopes = ['v2', 'read', 'write'];
  const scopeString = (scopes && Array.isArray(scopes) && scopes.length > 0) 
    ? scopes.join(' ') 
    : defaultScopes.join(' ');

  const params = new URLSearchParams({
    client_id: OLX_CLIENT_ID,
    response_type: 'code',
    scope: scopeString,
    redirect_uri: OLX_REDIRECT_URI
  });

  // Add optional state parameter
  if (state) {
    params.append('state', state);
  }

  const authUrl = `${OLX_AUTH_URL}/?${params.toString()}`;

  return authUrl;
}

/**
 * Exchange authorization code for access token
 * @param {string} code - Authorization code from callback
 * @param {string} redirectUri - Redirect URI used in authorization (optional, uses default if not provided)
 * @returns {Promise<Object>} Token response with access_token, refresh_token, etc.
 */
async function exchangeCodeForToken(code, redirectUri = null) {
  if (!OLX_CLIENT_ID || !OLX_CLIENT_SECRET) {
    throw new Error('OLX_CLIENT_ID and OLX_CLIENT_SECRET must be configured');
  }

  const tokenUrl = OLX_TOKEN_URL;
  
  // Prepare request body
  const body = {
    grant_type: 'authorization_code',
    client_id: OLX_CLIENT_ID,
    client_secret: OLX_CLIENT_SECRET,
    code: code,
    scope: 'v2 read write',
    redirect_uri: redirectUri || OLX_REDIRECT_URI
  };

  // Prepare headers
  const headers = {
    'Content-Type': 'application/json'
  };

  try {
    const response = await axios.post(tokenUrl, body, { headers });
    
    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      token_type: response.data.token_type || 'bearer',
      expires_in: response.data.expires_in,
      scope: response.data.scope
    };
  } catch (error) {
    console.error('OLX token exchange error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error_description || error.response?.data?.error || 'Failed to exchange code for token');
  }
}

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object>} New token response
 */
async function refreshAccessToken(refreshToken) {
  if (!OLX_CLIENT_ID || !OLX_CLIENT_SECRET) {
    throw new Error('OLX_CLIENT_ID and OLX_CLIENT_SECRET must be configured');
  }

  const tokenUrl = OLX_TOKEN_URL;
  
  const body = {
    grant_type: 'refresh_token',
    client_id: OLX_CLIENT_ID,
    client_secret: OLX_CLIENT_SECRET,
    refresh_token: refreshToken
  };

  const headers = {
    'Content-Type': 'application/json'
  };

  try {
    const response = await axios.post(tokenUrl, body, { headers });
    
    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      token_type: response.data.token_type || 'bearer',
      expires_in: response.data.expires_in,
      scope: response.data.scope
    };
  } catch (error) {
    console.error('OLX token refresh error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error_description || error.response?.data?.error || 'Failed to refresh token');
  }
}

/**
 * Get user info from OLX API
 * @param {string} accessToken - Access token
 * @returns {Promise<Object>} User information
 */
async function getUserInfo(accessToken) {
  // Try multiple endpoints - OLX API might use different endpoints
  const endpoints = [
    `${OLX_API_URL}/users/me`,  // Partner API
    'https://www.olx.pl/api/open/users/me'  // Open API (alternative)
  ];
  
  let lastError = null;
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(endpoint, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Version': '2.0',
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      lastError = error;
      // Continue to next endpoint
      continue;
    }
  }
  
  // If all endpoints failed, log detailed error and throw
  console.error('OLX get user info error (all endpoints failed):', {
    status: lastError?.response?.status,
    statusText: lastError?.response?.statusText,
    data: lastError?.response?.data,
    message: lastError?.message,
    triedEndpoints: endpoints
  });
  
  // Try to extract more detailed error message
  const errorDetail = lastError?.response?.data?.error?.detail 
    || lastError?.response?.data?.error_description 
    || lastError?.response?.data?.error 
    || lastError?.response?.data?.message
    || lastError?.message;
  
  throw new Error(`Failed to get user info: ${errorDetail}`);
}

/**
 * Get client credentials token (for accessing public endpoints like categories, cities)
 * @returns {Promise<Object>} Token response
 */
async function getClientCredentialsToken() {
  if (!OLX_CLIENT_ID || !OLX_CLIENT_SECRET) {
    throw new Error('OLX_CLIENT_ID and OLX_CLIENT_SECRET must be configured');
  }

  const tokenUrl = OLX_TOKEN_URL;
  
  const body = {
    grant_type: 'client_credentials',
    client_id: OLX_CLIENT_ID,
    client_secret: OLX_CLIENT_SECRET,
    scope: 'v2 read write'
  };

  const headers = {
    'Content-Type': 'application/json'
  };

  try {
    const response = await axios.post(tokenUrl, body, { headers });
    
    return {
      access_token: response.data.access_token,
      token_type: response.data.token_type || 'bearer',
      expires_in: response.data.expires_in,
      scope: response.data.scope
    };
  } catch (error) {
    console.error('OLX client credentials token error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error_description || error.response?.data?.error || 'Failed to get client credentials token');
  }
}

module.exports = {
  generateAuthorizationUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  getUserInfo,
  getClientCredentialsToken
};

