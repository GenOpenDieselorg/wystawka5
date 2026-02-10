const db = require('../config/database');

const initBackgroundJobs = async () => {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS background_jobs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        progress INT DEFAULT 0,
        data JSON,
        result JSON,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_status (user_id, status)
      )
    `);
    console.log('Background jobs table initialized');
  } catch (error) {
    console.error('Error initializing background jobs table:', error);
  }
};

module.exports = initBackgroundJobs;

