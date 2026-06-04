const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const { query } = require('../config/database');
const { sendSuccess, sendError } = require('../utils/responseHelper');

const router = express.Router();

/**
 * POST /api/auth/login
 *
 * Validates credentials, creates a session, and returns a token.
 * Requirements: 1.1, 1.2, 1.6
 */
router.post(
  '/login',
  [
    body('email')
      .isEmail()
      .withMessage('Format email tidak valid')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password minimal 6 karakter'),
  ],
  async (req, res, next) => {
    try {
      // 1. Check validation errors (Requirement 1.6)
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const errorDetails = errors.array().map((err) => ({
          field: err.path,
          message: err.msg,
        }));
        return sendError(res, 'Validasi gagal', errorDetails, 400);
      }

      const { email, password } = req.body;

      // 2. Look up user by email (Requirement 1.1, 1.2)
      const users = await query(
        'SELECT id, email, password_hash, name FROM users WHERE email = ? LIMIT 1',
        [email]
      );

      const user = users[0];

      // 3. Verify user exists and password matches (Requirement 1.2)
      const passwordValid =
        user ? await bcrypt.compare(password, user.password_hash) : false;

      if (!user || !passwordValid) {
        return sendError(
          res,
          'Email atau password salah',
          [],
          401
        );
      }

      // 4. Create session: UUID token, expires in 24 hours (Requirement 1.1)
      const token = uuidv4();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await query(
        'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)',
        [user.id, token, expiresAt]
      );

      // 5. Return success response with token and user info (Requirement 1.1)
      return sendSuccess(res, 'Login berhasil', {
        token,
        expires_at: expiresAt,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/auth/logout
 *
 * Deletes the session associated with the provided token.
 * Requirements: 1.4
 */
router.post('/logout', async (req, res, next) => {
  try {
    // 1. Extract token from Authorization header (Bearer <token>)
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : null;

    // 2. No token → 401
    if (!token) {
      return sendError(res, 'Token tidak ditemukan', [], 401);
    }

    // 3. Delete the session from the sessions table
    await query('DELETE FROM sessions WHERE token = ?', [token]);

    // 4. Return success regardless of whether the token existed
    return sendSuccess(res, 'Logout berhasil', null);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/validate
 *
 * Validates the Bearer token and returns user information.
 * Used by other services (e.g. kpi-payroll-service) to verify tokens.
 * Requirements: 1.3, 1.5
 */
const authenticate = require('../middleware/authenticate');

router.get('/validate', authenticate, (req, res) => {
  return sendSuccess(res, 'Token valid', { user: req.user });
});

module.exports = router;
