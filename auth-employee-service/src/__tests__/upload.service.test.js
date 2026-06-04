'use strict';

/**
 * Property-Based Tests dan Unit Tests untuk Upload Foto Profil (P11–P14)
 * Feature: erp-kpi-salesman
 *
 * Tests menggunakan fast-check untuk memverifikasi properti kebenaran
 * dari endpoint POST /api/employees/:id/photo di auth-employee-service.
 */

// ── Disable rate limiter SEBELUM app di-require ───────────────────────────────
process.env.RATE_LIMIT_MAX = '1000000';
process.env.RATE_LIMIT_WINDOW_MS = '1';
process.env.GCS_BUCKET_NAME = 'test-bucket';

const request = require('supertest');
const fc = require('fast-check');

// ── Mock database SEBELUM app di-require ──────────────────────────────────────
jest.mock('../config/database', () => ({
  query: jest.fn(),
  pool: { execute: jest.fn() },
}));

// ── Mock authenticate middleware untuk bypass auth di test ────────────────────
// Endpoint /api/employees/:id/photo berada di balik authenticate middleware.
// Di sini kita bypass agar test hanya menguji logika upload, bukan auth.
jest.mock('../middleware/authenticate', () => (req, _res, next) => {
  req.user = { id: 1, email: 'admin@test.com', name: 'Test Admin' };
  next();
});

// ── Mock Google Cloud Storage SEBELUM app di-require ─────────────────────────
const mockSave = jest.fn();
const mockFile = jest.fn(() => ({ save: mockSave }));
const mockBucket = { file: mockFile };

jest.mock('../config/storage', () => ({
  storage: {},
  bucket: mockBucket,
}));

const { query } = require('../config/database');
const app = require('../app');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds an employee ID that will be "found" in the mock DB.
 * Assumes query is already mocked to return a found employee row.
 */
const EXISTING_EMPLOYEE_ID = 1;

/**
 * 2 MB batas — harus sama dengan yang di routes/employees.js
 */
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2_097_152 bytes

