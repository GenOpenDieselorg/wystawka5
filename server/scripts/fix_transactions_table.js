const db = require('../config/database');

async function migrate() {
  try {
    console.log('Checking transactions table schema...');
    
    const dbName = process.env.DB_NAME || 'wystawka';
    
    // Check if external_id exists
    const [columns] = await db.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = '${dbName}' 
      AND TABLE_NAME = 'transactions' 
      AND COLUMN_NAME = 'external_id'
    `);

    if (columns.length === 0) {
      console.log('Adding external_id column...');
      await db.execute('ALTER TABLE transactions ADD COLUMN external_id VARCHAR(255) NULL AFTER product_id');
    } else {
      console.log('external_id column already exists.');
    }

    // Make product_id nullable
    console.log('Ensuring product_id is nullable...');
    await db.execute('ALTER TABLE transactions MODIFY COLUMN product_id INT NULL');

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();

