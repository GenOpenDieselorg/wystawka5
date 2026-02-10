/**
 * Migration: Add google_id column to users table for Google OAuth
 * Run: node server/scripts/add_google_oauth_column.js
 */
const db = require('../config/database');

async function migrate() {
  try {
    console.log('Adding google_id column to users table...');
    
    // Add google_id column (nullable, unique)
    await db.execute(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) DEFAULT NULL,
      ADD UNIQUE INDEX IF NOT EXISTS idx_google_id (google_id)
    `);
    
    console.log('✅ Migration completed: google_id column added to users table');
    process.exit(0);
  } catch (error) {
    // If column already exists, that's fine
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️ Column google_id already exists, skipping...');
      process.exit(0);
    }
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();

