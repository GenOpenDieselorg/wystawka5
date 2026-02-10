const { sendDiscordWebhook } = require('../services/notificationService');

// Cache for deduplication (prevent spamming Discord)
const errorCache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute
const MAX_ERRORS_PER_MINUTE = 10;
let recentErrorCount = 0;
let resetTime = Date.now() + 60000;

// Reset counter periodically
setInterval(() => {
  recentErrorCount = 0;
  resetTime = Date.now() + 60000;
  
  // Cleanup cache
  const now = Date.now();
  for (const [key, timestamp] of errorCache.entries()) {
    if (now - timestamp > CACHE_TTL) {
      errorCache.delete(key);
    }
  }
}, 60000);

/**
 * Report a dangerous situation or system error to Discord
 * @param {Error|string} error - The error object or message
 * @param {Object} context - Additional context (req, user, etc.)
 * @param {string} type - 'ERROR', 'WARNING', 'SECURITY'
 */
const reportToDiscord = async (error, context = {}, type = 'ERROR') => {
  try {
    // Rate limiting
    if (recentErrorCount >= MAX_ERRORS_PER_MINUTE) return;

    const message = error?.message || (typeof error === 'string' ? error : 'Unknown error');
    const stack = error?.stack || 'No stack trace';
    
    // Deduplication key
    const errorKey = `${type}:${message}:${context.path || 'unknown'}`;
    
    if (errorCache.has(errorKey)) return;
    errorCache.set(errorKey, Date.now());
    recentErrorCount++;

    const color = type === 'SECURITY' ? 0xFF0000 : (type === 'ERROR' ? 0xE74C3C : 0xF1C40F);
    const title = type === 'SECURITY' ? '🚨 SECURITY ALERT' : (type === 'ERROR' ? '🔥 SYSTEM ERROR' : '⚠️ WARNING');

    const fields = [
      { name: 'Message', value: message.substring(0, 1000), inline: false }
    ];

    if (context.path) {
      fields.push({ name: 'Path', value: `${context.method || ''} ${context.path}`, inline: true });
    }

    if (context.ip) {
      fields.push({ name: 'IP', value: context.ip, inline: true });
    }

    if (context.user) {
      fields.push({ 
        name: 'User', 
        value: `${context.user.email || 'No Email'} (${context.user.id || 'No ID'})`, 
        inline: true 
      });
    }
    
    if (type === 'ERROR' || type === 'SECURITY') {
      fields.push({ name: 'Stack', value: `\`\`\`${stack.substring(0, 1000)}\`\`\``, inline: false });
    }

    await sendDiscordWebhook(title, `Wykryto zdarzenie typu **${type}**`, fields, color);

  } catch (e) {
    // Fail silently to avoid loops
    console.error('Failed to send Discord report', e);
  }
};

module.exports = reportToDiscord;
