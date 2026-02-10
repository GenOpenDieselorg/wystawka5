const path = require('path');

/**
 * Validates a file path to prevent directory traversal attacks.
 * Ensures the resolved path is within the allowed base directory.
 * 
 * @param {string} targetPath - The path to validate (absolute or relative)
 * @param {string} baseDir - The allowed base directory (relative to CWD or absolute), default 'uploads'
 * @returns {string} - The resolved absolute path if valid
 * @throws {Error} - If path traversal is detected
 */
const validatePath = (targetPath, baseDir = 'uploads') => {
  // Resolve the target path.
  const absolutePath = path.resolve(targetPath);
  
  // Resolve baseDir. If absolute, use as is. If relative, join with CWD.
  const absoluteBaseDir = path.isAbsolute(baseDir) 
    ? path.resolve(baseDir) // Normalize absolute path
    : path.resolve(path.join(process.cwd(), baseDir));

  // Check if the resolved path starts with the base directory path
  if (!absolutePath.startsWith(absoluteBaseDir)) {
    throw new Error(`Access denied: Path traversal attempt detected. Path must be within ${baseDir}`);
  }
  
  return absolutePath;
};

module.exports = { validatePath };
