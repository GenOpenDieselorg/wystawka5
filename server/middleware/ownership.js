const db = require('../config/database');

/**
 * Middleware factory to check if the authenticated user owns the resource.
 * Assumes the table has a 'user_id' column.
 * 
 * @param {string} tableName - The name of the database table (e.g., 'products')
 * @param {string} idParam - The name of the route parameter containing the resource ID (default: 'id')
 */
const checkResourceOwnership = (tableName, idParam = 'id') => {
  return async (req, res, next) => {
    try {
      const userId = req.userId;
      const resourceId = req.params[idParam];

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (!resourceId) {
        return res.status(400).json({ error: `Missing resource ID parameter: ${idParam}` });
      }

      const query = `SELECT user_id FROM ${tableName} WHERE id = ?`;
      const [rows] = await db.execute(query, [resourceId]);

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      const resource = rows[0];

      // Check ownership
      if (resource.user_id !== userId) {
        console.warn(`Access denied: User ${userId} attempted to access ${tableName} ${resourceId} belonging to ${resource.user_id}`);
        return res.status(403).json({ error: 'Access denied' });
      }

      next();
    } catch (error) {
      console.error(`Ownership check error for ${tableName}:`, error);
      res.status(500).json({ error: 'Server error during ownership check' });
    }
  };
};

module.exports = checkResourceOwnership;

