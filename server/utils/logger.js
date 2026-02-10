const fs = require('fs');
const path = require('path');
const requestContext = require('./requestContext');

const LOGS_DIR = path.join(__dirname, '../../logs/backend');

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

/**
 * Get the next log file number for today
 * Format: YYYY-MM-DD-N.log where N is the run number for the day
 */
function getLogFileName() {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Find existing log files for today
  try {
    const files = fs.readdirSync(LOGS_DIR).filter(file => 
      file.startsWith(dateStr) && file.endsWith('.log')
    );
    
    // Extract numbers from existing files
    const numbers = files
      .map(file => {
        const match = file.match(/^(\d{4}-\d{2}-\d{2})-(\d+)\.log$/);
        return match ? parseInt(match[2], 10) : 0;
      })
      .filter(num => num > 0);
    
    // Get the next number
    const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    
    return `${dateStr}-${nextNumber}.log`;
  } catch (err) {
    // Fallback if directory read fails
    return `${dateStr}-1.log`;
  }
}

// Get log file path (cached for the current day)
let currentLogFile = null;
let currentDate = null;

function getLogFile() {
  const today = new Date().toISOString().split('T')[0];
  
  // If date changed or file not set, create new log file
  if (currentDate !== today || !currentLogFile) {
    currentDate = today;
    currentLogFile = path.join(LOGS_DIR, getLogFileName());
    
    // Write initial log entry
    const initMessage = `\n=== Server started at ${new Date().toISOString()} ===\n`;
    try {
      fs.appendFileSync(currentLogFile, initMessage, 'utf8');
    } catch (err) {
      console.error('Failed to write init message to log file:', err);
    }
  }
  
  return currentLogFile;
}

/**
 * Format log message with timestamp
 */
function formatMessage(level, message, ...args) {
  const timestamp = new Date().toISOString();
  
  // Get Request ID from context if available
  const store = requestContext.getStore();
  const requestId = store ? store.requestId : 'system';
  
  const formattedArgs = args.length > 0 
    ? ' ' + args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ')
    : '';
  
  return `[${timestamp}] [${requestId}] [${level}] ${message}${formattedArgs}\n`;
}

/**
 * Write to log file
 */
function writeLog(level, message, ...args) {
  try {
    const logFile = getLogFile();
    const logMessage = formatMessage(level, message, ...args);
    
    // Append to file
    fs.appendFileSync(logFile, logMessage, 'utf8');
    
    // Always output to console (stdout/stderr) so PM2 can capture it
    // PM2 monit shows stdout/stderr, so we need to always log to console
    const consoleMethod = level === 'ERROR' ? console.error : 
                         level === 'WARN' ? console.warn : 
                         console.log;
    
    // Add requestId to console output too? It's already in logMessage string but console methods add their own formatting sometimes.
    // Let's just output the formatted string but trim newline
    consoleMethod(logMessage.trim());
  } catch (error) {
    // Fallback to console if file write fails
    console.error('Logger error:', error);
    console.log(`[${level}]`, message, ...args);
  }
}

const logger = {
  info: (message, ...args) => writeLog('INFO', message, ...args),
  error: (message, ...args) => writeLog('ERROR', message, ...args),
  warn: (message, ...args) => writeLog('WARN', message, ...args),
  debug: (message, ...args) => {
    if (process.env.NODE_ENV === 'development') {
      writeLog('DEBUG', message, ...args);
    }
  },
  log: (message, ...args) => writeLog('INFO', message, ...args)
};

module.exports = logger;
