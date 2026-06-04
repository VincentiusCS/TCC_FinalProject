'use strict';

/**
 * Property-Based Tests untuk Manajemen Karyawan (P6–P10)
 * Feature: erp-kpi-salesman
 *
 * Tests menggunakan fast-check untuk memverifikasi properti kebenaran
 * dari auth-employee-service berdasarkan design.md.
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

// ── Mock authenticate middleware untuk bypass auth di test ────────────────────
// Seluruh endpoint /api/employees dilindungi authenticate. Bypass agar test
// hanya menguji logika karyawan, bukan autentikasi.
jest.mock('../middleware/authenticate', () => (req, _res, next) => {
  req.user = { id: 1, email: 'admin@test.com', name: 'Test Admin' };
  next();
});

// ── Mock storage (tidak digunakan di endpoint CRUD karyawan, tapi di-require di employees.js) ──
jest.mock('../config/storage', () => ({
  storage: {},
  bucket: null,
}));

const { query } = require('../config/database');
const app = require('../app');

// ─────────────────────────────────────────────────────────────────────────────
// Setup: reset semua mock sebelum setiap test
// Gunakan resetAllMocks (bukan clearAllMocks) agar antrian mockResolvedValueOnce
// dari tes sebelumnya tidak bocor ke tes berikutnya.
// ─────────────────────────────────────────────────────────────────────────────
beforeEach(() => {
  jest.resetAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// Arbitrary helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Generator untuk nomor telepon: string digit minimal 10 karakter */
const phoneArb = fc
  .stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), {
    minLength: 10,
    maxLength: 15,
  });

/** Generator untuk employee_code: string non-kosong printable ASCII */
const employeeCodeArb = fc.string({ minLength: 1, maxLength: 20 }).filter(
  (s) => s.trim().length > 0
);

/** Generator untuk nama karyawan: string non-kosong */
const nameArb = fc.string({ minLength: 1, maxLength: 50 }).filter(
  (s) => s.trim().length > 0
);

/**
 * Membangun objek employee input yang valid.
 * Menggunakan fc.record agar setiap field di-generate secara independen.
 */
