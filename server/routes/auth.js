const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const db = require('../config/database');
const logActivity = require('../utils/activityLogger');
const speakeasy = require('speakeasy');
const { OAuth2Client } = require('google-auth-library');
const { sendNotification, sendDiscordWebhook } = require('../services/notificationService');
const { verifyTurnstileToken } = require('../services/turnstile');
const { createEmailTemplate } = require('../utils/emailTemplates');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const Joi = require('joi');
const { encrypt, decrypt } = require('../utils/encryption');
const { v4: uuidv4 } = require('uuid');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not defined!');
}

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || crypto.randomBytes(32).toString('hex');

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000 // 15 minutes
};

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

// Ensure last_password_change column exists in users
const ensureLastPasswordChangeColumn = async () => {
  try {
    await db.execute('SELECT last_password_change FROM users LIMIT 1');
  } catch (e) {
    if (e.code === 'ER_BAD_FIELD_ERROR') {
      console.log('Adding last_password_change column to users table...');
      await db.execute('ALTER TABLE users ADD COLUMN last_password_change DATETIME DEFAULT NULL');
      console.log('✅ last_password_change column added');
    }
  }
};
ensureLastPasswordChangeColumn();

// Helper to generate tokens
const generateTokens = async (user, ip, userAgent) => {
  // 1. Access Token (Short-lived: 15m)
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { 
      expiresIn: '15m',
      jwtid: uuidv4() // Add JTI for blacklisting
    }
  );

  // 2. Refresh Token (Long-lived: 7d)
  const refreshToken = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // SECURITY: Limit concurrent sessions (Max 5)
  // Remove oldest sessions if limit reached
  try {
    const [tokens] = await db.execute(
      'SELECT id FROM refresh_tokens WHERE user_id = ? AND revoked = 0 ORDER BY created_at ASC',
      [user.id]
    );
    
    const MAX_SESSIONS = 5;
    if (tokens.length >= MAX_SESSIONS) {
      // Delete oldest tokens to maintain limit
      // If we have 5, we need to delete 1 before adding new one.
      // If we have 10 (due to some error), we delete 6.
      const deleteCount = tokens.length - MAX_SESSIONS + 1;
      const tokensToDelete = tokens.slice(0, deleteCount);
      
      if (tokensToDelete.length > 0) {
        const ids = tokensToDelete.map(t => t.id);
        // Create placeholders for IN clause (?, ?, ?)
        const placeholders = ids.map(() => '?').join(',');
        await db.execute(
          `DELETE FROM refresh_tokens WHERE id IN (${placeholders})`,
          ids
        );
      }
    }
  } catch (e) {
    console.error('Error enforcing session limit:', e);
    // Continue even if cleanup fails
  }

  // Store refresh token in DB
  // In production, we should hash this token before storing
  const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await db.execute(
    'INSERT INTO refresh_tokens (user_id, token, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
    [user.id, hashedRefreshToken, expiresAt, ip, userAgent]
  );

  return { accessToken, refreshToken };
};

// SECURITY: Rate limiter for login attempts (brute-force protection)
// Using validate: false to disable IPv6 validation warning since we're combining
// email with IP for more precise rate limiting per user
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  skipSuccessfulRequests: true, // Don't count successful logins
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zbyt wiele prób logowania. Spróbuj ponownie za 15 minut.' },
  // Disable validation to allow custom keyGenerator with email+IP combination
  // This provides better security (per-user limits) while avoiding IPv6 validation issues
  validate: false,
  keyGenerator: (req) => {
    // Combine email with IP for per-user rate limiting
    // req.ip is properly handled by express when trust proxy is set in server/index.js
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const email = req.body?.email || 'unknown';
    return `login:${email}:${ip}`;
  }
});

// SECURITY: Rate limiter for registration (spam protection)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 registrations per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zbyt wiele rejestracji z tego adresu IP. Spróbuj ponownie za godzinę.' }
});

// SECURITY: Rate limiter for password reset (abuse protection)
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 reset requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zbyt wiele prób resetowania hasła. Spróbuj ponownie za godzinę.' }
});

