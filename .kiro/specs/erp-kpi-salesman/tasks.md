# Rencana Implementasi: ERP KPI Salesman

## Ikhtisar

Implementasi sistem WebApp ERP KPI Salesman Mobil dengan 3 microservice (frontend-service, auth-employee-service, kpi-payroll-service), 2 database MySQL, Cloud Storage untuk file, dan perhitungan bonus menggunakan metode SAW.

## Tasks

- [x] 1. Setup struktur project dan dependensi
  - Buat struktur folder untuk 3 microservice: `frontend-service/`, `auth-employee-service/`, `kpi-payroll-service/`
  - Inisialisasi `package.json` di masing-masing service dengan dependensi yang diperlukan
  - `auth-employee-service`: express, mysql2, bcryptjs, uuid, multer, @google-cloud/storage, express-validator, cors, dotenv, jest, fast-check
  - `kpi-payroll-service`: express, mysql2, axios, pdfkit, @google-cloud/storage, express-validator, cors, dotenv, jest, fast-check
  - `frontend-service`: react, react-dom, react-router-dom, axios, vite
  - Buat file `.env.example` di masing-masing service dengan variabel lingkungan yang diperlukan
  - Buat file `jest.config.js` di masing-masing backend service
  - _Requirements: 14.3, 15.1_

- [x] 2. Setup database dan DDL
  - [x] 2.1 Buat file DDL `erp_master_db.sql` berisi CREATE TABLE untuk: `users`, `sessions`, `positions`, `employees`, `employee_files`
    - Pastikan semua constraint, FK, UNIQUE, dan DEFAULT sesuai desain
    - _Requirements: 14.1, 14.3_
  - [x] 2.2 Buat file DDL `erp_kpi_payroll_db.sql` berisi CREATE TABLE untuk: `kpi_criteria`, `kpi_periods`, `kpi_assessments`, `bonus_results`, `payroll_reports`
    - Sertakan INSERT seed data 4 kriteria KPI (C1-C4) dengan bobot 0.35, 0.25, 0.20, 0.20
    - _Requirements: 14.2, 14.3, 14.4_

- [x] 3. Implementasi auth-employee-service: infrastruktur dan autentikasi
  - [x] 3.1 Buat koneksi database MySQL (`src/config/database.js`) dan setup Express app dengan middleware CORS, body-parser, rate limiter, dan global error handler
    - _Requirements: 13.1, 13.2, 13.3_
  - [x] 3.2 Buat helper `src/utils/responseHelper.js` untuk format response JSON konsisten (`success`, `message`, `data` / `errors`)
    - _Requirements: 13.1, 13.2, 13.3_
  - [x] 3.3 Implementasi endpoint `POST /api/auth/login`: validasi email + password (min 6 karakter), cek credentials di tabel `users`, buat session di tabel `sessions`, kembalikan token
    - _Requirements: 1.1, 1.2, 1.6_
  - [x] 3.4 Implementasi endpoint `POST /api/auth/logout`: hapus session dari tabel `sessions`
    - _Requirements: 1.4_
  - [x] 3.5 Implementasi endpoint `GET /api/auth/validate` dan middleware autentikasi: cek token di tabel `sessions`, validasi `expires_at`, kembalikan 401 jika tidak valid atau kadaluarsa
    - _Requirements: 1.3, 1.5_
  - [x] 3.6 Tulis property test untuk autentikasi (P1–P5)
    - **Property 1: Login menghasilkan token untuk kredensial valid** — Validates: Requirements 1.1
    - **Property 2: Login ditolak untuk kredensial tidak valid** — Validates: Requirements 1.2
    - **Property 3: Token valid mengizinkan akses; token tidak valid atau kadaluarsa menolak akses** — Validates: Requirements 1.3, 1.5
    - **Property 4: Logout menginvalidasi token** — Validates: Requirements 1.4
    - **Property 5: Validasi format credential login** — Validates: Requirements 1.6
    - File: `src/__tests__/auth.service.test.js`

- [x] 4. Checkpoint — Pastikan semua test auth lolos, tanyakan ke user jika ada pertanyaan.

