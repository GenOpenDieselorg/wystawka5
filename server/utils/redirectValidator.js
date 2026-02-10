const url = require('url');

/**
 * SECURITY: Redirect URL validator to prevent open redirect vulnerabilities
 * 
 * Open redirect vulnerabilities allow attackers to redirect users to malicious sites.
 * This module validates redirect URLs against a whitelist of allowed domains.
 */

// SECURITY: Whitelist of allowed redirect domains
const ALLOWED_REDIRECT_DOMAINS = [
  'wystawoferte.pl',
  'www.wystawoferte.pl',
  'localhost',
  '127.0.0.1',
  // Add other trusted domains here
];

// SECURITY: Allowed redirect paths (relative paths are always allowed)
const ALLOWED_REDIRECT_PATHS = [
  '/integrations',
  '/login',
  '/register',
  '/dashboard',
  '/products',
  '/settings',
  '/',
  // Add other allowed paths here
];

/**
 * SECURITY: Validate redirect URL to prevent open redirect attacks
 * 
 * @param {string} redirectUrl - URL to validate
 * @param {string[]} additionalAllowedDomains - Additional allowed domains (optional)
 * @returns {{valid: boolean, error?: string, sanitizedUrl?: string}} - Validation result
 */
function validateRedirectUrl(redirectUrl, additionalAllowedDomains = []) {
  if (!redirectUrl || typeof redirectUrl !== 'string') {
    return { valid: false, error: 'Redirect URL is required' };
  }

  try {
    // Parse the URL
    const parsed = url.parse(redirectUrl, true);
    
    // SECURITY: Relative URLs are always safe (no protocol/host)
    if (!parsed.protocol && !parsed.host) {
      // It's a relative path - validate it's in allowed paths
      const path = parsed.pathname || '/';
      if (ALLOWED_REDIRECT_PATHS.some(allowed => path.startsWith(allowed))) {
        return { valid: true, sanitizedUrl: redirectUrl };
      }
      // If not in whitelist, default to root
      return { valid: true, sanitizedUrl: '/' };
    }

    // SECURITY: Only allow HTTPS (or HTTP in development)
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (parsed.protocol !== 'https:' && (!isDevelopment || parsed.protocol !== 'http:')) {
      return { valid: false, error: 'Only HTTPS redirects are allowed (HTTP only in development)' };
    }

    // SECURITY: Validate hostname against whitelist
    const hostname = parsed.hostname?.toLowerCase();
    if (!hostname) {
      return { valid: false, error: 'Invalid redirect URL: missing hostname' };
    }

    // Combine default and additional allowed domains
    const allAllowedDomains = [...ALLOWED_REDIRECT_DOMAINS, ...additionalAllowedDomains];

    // Check if hostname matches any allowed domain
    const isAllowed = allAllowedDomains.some(domain => {
      const domainLower = domain.toLowerCase();
      // Exact match
      if (hostname === domainLower) {
        return true;
      }
      // Subdomain match (e.g., www.wystawoferte.pl matches wystawoferte.pl)
      if (hostname.endsWith('.' + domainLower)) {
        return true;
      }
      return false;
    });

    if (!isAllowed) {
      return { 
        valid: false, 
        error: `Redirect to domain '${hostname}' is not allowed. Only whitelisted domains are permitted.` 
      };
    }

    // SECURITY: Reconstruct URL to prevent parameter pollution
    const sanitizedUrl = url.format({
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port,
      pathname: parsed.pathname,
      query: parsed.query
    });

    return { valid: true, sanitizedUrl };

  } catch (error) {
    return { valid: false, error: `Invalid redirect URL format: ${error.message}` };
  }
}

/**
 * SECURITY: Safe redirect helper that validates URL before redirecting
 * 
 * @param {object} res - Express response object
 * @param {string} redirectUrl - URL to redirect to
 * @param {string[]} additionalAllowedDomains - Additional allowed domains (optional)
 * @returns {boolean} - True if redirect was successful, false if validation failed
 */
function safeRedirect(res, redirectUrl, additionalAllowedDomains = []) {
  const validation = validateRedirectUrl(redirectUrl, additionalAllowedDomains);
  
  if (!validation.valid) {
    console.error(`[SECURITY] Blocked open redirect attempt: ${redirectUrl} - ${validation.error}`);
    // Redirect to safe default location
    res.redirect('/');
    return false;
  }

  res.redirect(validation.sanitizedUrl || redirectUrl);
  return true;
}

/**
 * SECURITY: Build safe redirect URL with query parameters
 * 
 * @param {string} basePath - Base path (must be relative or from allowed domain)
 * @param {object} queryParams - Query parameters to add
 * @returns {string} - Safe redirect URL
 */
function buildSafeRedirectUrl(basePath, queryParams = {}) {
  // Use FRONTEND_URL from env if available, otherwise construct from basePath
  const frontendUrl = process.env.FRONTEND_URL || 'https://wystawoferte.pl';
  
  try {
    const parsed = url.parse(basePath, true);
    
    // If it's already a full URL, validate it
    if (parsed.protocol && parsed.host) {
      const validation = validateRedirectUrl(basePath);
      if (!validation.valid) {
        // Fallback to frontend URL
        const safePath = parsed.pathname || '/';
        return url.format({
          protocol: url.parse(frontendUrl).protocol,
          host: url.parse(frontendUrl).host,
          pathname: safePath,
          query: { ...parsed.query, ...queryParams }
        });
      }
      // Merge query params
      return url.format({
        protocol: parsed.protocol,
        host: parsed.host,
        pathname: parsed.pathname,
        query: { ...parsed.query, ...queryParams }
      });
    }

    // Relative path - use frontend URL as base
    return url.format({
      protocol: url.parse(frontendUrl).protocol,
      host: url.parse(frontendUrl).host,
      pathname: basePath || '/',
      query: queryParams
    });

  } catch (error) {
    // Fallback to frontend URL root
    return url.format({
      protocol: url.parse(frontendUrl).protocol,
      host: url.parse(frontendUrl).host,
      pathname: '/',
      query: queryParams
    });
  }
}

module.exports = {
  validateRedirectUrl,
  safeRedirect,
  buildSafeRedirectUrl,
  ALLOWED_REDIRECT_DOMAINS,
  ALLOWED_REDIRECT_PATHS
};

