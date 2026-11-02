#!/usr/bin/env bash
# ADUIN - menjalankan backend (port 8000) dan frontend (port 5500). Hentikan dengan Ctrl+C.
cd "$(dirname "$0")"
command -v php >/dev/null || { echo "PHP tidak ditemukan. Install php-cli dan php-pgsql."; exit 1; }
php -d upload_max_filesize=12M -d post_max_size=60M -S localhost:8000 -t aduin-backend &
BE=$!
php -S localhost:5500 -t frontend-aduin &
FE=$!
trap 'kill $BE $FE 2>/dev/null' EXIT INT TERM
echo
echo "Backend : http://localhost:8000   (tes: http://localhost:8000/test_koneksi.php)"
echo "Frontend: http://localhost:5500/login.html"
wait
