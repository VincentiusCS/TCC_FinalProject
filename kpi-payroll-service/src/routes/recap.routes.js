/**
 * Routes for Bonus Recap (/api/kpi/recap).
 * Requirements: 9.1, 9.2, 9.3, 9.4
 */

const express = require('express');
const axios = require('axios');

const { query } = require('../config/database');
const { sendSuccess, sendError } = require('../utils/responseHelper');

const router = express.Router();

async function fetchEmployeeMap(authHeader) {
  const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
  try {
    const response = await axios.get(`${authServiceUrl}/api/employees`, {
      headers: { Authorization: authHeader },
      timeout: 5000,
    });
    const employees = response.data && response.data.data ? response.data.data : [];
    const map = {};
    for (const emp of employees) {
      map[emp.id] = emp;
    }
    return map;
  } catch (_err) {
    return {};
  }
}

function enrichRows(rows, employeeMap) {
  return rows.map((row) => ({
    ...row,
    employee_name: employeeMap[row.employee_id] ? employeeMap[row.employee_id].name : null,
  }));
}

// GET /api/kpi/recap and GET /api/kpi/recap?period_id=X
// Requirements: 9.1, 9.2, 9.3, 9.4
router.get('/', async (req, res, next) => {
  try {
    const { period_id } = req.query;
    const authHeader = req.headers['authorization'] || '';

    let sql = `
      SELECT br.id, br.assessment_id, br.employee_id, br.period_id,
             kp.period_name, br.sales_score, br.transaction_score,
             br.attendance_score, br.satisfaction_score, br.final_score,
             br.bonus_percentage, br.bonus_amount, br.calculated_at
      FROM bonus_results br
      LEFT JOIN kpi_periods kp ON kp.id = br.period_id
    `;
    const params = [];

    if (period_id !== undefined && period_id !== '') {
      const parsedPeriodId = parseInt(period_id, 10);
      if (isNaN(parsedPeriodId) || parsedPeriodId < 1) {
        return sendError(res, 'period_id harus berupa bilangan bulat positif', [], 400);
      }
      sql += ' WHERE br.period_id = ?';
      params.push(parsedPeriodId);
    }

    sql += ' ORDER BY br.calculated_at DESC';

    const rows = await query(sql, params);
    const employeeMap = await fetchEmployeeMap(authHeader);
    const enriched = enrichRows(rows, employeeMap);

    return sendSuccess(res, 'Rekap bonus berhasil diambil', enriched);
  } catch (err) {
    next(err);
  }
});

// GET /api/kpi/recap/:id — single bonus result
// Requirements: 9.3, 9.4
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const authHeader = req.headers['authorization'] || '';

    const rows = await query(
      `SELECT br.id, br.assessment_id, br.employee_id, br.period_id,
              kp.period_name, br.sales_score, br.transaction_score,
              br.attendance_score, br.satisfaction_score, br.final_score,
              br.bonus_percentage, br.bonus_amount, br.calculated_at
       FROM bonus_results br
       LEFT JOIN kpi_periods kp ON kp.id = br.period_id
       WHERE br.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return sendError(res, 'Data rekap bonus tidak ditemukan', [], 404);
    }

    const employeeMap = await fetchEmployeeMap(authHeader);
    const [enriched] = enrichRows(rows, employeeMap);

    return sendSuccess(res, 'Data rekap bonus berhasil diambil', enriched);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
