<?php
// ==================================================================
// MODUL: VERIFIKATOR - DETAIL PENGADUAN
// Deskripsi: Detail pengaduan + hasil kerja teknisi + riwayat perubahan status
// Parameter: ?id=1
// ==================================================================

require_once __DIR__ . '/../koneksi.php';
require_once __DIR__ . '/../fungsi.php';

cors();
require_method('GET');

$idPengaduan = (int)($_GET['id'] ?? $_GET['id_pengaduan'] ?? 0);
if ($idPengaduan <= 0) {
    json_response(null, 'Parameter ID pengaduan tidak valid.', 400);
}

try {
    $data = ambil_pengaduan($pdo, $idPengaduan);
    if (!$data) {
        json_response(null, 'Pengaduan tidak ditemukan.', 404);
    }
    $data['riwayat'] = ambil_riwayat($pdo, $idPengaduan);

    json_response($data, 'Detail pengaduan berhasil dimuat.');

} catch (PDOException $e) {
    server_error($e, 'Gagal memuat detail pengaduan.');
}
