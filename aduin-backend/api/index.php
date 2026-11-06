<?php
/**
 * Pintu masuk tunggal untuk Vercel (vercel-php).
 * Semua permintaan /api/auth/login.php, /master/ruangan.php, dst. diarahkan ke sini,
 * lalu file endpoint yang sesuai dimuat. Hanya folder/file di daftar putih yang boleh dimuat.
 */
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$path = ltrim(preg_replace('#^/api/#', '/', $path), '/');

$diizinkan = preg_match('#^(auth|master|pelapor|teknisi|verifikator)/[a-z_]+\.php$#', $path)
          || $path === 'test_koneksi.php';
$file = __DIR__ . '/../' . $path;

if (!$diizinkan || !is_file($file)) {
    header('Access-Control-Allow-Origin: *');
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Endpoint tidak ditemukan.', 'data' => null]);
    exit;
}

require $file;