// Validation Schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Nieprawidłowy format adresu email',
    'any.required': 'Email jest wymagany'
  }),
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('(?=.*[a-z])'))
    .pattern(new RegExp('(?=.*[A-Z])'))
    .pattern(new RegExp('(?=.*[0-9])'))
    .required()
    .messages({
      'string.min': 'Hasło musi mieć minimum 8 znaków',
      'string.pattern.base': 'Hasło musi zawierać małą literę, dużą literę i cyfrę',
      'any.required': 'Hasło jest wymagane'
    }),
  name: Joi.string().required().messages({
    'any.required': 'Imię jest wymagane'
  }),
  nip: Joi.string().pattern(/^\d{10}$/).allow('').allow(null).optional().messages({
    'string.pattern.base': 'NIP musi składać się z 10 cyfr'
  }),
  referralCode: Joi.string().allow('').allow(null).optional(),
  turnstileToken: Joi.string().min(1).required().messages({
    'any.required': 'Weryfikacja antybotowa jest wymagana',
    'string.empty': 'Weryfikacja antybotowa wygasła. Odśwież stronę i spróbuj ponownie.',
    'string.min': 'Weryfikacja antybotowa wygasła. Odśwież stronę i spróbuj ponownie.'
  })
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Nieprawidłowy format adresu email',
    'any.required': 'Email jest wymagany'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Hasło jest wymagane'
  }),
  code: Joi.string().allow('').allow(null).optional(), // 2FA code
  turnstileToken: Joi.string().min(1).required().messages({
    'any.required': 'Weryfikacja antybotowa jest wymagana',
    'string.empty': 'Weryfikacja antybotowa wygasła. Odśwież stronę i spróbuj ponownie.',
    'string.min': 'Weryfikacja antybotowa wygasła. Odśwież stronę i spróbuj ponownie.'
  })
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Nieprawidłowy format adresu email',
    'any.required': 'Email jest wymagany'
  }),
  turnstileToken: Joi.string().min(1).required().messages({
    'any.required': 'Weryfikacja antybotowa jest wymagana',
    'string.empty': 'Weryfikacja antybotowa wygasła. Odśwież stronę i spróbuj ponownie.',
    'string.min': 'Weryfikacja antybotowa wygasła. Odśwież stronę i spróbuj ponownie.'
  })
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Token jest wymagany'
  }),
  newPassword: Joi.string()
    .min(8)
    .pattern(new RegExp('(?=.*[a-z])'))
    .pattern(new RegExp('(?=.*[A-Z])'))
    .pattern(new RegExp('(?=.*[0-9])'))
    .required()
    .messages({
      'string.min': 'Hasło musi mieć minimum 8 znaków',
      'string.pattern.base': 'Hasło musi zawierać małą literę, dużą literę i cyfrę',
      'any.required': 'Hasło jest wymagane'
    }),
  turnstileToken: Joi.string().min(1).required().messages({
    'any.required': 'Weryfikacja antybotowa jest wymagana',
    'string.empty': 'Weryfikacja antybotowa wygasła. Odśwież stronę i spróbuj ponownie.',
    'string.min': 'Weryfikacja antybotowa wygasła. Odśwież stronę i spróbuj ponownie.'
  })
});

