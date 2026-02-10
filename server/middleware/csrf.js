const crypto = require('crypto');

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
    '/api/logs' // Logging endpoint might be called from beacon or similar
  ];

  if (excludedPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  // Get token from cookie
  const cookieToken = req.cookies['XSRF-TOKEN'];

  if (safeMethods.includes(req.method)) {
    // If no token exists, generate one
    if (!cookieToken) {
      const token = crypto.randomBytes(32).toString('hex');
      
      // Set cookie as NOT HttpOnly so frontend (axios) can read it
      // but Secure and SameSite=Strict for security
      res.cookie('XSRF-TOKEN', token, {
        httpOnly: false, // Must be false for Double Submit Cookie pattern with SPA
        secure: process.env.NODE_ENV === 'production', 
        sameSite: 'Strict',
        path: '/'
      });
    }
    return next();
  }

  // For unsafe methods, verify token
  const headerToken = req.headers['x-xsrf-token'];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({
      error: 'CSRF validation failed',
      message: 'Missing or invalid CSRF token'
    });
  }

  next();
};

module.exports = csrfProtection;

