/**
 * Routes for KPI Assessments (/api/kpi/assessments).
 *
 * Endpoints:
 *   POST   /api/kpi/assessments        — create new assessment + calculate SAW scores & bonus
 *   GET    /api/kpi/assessments        — list all assessments (placeholder, Task 10.2)
 *   GET    /api/kpi/assessments/:id    — get single assessment (placeholder, Task 10.2)
 *   PUT    /api/kpi/assessments/:id    — update assessment (placeholder, Task 10.2)
 *   DELETE /api/kpi/assessments/:id    — delete assessment (placeholder, Task 10.2)
 *
 * Validation (Requirements 6.2–6.5):
 *   - employee_id: required integer
 *   - period_id: required integer
 *   - sales_unit: integer >= 0
 *   - avg_transaction: number between 200_000_000 and 1_000_000_000 (inclusive)
 *   - attendance_score: number between 0 and 100 (inclusive)
 *   - customer_satisfaction: number between 0 and 100 (inclusive)
 *
 * Cross-service validation (Requirements 6.6, 6.7):
 *   - Calls GET {AUTH_SERVICE_URL}/api/employees/:employee_id to verify employee exists
 *   - Checks period_id exists in kpi_periods table
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 7.1–7.5, 8.1–8.8
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const axios = require('axios');

const { query } = require('../config/database');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const {
  calculateSalesScore,
  calculateTransactionScore,
  calculateFinalScore,
  calculateBonus,
} = require('../services/sawCalculator');

const router = express.Router();

// ── Validation rules ──────────────────────────────────────────────────────────

/**
 * Validation rules for creating/updating an assessment.
 * Requirements: 6.2, 6.3, 6.4, 6.5
 */
