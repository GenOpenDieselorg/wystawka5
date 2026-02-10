const crypto = require('crypto');

/**
 * Request Signing Middleware
 * Verifies X-Signature header using HMAC-SHA256
 * Signature = HMAC-SHA256(rawBody, secret)
 * 
 * Note: Requires req.rawBody to be populated. 
 * Configure express.json() with { verify: (req, res, buf) => req.rawBody = buf }
 */
const requestSigningMiddleware = (req, res, next) => {
  const signature = req.headers['x-signature'];
  
  // If no signature header, skip verification (unless enforced for specific routes)
  if (!signature) {
    return next();
  }

  const secret = process.env.API_SIGNING_SECRET;
  
  if (!secret) {
    console.warn('API_SIGNING_SECRET not set, cannot verify signature');
    return next();
  }

  try {
    // Use rawBody if available (best for accuracy), otherwise fallback to stringify (unreliable for signing)
    const payload = req.rawBody || JSON.stringify(req.body || {});
    
    if (!payload && (req.method === 'POST' || req.method === 'PUT')) {
      // Body empty but signature present
       console.warn('Empty body for signed request');
    }

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    // Constant time comparison
    // Compare buffers to avoid timing attacks
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    
    if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return res.status(401).json({ error: 'Invalid request signature' });
    }

    next();
  } catch (error) {
    console.error('Signature verification error:', error);
    return res.status(400).json({ error: 'Signature verification failed' });
  }
};

module.exports = requestSigningMiddleware;
