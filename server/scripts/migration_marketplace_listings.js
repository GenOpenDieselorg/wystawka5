const db = require('../config/database');

async function migrate() {
  try {
    console.log('Creating marketplace_listings table...');
    
    await db.execute(`
      CREATE TABLE IF NOT EXISTS marketplace_listings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        user_id INT NOT NULL,
        marketplace VARCHAR(50) NOT NULL,
        external_id VARCHAR(255) NOT NULL,
        status ENUM('active', 'sold', 'deleted') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_product_id (product_id),
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        UNIQUE KEY unique_product_marketplace (product_id, marketplace)
      )
    `);
    
    console.log('✅ marketplace_listings table created successfully');
    
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

migrate();

