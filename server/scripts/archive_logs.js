require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

const DB_CONFIG = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

const RETENTION_DAYS = 90; // Keep logs for 90 days
const SOFT_DELETE_RETENTION_DAYS = 365; // Keep soft deleted records for 1 year

async function archive() {
  let connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    logger.info('Starting log archiving/cleanup...');

    // 1. Cleanup user_activities
    const [actResult] = await connection.execute(
      'DELETE FROM user_activities WHERE created_at < NOW() - INTERVAL ? DAY',
      [RETENTION_DAYS]
    );
    logger.info(`Deleted ${actResult.affectedRows} old user activities.`);

    // 2. Hard delete old soft-deleted products and their images
    // First, find IDs to delete
    const [rows] = await connection.execute(
      'SELECT id FROM products WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL ? DAY LIMIT 1000',
      [SOFT_DELETE_RETENTION_DAYS]
    );

    if (rows.length > 0) {
        const ids = rows.map(r => r.id);
        const placeholders = ids.map(() => '?').join(',');

        // Delete images
        await connection.execute(
            `DELETE FROM product_images WHERE product_id IN (${placeholders})`,
            ids
        );
        
        // Delete products
        const [delResult] = await connection.execute(
            `DELETE FROM products WHERE id IN (${placeholders})`,
            ids
        );
        
        logger.info(`Hard deleted ${delResult.affectedRows} soft-deleted products older than 1 year.`);
    }

    logger.info('Archiving completed.');
  } catch (error) {
    logger.error('Archiving failed:', error);
  } finally {
    if (connection) await connection.end();
  }
}

archive();

