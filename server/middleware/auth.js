const jwt = require('jsonwebtoken');
const db = require('../config/database');
const logger = require('../utils/logger');

if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not defined!');
}

const JWT_SECRET = process.env.JWT_SECRET;

const authenticate = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if token is blacklisted
    if (decoded.jti) {
      const [blacklisted] = await db.execute('SELECT 1 FROM token_blacklist WHERE jti = ?', [decoded.jti]);
      if (blacklisted.length > 0) {
        return res.status(401).json({ error: 'Token has been revoked' });
      }
    }
    
    // Check if user exists and validate last_password_change
    const [users] = await db.execute('SELECT last_password_change FROM users WHERE id = ?', [decoded.userId]);
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = users[0];
    
    // If password changed after token was issued, invalidate token
    if (user.last_password_change) {
      const lastPasswordChange = new Date(user.last_password_change).getTime() / 1000;
      // decoded.iat is in seconds
      // Add a small buffer (e.g. 1 second) to avoid race conditions
      if (lastPasswordChange > decoded.iat + 1) {
         return res.status(401).json({ error: 'Token invalidated due to password change' });
      }
    }

    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch (error) {
    // Only log actual errors, not just invalid tokens
    if (error.name !== 'JsonWebTokenError' && error.name !== 'TokenExpiredError') {
      logger.error('Auth Middleware Error:', error);
    }
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authenticate;
