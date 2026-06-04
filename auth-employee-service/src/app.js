const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
// Allow all origins by default, or restrict to ALLOWED_ORIGIN when provided
const corsOptions = process.env.ALLOWED_ORIGIN
  ? { origin: process.env.ALLOWED_ORIGIN, optionsSuccessStatus: 200 }
  : { origin: '*', optionsSuccessStatus: 200 };

app.use(cors(corsOptions));

// ── Body Parser ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Rate Limiter ──────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // default: 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),               // default: 100 requests
  standardHeaders: true,  // Return rate-limit info in the `RateLimit-*` headers
  legacyHeaders: false,   // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    message: 'Terlalu banyak request, silakan coba lagi nanti.',
    errors: [],
  },
});

app.use(limiter);

// ── Authentication Middleware ─────────────────────────────────────────────────
const authenticate = require('./middleware/authenticate');

// ── Routes ────────────────────────────────────────────────────────────────────
// /api/auth is public (login, logout, validate handle their own auth)
app.use('/api/auth', require('./routes/auth'));

// /api/employees and /api/positions are protected — require a valid session token
app.use('/api/employees', authenticate, require('./routes/employees'));
app.use('/api/positions', authenticate, require('./routes/positions'));

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} tidak ditemukan.`,
    errors: [],
  });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
// Must be defined with 4 parameters so Express recognises it as an error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Terjadi kesalahan internal server.',
    errors: err.errors || [],
  });
});

module.exports = app;