- [x] 5. Implementasi auth-employee-service: manajemen jabatan dan karyawan
  - [x] 5.1 Implementasi CRUD endpoint jabatan: `GET /api/positions`, `POST /api/positions`, `PUT /api/positions/:id`, `DELETE /api/positions/:id`
    - Validasi `position_name` wajib diisi
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [x] 5.2 Tulis property test untuk CRUD jabatan (P15)
    - **Property 15: Round trip CRUD jabatan** — Validates: Requirements 4.1, 4.2, 4.3, 4.4
    - File: `src/__tests__/position.service.test.js`
  - [x] 5.3 Implementasi CRUD endpoint karyawan: `GET /api/employees`, `POST /api/employees`, `GET /api/employees/:id`, `PUT /api/employees/:id`, `DELETE /api/employees/:id`
    - Validasi: `name` wajib diisi, `email` format valid, `phone` minimal 10 digit angka, `employee_code` unik
    - Kembalikan 404 jika ID tidak ditemukan, 409 jika `employee_code` duplikat
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_
  - [x] 5.4 Tulis property test untuk CRUD karyawan (P6–P10)
    - **Property 6: Round trip create-read karyawan** — Validates: Requirements 2.1, 2.4
    - **Property 7: Input karyawan invalid selalu ditolak** — Validates: Requirements 2.2, 2.7, 2.8
    - **Property 8: Read all karyawan mencakup semua yang dibuat** — Validates: Requirements 2.3
    - **Property 9: Update karyawan tercermin saat dibaca** — Validates: Requirements 2.5
    - **Property 10: Delete karyawan menghilangkannya dari sistem** — Validates: Requirements 2.6
    - File: `src/__tests__/employee.service.test.js`

- [x] 6. Implementasi auth-employee-service: upload foto profil ke GCS
  - [x] 6.1 Buat `src/config/storage.js` untuk koneksi Google Cloud Storage
    - _Requirements: 15.3_
  - [x] 6.2 Implementasi endpoint `POST /api/employees/:id/photo`: validasi MIME type (hanya `image/jpeg` dan `image/png`) dan ukuran (maks 2MB) sebelum upload, upload ke GCS, simpan URL ke `employees.photo_url` dan metadata ke tabel `employee_files`
    - Gunakan atomic operation: upload GCS berhasil → baru simpan ke DB; jika GCS gagal → rollback, kembalikan 503
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [x] 6.3 Tulis property test dan unit test untuk upload foto (P11–P14)
    - **Property 11: Upload foto valid menyimpan URL di database** — Validates: Requirements 3.1
    - **Property 12: Upload foto format invalid selalu ditolak** — Validates: Requirements 3.2
    - **Property 13: Upload foto ukuran > 2MB selalu ditolak** — Validates: Requirements 3.3
    - **Property 14: Kegagalan GCS tidak menyimpan data ke database (atomicity)** — Validates: Requirements 3.4, 10.5
    - File: `src/__tests__/upload.service.test.js`

- [x] 7. Checkpoint — Pastikan semua test auth-employee-service lolos, tanyakan ke user jika ada pertanyaan.

- [x] 8. Implementasi kpi-payroll-service: infrastruktur dan modul kalkulasi SAW
  - [x] 8.1 Buat koneksi database MySQL (`src/config/database.js`) dan setup Express app dengan middleware, termasuk middleware autentikasi yang memanggil `GET /api/auth/validate` di auth-employee-service (timeout 5 detik → 503)
    - _Requirements: 13.1, 13.2, 13.3_
  - [x] 8.2 Buat `src/utils/responseHelper.js` (format yang sama dengan auth-employee-service)
    - _Requirements: 13.1, 13.2, 13.3_
  - [x] 8.3 Implementasi modul pure function `src/services/sawCalculator.js`:
    - `calculateSalesScore(salesUnit)`: `min((salesUnit / 20) * 100, 100)`
    - `calculateTransactionScore(avgTransaction)`: normalisasi linear dengan clamp [1, 100]
    - `calculateFinalScore(ss, ts, as, cs)`: weighted sum dengan bobot 0.35, 0.25, 0.20, 0.20
    - `calculateBonus(finalScore)`: 7 tier bonus deterministik
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.1–8.8_
  - [x] 8.4 Tulis property test untuk kalkulasi SAW (P21–P24)
    - **Property 21: Kalkulasi sales_score terbatas pada rentang 0–100** — Validates: Requirements 7.1
    - **Property 22: Kalkulasi transaction_score dengan normalisasi linear** — Validates: Requirements 7.2
    - **Property 23: Kalkulasi final_score SAW menghasilkan nilai 0–100** — Validates: Requirements 7.3, 7.4, 7.5
    - **Property 24: Tier bonus deterministik berdasarkan final_score** — Validates: Requirements 8.1–8.8
    - File: `src/__tests__/sawCalculator.test.js`

- [x] 9. Implementasi kpi-payroll-service: periode KPI
  - [x] 9.1 Implementasi CRUD endpoint periode KPI: `GET /api/kpi/periods`, `POST /api/kpi/periods`, `GET /api/kpi/periods/:id`, `PUT /api/kpi/periods/:id`, `DELETE /api/kpi/periods/:id`
    - Validasi: `month` 1–12, `year` positif, `period_name` wajib diisi
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  - [x] 9.2 Tulis property test untuk CRUD periode KPI (P16–P17)
    - **Property 16: Validasi field periode KPI** — Validates: Requirements 5.6
    - **Property 17: Round trip CRUD periode KPI** — Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
    - File: `src/__tests__/period.service.test.js`

