'use strict';

/**
 * Property-Based Tests untuk CRUD Jabatan (P15)
 * Feature: erp-kpi-salesman
 *
 * Tests menggunakan fast-check untuk memverifikasi properti kebenaran
 * dari endpoint jabatan di auth-employee-service berdasarkan design.md.
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
// Gunakan resetAllMocks agar antrian mockResolvedValueOnce tidak bocor antar tes.
// ─────────────────────────────────────────────────────────────────────────────
beforeEach(() => {
  jest.resetAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 15: Round trip CRUD jabatan
// Validates: Requirements 4.1, 4.2, 4.3, 4.4
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 15: Round trip CRUD jabatan', () => {
  // Feature: erp-kpi-salesman, Property 15: Round trip CRUD jabatan
  test('POST /api/positions membuat jabatan dengan position_name valid', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }).filter(
          (s) => s.trim().length > 0
        ),
        async (position_name) => {
          // Mock: INSERT → { insertId: 1 }, SELECT → baris yang baru dibuat
          query
            .mockResolvedValueOnce({ insertId: 1 })
            .mockResolvedValueOnce([
              {
                id: 1,
                position_name,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ]);

          const res = await request(app)
            .post('/api/positions')
            .send({ position_name });

          // Assert: 201, success true
          expect(res.status).toBe(201);
          expect(res.body.success).toBe(true);

          jest.resetAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 15: Round trip CRUD jabatan
  test('PUT /api/positions/:id memperbarui jabatan yang ada', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.integer({ min: 1 }),
          fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0)
        ),
        async ([id, position_name]) => {
          const trimmedName = position_name.trim();
          // Mock: SELECT exists → [{ id }], UPDATE → { affectedRows: 1 }, SELECT updated → [{ id, position_name (trimmed), ... }]
          query
            .mockResolvedValueOnce([{ id }])
            .mockResolvedValueOnce({ affectedRows: 1 })
            .mockResolvedValueOnce([
              {
                id,
                position_name: trimmedName,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ]);

          const res = await request(app)
            .put(`/api/positions/${id}`)
            .send({ position_name });

          // Assert: 200, success true, data.position_name sesuai input (setelah trim)
          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
          expect(res.body.data.position_name).toBe(trimmedName);

          jest.resetAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 15: Round trip CRUD jabatan
  test('DELETE /api/positions/:id menghapus jabatan yang ada', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1 }),
        async (id) => {
          // Mock: SELECT exists → [{ id }], DELETE → { affectedRows: 1 }
          query
            .mockResolvedValueOnce([{ id }])
            .mockResolvedValueOnce({ affectedRows: 1 });

          const res = await request(app)
            .delete(`/api/positions/${id}`);

          // Assert: 200, success true
          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);

          jest.resetAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 15: Round trip CRUD jabatan
  test('POST /api/positions menolak position_name kosong/hanya whitespace', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string().filter((s) => s.trim().length === 0),
        async (position_name) => {
          const res = await request(app)
            .post('/api/positions')
            .send({ position_name });

          // Assert: 400, success false
          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);

          jest.resetAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });
});