const assessmentValidations = [
  body('employee_id')
    .isInt({ min: 1 })
    .withMessage('employee_id harus berupa bilangan bulat positif'),

  body('period_id')
    .isInt({ min: 1 })
    .withMessage('period_id harus berupa bilangan bulat positif'),

  body('sales_unit')
    .isInt({ min: 0 })
    .withMessage('sales_unit harus berupa bilangan bulat >= 0'),

  body('avg_transaction')
    .isFloat({ min: 200_000_000, max: 1_000_000_000 })
    .withMessage('avg_transaction harus berupa angka antara 200000000 dan 1000000000'),

  body('attendance_score')
    .isFloat({ min: 0, max: 100 })
    .withMessage('attendance_score harus berupa angka antara 0 dan 100'),

  body('customer_satisfaction')
    .isFloat({ min: 0, max: 100 })
    .withMessage('customer_satisfaction harus berupa angka antara 0 dan 100'),
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
 * POST /api/kpi/assessments
 *
 * Creates a new KPI assessment. Steps:
 *   1. Validate request body fields (Requirements 6.2–6.5)
 *   2. Verify employee exists via auth-employee-service (Requirements 6.6)
 *   3. Verify period exists in kpi_periods (Requirements 6.7)
 *   4. INSERT into kpi_assessments (Requirements 6.1)
 *   5. Calculate SAW scores and bonus (Requirements 7.1–7.5, 8.1–8.8)
 *   6. INSERT into bonus_results
 *   7. Return combined response
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 7.1–7.5, 8.1–8.8
 */
router.post('/', assessmentValidations, async (req, res, next) => {
  try {
    // Step 1 — Field validation
    if (handleValidationErrors(req, res)) return;

    const {
      employee_id,
      period_id,
      sales_unit,
      avg_transaction,
      attendance_score,
      customer_satisfaction,
    } = req.body;

    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
    const authHeader = req.headers['authorization'] || '';

    // Step 2 — Verify employee_id via auth-employee-service (Requirements 6.6)
    try {
      await axios.get(`${authServiceUrl}/api/employees/${employee_id}`, {
        headers: { Authorization: authHeader },
        timeout: 5000,
      });
    } catch (err) {
      // Timeout or connection error → 503
      if (
        err.code === 'ECONNABORTED' ||
        err.code === 'ETIMEDOUT' ||
        (err.message && err.message.includes('timeout')) ||
        err.code === 'ECONNREFUSED' ||
        !err.response
      ) {
        return sendError(
          res,
          'Layanan karyawan tidak tersedia, silakan coba lagi nanti.',
          [],
          503
        );
      }
      // 404 → employee not found → 422
      if (err.response && err.response.status === 404) {
        return sendError(
          res,
          'Validasi referensi gagal',
          [{ field: 'employee_id', message: 'Karyawan dengan ID tersebut tidak ditemukan' }],
          422
        );
      }
      // Any other non-2xx from auth service → 503
      return sendError(
        res,
        'Layanan karyawan tidak tersedia, silakan coba lagi nanti.',
        [],
        503
      );
    }

    // Step 3 — Verify period_id exists in kpi_periods (Requirements 6.7)
    const periodRows = await query('SELECT id FROM kpi_periods WHERE id = ?', [period_id]);
    if (periodRows.length === 0) {
      return sendError(
        res,
        'Validasi referensi gagal',
        [{ field: 'period_id', message: 'Periode KPI dengan ID tersebut tidak ditemukan' }],
        422
      );
    }

    // Step 4 — INSERT into kpi_assessments (Requirements 6.1)
    const insertAssessmentResult = await query(
      `INSERT INTO kpi_assessments
         (employee_id, period_id, sales_unit, avg_transaction, attendance_score, customer_satisfaction)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        parseInt(employee_id, 10),
        parseInt(period_id, 10),
        parseInt(sales_unit, 10),
        parseFloat(avg_transaction),
        parseFloat(attendance_score),
        parseFloat(customer_satisfaction),
      ]
    );

    const assessmentId = insertAssessmentResult.insertId;

    // Step 5 — Calculate SAW scores and bonus (Requirements 7.1–7.5, 8.1–8.8)
    const salesScore = calculateSalesScore(parseInt(sales_unit, 10));
    const transactionScore = calculateTransactionScore(parseFloat(avg_transaction));
    const finalScore = calculateFinalScore(
      salesScore,
      transactionScore,
      parseFloat(attendance_score),
      parseFloat(customer_satisfaction)
    );
    const { bonus_percentage, bonus_amount } = calculateBonus(finalScore);

    // Step 6 — INSERT into bonus_results
    const insertBonusResult = await query(
      `INSERT INTO bonus_results
         (assessment_id, employee_id, period_id,
          sales_score, transaction_score, attendance_score, satisfaction_score,
          final_score, bonus_percentage, bonus_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        assessmentId,
        parseInt(employee_id, 10),
        parseInt(period_id, 10),
        salesScore,
        transactionScore,
        parseFloat(attendance_score),
        parseFloat(customer_satisfaction),
        finalScore,
        bonus_percentage,
        bonus_amount,
      ]
    );

    const bonusResultId = insertBonusResult.insertId;

    // Fetch newly created records for the response
    const assessmentRows = await query(
      `SELECT id, employee_id, period_id, sales_unit, avg_transaction,
              attendance_score, customer_satisfaction, created_at, updated_at
       FROM kpi_assessments WHERE id = ?`,
      [assessmentId]
    );

    const bonusRows = await query(
      `SELECT id, assessment_id, employee_id, period_id,
              sales_score, transaction_score, attendance_score, satisfaction_score,
              final_score, bonus_percentage, bonus_amount, calculated_at
       FROM bonus_results WHERE id = ?`,
      [bonusResultId]
    );

    // Step 7 — Return combined response
    return sendSuccess(
      res,
      'Penilaian KPI berhasil disimpan dan bonus telah dihitung',
      {
        assessment: assessmentRows[0],
        bonus_result: bonusRows[0],
      },
      201
    );
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/kpi/assessments
 *
 * Returns all KPI assessments ordered by creation date descending.
 * Requirements: 6.8
 */
router.get('/', async (req, res, next) => {
  try {
    const assessments = await query(
      `SELECT id, employee_id, period_id, sales_unit, avg_transaction,
              attendance_score, customer_satisfaction, created_at, updated_at
       FROM kpi_assessments ORDER BY created_at DESC`
    );
    return sendSuccess(res, 'Daftar penilaian KPI berhasil diambil', assessments);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/kpi/assessments/:id
 *
 * Returns a single KPI assessment by ID, or 404 if not found.
 * Requirements: 6.9
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const rows = await query(
      `SELECT id, employee_id, period_id, sales_unit, avg_transaction,
              attendance_score, customer_satisfaction, created_at, updated_at
       FROM kpi_assessments WHERE id = ?`,
      [id]
    );
    if (rows.length === 0) {
      return sendError(res, 'Penilaian KPI tidak ditemukan', [], 404);
    }
    return sendSuccess(res, 'Data penilaian KPI berhasil diambil', rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/kpi/assessments/:id
 *
 * Updates an existing KPI assessment and recalculates SAW scores and bonus.
 * Steps:
 *   1. Validate request body fields (Requirements 6.2–6.5)
 *   2. Check assessment exists → 404 if not found (Requirements 6.10)
 *   3. UPDATE kpi_assessments with new values
 *   4. Recalculate SAW scores and bonus
 *   5. UPDATE bonus_results with new scores
 *   6. Return 200 with updated assessment + bonus_result
 *
 * Requirements: 6.8, 6.9, 6.10
 */
router.put('/:id', assessmentValidations, async (req, res, next) => {
  try {
    // Step 1 — Field validation
    if (handleValidationErrors(req, res)) return;

    const { id } = req.params;
    const {
      employee_id,
      period_id,
      sales_unit,
      avg_transaction,
      attendance_score,
      customer_satisfaction,
    } = req.body;

    // Step 2 — Check assessment exists
    const existingRows = await query(
      'SELECT id FROM kpi_assessments WHERE id = ?',
      [id]
    );
    if (existingRows.length === 0) {
      return sendError(res, 'Penilaian KPI tidak ditemukan', [], 404);
    }

    // Step 3 — UPDATE kpi_assessments
    await query(
      `UPDATE kpi_assessments
       SET employee_id = ?, period_id = ?, sales_unit = ?,
           avg_transaction = ?, attendance_score = ?, customer_satisfaction = ?
       WHERE id = ?`,
      [
        parseInt(employee_id, 10),
        parseInt(period_id, 10),
        parseInt(sales_unit, 10),
        parseFloat(avg_transaction),
        parseFloat(attendance_score),
        parseFloat(customer_satisfaction),
        id,
      ]
    );

    // Step 4 — Recalculate SAW scores and bonus
    const salesScore = calculateSalesScore(parseInt(sales_unit, 10));
    const transactionScore = calculateTransactionScore(parseFloat(avg_transaction));
    const finalScore = calculateFinalScore(
      salesScore,
      transactionScore,
      parseFloat(attendance_score),
      parseFloat(customer_satisfaction)
    );
    const { bonus_percentage, bonus_amount } = calculateBonus(finalScore);

    // Step 5 — UPDATE bonus_results where assessment_id = :id
    await query(
      `UPDATE bonus_results
       SET employee_id = ?, period_id = ?,
           sales_score = ?, transaction_score = ?,
           attendance_score = ?, satisfaction_score = ?,
           final_score = ?, bonus_percentage = ?, bonus_amount = ?
       WHERE assessment_id = ?`,
      [
        parseInt(employee_id, 10),
        parseInt(period_id, 10),
        salesScore,
        transactionScore,
        parseFloat(attendance_score),
        parseFloat(customer_satisfaction),
        finalScore,
        bonus_percentage,
        bonus_amount,
        id,
      ]
    );

    // Fetch updated records for the response
    const assessmentRows = await query(
      `SELECT id, employee_id, period_id, sales_unit, avg_transaction,
              attendance_score, customer_satisfaction, created_at, updated_at
       FROM kpi_assessments WHERE id = ?`,
      [id]
    );

    const bonusRows = await query(
      `SELECT id, assessment_id, employee_id, period_id,
              sales_score, transaction_score, attendance_score, satisfaction_score,
              final_score, bonus_percentage, bonus_amount, calculated_at
       FROM bonus_results WHERE assessment_id = ?`,
      [id]
    );

    // Step 6 — Return updated data
    return sendSuccess(
      res,
      'Penilaian KPI berhasil diperbarui dan bonus telah dihitung ulang',
      {
        assessment: assessmentRows[0],
        bonus_result: bonusRows[0],
      },
      200
    );
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/kpi/assessments/:id
 *
 * Deletes an existing KPI assessment and its associated bonus result.
 * Steps:
 *   1. Check assessment exists → 404 if not found (Requirements 6.10)
 *   2. DELETE from bonus_results where assessment_id = :id (child first)
 *   3. DELETE from kpi_assessments where id = :id
 *   4. Return 200 success
 *
 * Requirements: 6.8, 6.9, 6.10
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Step 1 — Check assessment exists
    const existingRows = await query(
      'SELECT id FROM kpi_assessments WHERE id = ?',
      [id]
    );
    if (existingRows.length === 0) {
      return sendError(res, 'Penilaian KPI tidak ditemukan', [], 404);
    }

    // Step 2 — DELETE child record first (bonus_results)
    await query('DELETE FROM bonus_results WHERE assessment_id = ?', [id]);

    // Step 3 — DELETE parent record (kpi_assessments)
    await query('DELETE FROM kpi_assessments WHERE id = ?', [id]);

    // Step 4 — Return success
    return sendSuccess(res, 'Penilaian KPI berhasil dihapus', null, 200);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
