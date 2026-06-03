# AI Agent Instruction Document
## WebAPP ERP KPI Bonus Salesman Mobil

Dokumen ini digunakan sebagai instruksi kerja untuk AI Agent agar dapat membantu membangun, menganalisis, atau mengembangkan WebAPP ERP sederhana modul penilaian KPI salesman mobil untuk perhitungan bonus gaji.

---

## 1. Peran AI Agent

AI Agent berperan sebagai asisten pengembangan sistem yang membantu dalam:

1. Menyusun requirement sistem.
2. Merancang database MySQL.
3. Merancang REST API backend NodeJS.
4. Merancang frontend ReactJS.
5. Membuat business logic perhitungan KPI menggunakan metode SAW.
6. Membuat flow authentication dan session management.
7. Membuat fitur upload file ke Cloud Storage.
8. Membuat fitur laporan PDF rekap bonus.
9. Menjaga agar rancangan sistem tetap sesuai ketentuan tugas kuliah.

---

## 2. Tujuan Sistem

Bangun sebuah WebAPP ERP sederhana untuk modul penilaian capaian KPI salesman mobil. Sistem digunakan oleh Admin untuk mengelola data karyawan/salesman, menginput capaian KPI, menghitung skor KPI, menentukan bonus gaji, melihat rekap bonus, dan mengunduh laporan PDF.

---

## 3. Ketentuan Teknis Wajib

AI Agent wajib mengikuti ketentuan berikut:

1. Sistem memiliki **2 database**.
2. Setiap database minimal memiliki **5 tabel**.
3. Database menggunakan **MySQL**.
4. Backend menggunakan **NodeJS**.
5. Frontend menggunakan **ReactJS**.
6. API menggunakan konsep **REST API**.
7. Endpoint API minimal **15 endpoint**.
8. Setiap CRUD dihitung sebagai 4 endpoint: create, read, update, delete.
9. Deployment service menggunakan salah satu:
   - Google App Engine, atau
   - Google Cloud Run.
10. Database dideploy menggunakan salah satu:
   - Google Cloud SQL, atau
   - GCE dengan MySQL.
11. Sistem harus terhubung ke **Cloud Storage**.
12. Cloud Storage digunakan untuk menyimpan:
   - Foto profil karyawan.
   - Laporan PDF rekap bonus.
13. Sistem memiliki authentication dan session management.
14. Sistem hanya memiliki **1 role**, yaitu **Admin**.

---

## 4. Batasan Sistem

AI Agent harus menjaga agar sistem tetap sederhana dan sesuai kebutuhan tugas kuliah.

Batasan sistem:

1. Tidak perlu membuat multi-role user.
2. Tidak perlu membuat sistem payroll lengkap.
3. Tidak perlu menghitung gaji pokok, pajak, BPJS, atau potongan lain.
4. Fokus utama sistem adalah penilaian KPI dan perhitungan bonus salesman.
5. Sistem hanya memiliki satu pengguna utama, yaitu Admin.
6. Perhitungan bonus hanya berdasarkan 4 kriteria KPI.
7. Total bonus maksimal adalah Rp2.000.000.

---

## 5. Aktor Sistem

| Aktor | Hak Akses |
|---|---|
| Admin | Login, logout, CRUD karyawan, upload foto, input KPI, hitung bonus, lihat rekap bonus, download PDF laporan. |

---

## 6. Fitur Utama Sistem

AI Agent harus memastikan sistem memiliki fitur berikut:

1. Login Admin.
2. Logout Admin.
3. Session management.
4. Dashboard Admin.
5. CRUD data karyawan/salesman.
6. Upload foto profil karyawan.
7. CRUD periode KPI.
8. Input indikator capaian KPI.
9. Perhitungan skor KPI menggunakan metode SAW.
10. Perhitungan persentase bonus.
11. Perhitungan nominal bonus.
12. Rekapitulasi bonus karyawan.
13. Filter rekap bonus berdasarkan periode.
14. Generate laporan PDF.
15. Download laporan PDF.
16. Simpan file foto dan laporan ke Cloud Storage.

---

## 7. User Flow Sistem

AI Agent harus mengikuti alur sistem berikut:

