require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'wystawoferte',
  multipleStatements: true
};

async function migrate() {
  console.log('Starting hardening migration...');
  let connection;

  try {
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('Connected to database.');

    // 1. Add deleted_at column for Soft Deletes
    const tablesForSoftDelete = ['products', 'users', 'marketplace_integrations'];
    
    for (const table of tablesForSoftDelete) {
      console.log(`Checking ${table} for deleted_at column...`);
      try {
        const [columns] = await connection.query(`SHOW COLUMNS FROM ${table} LIKE 'deleted_at'`);
        if (columns.length === 0) {
            console.log(`Adding deleted_at to ${table}...`);
            await connection.query(`ALTER TABLE ${table} ADD COLUMN deleted_at DATETIME DEFAULT NULL`);
            console.log(`Added deleted_at to ${table}.`);
        } else {
            console.log(`Column deleted_at already exists in ${table}.`);
        }
      } catch (err) {
          console.error(`Error checking/adding deleted_at for ${table}:`, err.message);
      }
    }

    // 2. Add Indexes
    const indexes = [
      { table: 'products', column: 'ean_code', name: 'idx_products_ean' },
      { table: 'products', column: 'status', name: 'idx_products_status' },
      { table: 'products', column: 'deleted_at', name: 'idx_products_deleted_at' }, // For soft delete queries
      { table: 'transactions', column: 'created_at', name: 'idx_transactions_created_at' },
      { table: 'user_activities', column: 'created_at', name: 'idx_activities_created_at' },
      { table: 'marketplace_integrations', column: 'marketplace', name: 'idx_integrations_marketplace' }
    ];

    for (const idx of indexes) {
        console.log(`Checking index ${idx.name} on ${idx.table}...`);
        try {
            // Check if index exists
            const [existing] = await connection.query(
                `SELECT COUNT(1) as cnt FROM INFORMATION_SCHEMA.STATISTICS 
                 WHERE table_schema = '${DB_CONFIG.database}' 
                 AND table_name = '${idx.table}' 
                 AND index_name = '${idx.name}'`
            );

            if (existing[0].cnt === 0) {
                console.log(`Adding index ${idx.name}...`);
                await connection.query(`CREATE INDEX ${idx.name} ON ${idx.table} (${idx.column})`);
                console.log(`Index ${idx.name} added.`);
            } else {
                console.log(`Index ${idx.name} already exists.`);
            }
        } catch (err) {
            console.error(`Error adding index ${idx.name}:`, err.message);
        }
    }

    console.log('Hardening migration completed.');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    if (connection) await connection.end();
  }
}

migrate();

