<?php
// ==================================================================
// MODUL: MASTER - DATA KATEGORI FASILITAS
// Mata Kuliah: Pemrograman Web
// Deskripsi: Menampilkan jenis fasilitas (AC, Komputer, Proyektor, dll)
// ==================================================================

require_once __DIR__ . '/../koneksi.php';
require_once __DIR__ . '/../fungsi.php';

cors();
require_method('GET');

try {
    $stmt = $pdo->query("SELECT id_fasilitas, nama_kategori, deskripsi FROM kategori_fasilitas ORDER BY id_fasilitas ASC");
    $data = $stmt->fetchAll();

    json_response($data, 'Data kategori fasilitas berhasil diambil.');

} catch (PDOException $e) {
    server_error($e, 'Gagal mengambil data kategori fasilitas.');
}
