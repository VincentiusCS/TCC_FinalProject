'use strict';

/**
 * Property-Based Tests untuk Rekap Bonus (P25–P26)
 * Feature: erp-kpi-salesman
 *
 * Tests menggunakan fast-check untuk memverifikasi properti kebenaran
 * dari endpoint GET /api/kpi/recap di kpi-payroll-service.
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
// Property 25: Filter rekap bonus berdasarkan period_id
// Validates: Requirements 9.1, 9.2
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 25: Filter rekap bonus berdasarkan period_id', () => {

  // Feature: erp-kpi-salesman, Property 25: Filter rekap bonus berdasarkan period_id
  test('GET /api/kpi/recap?period_id=X hanya mengembalikan record dengan period_id yang sama', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate period_id yang akan difilter
        fc.integer({ min: 1, max: 9999 }),
        // Generate 0–5 rows yang semuanya memiliki period_id yang cocok
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 99999 }),
            assessment_id: fc.integer({ min: 1, max: 99999 }),
            employee_id: fc.integer({ min: 1, max: 9999 }),
            sales_score: fc.double({ min: 0, max: 100, noNaN: true }),
            transaction_score: fc.double({ min: 1, max: 100, noNaN: true }),
            attendance_score: fc.double({ min: 0, max: 100, noNaN: true }),
            satisfaction_score: fc.double({ min: 0, max: 100, noNaN: true }),
            final_score: fc.double({ min: 0, max: 100, noNaN: true }),
            bonus_percentage: fc.double({ min: 0, max: 100, noNaN: true }),
            bonus_amount: fc.double({ min: 0, max: 2000000, noNaN: true }),
            period_name: fc.string({ minLength: 1, maxLength: 50 }),
            calculated_at: fc.constant(new Date().toISOString()),
          }),
          { minLength: 0, maxLength: 5 }
        ),
        async (period_id, baseRows) => {
          // Semua rows yang dikembalikan DB memiliki period_id yang sama dengan filter
          const rows = baseRows.map((row) => ({ ...row, period_id }));

          // Mock: query DB mengembalikan rows dengan period_id yang sudah di-filter
          query.mockResolvedValueOnce(rows);

          // Mock: axios.get untuk employees
          axios.get = jest.fn().mockResolvedValueOnce({
            data: { success: true, data: [{ id: 1, name: 'John Doe' }] },
          });

          const res = await request(app)
            .get(`/api/kpi/recap?period_id=${period_id}`);

          // Assert: response sukses
          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);

          // Assert: semua record yang dikembalikan memiliki period_id yang sama
          for (const record of res.body.data) {
            expect(record.period_id).toBe(period_id);
          }

          // Assert: jumlah record sama dengan yang di-mock (tidak ada record dari periode lain)
          expect(res.body.data.length).toBe(rows.length);

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 25: Filter rekap bonus berdasarkan period_id
  test('GET /api/kpi/recap?period_id=X menolak period_id non-positif dengan status 400', async () => {
    await fc.assert(
      fc.asyncProperty(
        // period_id invalid: <= 0 atau NaN
        fc.oneof(
          fc.integer({ max: 0 }),
          fc.constant(-1),
          fc.constant(0)
        ),
        async (invalid_period_id) => {
          const res = await request(app)
            .get(`/api/kpi/recap?period_id=${invalid_period_id}`);

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
// Property 26: Data rekap bonus menyertakan informasi karyawan dan periode
// Validates: Requirements 9.3, 9.4
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 26: Data rekap bonus menyertakan informasi karyawan dan periode', () => {

  // Feature: erp-kpi-salesman, Property 26: Data rekap bonus menyertakan informasi karyawan dan periode
  test('GET /api/kpi/recap setiap record menyertakan employee_name dan period_name', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate 1–5 rows dengan period_name dari JOIN dan employee_id untuk enrichment
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 99999 }),
            assessment_id: fc.integer({ min: 1, max: 99999 }),
            employee_id: fc.integer({ min: 1, max: 9999 }),
            period_id: fc.integer({ min: 1, max: 9999 }),
            sales_score: fc.double({ min: 0, max: 100, noNaN: true }),
            transaction_score: fc.double({ min: 1, max: 100, noNaN: true }),
            attendance_score: fc.double({ min: 0, max: 100, noNaN: true }),
            satisfaction_score: fc.double({ min: 0, max: 100, noNaN: true }),
            final_score: fc.double({ min: 0, max: 100, noNaN: true }),
            bonus_percentage: fc.double({ min: 0, max: 100, noNaN: true }),
            bonus_amount: fc.double({ min: 0, max: 2000000, noNaN: true }),
            period_name: fc.string({ minLength: 1, maxLength: 50 }),
            calculated_at: fc.constant(new Date().toISOString()),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        // Generate daftar employees untuk mock axios
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 9999 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        async (rows, employees) => {
          // Mock: query DB mengembalikan rows dengan period_name dari JOIN
          query.mockResolvedValueOnce(rows);

          // Mock: axios.get mengembalikan daftar employees
          axios.get = jest.fn().mockResolvedValueOnce({
            data: { success: true, data: employees },
          });

          const res = await request(app)
            .get('/api/kpi/recap');

          // Assert: response sukses
          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);

          // Assert: setiap record menyertakan employee_name dan period_name
          for (const record of res.body.data) {
            // employee_name harus ada sebagai property (boleh null jika employee tidak ditemukan)
            expect(record).toHaveProperty('employee_name');
            // period_name harus ada sebagai property (dari JOIN kpi_periods)
            expect(record).toHaveProperty('period_name');

            // Tipe data: string atau null
            expect(
              typeof record.employee_name === 'string' || record.employee_name === null
            ).toBe(true);
            expect(
              typeof record.period_name === 'string' || record.period_name === null
            ).toBe(true);
          }

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 26: Data rekap bonus menyertakan informasi karyawan dan periode
  test('GET /api/kpi/recap mengembalikan employee_name null saat axios gagal (graceful degradation)', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate 1–5 rows dengan period_name dari JOIN
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 99999 }),
            assessment_id: fc.integer({ min: 1, max: 99999 }),
            employee_id: fc.integer({ min: 1, max: 9999 }),
            period_id: fc.integer({ min: 1, max: 9999 }),
            sales_score: fc.double({ min: 0, max: 100, noNaN: true }),
            transaction_score: fc.double({ min: 1, max: 100, noNaN: true }),
            attendance_score: fc.double({ min: 0, max: 100, noNaN: true }),
            satisfaction_score: fc.double({ min: 0, max: 100, noNaN: true }),
            final_score: fc.double({ min: 0, max: 100, noNaN: true }),
            bonus_percentage: fc.double({ min: 0, max: 100, noNaN: true }),
            bonus_amount: fc.double({ min: 0, max: 2000000, noNaN: true }),
            period_name: fc.string({ minLength: 1, maxLength: 50 }),
            calculated_at: fc.constant(new Date().toISOString()),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (rows) => {
          // Mock: query DB mengembalikan rows
          query.mockResolvedValueOnce(rows);

          // Mock: axios.get melempar error (auth-service tidak tersedia)
          axios.get = jest.fn().mockRejectedValueOnce(new Error('Connection refused'));

          const res = await request(app)
            .get('/api/kpi/recap');

          // Assert: response tetap sukses (graceful degradation)
          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);

          // Assert: setiap record tetap menyertakan employee_name (null) dan period_name
          for (const record of res.body.data) {
            expect(record).toHaveProperty('employee_name');
            expect(record).toHaveProperty('period_name');
            // employee_name harus null saat axios gagal
            expect(record.employee_name).toBeNull();
            // period_name tetap ada dari JOIN
            expect(
              typeof record.period_name === 'string' || record.period_name === null
            ).toBe(true);
          }

          jest.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });
});