- [x] 10. Implementasi kpi-payroll-service: penilaian KPI dan perhitungan bonus
  - [x] 10.1 Implementasi endpoint `POST /api/kpi/assessments`: validasi semua field, validasi referensi `employee_id` (panggil auth-employee-service), simpan ke `kpi_assessments`, hitung skor SAW + bonus, simpan ke `bonus_results`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 7.1–7.5, 8.1–8.8_
  - [x] 10.2 Implementasi endpoint `GET /api/kpi/assessments`, `GET /api/kpi/assessments/:id`, `PUT /api/kpi/assessments/:id`, `DELETE /api/kpi/assessments/:id`
    - Update assessment harus menghitung ulang dan memperbarui `bonus_results`
    - _Requirements: 6.8, 6.9, 6.10_
  - [x] 10.3 Tulis property test untuk input assessment KPI (P18–P20)
    - **Property 18: Input assessment KPI valid tersimpan** — Validates: Requirements 6.1
    - **Property 19: Validasi boundary field assessment KPI** — Validates: Requirements 6.2, 6.3, 6.4, 6.5
    - **Property 20: Validasi referensi employee_id dan period_id** — Validates: Requirements 6.6, 6.7
    - File: `src/__tests__/assessment.service.test.js`

- [x] 11. Implementasi kpi-payroll-service: rekap bonus dan laporan PDF
  - [x] 11.1 Implementasi endpoint rekap bonus: `GET /api/kpi/recap` dan `GET /api/kpi/recap?period_id=X` (filter opsional), `GET /api/kpi/recap/:id`
    - JOIN dengan data karyawan (via API auth-employee-service) dan periode untuk menyertakan nama karyawan dan nama periode
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  - [x] 11.2 Tulis property test untuk rekap bonus (P25–P26)
    - **Property 25: Filter rekap bonus berdasarkan period_id** — Validates: Requirements 9.1, 9.2
    - **Property 26: Data rekap bonus menyertakan informasi karyawan dan periode** — Validates: Requirements 9.3, 9.4
    - File: `src/__tests__/recap.service.test.js`
  - [x] 11.3 Buat `src/config/storage.js` untuk koneksi GCS di kpi-payroll-service
    - _Requirements: 15.3_
  - [x] 11.4 Implementasi endpoint generate dan download laporan PDF:
    - `POST /api/reports/generate/:period_id`: ambil data `bonus_results` untuk periode tersebut, generate PDF dengan pdfkit berisi tabel rekap bonus, upload ke GCS, simpan record ke `payroll_reports`
    - `GET /api/reports`: daftar semua laporan
    - `GET /api/reports/:id/download`: stream file PDF dari GCS
    - Jika generate gagal: jangan simpan ke `payroll_reports`, kembalikan 500
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  - [x] 11.5 Tulis property test dan unit test untuk laporan PDF (P27)
    - **Property 27: Generate PDF berhasil mencatat laporan di database** — Validates: Requirements 10.1, 10.2, 10.3, 10.4
    - File: `src/__tests__/report.service.test.js`

- [x] 12. Tulis property test format response API (P28)
  - [x] 12.1 Tulis property test untuk konsistensi format response JSON di auth-employee-service
    - **Property 28: Semua response API menggunakan format JSON yang konsisten** — Validates: Requirements 13.1, 13.2, 13.3
    - File: `auth-employee-service/src/__tests__/responseFormat.test.js`
  - [x] 12.2 Tulis property test untuk konsistensi format response JSON di kpi-payroll-service
    - **Property 28: Semua response API menggunakan format JSON yang konsisten** — Validates: Requirements 13.1, 13.2, 13.3
    - File: `kpi-payroll-service/src/__tests__/responseFormat.test.js`

- [x] 13. Checkpoint — Pastikan semua test backend (auth-employee-service dan kpi-payroll-service) lolos, tanyakan ke user jika ada pertanyaan.

- [x] 14. Implementasi frontend-service: setup dan autentikasi
  - [x] 14.1 Setup project Vite + React dengan React Router DOM, buat struktur folder `src/pages/`, `src/components/`, `src/context/`, `src/services/`
    - _Requirements: 12.1, 12.2_
  - [x] 14.2 Buat `src/services/api.js` dengan instance axios yang menyertakan token dari localStorage pada setiap request
    - _Requirements: 12.9_
  - [x] 14.3 Buat `src/context/AuthContext.jsx` dengan React Context + `useReducer` untuk state global (token, user info, login, logout)
    - _Requirements: 12.8_
  - [x] 14.4 Implementasi komponen `PrivateRoute` yang redirect ke `/login` jika belum login
    - _Requirements: 12.8_
  - [x] 14.5 Implementasi halaman `LoginPage` (`/login`): form email + password, panggil `POST /api/auth/login`, simpan token, redirect ke dashboard
    - Tampilkan pesan error jika login gagal
    - _Requirements: 12.1, 12.9_

