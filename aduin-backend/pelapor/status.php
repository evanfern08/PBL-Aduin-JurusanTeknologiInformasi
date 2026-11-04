<?php
// ==================================================================
// MODUL: PELAPOR - ALUR STATUS PENGADUAN
// Deskripsi: Riwayat perubahan status (verifikasi dan penanganan)
// Parameter: ?id_pengaduan=1
// ==================================================================

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
