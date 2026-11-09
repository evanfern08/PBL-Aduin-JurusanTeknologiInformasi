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
    $sql = "SELECT u.id_user, u.nama, u.email, u.foto_user, m.nim, m.prodi
            FROM users u
            JOIN mahasiswa m ON u.id_user = m.id_user
            WHERE u.role = 'mahasiswa'
            ORDER BY u.id_user ASC";

    $stmt = $pdo->query($sql);
    $data = $stmt->fetchAll();

    json_response($data, 'Data mahasiswa berhasil diambil.');

} catch (PDOException $e) {
    server_error($e, 'Gagal mengambil data mahasiswa.');
}
