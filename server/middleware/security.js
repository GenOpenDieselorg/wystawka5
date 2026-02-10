const { sendDiscordWebhook } = require('../services/notificationService');
const logActivity = require('../utils/activityLogger');
const db = require('../config/database');
const logger = require('../utils/logger');

// In-memory storage for tracking suspicious activities
// Structure: { ip_or_userId: { count: number, resetTime: timestamp, details: Set } }
const failedAccessAttempts = new Map();
const rapidResourceAccess = new Map();

const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const ALERT_COOLDOWN = 15 * 60 * 1000; // 15 minutes
const lastAlerts = new Map();

// Configuration
const CONFIG = {
  maxFailedAttempts: 10, // Max 403/404s per minute
  maxResourceAccess: 100, // Max resource reads per minute
  windowMs: 60 * 1000, // 1 minute window
};

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  
  for (const [key, data] of failedAccessAttempts.entries()) {
    if (now > data.resetTime) failedAccessAttempts.delete(key);
  }
  
  for (const [key, data] of rapidResourceAccess.entries()) {
    if (now > data.resetTime) rapidResourceAccess.delete(key);
  }
  
  for (const [key, timestamp] of lastAlerts.entries()) {
    if (now - timestamp > ALERT_COOLDOWN) lastAlerts.delete(key);
  }
}, CLEANUP_INTERVAL);

const sendSecurityAlert = async (type, identifier, details, req) => {
  const alertKey = `${type}:${identifier}`;
  const now = Date.now();
  
  if (lastAlerts.has(alertKey) && (now - lastAlerts.get(alertKey) < ALERT_COOLDOWN)) {
    return; // Suppress duplicate alerts
  }
  
  lastAlerts.set(alertKey, now);
  
  logger.warn(`[SECURITY ALERT] ${type} detected for ${identifier}. Details:`, details);
  
  // Log to DB
  try {
    // We use a special user_id 0 for system alerts if no user
    const userId = req.userId || 0;
    await logActivity(req, userId, 'security_alert', { type, details });
  } catch (e) {
    logger.error('Failed to log security alert:', e);
  }

  // Send Discord Webhook
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    await sendDiscordWebhook(
      '🚨 Alert Bezpieczeństwa',
      `Wykryto potencjalne zagrożenie: **${type}**`,
      [
        { name: 'Użytkownik', value: identifier, inline: true },
        { name: 'IP', value: ip, inline: true },
        { name: 'Szczegóły', value: details, inline: false },
        { name: 'Endpoint', value: `${req.method} ${req.originalUrl}`, inline: false }
      ],
      0xFF0000 // Red color
    );
  } catch (e) {
    logger.error('Failed to send Discord alert:', e);
  }
};

/**
 * Middleware to track 403/404 responses (Potential Enumeration/Scanning)
 * Should be placed AFTER routes or handled via a wrapper/interceptor
 * But easiest way in Express without modifying all routes is to attach a listener to res.on('finish')
 */
const monitorAccessPatterns = (req, res, next) => {
  // Capture the start time
  const start = Date.now();

  // Hook into response finish to check status code
  res.on('finish', () => {
    const status = res.statusCode;
    
    // Check for suspicious errors (401, 403, 404)
    if (status === 401 || status === 403 || status === 404) {
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      const userId = req.userId ? `User:${req.userId}` : `IP:${ip}`;
      const resource = req.originalUrl;

      let tracker = failedAccessAttempts.get(userId);
      if (!tracker || Date.now() > tracker.resetTime) {
        tracker = { count: 0, resetTime: Date.now() + CONFIG.windowMs, details: new Set() };
      }

      tracker.count++;
      tracker.details.add(`${status} ${resource}`);
      failedAccessAttempts.set(userId, tracker);

      if (tracker.count >= CONFIG.maxFailedAttempts) {
        sendSecurityAlert(
          'Podejrzane skanowanie zasobów (IDOR/Enumeration)',
          userId,
          `Przekroczono limit błędów dostępu (${tracker.count} w ciągu minuty). Zasoby: ${Array.from(tracker.details).join(', ').substring(0, 500)}`,
          req
        );
      }
    }
  });

  next();
};

/**
 * Middleware to protect against bulk data scraping (e.g. fetching thousands of products)
 * Place this on sensitive list endpoints (GET /products, GET /orders)
 */
const detectDataScraping = (req, res, next) => {
  const userId = req.userId;
  if (!userId) return next();

  const key = `User:${userId}`;
  let tracker = rapidResourceAccess.get(key);
  
  if (!tracker || Date.now() > tracker.resetTime) {
    tracker = { count: 0, resetTime: Date.now() + CONFIG.windowMs };
  }

  tracker.count++;
  rapidResourceAccess.set(key, tracker);

  if (tracker.count > CONFIG.maxResourceAccess) {
    // We don't block immediately to avoid false positives affecting UX, but we alert
    sendSecurityAlert(
      'Masowe pobieranie danych',
      `User:${userId}`,
      `Użytkownik wykonał ${tracker.count} zapytań w ciągu minuty.`,
      req
    );
  }

  next();
};

/**
 * Middleware to ensure request user matches resource owner for ID parameters
 * Basic IDOR protection helper
 * @param {string} paramName - Name of the parameter containing ID (default: 'id')
 * @param {string} tableName - Table to check against
 * @param {string} ownerColumn - Column name for owner ID (default: 'user_id')
 */
const checkResourceOwnership = (tableName, paramName = 'id', ownerColumn = 'user_id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramName];
      const userId = req.userId;

      if (!resourceId || !userId) {
        return next();
      }

      const [rows] = await db.execute(
        `SELECT ${ownerColumn} FROM ${tableName} WHERE id = ?`,
        [resourceId]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      if (rows[0][ownerColumn] !== userId) {
        logger.warn(`[IDOR PREVENTED] User ${userId} tried to access ${tableName} ${resourceId} owned by ${rows[0][ownerColumn]}`);
        
        // Log this specifically
        await sendSecurityAlert(
            'Próba nieautoryzowanego dostępu (IDOR)',
            `User:${userId}`,
            `Próba dostępu do zasobu ${tableName}:${resourceId} należącego do innego użytkownika.`,
            req
        );

        return res.status(403).json({ error: 'Access denied' });
      }

      next();
    } catch (error) {
      logger.error('Ownership check error:', error);
      next(error);
    }
  };
};

module.exports = {
  monitorAccessPatterns,
  detectDataScraping,
  checkResourceOwnership
};

