const db = require('../config/database');

async function migrate() {
  try {
    console.log('Checking for verification columns in users table...');
    
    // Check if columns exist
    const [columns] = await db.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME || 'wystawka'}' 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME IN ('is_verified', 'verification_token')
    `);

    const existingColumns = columns.map(c => c.COLUMN_NAME);

    if (!existingColumns.includes('is_verified')) {
      console.log('Adding is_verified column...');
      await db.execute('ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE');
    } else {
      console.log('is_verified column already exists.');
    }

    if (!existingColumns.includes('verification_token')) {
      console.log('Adding verification_token column...');
      await db.execute('ALTER TABLE users ADD COLUMN verification_token VARCHAR(255) NULL');
    } else {
      console.log('verification_token column already exists.');
    }

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();