// ─────────────────────────────────────────────────────────────────────────────
// Setup: reset semua mock sebelum setiap test
// Gunakan resetAllMocks agar implementation queue (mockResolvedValueOnce) juga di-reset
// ─────────────────────────────────────────────────────────────────────────────
beforeEach(() => {
  jest.resetAllMocks();
  mockFile.mockImplementation(() => ({ save: mockSave }));
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 11: Upload foto valid menyimpan URL di database
// Feature: erp-kpi-salesman, Property 11: Upload foto valid menyimpan URL di database
// Validates: Requirements 3.1
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 11: Upload foto valid menyimpan URL di database', () => {
  test(
    'upload file JPG atau PNG ≤2MB untuk karyawan yang ada: GCS di-save dan DB di-update',
    async () => {
      // Feature: erp-kpi-salesman, Property 11: Upload foto valid menyimpan URL di database
      await fc.assert(
        fc.asyncProperty(
          // Arbitrary MIME type: hanya image/jpeg atau image/png
          fc.oneof(fc.constant('image/jpeg'), fc.constant('image/png')),
          // Arbitrary file size: 1 byte s.d. 2 MB (inklusif)
          fc.integer({ min: 1, max: MAX_FILE_SIZE }),
          // Arbitrary buffer content (payload tidak penting, yang penting ukurannya)
          fc.uint8Array({ minLength: 1, maxLength: 16 }),
          async (mimeType, fileSize, bufferData) => {
            jest.resetAllMocks();
            mockFile.mockImplementation(() => ({ save: mockSave }));

            // Mock: karyawan ditemukan (query SELECT employees)
            query
              .mockResolvedValueOnce([{ id: EXISTING_EMPLOYEE_ID }]) // SELECT employees
              .mockResolvedValueOnce({ affectedRows: 1 })            // UPDATE employees SET photo_url
              .mockResolvedValueOnce({ insertId: 99 });              // INSERT employee_files

            // Mock: GCS upload berhasil
            mockSave.mockResolvedValueOnce(undefined);

            // Buat buffer berukuran fileSize (isi byte 0 semua, ukuran inilah yang divalidasi)
            const fileBuffer = Buffer.alloc(fileSize, 0);
            const ext = mimeType === 'image/png' ? '.png' : '.jpg';
            const fileName = `test${ext}`;

            const res = await request(app)
              .post(`/api/employees/${EXISTING_EMPLOYEE_ID}/photo`)
              // supertest tidak bisa set Content-Type multipart secara manual;
              // gunakan .attach() untuk mengirim file
              .attach('photo', fileBuffer, { filename: fileName, contentType: mimeType });

            // Assert 1: HTTP 200 sukses
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            // Assert 2: Response mengandung photo_url
            expect(res.body.data).toBeDefined();
            expect(typeof res.body.data.photo_url).toBe('string');
            expect(res.body.data.photo_url.length).toBeGreaterThan(0);

            // Assert 3: GCS .save() dipanggil tepat satu kali
            expect(mockSave).toHaveBeenCalledTimes(1);

            // Assert 4: UPDATE employees dipanggil (query call ke-2)
            const updateCall = query.mock.calls[1];
            expect(updateCall[0]).toMatch(/UPDATE employees SET photo_url/i);

            // Assert 5: INSERT employee_files dipanggil (query call ke-3)
            const insertCall = query.mock.calls[2];
            expect(insertCall[0]).toMatch(/INSERT INTO employee_files/i);
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 12: Upload foto format invalid selalu ditolak
// Feature: erp-kpi-salesman, Property 12: Upload foto format invalid selalu ditolak
// Validates: Requirements 3.2
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 12: Upload foto format invalid selalu ditolak', () => {
  test(
    'upload dengan MIME type selain image/jpeg dan image/png harus ditolak dengan pesan error yang tepat',
    async () => {
      // Feature: erp-kpi-salesman, Property 12: Upload foto format invalid selalu ditolak
      await fc.assert(
        fc.asyncProperty(
          // Arbitrary MIME type yang bukan image/jpeg atau image/png
          fc.string({ minLength: 1 }).filter(
            (s) => s !== 'image/jpeg' && s !== 'image/png' && /^[a-z]+\/[a-z0-9.+\-]+$/.test(s)
          ),
          async (invalidMimeType) => {
            jest.resetAllMocks();
            mockFile.mockImplementation(() => ({ save: mockSave }));

            // Mock: karyawan ditemukan
            query.mockResolvedValueOnce([{ id: EXISTING_EMPLOYEE_ID }]);

            const fileBuffer = Buffer.alloc(100, 0);

            const res = await request(app)
              .post(`/api/employees/${EXISTING_EMPLOYEE_ID}/photo`)
              .attach('photo', fileBuffer, {
                filename: 'test.bin',
                contentType: invalidMimeType,
              });

            // Assert 1: Harus ditolak (400)
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);

            // Assert 2: Pesan error harus tepat sesuai requirement
            expect(res.body.message).toBe(
              'Format file tidak valid, hanya JPG dan PNG yang diperbolehkan'
            );

            // Assert 3: GCS tidak dipanggil sama sekali
            expect(mockSave).not.toHaveBeenCalled();

            // Assert 4: Tidak ada INSERT employee_files
            const insertCalled = query.mock.calls.some((call) =>
              call[0] && call[0].toString().match(/INSERT INTO employee_files/i)
            );
            expect(insertCalled).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  // Unit test tambahan untuk MIME types yang umum dipakai tapi tidak valid
  test('MIME types tidak valid yang umum harus ditolak', async () => {
    const invalidMimeTypes = [
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/tiff',
      'application/pdf',
      'video/mp4',
      'text/plain',
    ];

    for (const mimeType of invalidMimeTypes) {
      jest.clearAllMocks();

      // Mock: karyawan ditemukan
      query.mockResolvedValueOnce([{ id: EXISTING_EMPLOYEE_ID }]);

      const fileBuffer = Buffer.alloc(100, 0);

      const res = await request(app)
        .post(`/api/employees/${EXISTING_EMPLOYEE_ID}/photo`)
        .attach('photo', fileBuffer, { filename: 'test.bin', contentType: mimeType });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe(
        'Format file tidak valid, hanya JPG dan PNG yang diperbolehkan'
      );
      expect(mockSave).not.toHaveBeenCalled();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 13: Upload foto ukuran > 2MB selalu ditolak
// Feature: erp-kpi-salesman, Property 13: Upload foto ukuran > 2MB selalu ditolak
// Validates: Requirements 3.3
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 13: Upload foto ukuran > 2MB selalu ditolak', () => {
  test(
    'upload file berukuran lebih dari 2097152 bytes harus ditolak dengan pesan error yang tepat',
    async () => {
      // Feature: erp-kpi-salesman, Property 13: Upload foto ukuran > 2MB selalu ditolak
      await fc.assert(
        fc.asyncProperty(
          // Arbitrary file size yang > 2MB
          // Cap at multer's safety limit of 10MB-1 to avoid multer throwing 500
          fc.integer({ min: MAX_FILE_SIZE + 1, max: 10 * 1024 * 1024 - 1 }),
          // MIME type valid (JPG atau PNG) agar tidak ditolak karena format
          fc.oneof(fc.constant('image/jpeg'), fc.constant('image/png')),
          async (oversizedFileSize, mimeType) => {
            jest.resetAllMocks();
            mockFile.mockImplementation(() => ({ save: mockSave }));

            // Mock: karyawan ditemukan
            query.mockResolvedValueOnce([{ id: EXISTING_EMPLOYEE_ID }]);

            // Buat buffer berukuran oversizedFileSize
            const fileBuffer = Buffer.alloc(oversizedFileSize, 0);
            const ext = mimeType === 'image/png' ? '.png' : '.jpg';

            const res = await request(app)
              .post(`/api/employees/${EXISTING_EMPLOYEE_ID}/photo`)
              .attach('photo', fileBuffer, {
                filename: `big_file${ext}`,
                contentType: mimeType,
              });

            // Assert 1: Harus ditolak (400)
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);

            // Assert 2: Pesan error harus tepat sesuai requirement
            expect(res.body.message).toBe(
              'Ukuran file melebihi batas maksimal 2 MB'
            );

            // Assert 3: GCS tidak dipanggil
            expect(mockSave).not.toHaveBeenCalled();

            // Assert 4: Tidak ada INSERT employee_files
            const insertCalled = query.mock.calls.some((call) =>
              call[0] && call[0].toString().match(/INSERT INTO employee_files/i)
            );
            expect(insertCalled).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  // Unit test: tepat di boundary — 2MB harus diterima, 2MB+1 harus ditolak
  test('file tepat 2MB (2097152 bytes) harus diterima', async () => {
    query
      .mockResolvedValueOnce([{ id: EXISTING_EMPLOYEE_ID }]) // SELECT employees
      .mockResolvedValueOnce({ affectedRows: 1 })            // UPDATE employees
      .mockResolvedValueOnce({ insertId: 1 });               // INSERT employee_files

    mockSave.mockResolvedValueOnce(undefined);

    const exactBuffer = Buffer.alloc(MAX_FILE_SIZE, 0);

    const res = await request(app)
      .post(`/api/employees/${EXISTING_EMPLOYEE_ID}/photo`)
      .attach('photo', exactBuffer, {
        filename: 'exact_2mb.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('file 2MB+1 byte (2097153 bytes) harus ditolak', async () => {
    query.mockResolvedValueOnce([{ id: EXISTING_EMPLOYEE_ID }]);

    const oversized = Buffer.alloc(MAX_FILE_SIZE + 1, 0);

    const res = await request(app)
      .post(`/api/employees/${EXISTING_EMPLOYEE_ID}/photo`)
      .attach('photo', oversized, {
        filename: 'over_2mb.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Ukuran file melebihi batas maksimal 2 MB');
    expect(mockSave).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property 14: Kegagalan GCS tidak menyimpan data ke database (atomicity)
// Feature: erp-kpi-salesman, Property 14: Kegagalan GCS tidak menyimpan data ke database
// Validates: Requirements 3.4, 10.5
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 14: Kegagalan GCS tidak menyimpan data ke database (atomicity)', () => {
  test(
    'ketika GCS upload gagal, tidak boleh ada UPDATE employees atau INSERT employee_files',
    async () => {
      // Feature: erp-kpi-salesman, Property 14: Kegagalan GCS tidak menyimpan data ke database (atomicity)
      await fc.assert(
        fc.asyncProperty(
          // Arbitrary error message dari GCS
          fc.string({ minLength: 1 }),
          // MIME type valid dan ukuran valid — agar lolos validasi awal
          fc.oneof(fc.constant('image/jpeg'), fc.constant('image/png')),
          fc.integer({ min: 1, max: MAX_FILE_SIZE }),
          async (gcsErrorMsg, mimeType, fileSize) => {
            jest.resetAllMocks();
            mockFile.mockImplementation(() => ({ save: mockSave }));

            // Mock: karyawan ditemukan (hanya SELECT, tidak ada UPDATE/INSERT setelahnya)
            query.mockResolvedValueOnce([{ id: EXISTING_EMPLOYEE_ID }]);

            // Mock: GCS upload GAGAL
            mockSave.mockRejectedValueOnce(new Error(gcsErrorMsg));

            const fileBuffer = Buffer.alloc(fileSize, 0);
            const ext = mimeType === 'image/png' ? '.png' : '.jpg';

            const res = await request(app)
              .post(`/api/employees/${EXISTING_EMPLOYEE_ID}/photo`)
              .attach('photo', fileBuffer, {
                filename: `photo${ext}`,
                contentType: mimeType,
              });

            // Assert 1: Harus error (503)
            expect(res.status).toBe(503);
            expect(res.body.success).toBe(false);

            // Assert 2: UPDATE employees TIDAK dipanggil
            const updateCalled = query.mock.calls.some((call) =>
              call[0] && call[0].toString().match(/UPDATE employees SET photo_url/i)
            );
            expect(updateCalled).toBe(false);

            // Assert 3: INSERT employee_files TIDAK dipanggil
            const insertCalled = query.mock.calls.some((call) =>
              call[0] && call[0].toString().match(/INSERT INTO employee_files/i)
            );
            expect(insertCalled).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  // Unit test: pastikan error message response benar saat GCS gagal
  test('response 503 saat GCS gagal harus mengandung pesan yang sesuai', async () => {
    query.mockResolvedValueOnce([{ id: EXISTING_EMPLOYEE_ID }]);
    mockSave.mockRejectedValueOnce(new Error('GCS connection timeout'));

    const fileBuffer = Buffer.alloc(1024, 0);

    const res = await request(app)
      .post(`/api/employees/${EXISTING_EMPLOYEE_ID}/photo`)
      .attach('photo', fileBuffer, {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    // Hanya 1 query (SELECT employees), tidak ada query DB lain setelahnya
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toMatch(/SELECT id FROM employees/i);
  });

  // Unit test: karyawan tidak ditemukan → 404, GCS tidak dipanggil
  test('upload untuk karyawan yang tidak ada harus mengembalikan 404', async () => {
    query.mockResolvedValueOnce([]); // Karyawan tidak ditemukan

    const fileBuffer = Buffer.alloc(1024, 0);

    const res = await request(app)
      .post('/api/employees/999/photo')
      .attach('photo', fileBuffer, {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(mockSave).not.toHaveBeenCalled();
  });

  // Unit test: tidak ada file yang dikirim → 400
  test('upload tanpa file harus mengembalikan 400', async () => {
    query.mockResolvedValueOnce([{ id: EXISTING_EMPLOYEE_ID }]);

    // Kirim multipart/form-data tanpa file — gunakan field text agar multer tidak error parse
    const res = await request(app)
      .post(`/api/employees/${EXISTING_EMPLOYEE_ID}/photo`)
      .field('description', 'no file attached');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(mockSave).not.toHaveBeenCalled();
  });
});
