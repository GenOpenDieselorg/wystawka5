require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const db = require('../config/database');
const { encrypt } = require('../utils/encryption');

async function migrate() {
  try {
    console.log('Starting sensitive data encryption migration...');

    // 1. Alter NIP column to support longer encrypted strings
    // Encrypted string format: iv(32chars):ciphertext(variable)
    // NIP is 10 chars. AES-256 block is 16 bytes.
    // Encrypted size approx: 32 + 1 + 32 = 65 chars.
    // VARCHAR(255) is safe.
    
    console.log('Modifying users table schema...');
    try {
      await db.execute('ALTER TABLE users MODIFY COLUMN nip VARCHAR(255) NULL');
    } catch (err) {
      console.warn('Could not modify column (might already be modified or not exist):', err.message);
    }

    // 2. Encrypt existing NIPs
    console.log('Encrypting existing NIPs...');
    const [users] = await db.execute('SELECT id, nip FROM users WHERE nip IS NOT NULL AND nip != ""');
    
    let updatedCount = 0;
    
    for (const user of users) {
      // Check if already encrypted (contains colon)
      // This is a simple heuristic, but our encryption format is iv:ciphertext
      if (user.nip.includes(':')) {
        continue;
      }
      
      const encryptedNip = encrypt(user.nip);
      await db.execute('UPDATE users SET nip = ? WHERE id = ?', [encryptedNip, user.id]);
      updatedCount++;
    }
    
    console.log(`Encrypted NIP for ${updatedCount} users.`);
    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();

