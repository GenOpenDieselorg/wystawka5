const { v4: uuidv4 } = require('uuid');
const requestContext = require('../utils/requestContext');

const requestIdMiddleware = (req, res, next) => {
  // Check if X-Request-ID header exists, otherwise generate new
  const requestId = req.headers['x-request-id'] || uuidv4();
  
  // Set header on response
  res.setHeader('X-Request-ID', requestId);
  
  // Attach to request object for easy access if needed
  req.id = requestId;
  
  // Run the rest of the request within the async local storage context
  requestContext.run({ requestId }, () => {
    next();
  });
};

module.exports = requestIdMiddleware;