// Register
router.post('/register', registerLimiter, validate(registerSchema), async (req, res) => {
  try {
    const { email, password, name, nip, referralCode, turnstileToken } = req.body;

    // SECURITY: Turnstile verification
    const isTurnstileValid = await verifyTurnstileToken(turnstileToken, req.ip);
    if (!isTurnstileValid) {
      return res.status(400).json({ error: 'Weryfikacja antybotowa nie powiodła się. Odśwież stronę i spróbuj ponownie.' });
    }

    // Check if user exists
    const [existingUsers] = await db.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user - use only digits for NIP
    const nipValue = nip && nip.trim() !== '' ? nip.replace(/\D/g, '') : null;
    const encryptedNip = nipValue ? encrypt(nipValue) : null;
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const [result] = await db.execute(
      'INSERT INTO users (email, password, name, nip, verification_token, is_verified) VALUES (?, ?, ?, ?, ?, ?)',
      [email, hashedPassword, name, encryptedNip, verificationToken, 0]
    );

    const userId = result.insertId;

    // Send verification email
    const verifyUrl = `${process.env.FRONTEND_URL || 'https://wystawoferte.pl'}/verify-email/${verificationToken}`;
    
    const registerDate = new Date();
    const dateFormatter = new Intl.DateTimeFormat('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Warsaw'
    });
    const registerTime = dateFormatter.format(registerDate).replace(',', '');
    const userAgent = req.headers['user-agent'] || 'Nieznana przeglądarka';
    const ip = req.ip || req.connection.remoteAddress;

    const emailHtml = createEmailTemplate(
      'Potwierdzenie rejestracji',
      `
        <p>Dziękujemy za założenie konta w serwisie wystawoferte.pl.</p>
        <p>Kliknij w poniższy przycisk, aby aktywować swoje konto:</p>
        <div style="margin-top: 20px; font-size: 13px; color: #666;">
          <p><strong>Czas rejestracji:</strong> ${registerTime}</p>
          <p><strong>Adres IP:</strong> ${ip}</p>
          <p><strong>Urządzenie:</strong> ${userAgent}</p>
        </div>
      `,
      'Potwierdź konto',
      verifyUrl,
      'Jeśli to nie Ty zakładałeś konto, zignoruj tę wiadomość.'
    );

    await sendNotification({ email, notification_preferences: { email: true } }, 'generic', {
      subject: 'Potwierdzenie rejestracji - wystawoferte.pl',
      message: `Dziękujemy za rejestrację. Kliknij w link, aby potwierdzić konto: ${verifyUrl}\n\nCzas: ${registerTime}\nAdres IP: ${ip}\nUrządzenie: ${userAgent}`,
      html: emailHtml
    });

    // Process referral code - if code is "STARTUJE", add 50 PLN to wallet
    let referralBonus = 0;
    if (referralCode && referralCode.trim().toUpperCase() === 'STARTUJE') {
      referralBonus = 50.00;
      
      // Create wallet with bonus
      const [walletResult] = await db.execute(
        'INSERT INTO wallet (user_id, balance, offers_created) VALUES (?, ?, ?)',
        [userId, referralBonus, 0]
      );

      // Create transaction record for referral bonus
      await db.execute(
        'INSERT INTO transactions (user_id, type, amount, status) VALUES (?, ?, ?, ?)',
        [userId, 'referral_bonus', referralBonus, 'completed']
      );
    } else {
      // Create wallet with 0 balance if no valid referral code
      await db.execute(
        'INSERT INTO wallet (user_id, balance, offers_created) VALUES (?, ?, ?)',
        [userId, 0, 0]
      );
    }

    // Log activity
    await logActivity(req, userId, 'register', { email });

    // Send Discord webhook
    await sendDiscordWebhook(
      'Nowy użytkownik zarejestrowany',
      `Użytkownik **${email}** utworzył nowe konto.`,
      [
        { name: 'Email', value: email, inline: true },
        { name: 'Nazwa', value: name, inline: true },
        { name: 'NIP', value: nip || 'Brak', inline: true },
        { name: 'Kod polecający', value: referralCode || 'Brak', inline: true }
      ],
      0x2ecc71 // Green
    );

    // Do NOT return token immediately, require verification
    res.status(201).json({
      message: 'User created successfully. Please verify your email.',
      requiresVerification: true,
      user: {
        id: userId,
        email,
        name,
        nip: nipValue || null
      },
      referralBonus: referralBonus > 0 ? referralBonus : undefined
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', loginLimiter, validate(loginSchema), async (req, res) => {
  try {
    const { email, password, code, turnstileToken } = req.body;

    // SECURITY: Turnstile verification
    const isTurnstileValid = await verifyTurnstileToken(turnstileToken, req.ip);
    if (!isTurnstileValid) {
      return res.status(400).json({ error: 'Weryfikacja antybotowa nie powiodła się. Odśwież stronę i spróbuj ponownie.' });
    }

    // Find user
    const [users] = await db.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      await logActivity(req, 0, 'login_failed', { email, reason: 'user_not_found' });
      return res.status(401).json({ error: 'Błędny email lub hasło' });
    }

    const user = users[0];

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      await logActivity(req, user.id, 'login_failed', { email, reason: 'wrong_password' });
      return res.status(401).json({ error: 'Błędny email lub hasło' });
    }

    // Check verification
    if (!user.is_verified) {
      return res.status(401).json({ error: 'Proszę potwierdzić adres email przed zalogowaniem.' });
    }

    // Check 2FA
    if (user.two_factor_enabled) {
      if (!code) {
        return res.status(403).json({ requires2FA: true, message: 'Two-factor authentication code required' });
      }

      const verified = speakeasy.totp.verify({
        secret: user.two_factor_secret,
        encoding: 'base32',
        token: code
      });

      if (!verified) {
        await logActivity(req, user.id, 'login_2fa_failed', { email });
        return res.status(401).json({ error: 'Invalid 2FA code' });
      }
    }

    // Log successful login
    await logActivity(req, user.id, user.two_factor_enabled ? 'login_2fa' : 'login');

    const ip = req.ip || req.connection.remoteAddress;

    // Decrypt NIP for response
    const decryptedNip = user.nip ? decrypt(user.nip) : null;

    // Send Discord webhook
    await sendDiscordWebhook(
      'Logowanie użytkownika',
      `Użytkownik **${user.email}** zalogował się.`,
      [
        { name: 'Email', value: user.email, inline: true },
        { name: 'ID', value: user.id.toString(), inline: true },
        { name: 'IP', value: ip, inline: true },
        { name: '2FA', value: user.two_factor_enabled ? 'Tak' : 'Nie', inline: true }
      ],
      0x3498db // Blue
    );

    // Send login notification
    try {
      const loginDate = new Date();
      const dateFormatter = new Intl.DateTimeFormat('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Warsaw'
      });
      const loginTime = dateFormatter.format(loginDate).replace(',', '');
      const userAgent = req.headers['user-agent'] || 'Nieznana przeglądarka';
      
      const emailHtml = createEmailTemplate(
        'Wykryto nowe logowanie',
        `
          <p>Zalogowano na Twoje konto w serwisie wystawoferte.pl.</p>
          <p><strong>Czas:</strong> ${loginTime}</p>
          <p><strong>Adres IP:</strong> ${ip}</p>
          <p><strong>Urządzenie:</strong> ${userAgent}</p>
          <p style="margin-top: 20px; color: #dc3545;">Jeśli to nie Ty, natychmiast zmień hasło.</p>
        `,
        'Zmień hasło',
        `${process.env.FRONTEND_URL || 'https://wystawoferte.pl'}/forgot-password`
      );

      await sendNotification(user, 'login', {
        subject: 'Wykryto nowe logowanie - wystawoferte.pl',
        message: `Zalogowano na Twoje konto w serwisie wystawoferte.pl.\n\nCzas: ${loginTime}\nAdres IP: ${ip}\nUrządzenie: ${userAgent}\n\nJeśli to nie Ty, natychmiast zmień hasło: ${process.env.FRONTEND_URL || 'https://wystawoferte.pl'}/forgot-password`,
        html: emailHtml
      });
    } catch (err) {
      console.error('Failed to send login notification', err);
    }

    const { accessToken, refreshToken } = await generateTokens(user, ip, req.headers['user-agent']);

    res.cookie('accessToken', accessToken, cookieOptions);
    res.cookie('refreshToken', refreshToken, refreshCookieOptions);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        nip: user.nip || null,
        two_factor_enabled: !!user.two_factor_enabled
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Forgot Password
router.post('/forgot-password', passwordResetLimiter, validate(forgotPasswordSchema), async (req, res) => {
  try {
    const { email, turnstileToken } = req.body;
    
    // SECURITY: Turnstile verification
    const isTurnstileValid = await verifyTurnstileToken(turnstileToken, req.ip);
    if (!isTurnstileValid) {
      return res.status(400).json({ error: 'Weryfikacja antybotowa nie powiodła się. Odśwież stronę i spróbuj ponownie.' });
    }
    
    const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      // Don't reveal user existence
      return res.json({ message: 'If that email is in our database, we have sent a password reset link.' });
    }
    
    const user = users[0];
    const token = crypto.randomBytes(20).toString('hex');
    const expiresDate = new Date(Date.now() + 3600000); // 1 hour
    
    // Format date for MySQL DATETIME (YYYY-MM-DD HH:MM:SS) in local time
    // This ensures consistency when the Date is read back from the DB
    const tzOffset = expiresDate.getTimezoneOffset() * 60000;
    const localDate = new Date(expiresDate.getTime() - tzOffset);
    const expires = localDate.toISOString().slice(0, 19).replace('T', ' ');
    
    // Save token to DB
    await db.execute(
      'UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE email = ?',
      [token, expires, email]
    );
    
    // Send email
    const resetUrl = `${process.env.FRONTEND_URL || 'https://wystawoferte.pl'}/reset-password/${token}`;
    
    const requestDate = new Date();
    const dateFormatter = new Intl.DateTimeFormat('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Warsaw'
    });
    const requestTime = dateFormatter.format(requestDate).replace(',', '');
    const userAgent = req.headers['user-agent'] || 'Nieznana przeglądarka';
    const ip = req.ip || req.connection.remoteAddress;

    const emailHtml = createEmailTemplate(
      'Resetowanie hasła',
      `
        <p>Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta.</p>
        <p>Kliknij w poniższy przycisk, aby ustawić nowe hasło:</p>
        <div style="margin-top: 20px; font-size: 13px; color: #666;">
          <p><strong>Czas zgłoszenia:</strong> ${requestTime}</p>
          <p><strong>Adres IP:</strong> ${ip}</p>
          <p><strong>Urządzenie:</strong> ${userAgent}</p>
        </div>
      `,
      'Resetuj hasło',
      resetUrl,
      'Link jest ważny przez godzinę. Jeśli to nie Ty prosiłeś o zmianę hasła, zignoruj tę wiadomość.'
    );

    await sendNotification(user, 'password_reset', {
      subject: 'Resetowanie hasła - wystawoferte.pl',
      message: `Otrzymaliśmy prośbę o zresetowanie hasła. Kliknij w link: ${resetUrl}\n\nCzas: ${requestTime}\nAdres IP: ${ip}\nUrządzenie: ${userAgent}`,
      html: emailHtml
    });

    // Send Discord webhook
    await sendDiscordWebhook(
      'Żądanie resetu hasła',
      `Użytkownik **${user.email}** poprosił o reset hasła.`,
      [
        { name: 'Email', value: user.email, inline: true },
        { name: 'IP', value: req.ip || 'unknown', inline: true }
      ],
      0xe67e22 // Orange
    );
    
    res.json({ message: 'If that email is in our database, we have sent a password reset link.' });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset Password
router.post('/reset-password', validate(resetPasswordSchema), async (req, res) => {
  try {
    const { token, newPassword, turnstileToken } = req.body;
    
    // SECURITY: Turnstile verification
    const isTurnstileValid = await verifyTurnstileToken(turnstileToken, req.ip);
    if (!isTurnstileValid) {
      return res.status(400).json({ error: 'Weryfikacja antybotowa nie powiodła się. Odśwież stronę i spróbuj ponownie.' });
    }
    
    // Find user with token and valid expiry
    // Note: The JSON DB is mocked, so we filter in memory using the db.execute SELECT we modified earlier
    const [users] = await db.execute('SELECT * FROM users WHERE reset_password_token = ?', [token]);
    
    // Filter for expiry manually since JSON query is simple
    const validUser = users.find(u => {
      return u.reset_password_expires && new Date(u.reset_password_expires) > new Date();
    });
    
    if (!validUser) {
      return res.status(400).json({ error: 'Password reset token is invalid or has expired.' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update user
    await db.execute(
      'UPDATE users SET password = ?, reset_password_token = NULL, reset_password_expires = NULL, last_password_change = NOW() WHERE id = ?',
      [hashedPassword, validUser.id]
    );

    // SECURITY: Invalidate all existing sessions (revoke refresh tokens)
    await db.execute('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?', [validUser.id]);
    
    // Log activity
    await logActivity(req, validUser.id, 'password_change');
    
    // Notify
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

    const emailHtml = createEmailTemplate(
      'Hasło zmienione',
      `
        <p>Hasło do Twojego konta zostało pomyślnie zmienione. Możesz się teraz zalogować używając nowego hasła.</p>
        <div style="margin-top: 20px; font-size: 13px; color: #666;">
          <p><strong>Czas zmiany:</strong> ${changeTime}</p>
          <p><strong>Adres IP:</strong> ${ip}</p>
          <p><strong>Urządzenie:</strong> ${userAgent}</p>
        </div>
      `,
      'Zaloguj się',
      `${process.env.FRONTEND_URL || 'https://wystawoferte.pl'}/login`
    );

    await sendNotification(validUser, 'generic', {
      subject: 'Twoje hasło zostało zmienione',
      message: `Hasło do Twojego konta wystawoferte.pl zostało pomyślnie zmienione.\n\nCzas: ${changeTime}\nAdres IP: ${ip}\nUrządzenie: ${userAgent}`,
      html: emailHtml
    });

    // Send Discord webhook
    await sendDiscordWebhook(
      'Hasło zmienione',
      `Użytkownik **${validUser.email}** zmienił hasło.`,
      [
        { name: 'Email', value: validUser.email, inline: true }
      ],
      0xe74c3c // Red
    );
    
    res.json({ message: 'Password has been reset successfully.' });
    
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================================
// Google OAuth - Secure server-side token verification
// ============================================================

// Helper: Verify Google ID token server-side
async function verifyGoogleToken(credential) {
  if (!googleClient) {
    throw new Error('Google OAuth is not configured');
  }
  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name,
    emailVerified: payload.email_verified,
    picture: payload.picture,
  };
}

// POST /auth/google - Login or Register via Google
// Flow:
//   1. No user with this google_id AND no user with this email → Register new user
//   2. User with this google_id exists → Login
//   3. User with this email exists but NO google_id → Return requires_linking (user must login with password to link)
router.post('/google', async (req, res) => {
  try {
    const { credential, code } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Brak tokenu Google' });
    }

    if (!googleClient) {
      return res.status(500).json({ error: 'Google OAuth nie jest skonfigurowane na serwerze' });
    }

    // SECURITY: Verify token server-side
    let googleUser;
    try {
      googleUser = await verifyGoogleToken(credential);
    } catch (err) {
      console.error('Google token verification failed:', err.message);
      return res.status(401).json({ error: 'Weryfikacja tokenu Google nie powiodła się' });
    }

    if (!googleUser.email) {
      return res.status(400).json({ error: 'Konto Google nie ma przypisanego adresu email' });
    }

    // Check if user exists by google_id
    const [googleUsers] = await db.execute(
      'SELECT * FROM users WHERE google_id = ?',
      [googleUser.googleId]
    );

    if (googleUsers.length > 0) {
      // Case 2: User with this google_id exists → Login
      const user = googleUsers[0];

      // Enforce 2FA for Google login when enabled on account
      if (user.two_factor_enabled) {
        if (!code) {
          return res.status(403).json({ requires2FA: true, message: 'Two-factor authentication code required' });
        }

        const verified = speakeasy.totp.verify({
          secret: user.two_factor_secret,
          encoding: 'base32',
          token: code
        });

        if (!verified) {
          await logActivity(req, user.id, 'login_2fa_failed', { email: user.email, method: 'google' });
          return res.status(401).json({ error: 'Invalid 2FA code' });
        }
      }

      await logActivity(req, user.id, 'login_google');

      const ip = req.ip || req.connection.remoteAddress;

      await sendDiscordWebhook(
        'Logowanie Google',
        `Użytkownik **${user.email}** zalogował się przez Google.`,
        [
          { name: 'Email', value: user.email, inline: true },
          { name: 'ID', value: user.id.toString(), inline: true },
          { name: 'IP', value: ip, inline: true }
        ],
        0x4285f4 // Google Blue
      );

      const { accessToken, refreshToken } = await generateTokens(user, ip, req.headers['user-agent']);

      res.cookie('accessToken', accessToken, cookieOptions);
      res.cookie('refreshToken', refreshToken, refreshCookieOptions);

      return res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          nip: user.nip || null,
          two_factor_enabled: !!user.two_factor_enabled
        }
      });
    }

    // Check if user exists by email
    const [emailUsers] = await db.execute(
      'SELECT * FROM users WHERE email = ?',
      [googleUser.email]
    );

    if (emailUsers.length > 0) {
      // Case 3: Email exists but no google_id → Require linking
      return res.status(409).json({
        error: 'Konto z tym adresem email już istnieje. Zaloguj się hasłem, aby połączyć konto Google.',
        requires_linking: true,
        email: googleUser.email
      });
    }

    // Case 1: New user → Register
    const [result] = await db.execute(
      'INSERT INTO users (email, password, name, google_id, is_verified) VALUES (?, ?, ?, ?, ?)',
      [googleUser.email, '', googleUser.name, googleUser.googleId, 1] // auto-verified via Google
    );

    const userId = result.insertId;

    // Create wallet with 0 balance
    await db.execute(
      'INSERT INTO wallet (user_id, balance, offers_created) VALUES (?, ?, ?)',
      [userId, 0, 0]
    );

    await logActivity(req, userId, 'register_google', { email: googleUser.email });

    await sendDiscordWebhook(
      'Nowy użytkownik (Google)',
      `Użytkownik **${googleUser.email}** zarejestrował się przez Google.`,
      [
        { name: 'Email', value: googleUser.email, inline: true },
        { name: 'Nazwa', value: googleUser.name, inline: true },
        { name: 'Google ID', value: googleUser.googleId, inline: true }
      ],
      0x2ecc71 // Green
    );

    const { accessToken, refreshToken } = await generateTokens({ id: userId, email: googleUser.email }, req.ip, req.headers['user-agent']);

    res.cookie('accessToken', accessToken, cookieOptions);
    res.cookie('refreshToken', refreshToken, refreshCookieOptions);

    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: userId,
        email: googleUser.email,
        name: googleUser.name,
        nip: null,
        two_factor_enabled: false
      }
    });

  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /auth/google/link - Link Google account to existing account (requires login with password)
router.post('/google/link', async (req, res) => {
  try {
    const { credential, email, password } = req.body;

    if (!credential || !email || !password) {
      return res.status(400).json({ error: 'Wymagane: token Google, email i hasło' });
    }

    if (!googleClient) {
      return res.status(500).json({ error: 'Google OAuth nie jest skonfigurowane na serwerze' });
    }

    // Verify Google token
    let googleUser;
    try {
      googleUser = await verifyGoogleToken(credential);
    } catch (err) {
      return res.status(401).json({ error: 'Weryfikacja tokenu Google nie powiodła się' });
    }

    // Check if emails match
    if (googleUser.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(400).json({ error: 'Adres email konta Google nie pasuje do podanego emaila' });
    }

    // Find user by email
    const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      await logActivity(req, user.id, 'google_link_failed', { reason: 'wrong_password' });
      return res.status(401).json({ error: 'Nieprawidłowe hasło' });
    }

    // Check if this Google ID is already linked to another account
    const [existingGoogle] = await db.execute(
      'SELECT id FROM users WHERE google_id = ? AND id != ?',
      [googleUser.googleId, user.id]
    );
    if (existingGoogle.length > 0) {
      return res.status(409).json({ error: 'To konto Google jest już połączone z innym kontem' });
    }

    // Link Google account
    await db.execute(
      'UPDATE users SET google_id = ? WHERE id = ?',
      [googleUser.googleId, user.id]
    );

    await logActivity(req, user.id, 'google_linked');

    // Generate token and log in
    const { accessToken, refreshToken } = await generateTokens(user, req.ip, req.headers['user-agent']);

    res.cookie('accessToken', accessToken, cookieOptions);
    res.cookie('refreshToken', refreshToken, refreshCookieOptions);

    res.json({
      message: 'Konto Google zostało połączone',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        nip: user.nip || null,
        two_factor_enabled: !!user.two_factor_enabled
      }
    });

  } catch (error) {
    console.error('Google link error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /auth/google/link-authenticated - Link Google account when already logged in (from Settings)
router.post('/google/link-authenticated', authenticate, async (req, res) => {
  try {
    const { credential } = req.body;
    const userId = req.userId;

    if (!credential) {
      return res.status(400).json({ error: 'Brak tokenu Google' });
    }

    if (!googleClient) {
      return res.status(500).json({ error: 'Google OAuth nie jest skonfigurowane na serwerze' });
    }

    // Verify Google token
    let googleUser;
    try {
      googleUser = await verifyGoogleToken(credential);
    } catch (err) {
      return res.status(401).json({ error: 'Weryfikacja tokenu Google nie powiodła się' });
    }

    // Check if this Google ID is already linked to another account
    const [existingGoogle] = await db.execute(
      'SELECT id FROM users WHERE google_id = ? AND id != ?',
      [googleUser.googleId, userId]
    );
    if (existingGoogle.length > 0) {
      return res.status(409).json({ error: 'To konto Google jest już połączone z innym kontem' });
    }

    // Check if user already has Google linked
    const [currentUser] = await db.execute('SELECT google_id FROM users WHERE id = ?', [userId]);
    if (currentUser.length > 0 && currentUser[0].google_id) {
      return res.status(400).json({ error: 'Konto Google jest już połączone z tym kontem' });
    }

    // Link Google account
    await db.execute('UPDATE users SET google_id = ? WHERE id = ?', [googleUser.googleId, userId]);
    await logActivity(req, userId, 'google_linked');

    res.json({ message: 'Konto Google zostało połączone' });
  } catch (error) {
    console.error('Google authenticated link error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /auth/google/unlink - Unlink Google account (requires auth)
router.post('/google/unlink', authenticate, async (req, res) => {
  try {
    const userId = req.userId;

    // Make sure user has a password set (otherwise they'd be locked out)
    const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
    }

    const user = users[0];
    if (!user.password || user.password === '') {
      return res.status(400).json({ 
        error: 'Nie można odłączyć konta Google - najpierw ustaw hasło, aby nie utracić dostępu do konta' 
      });
    }

    if (!user.google_id) {
      return res.status(400).json({ error: 'Konto Google nie jest połączone' });
    }

    await db.execute('UPDATE users SET google_id = NULL WHERE id = ?', [userId]);
    await logActivity(req, userId, 'google_unlinked');

    res.json({ message: 'Konto Google zostało odłączone' });
  } catch (error) {
    console.error('Google unlink error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /auth/google/status - Check if Google is linked (requires auth)
router.get('/google/status', authenticate, async (req, res) => {
  try {
    const [users] = await db.execute('SELECT google_id FROM users WHERE id = ?', [req.userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
    }
    res.json({ linked: !!users[0].google_id });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify Email
router.post('/resend-verification', passwordResetLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    const genericMessage = 'Jeśli podany email istnieje w naszej bazie, wysłaliśmy link weryfikacyjny.';

    if (!email) {
      return res.status(400).json({ error: 'Email jest wymagany' });
    }

    const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      // Don't reveal user existence
      return res.json({ message: genericMessage });
    }

    const user = users[0];

    if (user.is_verified) {
      return res.json({ message: genericMessage });
    }

    // Generate new token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Update user with new token
    await db.execute(
      'UPDATE users SET verification_token = ? WHERE id = ?',
      [verificationToken, user.id]
    );

    // Send verification email
    const verifyUrl = `${process.env.FRONTEND_URL || 'https://wystawoferte.pl'}/verify-email/${verificationToken}`;
    
    const requestDate = new Date();
    const dateFormatter = new Intl.DateTimeFormat('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Warsaw'
    });
    const requestTime = dateFormatter.format(requestDate).replace(',', '');
    const userAgent = req.headers['user-agent'] || 'Nieznana przeglądarka';
    const ip = req.ip || req.connection.remoteAddress;

    const emailHtml = createEmailTemplate(
      'Potwierdzenie rejestracji',
      `
        <p>Dziękujemy za założenie konta w serwisie wystawoferte.pl.</p>
        <p>Kliknij w poniższy przycisk, aby aktywować swoje konto:</p>
        <div style="margin-top: 20px; font-size: 13px; color: #666;">
          <p><strong>Czas żądania:</strong> ${requestTime}</p>
          <p><strong>Adres IP:</strong> ${ip}</p>
          <p><strong>Urządzenie:</strong> ${userAgent}</p>
        </div>
      `,
      'Potwierdź konto',
      verifyUrl,
      'Jeśli to nie Ty zakładałeś konto, zignoruj tę wiadomość.'
    );

    await sendNotification(user, 'generic', {
      subject: 'Potwierdzenie rejestracji - wystawoferte.pl',
      message: `Dziękujemy za rejestrację. Kliknij w link, aby potwierdzić konto: ${verifyUrl}\n\nCzas: ${requestTime}\nAdres IP: ${ip}\nUrządzenie: ${userAgent}`,
      html: emailHtml
    });

    await logActivity(req, user.id, 'verification_email_resent');

    res.json({ message: genericMessage });

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const [users] = await db.execute('SELECT * FROM users WHERE verification_token = ?', [token]);

    if (users.length === 0) {
      return res.status(400).json({ error: 'Nieprawidłowy lub nieaktualny token weryfikacyjny.' });
    }

    const user = users[0];

    await db.execute(
      'UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?',
      [user.id]
    );

    await logActivity(req, user.id, 'email_verified');

    res.json({ message: 'Email zweryfikowany pomyślnie. Możesz się teraz zalogować.' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify token
router.get('/verify', authenticate, async (req, res) => {
  try {
    const [users] = await db.execute('SELECT id, email, name, nip, two_factor_enabled, notification_preferences FROM users WHERE id = ?', [req.userId]);

    if (users.length === 0) {
      return res.status(401).json({ error: 'User not found' });
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
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Get current user (alias for /user/me)
router.get('/me', authenticate, async (req, res) => {
  try {
    const [users] = await db.execute('SELECT id, email, name, nip, two_factor_enabled, notification_preferences FROM users WHERE id = ?', [req.userId]);

    if (users.length === 0) {
      return res.status(401).json({ error: 'User not found' });
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
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Refresh Token
router.post('/refresh-token', async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token is required' });
  }

  try {
    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const [tokens] = await db.execute(
      'SELECT * FROM refresh_tokens WHERE token = ?',
      [hashedToken]
    );

    if (tokens.length === 0) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const tokenRecord = tokens[0];

    // Check revocation
    if (tokenRecord.revoked) {
      // SECURITY: Refresh Token Reuse Detection
      // A revoked token is being used -> Likely theft attempt -> Revoke ALL sessions for this user
      console.warn(`[SECURITY] Refresh token reuse detected for user ${tokenRecord.user_id}. Revoking all sessions.`);
      
      try {
        // 1. Revoke ALL refresh tokens for this user
        await db.execute('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?', [tokenRecord.user_id]);
        
        // 2. Fetch user details for notification
        const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [tokenRecord.user_id]);
        
        if (users.length > 0) {
          const user = users[0];
          const ip = req.ip || req.connection.remoteAddress;
          const userAgent = req.headers['user-agent'] || 'Unknown';

          // 3. Log security alert
          await logActivity(req, user.id, 'security_alert', { 
            reason: 'refresh_token_reuse',
            ip,
            userAgent
          });

          // 4. Send notification
          const emailHtml = createEmailTemplate(
            'Wykryto podejrzaną aktywność',
            `
              <p>Wykryliśmy próbę użycia starego tokenu sesji, co może oznaczać próbę przejęcia sesji.</p>
              <p>Dla Twojego bezpieczeństwa <strong>wylogowaliśmy Cię ze wszystkich urządzeń</strong>.</p>
              <div style="margin-top: 20px; font-size: 13px; color: #666;">
                <p><strong>Adres IP:</strong> ${ip}</p>
                <p><strong>Urządzenie:</strong> ${userAgent}</p>
              </div>
              <p style="margin-top: 20px; color: #dc3545;">Jeśli to nie Ty, zalecamy natychmiastową zmianę hasła.</p>
            `,
            'Zmień hasło',
            `${process.env.FRONTEND_URL || 'https://wystawoferte.pl'}/forgot-password`
          );

          await sendNotification(user, 'security', {
            subject: 'Wykryto podejrzaną aktywność - Wylogowano z urządzeń',
            message: `Wykryto próbę użycia starego tokenu sesji. Wylogowaliśmy Cię ze wszystkich urządzeń dla bezpieczeństwa.`,
            html: emailHtml
          });
          
          // Send Discord alert
          await sendDiscordWebhook(
            'Security Alert: Token Reuse',
            `Użytkownik **${user.email}** (ID: ${user.id}) - wykryto ponowne użycie tokenu refresh! Wszystkie sesje unieważnione.`,
            [
              { name: 'IP', value: ip, inline: true },
              { name: 'User Agent', value: userAgent, inline: false }
            ],
            0xe74c3c // Red
          );
        }
      } catch (err) {
        console.error('Failed to handle security alert:', err);
      }

      return res.status(401).json({ error: 'Security alert: Session invalidated due to suspicious activity.' });
    }

    // Check expiry
    if (new Date() > new Date(tokenRecord.expires_at)) {
      return res.status(401).json({ error: 'Token expired' });
    }

    // Get user
    const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [tokenRecord.user_id]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    const user = users[0];

    // Issue new tokens (Token Rotation)
    const newAccessToken = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { 
        expiresIn: '15m',
        jwtid: uuidv4() // Add JTI for blacklisting
      }
    );
    
    // Rotate Refresh Token
    const newRefreshToken = crypto.randomBytes(40).toString('hex');
    const hashedNewRefreshToken = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    // Revoke old token and link to new one
    await db.execute(
      'UPDATE refresh_tokens SET revoked = 1, replaced_by_token = ? WHERE id = ?',
      [hashedNewRefreshToken, tokenRecord.id]
    );

    // Create new token record
    await db.execute(
      'INSERT INTO refresh_tokens (user_id, token, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
      [user.id, hashedNewRefreshToken, newExpiresAt, req.ip, req.headers['user-agent']]
    );

    res.cookie('accessToken', newAccessToken, cookieOptions);
    res.cookie('refreshToken', newRefreshToken, refreshCookieOptions);

    res.json({ message: 'Token refreshed' });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout (Revoke Token)
router.post('/logout', async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
  const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
  
  // Always clear cookies
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');

  try {
    // 1. Blacklist Access Token if present
    if (accessToken) {
      try {
        const decoded = jwt.decode(accessToken);
        if (decoded && decoded.jti && decoded.exp) {
          await db.execute(
            'INSERT INTO token_blacklist (jti, expires_at) VALUES (?, FROM_UNIXTIME(?)) ON DUPLICATE KEY UPDATE expires_at = expires_at',
            [decoded.jti, decoded.exp]
          );
        }
      } catch (err) {
        // Ignore invalid token format, just can't blacklist it
        console.warn('Failed to decode access token for blacklist:', err.message);
      }
    }

    // 2. Revoke Refresh Token if present
    if (refreshToken) {
      const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await db.execute(
        'UPDATE refresh_tokens SET revoked = 1 WHERE token = ?',
        [hashedToken]
      );
    }
    
    // 3. Cleanup expired tokens (10% chance)
    if (Math.random() < 0.1) {
      // Don't await this, let it run in background
      db.execute('DELETE FROM token_blacklist WHERE expires_at < NOW()').catch(e => console.error('Cleanup error:', e));
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
