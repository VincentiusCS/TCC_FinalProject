/**
 * CRUD routes for KPI Periods (/api/kpi/periods).
 *
 * Endpoints:
 *   GET    /api/kpi/periods        — list all periods, ordered by year DESC, month DESC
 *   POST   /api/kpi/periods        — create a new period (returns 201)
 *   GET    /api/kpi/periods/:id    — get a single period (404 if not found)
 *   PUT    /api/kpi/periods/:id    — update a period (404 if not found)
 *   DELETE /api/kpi/periods/:id    — delete a period (404 if not found)
 *
 * Validation (Requirements 5.6):
 *   - period_name: required, non-empty string
 *   - month: integer between 1 and 12 (inclusive)
 *   - year: positive integer
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

const express = require('express');
const { body, validationResult } = require('express-validator');

const { query } = require('../config/database');
const { sendSuccess, sendError } = require('../utils/responseHelper');

const router = express.Router();

// ── Validation rules ──────────────────────────────────────────────────────────

/**
 * Shared validation rules for create and update.
 * Requirements: 5.6
 */
const periodValidations = [
  body('period_name')
    .trim()
    .notEmpty()
    .withMessage('Nama periode wajib diisi'),

  body('month')
    .isInt({ min: 1, max: 12 })
    .withMessage('Bulan harus berupa angka antara 1 dan 12'),

  body('year')
    .isInt({ min: 1 })
    .withMessage('Tahun harus berupa bilangan bulat positif'),
];

// ── Helper ────────────────────────────────────────────────────────────────────

/**
 * Collect express-validator errors and send a 400 response if any exist.
 * Returns true when the request should be aborted.
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

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /api/kpi/periods
 *
 * Returns all KPI periods ordered by year DESC, month DESC.
 * Requirements: 5.2
 */
router.get('/', async (req, res, next) => {
  try {
    const periods = await query(
      'SELECT id, period_name, month, year, created_at, updated_at FROM kpi_periods ORDER BY year DESC, month DESC'
    );
    return sendSuccess(res, 'Daftar periode KPI berhasil diambil', periods);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/kpi/periods
 *
 * Creates a new KPI period. Returns 201 with the newly created record.
 * Requirements: 5.1, 5.6
 */
router.post('/', periodValidations, async (req, res, next) => {
  try {
    if (handleValidationErrors(req, res)) return;

    const { period_name, month, year } = req.body;

    const result = await query(
      'INSERT INTO kpi_periods (period_name, month, year) VALUES (?, ?, ?)',
      [period_name.trim(), parseInt(month, 10), parseInt(year, 10)]
    );

    const insertId = result.insertId;

    const rows = await query(
      'SELECT id, period_name, month, year, created_at, updated_at FROM kpi_periods WHERE id = ?',
      [insertId]
    );

    return sendSuccess(res, 'Periode KPI berhasil dibuat', rows[0], 201);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/kpi/periods/:id
 *
 * Returns a single KPI period by ID. Returns 404 if not found.
 * Requirements: 5.3
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const rows = await query(
      'SELECT id, period_name, month, year, created_at, updated_at FROM kpi_periods WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return sendError(res, 'Periode KPI tidak ditemukan', [], 404);
    }

    return sendSuccess(res, 'Data periode KPI berhasil diambil', rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/kpi/periods/:id
 *
 * Updates an existing KPI period. Returns 404 if not found.
 * Requirements: 5.4, 5.6
 */
router.put('/:id', periodValidations, async (req, res, next) => {
  try {
    if (handleValidationErrors(req, res)) return;

    const { id } = req.params;

    // Verify existence
    const existing = await query('SELECT id FROM kpi_periods WHERE id = ?', [id]);
    if (existing.length === 0) {
      return sendError(res, 'Periode KPI tidak ditemukan', [], 404);
    }

    const { period_name, month, year } = req.body;

    await query(
      `UPDATE kpi_periods
       SET period_name = ?,
           month       = ?,
           year        = ?,
           updated_at  = NOW()
       WHERE id = ?`,
      [period_name.trim(), parseInt(month, 10), parseInt(year, 10), id]
    );

    const updated = await query(
      'SELECT id, period_name, month, year, created_at, updated_at FROM kpi_periods WHERE id = ?',
      [id]
    );

    return sendSuccess(res, 'Periode KPI berhasil diperbarui', updated[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/kpi/periods/:id
 *
 * Deletes an existing KPI period. Returns 404 if not found.
 * Requirements: 5.5
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify existence
    const existing = await query('SELECT id FROM kpi_periods WHERE id = ?', [id]);
    if (existing.length === 0) {
      return sendError(res, 'Periode KPI tidak ditemukan', [], 404);
    }

    await query('DELETE FROM kpi_periods WHERE id = ?', [id]);

    return sendSuccess(res, 'Periode KPI berhasil dihapus', null);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
