'use strict';

/**
 * Property-Based Tests untuk Format Response JSON (P28)
 * Feature: erp-kpi-salesman
 *
 * Memverifikasi bahwa SEMUA response dari auth-employee-service selalu
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

// ── Mock bcryptjs SEBELUM app di-require ──────────────────────────────────────
jest.mock('bcryptjs');

// ── Mock database SEBELUM app di-require ──────────────────────────────────────
jest.mock('../config/database', () => ({
  query: jest.fn(),
  pool: { execute: jest.fn() },
}));

// ── Mock storage SEBELUM app di-require ───────────────────────────────────────
jest.mock('../config/storage', () => ({
  storage: null,
  bucket: null,
}));

// ── Mock authenticate middleware SEBELUM app di-require ───────────────────────
// Bypass auth so we can reach protected endpoints without a real session
jest.mock('../middleware/authenticate', () => {
  return (req, _res, next) => {
    req.user = { id: 1, email: 'admin@example.com', name: 'Admin' };
    req.token = 'mock-token';
    next();
  };
});

const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const app = require('../app');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Assert that a response body conforms to the success format.
 * { success: true, message: string, data: any }
 */
function assertSuccessFormat(body) {
  expect(body).toHaveProperty('success', true);
  expect(typeof body.message).toBe('string');
  // 'data' key must be present (value can be null/undefined after JSON round-trip
  // only if explicitly set; since JSON.stringify drops undefined, we check 'in')
  expect(Object.prototype.hasOwnProperty.call(body, 'data')).toBe(true);
}

/**
 * Assert that a response body conforms to the error format.
 * { success: false, message: string, errors: array }
 */
function assertErrorFormat(body) {
  expect(body).toHaveProperty('success', false);
  expect(typeof body.message).toBe('string');
  expect(Array.isArray(body.errors)).toBe(true);
}

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

