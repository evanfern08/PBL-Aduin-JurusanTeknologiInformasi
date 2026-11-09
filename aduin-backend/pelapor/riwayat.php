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

$idPelapor = (int)($_GET['id_pelapor'] ?? $_GET['id'] ?? 0);
if ($idPelapor <= 0) {
    json_response(null, 'Parameter ID pelapor (id_pelapor) tidak valid.', 400);
}

try {
    $stmt = $pdo->prepare(sql_pengaduan_select() . " WHERE p.id_pelapor = :id ORDER BY p.tanggal_lapor DESC, p.id_pengaduan DESC");
    $stmt->execute([':id' => $idPelapor]);
    $data = array_map('format_pengaduan', $stmt->fetchAll());

    json_response($data, 'Data riwayat pengaduan berhasil dimuat.');

} catch (PDOException $e) {
    server_error($e, 'Gagal memuat riwayat pengaduan.');
}
