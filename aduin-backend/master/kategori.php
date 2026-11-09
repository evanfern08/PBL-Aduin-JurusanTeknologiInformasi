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

try {
    $stmt = $pdo->query("SELECT id_fasilitas, nama_kategori, deskripsi FROM kategori_fasilitas ORDER BY id_fasilitas ASC");
    $data = $stmt->fetchAll();

    json_response($data, 'Data kategori fasilitas berhasil diambil.');

} catch (PDOException $e) {
    server_error($e, 'Gagal mengambil data kategori fasilitas.');
}
