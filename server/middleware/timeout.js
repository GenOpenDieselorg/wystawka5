const { v4: uuidv4 } = require('uuid');

/**
 * Global timeout middleware
 * Sets a timeout for all requests to prevent hanging connections
 * Default: 30 seconds
 */
const timeoutMiddleware = (req, res, next) => {
  // Default timeout 30s
  const timeout = 30000;
  
  // Set timeout on the request socket
  req.setTimeout(timeout, () => {
    const error = new Error('Request Timeout');
    error.status = 408;
    next(error);
  });

  // Set timeout on the response
  res.setTimeout(timeout, () => {
    const error = new Error('Response Timeout');
    error.status = 503;
    next(error);
  });

  next();
};

module.exports = timeoutMiddleware;