```text
Admin membuka aplikasi
  ↓
Admin login
  ↓
Sistem memvalidasi akun Admin
  ↓
Admin masuk ke dashboard
  ↓
Admin membuka data karyawan
  ↓
Admin memilih profil karyawan/salesman
  ↓
Admin memilih periode KPI
  ↓
Admin menginput 4 indikator capaian KPI
  ↓
Sistem memvalidasi input
  ↓
Sistem menghitung skor KPI menggunakan metode SAW
  ↓
Sistem menentukan persentase bonus
  ↓
Sistem menghitung nominal bonus
  ↓
Admin melihat rekap bonus karyawan
  ↓
Admin mengunduh laporan PDF
```

---

## 8. Business Rules KPI

Sistem menggunakan 4 kriteria penilaian bonus.

| Kode | Kriteria | Input | Output Nilai |
|---|---|---|---|
| C1 | Jumlah Penjualan | Integer jumlah unit mobil | 0-100 |
| C2 | Transaksi Rata-Rata | Rp200.000.000 - Rp1.000.000.000 | 1-100 |
| C3 | Presensi | 0-100 | 0-100 |
| C4 | Kepuasan Pelanggan | 0-100 | 0-100 |

---

## 9. Bobot Kriteria SAW

AI Agent harus menggunakan bobot berikut untuk perhitungan SAW:

| Kode | Kriteria | Bobot |
|---|---|---:|
| C1 | Jumlah Penjualan | 0.35 |
| C2 | Transaksi Rata-Rata | 0.25 |
| C3 | Presensi | 0.20 |
| C4 | Kepuasan Pelanggan | 0.20 |
|  | Total | 1.00 |

---

## 10. Aturan Normalisasi KPI

### 10.1 Jumlah Penjualan

Target penjualan adalah 20 unit per bulan.

Gunakan rumus:

```text
sales_score = (sales_unit / 20) * 100
```

Ketentuan:

```text
Jika sales_score > 100, maka sales_score = 100
Jika sales_unit < 0, input tidak valid
```

---

### 10.2 Transaksi Rata-Rata

Input transaksi rata-rata berada pada rentang Rp200.000.000 sampai Rp1.000.000.000.

Gunakan rumus:

```text
transaction_score = ((avg_transaction - 200000000) / (1000000000 - 200000000)) * 99 + 1
```

Ketentuan:

```text
Jika avg_transaction < 200000000, maka transaction_score = 1
Jika avg_transaction > 1000000000, maka transaction_score = 100
```

---

### 10.3 Presensi

Presensi diinput manual oleh Admin dalam bentuk angka 0-100.

Gunakan rumus:

```text
attendance_score = attendance_input
```

Ketentuan:

```text
Nilai minimal = 0
Nilai maksimal = 100
```

---

### 10.4 Kepuasan Pelanggan

Kepuasan pelanggan diinput manual oleh Admin dalam bentuk angka 0-100.

Gunakan rumus:

```text
satisfaction_score = customer_satisfaction_input
```

Ketentuan:

```text
Nilai minimal = 0
Nilai maksimal = 100
```

---

## 11. Rumus Final Score SAW

AI Agent harus menggunakan rumus berikut:

```text
final_score = (sales_score * 0.35) +
              (transaction_score * 0.25) +
              (attendance_score * 0.20) +
              (satisfaction_score * 0.20)
```

Nilai `final_score` berada pada rentang 0-100.

---

## 12. Aturan Bonus Gaji

Total bonus maksimal adalah:

```text
MAX_BONUS = 2000000
```

Gunakan aturan berikut:

| Final Score | Persentase Bonus | Nominal Bonus |
|---:|---:|---:|
| >= 90 | 100% | Rp2.000.000 |
| >= 80 | 90% | Rp1.800.000 |
| >= 70 | 80% | Rp1.600.000 |
| >= 60 | 70% | Rp1.400.000 |
| >= 50 | 60% | Rp1.200.000 |
| >= 40 | 50% | Rp1.000.000 |
| < 40 | 0% | Rp0 |

Gunakan rumus:

```text
bonus_amount = MAX_BONUS * bonus_percentage
```

