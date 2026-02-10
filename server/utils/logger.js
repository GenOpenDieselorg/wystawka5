const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');
const requestContext = require('./requestContext');

const LOGS_DIR = path.join(__dirname, '../../logs/backend');

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Custom format to include requestId
const addRequestId = winston.format((info) => {
  const store = requestContext.getStore();
  if (store && store.requestId) {
    info.requestId = store.requestId;
  }
  return info;
});

const fileTransport = new DailyRotateFile({
  filename: path.join(LOGS_DIR, '%DATE%-app.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  format: winston.format.combine(
    addRequestId(),
    winston.format.timestamp(),
    winston.format.json()
  )
});

const errorFileTransport = new DailyRotateFile({
  filename: path.join(LOGS_DIR, '%DATE%-error.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  level: 'error',
  format: winston.format.combine(
    addRequestId(),
    winston.format.timestamp(),
    winston.format.json()
  )
});

const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    addRequestId(),
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, requestId, ...meta }) => {
      const reqIdStr = requestId ? `[${requestId}]` : '';
      const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
      return `${timestamp} ${reqIdStr} ${level}: ${message} ${metaStr}`;
    })
  )
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    fileTransport,
    errorFileTransport,
    consoleTransport
  ]
});

// Wrapper to match existing API and handle variable arguments
const wrapper = {
  info: (message, ...args) => logger.info(message, ...args),
  error: (message, ...args) => logger.error(message, ...args),
  warn: (message, ...args) => logger.warn(message, ...args),
  debug: (message, ...args) => logger.debug(message, ...args),
  log: (message, ...args) => logger.info(message, ...args),
  // Expose the raw winston logger if needed
  winston: logger
};

module.exports = wrapper;
