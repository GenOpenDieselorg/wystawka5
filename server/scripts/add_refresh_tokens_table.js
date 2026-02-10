require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../config/database');

async function migrate() {
  try {
    console.log('Creating refresh_tokens table...');
    
    // Create refresh_tokens table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(255) NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        revoked BOOLEAN DEFAULT FALSE,
        replaced_by_token VARCHAR(255) DEFAULT NULL,
        ip_address VARCHAR(45),
        user_agent VARCHAR(255),
        INDEX idx_token (token),
        INDEX idx_user_id (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('refresh_tokens table created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