Contoh:

```text
final_score = 82.22
bonus_percentage = 0.90
bonus_amount = 2000000 * 0.90 = 1800000
```

---

## 13. Struktur Database Wajib

Sistem harus memiliki 2 database.

---

# Database 1: erp_master_db

Database ini digunakan untuk data master dan autentikasi.

## Tabel Wajib Database 1

| No | Nama Tabel | Fungsi |
|---|---|---|
| 1 | users | Menyimpan akun Admin. |
| 2 | sessions | Menyimpan session login Admin. |
| 3 | employees | Menyimpan data karyawan/salesman. |
| 4 | positions | Menyimpan data jabatan. |
| 5 | employee_files | Menyimpan file foto profil karyawan. |

---

## Struktur Tabel users

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin') DEFAULT 'admin',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## Struktur Tabel sessions

```sql
CREATE TABLE sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(255) NOT NULL,
  expired_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## Struktur Tabel positions

```sql
CREATE TABLE positions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  position_name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## Struktur Tabel employees

```sql
CREATE TABLE employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  position_id INT,
  employee_code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  photo_url VARCHAR(255),
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (position_id) REFERENCES positions(id)
);
```

---

## Struktur Tabel employee_files

```sql
CREATE TABLE employee_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  file_name VARCHAR(150) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_url VARCHAR(255) NOT NULL,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);
```

---

# Database 2: erp_kpi_payroll_db

Database ini digunakan untuk data KPI, hasil bonus, dan laporan.

## Tabel Wajib Database 2

| No | Nama Tabel | Fungsi |
|---|---|---|
| 1 | kpi_periods | Menyimpan periode KPI. |
| 2 | kpi_criteria | Menyimpan kriteria dan bobot KPI. |
| 3 | kpi_assessments | Menyimpan input penilaian KPI. |
| 4 | bonus_results | Menyimpan hasil perhitungan bonus. |
| 5 | payroll_reports | Menyimpan data laporan PDF. |

---

## Struktur Tabel kpi_periods

