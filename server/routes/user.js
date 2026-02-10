const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/database');
const authenticate = require('../middleware/auth');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const logActivity = require('../utils/activityLogger');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sendNotification, sendDiscordWebhook } = require('../services/notificationService');
const { createEmailTemplate } = require('../utils/emailTemplates');
const { encrypt, decrypt } = require('../utils/encryption');

// Ensure photo_angle_modes column exists in user_preferences
const ensurePhotoAngleModesColumn = async () => {
  try {
    await db.execute('SELECT photo_angle_modes FROM user_preferences LIMIT 1');
  } catch (e) {
    if (e.code === 'ER_BAD_FIELD_ERROR') {
      console.log('Adding photo_angle_modes column to user_preferences table...');
      await db.execute('ALTER TABLE user_preferences ADD COLUMN photo_angle_modes TEXT DEFAULT NULL');
      console.log('✅ photo_angle_modes column added');
    }
  }
};
ensurePhotoAngleModesColumn();

// Ensure scanner_enabled column exists in user_preferences
const ensureScannerEnabledColumn = async () => {
  try {
    await db.execute('SELECT scanner_enabled FROM user_preferences LIMIT 1');
  } catch (e) {
    if (e.code === 'ER_BAD_FIELD_ERROR') {
      console.log('Adding scanner_enabled column to user_preferences table...');
      await db.execute('ALTER TABLE user_preferences ADD COLUMN scanner_enabled TINYINT(1) DEFAULT 1');
      // Set default value for existing users
      await db.execute('UPDATE user_preferences SET scanner_enabled = 1 WHERE scanner_enabled IS NULL');
      console.log('✅ scanner_enabled column added');
    }
  }
};
ensureScannerEnabledColumn();

// Ensure scanner_type column exists in user_preferences
const ensureScannerTypeColumn = async () => {
  try {
    await db.execute('SELECT scanner_type FROM user_preferences LIMIT 1');
  } catch (e) {
    if (e.code === 'ER_BAD_FIELD_ERROR') {
      console.log('Adding scanner_type column to user_preferences table...');
      await db.execute('ALTER TABLE user_preferences ADD COLUMN scanner_type VARCHAR(20) DEFAULT "advanced"');
      
      // Check if scanner_enabled exists to migrate data
      try {
        await db.execute('SELECT scanner_enabled FROM user_preferences LIMIT 1');
        // Set default value for existing users based on scanner_enabled
        await db.execute('UPDATE user_preferences SET scanner_type = IF(scanner_enabled = 0, "none", "advanced") WHERE scanner_type IS NULL');
      } catch (err) {
        // If scanner_enabled doesn't exist, just set default to advanced
        await db.execute('UPDATE user_preferences SET scanner_type = "advanced" WHERE scanner_type IS NULL');
      }
      
      console.log('✅ scanner_type column added');
    }
  }
};
ensureScannerTypeColumn();

// SECURITY: Generate cryptographically secure random filename
const generateSecureFilename = (originalExt) => {
  const randomBytes = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  const ext = originalExt.toLowerCase().replace(/[^a-z0-9.]/g, '') || '.jpg';
  return `${timestamp}-${randomBytes}${ext}`;
};