// Reset all mocks (including queued return values) before each test
beforeEach(() => {
  jest.resetAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// Unit Tests: specific endpoint scenarios
// ─────────────────────────────────────────────────────────────────────────────

describe('Unit Tests: Format response per endpoint', () => {
  // POST /api/auth/login — valid mocked data → success format
  test('POST /api/auth/login dengan data valid mengembalikan success format', async () => {
    query
      .mockResolvedValueOnce([
        { id: 1, email: 'admin@example.com', password_hash: '$2b$10$hash', name: 'Admin' },
      ])
      .mockResolvedValueOnce({ insertId: 1 });

    bcrypt.compare.mockResolvedValueOnce(true);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    assertSuccessFormat(res.body);
  });

  // POST /api/auth/login — invalid email → error format
  test('POST /api/auth/login dengan email tidak valid mengembalikan error format', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bukan-email', password: 'password123' });

    expect(res.status).toBe(400);
    assertErrorFormat(res.body);
  });

  // GET /api/employees — mocked data → success format
  test('GET /api/employees dengan data yang di-mock mengembalikan success format', async () => {
    query.mockResolvedValueOnce([
      {
        id: 1,
        employee_code: 'EMP001',
        name: 'Budi Santoso',
        email: 'budi@example.com',
        phone: '081234567890',
        position_id: 1,
        photo_url: null,
        created_at: new Date(),
        updated_at: new Date(),
        position_name: 'Sales',
      },
    ]);

    const res = await request(app)
      .get('/api/employees')
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(200);
    assertSuccessFormat(res.body);
  });

  // POST /api/employees — missing name → error format
  test('POST /api/employees dengan name kosong mengembalikan error format', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', 'Bearer mock-token')
      .send({
        employee_code: 'EMP001',
        name: '',
        email: 'budi@example.com',
        phone: '081234567890',
      });

    expect(res.status).toBe(400);
    assertErrorFormat(res.body);
  });

  // GET /api/employees/999 — not found → error format
  test('GET /api/employees/999 yang tidak ditemukan mengembalikan error format (404)', async () => {
    // Route does: SELECT ... WHERE e.id = ? → empty array → 404
    query.mockResolvedValueOnce([]);

    const res = await request(app)
      .get('/api/employees/999')
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(404);
    assertErrorFormat(res.body);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 28: Semua response API menggunakan format JSON yang konsisten
// Feature: erp-kpi-salesman, Property 28: Semua response API menggunakan format JSON yang konsisten
// Validates: Requirements 13.1, 13.2, 13.3
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 28: Semua response API menggunakan format JSON yang konsisten', () => {
  // ── Sub-property: Auth endpoints ────────────────────────────────────────────

  // Feature: erp-kpi-salesman, Property 28: Login (valid credentials) → success format
  test('POST /api/auth/login dengan input valid selalu mengembalikan format konsisten', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.string({ minLength: 6 }),
        }),
        async ({ email, password }) => {
          jest.resetAllMocks();

          query
            .mockResolvedValueOnce([
              { id: 1, email, password_hash: 'hashed', name: 'Test' },
            ])
            .mockResolvedValueOnce({ insertId: 1 });

          bcrypt.compare.mockResolvedValueOnce(true);

          const res = await request(app)
            .post('/api/auth/login')
            .send({ email, password });

          assertResponseFormat(res.body);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 28: Login (invalid email format) → error format
  test('POST /api/auth/login dengan email tidak valid selalu mengembalikan error format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }).filter(
          (s) => !s.includes('@') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
        ),
        async (invalidEmail) => {
          jest.resetAllMocks();

          const res = await request(app)
            .post('/api/auth/login')
            .send({ email: invalidEmail, password: 'password123' });

          assertErrorFormat(res.body);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 28: Login (short password) → error format
  test('POST /api/auth/login dengan password pendek selalu mengembalikan error format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.string({ maxLength: 5 }),
        }),
        async ({ email, password }) => {
          jest.resetAllMocks();

          const res = await request(app)
            .post('/api/auth/login')
            .send({ email, password });

          assertErrorFormat(res.body);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 28: GET /api/employees → success format
  test('GET /api/employees selalu mengembalikan success format', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a random number of mock employees (0-5)
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 9999 }),
            employee_code: fc.string({ minLength: 1, maxLength: 10 }),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            email: fc.emailAddress(),
            phone: fc.stringMatching(/^\d{10,13}$/),
            position_id: fc.option(fc.integer({ min: 1, max: 100 }), { nil: null }),
            photo_url: fc.constant(null),
            created_at: fc.constant(new Date().toISOString()),
            updated_at: fc.constant(new Date().toISOString()),
            position_name: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: null }),
          }),
          { maxLength: 5 }
        ),
        async (employees) => {
          jest.resetAllMocks();
          query.mockResolvedValueOnce(employees);

          const res = await request(app)
            .get('/api/employees')
            .set('Authorization', 'Bearer mock-token');

          assertSuccessFormat(res.body);
          expect(res.status).toBe(200);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 28: POST /api/employees (invalid input) → error format
  test('POST /api/employees dengan input tidak valid selalu mengembalikan error format', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate invalid employee payloads: at least one invalid field
        fc.oneof(
          // name kosong
          fc.record({
            employee_code: fc.string({ minLength: 1 }),
            name: fc.constant(''),
            email: fc.emailAddress(),
            phone: fc.stringMatching(/^\d{10,13}$/),
          }),
          // email tidak valid
          fc.record({
            employee_code: fc.string({ minLength: 1 }),
            name: fc.string({ minLength: 1 }),
            email: fc.string({ minLength: 1 }).filter(
              (s) => !s.includes('@') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
            ),
            phone: fc.stringMatching(/^\d{10,13}$/),
          }),
          // phone terlalu pendek (< 10 digit)
          fc.record({
            employee_code: fc.string({ minLength: 1 }),
            name: fc.string({ minLength: 1 }),
            email: fc.emailAddress(),
            phone: fc.stringMatching(/^\d{1,9}$/),
          })
        ),
        async (payload) => {
          jest.resetAllMocks();

          const res = await request(app)
            .post('/api/employees')
            .set('Authorization', 'Bearer mock-token')
            .send(payload);

          assertErrorFormat(res.body);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 28: GET /api/employees/:id (found) → success format
  test('GET /api/employees/:id yang ditemukan selalu mengembalikan success format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 9999 }),
        async (id) => {
          jest.resetAllMocks();

          const mockEmployee = {
            id,
            employee_code: 'EMP001',
            name: 'Test Employee',
            email: 'test@example.com',
            phone: '081234567890',
            position_id: 1,
            photo_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            position_name: 'Sales',
          };

          // Route calls query once for SELECT
          query.mockResolvedValueOnce([mockEmployee]);

          const res = await request(app)
            .get(`/api/employees/${id}`)
            .set('Authorization', 'Bearer mock-token');

          expect(res.status).toBe(200);
          assertSuccessFormat(res.body);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 28: GET /api/employees/:id (not found) → error format
  test('GET /api/employees/:id yang tidak ditemukan selalu mengembalikan error format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 9999 }),
        async (id) => {
          jest.resetAllMocks();
          query.mockResolvedValueOnce([]); // Tidak ditemukan

          const res = await request(app)
            .get(`/api/employees/${id}`)
            .set('Authorization', 'Bearer mock-token');

          expect(res.status).toBe(404);
          assertErrorFormat(res.body);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 28: GET /api/positions → success format
  test('GET /api/positions selalu mengembalikan success format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 9999 }),
            position_name: fc.string({ minLength: 1, maxLength: 50 }),
            created_at: fc.constant(new Date().toISOString()),
            updated_at: fc.constant(new Date().toISOString()),
          }),
          { maxLength: 5 }
        ),
        async (positions) => {
          jest.resetAllMocks();
          query.mockResolvedValueOnce(positions);

          const res = await request(app)
            .get('/api/positions')
            .set('Authorization', 'Bearer mock-token');

          expect(res.status).toBe(200);
          assertSuccessFormat(res.body);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 28: POST /api/positions (invalid) → error format
  test('POST /api/positions dengan position_name kosong selalu mengembalikan error format', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate empty or whitespace-only position_name
        fc.oneof(
          fc.constant(''),
          fc.constant('   '),
          fc.constant('\t'),
          fc.constant('\n')
        ),
        async (positionName) => {
          jest.resetAllMocks();

          const res = await request(app)
            .post('/api/positions')
            .set('Authorization', 'Bearer mock-token')
            .send({ position_name: positionName });

          expect(res.status).toBe(400);
          assertErrorFormat(res.body);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 28: Mixed endpoints — response always has correct shape
  test('Berbagai endpoint selalu mengembalikan response dengan field success (boolean) dan message (string)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // Scenario 1: login validasi gagal (password kosong)
          fc.record({
            scenario: fc.constant('login-invalid'),
            email: fc.emailAddress(),
            password: fc.constant(''),
          }),
          // Scenario 2: GET employees (success)
          fc.record({
            scenario: fc.constant('get-employees'),
          }),
          // Scenario 3: GET employee not found
          fc.record({
            scenario: fc.constant('employee-not-found'),
            id: fc.integer({ min: 1, max: 9999 }),
          }),
          // Scenario 4: GET positions (success)
          fc.record({
            scenario: fc.constant('get-positions'),
          })
        ),
        async (scenarioData) => {
          jest.resetAllMocks();

          let res;

          switch (scenarioData.scenario) {
            case 'login-invalid':
              res = await request(app)
                .post('/api/auth/login')
                .send({ email: scenarioData.email, password: scenarioData.password });
              break;

            case 'get-employees':
              query.mockResolvedValueOnce([]);
              res = await request(app)
                .get('/api/employees')
                .set('Authorization', 'Bearer mock-token');
              break;

            case 'employee-not-found':
              query.mockResolvedValueOnce([]);
              res = await request(app)
                .get(`/api/employees/${scenarioData.id}`)
                .set('Authorization', 'Bearer mock-token');
              break;

            case 'get-positions':
              query.mockResolvedValueOnce([]);
              res = await request(app)
                .get('/api/positions')
                .set('Authorization', 'Bearer mock-token');
              break;

            default:
              return true;
          }

          // Core property: every response must have the correct format
          assertResponseFormat(res.body);
        }
      ),
      { numRuns: 100 }
    );
  });
});
