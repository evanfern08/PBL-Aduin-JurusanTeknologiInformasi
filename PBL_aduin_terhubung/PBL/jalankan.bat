@echo off
REM ============================================================
REM  ADUIN - menjalankan backend (port 8000) dan frontend (port 5500)
REM  Syarat: PHP 8+ ada di PATH dan ekstensi pdo_pgsql aktif,
REM          database aduin_db sudah di-import (lihat README.md).
REM ============================================================
cd /d "%~dp0"
where php >nul 2>nul || (echo [ERROR] PHP tidak ditemukan di PATH. Install PHP / gunakan XAMPP, lihat README.md & pause & exit /b 1)

start "ADUIN Backend :8000" cmd /k php -d upload_max_filesize=12M -d post_max_size=60M -S localhost:8000 -t aduin-backend
start "ADUIN Frontend :5500" cmd /k php -S localhost:5500 -t frontend-aduin

timeout /t 2 >nul
start "" http://localhost:5500/login.html
echo.
echo Backend : http://localhost:8000   (tes: http://localhost:8000/test_koneksi.php)
echo Frontend: http://localhost:5500/login.html
echo Tutup kedua jendela server untuk menghentikan aplikasi.
