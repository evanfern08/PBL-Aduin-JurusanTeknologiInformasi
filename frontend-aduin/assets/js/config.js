/**
 * config.js - Pengaturan koneksi frontend ke backend ADUIN.
 *
 * Secara default alamat backend = alamat halaman ini, port 8000
 * (jalankan:  php -S localhost:8000 -t aduin-backend).
 *
 * Jika backend ada di alamat lain (mis. XAMPP: http://localhost/aduin-backend),
 * ganti nilai API_BASE di bawah, TANPA garis miring di akhir.
 */
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Gunakan URL Vercel BE untuk production
export const BASE_URL = isLocal 
    ? 'http://localhost:8000' 
    : 'https://pbl-aduin-jurusanteknologiinformasi-aduin-backend-gi3v9slre.vercel.app';
