const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');

const { query } = require('../config/database');
const { bucket } = require('../config/storage');
const { sendSuccess, sendError } = require('../utils/responseHelper');

const router = express.Router();

// ── Multer: memory storage (validate before uploading to GCS) ─────────────────
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB in bytes
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];

const upload = multer({
  storage: multer.memoryStorage(),
  // Do NOT use multer's built-in fileFilter or limits for MIME/size validation here.
  // We validate manually after receiving the file so we can return precise error messages.
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB safety cap to avoid OOM
});

// ── SELECT fields used in every employee query ────────────────────────────────
const EMPLOYEE_SELECT = `
  e.id,
  e.employee_code,
  e.name,
  e.email,
  e.phone,
  e.position_id,
  e.photo_url,
  e.created_at,
  e.updated_at,
  p.position_name
`;

const EMPLOYEE_FROM_JOIN = `
  FROM employees e
  LEFT JOIN positions p ON e.position_id = p.id
`;

// ── Validation rules ──────────────────────────────────────────────────────────

/**
 * Validation rules for creating an employee.
 * Requirements: 2.7, 2.8
 */
const createValidations = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Nama karyawan wajib diisi'),

  body('email')
    .trim()
    .isEmail()
    .withMessage('Format email tidak valid')
    .normalizeEmail(),

  body('phone')
    .trim()
    .matches(/^\d{10,}$/)
    .withMessage('Nomor telepon harus berupa angka minimal 10 digit'),

  body('employee_code')
    .trim()
    .notEmpty()
    .withMessage('Kode karyawan wajib diisi'),
];

/**
 * Validation rules for updating an employee (same constraints).
 * Requirements: 2.7, 2.8
 */
const updateValidations = [...createValidations];

// ── Helper ────────────────────────────────────────────────────────────────────

/**
 * Collect express-validator errors and send a 400 response if any exist.
 * Returns true when the request should be aborted.
 */
function handleValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));
    sendError(res, 'Validasi gagal', errorDetails, 400);
    return true;
  }
  return false;
}

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /api/employees
 *
 * Returns all employees with their position name (LEFT JOIN positions),
 * ordered by id DESC.
 * Requirements: 2.3
 */
