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

require_once __DIR__ . '/koneksi.php';
require_once __DIR__ . '/fungsi.php';

cors();

try {
    $stmt = $pdo->query("SELECT version()");
    $version = $stmt->fetchColumn();

    json_response([
        'database'  => 'PostgreSQL 18',
        'connected' => true,
        'version'   => $version
    ], 'Berhasil terhubung ke database PostgreSQL 18!');
} catch (Exception $e) {
    json_response(null, 'Gagal terhubung ke database: ' . $e->getMessage(), 500);
}
