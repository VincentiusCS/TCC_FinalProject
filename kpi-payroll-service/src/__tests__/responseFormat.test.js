'use strict';

/**
 * Property-Based Tests untuk Format Response JSON (P28)
 * Feature: erp-kpi-salesman
 *
 * Memverifikasi bahwa SEMUA response dari kpi-payroll-service selalu
 * mengikuti format JSON yang konsisten:
 *   - Success: { success: true,  message: string, data: any }
 *   - Error:   { success: false, message: string, errors: array }
 *
 * Validates: Requirements 13.1, 13.2, 13.3
 */

// ── Disable rate limiter SEBELUM app di-require ────────────────────────────────
process.env.RATE_LIMIT_MAX = '1000000';
process.env.RATE_LIMIT_WINDOW_MS = '1';

const request = require('supertest');
const fc = require('fast-check');

// ── Mock database SEBELUM app di-require ──────────────────────────────────────
jest.mock('../config/database', () => ({
  query: jest.fn(),
  pool: { execute: jest.fn() },
}));

// ── Mock authenticate middleware SEBELUM app di-require ───────────────────────
jest.mock('../middleware/authenticate', () => (req, _res, next) => {
  req.user = { id: 1, email: 'admin@test.com', name: 'Admin' };
  next();
});

// ── Mock axios untuk cross-service call ───────────────────────────────────────
jest.mock('axios');

// ── Mock storage SEBELUM app di-require ───────────────────────────────────────
jest.mock('../config/storage', () => ({
  storage: null,
  bucket: null,
}));

const axios = require('axios');
const { query } = require('../config/database');
const app = require('../app');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Assert the general format contract: success is boolean, message is string,
 * and the format-specific field (data or errors) is present.
 */
function assertResponseFormat(body) {
  expect(typeof body.success).toBe('boolean');
  expect(typeof body.message).toBe('string');

  if (body.success === true) {
    // Success responses must have 'data' key
    expect(Object.prototype.hasOwnProperty.call(body, 'data')).toBe(true);
  } else {
    // Error responses must have 'errors' array
    expect(Array.isArray(body.errors)).toBe(true);
  }
}

/**
 * Assert success response format: { success: true, message: string, data: any }
 */
function assertSuccessFormat(body) {
  expect(body).toHaveProperty('success', true);
  expect(typeof body.message).toBe('string');
  expect(Object.prototype.hasOwnProperty.call(body, 'data')).toBe(true);
}

/**
 * Assert error response format: { success: false, message: string, errors: array }
 */
function assertErrorFormat(body) {
  expect(body).toHaveProperty('success', false);
  expect(typeof body.message).toBe('string');
  expect(Array.isArray(body.errors)).toBe(true);
}

