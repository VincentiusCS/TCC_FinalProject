# Dokumen Requirements

## Pendahuluan

Sistem ini adalah modul WebAPP ERP sederhana untuk penilaian KPI (Key Performance Indicator) salesman mobil dan perhitungan bonus gaji. Sistem digunakan oleh satu aktor yaitu Admin untuk mengelola data karyawan/salesman, menginput capaian KPI, menghitung skor KPI menggunakan metode SAW (Simple Additive Weighting), menentukan bonus gaji, melihat rekap bonus, serta mengunduh laporan PDF. Sistem terdiri dari 3 microservice (frontend-service, auth-employee-service, kpi-payroll-service) yang di-deploy di Google Cloud dengan 2 database MySQL.

## Glossary

- **Sistem**: Keseluruhan WebAPP ERP KPI Bonus Salesman Mobil yang mencakup frontend, backend, dan database.
- **Admin**: Satu-satunya pengguna sistem yang memiliki hak akses penuh untuk login, mengelola data karyawan, menginput KPI, dan mengunduh laporan.
- **Auth_Service**: Microservice backend (auth-employee-service) yang menangani autentikasi, session management, data karyawan, dan upload foto.
- **KPI_Service**: Microservice backend (kpi-payroll-service) yang menangani periode KPI, input penilaian KPI, perhitungan bonus, rekap, dan laporan PDF.
- **Frontend_Service**: Microservice frontend (frontend-service) berbasis ReactJS yang menyediakan antarmuka pengguna untuk Admin.
- **SAW**: Simple Additive Weighting, metode perhitungan skor KPI dengan pembobotan kriteria.
- **Final_Score**: Nilai akhir KPI (0-100) hasil perhitungan SAW dari 4 kriteria.
- **Cloud_Storage**: Google Cloud Storage yang digunakan untuk menyimpan foto profil karyawan dan file laporan PDF.
- **Master_DB**: Database MySQL pertama (erp_master_db) yang menyimpan data master meliputi users, sessions, employees, positions, dan employee_files.
- **KPI_DB**: Database MySQL kedua (erp_kpi_payroll_db) yang menyimpan data KPI meliputi kpi_periods, kpi_criteria, kpi_assessments, bonus_results, dan payroll_reports.
- **Periode_KPI**: Periode waktu penilaian KPI berdasarkan bulan dan tahun.
- **Bonus**: Tambahan gaji yang diberikan kepada salesman berdasarkan pencapaian KPI, maksimal Rp2.000.000.

## Requirements

### Requirement 1: Autentikasi dan Session Management

**User Story:** Sebagai Admin, saya ingin login ke sistem dengan email dan password, sehingga hanya pengguna terotorisasi yang dapat mengakses fitur sistem.

#### Acceptance Criteria

1. WHEN Admin mengirim request login dengan email dan password valid, THE Auth_Service SHALL memvalidasi kredensial terhadap tabel users di Master_DB dan mengembalikan token session.
2. WHEN Admin mengirim request login dengan email atau password tidak valid, THE Auth_Service SHALL mengembalikan response error dengan pesan "Email atau password salah".
3. WHILE session token aktif dan belum expired, THE Auth_Service SHALL mengizinkan akses ke endpoint yang dilindungi.
4. WHEN Admin mengirim request logout, THE Auth_Service SHALL menghapus session dari tabel sessions dan mengembalikan response sukses.
5. WHEN request diterima tanpa token session atau dengan token expired, THE Auth_Service SHALL mengembalikan response error 401 Unauthorized.
6. THE Auth_Service SHALL memvalidasi bahwa field email memiliki format email valid dan field password memiliki minimal 6 karakter pada saat login.

### Requirement 2: Manajemen Data Karyawan

**User Story:** Sebagai Admin, saya ingin mengelola data karyawan/salesman (tambah, lihat, ubah, hapus), sehingga data karyawan selalu terbarui dan akurat.

#### Acceptance Criteria

