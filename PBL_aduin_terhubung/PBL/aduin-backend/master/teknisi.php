<?php
// ==================================================================
// MODUL: MASTER - DATA TEKNISI
// Mata Kuliah: Pemrograman Web
// Deskripsi: Daftar teknisi beserta spesialisasi, status, dan jumlah tugas berjalan.
// Parameter opsional: ?aktif=1  -> hanya teknisi berstatus Aktif (untuk pilihan disposisi)
// ==================================================================

require_once __DIR__ . '/../koneksi.php';
require_once __DIR__ . '/../fungsi.php';

cors();
require_method('GET');

try {
    $where = "u.role = 'teknisi'";
    if (!empty($_GET['aktif'])) {
        $where .= " AND t.status = 'Aktif'";
    }

    $sql = "SELECT u.id_user, u.nama, u.email, u.foto_user,
                   t.id_teknisi, t.nip, t.spesialisasi, t.status,
                   (SELECT COUNT(*) FROM penanganan_tugas pt
                      JOIN pengaduan p ON p.id_pengaduan = pt.id_pengaduan
                     WHERE pt.id_teknisi = u.id_user
                       AND p.status = 'Diproses'
                       AND pt.waktu_selesai IS NULL) AS tugas_berjalan
            FROM users u
            JOIN teknisi t ON u.id_user = t.id_user
            WHERE $where
            ORDER BY u.nama ASC";

    $data = $pdo->query($sql)->fetchAll();
    foreach ($data as &$row) {
        $row['id_user']        = (int)$row['id_user'];
        $row['id_teknisi']     = (int)$row['id_teknisi'];
        $row['tugas_berjalan'] = (int)$row['tugas_berjalan'];
    }
    unset($row);

    json_response($data, 'Data teknisi berhasil diambil.');

} catch (PDOException $e) {
    server_error($e, 'Gagal mengambil data teknisi.');
}
