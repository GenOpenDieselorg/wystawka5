const db = require('../config/database');

const initTokenBlacklist = async () => {
  try {
    // Check if table exists first to avoid unnecessary logs
    // But CREATE TABLE IF NOT EXISTS handles it.
    
    await db.execute(`
      CREATE TABLE IF NOT EXISTS token_blacklist (
        jti VARCHAR(36) PRIMARY KEY,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_expires_at (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // console.log('✅ Token blacklist table initialized');
  } catch (error) {
    console.error('❌ Failed to initialize token_blacklist table:', error.message);
    // Don't exit, just log error. Authentication might fail if table is missing but app should run.
  }
};

module.exports = initTokenBlacklist;