```sql
CREATE TABLE kpi_periods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  month INT NOT NULL,
  year INT NOT NULL,
  period_name VARCHAR(100) NOT NULL,
  status ENUM('open', 'closed') DEFAULT 'open',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## Struktur Tabel kpi_criteria

```sql
CREATE TABLE kpi_criteria (
  id INT AUTO_INCREMENT PRIMARY KEY,
  criteria_code VARCHAR(50) NOT NULL,
  criteria_name VARCHAR(100) NOT NULL,
  weight DECIMAL(5,2) NOT NULL,
  input_type VARCHAR(50) NOT NULL,
  min_value DECIMAL(15,2),
  max_value DECIMAL(15,2),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## Struktur Tabel kpi_assessments

```sql
CREATE TABLE kpi_assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  period_id INT NOT NULL,
  sales_unit INT NOT NULL,
  avg_transaction DECIMAL(15,2) NOT NULL,
  attendance_score DECIMAL(5,2) NOT NULL,
  customer_satisfaction DECIMAL(5,2) NOT NULL,
  created_by INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (period_id) REFERENCES kpi_periods(id)
);
```

Catatan: `employee_id` dan `created_by` mengacu secara logical ke database `erp_master_db`.

---

## Struktur Tabel bonus_results

```sql
CREATE TABLE bonus_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assessment_id INT NOT NULL,
  employee_id INT NOT NULL,
  period_id INT NOT NULL,
  sales_score DECIMAL(5,2) NOT NULL,
  transaction_score DECIMAL(5,2) NOT NULL,
  attendance_score DECIMAL(5,2) NOT NULL,
  satisfaction_score DECIMAL(5,2) NOT NULL,
  final_score DECIMAL(5,2) NOT NULL,
  bonus_percentage DECIMAL(5,2) NOT NULL,
  bonus_amount DECIMAL(15,2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (assessment_id) REFERENCES kpi_assessments(id),
  FOREIGN KEY (period_id) REFERENCES kpi_periods(id)
);
```

---

## Struktur Tabel payroll_reports

```sql
CREATE TABLE payroll_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  period_id INT NOT NULL,
  report_name VARCHAR(150) NOT NULL,
  report_file_url VARCHAR(255) NOT NULL,
  generated_by INT NOT NULL,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (period_id) REFERENCES kpi_periods(id)
);
```

---

## 14. Data Awal Kriteria KPI

AI Agent dapat menggunakan seed data berikut:

```sql
INSERT INTO kpi_criteria
(criteria_code, criteria_name, weight, input_type, min_value, max_value)
VALUES
('C1', 'Jumlah Penjualan', 0.35, 'integer', 0, 20),
('C2', 'Transaksi Rata-Rata', 0.25, 'currency', 200000000, 1000000000),
('C3', 'Presensi', 0.20, 'percentage', 0, 100),
('C4', 'Kepuasan Pelanggan', 0.20, 'percentage', 0, 100);
```

---

## 15. Endpoint API Wajib

AI Agent harus menyediakan minimal 15 endpoint. Rekomendasi endpoint:

### Authentication API

| Method | Endpoint | Fungsi |
|---|---|---|
| POST | /api/auth/login | Login Admin. |
| POST | /api/auth/logout | Logout Admin. |
| GET | /api/auth/session | Cek session aktif. |

---

### Employee API

| Method | Endpoint | Fungsi |
|---|---|---|
| POST | /api/employees | Create karyawan. |
| GET | /api/employees | Read semua karyawan. |
| GET | /api/employees/:id | Read detail karyawan. |
| PUT | /api/employees/:id | Update karyawan. |
| DELETE | /api/employees/:id | Delete karyawan. |
| POST | /api/employees/:id/photo | Upload foto profil karyawan. |

---

### Position API

| Method | Endpoint | Fungsi |
|---|---|---|
| POST | /api/positions | Create jabatan. |
| GET | /api/positions | Read jabatan. |
| PUT | /api/positions/:id | Update jabatan. |
| DELETE | /api/positions/:id | Delete jabatan. |

---

### KPI Period API

| Method | Endpoint | Fungsi |
|---|---|---|
| POST | /api/kpi-periods | Create periode KPI. |
| GET | /api/kpi-periods | Read periode KPI. |
| GET | /api/kpi-periods/:id | Detail periode KPI. |
| PUT | /api/kpi-periods/:id | Update periode KPI. |
| DELETE | /api/kpi-periods/:id | Delete periode KPI. |

---

### KPI Assessment API

| Method | Endpoint | Fungsi |
|---|---|---|
| POST | /api/kpi-assessments | Input KPI. |
| GET | /api/kpi-assessments | Read semua data KPI. |
| GET | /api/kpi-assessments/:id | Detail KPI. |
| PUT | /api/kpi-assessments/:id | Update KPI. |
| DELETE | /api/kpi-assessments/:id | Delete KPI. |
| POST | /api/kpi-assessments/:id/calculate | Hitung skor dan bonus. |

---

### Bonus dan Report API

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | /api/bonus-results | Rekap bonus semua karyawan. |
| GET | /api/bonus-results/:id | Detail hasil bonus. |
| GET | /api/bonus-results/period/:periodId | Rekap bonus per periode. |
| POST | /api/reports/payroll | Generate laporan PDF. |
| GET | /api/reports | List laporan PDF. |
| GET | /api/reports/:id/download | Download laporan PDF. |

---

## 16. Format Response API

AI Agent harus menggunakan format response JSON yang konsisten.

### Success Response

```json
{
  "success": true,
  "message": "Data berhasil diproses",
  "data": {}
}
```

### Error Response

```json
{
  "success": false,
  "message": "Terjadi kesalahan",
  "errors": []
}
```

---

## 17. Contoh Request Input KPI

```json
{
  "employee_id": 1,
  "period_id": 1,
  "sales_unit": 18,
  "avg_transaction": 700000000,
  "attendance_score": 90,
  "customer_satisfaction": 85
}
```

---

## 18. Contoh Response Perhitungan Bonus

```json
{
  "success": true,
  "message": "Perhitungan bonus berhasil",
  "data": {
    "assessment_id": 1,
    "sales_score": 90,
    "transaction_score": 62.88,
    "attendance_score": 90,
    "satisfaction_score": 85,
    "final_score": 82.22,
    "bonus_percentage": 90,
    "bonus_amount": 1800000
  }
}
```

---

## 19. Validasi Input

AI Agent harus menerapkan validasi berikut:

| Field | Validasi |
|---|---|
| email | Wajib, format email valid. |
| password | Wajib, minimal 6 karakter. |
| name | Wajib. |
| phone | Wajib, angka, minimal 10 digit. |
| sales_unit | Wajib, integer, minimal 0. |
| avg_transaction | Wajib, angka, minimal 200000000, maksimal 1000000000. |
| attendance_score | Wajib, angka 0-100. |
| customer_satisfaction | Wajib, angka 0-100. |
| photo | JPG/PNG, maksimal 2 MB. |
| period_id | Wajib dan harus tersedia di database. |
| employee_id | Wajib dan harus tersedia di database master. |

---

## 20. Rancangan Frontend ReactJS

AI Agent dapat membuat halaman frontend berikut:

1. Login Page.
2. Dashboard Page.
3. Employee List Page.
4. Employee Create/Edit Page.
5. Employee Detail Page.
6. KPI Period Page.
7. KPI Assessment Form Page.
8. Bonus Recap Page.
9. Report List Page.
10. PDF Download Action.

---

## 21. Rancangan Komponen Frontend

Komponen ReactJS yang disarankan:

```text
src/
├── components/
│   ├── Navbar.jsx
│   ├── Sidebar.jsx
│   ├── ProtectedRoute.jsx
│   ├── EmployeeForm.jsx
│   ├── KpiForm.jsx
│   └── BonusTable.jsx
├── pages/
│   ├── LoginPage.jsx
│   ├── DashboardPage.jsx
│   ├── EmployeePage.jsx
│   ├── KpiPeriodPage.jsx
│   ├── KpiAssessmentPage.jsx
│   ├── BonusRecapPage.jsx
│   └── ReportPage.jsx
├── services/
│   ├── api.js
│   ├── authService.js
│   ├── employeeService.js
│   ├── kpiService.js
│   └── reportService.js
└── App.jsx
```

---

## 22. Rancangan Backend NodeJS

Struktur backend yang disarankan:

```text
backend/
├── src/
│   ├── config/
│   │   ├── databaseMaster.js
│   │   ├── databaseKpi.js
│   │   └── cloudStorage.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── employeeController.js
│   │   ├── positionController.js
│   │   ├── kpiPeriodController.js
│   │   ├── kpiAssessmentController.js
│   │   ├── bonusController.js
│   │   └── reportController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── employeeRoutes.js
│   │   ├── positionRoutes.js
│   │   ├── kpiPeriodRoutes.js
│   │   ├── kpiAssessmentRoutes.js
│   │   ├── bonusRoutes.js
│   │   └── reportRoutes.js
│   ├── middlewares/
│   │   ├── authMiddleware.js
│   │   ├── uploadMiddleware.js
│   │   └── errorHandler.js
│   ├── services/
│   │   ├── sawService.js
│   │   ├── bonusService.js
│   │   ├── pdfService.js
│   │   └── storageService.js
│   └── app.js
└── package.json
```

---

## 23. Fungsi Perhitungan SAW

AI Agent dapat menggunakan pseudo-code berikut:

```javascript
function calculateSalesScore(salesUnit) {
  let score = (salesUnit / 20) * 100;
  return Math.min(score, 100);
}

function calculateTransactionScore(avgTransaction) {
  if (avgTransaction < 200000000) return 1;
  if (avgTransaction > 1000000000) return 100;

  return ((avgTransaction - 200000000) / (1000000000 - 200000000)) * 99 + 1;
}

function calculateFinalScore(data) {
  const salesScore = calculateSalesScore(data.sales_unit);
  const transactionScore = calculateTransactionScore(data.avg_transaction);
  const attendanceScore = data.attendance_score;
  const satisfactionScore = data.customer_satisfaction;

  const finalScore =
    salesScore * 0.35 +
    transactionScore * 0.25 +
    attendanceScore * 0.20 +
    satisfactionScore * 0.20;

  return {
    salesScore,
    transactionScore,
    attendanceScore,
    satisfactionScore,
    finalScore
  };
}
```

---

## 24. Fungsi Perhitungan Bonus

AI Agent dapat menggunakan pseudo-code berikut:

```javascript
function calculateBonus(finalScore) {
  const maxBonus = 2000000;
  let percentage = 0;

  if (finalScore >= 90) percentage = 1.0;
  else if (finalScore >= 80) percentage = 0.9;
  else if (finalScore >= 70) percentage = 0.8;
  else if (finalScore >= 60) percentage = 0.7;
  else if (finalScore >= 50) percentage = 0.6;
  else if (finalScore >= 40) percentage = 0.5;
  else percentage = 0;

  return {
    bonus_percentage: percentage * 100,
    bonus_amount: maxBonus * percentage
  };
}
```

---

## 25. Cloud Storage Instruction

AI Agent harus menghubungkan sistem ke Cloud Storage untuk:

1. Upload foto profil karyawan.
2. Menyimpan URL foto ke tabel `employees.photo_url`.
3. Menyimpan metadata file ke tabel `employee_files`.
4. Generate PDF laporan bonus.
5. Upload PDF ke Cloud Storage.
6. Menyimpan URL PDF ke tabel `payroll_reports.report_file_url`.

---

## 26. Deployment Instruction

AI Agent dapat menggunakan rancangan deployment berikut:

| Komponen | Deployment |
|---|---|
| Frontend ReactJS | Cloud Run atau App Engine |
| Auth & Employee Service | Cloud Run atau App Engine |
| KPI & Payroll Service | Cloud Run atau App Engine |
| Database MySQL | Cloud SQL atau GCE MySQL |
| File Storage | Google Cloud Storage |

---

## 27. Service Architecture

Sistem dibagi menjadi 3 service:

| Service | Nama | Fungsi |
|---|---|---|
| Service 1 | frontend-service | Tampilan ReactJS untuk Admin. |
| Service 2 | auth-employee-service | Login, session, data karyawan, upload foto. |
| Service 3 | kpi-payroll-service | Periode KPI, input KPI, hitung bonus, rekap, laporan PDF. |

---

## 28. Hal yang Tidak Boleh Dilakukan AI Agent

AI Agent tidak boleh:

1. Menambahkan role selain Admin kecuali diminta.
2. Mengubah metode perhitungan dari SAW ke metode lain.
3. Menghapus ketentuan 2 database.
4. Mengurangi jumlah tabel menjadi kurang dari 5 per database.
5. Mengurangi endpoint menjadi kurang dari 15.
6. Menghilangkan fitur authentication.
7. Menghilangkan session management.
8. Menghilangkan koneksi Cloud Storage.
9. Mengubah total bonus maksimal selain Rp2.000.000 tanpa instruksi baru.
10. Membuat sistem terlalu kompleks di luar kebutuhan tugas kuliah.

---

## 29. Output yang Diharapkan dari AI Agent

Ketika diminta membantu, AI Agent harus dapat menghasilkan salah satu atau beberapa output berikut:

1. Dokumen requirement.
2. ERD atau rancangan relasi database.
3. SQL DDL untuk membuat database dan tabel.
4. Seed data awal.
5. Backend NodeJS ExpressJS.
6. Endpoint REST API.
7. Middleware authentication.
8. Service perhitungan SAW.
9. Service perhitungan bonus.
10. Frontend ReactJS.
11. Form input KPI.
12. Tabel rekap bonus.
13. Fungsi generate PDF.
14. Dokumentasi API.
15. Instruksi deployment.

---

## 30. Ringkasan Instruksi Utama

AI Agent harus membangun atau membantu merancang WebAPP ERP sederhana untuk penilaian KPI salesman mobil. Sistem menggunakan ReactJS, NodeJS, REST API, MySQL, 2 database, minimal 5 tabel per database, minimal 15 endpoint, authentication, session management, Cloud Storage, serta perhitungan bonus menggunakan metode SAW berdasarkan 4 kriteria: jumlah penjualan, transaksi rata-rata, presensi, dan kepuasan pelanggan.

