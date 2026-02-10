const crypto = require('crypto');

// In-memory store for idempotency keys
// In production with multiple instances, use Redis
const idempotencyStore = new Map();

// Clean up old keys every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of idempotencyStore.entries()) {
    if (now - data.timestamp > 24 * 60 * 60 * 1000) { // 24 hours
      idempotencyStore.delete(key);
    }
  }
}, 60 * 60 * 1000);

/**
 * Idempotency Middleware
 * Ensures that the same request (identified by Idempotency-Key header) 
 * is not processed multiple times.
 */
const idempotencyMiddleware = (req, res, next) => {
  // Only for state-changing methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  const idempotencyKey = req.headers['idempotency-key'];
  
  if (!idempotencyKey) {
    // If no key is provided, proceed as normal
    // Ideally, for critical paths, we should require it, but we don't want to break existing clients
    return next();
  }

  // Check if key exists
  if (idempotencyStore.has(idempotencyKey)) {
    const stored = idempotencyStore.get(idempotencyKey);
    
    // If request is still processing
    if (stored.status === 'processing') {
      return res.status(409).json({ 
        error: 'Conflict', 
        message: 'Request with this Idempotency-Key is currently being processed' 
      });
    }
    
    // If request completed, return cached response
    // Note: We only cache the status and body for simplicity. 
    // For full idempotency, headers should also be cached.
    return res.status(stored.responseStatus).json(stored.responseBody);
  }

  // Mark as processing
  idempotencyStore.set(idempotencyKey, {
    status: 'processing',
    timestamp: Date.now()
  });

  // Intercept response to cache it
  const originalSend = res.json;
  
  res.json = function(body) {
    // Cache the response
    idempotencyStore.set(idempotencyKey, {
      status: 'completed',
      timestamp: Date.now(),
      responseStatus: res.statusCode,
      responseBody: body
    });
    
    // Call original json method
    return originalSend.call(this, body);
  };

  next();
};

module.exports = idempotencyMiddleware;

