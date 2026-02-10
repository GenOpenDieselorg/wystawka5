const db = require('../config/database');
const fs = require('fs');
const path = require('path');

async function migrate() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'migration_ai_templates.sql'), 'utf8');
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);

    for (const statement of statements) {
      console.log('Executing:', statement.substring(0, 50) + '...');
      await db.query(statement);
    }
    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();

