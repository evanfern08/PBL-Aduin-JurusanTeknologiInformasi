# ADUIN — Sistem Pengaduan Fasilitas JTI (Backend PHP + Frontend + PostgreSQL)

Frontend (HTML/JS) kini terhubung penuh ke backend PHP dan database PostgreSQL.
Semua data (akun, laporan, foto, penugasan teknisi, riwayat status) disimpan di database,
bukan lagi di `localStorage`/file JSON.

```
PBL/
├── aduin-backend/        API PHP (PDO PostgreSQL)
│   ├── config.php        <- pengaturan koneksi database
│   ├── database/         aduin.sql (lengkap), migrasi.sql, schema.sql
│   ├── auth/ master/ pelapor/ teknisi/ verifikator/   endpoint API
│   └── uploads/          foto bukti, foto hasil, foto profil (dibuat otomatis)
├── frontend-aduin/       halaman web (login, pelapor, teknisi, verifikator)
│   └── assets/js/config.js   <- alamat backend (API_BASE)
├── jalankan.bat          menjalankan semua di Windows
└── jalankan.sh           menjalankan semua di Linux/macOS
```

## 1. Persiapan (sekali saja)

1. **PHP 8+** dengan ekstensi **pdo_pgsql** aktif. Di `php.ini` hilangkan tanda `;` pada
   `extension=pdo_pgsql` dan `extension=pgsql` (XAMPP: `C:\xampp\php\php.ini`). Cek dengan `php -m`.
2. **PostgreSQL** berjalan. Buat database dan import data:
   ```
   createdb -U postgres aduin_db
   psql -U postgres -d aduin_db -f aduin-backend/database/aduin.sql
   ```
   (atau pgAdmin: klik kanan `aduin_db` → Query Tool → buka `aduin.sql` → Execute).
3. Cocokkan `aduin-backend/config.php` dengan PostgreSQL kamu (host, port, user, **password**).
   Bisa juga lewat environment variable: `ADUIN_DB_HOST`, `ADUIN_DB_PORT`, `ADUIN_DB_NAME`,
   `ADUIN_DB_USER`, `ADUIN_DB_PASS`.

> Sudah punya database dari dump lama (`aduin_plain.sql`)? Tidak perlu import ulang:
> jalankan saja `psql -U postgres -d aduin_db -f aduin-backend/database/migrasi.sql`
> (aman diulang). Isinya perbaikan bug sequence `users` + kolom baru yang dibutuhkan aplikasi.

## 2. Menjalankan

- **Windows**: klik dua kali `jalankan.bat`.  **Linux/macOS**: `./jalankan.sh`
- Backend: <http://localhost:8000> — tes koneksi DB: <http://localhost:8000/test_koneksi.php>
- Aplikasi: <http://localhost:5500/login.html>

Pakai XAMPP/Laragon? Taruh folder `aduin-backend` di `htdocs`, lalu ubah `API_BASE` di
`frontend-aduin/assets/js/config.js` menjadi `http://localhost/aduin-backend`.

## 3. Akun contoh (password semua: `password123`)

| Peran | Login (email atau NIM/NIP) | Halaman |
|---|---|---|
| Mahasiswa | `rachmah@polinema.ac.id` / `alfatitah@…` / `evan@…` | Pelapor |
| Sekjur (Verifikator) | `septya@polinema.ac.id` | Verifikator |
| Teknisi | `bakhtiar@polinema.ac.id` | Teknisi |

Mahasiswa/dosen baru bisa mendaftar sendiri di halaman Register. Akun teknisi dibuat oleh
verifikator di menu **Kelola Teknisi**; akun Sekjur dibuat langsung di database.
Password lama (teks biasa) otomatis di-hash bcrypt saat login pertama berhasil.

## 4. Alur & pemetaan status

```
Pelapor kirim laporan ──► Menunggu Verifikasi
   Verifikator: Setujui + pilih teknisi ─► Dalam Perbaikan  (DB: Diproses, tugas Tugas Baru)
   Verifikator: Teruskan ke UPA PP Pusat ─► Diteruskan ke Pusat ─► (tandai selesai) Selesai
   Verifikator: Tolak (+alasan) ─► Ditolak ─► (Batal Penolakan) kembali Menunggu Verifikasi
Teknisi: Tugas Baru ─► Sedang Dikerjakan ─► Selesai (upload foto + catatan)
   ─► Menunggu Review Hasil (DB: Diproses, waktu_selesai terisi)
   Verifikator: Terima Hasil ─► Selesai    |    Tolak Hasil (+alasan) ─► kembali ke teknisi (Revisi ke-N)
```
Pelapor melihat 4 status sederhana: Menunggu Verifikasi, Diproses, Selesai, Dikembalikan ke Pelapor.
Status lanjutan (Dalam Perbaikan, Menunggu Review Hasil) diturunkan dari tabel `penanganan_tugas`,
sehingga constraint status pada tabel `pengaduan` tidak diubah.

## 5. Daftar endpoint

| Method | Endpoint | Fungsi |
|---|---|---|
| POST | `auth/login.php` | login (`id` = email/NIM/NIP, `password`) |
| POST | `auth/register.php` | daftar mahasiswa/dosen |
| GET/POST | `auth/profil.php` | lihat / ubah profil |
| POST | `auth/ubah_password.php`, `auth/foto_profil.php` | ganti password, foto profil |
| GET | `master/ruangan.php`, `kategori.php`, `teknisi.php` | data master |
| POST | `pelapor/buat_pengaduan.php` | buat laporan (maks 5 foto) |
| GET | `pelapor/riwayat.php`, `detail.php`, `status.php` | riwayat & detail laporan |
| GET | `teknisi/tugas.php?id_teknisi=` | daftar tugas teknisi |
| POST | `teknisi/update_tugas.php` (`selesai.php`) | update progres + foto |
| GET | `verifikator/dashboard.php`, `detail.php` | semua laporan, detail + riwayat |
| POST | `verifikator/verifikasi.php` | `aksi`: setujui_teknisi, teruskan_pusat, tolak, batal_tolak, terima_hasil, tolak_hasil, selesai_pusat |
| POST/PUT/DELETE | `verifikator/kelola_teknisi.php` | CRUD teknisi |

Server memeriksa peran pengguna pada setiap aksi (mis. hanya `sekjur` yang boleh memverifikasi,
hanya teknisi pemilik tugas yang boleh mengubahnya) dan menolak transisi status yang tidak valid.

## 6. Pemecahan masalah

| Gejala | Solusi |
|---|---|
| "Tidak dapat terhubung ke server" | Backend belum jalan / port beda. Cek `config.js` (`API_BASE`) dan jalankan `jalankan.bat`. |
| "Koneksi database gagal" | Cek `config.php` (password!), PostgreSQL aktif, dan `extension=pdo_pgsql` di `php.ini`. |
| Foto gagal diunggah | Jalankan lewat `jalankan.bat/.sh` (menaikkan batas upload) atau naikkan `upload_max_filesize` & `post_max_size` di `php.ini`. |
| Ingin melihat error SQL | Set environment `ADUIN_DEBUG=1` lalu jalankan ulang backend. |

## 7. Catatan keamanan (untuk pengembangan lanjutan)
API belum memakai token/sesi server (identitas dikirim sebagai `id_user` dari browser), dan CORS terbuka
(`*`) untuk kemudahan pengembangan. Sebelum dipakai publik, tambahkan autentikasi token (JWT/sesi PHP)
dan batasi CORS ke domain frontend.