const validEmployeeArb = fc.record({
  name: nameArb,
  email: fc.emailAddress(),
  phone: phoneArb,
  employee_code: employeeCodeArb,
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers untuk mock DB sequence pada operasi employees
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Membuat row employee yang akan dikembalikan mock setelah INSERT / SELECT.
 * express-validator normalizeEmail mengubah email (lowercase, dll.),
 * sehingga kita gunakan field `email` langsung dari respon mock DB.
 */
function makeEmployeeRow(id, input) {
  return {
    id,
    employee_code: input.employee_code.trim(),
    name: input.name.trim(),
    email: input.email,          // email dikembalikan apa adanya dari DB
    phone: input.phone.trim(),
    position_id: null,
    photo_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    position_name: null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Property 6: Round trip create-read karyawan
// Feature: erp-kpi-salesman, Property 6: Round trip create-read karyawan
// Validates: Requirements 2.1, 2.4
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 6: Round trip create-read karyawan', () => {
  // Feature: erp-kpi-salesman, Property 6: Round trip create-read karyawan
  test(
    'setelah create berhasil, GET /api/employees/:id mengembalikan data yang identik',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          validEmployeeArb,
          fc.integer({ min: 1, max: 99999 }),
          async (input, insertId) => {
            jest.resetAllMocks();

            const employeeRow = makeEmployeeRow(insertId, input);

            // Sequence mock untuk POST /api/employees:
            // 1. INSERT karyawan → { insertId }
            // 2. SELECT karyawan setelah insert → [row]
            query
              .mockResolvedValueOnce({ insertId })     // INSERT employees
              .mockResolvedValueOnce([employeeRow]);    // SELECT setelah INSERT

            const postRes = await request(app)
              .post('/api/employees')
              .send(input);

            // Assert: create berhasil
            expect(postRes.status).toBe(201);
            expect(postRes.body.success).toBe(true);

            const createdId = postRes.body.data.id;

            // Sequence mock untuk GET /api/employees/:id:
            // SELECT karyawan by ID → [row]
            query.mockResolvedValueOnce([employeeRow]);

            const getRes = await request(app)
              .get(`/api/employees/${createdId}`);

            // Assert: read berhasil dengan data yang identik
            expect(getRes.status).toBe(200);
            expect(getRes.body.success).toBe(true);

            const returned = getRes.body.data;

            expect(returned.id).toBe(employeeRow.id);
            expect(returned.employee_code).toBe(employeeRow.employee_code);
            expect(returned.name).toBe(employeeRow.name);
            expect(returned.phone).toBe(employeeRow.phone);
          }
        ),
        { numRuns: 100 }
      );
    },
    30000  // 30s timeout: 100 runs × 2 HTTP requests each, may be slow under load
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 7: Input karyawan invalid selalu ditolak
// Feature: erp-kpi-salesman, Property 7: Input karyawan invalid selalu ditolak
// Validates: Requirements 2.2, 2.7, 2.8
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 7: Input karyawan invalid selalu ditolak', () => {
  // Feature: erp-kpi-salesman, Property 7a: name kosong ditolak
  test('POST /api/employees mengembalikan 400 ketika name kosong', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.constant(''),   // nama kosong
          email: fc.emailAddress(),
          phone: phoneArb,
          employee_code: employeeCodeArb,
        }),
        async (input) => {
          jest.resetAllMocks();

          const res = await request(app)
            .post('/api/employees')
            .send(input);

          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);

          // Tidak boleh ada INSERT ke DB
          const insertCalled = query.mock.calls.some((call) =>
            call[0] && /INSERT INTO employees/i.test(call[0])
          );
          expect(insertCalled).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 7b: email invalid ditolak
  test('POST /api/employees mengembalikan 400 ketika email tidak valid', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: nameArb,
          // Email tidak valid: string tanpa format email
          email: fc.string({ minLength: 1 }).filter(
            (s) => !s.includes('@') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
          ),
          phone: phoneArb,
          employee_code: employeeCodeArb,
        }),
        async (input) => {
          jest.resetAllMocks();

          const res = await request(app)
            .post('/api/employees')
            .send(input);

          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);

          const insertCalled = query.mock.calls.some((call) =>
            call[0] && /INSERT INTO employees/i.test(call[0])
          );
          expect(insertCalled).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 7c: phone kurang dari 10 digit ditolak
  test('POST /api/employees mengembalikan 400 ketika phone kurang dari 10 digit', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: nameArb,
          email: fc.emailAddress(),
          // Phone tidak valid: digit tapi kurang dari 10 karakter
          phone: fc.stringOf(
            fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'),
            { minLength: 0, maxLength: 9 }
          ),
          employee_code: employeeCodeArb,
        }),
        async (input) => {
          jest.resetAllMocks();

          const res = await request(app)
            .post('/api/employees')
            .send(input);

          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);

          const insertCalled = query.mock.calls.some((call) =>
            call[0] && /INSERT INTO employees/i.test(call[0])
          );
          expect(insertCalled).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 7d: employee_code duplikat ditolak (409)
  test('POST /api/employees mengembalikan 409 ketika employee_code sudah digunakan', async () => {
    await fc.assert(
      fc.asyncProperty(
        validEmployeeArb,
        async (input) => {
          jest.resetAllMocks();

          // Mock: INSERT gagal karena duplikat employee_code
          const dupError = new Error(
            "Duplicate entry 'EMP001' for key 'employee_code'"
          );
          dupError.code = 'ER_DUP_ENTRY';
          dupError.errno = 1062;
          query.mockRejectedValueOnce(dupError);

          const res = await request(app)
            .post('/api/employees')
            .send(input);

          expect(res.status).toBe(409);
          expect(res.body.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: erp-kpi-salesman, Property 7e: PUT dengan data invalid juga ditolak
  test('PUT /api/employees/:id mengembalikan 400 ketika data update tidak valid (name kosong)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 99999 }),
        fc.record({
          name: fc.constant(''),   // nama kosong
          email: fc.emailAddress(),
          phone: phoneArb,
          employee_code: employeeCodeArb,
        }),
        async (id, input) => {
          jest.resetAllMocks();

          const res = await request(app)
            .put(`/api/employees/${id}`)
            .send(input);

          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);

          // Tidak boleh ada UPDATE ke DB
          const updateCalled = query.mock.calls.some((call) =>
            call[0] && /UPDATE employees/i.test(call[0])
          );
          expect(updateCalled).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 8: Read all karyawan mencakup semua yang dibuat
// Feature: erp-kpi-salesman, Property 8: Read all karyawan mencakup semua yang dibuat
// Validates: Requirements 2.3
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 8: Read all karyawan mencakup semua yang dibuat', () => {
  // Feature: erp-kpi-salesman, Property 8: Read all karyawan mencakup semua yang dibuat
  test(
    'GET /api/employees mengembalikan daftar yang mencakup semua karyawan yang telah dibuat',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate antara 1-5 karyawan untuk disimulasikan sudah ada di DB
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 99999 }),
              name: nameArb,
              email: fc.emailAddress(),
              phone: phoneArb,
              employee_code: employeeCodeArb,
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (employees) => {
            jest.resetAllMocks();

            // Buat unique ID untuk setiap karyawan agar bisa di-assert
            const uniqueEmployees = employees.map((emp, idx) => ({
              ...emp,
              id: idx + 1,
              employee_code: `EMP${String(idx + 1).padStart(3, '0')}`,
              position_id: null,
              photo_url: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              position_name: null,
            }));

            // Mock: GET /api/employees mengembalikan semua karyawan
            query.mockResolvedValueOnce(uniqueEmployees);

            const res = await request(app)
              .get('/api/employees');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);

            // Assert: semua karyawan yang dibuat ada di response
            const returnedIds = res.body.data.map((e) => e.id);
            for (const emp of uniqueEmployees) {
              expect(returnedIds).toContain(emp.id);
            }
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 9: Update karyawan tercermin saat dibaca
// Feature: erp-kpi-salesman, Property 9: Update karyawan tercermin saat dibaca
// Validates: Requirements 2.5
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 9: Update karyawan tercermin saat dibaca', () => {
  // Feature: erp-kpi-salesman, Property 9: Update karyawan tercermin saat dibaca
  test(
    'setelah PUT /api/employees/:id berhasil, GET /api/employees/:id mengembalikan nilai yang diperbarui',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 99999 }),
          validEmployeeArb,
          async (id, updatedInput) => {
            jest.resetAllMocks();

            const updatedRow = {
              id,
              employee_code: updatedInput.employee_code.trim(),
              name: updatedInput.name.trim(),
              email: updatedInput.email,
              phone: updatedInput.phone.trim(),
              position_id: null,
              photo_url: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              position_name: null,
            };

            // Sequence mock untuk PUT /api/employees/:id:
            // 1. SELECT id FROM employees (verify existence) → [{ id }]
            // 2. UPDATE employees → { affectedRows: 1 }
            // 3. SELECT karyawan setelah update → [updatedRow]
            query
              .mockResolvedValueOnce([{ id }])          // SELECT id (existence check)
              .mockResolvedValueOnce({ affectedRows: 1 }) // UPDATE employees
              .mockResolvedValueOnce([updatedRow]);       // SELECT setelah UPDATE

            const putRes = await request(app)
              .put(`/api/employees/${id}`)
              .send(updatedInput);

            expect(putRes.status).toBe(200);
            expect(putRes.body.success).toBe(true);

            // Sequence mock untuk GET /api/employees/:id:
            query.mockResolvedValueOnce([updatedRow]);

            const getRes = await request(app)
              .get(`/api/employees/${id}`);

            expect(getRes.status).toBe(200);
            expect(getRes.body.success).toBe(true);

            const returned = getRes.body.data;

            // Assert: nilai yang dibaca sama dengan yang diupdate
            expect(returned.id).toBe(id);
            expect(returned.employee_code).toBe(updatedRow.employee_code);
            expect(returned.name).toBe(updatedRow.name);
            expect(returned.phone).toBe(updatedRow.phone);
          }
        ),
        { numRuns: 100 }
      );
    },
    30000  // 30s timeout: 100 runs × 2 HTTP requests each, may be slow under load
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 10: Delete karyawan menghilangkannya dari sistem
// Feature: erp-kpi-salesman, Property 10: Delete karyawan menghilangkannya dari sistem
// Validates: Requirements 2.6
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 10: Delete karyawan menghilangkannya dari sistem', () => {
  // Feature: erp-kpi-salesman, Property 10: Delete karyawan menghilangkannya dari sistem
  test(
    'setelah DELETE /api/employees/:id berhasil, GET /api/employees/:id mengembalikan 404',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 99999 }),
          async (id) => {
            jest.resetAllMocks();

            // Sequence mock untuk DELETE /api/employees/:id:
            // 1. SELECT id FROM employees (existence check) → [{ id }]
            // 2. DELETE employees → { affectedRows: 1 }
            query
              .mockResolvedValueOnce([{ id }])           // SELECT id (existence check)
              .mockResolvedValueOnce({ affectedRows: 1 }); // DELETE employees

            const delRes = await request(app)
              .delete(`/api/employees/${id}`);

            expect(delRes.status).toBe(200);
            expect(delRes.body.success).toBe(true);

            // Sequence mock untuk GET /api/employees/:id setelah delete:
            // SELECT tidak menemukan karyawan → []
            query.mockResolvedValueOnce([]);

            const getRes = await request(app)
              .get(`/api/employees/${id}`);

            // Assert: 404 Not Found setelah delete
            expect(getRes.status).toBe(404);
            expect(getRes.body.success).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    },
    30000  // 30s timeout: 100 runs × 2 HTTP requests each, may be slow under load
  );
});
