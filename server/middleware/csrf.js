const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * CSRF Protection Middleware (Double Submit Cookie Pattern)
 * 
 * 1. For safe methods (GET, HEAD, OPTIONS), it sets a random token in a cookie (XSRF-TOKEN).
 *    This cookie is NOT HttpOnly so the frontend (Axios) can read it.
 * 
 * 2. For unsafe methods (POST, PUT, DELETE, PATCH), it verifies that the
 *    X-XSRF-TOKEN header matches the XSRF-TOKEN cookie.
 */
const csrfProtection = (req, res, next) => {
  // Ignored methods - safe methods don't need CSRF check
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  
  // Exclude specific paths if needed (e.g. webhooks, external callbacks)
  // Webhooks from Allegro/OLX/Payments usually come with their own signatures
  const excludedPaths = [
    '/api/integrations/allegro/webhook',
    '/api/integrations/olx/webhook',
    '/api/payment/notification',
    '/api/logs', // Logging endpoint might be called from beacon or similar
    '/api/auth/google' // Google OAuth login
  ];

  if (excludedPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  // Get token from cookie
  const cookieToken = req.cookies['XSRF-TOKEN'];

  if (safeMethods.includes(req.method)) {
    // Determine cookie domain
    let cookieDomain = undefined;
    if (process.env.NODE_ENV === 'production') {
      if (process.env.COOKIE_DOMAIN) {
        cookieDomain = process.env.COOKIE_DOMAIN;
      } else if (process.env.FRONTEND_URL && process.env.FRONTEND_URL.includes('wystawoferte.pl')) {
        cookieDomain = '.wystawoferte.pl';
      }
    }

    // Force clear any existing cookies that might conflict (e.g. host-only vs domain, HttpOnly vs not)
    // We explicitly clear potential variations to ensure clean state
    res.clearCookie('XSRF-TOKEN'); // Clears host-only
    if (cookieDomain) {
        // Also clear cookie on the specific domain just in case
        res.clearCookie('XSRF-TOKEN', { domain: cookieDomain, path: '/' });
    }

    // Generate new token
    const token = crypto.randomBytes(32).toString('hex');
      
    const cookieOptions = {
      httpOnly: false, // Must be false for Double Submit Cookie pattern with SPA
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'Lax',
      path: '/'
    };

    if (cookieDomain) {
      cookieOptions.domain = cookieDomain;
    }

    // Set new cookie
    res.cookie('XSRF-TOKEN', token, cookieOptions);
    
    return next();
  }

  // For unsafe methods, verify token
  const headerToken = req.headers['x-xsrf-token'];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    logger.warn(`CSRF Validation Failed for ${req.method} ${req.path}`, {
      cookieTokenPresent: !!cookieToken,
      headerTokenPresent: !!headerToken,
      match: cookieToken === headerToken,
      origin: req.headers.origin,
      referer: req.headers.referer,
      userAgent: req.headers['user-agent']
    });

    return res.status(403).json({
      error: 'CSRF validation failed',
      message: 'Missing or invalid CSRF token'
    });
  }

  next();
};

module.exports = csrfProtection;
