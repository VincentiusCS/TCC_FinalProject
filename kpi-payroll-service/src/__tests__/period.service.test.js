'use strict';

/**
 * Property-Based Tests untuk CRUD Periode KPI (P16–P17)
 * Feature: erp-kpi-salesman
 *
 * Tests menggunakan fast-check untuk memverifikasi properti kebenaran
 * dari endpoint periode KPI di kpi-payroll-service berdasarkan design.md.
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

const { query } = require('../config/database');
const app = require('../app');

// ─────────────────────────────────────────────────────────────────────────────
// Setup: reset semua mock sebelum setiap test
// ─────────────────────────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 16: Validasi field periode KPI
// Validates: Requirements 5.6
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 16: Validasi field periode KPI', () => {

  // Feature: erp-kpi-salesman, Property 16: Validasi field periode KPI
  test('POST /api/kpi/periods menolak month di luar rentang 1–12', async () => {
    await fc.assert(
      fc.asyncProperty(
        // month di luar [1, 12]: bilangan bulat <= 0 atau >= 13
        fc.oneof(
          fc.integer({ max: 0 }),
          fc.integer({ min: 13 })
        ),
        // period_name valid
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        // year valid
        fc.integer({ min: 1 }),
        async (month, period_name, year) => {
          const res = await request(app)
            .post('/api/kpi/periods')
            .send({ period_name, month, year });

          // Assert: 400, success false
          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 16: Validasi field periode KPI
  test('POST /api/kpi/periods menolak year tidak positif (0 atau negatif)', async () => {
    await fc.assert(
      fc.asyncProperty(
        // month valid
        fc.integer({ min: 1, max: 12 }),
        // period_name valid
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        // year: 0 atau negatif
        fc.integer({ max: 0 }),
        async (month, period_name, year) => {
          const res = await request(app)
            .post('/api/kpi/periods')
            .send({ period_name, month, year });

          // Assert: 400, success false
          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 16: Validasi field periode KPI
  test('POST /api/kpi/periods menolak period_name kosong atau hanya whitespace', async () => {
    await fc.assert(
      fc.asyncProperty(
        // month valid
        fc.integer({ min: 1, max: 12 }),
        // period_name kosong atau hanya whitespace
        fc.string().filter((s) => s.trim().length === 0),
        // year valid
        fc.integer({ min: 1 }),
        async (month, period_name, year) => {
          const res = await request(app)
            .post('/api/kpi/periods')
            .send({ period_name, month, year });

          // Assert: 400, success false
          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 16: Validasi field periode KPI
  test('PUT /api/kpi/periods/:id menolak month di luar rentang 1–12', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1 }), // id valid
        fc.oneof(
          fc.integer({ max: 0 }),
          fc.integer({ min: 13 })
        ),
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        fc.integer({ min: 1 }),
        async (id, month, period_name, year) => {
          const res = await request(app)
            .put(`/api/kpi/periods/${id}`)
            .send({ period_name, month, year });

          // Assert: 400, success false — validasi terjadi sebelum query DB
          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 16: Validasi field periode KPI
  test('PUT /api/kpi/periods/:id menolak year tidak positif', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1 }), // id valid
        fc.integer({ min: 1, max: 12 }),
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        fc.integer({ max: 0 }),
        async (id, month, period_name, year) => {
          const res = await request(app)
            .put(`/api/kpi/periods/${id}`)
            .send({ period_name, month, year });

          // Assert: 400, success false
          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 16: Validasi field periode KPI
  test('PUT /api/kpi/periods/:id menolak period_name kosong', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1 }), // id valid
        fc.integer({ min: 1, max: 12 }),
        fc.string().filter((s) => s.trim().length === 0),
        fc.integer({ min: 1 }),
        async (id, month, period_name, year) => {
          const res = await request(app)
            .put(`/api/kpi/periods/${id}`)
            .send({ period_name, month, year });

          // Assert: 400, success false
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
// Property 17: Round trip CRUD periode KPI
// Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 17: Round trip CRUD periode KPI', () => {

  // Arbitrary untuk data periode KPI valid
  const validPeriodArb = fc.record({
    period_name: fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
    month: fc.integer({ min: 1, max: 12 }),
    year: fc.integer({ min: 2000, max: 2030 }),
  });

  // Feature: erp-kpi-salesman, Property 17: Round trip CRUD periode KPI
  test('POST /api/kpi/periods membuat periode valid dan mengembalikan data yang benar', async () => {
    await fc.assert(
      fc.asyncProperty(
        validPeriodArb,
        async ({ period_name, month, year }) => {
          const insertId = 1;
          const trimmedName = period_name.trim();

          // Mock: INSERT → { insertId }, SELECT → data baru
          query
            .mockResolvedValueOnce({ insertId })
            .mockResolvedValueOnce([
              {
                id: insertId,
                period_name: trimmedName,
                month,
                year,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ]);

          const res = await request(app)
            .post('/api/kpi/periods')
            .send({ period_name, month, year });

          // Assert: 201, success true, data sesuai input
          expect(res.status).toBe(201);
          expect(res.body.success).toBe(true);
          expect(res.body.data).toBeDefined();
          expect(res.body.data.period_name).toBe(trimmedName);
          expect(res.body.data.month).toBe(month);
          expect(res.body.data.year).toBe(year);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 17: Round trip CRUD periode KPI
  test('GET /api/kpi/periods/:id mengembalikan data periode yang dibuat', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1 }),
        validPeriodArb,
        async (id, { period_name, month, year }) => {
          const trimmedName = period_name.trim();

          // Mock: SELECT → data periode
          query.mockResolvedValueOnce([
            {
              id,
              period_name: trimmedName,
              month,
              year,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]);

          const res = await request(app)
            .get(`/api/kpi/periods/${id}`);

          // Assert: 200, success true, data sesuai
          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
          expect(res.body.data.id).toBe(id);
          expect(res.body.data.period_name).toBe(trimmedName);
          expect(res.body.data.month).toBe(month);
          expect(res.body.data.year).toBe(year);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 17: Round trip CRUD periode KPI
  test('PUT /api/kpi/periods/:id — update tercermin saat dibaca kembali', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1 }),
        validPeriodArb,
        async (id, { period_name, month, year }) => {
          const trimmedName = period_name.trim();

          // Mock: SELECT exists → [{ id }], UPDATE → { affectedRows: 1 }, SELECT updated → data baru
          query
            .mockResolvedValueOnce([{ id }])
            .mockResolvedValueOnce({ affectedRows: 1 })
            .mockResolvedValueOnce([
              {
                id,
                period_name: trimmedName,
                month,
                year,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ]);

          const res = await request(app)
            .put(`/api/kpi/periods/${id}`)
            .send({ period_name, month, year });

          // Assert: 200, success true, data.period_name sesuai input
          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
          expect(res.body.data.period_name).toBe(trimmedName);
          expect(res.body.data.month).toBe(month);
          expect(res.body.data.year).toBe(year);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 17: Round trip CRUD periode KPI
  test('DELETE /api/kpi/periods/:id menghapus periode yang ada', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1 }),
        async (id) => {
          // Mock: SELECT exists → [{ id }], DELETE → { affectedRows: 1 }
          query
            .mockResolvedValueOnce([{ id }])
            .mockResolvedValueOnce({ affectedRows: 1 });

          const res = await request(app)
            .delete(`/api/kpi/periods/${id}`);

          // Assert: 200, success true
          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 17: Round trip CRUD periode KPI
  test('GET /api/kpi/periods/:id mengembalikan 404 setelah periode dihapus', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1 }),
        async (id) => {
          // Simulasi: periode sudah dihapus → SELECT mengembalikan array kosong
          query.mockResolvedValueOnce([]);

          const res = await request(app)
            .get(`/api/kpi/periods/${id}`);

          // Assert: 404, success false
          expect(res.status).toBe(404);
          expect(res.body.success).toBe(false);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 17: Round trip CRUD periode KPI
  test('GET /api/kpi/periods mengembalikan daftar semua periode', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Buat 1-5 periode valid
        fc.array(validPeriodArb, { minLength: 1, maxLength: 5 }),
        async (periods) => {
          const rows = periods.map((p, idx) => ({
            id: idx + 1,
            period_name: p.period_name.trim(),
            month: p.month,
            year: p.year,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));

          // Mock: SELECT semua periode
          query.mockResolvedValueOnce(rows);

          const res = await request(app)
            .get('/api/kpi/periods');

          // Assert: 200, success true, array data
          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBe(rows.length);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });
});
