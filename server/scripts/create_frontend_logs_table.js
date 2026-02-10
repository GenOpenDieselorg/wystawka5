const pool = require('../config/database');

async function createFrontendLogsTable() {
  try {
    const connection = await pool.getConnection();
    console.log('Connected to database');

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS frontend_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        level VARCHAR(20) DEFAULT 'INFO',
        message TEXT NOT NULL,
        source VARCHAR(50) DEFAULT 'frontend',
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        meta JSON NULL,
        user_agent TEXT NULL,
        ip_address VARCHAR(45) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_level (level),
        INDEX idx_timestamp (timestamp)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `;

    await connection.query(createTableQuery);
    console.log('frontend_logs table created or already exists');

    connection.release();
    process.exit(0);
  } catch (error) {
    console.error('Error creating table:', error);
    process.exit(1);
  }
}

createFrontendLogsTable();