// Reset all mocks before each test
beforeEach(() => {
  jest.resetAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// Unit Tests: Format response per endpoint
// ─────────────────────────────────────────────────────────────────────────────

describe('Unit Tests: Format response per endpoint', () => {

  // GET /api/kpi/periods — success format
  test('GET /api/kpi/periods mengembalikan success format', async () => {
    query.mockResolvedValueOnce([
      { id: 1, period_name: 'Periode Januari 2024', month: 1, year: 2024 },
    ]);

    const res = await request(app).get('/api/kpi/periods');

    expect(res.status).toBe(200);
    assertSuccessFormat(res.body);
  });

  // POST /api/kpi/periods invalid month → error format
  test('POST /api/kpi/periods dengan month invalid mengembalikan error format', async () => {
    const res = await request(app)
      .post('/api/kpi/periods')
      .send({ period_name: 'Test', month: 13, year: 2024 });

    expect(res.status).toBe(400);
    assertErrorFormat(res.body);
  });

  // GET /api/kpi/periods/:id not found → error format
  test('GET /api/kpi/periods/:id yang tidak ditemukan mengembalikan error format (404)', async () => {
    query.mockResolvedValueOnce([]);

    const res = await request(app).get('/api/kpi/periods/99999');

    expect(res.status).toBe(404);
    assertErrorFormat(res.body);
  });

  // POST /api/kpi/assessments invalid field → error format
  test('POST /api/kpi/assessments dengan sales_unit negatif mengembalikan error format', async () => {
    const res = await request(app)
      .post('/api/kpi/assessments')
      .send({
        employee_id: 1,
        period_id: 1,
        sales_unit: -1,
        avg_transaction: 500000000,
        attendance_score: 80,
        customer_satisfaction: 75,
      });

    expect(res.status).toBe(400);
    assertErrorFormat(res.body);
  });

  // GET /api/kpi/recap — success format
  test('GET /api/kpi/recap mengembalikan success format', async () => {
    query.mockResolvedValueOnce([]);
    axios.get = jest.fn().mockResolvedValueOnce({ data: { data: [] } });

    const res = await request(app).get('/api/kpi/recap');

    expect(res.status).toBe(200);
    assertSuccessFormat(res.body);
  });

  // GET /api/reports — success format
  test('GET /api/reports mengembalikan success format', async () => {
    query.mockResolvedValueOnce([]);

    const res = await request(app).get('/api/reports');

    expect(res.status).toBe(200);
    assertSuccessFormat(res.body);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 28: Semua response API menggunakan format JSON yang konsisten
// Feature: erp-kpi-salesman, Property 28: Semua response API menggunakan format JSON yang konsisten
// Validates: Requirements 13.1, 13.2, 13.3
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 28: Semua response API menggunakan format JSON yang konsisten', () => {

  // Feature: erp-kpi-salesman, Property 28: GET /api/kpi/periods (valid data) → success format
  test('GET /api/kpi/periods dengan data yang di-mock selalu mengembalikan success format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 9999 }),
            period_name: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
            month: fc.integer({ min: 1, max: 12 }),
            year: fc.integer({ min: 2000, max: 2030 }),
            created_at: fc.constant(new Date().toISOString()),
            updated_at: fc.constant(new Date().toISOString()),
          }),
          { maxLength: 5 }
        ),
        async (periods) => {
          jest.resetAllMocks();
          query.mockResolvedValueOnce(periods);

          const res = await request(app).get('/api/kpi/periods');

          expect(res.status).toBe(200);
          assertSuccessFormat(res.body);
          assertResponseFormat(res.body);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 28: POST /api/kpi/periods (invalid month) → error format
  test('POST /api/kpi/periods dengan month di luar rentang 1-12 selalu mengembalikan error format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.integer({ max: 0 }),
          fc.integer({ min: 13 })
        ),
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        fc.integer({ min: 2000, max: 2030 }),
        async (month, period_name, year) => {
          jest.resetAllMocks();

          const res = await request(app)
            .post('/api/kpi/periods')
            .send({ period_name, month, year });

          expect(res.status).toBe(400);
          assertErrorFormat(res.body);
          assertResponseFormat(res.body);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 28: GET /api/kpi/periods/:id (not found) → error format
  test('GET /api/kpi/periods/:id yang tidak ditemukan selalu mengembalikan error format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 99999 }),
        async (id) => {
          jest.resetAllMocks();
          query.mockResolvedValueOnce([]); // Tidak ditemukan

          const res = await request(app).get(`/api/kpi/periods/${id}`);

          expect(res.status).toBe(404);
          assertErrorFormat(res.body);
          assertResponseFormat(res.body);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 28: POST /api/kpi/assessments (invalid field) → error format
  test('POST /api/kpi/assessments dengan field invalid selalu mengembalikan error format', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate invalid assessment payloads: at least one field violates constraints
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
          // avg_transaction out of range
          fc.record({
            employee_id: fc.integer({ min: 1 }),
            period_id: fc.integer({ min: 1 }),
            sales_unit: fc.integer({ min: 0, max: 1000 }),
            avg_transaction: fc.integer({ max: 199999999 }),
            attendance_score: fc.double({ min: 0, max: 100, noNaN: true }),
            customer_satisfaction: fc.double({ min: 0, max: 100, noNaN: true }),
          }),
          // attendance_score > 100
          fc.record({
            employee_id: fc.integer({ min: 1 }),
            period_id: fc.integer({ min: 1 }),
            sales_unit: fc.integer({ min: 0, max: 1000 }),
            avg_transaction: fc.double({ min: 200000000, max: 1000000000, noNaN: true }),
            attendance_score: fc.double({ min: 100.001, noNaN: true }).filter((v) => isFinite(v) && v > 100),
            customer_satisfaction: fc.double({ min: 0, max: 100, noNaN: true }),
          }),
          // customer_satisfaction < 0
          fc.record({
            employee_id: fc.integer({ min: 1 }),
            period_id: fc.integer({ min: 1 }),
            sales_unit: fc.integer({ min: 0, max: 1000 }),
            avg_transaction: fc.double({ min: 200000000, max: 1000000000, noNaN: true }),
            attendance_score: fc.double({ min: 0, max: 100, noNaN: true }),
            customer_satisfaction: fc.double({ max: -0.001, noNaN: true }).filter((v) => v < 0),
          })
        ),
        async (invalidPayload) => {
          jest.resetAllMocks();

          const res = await request(app)
            .post('/api/kpi/assessments')
            .send(invalidPayload);

          expect(res.status).toBe(400);
          assertErrorFormat(res.body);
          assertResponseFormat(res.body);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 28: GET /api/kpi/recap (success) → success format
  test('GET /api/kpi/recap dengan data yang di-mock selalu mengembalikan success format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 9999 }),
            employee_id: fc.integer({ min: 1, max: 9999 }),
            period_id: fc.integer({ min: 1, max: 9999 }),
            period_name: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
            final_score: fc.double({ min: 0, max: 100, noNaN: true }),
            bonus_percentage: fc.double({ min: 0, max: 100, noNaN: true }),
            bonus_amount: fc.integer({ min: 0, max: 2000000 }),
            calculated_at: fc.constant(new Date().toISOString()),
          }),
          { maxLength: 5 }
        ),
        async (bonusRows) => {
          jest.resetAllMocks();
          query.mockResolvedValueOnce(bonusRows);
          // fetchEmployeeMap call — gracefully returns empty map
          axios.get = jest.fn().mockResolvedValueOnce({ data: { data: [] } });

          const res = await request(app).get('/api/kpi/recap');

          expect(res.status).toBe(200);
          assertSuccessFormat(res.body);
          assertResponseFormat(res.body);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 28: GET /api/reports (success) → success format
  test('GET /api/reports dengan data yang di-mock selalu mengembalikan success format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 9999 }),
            period_id: fc.integer({ min: 1, max: 9999 }),
            period_name: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
            file_name: fc.string({ minLength: 1, maxLength: 100 }),
            file_url: fc.string({ minLength: 1, maxLength: 200 }),
            generated_at: fc.constant(new Date().toISOString()),
          }),
          { maxLength: 5 }
        ),
        async (reports) => {
          jest.resetAllMocks();
          query.mockResolvedValueOnce(reports);

          const res = await request(app).get('/api/reports');

          expect(res.status).toBe(200);
          assertSuccessFormat(res.body);
          assertResponseFormat(res.body);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 28: Mixed scenarios always return correct format shape
  test('Berbagai endpoint selalu mengembalikan response dengan field success (boolean) dan message (string)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // Scenario 1: GET /api/kpi/periods (success, empty list)
          fc.record({ scenario: fc.constant('get-periods') }),
          // Scenario 2: POST /api/kpi/periods month invalid (error)
          fc.record({
            scenario: fc.constant('post-period-invalid'),
            month: fc.oneof(fc.integer({ max: 0 }), fc.integer({ min: 13 })),
          }),
          // Scenario 3: GET /api/kpi/periods/:id not found (error)
          fc.record({
            scenario: fc.constant('period-not-found'),
            id: fc.integer({ min: 1, max: 9999 }),
          }),
          // Scenario 4: GET /api/kpi/recap (success)
          fc.record({ scenario: fc.constant('get-recap') }),
          // Scenario 5: GET /api/reports (success)
          fc.record({ scenario: fc.constant('get-reports') }),
          // Scenario 6: POST /api/kpi/assessments invalid (error)
          fc.record({
            scenario: fc.constant('post-assessment-invalid'),
            sales_unit: fc.integer({ max: -1 }),
          })
        ),
        async (scenarioData) => {
          jest.resetAllMocks();

          let res;

          switch (scenarioData.scenario) {
            case 'get-periods':
              query.mockResolvedValueOnce([]);
              res = await request(app).get('/api/kpi/periods');
              break;

            case 'post-period-invalid':
              res = await request(app)
                .post('/api/kpi/periods')
                .send({ period_name: 'Test', month: scenarioData.month, year: 2024 });
              break;

            case 'period-not-found':
              query.mockResolvedValueOnce([]);
              res = await request(app).get(`/api/kpi/periods/${scenarioData.id}`);
              break;

            case 'get-recap':
              query.mockResolvedValueOnce([]);
              axios.get = jest.fn().mockResolvedValueOnce({ data: { data: [] } });
              res = await request(app).get('/api/kpi/recap');
              break;

            case 'get-reports':
              query.mockResolvedValueOnce([]);
              res = await request(app).get('/api/reports');
              break;

            case 'post-assessment-invalid':
              res = await request(app)
                .post('/api/kpi/assessments')
                .send({
                  employee_id: 1,
                  period_id: 1,
                  sales_unit: scenarioData.sales_unit,
                  avg_transaction: 500000000,
                  attendance_score: 80,
                  customer_satisfaction: 75,
                });
              break;

            default:
              return true;
          }

          // Core property: every response must conform to the format contract
          assertResponseFormat(res.body);
        }
      ),
      { numRuns: 100 }
    );
  });
});
