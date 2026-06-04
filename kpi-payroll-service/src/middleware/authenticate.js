/**
 * Authentication middleware for kpi-payroll-service.
 *
 * Delegates token validation to auth-employee-service by calling
 * GET {AUTH_SERVICE_URL}/api/auth/validate with the incoming Authorization header.
 *
 * - Timeout of 5 seconds: returns 503 Service Unavailable if auth service is unreachable.
 * - Non-200 response from auth service: returns 401 Unauthorized.
 * - 200 response: attaches user info to req.user and calls next().
 *
 * Requirements: 1.3, 1.5, 13.1, 13.2, 13.3
 */

const axios = require('axios');

/**
 * Express middleware that validates the Bearer token via auth-employee-service.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers['authorization'] || '';

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token tidak ditemukan',
        errors: [],
      });
    }

    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

    let response;
    try {
      response = await axios.get(`${authServiceUrl}/api/auth/validate`, {
        headers: { Authorization: authHeader },
        timeout: 5000, // 5-second timeout
      });
    } catch (err) {
      // Timeout or network/connection error → 503
      if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT' || err.message.includes('timeout')) {
        return res.status(503).json({
          success: false,
          message: 'Layanan autentikasi tidak tersedia, silakan coba lagi nanti.',
          errors: [],
        });
      }

      // Auth service returned a non-2xx status (e.g. 401) → treat as unauthorized
      if (err.response) {
        return res.status(401).json({
          success: false,
          message: err.response.data?.message || 'Token tidak valid',
          errors: [],
        });
      }

      // Other network errors (ECONNREFUSED, etc.) → 503
      return res.status(503).json({
        success: false,
        message: 'Layanan autentikasi tidak tersedia, silakan coba lagi nanti.',
        errors: [],
      });
    }

    // Auth service returned 200 — attach user info to request
    req.user = response.data?.data || response.data;

    return next();
  } catch (err) {
    next(err);
  }
}

module.exports = authenticate;
