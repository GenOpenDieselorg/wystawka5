const db = require('../config/database');

const logActivity = async (req, userId, type, details = {}) => {
  try {
    // Ensure userId is never null (use 0 for system/unknown)
    const finalUserId = userId || 0;
    
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // Store details as stringified JSON if needed, or just a description
    // For now, our simple DB schema for activities is: user_id, type, ip, user_agent, details
    // We didn't explicitly add 'details' column in the INSERT handler in database.js, 
    // but the generic handler maps columns dynamically. 
    // However, let's keep it simple: type maps to the action.
    
    // If details is an object, stringify it
    const detailsStr = typeof details === 'object' ? JSON.stringify(details) : String(details);

    await db.execute(
      'INSERT INTO user_activities (user_id, type, ip, user_agent, details) VALUES (?, ?, ?, ?, ?)',
      [finalUserId, type, ip, userAgent, detailsStr]
    );
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't crash the request if logging fails
  }
};

module.exports = logActivity;

