<?php
// ==================================================================
// MODUL: TEKNISI - DAFTAR TUGAS PERBAIKAN
// Deskripsi: Semua tugas milik satu teknisi (baru, dikerjakan, selesai).
// Parameter: ?id_teknisi=5  (id_user teknisi). Tanpa parameter = semua tugas.
// Field status_tugas: 'Tugas Baru' | 'Sedang Dikerjakan' | 'Selesai'
// ==================================================================

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