1. WHEN Admin mengirim request create karyawan dengan data lengkap dan valid, THE Auth_Service SHALL menyimpan data karyawan ke tabel employees di Master_DB dan mengembalikan data karyawan yang baru dibuat.
2. WHEN Admin mengirim request create karyawan dengan data tidak lengkap atau tidak valid, THE Auth_Service SHALL mengembalikan response error dengan detail validasi yang gagal.
3. WHEN Admin mengirim request read semua karyawan, THE Auth_Service SHALL mengembalikan daftar seluruh karyawan dari tabel employees.
4. WHEN Admin mengirim request read detail karyawan berdasarkan ID, THE Auth_Service SHALL mengembalikan data lengkap karyawan tersebut.
5. WHEN Admin mengirim request update karyawan dengan ID valid dan data valid, THE Auth_Service SHALL memperbarui data karyawan di tabel employees dan mengembalikan data yang telah diperbarui.
6. WHEN Admin mengirim request delete karyawan berdasarkan ID valid, THE Auth_Service SHALL menghapus data karyawan dari tabel employees.
7. THE Auth_Service SHALL memvalidasi bahwa field name wajib diisi, field email memiliki format valid, dan field phone berisi angka minimal 10 digit.
8. THE Auth_Service SHALL memvalidasi bahwa employee_code bersifat unik untuk setiap karyawan.

### Requirement 3: Upload Foto Profil Karyawan

**User Story:** Sebagai Admin, saya ingin mengupload foto profil karyawan, sehingga setiap karyawan memiliki identitas visual dalam sistem.

#### Acceptance Criteria

1. WHEN Admin mengirim request upload foto untuk karyawan dengan ID valid dan file berformat JPG atau PNG dengan ukuran maksimal 2 MB, THE Auth_Service SHALL mengupload file ke Cloud_Storage, menyimpan URL ke field photo_url di tabel employees, menyimpan metadata file ke tabel employee_files, dan mengembalikan URL foto.
2. WHEN Admin mengirim request upload foto dengan format file selain JPG atau PNG, THE Auth_Service SHALL mengembalikan response error "Format file tidak valid, hanya JPG dan PNG yang diperbolehkan".
3. WHEN Admin mengirim request upload foto dengan ukuran file lebih dari 2 MB, THE Auth_Service SHALL mengembalikan response error "Ukuran file melebihi batas maksimal 2 MB".
4. IF upload ke Cloud_Storage gagal, THEN THE Auth_Service SHALL mengembalikan response error dan tidak menyimpan data file ke database.

### Requirement 4: Manajemen Data Jabatan

**User Story:** Sebagai Admin, saya ingin mengelola data jabatan (tambah, lihat, ubah, hapus), sehingga karyawan dapat dikategorikan berdasarkan posisi mereka.

#### Acceptance Criteria

1. WHEN Admin mengirim request create jabatan dengan data valid, THE Auth_Service SHALL menyimpan data jabatan ke tabel positions di Master_DB dan mengembalikan data jabatan yang baru dibuat.
2. WHEN Admin mengirim request read jabatan, THE Auth_Service SHALL mengembalikan daftar seluruh jabatan dari tabel positions.
3. WHEN Admin mengirim request update jabatan dengan ID valid, THE Auth_Service SHALL memperbarui data jabatan di tabel positions.
4. WHEN Admin mengirim request delete jabatan dengan ID valid, THE Auth_Service SHALL menghapus data jabatan dari tabel positions.
5. THE Auth_Service SHALL memvalidasi bahwa field position_name wajib diisi saat create dan update jabatan.

### Requirement 5: Manajemen Periode KPI

**User Story:** Sebagai Admin, saya ingin mengelola periode KPI (tambah, lihat, ubah, hapus), sehingga penilaian KPI dapat diorganisir berdasarkan periode waktu tertentu.

#### Acceptance Criteria

