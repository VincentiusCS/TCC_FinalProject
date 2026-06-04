'use strict';

/**
 * Property-Based Tests untuk Input Penilaian KPI (P18–P20)
 * Feature: erp-kpi-salesman
 *
 * Tests menggunakan fast-check untuk memverifikasi properti kebenaran
 * dari endpoint POST /api/kpi/assessments di kpi-payroll-service.
 */

// ── Disable rate limiter SEBELUM app di-require ───────────────────────────────
process.env.RATE_LIMIT_MAX = '1000000';
process.env.RATE_LIMIT_WINDOW_MS = '1';

const request = require('supertest');
const fc = require('fast-check');

// ── Mock database SEBELUM app di-require ──────────────────────────────────────
jest.mock('../config/database', () => ({
  query: jest.fn(),
  pool: { execute: jest.fn() },
}));

// ── Mock authenticate middleware ──────────────────────────────────────────────
jest.mock('../middleware/authenticate', () => (req, res, next) => {
  req.user = { id: 1, email: 'admin@test.com', name: 'Admin' };
  next();
});

// ── Mock axios untuk cross-service call ke auth-employee-service ──────────────
jest.mock('axios');

const axios = require('axios');
const { query } = require('../config/database');
const app = require('../app');

// ─────────────────────────────────────────────────────────────────────────────
// Setup: reset semua mock sebelum setiap test
// ─────────────────────────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 18: Input assessment KPI valid tersimpan
// Validates: Requirements 6.1
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 18: Input assessment KPI valid tersimpan', () => {

  // Feature: erp-kpi-salesman, Property 18: Input assessment KPI valid tersimpan
  test('POST /api/kpi/assessments dengan data valid mengembalikan 201 dan data tersimpan', async () => {
    await fc.assert(
      fc.asyncProperty(
        // employee_id: integer positif
        fc.integer({ min: 1, max: 9999 }),
        // period_id: integer positif
        fc.integer({ min: 1, max: 9999 }),
        // sales_unit: >= 0
        fc.integer({ min: 0, max: 1000 }),
        // avg_transaction: 200_000_000 – 1_000_000_000
        fc.double({ min: 200000000, max: 1000000000, noNaN: true }),
        // attendance_score: 0 – 100
        fc.double({ min: 0, max: 100, noNaN: true }),
        // customer_satisfaction: 0 – 100
        fc.double({ min: 0, max: 100, noNaN: true }),
        async (
          employee_id,
          period_id,
          sales_unit,
          avg_transaction,
          attendance_score,
          customer_satisfaction
        ) => {
          const assessmentId = 1;
          const bonusResultId = 2;

          // Mock: axios.get → employee ditemukan
          axios.get = jest.fn().mockResolvedValueOnce({
            data: { id: employee_id },
          });

          // Mock urutan query:
          //   1. SELECT kpi_periods (period exists)
          //   2. INSERT kpi_assessments → { insertId: assessmentId }
          //   3. INSERT bonus_results → { insertId: bonusResultId }
          //   4. SELECT kpi_assessments (fetch created row)
          //   5. SELECT bonus_results (fetch created row)
          query
            .mockResolvedValueOnce([{ id: period_id }])         // period exists
            .mockResolvedValueOnce({ insertId: assessmentId })  // INSERT kpi_assessments
            .mockResolvedValueOnce({ insertId: bonusResultId }) // INSERT bonus_results
            .mockResolvedValueOnce([                            // SELECT kpi_assessments
              {
                id: assessmentId,
                employee_id,
                period_id,
                sales_unit,
                avg_transaction,
                attendance_score,
                customer_satisfaction,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ])
            .mockResolvedValueOnce([                            // SELECT bonus_results
              {
                id: bonusResultId,
                assessment_id: assessmentId,
                employee_id,
                period_id,
                sales_score: 0,
                transaction_score: 0,
                attendance_score,
                satisfaction_score: customer_satisfaction,
                final_score: 0,
                bonus_percentage: 0,
                bonus_amount: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ]);

          const res = await request(app)
            .post('/api/kpi/assessments')
            .send({
              employee_id,
              period_id,
              sales_unit,
              avg_transaction,
              attendance_score,
              customer_satisfaction,
            });

          // Assert: 201, success true, data assessment ada
          expect(res.status).toBe(201);
          expect(res.body.success).toBe(true);
          expect(res.body.data).toBeDefined();
          expect(res.body.data.assessment).toBeDefined();
          expect(res.body.data.assessment.id).toBe(assessmentId);
          expect(res.body.data.bonus_result).toBeDefined();

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 19: Validasi boundary field assessment KPI
// Validates: Requirements 6.2, 6.3, 6.4, 6.5
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 19: Validasi boundary field assessment KPI', () => {

  // Nilai valid untuk field lainnya saat menguji satu field yang invalid
  const validBaseData = {
    employee_id: 1,
    period_id: 1,
    sales_unit: 5,
    avg_transaction: 500000000,
    attendance_score: 80,
    customer_satisfaction: 75,
  };

  // Feature: erp-kpi-salesman, Property 19: Validasi boundary field assessment KPI
  test('POST /api/kpi/assessments menolak sales_unit < 0 dengan status 400', async () => {
    await fc.assert(
      fc.asyncProperty(
        // sales_unit invalid: < 0
        fc.integer({ max: -1 }),
        async (sales_unit) => {
          const res = await request(app)
            .post('/api/kpi/assessments')
            .send({ ...validBaseData, sales_unit });

          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 19: Validasi boundary field assessment KPI
  test('POST /api/kpi/assessments menolak avg_transaction di bawah 200.000.000 dengan status 400', async () => {
    await fc.assert(
      fc.asyncProperty(
        // avg_transaction invalid: < 200_000_000
        fc.double({ max: 199999999, noNaN: true }),
        async (avg_transaction) => {
          const res = await request(app)
            .post('/api/kpi/assessments')
            .send({ ...validBaseData, avg_transaction });

          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 19: Validasi boundary field assessment KPI
  test('POST /api/kpi/assessments menolak avg_transaction di atas 1.000.000.000 dengan status 400', async () => {
    await fc.assert(
      fc.asyncProperty(
        // avg_transaction invalid: > 1_000_000_000
        fc.double({ min: 1000000001, noNaN: true }).filter((v) => isFinite(v)),
        async (avg_transaction) => {
          const res = await request(app)
            .post('/api/kpi/assessments')
            .send({ ...validBaseData, avg_transaction });

          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 19: Validasi boundary field assessment KPI
  test('POST /api/kpi/assessments menolak attendance_score < 0 dengan status 400', async () => {
    await fc.assert(
      fc.asyncProperty(
        // attendance_score invalid: < 0
        fc.double({ max: -0.001, noNaN: true }).filter((v) => v < 0),
        async (attendance_score) => {
          const res = await request(app)
            .post('/api/kpi/assessments')
            .send({ ...validBaseData, attendance_score });

          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 19: Validasi boundary field assessment KPI
  test('POST /api/kpi/assessments menolak attendance_score > 100 dengan status 400', async () => {
    await fc.assert(
      fc.asyncProperty(
        // attendance_score invalid: > 100
        fc.double({ min: 100.001, noNaN: true }).filter((v) => isFinite(v) && v > 100),
        async (attendance_score) => {
          const res = await request(app)
            .post('/api/kpi/assessments')
            .send({ ...validBaseData, attendance_score });

          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 19: Validasi boundary field assessment KPI
  test('POST /api/kpi/assessments menolak customer_satisfaction < 0 dengan status 400', async () => {
    await fc.assert(
      fc.asyncProperty(
        // customer_satisfaction invalid: < 0
        fc.double({ max: -0.001, noNaN: true }).filter((v) => v < 0),
        async (customer_satisfaction) => {
          const res = await request(app)
            .post('/api/kpi/assessments')
            .send({ ...validBaseData, customer_satisfaction });

          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 19: Validasi boundary field assessment KPI
  test('POST /api/kpi/assessments menolak customer_satisfaction > 100 dengan status 400', async () => {
    await fc.assert(
      fc.asyncProperty(
        // customer_satisfaction invalid: > 100
        fc.double({ min: 100.001, noNaN: true }).filter((v) => isFinite(v) && v > 100),
        async (customer_satisfaction) => {
          const res = await request(app)
            .post('/api/kpi/assessments')
            .send({ ...validBaseData, customer_satisfaction });

          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 19: Validasi boundary field assessment KPI
  // Menguji semua kombinasi field invalid menggunakan oneof
  test('POST /api/kpi/assessments menolak salah satu field invalid dengan status 400', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // sales_unit < 0
          fc.record({
            employee_id: fc.integer({ min: 1 }),
            period_id: fc.integer({ min: 1 }),
            sales_unit: fc.integer({ max: -1 }),
            avg_transaction: fc.double({ min: 200000000, max: 1000000000, noNaN: true }),
            attendance_score: fc.double({ min: 0, max: 100, noNaN: true }),
            customer_satisfaction: fc.double({ min: 0, max: 100, noNaN: true }),
          }),
          // avg_transaction invalid
          fc.record({
            employee_id: fc.integer({ min: 1 }),
            period_id: fc.integer({ min: 1 }),
            sales_unit: fc.integer({ min: 0, max: 1000 }),
            avg_transaction: fc.oneof(
              fc.double({ max: 199999999, noNaN: true }),
              fc.double({ min: 1000000001, noNaN: true }).filter((v) => isFinite(v))
            ),
            attendance_score: fc.double({ min: 0, max: 100, noNaN: true }),
            customer_satisfaction: fc.double({ min: 0, max: 100, noNaN: true }),
          }),
          // attendance_score invalid
          fc.record({
            employee_id: fc.integer({ min: 1 }),
            period_id: fc.integer({ min: 1 }),
            sales_unit: fc.integer({ min: 0, max: 1000 }),
            avg_transaction: fc.double({ min: 200000000, max: 1000000000, noNaN: true }),
            attendance_score: fc.oneof(
              fc.double({ max: -0.001, noNaN: true }).filter((v) => v < 0),
              fc.double({ min: 100.001, noNaN: true }).filter((v) => isFinite(v) && v > 100)
            ),
            customer_satisfaction: fc.double({ min: 0, max: 100, noNaN: true }),
          }),
          // customer_satisfaction invalid
          fc.record({
            employee_id: fc.integer({ min: 1 }),
            period_id: fc.integer({ min: 1 }),
            sales_unit: fc.integer({ min: 0, max: 1000 }),
            avg_transaction: fc.double({ min: 200000000, max: 1000000000, noNaN: true }),
            attendance_score: fc.double({ min: 0, max: 100, noNaN: true }),
            customer_satisfaction: fc.oneof(
              fc.double({ max: -0.001, noNaN: true }).filter((v) => v < 0),
              fc.double({ min: 100.001, noNaN: true }).filter((v) => isFinite(v) && v > 100)
            ),
          })
        ),
        async (invalidData) => {
          const res = await request(app)
            .post('/api/kpi/assessments')
            .send(invalidData);

          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 20: Validasi referensi employee_id dan period_id
// Validates: Requirements 6.6, 6.7
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 20: Validasi referensi employee_id dan period_id', () => {

  // Nilai valid untuk field numerik
  const validFields = {
    sales_unit: 5,
    avg_transaction: 500000000,
    attendance_score: 80,
    customer_satisfaction: 75,
  };

  // Feature: erp-kpi-salesman, Property 20: Validasi referensi employee_id dan period_id
  test('POST /api/kpi/assessments menolak employee_id tidak ada dengan status 422', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 9999 }), // employee_id
        fc.integer({ min: 1, max: 9999 }), // period_id
        async (employee_id, period_id) => {
          // Mock: axios.get melempar error dengan response.status = 404
          const notFoundError = new Error('Not Found');
          notFoundError.response = { status: 404 };
          axios.get = jest.fn().mockRejectedValueOnce(notFoundError);

          const res = await request(app)
            .post('/api/kpi/assessments')
            .send({ employee_id, period_id, ...validFields });

          // Assert: 422, success false
          expect(res.status).toBe(422);
          expect(res.body.success).toBe(false);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 20: Validasi referensi employee_id dan period_id
  test('POST /api/kpi/assessments menolak period_id tidak ada dengan status 422', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 9999 }), // employee_id
        fc.integer({ min: 1, max: 9999 }), // period_id
        async (employee_id, period_id) => {
          // Mock: axios.get berhasil (employee ada)
          axios.get = jest.fn().mockResolvedValueOnce({
            data: { id: employee_id },
          });

          // Mock: query SELECT kpi_periods → kosong (period tidak ada)
          query.mockResolvedValueOnce([]);

          const res = await request(app)
            .post('/api/kpi/assessments')
            .send({ employee_id, period_id, ...validFields });

          // Assert: 422, success false
          expect(res.status).toBe(422);
          expect(res.body.success).toBe(false);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });
});
