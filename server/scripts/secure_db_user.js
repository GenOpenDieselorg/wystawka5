const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const crypto = require('crypto');

const run = async () => {
  try {
    // Use DB_ADMIN_USER/PASSWORD if available, otherwise default to root/empty or prompt
    // We intentionally avoid using DB_USER from .env because it might be the non-privileged user we are trying to replace/secure
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_ADMIN_USER || 'root',
      password: process.env.DB_ADMIN_PASSWORD || process.env.DB_ROOT_PASSWORD || '',
      database: 'mysql' // Connect to mysql database to create user
    });

    console.log('Connected to MySQL as root (or privileged user).');

    // Generate a secure password
    const securePassword = crypto.randomBytes(16).toString('hex');
    const secureUser = 'wystawoferte_app';
    const dbName = process.env.DB_NAME || 'wystawoferte';

    console.log(`Creating user '${secureUser}'...`);

    // Create user if not exists
    await connection.execute(`CREATE USER IF NOT EXISTS '${secureUser}'@'localhost' IDENTIFIED BY '${securePassword}'`);
    await connection.execute(`CREATE USER IF NOT EXISTS '${secureUser}'@'%' IDENTIFIED BY '${securePassword}'`);

    console.log(`Granting permissions on '${dbName}'...`);

    // Grant privileges ONLY on the specific database
    await connection.execute(`GRANT SELECT, INSERT, UPDATE, DELETE ON ${dbName}.* TO '${secureUser}'@'localhost'`);
    await connection.execute(`GRANT SELECT, INSERT, UPDATE, DELETE ON ${dbName}.* TO '${secureUser}'@'%'`);

    // Revoke administrative privileges if accidentally granted (unlikely with GRANT on specific DB, but good practice)
    // Actually, explicit GRANT is safer.

    await connection.execute('FLUSH PRIVILEGES');

    console.log('User created and permissions granted successfully.');

    // Automatically update .env file with new credentials instead of logging them
    const envPath = path.resolve(__dirname, '../../.env');
    let envContent = '';
    try {
      envContent = fs.readFileSync(envPath, 'utf8');
    } catch {
      // .env file doesn't exist yet, will create one
    }

    // Replace or append DB_USER
    if (envContent.match(/^DB_USER=.*/m)) {
      envContent = envContent.replace(/^DB_USER=.*/m, `DB_USER=${secureUser}`);
    } else {
      envContent += `\nDB_USER=${secureUser}`;
    }

    // Replace or append DB_PASSWORD
    if (envContent.match(/^DB_PASSWORD=.*/m)) {
      envContent = envContent.replace(/^DB_PASSWORD=.*/m, `DB_PASSWORD=${securePassword}`);
    } else {
      envContent += `\nDB_PASSWORD=${securePassword}`;
    }

    fs.writeFileSync(envPath, envContent.trim() + '\n', { mode: 0o600 });
    console.log('.env file has been updated with the new database credentials.');

    await connection.end();
  } catch (error) {
    console.error('Error securing database user:', error);
  }
};

run();

