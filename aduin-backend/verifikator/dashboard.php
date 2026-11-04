<?php
// ==================================================================
// MODUL: VERIFIKATOR - DASHBOARD PENGADUAN
// Deskripsi: Seluruh pengaduan beserta ringkasan jumlah per status,
//            dipakai halaman Dashboard, Daftar Laporan, dan Statistik.
// Hasil    : { ringkasan: {...}, laporan: [...] }
// ==================================================================

require_once __DIR__ . '/../koneksi.php';
require_once __DIR__ . '/../fungsi.php';

cors();
require_method('GET');

try {
    $stmt = $pdo->query(sql_pengaduan_select() . " ORDER BY p.tanggal_lapor DESC, p.id_pengaduan DESC");
    $laporan = array_map('format_pengaduan', $stmt->fetchAll());

    $ringkasan = ['total' => count($laporan), 'menunggu_verifikasi' => 0, 'diproses' => 0, 'selesai' => 0, 'ditolak' => 0];
    foreach ($laporan as $l) {
        switch ($l['status']) {
            case 'Menunggu Verifikasi': $ringkasan['menunggu_verifikasi']++; break;
            case 'Diproses':
            case 'Diteruskan ke Pusat': $ringkasan['diproses']++; break;
            case 'Selesai':             $ringkasan['selesai']++; break;
            case 'Ditolak':             $ringkasan['ditolak']++; break;
        }
    }

    json_response(['ringkasan' => $ringkasan, 'laporan' => $laporan], 'Data dashboard verifikator berhasil dimuat.');

} catch (PDOException $e) {
    server_error($e, 'Gagal memuat data dashboard.');
}
