/**
 * config.js - Pengaturan koneksi frontend ke backend ADUIN.
 *
 * Secara default alamat backend = alamat halaman ini, port 8000
 * (jalankan:  php -S localhost:8000 -t aduin-backend).
 *
 * Jika backend ada di alamat lain (mis. XAMPP: http://localhost/aduin-backend),
 * ganti nilai API_BASE di bawah, TANPA garis miring di akhir.
 */
window.ADUIN_CONFIG = {
  API_BASE: (function () {
    var host = window.location.hostname || 'localhost';
    return 'http://' + host + ':8000';
  })(),
};
