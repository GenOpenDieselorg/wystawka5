const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * SECURITY: File scanner to detect malware and suspicious files
 * 
 * This module provides file scanning capabilities to prevent malware uploads.
 * It performs multiple security checks:
 * 1. Magic bytes validation (file type verification)
 * 2. File size limits
 * 3. Suspicious content detection
 * 4. Extension validation
 */

// SECURITY: Allowed file signatures (magic bytes) for images
const ALLOWED_SIGNATURES = {
  'image/jpeg': [
    [0xFF, 0xD8, 0xFF], // JPEG
  ],
  'image/png': [
    [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], // PNG
  ],
  'image/gif': [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
  ],
  'image/webp': [
    [0x52, 0x49, 0x46, 0x46], // RIFF (WebP starts with RIFF)
  ],
};

// SECURITY: Suspicious patterns that might indicate malware
const SUSPICIOUS_PATTERNS = [
  /<script/i,           // Script tags
  /javascript:/i,       // JavaScript protocol
  /on\w+\s*=/i,        // Event handlers (onclick, onload, etc.)
  /eval\(/i,           // eval() calls
  /exec\(/i,           // exec() calls
  /system\(/i,         // system() calls
  /shell_exec/i,       // shell_exec
  /base64_decode/i,    // base64_decode (common in PHP malware)
  /eval\(base64/i,     // eval(base64 (PHP backdoor pattern)
  /<\?php/i,           // PHP tags
  /<%.*%>/i,           // ASP tags
  /<jsp:/i,            // JSP tags
];

// SECURITY: Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Read magic bytes from file
 * @param {string} filePath - Path to file
 * @param {number} length - Number of bytes to read (default: 16)
 * @returns {Buffer} - Magic bytes buffer
 */
function readMagicBytes(filePath, length = 16) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buffer = Buffer.alloc(length);
    fs.readSync(fd, buffer, 0, length, 0);
    return buffer;
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * Check if file signature matches allowed types
 * @param {string} filePath - Path to file
 * @param {string} expectedMimeType - Expected MIME type
 * @returns {boolean} - True if signature matches
 */
function validateFileSignature(filePath, expectedMimeType) {
  const magicBytes = readMagicBytes(filePath, 16);
  const signatures = ALLOWED_SIGNATURES[expectedMimeType];
  
  if (!signatures) {
    return false;
  }

  return signatures.some(signature => {
    return signature.every((byte, index) => magicBytes[index] === byte);
  });
}

/**
 * Check for suspicious content in file
 * @param {string} filePath - Path to file
 * @returns {boolean} - True if suspicious content found
 */
function containsSuspiciousContent(filePath) {
  try {
    // Read first 1KB of file (enough to detect most patterns)
    const buffer = readMagicBytes(filePath, 1024);
    const content = buffer.toString('utf8', 0, Math.min(1024, buffer.length));
    
    return SUSPICIOUS_PATTERNS.some(pattern => pattern.test(content));
  } catch (error) {
    // If we can't read the file, consider it suspicious
    return true;
  }
}

/**
 * Validate file extension matches MIME type
 * @param {string} filePath - Path to file
 * @param {string} mimeType - MIME type
 * @returns {boolean} - True if extension matches
 */
function validateExtension(filePath, mimeType) {
  const ext = path.extname(filePath).toLowerCase();
  const extensionMap = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
  };

  const allowedExtensions = extensionMap[mimeType];
  return allowedExtensions && allowedExtensions.includes(ext);
}

/**
 * SECURITY: Scan uploaded file for malware and suspicious content
 * 
 * @param {string} filePath - Path to uploaded file
 * @param {string} mimeType - MIME type of file
 * @param {object} options - Scan options
 * @param {number} options.maxSize - Maximum file size in bytes (default: 10MB)
 * @returns {Promise<{valid: boolean, errors: string[]}>} - Scan result
 */
async function scanFile(filePath, mimeType, options = {}) {
  const errors = [];
  const maxSize = options.maxSize || MAX_FILE_SIZE;

  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return { valid: false, errors: ['File does not exist'] };
    }

    // Check file size
    const stats = fs.statSync(filePath);
    if (stats.size > maxSize) {
      errors.push(`File size (${stats.size} bytes) exceeds maximum allowed size (${maxSize} bytes)`);
    }

    if (stats.size === 0) {
      errors.push('File is empty');
    }

    // Validate file signature (magic bytes)
    if (!validateFileSignature(filePath, mimeType)) {
      errors.push(`File signature does not match expected MIME type: ${mimeType}`);
    }

    // Validate extension matches MIME type
    if (!validateExtension(filePath, mimeType)) {
      errors.push(`File extension does not match MIME type: ${mimeType}`);
    }

    // Check for suspicious content
    if (containsSuspiciousContent(filePath)) {
      errors.push('File contains suspicious content patterns (potential malware)');
    }

    return {
      valid: errors.length === 0,
      errors
    };

  } catch (error) {
    return {
      valid: false,
      errors: [`File scan error: ${error.message}`]
    };
  }
}

/**
 * SECURITY: Quick scan for common image files (faster, less thorough)
 * Use this for image uploads where we trust the source more
 * 
 * @param {string} filePath - Path to file
 * @param {string} mimeType - MIME type
 * @returns {Promise<{valid: boolean, errors: string[]}>} - Scan result
 */
async function quickScan(filePath, mimeType) {
  const errors = [];

  try {
    if (!fs.existsSync(filePath)) {
      return { valid: false, errors: ['File does not exist'] };
    }

    // Check file size
    const stats = fs.statSync(filePath);
    if (stats.size > MAX_FILE_SIZE) {
      errors.push(`File size exceeds maximum allowed size`);
    }

    // Validate file signature
    if (!validateFileSignature(filePath, mimeType)) {
      errors.push(`File signature does not match expected type`);
    }

    return {
      valid: errors.length === 0,
      errors
    };

  } catch (error) {
    return {
      valid: false,
      errors: [`Scan error: ${error.message}`]
    };
  }
}

module.exports = {
  scanFile,
  quickScan,
  validateFileSignature,
  containsSuspiciousContent,
  MAX_FILE_SIZE
};