1. WHEN Admin mengirim request create periode KPI dengan data bulan, tahun, dan nama periode, THE KPI_Service SHALL menyimpan data ke tabel kpi_periods di KPI_DB dan mengembalikan data periode yang baru dibuat.
2. WHEN Admin mengirim request read semua periode KPI, THE KPI_Service SHALL mengembalikan daftar seluruh periode KPI.
3. WHEN Admin mengirim request read detail periode KPI berdasarkan ID, THE KPI_Service SHALL mengembalikan data lengkap periode tersebut.
4. WHEN Admin mengirim request update periode KPI dengan ID valid, THE KPI_Service SHALL memperbarui data periode di tabel kpi_periods.
5. WHEN Admin mengirim request delete periode KPI dengan ID valid, THE KPI_Service SHALL menghapus data periode dari tabel kpi_periods.
6. THE KPI_Service SHALL memvalidasi bahwa field month bernilai 1-12, field year bernilai positif, dan field period_name wajib diisi.

### Requirement 6: Input Penilaian KPI

**User Story:** Sebagai Admin, saya ingin menginput capaian 4 indikator KPI untuk setiap salesman per periode, sehingga data penilaian tersimpan untuk dihitung bonusnya.

#### Acceptance Criteria

1. WHEN Admin mengirim request input penilaian KPI dengan employee_id, period_id, sales_unit, avg_transaction, attendance_score, dan customer_satisfaction yang valid, THE KPI_Service SHALL menyimpan data ke tabel kpi_assessments di KPI_DB.
2. THE KPI_Service SHALL memvalidasi bahwa sales_unit berupa integer dengan nilai minimal 0.
3. THE KPI_Service SHALL memvalidasi bahwa avg_transaction berupa angka dengan nilai minimal 200000000 dan maksimal 1000000000.
4. THE KPI_Service SHALL memvalidasi bahwa attendance_score berupa angka dengan rentang 0 sampai 100.
5. THE KPI_Service SHALL memvalidasi bahwa customer_satisfaction berupa angka dengan rentang 0 sampai 100.
6. THE KPI_Service SHALL memvalidasi bahwa employee_id merujuk ke karyawan yang ada di Master_DB.
7. THE KPI_Service SHALL memvalidasi bahwa period_id merujuk ke periode KPI yang ada di tabel kpi_periods.
8. WHEN Admin mengirim request read semua penilaian KPI, THE KPI_Service SHALL mengembalikan daftar seluruh penilaian.
9. WHEN Admin mengirim request update penilaian KPI dengan ID valid, THE KPI_Service SHALL memperbarui data penilaian di tabel kpi_assessments.
10. WHEN Admin mengirim request delete penilaian KPI dengan ID valid, THE KPI_Service SHALL menghapus data penilaian dari tabel kpi_assessments.

### Requirement 7: Perhitungan Skor KPI dengan Metode SAW

**User Story:** Sebagai Admin, saya ingin sistem menghitung skor KPI secara otomatis menggunakan metode SAW, sehingga penilaian kinerja salesman bersifat objektif dan terstandar.

#### Acceptance Criteria

1. WHEN Admin memicu perhitungan untuk penilaian KPI tertentu, THE KPI_Service SHALL menghitung sales_score menggunakan rumus (sales_unit / 20) * 100 dengan nilai maksimal 100.
2. WHEN Admin memicu perhitungan untuk penilaian KPI tertentu, THE KPI_Service SHALL menghitung transaction_score menggunakan rumus ((avg_transaction - 200000000) / (1000000000 - 200000000)) * 99 + 1, dengan nilai minimal 1 jika avg_transaction kurang dari 200000000 dan nilai maksimal 100 jika avg_transaction lebih dari 1000000000.
3. WHEN Admin memicu perhitungan untuk penilaian KPI tertentu, THE KPI_Service SHALL menghitung final_score menggunakan rumus: (sales_score * 0.35) + (transaction_score * 0.25) + (attendance_score * 0.20) + (satisfaction_score * 0.20).
4. WHEN perhitungan selesai, THE KPI_Service SHALL menyimpan seluruh skor (sales_score, transaction_score, attendance_score, satisfaction_score, final_score) ke tabel bonus_results di KPI_DB.
5. THE KPI_Service SHALL menghasilkan final_score dalam rentang 0 sampai 100.

### Requirement 8: Perhitungan Bonus Gaji

**User Story:** Sebagai Admin, saya ingin sistem menentukan persentase dan nominal bonus berdasarkan final_score, sehingga bonus yang diberikan sesuai dengan kinerja salesman.

