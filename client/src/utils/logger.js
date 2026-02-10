/**
 * Frontend logger - sends logs to backend API endpoint
 * Backend will handle file writing
 */

const API_URL = process.env.REACT_APP_API_URL || 'https://api.wystawoferte.pl/api';

let logBuffer = [];
let isSending = false;
const MAX_BUFFER_SIZE = 50;
const FLUSH_INTERVAL = 5000; // 5 seconds

/**
 * Format log message
 */
function formatMessage(level, message, ...args) {
  const timestamp = new Date().toISOString();
  const formattedArgs = args.length > 0 
    ? ' ' + args.map(arg => {
        try {
          return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
        } catch (e) {
          return String(arg);
        }
      }).join(' ')
    : '';
  
  return {
    timestamp,
    level,
    message: `${message}${formattedArgs}`,
    url: window.location.href,
    userAgent: navigator.userAgent
  };
}

/**
 * Send logs to backend
 */
async function sendLogs(logs) {
  if (isSending || logs.length === 0) return;
  
  isSending = true;
  
  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    await fetch(`${API_URL}/logs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ logs, source: 'frontend' }),
      credentials: 'include', // Ensure cookies are sent
      // Don't wait for response to avoid blocking
    }).catch(() => {
      // Silently fail - logging shouldn't break the app
    });
  } catch (error) {
    // Silently fail
  } finally {
    isSending = false;
  }
}

/**
 * Add log to buffer and send if needed
 */
function addLog(level, message, ...args) {
  const logEntry = formatMessage(level, message, ...args);
  
  // Add to buffer
  logBuffer.push(logEntry);
  
  // Also log to console for development
  if (process.env.NODE_ENV === 'development') {
    const consoleMethod = level === 'ERROR' ? console.error : 
                         level === 'WARN' ? console.warn : 
                         console.log;
    consoleMethod(`[${level}]`, message, ...args);
  }
  
  // Send if buffer is full
  if (logBuffer.length >= MAX_BUFFER_SIZE) {
    const logsToSend = [...logBuffer];
    logBuffer = [];
    sendLogs(logsToSend);
  }
}

// Flush logs periodically
setInterval(() => {
  if (logBuffer.length > 0 && !isSending) {
    const logsToSend = [...logBuffer];
    logBuffer = [];
    sendLogs(logsToSend);
  }
}, FLUSH_INTERVAL);

// Flush logs before page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (logBuffer.length > 0 && navigator.sendBeacon) {
      // Use sendBeacon for reliable delivery on page unload
      const logs = logBuffer.map(log => 
        `${log.timestamp} [${log.level}] ${log.message}`
      ).join('\n');
      
      const blob = new Blob([JSON.stringify({ 
        logs: logs, 
        source: 'frontend', 
        flush: true
      })], {
        type: 'application/json'
      });
      
      navigator.sendBeacon(`${API_URL}/logs`, blob);
    }
  });
}

const logger = {
  info: (message, ...args) => addLog('INFO', message, ...args),
  error: (message, ...args) => addLog('ERROR', message, ...args),
  warn: (message, ...args) => addLog('WARN', message, ...args),
  debug: (message, ...args) => {
    if (process.env.NODE_ENV === 'development') {
      addLog('DEBUG', message, ...args);
    }
  },
  log: (message, ...args) => addLog('INFO', message, ...args)
};

export default logger;

