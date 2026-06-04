/**
 * Authentication middleware for protected routes.
 *
 * Extracts the Bearer token from the Authorization header, looks it up in the
 * sessions table (joined with users), checks expiry, and attaches the user to
 * req.user before calling next().
 *
 * Requirements: 1.3, 1.5
 */

const { query } = require('../config/database');
const { sendError } = require('../utils/responseHelper');

/**
 * Express middleware that validates the session token.
 *
 * - Extracts token from "Authorization: Bearer <token>" header.
 * - Returns 401 if the header is missing or malformed.
 * - Returns 401 if the token is not found in the sessions table.
 * - Deletes the expired session and returns 401 if the token has expired.
 * - Attaches req.user = { id, email, name } and req.token = token on success.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function authenticate(req, res, next) {
  try {
    // 1. Extract token from Authorization header
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : null;

    if (!token) {
      return sendError(res, 'Token tidak ditemukan', [], 401);
    }

    // 2. Query sessions joined with users
    const rows = await query(
      `SELECT sessions.*, users.id as user_id, users.email, users.name
       FROM sessions
       JOIN users ON sessions.user_id = users.id
       WHERE sessions.token = ?
       LIMIT 1`,
      [token]
    );

    const session = rows[0];

    // 3. Token not found
    if (!session) {
      return sendError(res, 'Token tidak valid', [], 401);
    }

    // 4. Check expiry
    const now = new Date();
    const expiresAt = new Date(session.expires_at);

    if (expiresAt < now) {
      // Delete the expired session
      await query('DELETE FROM sessions WHERE token = ?', [token]);
      return sendError(res, 'Token telah kadaluarsa', [], 401);
    }

    // 5. Attach user info and token to the request, then proceed
    req.user = {
      id: session.user_id,
      email: session.email,
      name: session.name,
    };
    req.token = token;

    return next();
  } catch (err) {
    next(err);
  }
}

module.exports = authenticate;