#### Acceptance Criteria

1. WHEN final_score lebih besar atau sama dengan 90, THE KPI_Service SHALL menetapkan bonus_percentage sebesar 100 persen dan bonus_amount sebesar Rp2.000.000.
2. WHEN final_score lebih besar atau sama dengan 80 dan kurang dari 90, THE KPI_Service SHALL menetapkan bonus_percentage sebesar 90 persen dan bonus_amount sebesar Rp1.800.000.
3. WHEN final_score lebih besar atau sama dengan 70 dan kurang dari 80, THE KPI_Service SHALL menetapkan bonus_percentage sebesar 80 persen dan bonus_amount sebesar Rp1.600.000.
4. WHEN final_score lebih besar atau sama dengan 60 dan kurang dari 70, THE KPI_Service SHALL menetapkan bonus_percentage sebesar 70 persen dan bonus_amount sebesar Rp1.400.000.
5. WHEN final_score lebih besar atau sama dengan 50 dan kurang dari 60, THE KPI_Service SHALL menetapkan bonus_percentage sebesar 60 persen dan bonus_amount sebesar Rp1.200.000.
6. WHEN final_score lebih besar atau sama dengan 40 dan kurang dari 50, THE KPI_Service SHALL menetapkan bonus_percentage sebesar 50 persen dan bonus_amount sebesar Rp1.000.000.
7. WHEN final_score kurang dari 40, THE KPI_Service SHALL menetapkan bonus_percentage sebesar 0 persen dan bonus_amount sebesar Rp0.
8. WHEN perhitungan bonus selesai, THE KPI_Service SHALL menyimpan bonus_percentage dan bonus_amount ke tabel bonus_results di KPI_DB.

### Requirement 9: Rekap Bonus Karyawan

**User Story:** Sebagai Admin, saya ingin melihat rekapitulasi bonus seluruh karyawan dan memfilter berdasarkan periode, sehingga saya dapat memantau distribusi bonus secara keseluruhan.

#### Acceptance Criteria

1. WHEN Admin mengirim request rekap bonus, THE KPI_Service SHALL mengembalikan daftar hasil bonus seluruh karyawan dari tabel bonus_results.
2. WHEN Admin mengirim request rekap bonus dengan parameter period_id, THE KPI_Service SHALL mengembalikan daftar hasil bonus yang difilter berdasarkan periode tersebut.
3. WHEN Admin mengirim request detail bonus berdasarkan ID, THE KPI_Service SHALL mengembalikan data lengkap hasil perhitungan bonus termasuk seluruh skor per kriteria.
4. THE KPI_Service SHALL menyertakan informasi nama karyawan dan nama periode dalam data rekap bonus.

### Requirement 10: Laporan PDF Rekap Bonus

**User Story:** Sebagai Admin, saya ingin men-generate dan mengunduh laporan PDF rekap bonus, sehingga saya memiliki dokumen cetak untuk keperluan administrasi.

#### Acceptance Criteria

1. WHEN Admin mengirim request generate laporan PDF untuk periode tertentu, THE KPI_Service SHALL membuat file PDF berisi rekap bonus seluruh karyawan pada periode tersebut.
2. WHEN file PDF berhasil dibuat, THE KPI_Service SHALL mengupload file PDF ke Cloud_Storage dan menyimpan URL file ke tabel payroll_reports di KPI_DB.
3. WHEN Admin mengirim request daftar laporan, THE KPI_Service SHALL mengembalikan daftar seluruh laporan PDF yang pernah di-generate.
4. WHEN Admin mengirim request download laporan berdasarkan ID, THE KPI_Service SHALL mengembalikan file PDF dari Cloud_Storage.
5. IF proses generate PDF gagal, THEN THE KPI_Service SHALL mengembalikan response error dan tidak menyimpan data ke tabel payroll_reports.

### Requirement 11: Dashboard Admin

**User Story:** Sebagai Admin, saya ingin melihat dashboard ringkasan, sehingga saya dapat memantau kondisi umum sistem secara cepat.

#### Acceptance Criteria

