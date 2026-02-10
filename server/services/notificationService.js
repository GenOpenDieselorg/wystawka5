const nodemailer = require('nodemailer');
const notifier = require('node-notifier');
const path = require('path');
const db = require('../config/database');
const axios = require('axios');

// Configure email transport
const createTransporter = () => {
  // Use environment variables or default to a test account (Ethereal) if not set
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // For development without SMTP credentials, log the email content
    console.warn('SMTP credentials not found. Emails will be logged to console.');
    return {
      sendMail: async (mailOptions) => {
        console.log('--- MOCK EMAIL SENT ---');
        console.log('To:', mailOptions.to);
        console.log('Subject:', mailOptions.subject);
        console.log('Text:', mailOptions.text);
        console.log('HTML:', mailOptions.html);
        console.log('-----------------------');
        return { messageId: 'mock-email-id' };
      }
    };
  }
};

const transporter = createTransporter();

/**
 * Send a notification based on user preferences.
 * @param {object} user - User object with notification_preferences
 * @param {string} type - Notification type (e.g., 'login', 'password_reset', 'generic')
 * @param {object} data - Data for the notification (subject, message, html)
 */
const sendNotification = async (user, type, data) => {
  if (!user) return;

  const preferences = typeof user.notification_preferences === 'string' 
    ? JSON.parse(user.notification_preferences || '{}') 
    : (user.notification_preferences || {});

  // Default preferences if not set
  const notifyEmail = preferences.email !== false; // Default true
  const notifySystem = preferences.system !== false; // Default true
  
  // Password reset notifications are always sent (security critical)
  const notifyType = type === 'password_reset' ? true : (preferences[type] !== false); // Default true for specific type

  if (!notifyType) return;

  // 1. Send Email Notification
  if (notifyEmail && user.email) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"wystawoferte.pl System" <noreply@wystawoferte.pl>',
        to: user.email,
        subject: data.subject,
        text: data.message, // Plain text body
        html: data.html || `<p>${data.message}</p>`, // HTML body
        charset: 'UTF-8'
      });
      console.log(`Email notification sent to ${user.email} for ${type}`);
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  }

  // 2. Send System Notification (Server-side)
  // Note: This shows a notification on the server machine. 
  // Useful for local dev or if the user is the admin running the server.
  if (notifySystem) {
    try {
      notifier.notify({
        title: data.subject,
        message: data.message,
        icon: path.join(__dirname, '../../client/public/logo192.png'), // Optional icon
        sound: true,
        wait: false
      });
      console.log(`System notification sent for ${type}`);
    } catch (error) {
      console.error('Error sending system notification:', error);
    }
  }
};

/**
 * Send a Discord webhook notification
 * @param {string} title - Embed title
 * @param {string} description - Embed description
 * @param {Array} fields - Array of fields {name, value, inline}
 * @param {number} color - Hex color code (default blue)
 */
const sendDiscordWebhook = async (title, description, fields = [], color = 0x3498db) => {
  if (!process.env.DISCORD_WEBHOOK_URL) return;

  try {
    await axios.post(process.env.DISCORD_WEBHOOK_URL, {
      embeds: [{
        title,
        description,
        fields,
        color,
        timestamp: new Date().toISOString(),
        footer: {
          text: 'wystawoferte.pl System'
        }
      }]
    });
  } catch (error) {
    console.error('Error sending Discord webhook:', error.message);
  }
};

module.exports = {
  sendNotification,
  sendDiscordWebhook,
  transporter
};