- [x] 15. Implementasi frontend-service: layout dan navigasi
  - [x] 15.1 Buat komponen `Layout` dengan navbar dan sidebar yang berisi link ke seluruh fitur sistem
    - Tombol logout yang memanggil `POST /api/auth/logout` dan membersihkan token
    - _Requirements: 12.2_

- [x] 16. Implementasi frontend-service: halaman manajemen karyawan dan jabatan
  - [x] 16.1 Implementasi halaman `EmployeesPage` (`/employees`): tabel daftar karyawan, tombol tambah/edit/hapus
    - _Requirements: 12.3_
  - [x] 16.2 Implementasi halaman `EmployeeFormPage` (`/employees/create` dan `/employees/:id/edit`): form tambah/edit karyawan
    - Tampilkan pesan error validasi dari API
    - _Requirements: 12.3_
  - [x] 16.3 Implementasi halaman `EmployeeDetailPage` (`/employees/:id`): detail karyawan + form upload foto profil
    - _Requirements: 12.3_
  - [x] 16.4 Implementasi halaman `PositionsPage` (`/positions`): tabel jabatan + form inline tambah/edit/hapus
    - _Requirements: 12.2_

- [x] 17. Implementasi frontend-service: halaman KPI, rekap bonus, dan laporan
  - [x] 17.1 Implementasi halaman `KpiPeriodsPage` (`/kpi/periods`): CRUD periode KPI
    - _Requirements: 12.4_
  - [x] 17.2 Implementasi halaman `KpiAssessmentFormPage` (`/kpi/assessments/create`): form input 4 kriteria KPI (sales_unit, avg_transaction, attendance_score, customer_satisfaction) dengan selector karyawan dan periode
    - Tampilkan hasil skor dan bonus setelah submit berhasil
    - _Requirements: 12.5_
  - [x] 17.3 Implementasi halaman `BonusRecapPage` (`/kpi/recap`): tabel rekap bonus semua karyawan dengan dropdown filter per periode
    - _Requirements: 12.6_
  - [x] 17.4 Implementasi halaman `ReportsPage` (`/reports`): tabel daftar laporan PDF, tombol "Generate PDF" per periode, tombol download
    - _Requirements: 12.7_

- [x] 18. Implementasi frontend-service: halaman dashboard
  - [x] 18.1 Implementasi halaman `DashboardPage` (`/`): tampilkan jumlah karyawan aktif dan daftar periode KPI aktif
    - _Requirements: 11.1, 11.2, 11.3_

- [x] 19. Checkpoint — Pastikan semua halaman frontend berfungsi dan terintegrasi dengan API backend, tanyakan ke user jika ada pertanyaan.

- [x] 20. Konfigurasi deployment
  - [x] 20.1 Buat `Dockerfile` untuk `auth-employee-service` dan `kpi-payroll-service`
    - Multi-stage build: build stage + production stage
    - Expose port yang sesuai
    - _Requirements: 15.1_
  - [x] 20.2 Buat `Dockerfile` untuk `frontend-service`
    - Build Vite static files, serve dengan nginx
    - _Requirements: 15.1_
  - [x] 20.3 Buat file `app.yaml` alternatif untuk Google App Engine di masing-masing service
    - Sertakan environment variables (dari Secret Manager atau env_variables)
    - _Requirements: 15.1, 15.2_
  - [x] 20.4 Buat `docker-compose.yml` di root project untuk menjalankan seluruh stack secara lokal (3 service + 2 MySQL)
    - _Requirements: 15.1, 15.2_

- [x] 21. Checkpoint final — Pastikan semua test lolos dan konfigurasi deployment lengkap, tanyakan ke user jika ada pertanyaan.

## Catatan

- Task yang diberi tanda `*` bersifat opsional dan dapat dilewati untuk MVP yang lebih cepat
- Setiap task mereferensikan requirements spesifik untuk kemudahan tracing
- Property test menggunakan fast-check dengan minimum 100 iterasi per properti
- Mock GCS menggunakan `jest.mock()` saat testing; mock cross-service call menggunakan `jest.fn()` atau `nock`
- Database untuk testing menggunakan MySQL container Docker terpisah atau in-memory alternative
- `employee_id` di `kpi_assessments` tidak menggunakan FK constraint MySQL karena lintas database; validasi dilakukan di application layer
