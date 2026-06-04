-- ===========================================================
-- DDL: erp_kpi_payroll_db
-- Database KPI & Payroll untuk sistem ERP KPI Salesman Mobil
-- Menyimpan data transaksi: kpi_criteria, kpi_periods,
--                           kpi_assessments, bonus_results,
--                           payroll_reports
--
-- Requirements: 14.2, 14.3, 14.4
-- Charset : utf8mb4
-- Collation: utf8mb4_unicode_ci
-- ===========================================================

CREATE DATABASE IF NOT EXISTS `erp_kpi_payroll_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `erp_kpi_payroll_db`;

-- -----------------------------------------------------------
-- Tabel: kpi_criteria
-- Menyimpan definisi kriteria KPI beserta bobotnya
-- Seed data 4 kriteria (C1–C4) disertakan di bawah
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `kpi_criteria` (
  `id`            INT           NOT NULL AUTO_INCREMENT,
  `criteria_code` VARCHAR(10)   NOT NULL COMMENT 'Kode unik kriteria, contoh: C1, C2',
  `criteria_name` VARCHAR(100)  NOT NULL COMMENT 'Nama kriteria KPI',
  `weight`        DECIMAL(4,2)  NOT NULL COMMENT 'Bobot kriteria (total seluruh kriteria = 1.00)',
  `description`   TEXT          NULL     DEFAULT NULL COMMENT 'Deskripsi kriteria',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_kpi_criteria_criteria_code` (`criteria_code`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Definisi kriteria KPI dan bobot untuk kalkulasi SAW';

-- -----------------------------------------------------------
-- Tabel: kpi_periods
-- Menyimpan periode penilaian KPI (bulan + tahun)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `kpi_periods` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `period_name` VARCHAR(100) NOT NULL COMMENT 'Nama periode, contoh: Januari 2025',
  `month`       TINYINT      NOT NULL COMMENT 'Bulan (1–12)',
  `year`        YEAR         NOT NULL COMMENT 'Tahun penilaian',
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Periode penilaian KPI berdasarkan bulan dan tahun';

-- -----------------------------------------------------------
-- Tabel: kpi_assessments
-- Menyimpan data capaian 4 indikator KPI per karyawan per periode
-- Catatan: employee_id TIDAK menggunakan FK constraint MySQL
--          karena merujuk ke tabel employees di erp_master_db
--          (lintas database). Validasi dilakukan di application layer.
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `kpi_assessments` (
  `id`                   INT            NOT NULL AUTO_INCREMENT,
  `employee_id`          INT            NOT NULL COMMENT 'Referensi ke employees.id di erp_master_db (tanpa FK lintas DB)',
  `period_id`            INT            NOT NULL,
  `sales_unit`           INT            NOT NULL COMMENT 'Jumlah unit mobil yang terjual (≥ 0)',
  `avg_transaction`      DECIMAL(15,2)  NOT NULL COMMENT 'Rata-rata nilai transaksi per penjualan (Rp)',
  `attendance_score`     DECIMAL(5,2)   NOT NULL COMMENT 'Skor kehadiran salesman (0–100)',
  `customer_satisfaction` DECIMAL(5,2)  NOT NULL COMMENT 'Rata-rata skor kepuasan pelanggan (0–100)',
  `created_at`           TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`           TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_kpi_assessments_period_id`
    FOREIGN KEY (`period_id`) REFERENCES `kpi_periods` (`id`)
    ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Capaian 4 indikator KPI per karyawan per periode';

-- -----------------------------------------------------------
-- Tabel: bonus_results
-- Menyimpan hasil kalkulasi skor SAW dan bonus gaji
-- employee_id dan period_id di-denormalisasi untuk efisiensi query rekap
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `bonus_results` (
  `id`                 INT            NOT NULL AUTO_INCREMENT,
  `assessment_id`      INT            NOT NULL,
  `employee_id`        INT            NOT NULL COMMENT 'Denormalisasi employee_id untuk query rekap (tanpa FK lintas DB)',
  `period_id`          INT            NOT NULL,
  `sales_score`        DECIMAL(5,2)   NOT NULL COMMENT 'Skor C1: Unit Penjualan (0–100)',
  `transaction_score`  DECIMAL(5,2)   NOT NULL COMMENT 'Skor C2: Rata-rata Nilai Transaksi (1–100)',
  `attendance_score`   DECIMAL(5,2)   NOT NULL COMMENT 'Skor C3: Kehadiran (0–100)',
  `satisfaction_score` DECIMAL(5,2)   NOT NULL COMMENT 'Skor C4: Kepuasan Pelanggan (0–100)',
  `final_score`        DECIMAL(5,2)   NOT NULL COMMENT 'Skor akhir SAW (0–100)',
  `bonus_percentage`   DECIMAL(5,2)   NOT NULL COMMENT 'Persentase bonus yang ditetapkan (0–100)',
  `bonus_amount`       DECIMAL(15,2)  NOT NULL COMMENT 'Nominal bonus dalam Rupiah',
  `calculated_at`      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_bonus_results_assessment_id`
    FOREIGN KEY (`assessment_id`) REFERENCES `kpi_assessments` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_bonus_results_period_id`
    FOREIGN KEY (`period_id`) REFERENCES `kpi_periods` (`id`)
    ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Hasil kalkulasi skor SAW dan bonus gaji per karyawan per periode';

-- -----------------------------------------------------------
-- Tabel: payroll_reports
-- Menyimpan metadata laporan PDF yang di-generate dan diupload ke GCS
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payroll_reports` (
  `id`           INT          NOT NULL AUTO_INCREMENT,
  `period_id`    INT          NOT NULL,
  `file_name`    VARCHAR(255) NOT NULL COMMENT 'Nama file PDF yang di-generate',
  `file_url`     VARCHAR(512) NOT NULL COMMENT 'URL file PDF di Google Cloud Storage',
  `generated_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_payroll_reports_period_id`
    FOREIGN KEY (`period_id`) REFERENCES `kpi_periods` (`id`)
    ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Metadata laporan PDF rekap bonus per periode';

-- -----------------------------------------------------------
-- Seed data: 4 kriteria KPI (C1–C4)
-- INSERT IGNORE memastikan operasi idempoten —
-- tidak gagal jika dijalankan ulang
-- -----------------------------------------------------------
INSERT IGNORE INTO `kpi_criteria` (`criteria_code`, `criteria_name`, `weight`, `description`) VALUES
  ('C1', 'Unit Penjualan',             0.35, 'Jumlah unit mobil yang berhasil dijual dalam satu periode'),
  ('C2', 'Rata-rata Nilai Transaksi',  0.25, 'Rata-rata nilai penjualan per transaksi dalam Rupiah'),
  ('C3', 'Skor Kehadiran',             0.20, 'Persentase kehadiran salesman dalam satu periode'),
  ('C4', 'Kepuasan Pelanggan',         0.20, 'Rata-rata skor kepuasan pelanggan dari survei');
