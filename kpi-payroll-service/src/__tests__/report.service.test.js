'use strict';

/**
 * Property-Based Tests dan Unit Tests untuk Laporan PDF (P27)
 * Feature: erp-kpi-salesman
 *
 * Tests menggunakan fast-check untuk memverifikasi properti kebenaran
 * dari endpoint POST /api/reports/generate/:period_id di kpi-payroll-service.
 */

// ── Disable rate limiter SEBELUM app di-require ───────────────────────────────
process.env.RATE_LIMIT_MAX = '1000000';
process.env.RATE_LIMIT_WINDOW_MS = '1';
process.env.GCS_BUCKET_NAME = 'test-bucket';

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

// ── Mock GCS storage ──────────────────────────────────────────────────────────
// Gunakan variabel dengan prefix 'mock' agar Jest mengizinkan akses di factory
jest.mock('../config/storage', () => {
  // require di dalam factory diizinkan Jest
  const { EventEmitter } = require('events');

  function createMockGcsStream() {
    const s = new EventEmitter();
    s.end = () => setImmediate(() => s.emit('finish'));
    return s;
  }

  const mockFileObj = {
    createWriteStream: jest.fn(() => createMockGcsStream()),
    exists: jest.fn().mockResolvedValue([true]),
    createReadStream: jest.fn(() => createMockGcsStream()),
  };

  const mockBucketObj = {
    file: jest.fn(() => mockFileObj),
  };

  return { bucket: mockBucketObj };
});

// ── Mock pdfkit ────────────────────────────────────────────────────────────────
// Mock PDFDocument agar tidak melakukan generate PDF nyata di tests
jest.mock('pdfkit', () => {
  const { EventEmitter } = require('events');
  return jest.fn().mockImplementation(() => {
    const emitter = new EventEmitter();
    emitter.fontSize = jest.fn().mockReturnThis();
    emitter.font = jest.fn().mockReturnThis();
    emitter.text = jest.fn().mockReturnThis();
    emitter.moveDown = jest.fn().mockReturnThis();
    emitter.rect = jest.fn().mockReturnThis();
    emitter.stroke = jest.fn().mockReturnThis();
    emitter.page = { margins: { left: 40 } };
    emitter.y = 100;

    // Saat .end() dipanggil, pancarkan 'data' lalu 'end'
    emitter.end = jest.fn(() => {
      setImmediate(() => {
        emitter.emit('data', Buffer.from(''));
        emitter.emit('end');
      });
    });

    return emitter;
  });
});

// ── Require modules setelah semua mock terdefinisi ────────────────────────────
const { EventEmitter } = require('events');
const request = require('supertest');
const fc = require('fast-check');
const axios = require('axios');
const { query } = require('../config/database');
const { bucket: mockBucket } = require('../config/storage');
const app = require('../app');

