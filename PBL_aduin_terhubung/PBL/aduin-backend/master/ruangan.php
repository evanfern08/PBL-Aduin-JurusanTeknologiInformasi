<?php
// ==================================================================
// MODUL: MASTER - DATA RUANGAN
// Mata Kuliah: Pemrograman Web
// Deskripsi: Menampilkan seluruh data ruangan dan lantai kampus
// ==================================================================

require_once __DIR__ . '/../koneksi.php';
require_once __DIR__ . '/../fungsi.php';

cors();
require_method('GET');

try {
    $stmt = $pdo->query("SELECT id_ruangan, nama_ruangan, lantai FROM ruangan ORDER BY lantai ASC, nama_ruangan ASC");
    $data = $stmt->fetchAll();

    json_response($data, 'Data ruangan berhasil diambil.');

} catch (PDOException $e) {
    server_error($e, 'Gagal mengambil data ruangan.');
}
