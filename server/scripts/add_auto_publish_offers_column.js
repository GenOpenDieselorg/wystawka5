/**
 * Migration: Add auto_publish_offers column to user_preferences table
 * Run: node server/scripts/add_auto_publish_offers_column.js
 */
const db = require('../config/database');

async function migrate() {
  try {
    console.log('Adding auto_publish_offers column to user_preferences table...');
    
    // Check if column already exists
    const [columns] = await db.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'user_preferences' 
      AND COLUMN_NAME = 'auto_publish_offers'
    `);
    
    if (columns.length > 0) {
      console.log('ℹ️ Column auto_publish_offers already exists, skipping...');
      process.exit(0);
    }
    
    // Add auto_publish_offers column
    await db.execute(`
      ALTER TABLE user_preferences 
      ADD COLUMN auto_publish_offers TINYINT(1) DEFAULT 0
    `);
    
    console.log('✅ Migration completed: auto_publish_offers column added to user_preferences table');
    process.exit(0);
  } catch (error) {
    // If column already exists, that's fine
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️ Column auto_publish_offers already exists, skipping...');
      process.exit(0);
    }
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();

