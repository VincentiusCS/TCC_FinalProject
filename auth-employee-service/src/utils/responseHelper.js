/**
 * Helper functions for sending consistent JSON responses across the API.
 *
 * Success format:  { success: true,  message, data }
 * Error format:    { success: false, message, errors }
 *
 * Requirements: 13.1, 13.2, 13.3
 */

/**
 * Send a successful JSON response.
 *
 * @param {import('express').Response} res - Express response object
 * @param {string} message - Human-readable description of the result
 * @param {*} data - Response payload (object, array, or null)
 * @param {number} [statusCode=200] - HTTP status code
 */
function sendSuccess(res, message, data, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

/**
 * Send an error JSON response.
 *
 * @param {import('express').Response} res - Express response object
 * @param {string} message - Human-readable description of the error
 * @param {Array<{field?: string, message: string}>} [errors=[]] - Array of error details
 * @param {number} [statusCode=400] - HTTP status code
 */
function sendError(res, message, errors = [], statusCode = 400) {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
}

module.exports = { sendSuccess, sendError };
