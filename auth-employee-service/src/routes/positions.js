const express = require('express');
const { body, validationResult } = require('express-validator');

const { query } = require('../config/database');
const { sendSuccess, sendError } = require('../utils/responseHelper');

const router = express.Router();

/**
 * Shared validation rule: position_name must be a non-empty string after trimming.
 * Requirements: 4.5
 */
const positionNameValidation = body('position_name')
  .trim()
  .notEmpty()
  .withMessage('Nama jabatan wajib diisi');

/**
 * Helper: collect express-validator errors and send a 400 response if any exist.
 * Returns true when the request should be aborted (i.e. validation failed).
 */
function handleValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));
    sendError(res, 'Validasi gagal', errorDetails, 400);
    return true;
  }
  return false;
}

/**
 * GET /api/positions
 *
 * Returns all positions ordered by id DESC.
 * Requirements: 4.2
 */
router.get('/', async (req, res, next) => {
  try {
    const positions = await query(
      'SELECT id, position_name, created_at, updated_at FROM positions ORDER BY id DESC'
    );
    return sendSuccess(res, 'Daftar jabatan berhasil diambil', positions);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/positions
 *
 * Creates a new position. Validates that position_name is non-empty.
 * Returns 201 with the newly created record.
 * Requirements: 4.1, 4.5
 */
router.post(
  '/',
  [positionNameValidation],
  async (req, res, next) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const positionName = req.body.position_name.trim();

      const result = await query(
        'INSERT INTO positions (position_name) VALUES (?)',
        [positionName]
      );

      const insertId = result.insertId;

      const rows = await query(
        'SELECT id, position_name, created_at, updated_at FROM positions WHERE id = ?',
        [insertId]
      );

      return sendSuccess(res, 'Jabatan berhasil dibuat', rows[0], 201);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/positions/:id
 *
 * Updates an existing position. Returns 404 if not found.
 * Requirements: 4.3, 4.5
 */
router.put(
  '/:id',
  [positionNameValidation],
  async (req, res, next) => {
    try {
      if (handleValidationErrors(req, res)) return;

      const { id } = req.params;
      const positionName = req.body.position_name.trim();

      // Check existence
      const existing = await query(
        'SELECT id FROM positions WHERE id = ?',
        [id]
      );

      if (existing.length === 0) {
        return sendError(res, 'Jabatan tidak ditemukan', [], 404);
      }

      await query(
        'UPDATE positions SET position_name = ?, updated_at = NOW() WHERE id = ?',
        [positionName, id]
      );

      const updated = await query(
        'SELECT id, position_name, created_at, updated_at FROM positions WHERE id = ?',
        [id]
      );

      return sendSuccess(res, 'Jabatan berhasil diperbarui', updated[0]);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/positions/:id
 *
 * Deletes an existing position. Returns 404 if not found.
 * Requirements: 4.4
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check existence
    const existing = await query(
      'SELECT id FROM positions WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return sendError(res, 'Jabatan tidak ditemukan', [], 404);
    }

    await query('DELETE FROM positions WHERE id = ?', [id]);

    return sendSuccess(res, 'Jabatan berhasil dihapus', null);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