1. WHEN Admin mengakses halaman dashboard, THE Frontend_Service SHALL menampilkan ringkasan data yang relevan dari sistem.
2. THE Frontend_Service SHALL menampilkan informasi jumlah karyawan aktif dari Master_DB.
3. THE Frontend_Service SHALL menampilkan informasi periode KPI aktif yang sedang berjalan.

### Requirement 12: Antarmuka Frontend ReactJS

**User Story:** Sebagai Admin, saya ingin menggunakan antarmuka web yang responsif dan mudah digunakan, sehingga saya dapat mengelola seluruh fitur sistem dengan nyaman.

#### Acceptance Criteria

1. THE Frontend_Service SHALL menyediakan halaman login dengan form email dan password.
2. THE Frontend_Service SHALL menyediakan navigasi (navbar dan sidebar) untuk mengakses seluruh fitur sistem.
3. THE Frontend_Service SHALL menyediakan halaman daftar karyawan, form tambah/edit karyawan, dan halaman detail karyawan.
4. THE Frontend_Service SHALL menyediakan halaman manajemen periode KPI.
5. THE Frontend_Service SHALL menyediakan halaman form input penilaian KPI dengan field untuk 4 kriteria.
6. THE Frontend_Service SHALL menyediakan halaman rekap bonus dengan fitur filter berdasarkan periode.
7. THE Frontend_Service SHALL menyediakan halaman daftar laporan dengan aksi download PDF.
8. WHILE Admin belum login, THE Frontend_Service SHALL mengarahkan seluruh akses halaman ke halaman login (protected route).
9. THE Frontend_Service SHALL menampilkan pesan error yang informatif ketika terjadi kegagalan pada request API.

### Requirement 13: Format Response API

**User Story:** Sebagai Admin, saya ingin mendapatkan response API yang konsisten, sehingga frontend dapat menangani data secara seragam.

#### Acceptance Criteria

1. WHEN request berhasil diproses, THE Sistem SHALL mengembalikan response JSON dengan format: success bernilai true, message berisi deskripsi, dan data berisi objek hasil.
2. WHEN request gagal diproses, THE Sistem SHALL mengembalikan response JSON dengan format: success bernilai false, message berisi deskripsi error, dan errors berisi array detail kesalahan.
3. THE Auth_Service SHALL menggunakan format response yang sama dengan KPI_Service untuk menjaga konsistensi antar microservice.

### Requirement 14: Arsitektur Database

**User Story:** Sebagai Admin, saya ingin data tersimpan secara terstruktur di 2 database terpisah, sehingga data master dan data transaksi KPI terisolasi dengan baik.

#### Acceptance Criteria

1. THE Sistem SHALL menggunakan Master_DB (erp_master_db) dengan minimal 5 tabel: users, sessions, employees, positions, dan employee_files.
2. THE Sistem SHALL menggunakan KPI_DB (erp_kpi_payroll_db) dengan minimal 5 tabel: kpi_periods, kpi_criteria, kpi_assessments, bonus_results, dan payroll_reports.
3. THE Sistem SHALL menggunakan MySQL sebagai database engine untuk kedua database.
4. THE KPI_Service SHALL menyimpan seed data 4 kriteria KPI (C1-C4) ke tabel kpi_criteria dengan bobot masing-masing: 0.35, 0.25, 0.20, dan 0.20.

### Requirement 15: Deployment dan Infrastruktur Cloud

**User Story:** Sebagai Admin, saya ingin sistem ter-deploy di Google Cloud, sehingga sistem dapat diakses secara online.

#### Acceptance Criteria

1. THE Sistem SHALL di-deploy menggunakan Google Cloud Run atau Google App Engine untuk ketiga microservice (frontend-service, auth-employee-service, kpi-payroll-service).
2. THE Sistem SHALL menggunakan Google Cloud SQL atau GCE dengan MySQL untuk hosting kedua database.
3. THE Sistem SHALL menggunakan Google Cloud Storage untuk menyimpan foto profil karyawan dan file laporan PDF.
4. THE Sistem SHALL menyediakan minimal 15 endpoint REST API yang terdistribusi di auth-employee-service dan kpi-payroll-service.
