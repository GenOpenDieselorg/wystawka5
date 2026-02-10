const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const morgan = require('morgan');
const logger = require('./utils/logger');
const requestIdMiddleware = require('./middleware/requestId');
const reportToDiscord = require('./utils/discordReporter');
const { monitorAccessPatterns } = require('./middleware/security');
const xssSanitizer = require('./middleware/sanitization');
const csrfProtection = require('./middleware/csrf');
const timeoutMiddleware = require('./middleware/timeout');
const idempotencyMiddleware = require('./middleware/idempotency');
const requestSigningMiddleware = require('./middleware/requestSigning');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for proper IP detection behind Cloudflare/proxy
// Trust only the first proxy (Cloudflare) - more secure than 'true'
app.set('trust proxy', 1);

// Global Timeout Middleware (prevention against DoS/hanging connections)
app.use(timeoutMiddleware);

// Add Request ID and Context
app.use(requestIdMiddleware);

// Middleware - CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allowed domains - only these specific domains are permitted
    const allowedOrigins = [
      'https://wystawoferte.pl',
      'https://www.wystawoferte.pl',
      'https://api.wystawoferte.pl',
      // Development origins
      ...(process.env.NODE_ENV === 'development' ? [
        'http://localhost:3000',
        'http://localhost:5000',
        process.env.FRONTEND_URL
      ].filter(Boolean) : [])
    ];
    
    // Allow requests with no origin (like mobile apps, curl requests, or same-origin)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept',
    'CF-Connecting-IP',
    'CF-Ray',
    'CF-Visitor',
    'X-Forwarded-For',
    'X-Forwarded-Proto',
    'X-Forwarded-Host',
    'X-Real-IP',
    'X-XSRF-TOKEN'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Generate Nonce for CSP
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

// Force HTTPS - Redirect HTTP to HTTPS
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure && req.get('x-forwarded-proto') !== 'https') {
    return res.redirect('https://' + req.get('host') + req.url);
  }
  next();
});

// Security Middleware - Helmet
app.use(helmet({
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        (req, res) => `'nonce-${res.locals.nonce}'`,
        "https://challenges.cloudflare.com",
        "https://accounts.google.com",
        "https://apis.google.com"
      ],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://*.googleusercontent.com", "https://*.wystawoferte.pl"],
      connectSrc: ["'self'", "https://challenges.cloudflare.com", "https://accounts.google.com"],
      frameSrc: ["'self'", "https://challenges.cloudflare.com", "https://accounts.google.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));

app.use(cookieParser());

// CSRF Protection
app.use(csrfProtection);

// Additional Security Headers
app.use((req, res, next) => {
  // Permissions Policy
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), vr=()'
  );
  next();
});

// Rate Limiting
// Use Cloudflare headers for IP identification when behind Cloudflare proxy
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes',
  validate: {
    ip: false
  }
});
app.use('/api/', limiter);

// Body parsing - allow raw for logs endpoint (sendBeacon), then JSON for others
app.use('/api/logs', express.raw({ type: ['application/json', 'text/plain'] }));
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Request Signing Verification (if header present)
app.use(requestSigningMiddleware);

// Idempotency Middleware (for write operations)
app.use(idempotencyMiddleware);

// Sanityzacja XSS
app.use(xssSanitizer);

// Define custom token for masked URL
morgan.token('safe-url', (req) => {
  let safeUrl = req.originalUrl || req.url;
  try {
    const urlObj = new URL(safeUrl, `http://${req.headers.host || 'localhost'}`);
    const sensitiveKeys = ['token', 'password', 'key', 'secret', 'authorization', 'access_token', 'refresh_token', 'code'];
    let modified = false;

    const searchParams = new URLSearchParams(urlObj.search);
    for (const key of searchParams.keys()) {
      if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
        searchParams.set(key, '***MASKED***');
        modified = true;
      }
    }
    
    if (modified) {
      safeUrl = urlObj.pathname + '?' + searchParams.toString();
    }
  } catch (e) {
    if (req.path) safeUrl = req.path;
  }
  return safeUrl;
});

// Request logging middleware (using Morgan with Winston stream)
app.use(morgan(':method :safe-url :status :res[content-length] - :response-time ms - IP: :remote-addr', {
  stream: { write: message => logger.info(message.trim()) }
}));

