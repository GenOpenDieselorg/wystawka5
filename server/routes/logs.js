const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const authenticate = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET;

// SECURITY: Rate limiter for logs to prevent DoS
const logLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per IP per 15 min (generous but prevents flood)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many log requests' }
});

router.post('/', logLimiter, async (req, res) => {
  try {
    let body = req.body;
    
    // Handle Buffer (sendBeacon with Blob)
    if (Buffer.isBuffer(body)) {
      try {
        body = JSON.parse(body.toString('utf8'));
      } catch (e) {
        body = { logs: body.toString('utf8'), source: 'frontend' };
      }
    } else if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = { logs: body, source: 'frontend' };
      }
    }

    const { logs, source, token: bodyToken } = body; // Check token in body for sendBeacon support

    if (!logs) {
      return res.status(400).json({ error: 'Logs are required' });
    }

    // Determine user if possible
    let userId = null;
    let token = null;

    const authHeader = req.headers.authorization;
    if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (bodyToken) {
      token = bodyToken;
    }

    if (token && JWT_SECRET) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.userId;
      } catch (err) {
        // Invalid token - log anonymously but don't crash
      }
    }

    const timestamp = new Date();
    const logEntries = Array.isArray(logs) ? logs : [logs];

    const values = logEntries.map(log => {
      let message = '';
      let level = 'INFO';
      let meta = null;

      if (typeof log === 'string') {
        message = log;
      } else {
        message = log.message || JSON.stringify(log);
        level = log.level || 'INFO';
        
        // Extract extra fields for meta
        const { message: _, level: __, timestamp: ___, ...rest } = log;
        if (Object.keys(rest).length > 0) {
          meta = JSON.stringify(rest);
        }
      }

      return [
        userId,
        level,
        message,
        source || 'frontend',
        timestamp,
        meta,
        req.get('User-Agent') || null,
        req.ip
      ];
    });

    if (values.length > 0) {
      const query = `
        INSERT INTO frontend_logs 
        (user_id, level, message, source, timestamp, meta, user_agent, ip_address) 
        VALUES ?
      `;
      await pool.query(query, [values]);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving frontend logs:', error);
    // Don't leak internal errors, just say failed
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get logs - only for users with id 1-6
router.get('/', authenticate, async (req, res) => {
  try {
    // Check if user is authorized (id 1-6)
    if (!req.userId || req.userId < 1 || req.userId > 6) {
      return res.status(403).json({ error: 'Access denied. Only users with id 1-6 can access logs.' });
    }

    const limit = parseInt(req.query.limit) || 1000;
    const offset = parseInt(req.query.offset) || 0;
    const level = req.query.level; // Optional filter by level
    const userId = req.query.userId; // Optional filter by user_id

    let query = 'SELECT * FROM frontend_logs WHERE 1=1';
    const params = [];

    if (level) {
      query += ' AND level = ?';
      params.push(level);
    }

    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [logs] = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM frontend_logs WHERE 1=1';
    const countParams = [];

    if (level) {
      countQuery += ' AND level = ?';
      countParams.push(level);
    }

    if (userId) {
      countQuery += ' AND user_id = ?';
      countParams.push(userId);
    }

    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      logs: logs.map(log => ({
        id: log.id,
        user_id: log.user_id,
        level: log.level,
        message: log.message,
        source: log.source,
        timestamp: log.timestamp,
        meta: log.meta ? JSON.parse(log.meta) : null,
        user_agent: log.user_agent,
        ip_address: log.ip_address
      })),
      total,
      limit,
      offset
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get wallet logs for all clients - only for users with id 1-6
router.get('/wallet', authenticate, async (req, res) => {
  try {
    // Check if user is authorized (id 1-6)
    if (!req.userId || req.userId < 1 || req.userId > 6) {
      return res.status(403).json({ error: 'Access denied. Only users with id 1-6 can access wallet logs.' });
    }

    const limit = parseInt(req.query.limit) || 1000;
    const offset = parseInt(req.query.offset) || 0;
    const user = req.query.user; // Optional filter by user_id or email
    const status = req.query.status; // Optional filter by status
    const type = req.query.type; // Optional filter by type (topup, expense)

    let query = `
      SELECT 
        t.*,
        u.email as user_email,
        u.name as user_name,
        p.product_name,
        w.balance as wallet_balance
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN products p ON t.product_id = p.id
      LEFT JOIN wallet w ON t.user_id = w.user_id
      WHERE 1=1
    `;
    const params = [];

    if (user) {
      // Check if user is a number (ID) or string (email)
      const userIdNum = parseInt(user);
      if (!isNaN(userIdNum) && userIdNum.toString() === user) {
        // It's a numeric ID
        query += ' AND t.user_id = ?';
        params.push(userIdNum);
      } else {
        // It's an email (or other string)
        query += ' AND u.email LIKE ?';
        params.push(`%${user}%`);
      }
    }

    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }

    if (type === 'topup') {
      query += ' AND t.type = ?';
      params.push('topup');
    } else if (type === 'expense') {
      query += ' AND t.type IN (?, ?)';
      params.push('offer_creation', 'charge');
    }

    query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [transactions] = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;
    const countParams = [];

    if (user) {
      // Check if user is a number (ID) or string (email)
      const userIdNum = parseInt(user);
      if (!isNaN(userIdNum) && userIdNum.toString() === user) {
        // It's a numeric ID
        countQuery += ' AND t.user_id = ?';
        countParams.push(userIdNum);
      } else {
        // It's an email (or other string)
        countQuery += ' AND u.email LIKE ?';
        countParams.push(`%${user}%`);
      }
    }

    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    if (type === 'topup') {
      countQuery += ' AND type = ?';
      countParams.push('topup');
    } else if (type === 'expense') {
      countQuery += ' AND type IN (?, ?)';
      countParams.push('offer_creation', 'charge');
    }

    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      transactions: transactions.map(t => ({
        id: t.id,
        user_id: t.user_id,
        user_email: t.user_email,
        user_name: t.user_name,
        amount: parseFloat(t.amount),
        type: t.type,
        status: t.status,
        external_id: t.external_id,
        product_id: t.product_id,
        product_name: t.product_name,
        description: t.description,
        wallet_balance: t.wallet_balance ? parseFloat(t.wallet_balance) : null,
        created_at: t.created_at,
        updated_at: t.updated_at
      })),
      total,
      limit,
      offset
    });
  } catch (error) {
    console.error('Error fetching wallet logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
