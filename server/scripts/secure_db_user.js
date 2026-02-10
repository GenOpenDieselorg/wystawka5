const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
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
    console.log('--------------------------------------------------');
    console.log('Update your .env file with the following credentials:');
    console.log(`DB_USER=${secureUser}`);
    console.log(`DB_PASSWORD=${securePassword}`);
    console.log('--------------------------------------------------');

    await connection.end();
  } catch (error) {
    console.error('Error securing database user:', error);
  }
};

run();