// SECURITY: Monitoring Middleware
app.use(monitorAccessPatterns);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/products', require('./routes/products'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/ai-templates', require('./routes/aiTemplates'));
app.use('/api/allegro-bulk', require('./routes/allegroBulk'));
app.use('/api/marketplace', require('./routes/marketplace'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/logs', require('./routes/logs'));

// Serve uploaded images with security headers
app.use('/uploads', (req, res, next) => {
  // CSP: tylko własne źródło
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  // X-Content-Type-Options: zapobiega MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
}, express.static('uploads'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Initialize default AI templates
const initDefaultAiTemplate = require('./utils/initAiTemplates');
initDefaultAiTemplate();

// Initialize background jobs table
const initBackgroundJobs = require('./utils/initBackgroundJobs');
initBackgroundJobs();

// Initialize token blacklist table
const initTokenBlacklist = require('./utils/initTokenBlacklist');
initTokenBlacklist();


// SEO: Serve static HTML for landing page to everyone (no JavaScript needed)
// This ensures fast loading and Google/AI can read the page content without JavaScript
// The entire page is rendered server-side, making it fully accessible to:
// - Google Search (SEO)
// - ChatGPT and other AI crawlers
// - All search engines and bots
// - Users with JavaScript disabled
const { generateLandingPageHTML } = require('./utils/landingPageHTML');

// Landing page - always serve static HTML (no JavaScript needed for this page)
// This is a fully server-rendered HTML page that works without any JavaScript
app.get('/', (req, res) => {
  const userAgent = req.headers['user-agent'] || 'unknown';
  logger.info(`Serving static HTML for landing page to: ${userAgent}`);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
  return res.send(generateLandingPageHTML());
});

// Cennik page - same as landing page but with scroll to pricing section
app.get('/cennik', (req, res) => {
  const userAgent = req.headers['user-agent'] || 'unknown';
  logger.info(`Serving static HTML for cennik page to: ${userAgent}`);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
  const html = generateLandingPageHTML();
  // Add scroll script to jump to pricing section (only for JavaScript-enabled browsers)
  // Bots will see the full page content without needing JavaScript
  const htmlWithScroll = html.replace('</body>', `<script nonce="${res.locals.nonce}">if (typeof window !== "undefined" && window.addEventListener) { window.addEventListener("load", function() { document.getElementById("cennik")?.scrollIntoView({ behavior: "smooth" }); }); }</script></body>`);
  return res.send(htmlWithScroll);
});

// Serve static files from React app build (if exists)
const buildPath = path.join(__dirname, '../client/build');
const staticFilesExist = fs.existsSync(buildPath);

if (staticFilesExist) {
  // Serve static files (CSS, JS, images, etc.)
  app.use(express.static(buildPath));
  
  // Handle React Router - serve index.html for all other non-API routes
  app.get('*', (req, res, next) => {
    // Skip API routes and landing page routes (already handled above)
    if (req.path.startsWith('/api/') || req.path === '/' || req.path === '/cennik' || req.path === '') {
      return next();
    }
    
    // For all other pages, serve React app (client-side routing)
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Error:', err.message, err.stack);
  
  // Report to Discord (asynchronous, don't wait)
  reportToDiscord(err, {
    method: req.method,
    path: req.originalUrl,
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    user: req.user // assuming auth middleware runs before error
  }).catch(e => console.error(e));

  if (err.name === 'CorsError') {
    return res.status(403).json({ 
      error: 'CORS policy violation',
      message: 'Origin not allowed by CORS policy'
    });
  }
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global Process Error Handlers
process.on('uncaughtException', (error) => {
  logger.error('UNCAUGHT EXCEPTION:', error);
  reportToDiscord(error, { context: 'uncaughtException' }, 'ERROR').finally(() => {
    // Give it a moment to send before exit if critical
    setTimeout(() => process.exit(1), 1000);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('UNHANDLED REJECTION:', reason);
  reportToDiscord(reason instanceof Error ? reason : new Error(String(reason)), { context: 'unhandledRejection' }, 'ERROR');
});

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`CORS enabled for: wystawoferte.pl, www.wystawoferte.pl, api.wystawoferte.pl`);
  logger.info(`Server ready to accept connections`);
});