// Configure multer for background uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/backgrounds';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // SECURITY: Use cryptographically secure random filename
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, generateSecureFilename(ext));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const [users] = await db.execute('SELECT id, email, name, nip, two_factor_enabled, notification_preferences FROM users WHERE id = ?', [req.userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = users[0];
    const decryptedNip = user.nip ? decrypt(user.nip) : null;
    res.json({ 
      user: {
        ...user,
        nip: decryptedNip,
        two_factor_enabled: !!user.two_factor_enabled
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, nip } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Validate NIP if provided
    let nipValue = null;
    if (nip !== undefined && nip !== null && String(nip).trim() !== '') {
      const nipStr = String(nip);
      const nipDigits = nipStr.replace(/\D/g, ''); // Remove non-digits
      
      if (nipDigits.length !== 10) {
        return res.status(400).json({ error: 'NIP musi zawierać dokładnie 10 cyfr' });
      }
      nipValue = nipDigits;
    }

    const encryptedNip = nipValue ? encrypt(nipValue) : null;

    await db.execute('UPDATE users SET name = ?, nip = ? WHERE id = ?', [name, encryptedNip, req.userId]);
    
    await logActivity(req, req.userId, 'profile_update', { name, nip: nipValue });
    
    const [users] = await db.execute('SELECT id, email, name, nip, two_factor_enabled FROM users WHERE id = ?', [req.userId]);
    const updatedUser = users[0];
    const decryptedNip = updatedUser.nip ? decrypt(updatedUser.nip) : null;
    
    res.json({ user: { ...updatedUser, nip: decryptedNip }, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update notification preferences
router.put('/notifications', authenticate, async (req, res) => {
  try {
    const { notifications } = req.body;
    
    // Validate that notifications is an object
    if (!notifications || typeof notifications !== 'object') {
      return res.status(400).json({ error: 'Invalid notifications data' });
    }
    
    // Store as JSON string in the DB (since our mock DB is JSON based, we could store object, but sticking to consistency with potential SQL)
    // Actually, the DB mock handles objects fine if we don't stringify, but let's stringify to be safe for "TEXT" column simulation if we were on SQL.
    // However, looking at `db.js`, it just writes to JSON. But `user_preferences` table has specific fields. 
    // Wait, I added `notification_preferences` to the `users` table, not `user_preferences`.
    
    // So I update `users` table.
    
    await db.execute(
      'UPDATE users SET notification_preferences = ? WHERE id = ?',
      [JSON.stringify(notifications), req.userId]
    );
    
    await logActivity(req, req.userId, 'settings_update', { type: 'notifications' });
    
    res.json({ message: 'Notification preferences updated successfully' });
    
  } catch (error) {
    console.error('Update notifications error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// SECURITY: Password strength validation
const validatePassword = (password) => {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Hasło musi mieć minimum 8 znaków');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Hasło musi zawierać przynajmniej jedną wielką literę');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Hasło musi zawierać przynajmniej jedną małą literę');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Hasło musi zawierać przynajmniej jedną cyfrę');
  }
  
  return errors;
};

// Change password
router.put('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    // SECURITY: Validate new password strength
    const passwordErrors = validatePassword(newPassword);
    if (passwordErrors.length > 0) {
      return res.status(400).json({ error: passwordErrors.join('. ') });
    }

    // Get user
    const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [req.userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    
    // Check if user has password (OAuth users might not have one)
    if (!user.password) {
      return res.status(400).json({ error: 'Password change not available for OAuth users' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      await logActivity(req, req.userId, 'password_change_failed');
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await db.execute('UPDATE users SET password = ?, last_password_change = NOW() WHERE id = ?', [hashedPassword, req.userId]);
    
    // SECURITY: Invalidate all existing sessions (revoke refresh tokens)
    await db.execute('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?', [req.userId]);

    await logActivity(req, req.userId, 'password_change');

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Change Email
router.put('/email', authenticate, async (req, res) => {
  try {
    const { password, newEmail } = req.body;

    if (!password || !newEmail) {
      return res.status(400).json({ error: 'Password and new email are required' });
    }

    const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [req.userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = users[0];

    // Verify password
    if (!user.password) {
      return res.status(400).json({ error: 'Email change not available for OAuth users' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      await logActivity(req, req.userId, 'email_change_failed');
      return res.status(401).json({ error: 'Incorrect password' });
    }

    // Check if new email is taken
    const [existingUsers] = await db.execute('SELECT * FROM users WHERE email = ?', [newEmail]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Store old email for notifications
    const oldEmail = user.email;

    // Update email
    await db.execute('UPDATE users SET email = ? WHERE id = ?', [newEmail, req.userId]);
    
    await logActivity(req, req.userId, 'email_change', { oldEmail, newEmail });

    // Get updated user data for notifications
    const [updatedUsers] = await db.execute('SELECT * FROM users WHERE id = ?', [req.userId]);
    const updatedUser = updatedUsers[0];

    // Prepare notification data
    const changeDate = new Date();
    const dateFormatter = new Intl.DateTimeFormat('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Warsaw'
    });
    const changeTime = dateFormatter.format(changeDate).replace(',', '');
    const userAgent = req.headers['user-agent'] || 'Nieznana przeglądarka';
    const ip = req.ip || req.connection.remoteAddress;

    // Send notification to OLD email (security alert)
    const oldEmailHtml = createEmailTemplate(
      'Adres email został zmieniony',
      `
        <p>Adres email powiązany z Twoim kontem został zmieniony.</p>
        <div style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
          <p><strong>Stary adres:</strong> ${oldEmail}</p>
          <p><strong>Nowy adres:</strong> ${newEmail}</p>
        </div>
        <div style="margin-top: 20px; font-size: 13px; color: #666;">
          <p><strong>Czas zmiany:</strong> ${changeTime}</p>
          <p><strong>Adres IP:</strong> ${ip}</p>
          <p><strong>Urządzenie:</strong> ${userAgent}</p>
        </div>
        <p style="margin-top: 20px; color: #d32f2f;">
          <strong>Jeśli to nie Ty zmieniłeś adres email, natychmiast skontaktuj się z nami!</strong>
        </p>
      `,
      'Zaloguj się',
      `${process.env.FRONTEND_URL || 'https://wystawoferte.pl'}/login`
    );

    await sendNotification({ ...user, email: oldEmail }, 'generic', {
      subject: 'Adres email został zmieniony - wystawoferte.pl',
      message: `Adres email powiązany z Twoim kontem został zmieniony.\n\nStary adres: ${oldEmail}\nNowy adres: ${newEmail}\n\nCzas: ${changeTime}\nAdres IP: ${ip}\nUrządzenie: ${userAgent}\n\nJeśli to nie Ty zmieniłeś adres email, natychmiast skontaktuj się z nami!`,
      html: oldEmailHtml
    });

    // Send notification to NEW email (confirmation)
    const newEmailHtml = createEmailTemplate(
      'Adres email został zmieniony',
      `
        <p>Twój adres email został pomyślnie zmieniony.</p>
        <div style="margin-top: 20px; padding: 15px; background-color: #d4edda; border-left: 4px solid #28a745; border-radius: 4px;">
          <p><strong>Nowy adres email:</strong> ${newEmail}</p>
        </div>
        <div style="margin-top: 20px; font-size: 13px; color: #666;">
          <p><strong>Czas zmiany:</strong> ${changeTime}</p>
          <p><strong>Adres IP:</strong> ${ip}</p>
          <p><strong>Urządzenie:</strong> ${userAgent}</p>
        </div>
        <p style="margin-top: 20px;">
          Od teraz będziesz otrzymywać powiadomienia na ten adres email.
        </p>
      `,
      'Zaloguj się',
      `${process.env.FRONTEND_URL || 'https://wystawoferte.pl'}/login`
    );

    await sendNotification(updatedUser, 'generic', {
      subject: 'Adres email został zmieniony - wystawoferte.pl',
      message: `Twój adres email został pomyślnie zmieniony.\n\nNowy adres email: ${newEmail}\n\nCzas: ${changeTime}\nAdres IP: ${ip}\nUrządzenie: ${userAgent}\n\nOd teraz będziesz otrzymywać powiadomienia na ten adres email.`,
      html: newEmailHtml
    });

    // Send Discord webhook
    await sendDiscordWebhook(
      'Email zmieniony',
      `Użytkownik **${oldEmail}** zmienił adres email na **${newEmail}**.`,
      [
        { name: 'Stary email', value: oldEmail, inline: true },
        { name: 'Nowy email', value: newEmail, inline: true },
        { name: 'IP', value: ip, inline: true }
      ],
      0xff9800 // Orange
    );

    res.json({ message: 'Email updated successfully' });
  } catch (error) {
    console.error('Change email error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Activities
router.get('/activities', authenticate, async (req, res) => {
  try {
    const { type } = req.query;
    
    let query = 'SELECT * FROM user_activities WHERE user_id = ?';
    const params = [req.userId];
    
    // Filter by type if provided
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    
    query += ' ORDER BY created_at DESC LIMIT 200';
    
    const [activities] = await db.execute(query, params);
    res.json({ activities });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 2FA Setup - Generate Secret and QR
router.post('/2fa/setup', authenticate, async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({ length: 20, name: `wystawoferte.pl (${req.userEmail})` });
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 2FA Verify and Enable
router.post('/2fa/verify', authenticate, async (req, res) => {
  try {
    const { token, secret } = req.body;
    
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token
    });

    if (verified) {
      // Save secret and enable 2FA
      await db.execute(
        'UPDATE users SET two_factor_secret = ?, two_factor_enabled = ? WHERE id = ?',
        [secret, true, req.userId]
      );
      
      await logActivity(req, req.userId, '2fa_enabled');
      res.json({ message: 'Two-factor authentication enabled successfully' });
    } else {
      res.status(400).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('2FA verify error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 2FA Disable
router.post('/2fa/disable', authenticate, async (req, res) => {
  try {
    const { password, token } = req.body;

    const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [req.userId]);
    const user = users[0];

    // Verify password if set
    if (user.password) {
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Incorrect password' });
      }
    }

    // Verify token one last time (optional, but good security practice)
    if (token) {
        const verified = speakeasy.totp.verify({
            secret: user.two_factor_secret,
            encoding: 'base32',
            token: token
        });

        if (!verified) {
            return res.status(400).json({ error: 'Invalid 2FA token' });
        }
    }

    await db.execute(
      'UPDATE users SET two_factor_enabled = ? WHERE id = ?',
      [false, req.userId]
    );

    await logActivity(req, req.userId, '2fa_disabled');
    res.json({ message: 'Two-factor authentication disabled' });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


// Get user preferences
router.get('/preferences', authenticate, async (req, res) => {
  try {
    const [preferences] = await db.execute(
      'SELECT * FROM user_preferences WHERE user_id = ?',
      [req.userId]
    );
    
    if (preferences.length === 0) {
      // Create default preferences
      const defaultPrompts = JSON.stringify({});
      
      const defaultStylePrompts = JSON.stringify({
        formalny: 'Użyj formalnego, profesjonalnego stylu pisania. Bądź uprzejmy i profesjonalny.',
        nieformalny: 'Użyj nieformalnego, przyjaznego stylu pisania. Bądź bezpośredni i przyjazny.',
        marketingowy: 'Użyj stylu marketingowego z elementami perswazji. Podkreśl zalety i korzyści produktu.',
        techniczny: 'Użyj technicznego stylu pisania. Skup się na specyfikacjach i parametrach technicznych.'
      });
      
      await db.execute(
        'INSERT INTO user_preferences (user_id, ai_provider, use_allegro_ean_lookup, dark_mode, auto_publish_offers, ai_prompts, ai_style_prompts, default_image_edit_mode, default_bg_image_url, scanner_enabled, scanner_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [req.userId, 'chatgpt', false, false, false, defaultPrompts, defaultStylePrompts, 'enhance', null, true, 'advanced']
      );
      const prefs = { 
        user_id: req.userId, 
        ai_provider: 'chatgpt', 
        use_allegro_ean_lookup: false,
        dark_mode: false,
        auto_publish_offers: false,
        ai_prompts: defaultPrompts,
        ai_style_prompts: defaultStylePrompts,
        default_image_edit_mode: 'enhance',
        default_bg_image_url: null,
        scanner_enabled: true,
        scanner_type: 'advanced'
      };
      
      // Parse JSON fields
      if (typeof prefs.ai_prompts === 'string') {
        try { prefs.ai_prompts = JSON.parse(prefs.ai_prompts); } catch (e) {}
      }
      if (typeof prefs.ai_style_prompts === 'string') {
        try { prefs.ai_style_prompts = JSON.parse(prefs.ai_style_prompts); } catch (e) {}
      }
      return res.json({ preferences: prefs });
    }
    
    const prefs = preferences[0];
    // Parse ai_prompts if it's a string
    if (prefs.ai_prompts && typeof prefs.ai_prompts === 'string') {
      try { prefs.ai_prompts = JSON.parse(prefs.ai_prompts); } catch (e) {}
    } else if (!prefs.ai_prompts) {
      prefs.ai_prompts = {};
    }
    
    // Parse ai_style_prompts if it's a string
    if (prefs.ai_style_prompts && typeof prefs.ai_style_prompts === 'string') {
      try { prefs.ai_style_prompts = JSON.parse(prefs.ai_style_prompts); } catch (e) {}
    } else if (!prefs.ai_style_prompts) {
      prefs.ai_style_prompts = {
        formalny: 'Użyj formalnego, profesjonalnego stylu pisania. Bądź uprzejmy i profesjonalny.',
        nieformalny: 'Użyj nieformalnego, przyjaznego stylu pisania. Bądź bezpośredni i przyjazny.',
        marketingowy: 'Użyj stylu marketingowego z elementami perswazji. Podkreśl zalety i korzyści produktu.',
        techniczny: 'Użyj technicznego stylu pisania. Skup się na specyfikacjach i parametrach technicznych.'
      };
    }
    
    // Ensure dark_mode exists
    if (prefs.dark_mode === undefined || prefs.dark_mode === null) {
      prefs.dark_mode = false;
    }

    // Ensure auto_publish_offers exists
    if (prefs.auto_publish_offers === undefined || prefs.auto_publish_offers === null) {
      prefs.auto_publish_offers = false;
    }

    // Default image edit mode
    if (!prefs.default_image_edit_mode) {
      prefs.default_image_edit_mode = 'enhance';
    }
    
    // Convert MySQL TINYINT(1) to boolean for use_allegro_ean_lookup and dark_mode
    if (prefs.use_allegro_ean_lookup !== undefined && prefs.use_allegro_ean_lookup !== null) {
      prefs.use_allegro_ean_lookup = prefs.use_allegro_ean_lookup === 1 || prefs.use_allegro_ean_lookup === true;
    }
    if (prefs.dark_mode !== undefined && prefs.dark_mode !== null) {
      prefs.dark_mode = prefs.dark_mode === 1 || prefs.dark_mode === true;
    }
    if (prefs.auto_publish_offers !== undefined && prefs.auto_publish_offers !== null) {
      prefs.auto_publish_offers = prefs.auto_publish_offers === 1 || prefs.auto_publish_offers === true;
    }
    if (prefs.scanner_enabled !== undefined && prefs.scanner_enabled !== null) {
      prefs.scanner_enabled = prefs.scanner_enabled === 1 || prefs.scanner_enabled === true;
    }
    
    res.json({ preferences: prefs });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user preferences
router.put('/preferences', authenticate, async (req, res) => {
  try {
    const { ai_provider, description_style, description_category, description_sentence_length, use_allegro_ean_lookup, dark_mode, auto_publish_offers, ai_prompts, ai_style_prompts, default_image_edit_mode, default_bg_image_url, photo_angle_modes, scanner_enabled, scanner_type } = req.body;
    
    // Validate AI provider
    if (ai_provider && !['chatgpt', 'gemini'].includes(ai_provider)) {
      return res.status(400).json({ error: 'Invalid AI provider. Must be chatgpt or gemini' });
    }
    
    // Validate edit mode - fallback to 'enhance' if invalid instead of rejecting
    const validEditModes = [
      'enhance', 'remove_bg', 'replace_bg', 'blur_background', 'ai_square',
      'crop_center', 'resize_square', 'adjust_brightness', 'adjust_contrast',
      'sharpen', 'saturate', 'grayscale', 'vintage'
    ];
    if (default_image_edit_mode && !validEditModes.includes(default_image_edit_mode)) {
      console.warn(`Invalid edit mode received: "${default_image_edit_mode}", falling back to "enhance"`);
      req.body.default_image_edit_mode = 'enhance';
    }

    // Check if preferences exist
    const [preferences] = await db.execute(
      'SELECT * FROM user_preferences WHERE user_id = ?',
      [req.userId]
    );
    
    if (preferences.length === 0) {
      // Create preferences
      const defaultPrompts = JSON.stringify({});
      
      const defaultStylePrompts = JSON.stringify({
        formalny: 'Użyj formalnego, profesjonalnego stylu pisania. Bądź uprzejmy i profesjonalny.',
        nieformalny: 'Użyj nieformalnego, przyjaznego stylu pisania. Bądź bezpośredni i przyjazny.',
        marketingowy: 'Użyj stylu marketingowego z elementami perswazji. Podkreśl zalety i korzyści produktu.',
        techniczny: 'Użyj technicznego stylu pisania. Skup się na specyfikacjach i parametrach technicznych.'
      });
      
      await db.execute(
        'INSERT INTO user_preferences (user_id, ai_provider, description_style, description_category, description_sentence_length, use_allegro_ean_lookup, dark_mode, auto_publish_offers, ai_prompts, ai_style_prompts, default_image_edit_mode, default_bg_image_url, scanner_enabled, scanner_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          req.userId, 
          ai_provider || 'chatgpt',
          description_style || null,
          description_category || null,
          description_sentence_length || null,
          use_allegro_ean_lookup !== undefined ? use_allegro_ean_lookup : false,
          dark_mode !== undefined ? dark_mode : false,
          auto_publish_offers !== undefined ? auto_publish_offers : false,
          ai_prompts ? (typeof ai_prompts === 'string' ? ai_prompts : JSON.stringify(ai_prompts)) : defaultPrompts,
          ai_style_prompts ? (typeof ai_style_prompts === 'string' ? ai_style_prompts : JSON.stringify(ai_style_prompts)) : defaultStylePrompts,
          default_image_edit_mode || 'enhance',
          default_bg_image_url || null,
          scanner_enabled !== undefined ? scanner_enabled : true,
          scanner_type || 'advanced'
        ]
      );
    } else {
      // Update preferences
      const updates = [];
      const values = [];
      
      if (ai_provider !== undefined) {
        updates.push('ai_provider = ?');
        values.push(ai_provider);
      }
      if (description_style !== undefined) {
        updates.push('description_style = ?');
        values.push(description_style);
      }
      if (description_category !== undefined) {
        updates.push('description_category = ?');
        values.push(description_category);
      }
      if (description_sentence_length !== undefined) {
        updates.push('description_sentence_length = ?');
        values.push(description_sentence_length);
      }
      if (use_allegro_ean_lookup !== undefined) {
        updates.push('use_allegro_ean_lookup = ?');
        values.push(use_allegro_ean_lookup);
      }
      if (dark_mode !== undefined) {
        updates.push('dark_mode = ?');
        values.push(dark_mode);
      }
      if (auto_publish_offers !== undefined) {
        updates.push('auto_publish_offers = ?');
        values.push(auto_publish_offers);
      }
      if (ai_prompts !== undefined) {
        updates.push('ai_prompts = ?');
        values.push(typeof ai_prompts === 'string' ? ai_prompts : JSON.stringify(ai_prompts));
      }
      if (ai_style_prompts !== undefined) {
        updates.push('ai_style_prompts = ?');
        values.push(typeof ai_style_prompts === 'string' ? ai_style_prompts : JSON.stringify(ai_style_prompts));
      }
      if (default_image_edit_mode !== undefined) {
        updates.push('default_image_edit_mode = ?');
        values.push(default_image_edit_mode);
      }
      if (default_bg_image_url !== undefined) {
        updates.push('default_bg_image_url = ?');
        values.push(default_bg_image_url);
      }
      if (photo_angle_modes !== undefined) {
        updates.push('photo_angle_modes = ?');
        values.push(typeof photo_angle_modes === 'string' ? photo_angle_modes : JSON.stringify(photo_angle_modes));
      }
      if (scanner_enabled !== undefined) {
        updates.push('scanner_enabled = ?');
        values.push(scanner_enabled);
      }
      if (scanner_type !== undefined) {
        updates.push('scanner_type = ?');
        values.push(scanner_type);
      }
      
      if (updates.length > 0) {
        values.push(req.userId);
        await db.execute(
          `UPDATE user_preferences SET ${updates.join(', ')} WHERE user_id = ?`,
          values
        );
        await logActivity(req, req.userId, 'settings_update', { updated_fields: updates.map(u => u.split(' = ')[0]) });
      }
    }
    
    res.json({ message: 'Preferences updated successfully' });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload background image
router.post('/preferences/background', authenticate, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }
    
    const imageUrl = `/uploads/backgrounds/${req.file.filename}`;
    
    res.json({ 
      message: 'Background image uploaded', 
      imageUrl 
    });
  } catch (error) {
    console.error('Background upload error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get wallet info
router.get('/wallet', authenticate, async (req, res) => {
  try {
    // Get or create wallet
    const [wallets] = await db.execute('SELECT * FROM wallet WHERE user_id = ?', [req.userId]);
    
    let wallet;
    if (wallets.length === 0) {
      // Create wallet with 0 balance
      const [result] = await db.execute(
        'INSERT INTO wallet (user_id, balance, offers_created) VALUES (?, ?, ?)',
        [req.userId, 0, 0]
      );
      wallet = {
        id: result.insertId,
        user_id: req.userId,
        balance: 0,
        offers_created: 0
      };
    } else {
      wallet = wallets[0];
    }

    // Get transactions
    const [transactions] = await db.execute(
      `SELECT t.*, p.product_name 
       FROM transactions t 
       LEFT JOIN products p ON t.product_id = p.id 
       WHERE t.user_id = ? 
       ORDER BY t.created_at DESC LIMIT 50`,
      [req.userId]
    );

    res.json({
      wallet: {
        balance: parseFloat(wallet.balance || 0),
        offersCreated: parseInt(wallet.offers_created || 0),
        bulkEditsCount: parseInt(wallet.bulk_edits_count || 0)
      },
      transactions: transactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: parseFloat(t.amount),
        status: t.status,
        created_at: t.created_at,
        product_name: t.product_name,
        description: t.description,
        product_id: t.product_id
      }))
    });
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
