<?php
// Izin akses domain cross-origin (CORS)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

// Tangani request 'preflight' OPTIONS dari browser
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}


require_once __DIR__ . '/../koneksi.php';
require_once __DIR__ . '/../fungsi.php';

cors();
require_method('GET');

$idPengaduan = (int)($_GET['id_pengaduan'] ?? $_GET['id'] ?? 0);
if ($idPengaduan <= 0) {
    json_response(null, 'Parameter ID pengaduan (id_pengaduan) tidak valid.', 400);
}

try {
    json_response(ambil_riwayat($pdo, $idPengaduan), 'Riwayat alur status pengaduan berhasil dimuat.');
} catch (PDOException $e) {
    server_error($e, 'Gagal memuat status pengaduan.');
}
