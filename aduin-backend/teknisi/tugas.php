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
    $idTeknisi = (int)($_GET['id_teknisi'] ?? 0);

    $sql    = sql_pengaduan_select() . " WHERE p.status IN ('Diproses', 'Selesai') AND pt.id_penanganan IS NOT NULL";
    $params = [];
    if ($idTeknisi > 0) {
        $sql .= " AND pt.id_teknisi = :t";
        $params[':t'] = $idTeknisi;
    }
    $sql .= " ORDER BY COALESCE(pt.waktu_selesai, p.tanggal_lapor) DESC, p.id_pengaduan DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $data = array_map('format_pengaduan', $stmt->fetchAll());

    json_response($data, 'Data tugas teknisi berhasil dimuat.');

} catch (PDOException $e) {
    server_error($e, 'Gagal memuat daftar tugas teknisi.');
}

?>