/**
 * Routes for PDF Report generation and download (/api/reports).
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */

const express = require('express');
const axios = require('axios');
const PDFDocument = require('pdfkit');

const { query } = require('../config/database');
const { bucket } = require('../config/storage');
const { sendSuccess, sendError } = require('../utils/responseHelper');

const router = express.Router();

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Fetch employee names from auth-service.
 * Returns a map of { [employee_id]: employee_name }.
 * Gracefully degrades to an empty map if the call fails.
 *
 * @param {string} authHeader - The Authorization header value to forward
 * @returns {Promise<Object>}
 */
async function fetchEmployeeMap(authHeader) {
  const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
  try {
    const response = await axios.get(`${authServiceUrl}/api/employees`, {
      headers: { Authorization: authHeader },
      timeout: 5000,
    });
    const employees =
      response.data && response.data.data ? response.data.data : [];
    const map = {};
    for (const emp of employees) {
      map[emp.id] = emp.name || `Karyawan #${emp.id}`;
    }
    return map;
  } catch (_err) {
    return {};
  }
}

/**
 * Format a number as Indonesian Rupiah, e.g. Rp 2.000.000
 *
 * @param {number|string} amount
 * @returns {string}
 */
function formatRupiah(amount) {
  return `Rp ${Number(amount)
    .toFixed(0)
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

/**
 * Generate a PDF buffer from bonus_results rows.
 * Resolves with a Buffer when the 'end' event fires.
 *
 * @param {string} periodName
 * @param {Array} rows         - bonus_results rows enriched with employee_name
 * @returns {Promise<Buffer>}
 */
function generatePdfBuffer(periodName, rows) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Title ──────────────────────────────────────────────────────────────────
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text(`Laporan Rekap Bonus - ${periodName}`, { align: 'center' });
    doc.moveDown(1);

    // ── Table Header ───────────────────────────────────────────────────────────
    const columns = [
      { label: 'No',                 width: 30  },
      { label: 'Nama Karyawan',      width: 130 },
      { label: 'Sales Score',        width: 65  },
      { label: 'Transaction Score',  width: 80  },
      { label: 'Attendance Score',   width: 75  },
      { label: 'Satisfaction Score', width: 85  },
      { label: 'Final Score',        width: 65  },
      { label: 'Bonus %',            width: 55  },
      { label: 'Bonus Amount',       width: 90  },
    ];

    const tableTop = doc.y;
    const rowHeight = 20;
    let x = doc.page.margins.left;

    // Draw header cells
    doc.fontSize(9).font('Helvetica-Bold');
    columns.forEach((col) => {
      doc.rect(x, tableTop, col.width, rowHeight).stroke();
      doc.text(col.label, x + 2, tableTop + 5, { width: col.width - 4, align: 'left' });
      x += col.width;
    });

    // ── Table Rows ─────────────────────────────────────────────────────────────
    doc.fontSize(8).font('Helvetica');

    let totalFinalScore = 0;
    let totalBonus = 0;

    rows.forEach((row, index) => {
      const rowY = tableTop + rowHeight * (index + 1);
      x = doc.page.margins.left;

      const cells = [
        String(index + 1),
        row.employee_name || `#${row.employee_id}`,
        Number(row.sales_score).toFixed(2),
        Number(row.transaction_score).toFixed(2),
        Number(row.attendance_score).toFixed(2),
        Number(row.satisfaction_score).toFixed(2),
        Number(row.final_score).toFixed(2),
        `${Number(row.bonus_percentage).toFixed(0)}%`,
        formatRupiah(row.bonus_amount),
      ];

      columns.forEach((col, ci) => {
        doc.rect(x, rowY, col.width, rowHeight).stroke();
        doc.text(cells[ci], x + 2, rowY + 5, { width: col.width - 4, align: 'left' });
        x += col.width;
      });

      totalFinalScore += Number(row.final_score);
      totalBonus += Number(row.bonus_amount);
    });

    // ── Summary Row ────────────────────────────────────────────────────────────
    if (rows.length > 0) {
      const summaryY = tableTop + rowHeight * (rows.length + 1);
      x = doc.page.margins.left;

      doc.fontSize(8).font('Helvetica-Bold');
      const summaryLabels = [
        'Total',
        '',
        '',
        '',
        '',
        '',
        (totalFinalScore / rows.length).toFixed(2),
        '',
        formatRupiah(totalBonus),
      ];

      columns.forEach((col, ci) => {
        doc.rect(x, summaryY, col.width, rowHeight).stroke();
        doc.text(summaryLabels[ci], x + 2, summaryY + 5, {
          width: col.width - 4,
          align: 'left',
        });
        x += col.width;
      });
    }

    // ── Footer ─────────────────────────────────────────────────────────────────
    doc.moveDown(2);
    doc
      .fontSize(8)
      .font('Helvetica')
      .text(
        `Digenerate pada: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`,
        { align: 'right' }
      );

    doc.end();
  });
}

