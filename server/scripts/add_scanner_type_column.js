/**
 * Migration: Add scanner_type column to user_preferences table
 * Run: node server/scripts/add_scanner_type_column.js
 */
const path = require('path');
const dotenvPath = path.resolve(__dirname, '../../.env');
console.log('Loading .env from:', dotenvPath);
require('dotenv').config({ path: dotenvPath });

// Override localhost with 127.0.0.1 to avoid IPv6 issues
if (process.env.DB_HOST === 'localhost') {
  process.env.DB_HOST = '127.0.0.1';
}

console.log('DB Config:', {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME
});

const db = require('../config/database');

async function migrate() {
  try {
    console.log('Adding scanner_type column to user_preferences table...');
    
    // Check if column already exists
    const [columns] = await db.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'user_preferences' 
      AND COLUMN_NAME = 'scanner_type'
    `);
    
    if (columns.length > 0) {
      console.log('ℹ️ Column scanner_type already exists, skipping...');
      process.exit(0);
    }
    
    // Add scanner_type column (default 'advanced')
    await db.execute(`
      ALTER TABLE user_preferences 
      ADD COLUMN scanner_type VARCHAR(20) DEFAULT 'advanced'
    `);
    
    // Check if scanner_enabled exists first to avoid error
    const [enabledCol] = await db.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'user_preferences' 
      AND COLUMN_NAME = 'scanner_enabled'
    `);

    if (enabledCol.length > 0) {
       await db.execute(`
        UPDATE user_preferences 
        SET scanner_type = IF(scanner_enabled = 0, 'none', 'advanced')
      `);
    }
    
    console.log('✅ Migration completed: scanner_type column added to user_preferences table');
    process.exit(0);
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️ Column scanner_type already exists, skipping...');
      process.exit(0);
    }
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