router.get('/', async (req, res, next) => {
  try {
    const employees = await query(
      `SELECT ${EMPLOYEE_SELECT} ${EMPLOYEE_FROM_JOIN} ORDER BY e.id DESC`
    );
    return sendSuccess(res, 'Daftar karyawan berhasil diambil', employees);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/employees
 *
 * Creates a new employee. Returns 201 with the newly created record.
 * Returns 409 if employee_code already exists.
 * Requirements: 2.1, 2.2, 2.7, 2.8
 */
router.post('/', createValidations, async (req, res, next) => {
  try {
    if (handleValidationErrors(req, res)) return;

    const { employee_code, name, email, phone, position_id, photo_url } = req.body;

    const result = await query(
      `INSERT INTO employees (employee_code, name, email, phone, position_id, photo_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        employee_code.trim(),
        name.trim(),
        email,                         // already normalised by express-validator
        phone ? phone.trim() : phone,
        position_id || null,
        photo_url || null,
      ]
    );

    const insertId = result.insertId;

    const rows = await query(
      `SELECT ${EMPLOYEE_SELECT} ${EMPLOYEE_FROM_JOIN} WHERE e.id = ?`,
      [insertId]
    );

    return sendSuccess(res, 'Karyawan berhasil dibuat', rows[0], 201);
  } catch (err) {
    // MySQL duplicate entry: errno 1062 / code ER_DUP_ENTRY
    if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
      // Only expose 409 for employee_code conflicts; email uniqueness also hits this
      if (err.message && err.message.includes('employee_code')) {
        return sendError(
          res,
          'Kode karyawan sudah digunakan',
          [{ field: 'employee_code', message: 'Kode karyawan sudah digunakan' }],
          409
        );
      }
      // Generic duplicate (e.g. email)
      return sendError(
        res,
        'Data duplikat terdeteksi',
        [{ field: 'unknown', message: err.message }],
        409
      );
    }
    next(err);
  }
});

/**
 * GET /api/employees/:id
 *
 * Returns a single employee by ID. Returns 404 if not found.
 * Requirements: 2.4
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const rows = await query(
      `SELECT ${EMPLOYEE_SELECT} ${EMPLOYEE_FROM_JOIN} WHERE e.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return sendError(res, 'Karyawan tidak ditemukan', [], 404);
    }

    return sendSuccess(res, 'Data karyawan berhasil diambil', rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/employees/:id
 *
 * Updates an existing employee. Returns 404 if not found.
 * Returns 409 if employee_code is already used by another employee.
 * Requirements: 2.5, 2.7, 2.8
 */
router.put('/:id', updateValidations, async (req, res, next) => {
  try {
    if (handleValidationErrors(req, res)) return;

    const { id } = req.params;

    // Verify existence
    const existing = await query('SELECT id FROM employees WHERE id = ?', [id]);
    if (existing.length === 0) {
      return sendError(res, 'Karyawan tidak ditemukan', [], 404);
    }

    const { employee_code, name, email, phone, position_id, photo_url } = req.body;

    await query(
      `UPDATE employees
       SET employee_code = ?,
           name          = ?,
           email         = ?,
           phone         = ?,
           position_id   = ?,
           photo_url     = ?,
           updated_at    = NOW()
       WHERE id = ?`,
      [
        employee_code.trim(),
        name.trim(),
        email,
        phone ? phone.trim() : phone,
        position_id || null,
        photo_url !== undefined ? photo_url : null,
        id,
      ]
    );

    const updated = await query(
      `SELECT ${EMPLOYEE_SELECT} ${EMPLOYEE_FROM_JOIN} WHERE e.id = ?`,
      [id]
    );

    return sendSuccess(res, 'Karyawan berhasil diperbarui', updated[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
      if (err.message && err.message.includes('employee_code')) {
        return sendError(
          res,
          'Kode karyawan sudah digunakan',
          [{ field: 'employee_code', message: 'Kode karyawan sudah digunakan' }],
          409
        );
      }
      return sendError(
        res,
        'Data duplikat terdeteksi',
        [{ field: 'unknown', message: err.message }],
        409
      );
    }
    next(err);
  }
});

/**
 * DELETE /api/employees/:id
 *
 * Deletes an existing employee. Returns 404 if not found.
 * Requirements: 2.6
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify existence
    const existing = await query('SELECT id FROM employees WHERE id = ?', [id]);
    if (existing.length === 0) {
      return sendError(res, 'Karyawan tidak ditemukan', [], 404);
    }

    await query('DELETE FROM employees WHERE id = ?', [id]);

    return sendSuccess(res, 'Karyawan berhasil dihapus', null);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/employees/:id/photo
 *
 * Uploads a profile photo for an employee to Google Cloud Storage.
 *
 * Validation (before upload):
 *   - Employee must exist → 404
 *   - MIME type must be image/jpeg or image/png → 400
 *   - File size must be ≤ 2 MB → 400
 *
 * Atomic operation:
 *   1. Upload file to GCS
 *   2. Only if upload succeeds: update employees.photo_url + insert into employee_files
 *   3. If GCS upload fails → do NOT touch DB, return 503
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
router.post('/:id/photo', upload.single('photo'), async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Verify employee exists
    const existing = await query('SELECT id FROM employees WHERE id = ?', [id]);
    if (existing.length === 0) {
      return sendError(res, 'Karyawan tidak ditemukan', [], 404);
    }

    // 2. Verify a file was sent
    if (!req.file) {
      return sendError(res, 'File foto wajib disertakan', [], 400);
    }

    const { mimetype, size, originalname, buffer } = req.file;

    // 3. Validate MIME type (Requirement 3.2)
    if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
      return sendError(
        res,
        'Format file tidak valid, hanya JPG dan PNG yang diperbolehkan',
        [{ field: 'photo', message: 'Format file tidak valid, hanya JPG dan PNG yang diperbolehkan' }],
        400
      );
    }

    // 4. Validate file size – max 2 MB (Requirement 3.3)
    if (size > MAX_FILE_SIZE) {
      return sendError(
        res,
        'Ukuran file melebihi batas maksimal 2 MB',
        [{ field: 'photo', message: 'Ukuran file melebihi batas maksimal 2 MB' }],
        400
      );
    }

    // 5. Check bucket is configured
    if (!bucket) {
      return sendError(
        res,
        'Layanan penyimpanan tidak tersedia saat ini',
        [],
        503
      );
    }

    // 6. Build a unique filename: <employeeId>_<timestamp><ext>
    const ext = path.extname(originalname) || (mimetype === 'image/png' ? '.png' : '.jpg');
    const filename = `photos/${id}_${Date.now()}${ext}`;
    const gcsFile = bucket.file(filename);

    // 7. Atomic upload to GCS (Requirement 3.4)
    // If this throws, we do NOT touch the DB.
    try {
      await gcsFile.save(buffer, {
        metadata: { contentType: mimetype },
        resumable: false,
      });
    } catch (gcsErr) {
      console.error('[upload] GCS upload failed:', gcsErr.message);
      return sendError(
        res,
        'Gagal mengupload file ke Cloud Storage. Silakan coba lagi.',
        [],
        503
      );
    }

    // 8. Build the public URL
    const bucketName = process.env.GCS_BUCKET_NAME;
    const photoUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;

    // 9. Persist to DB only after a successful GCS upload (Requirement 3.1)
    await query(
      'UPDATE employees SET photo_url = ?, updated_at = NOW() WHERE id = ?',
      [photoUrl, id]
    );

    await query(
      `INSERT INTO employee_files (employee_id, file_name, file_url, file_size, file_type)
       VALUES (?, ?, ?, ?, ?)`,
      [id, originalname, photoUrl, size, mimetype]
    );

    return sendSuccess(res, 'Foto profil berhasil diupload', { photo_url: photoUrl }, 200);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
