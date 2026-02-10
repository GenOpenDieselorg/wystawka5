/**
 * Migration: Add scanner_enabled column to user_preferences table
 * Run: node server/scripts/add_scanner_enabled_column.js
 */
const db = require('../config/database');

async function migrate() {
  try {
    console.log('Adding scanner_enabled column to user_preferences table...');
    
    // Check if column already exists
    const [columns] = await db.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'user_preferences' 
      AND COLUMN_NAME = 'scanner_enabled'
    `);
    
    if (columns.length > 0) {
      console.log('ℹ️ Column scanner_enabled already exists, skipping...');
      process.exit(0);
    }
    
    // Add scanner_enabled column (default true)
    await db.execute(`
      ALTER TABLE user_preferences 
      ADD COLUMN scanner_enabled TINYINT(1) DEFAULT 1
    `);
    
    // Set default value for existing users
    await db.execute(`
      UPDATE user_preferences 
      SET scanner_enabled = 1 
      WHERE scanner_enabled IS NULL
    `);
    
    console.log('✅ Migration completed: scanner_enabled column added to user_preferences table');
    process.exit(0);
  } catch (error) {
    // If column already exists, that's fine
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️ Column scanner_enabled already exists, skipping...');
      process.exit(0);
    }
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();