// ── POST /api/reports/generate/:period_id ──────────────────────────────────────
// Requirements: 10.1, 10.2, 10.5
router.post('/generate/:period_id', async (req, res, next) => {
  const { period_id } = req.params;
  const parsedPeriodId = parseInt(period_id, 10);

  if (isNaN(parsedPeriodId) || parsedPeriodId < 1) {
    return sendError(res, 'period_id harus berupa bilangan bulat positif', [], 400);
  }

  try {
    // Step 1 — Verify period exists
    const periods = await query(
      'SELECT id, period_name FROM kpi_periods WHERE id = ?',
      [parsedPeriodId]
    );
    if (periods.length === 0) {
      return sendError(res, 'Periode KPI tidak ditemukan', [], 404);
    }
    const period = periods[0];

    // Step 2 — Fetch bonus_results for the period
    const bonusRows = await query(
      `SELECT br.id, br.employee_id, br.period_id,
              br.sales_score, br.transaction_score, br.attendance_score,
              br.satisfaction_score, br.final_score,
              br.bonus_percentage, br.bonus_amount
       FROM bonus_results br
       WHERE br.period_id = ?
       ORDER BY br.id ASC`,
      [parsedPeriodId]
    );

    // Step 3 — Fetch employee names from auth-service (graceful degradation)
    const authHeader = req.headers['authorization'] || '';
    const employeeMap = await fetchEmployeeMap(authHeader);

    const enrichedRows = bonusRows.map((row) => ({
      ...row,
      employee_name: employeeMap[row.employee_id] || null,
    }));

    // Step 4 — Generate PDF buffer
    const pdfBuffer = await generatePdfBuffer(period.period_name, enrichedRows);

    // Step 5 — Upload to GCS
    if (!bucket) {
      return sendError(
        res,
        'Layanan Cloud Storage tidak tersedia. Pastikan GCS_BUCKET_NAME sudah dikonfigurasi.',
        [],
        500
      );
    }

    const timestamp = Date.now();
    const fileName = `reports/${parsedPeriodId}_${timestamp}.pdf`;
    const file = bucket.file(fileName);

    await new Promise((resolve, reject) => {
      const stream = file.createWriteStream({
        metadata: { contentType: 'application/pdf' },
        resumable: false,
      });
      stream.on('error', reject);
      stream.on('finish', resolve);
      stream.end(pdfBuffer);
    });

    // Build public URL
    const bucketName = process.env.GCS_BUCKET_NAME;
    const fileUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

    // Step 6 — Save to payroll_reports
    const result = await query(
      'INSERT INTO payroll_reports (period_id, file_name, file_url) VALUES (?, ?, ?)',
      [parsedPeriodId, fileName, fileUrl]
    );

    const insertedId = result.insertId;

    // Step 7 — Return created record
    const [newReport] = await query(
      `SELECT pr.id, pr.period_id, kp.period_name, pr.file_name, pr.file_url, pr.generated_at
       FROM payroll_reports pr
       LEFT JOIN kpi_periods kp ON kp.id = pr.period_id
       WHERE pr.id = ?`,
      [insertedId]
    );

    return sendSuccess(res, 'Laporan PDF berhasil di-generate', newReport, 201);
  } catch (err) {
    // Requirement 10.5: If generate fails, don't save to payroll_reports — propagate as 500
    next(err);
  }
});

// ── GET /api/reports ────────────────────────────────────────────────────────────
// Requirements: 10.3
router.get('/', async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT pr.id, pr.period_id, kp.period_name, pr.file_name, pr.file_url, pr.generated_at
       FROM payroll_reports pr
       LEFT JOIN kpi_periods kp ON kp.id = pr.period_id
       ORDER BY pr.generated_at DESC`
    );
    return sendSuccess(res, 'Daftar laporan berhasil diambil', rows);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/reports/:id/download ──────────────────────────────────────────────
// Requirements: 10.4
router.get('/:id/download', async (req, res, next) => {
  const { id } = req.params;

  try {
    const rows = await query(
      'SELECT id, period_id, file_name, file_url FROM payroll_reports WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return sendError(res, 'Laporan tidak ditemukan', [], 404);
    }

    const report = rows[0];

    if (!bucket) {
      return sendError(
        res,
        'Layanan Cloud Storage tidak tersedia.',
        [],
        500
      );
    }

    // Derive the GCS object path from file_name (already stored as 'reports/{id}_{ts}.pdf')
    const gcsFile = bucket.file(report.file_name);

    // Check that the file exists before streaming
    const [exists] = await gcsFile.exists();
    if (!exists) {
      return sendError(res, 'File PDF tidak ditemukan di Cloud Storage', [], 404);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${report.file_name.split('/').pop()}"`
    );

    gcsFile.createReadStream()
      .on('error', (err) => {
        // If headers haven't been sent yet we can still send a JSON error
        if (!res.headersSent) {
          sendError(res, 'Gagal mengunduh file PDF dari Cloud Storage', [], 500);
        } else {
          res.destroy(err);
        }
      })
      .pipe(res);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