// ─────────────────────────────────────────────────────────────────────────────
// Helper: buat mock GCS stream yang berhasil (emit 'finish')
// ─────────────────────────────────────────────────────────────────────────────
function createSuccessStream() {
  const s = new EventEmitter();
  s.end = () => setImmediate(() => s.emit('finish'));
  return s;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: buat mock GCS stream yang gagal (emit 'error')
// ─────────────────────────────────────────────────────────────────────────────
function createFailStream(errorMsg) {
  const s = new EventEmitter();
  s.end = jest.fn(() => {
    setImmediate(() => s.emit('error', new Error(errorMsg || 'GCS upload failed')));
  });
  return s;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: reset GCS mock ke state sukses sebelum setiap test
// ─────────────────────────────────────────────────────────────────────────────
function resetGcsMockToSuccess() {
  mockBucket.file.mockImplementation(() => ({
    createWriteStream: jest.fn(() => createSuccessStream()),
    exists: jest.fn().mockResolvedValue([true]),
    createReadStream: jest.fn(() => createSuccessStream()),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup: reset semua mock sebelum setiap test
// ─────────────────────────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
  resetGcsMockToSuccess();
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper: setup mock query sequence untuk generate report sukses
// ─────────────────────────────────────────────────────────────────────────────
function setupSuccessMocks({ period_id, periodName, bonusRows, insertId, newReport }) {
  query
    // Step 1: SELECT kpi_periods (period exists)
    .mockResolvedValueOnce([{ id: period_id, period_name: periodName }])
    // Step 2: SELECT bonus_results for period
    .mockResolvedValueOnce(bonusRows)
    // Step 3: INSERT payroll_reports → insertId
    .mockResolvedValueOnce({ insertId })
    // Step 4: SELECT new report
    .mockResolvedValueOnce([newReport]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Property 27: Generate PDF berhasil mencatat laporan di database
// Validates: Requirements 10.1, 10.2, 10.3, 10.4
// ─────────────────────────────────────────────────────────────────────────────
describe('Property 27: Generate PDF berhasil mencatat laporan di database', () => {

  // Feature: erp-kpi-salesman, Property 27: Generate PDF berhasil mencatat laporan di database
  test('POST /api/reports/generate/:period_id berhasil menyimpan record dan mengembalikan URL', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate period_id (1-9999)
        fc.integer({ min: 1, max: 9999 }),
        // Generate period_name (non-empty)
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        // Generate 1-5 bonus_results rows
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 99999 }),
            employee_id: fc.integer({ min: 1, max: 9999 }),
            sales_score: fc.double({ min: 0, max: 100, noNaN: true }),
            transaction_score: fc.double({ min: 1, max: 100, noNaN: true }),
            attendance_score: fc.double({ min: 0, max: 100, noNaN: true }),
            satisfaction_score: fc.double({ min: 0, max: 100, noNaN: true }),
            final_score: fc.double({ min: 0, max: 100, noNaN: true }),
            bonus_percentage: fc.double({ min: 0, max: 100, noNaN: true }),
            bonus_amount: fc.double({ min: 0, max: 2000000, noNaN: true }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        // insertId untuk payroll_reports
        fc.integer({ min: 1, max: 99999 }),
        async (period_id, periodName, bonusRows, insertId) => {
          // Reset mocks di awal setiap iterasi properti
          jest.clearAllMocks();
          resetGcsMockToSuccess();

          const bucketName = 'test-bucket';
          const newReport = {
            id: insertId,
            period_id,
            period_name: periodName,
            file_name: `reports/${period_id}_ts.pdf`,
            file_url: `https://storage.googleapis.com/${bucketName}/reports/${period_id}_ts.pdf`,
            generated_at: new Date().toISOString(),
          };

          const enrichedBonusRows = bonusRows.map((r) => ({ ...r, period_id }));

          setupSuccessMocks({
            period_id,
            periodName,
            bonusRows: enrichedBonusRows,
            insertId,
            newReport,
          });

          // Mock axios.get untuk employees (graceful degradation ok)
          axios.get = jest.fn().mockResolvedValueOnce({
            data: {
              success: true,
              data: [{ id: bonusRows[0].employee_id, name: 'Test Karyawan' }],
            },
          });

          const res = await request(app)
            .post(`/api/reports/generate/${period_id}`);

          // Assert: 201 dan sukses
          expect(res.status).toBe(201);
          expect(res.body.success).toBe(true);

          // Assert: data memiliki file_url
          expect(res.body.data).toBeDefined();
          expect(res.body.data.file_url).toBeDefined();
          expect(typeof res.body.data.file_url).toBe('string');
          expect(res.body.data.file_url).toContain('storage.googleapis.com');

          // Assert: INSERT payroll_reports dipanggil (record disimpan)
          const insertCall = query.mock.calls.find(
            (call) =>
              typeof call[0] === 'string' &&
              call[0].includes('INSERT INTO payroll_reports')
          );
          expect(insertCall).toBeDefined();

          // Assert: parameter INSERT menyertakan period_id yang benar
          expect(insertCall[1][0]).toBe(period_id);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Unit Tests
// ─────────────────────────────────────────────────────────────────────────────

// ── Unit Test 1: 404 ketika period tidak ditemukan ───────────────────────────
describe('POST /api/reports/generate/:period_id — 404 when period not found', () => {
  test('mengembalikan 404 ketika period_id tidak ada di database', async () => {
    // Mock: SELECT kpi_periods → kosong
    query.mockResolvedValueOnce([]);

    const res = await request(app)
      .post('/api/reports/generate/9999');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/tidak ditemukan/i);

    // Pastikan INSERT payroll_reports tidak dipanggil
    const insertCall = query.mock.calls.find(
      (call) =>
        typeof call[0] === 'string' &&
        call[0].includes('INSERT INTO payroll_reports')
    );
    expect(insertCall).toBeUndefined();
  });

  test('mengembalikan 404 untuk berbagai period_id yang tidak ada', async () => {
    for (const missingId of [1, 100, 9998, 9999]) {
      jest.clearAllMocks();
      resetGcsMockToSuccess();

      query.mockResolvedValueOnce([]);

      const res = await request(app)
        .post(`/api/reports/generate/${missingId}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);

      // Pastikan tidak ada INSERT ke payroll_reports
      const insertCall = query.mock.calls.find(
        (call) =>
          typeof call[0] === 'string' &&
          call[0].includes('INSERT INTO payroll_reports')
      );
      expect(insertCall).toBeUndefined();
    }
  });
});

// ── Unit Test 2: 500 dan tidak menyimpan ke payroll_reports saat GCS gagal ───
describe('POST /api/reports/generate/:period_id — 500 when GCS upload fails', () => {
  test('mengembalikan 500 dan tidak menyimpan ke payroll_reports ketika GCS upload gagal', async () => {
    const period_id = 1;
    const periodName = 'Periode Test';
    const bonusRows = [
      {
        id: 1,
        employee_id: 1,
        period_id,
        sales_score: 80,
        transaction_score: 75,
        attendance_score: 90,
        satisfaction_score: 85,
        final_score: 82,
        bonus_percentage: 90,
        bonus_amount: 1800000,
      },
    ];

    // Mock query sequence: period ditemukan, bonus rows tersedia
    query
      .mockResolvedValueOnce([{ id: period_id, period_name: periodName }])
      .mockResolvedValueOnce(bonusRows);

    // Mock axios.get untuk employees
    axios.get = jest.fn().mockResolvedValueOnce({
      data: { success: true, data: [{ id: 1, name: 'Test Employee' }] },
    });

    // Mock GCS: createWriteStream memancarkan 'error' (upload gagal)
    mockBucket.file.mockImplementation(() => ({
      createWriteStream: jest.fn(() => createFailStream('GCS upload failed')),
      exists: jest.fn().mockResolvedValue([true]),
      createReadStream: jest.fn(() => createSuccessStream()),
    }));

    const res = await request(app)
      .post(`/api/reports/generate/${period_id}`);

    expect(res.status).toBe(500);

    // Pastikan INSERT payroll_reports tidak dipanggil (atomicity — Requirement 10.5)
    const insertCall = query.mock.calls.find(
      (call) =>
        typeof call[0] === 'string' &&
        call[0].includes('INSERT INTO payroll_reports')
    );
    expect(insertCall).toBeUndefined();
  });

  test('tidak menyimpan ke payroll_reports ketika GCS gagal dengan pesan error berbeda', async () => {
    const period_id = 42;

    query
      .mockResolvedValueOnce([{ id: period_id, period_name: 'Bulan Test' }])
      .mockResolvedValueOnce([
        {
          id: 5,
          employee_id: 3,
          period_id,
          sales_score: 70,
          transaction_score: 65,
          attendance_score: 88,
          satisfaction_score: 72,
          final_score: 73,
          bonus_percentage: 80,
          bonus_amount: 1600000,
        },
      ]);

    axios.get = jest.fn().mockResolvedValueOnce({
      data: { success: true, data: [{ id: 3, name: 'Employee C' }] },
    });

    mockBucket.file.mockImplementation(() => ({
      createWriteStream: jest.fn(() => createFailStream('Network error')),
      exists: jest.fn().mockResolvedValue([true]),
      createReadStream: jest.fn(() => createSuccessStream()),
    }));

    const res = await request(app)
      .post(`/api/reports/generate/${period_id}`);

    expect(res.status).toBe(500);

    const insertCall = query.mock.calls.find(
      (call) =>
        typeof call[0] === 'string' &&
        call[0].includes('INSERT INTO payroll_reports')
    );
    expect(insertCall).toBeUndefined();
  });
});

// ── Unit Test 3: GET /api/reports mengembalikan daftar semua laporan ──────────
describe('GET /api/reports — returns list of all reports', () => {
  test('mengembalikan daftar kosong ketika tidak ada laporan', async () => {
    query.mockResolvedValueOnce([]);

    const res = await request(app).get('/api/reports');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(0);
  });

  test('mengembalikan daftar laporan dengan semua field yang diperlukan', async () => {
    const mockReports = [
      {
        id: 1,
        period_id: 2,
        period_name: 'Januari 2024',
        file_name: 'reports/2_1700000000000.pdf',
        file_url: 'https://storage.googleapis.com/test-bucket/reports/2_1700000000000.pdf',
        generated_at: '2024-01-15T10:00:00.000Z',
      },
      {
        id: 2,
        period_id: 3,
        period_name: 'Februari 2024',
        file_name: 'reports/3_1700000001000.pdf',
        file_url: 'https://storage.googleapis.com/test-bucket/reports/3_1700000001000.pdf',
        generated_at: '2024-02-15T10:00:00.000Z',
      },
    ];

    query.mockResolvedValueOnce(mockReports);

    const res = await request(app).get('/api/reports');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2);

    // Assert: setiap laporan memiliki field yang diperlukan
    for (const report of res.body.data) {
      expect(report).toHaveProperty('id');
      expect(report).toHaveProperty('period_id');
      expect(report).toHaveProperty('file_url');
      expect(report).toHaveProperty('generated_at');
    }

    expect(res.body.data[0].period_name).toBe('Januari 2024');
    expect(res.body.data[1].period_name).toBe('Februari 2024');
  });

  test('mengembalikan laporan dengan file_url yang mengandung domain GCS', async () => {
    const mockReports = [
      {
        id: 10,
        period_id: 5,
        period_name: 'Maret 2024',
        file_name: 'reports/5_1700000002000.pdf',
        file_url: 'https://storage.googleapis.com/test-bucket/reports/5_1700000002000.pdf',
        generated_at: '2024-03-15T10:00:00.000Z',
      },
    ];

    query.mockResolvedValueOnce(mockReports);

    const res = await request(app).get('/api/reports');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data[0].file_url).toContain('https://storage.googleapis.com');
  });
});
