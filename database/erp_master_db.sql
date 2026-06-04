-- ===========================================================
-- DDL: erp_master_db
-- Database master untuk sistem ERP KPI Salesman Mobil
-- Menyimpan data master: users, sessions, positions,
--                        employees, employee_files
--
-- Requirements: 14.1, 14.3
-- Charset : utf8mb4
-- Collation: utf8mb4_unicode_ci
-- ===========================================================

CREATE DATABASE IF NOT EXISTS `erp_master_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `erp_master_db`;

-- -----------------------------------------------------------
-- Tabel: users
-- Menyimpan akun admin yang dapat login ke sistem
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id`            INT            NOT NULL AUTO_INCREMENT,
  `email`         VARCHAR(255)   NOT NULL,
  `password_hash` VARCHAR(255)   NOT NULL,
  `name`          VARCHAR(100)   NOT NULL,
  `created_at`    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Akun admin yang dapat mengakses sistem';

-- -----------------------------------------------------------
-- Tabel: sessions
-- Menyimpan session token yang aktif setelah login
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sessions` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `user_id`    INT          NOT NULL,
  `token`      VARCHAR(512) NOT NULL,
  `expires_at` TIMESTAMP    NOT NULL,
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sessions_token` (`token`),
  CONSTRAINT `fk_sessions_user_id`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Session token aktif per user';

-- -----------------------------------------------------------
-- Tabel: positions
-- Menyimpan jabatan/posisi karyawan
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `positions` (
  `id`            INT          NOT NULL AUTO_INCREMENT,
  `position_name` VARCHAR(100) NOT NULL,
  `created_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Daftar jabatan/posisi karyawan';

-- -----------------------------------------------------------
-- Tabel: employees
-- Menyimpan data karyawan/salesman
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `employees` (
  `id`            INT          NOT NULL AUTO_INCREMENT,
  `employee_code` VARCHAR(50)  NOT NULL,
  `name`          VARCHAR(100) NOT NULL,
  `email`         VARCHAR(255) NULL DEFAULT NULL,
  `phone`         VARCHAR(20)  NULL DEFAULT NULL,
  `position_id`   INT          NULL DEFAULT NULL,
  `photo_url`     VARCHAR(512) NULL DEFAULT NULL,
  `is_active`     TINYINT(1)   NOT NULL DEFAULT 1 COMMENT 'Status aktif karyawan (1=active, 0=inactive)',
  `created_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_employees_employee_code` (`employee_code`),
  UNIQUE KEY `uq_employees_email` (`email`),
  CONSTRAINT `fk_employees_position_id`
    FOREIGN KEY (`position_id`) REFERENCES `positions` (`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Data karyawan/salesman';

-- -----------------------------------------------------------
-- Tabel: employee_files
-- Menyimpan metadata file yang diupload untuk karyawan
-- (foto profil, dokumen, dsb.) — file fisik ada di GCS
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `employee_files` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `employee_id` INT          NOT NULL,
  `file_name`   VARCHAR(255) NOT NULL,
  `file_url`    VARCHAR(512) NOT NULL,
  `file_size`   INT          NULL DEFAULT NULL COMMENT 'Ukuran file dalam bytes',
  `file_type`   VARCHAR(50)  NULL DEFAULT NULL COMMENT 'MIME type, contoh: image/jpeg',
  `uploaded_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_employee_files_employee_id`
    FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Metadata file/foto yang diupload untuk karyawan';

-- -----------------------------------------------------------
-- Seed data: admin awal
-- password_hash adalah placeholder — ganti dengan hash bcrypt
-- yang sebenarnya sebelum digunakan di production
-- -----------------------------------------------------------
INSERT INTO `users` (`email`, `password_hash`, `name`)
VALUES ('admin@erp.com', '$2b$10$PLACEHOLDER_REPLACE_WITH_REAL_BCRYPT_HASH', 'Admin')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
