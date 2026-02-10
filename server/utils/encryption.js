const crypto = require('crypto');

if (!process.env.ENCRYPTION_KEY) {
  throw new Error('FATAL: ENCRYPTION_KEY environment variable is not defined!');
}

// Ensure key is valid (32 bytes or 64 hex chars)
let keyBuffer;
const rawKey = process.env.ENCRYPTION_KEY;

if (rawKey.length === 32) {
  // 32 characters string (UTF-8) -> 32 bytes
  keyBuffer = Buffer.from(rawKey);
} else if (rawKey.length === 64 && /^[0-9a-fA-F]+$/.test(rawKey)) {
  // 64 hex characters -> 32 bytes
  keyBuffer = Buffer.from(rawKey, 'hex');
} else {
  throw new Error('FATAL: ENCRYPTION_KEY must be exactly 32 characters long or a 64-character hex string!');
}

const IV_LENGTH = 16; // For AES, this is always 16

function encrypt(text) {
  if (!text) return text;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  if (!text) return text;
  
  // Check if text matches encrypted format (hex:hex)
  // If not, return as is (backward compatibility for unencrypted data)
  const textParts = text.split(':');
  if (textParts.length !== 2) return text;
  
  try {
    const iv = Buffer.from(textParts[0], 'hex');
    const encryptedText = Buffer.from(textParts[1], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    // If decryption fails, it might be unencrypted plain text that happened to have a colon
    return text;
  }
}

module.exports = { encrypt, decrypt };
