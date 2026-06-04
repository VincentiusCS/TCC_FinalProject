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
// All KPI and payroll routes are protected — require a valid token from auth service

// KPI Periods (Task 9.1) — Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
app.use('/api/kpi/periods', authenticate, require('./routes/periods.routes'));

// KPI Assessments (Task 10.1) — Requirements: 6.1–6.7, 7.1–7.5, 8.1–8.8
app.use('/api/kpi/assessments', authenticate, require('./routes/assessments.routes'));

// Bonus Recap (Task 11.1) — Requirements: 9.1, 9.2, 9.3, 9.4
app.use('/api/kpi/recap', authenticate, require('./routes/recap.routes'));

// PDF Reports (Task 11.4) — Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
app.use('/api/reports', authenticate, require('./routes/reports.routes'));

// ── Health check (public) ─────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'kpi-payroll-service berjalan.' });
});

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
