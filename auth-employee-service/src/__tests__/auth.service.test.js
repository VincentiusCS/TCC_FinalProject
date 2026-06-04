'use strict';

/**
 * Property-Based Tests untuk Autentikasi (P1–P5)
 * Feature: erp-kpi-salesman
 *
 * Tests menggunakan fast-check untuk memverifikasi properti kebenaran
 * dari auth-employee-service berdasarkan design.md.
 */

// ── Disable rate limiter SEBELUM app di-require ───────────────────────────────
// Set limit sangat tinggi agar tidak terkena 429 selama pengujian
process.env.RATE_LIMIT_MAX = '1000000';
process.env.RATE_LIMIT_WINDOW_MS = '1';

const request = require('supertest');
const fc = require('fast-check');

// ── Mock database SEBELUM app di-require ──────────────────────────────────────
jest.mock('../config/database', () => ({
  query: jest.fn(),
  pool: { execute: jest.fn() },
}));

// ── Mock bcryptjs ─────────────────────────────────────────────────────────────
jest.mock('bcryptjs');

const bcrypt = require('bcryptjs');
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
// Property 1: Login menghasilkan token untuk kredensial valid
// Validates: Requirements 1.1
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 1: Login menghasilkan token untuk kredensial valid', () => {
  // Feature: erp-kpi-salesman, Property 1: Login menghasilkan token untuk kredensial valid
  test('POST /api/auth/login mengembalikan 200 dan token non-empty untuk kredensial valid', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.string({ minLength: 6 }),
        }),
        async ({ email, password }) => {
          // Setup: mock query — panggilan pertama return user, kedua return INSERT result
          query
            .mockResolvedValueOnce([
              {
                id: 1,
                email,
                password_hash: 'hashed_password',
                name: 'Test User',
              },
            ])
            .mockResolvedValueOnce({ insertId: 1 });

          // bcrypt.compare selalu true untuk kredensial valid
          bcrypt.compare.mockResolvedValueOnce(true);

          const res = await request(app)
            .post('/api/auth/login')
            .send({ email, password });

          // Assert: status 200, success true, dan data.token non-empty
          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
          expect(res.body.data).toBeDefined();
          expect(typeof res.body.data.token).toBe('string');
          expect(res.body.data.token.length).toBeGreaterThan(0);

          // Reset mocks untuk iterasi berikutnya
          jest.resetAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 2: Login ditolak untuk kredensial tidak valid
// Validates: Requirements 1.2
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 2: Login ditolak untuk kredensial tidak valid', () => {
  // Feature: erp-kpi-salesman, Property 2: Login ditolak untuk kredensial tidak valid
  test('POST /api/auth/login mengembalikan 401 ketika user tidak ditemukan', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.string({ minLength: 6 }),
        }),
        async ({ email, password }) => {
          // Mock: user tidak ditemukan di database
          query.mockResolvedValueOnce([]);
          bcrypt.compare.mockResolvedValueOnce(false);

          const res = await request(app)
            .post('/api/auth/login')
            .send({ email, password });

          // Assert: status 401 dan success false
          expect(res.status).toBe(401);
          expect(res.body.success).toBe(false);

          jest.resetAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 2: Login ditolak untuk kredensial tidak valid (password salah)
  test('POST /api/auth/login mengembalikan 401 ketika password salah', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.string({ minLength: 6 }),
        }),
        async ({ email, password }) => {
          // Mock: user ditemukan tapi password tidak cocok
          query.mockResolvedValueOnce([
            {
              id: 1,
              email,
              password_hash: 'different_hash',
              name: 'Test User',
            },
          ]);
          bcrypt.compare.mockResolvedValueOnce(false);

          const res = await request(app)
            .post('/api/auth/login')
            .send({ email, password });

          // Assert: status 401 dan success false
          expect(res.status).toBe(401);
          expect(res.body.success).toBe(false);

          jest.resetAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 3: Token valid mengizinkan akses; token tidak valid/kadaluarsa menolak
// Validates: Requirements 1.3, 1.5
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 3: Token valid mengizinkan akses; token tidak valid atau kadaluarsa menolak akses', () => {
  // Feature: erp-kpi-salesman, Property 3 (Sub-test A): Token valid mengizinkan akses
  test('GET /api/auth/validate mengembalikan 200 untuk token valid', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        async (token) => {
          const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

          // Mock: session valid dengan expires_at di masa depan
          query.mockResolvedValueOnce([
            {
              id: 1,
              user_id: 1,
              token,
              expires_at: futureDate,
              email: 'admin@example.com',
              name: 'Admin User',
            },
          ]);

          const res = await request(app)
            .get('/api/auth/validate')
            .set('Authorization', `Bearer ${token}`);

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);

          jest.resetAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 3 (Sub-test B): Token tidak valid/tidak ditemukan menolak akses
  test('GET /api/auth/validate mengembalikan 401 untuk token tidak valid', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        async (token) => {
          // Mock: token tidak ditemukan di database
          query.mockResolvedValueOnce([]);

          const res = await request(app)
            .get('/api/auth/validate')
            .set('Authorization', `Bearer ${token}`);

          expect(res.status).toBe(401);
          expect(res.body.success).toBe(false);

          jest.resetAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 3 (Sub-test C): Token kadaluarsa menolak akses
  test('GET /api/auth/validate mengembalikan 401 untuk token kadaluarsa', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        async (token) => {
          const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

          // Mock: session dengan expires_at di masa lalu (sudah kadaluarsa)
          query
            .mockResolvedValueOnce([
              {
                id: 1,
                user_id: 1,
                token,
                expires_at: pastDate,
                email: 'admin@example.com',
                name: 'Admin User',
              },
            ])
            // Mock kedua: DELETE session yang kadaluarsa
            .mockResolvedValueOnce({ affectedRows: 1 });

          const res = await request(app)
            .get('/api/auth/validate')
            .set('Authorization', `Bearer ${token}`);

          expect(res.status).toBe(401);
          expect(res.body.success).toBe(false);

          jest.resetAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 3 (Sub-test D): Tidak ada token menolak akses
  test('GET /api/auth/validate mengembalikan 401 tanpa Authorization header', async () => {
    const res = await request(app).get('/api/auth/validate');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 4: Logout menginvalidasi token
// Validates: Requirements 1.4
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 4: Logout menginvalidasi token', () => {
  // Feature: erp-kpi-salesman, Property 4: Logout menginvalidasi token
  test('POST /api/auth/logout mengembalikan 200 dan menghapus session', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Token harus non-empty setelah trim agar tidak ditolak karena "tidak ditemukan"
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        async (token) => {
          // Mock: DELETE berhasil, 1 baris terpengaruh
          query.mockResolvedValueOnce({ affectedRows: 1 });

          const res = await request(app)
            .post('/api/auth/logout')
            .set('Authorization', `Bearer ${token}`);

          // Assert: status 200, success true
          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);

          // Verifikasi bahwa query DELETE dipanggil dengan token yang benar
          // (token di-trim oleh route handler)
          expect(query).toHaveBeenCalledWith(
            'DELETE FROM sessions WHERE token = ?',
            [token.trim()]
          );

          jest.resetAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 5: Validasi format credential login
// Validates: Requirements 1.6
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 5: Validasi format credential login', () => {
  // Feature: erp-kpi-salesman, Property 5: Validasi format credential — email tidak valid
  test('POST /api/auth/login mengembalikan 400 untuk email dengan format tidak valid', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // Email tidak valid: string biasa yang bukan format email
          // Gunakan string yang pasti tidak mengandung '@' atau domain yang diperlukan
          email: fc.string({ minLength: 1 }).filter(
            (s) => !s.includes('@') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
          ),
          password: fc.string({ minLength: 6 }),
        }),
        async ({ email, password }) => {
          const res = await request(app)
            .post('/api/auth/login')
            .send({ email, password });

          // Assert: harus 400 dengan success: false (validasi gagal)
          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);

          jest.resetAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 5: Validasi format credential — password terlalu pendek
  test('POST /api/auth/login mengembalikan 400 untuk password kurang dari 6 karakter', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          // Password kurang dari 6 karakter (0-5 karakter)
          password: fc.string({ maxLength: 5 }),
        }),
        async ({ email, password }) => {
          const res = await request(app)
            .post('/api/auth/login')
            .send({ email, password });

          // Assert: harus 400 dengan success: false (validasi gagal)
          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);

          jest.resetAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 5: Validasi format credential — oneof invalid email atau password pendek
  test('POST /api/auth/login mengembalikan 400 untuk input tidak valid (email invalid ATAU password < 6 karakter)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // Kasus 1: email tidak valid (string tanpa format email)
          fc.record({
            email: fc.string({ minLength: 1 }).filter(
              (s) => !s.includes('@') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
            ),
            password: fc.string({ minLength: 6 }),
          }),
          // Kasus 2: password terlalu pendek (0-5 karakter)
          fc.record({
            email: fc.emailAddress(),
            password: fc.string({ maxLength: 5 }),
          })
        ),
        async ({ email, password }) => {
          const res = await request(app)
            .post('/api/auth/login')
            .send({ email, password });

          // Assert: harus ditolak dengan 400 (validasi gagal)
          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);

          jest.resetAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });
});
