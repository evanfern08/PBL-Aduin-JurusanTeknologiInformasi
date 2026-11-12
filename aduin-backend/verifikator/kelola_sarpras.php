<?php
/**
 * Kelola Sarpras (master kategori_fasilitas) - khusus verifikator (sekjur).
 *
 * Daftar sarpras diambil lewat GET master/kategori.php (sudah ada).
 * Endpoint ini menangani penulisan data:
 *   POST         -> tambah   { id_verifikator, nama_kategori, deskripsi }
 *   PUT / PATCH  -> ubah     { id_verifikator, id_fasilitas, nama_kategori, deskripsi }
 *   DELETE       -> hapus    { id_verifikator, id_fasilitas }
 */
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../koneksi.php';
require_once __DIR__ . '/../fungsi.php';

cors();
$method = require_method('POST', 'PUT', 'PATCH', 'DELETE');

$input = get_input();
$idVerifikator = (int)($input['id_verifikator'] ?? $_GET['id_verifikator'] ?? 0);
$idFasilitas   = (int)($input['id_fasilitas'] ?? $_GET['id_fasilitas'] ?? 0);
$nama          = trim((string)($input['nama_kategori'] ?? ''));
$deskripsi     = trim((string)($input['deskripsi'] ?? ''));

try {
    ambil_user($pdo, $idVerifikator, ['sekjur'], 'verifikator');

    if ($method === 'POST') {
        validasi_sarpras($nama, $deskripsi);
        nama_sarpras_unik($pdo, $nama, 0);

        $stmt = $pdo->prepare("INSERT INTO kategori_fasilitas (nama_kategori, deskripsi)
                               VALUES (:n, :d) RETURNING id_fasilitas");
        $stmt->execute([':n' => $nama, ':d' => $deskripsi !== '' ? $deskripsi : null]);
        json_response(['id_fasilitas' => (int)$stmt->fetchColumn()], 'Sarpras baru berhasil ditambahkan.', 201);
    }

    if ($idFasilitas <= 0) json_response(null, 'ID sarpras wajib diisi.', 400);
    $cek = $pdo->prepare("SELECT nama_kategori FROM kategori_fasilitas WHERE id_fasilitas = :id");
    $cek->execute([':id' => $idFasilitas]);
    $lama = $cek->fetch();
    if (!$lama) json_response(null, 'Sarpras tidak ditemukan.', 404);

    if ($method === 'DELETE') {
        $pakai = $pdo->prepare("SELECT COUNT(*) FROM pengaduan WHERE id_fasilitas = :id");
        $pakai->execute([':id' => $idFasilitas]);
        $jumlah = (int)$pakai->fetchColumn();
        if ($jumlah > 0) {
            json_response(null, "Sarpras \"{$lama['nama_kategori']}\" dipakai pada $jumlah laporan sehingga tidak dapat dihapus.", 409);
        }
        $pdo->prepare("DELETE FROM kategori_fasilitas WHERE id_fasilitas = :id")->execute([':id' => $idFasilitas]);
        json_response(null, 'Sarpras berhasil dihapus.');
    }

    // PUT / PATCH
    validasi_sarpras($nama, $deskripsi);
    nama_sarpras_unik($pdo, $nama, $idFasilitas);
    $pdo->prepare("UPDATE kategori_fasilitas SET nama_kategori = :n, deskripsi = :d WHERE id_fasilitas = :id")
        ->execute([':n' => $nama, ':d' => $deskripsi !== '' ? $deskripsi : null, ':id' => $idFasilitas]);
    json_response(null, 'Data sarpras berhasil diperbarui.');

} catch (Exception $e) {
    server_error($e, 'Gagal memproses data sarpras.');
}

function validasi_sarpras(string $nama, string $deskripsi): void {
    if ($nama === '') json_response(null, 'Nama sarpras wajib diisi.', 400);
    if (strlen($nama) > 100) json_response(null, 'Nama sarpras maksimal 100 karakter.', 400);
    if (strlen($deskripsi) > 500) json_response(null, 'Deskripsi maksimal 500 karakter.', 400);
}

function nama_sarpras_unik(PDO $pdo, string $nama, int $kecualiId): void {
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM kategori_fasilitas
                           WHERE lower(nama_kategori) = lower(:n) AND id_fasilitas <> :id");
    $stmt->execute([':n' => $nama, ':id' => $kecualiId]);
    if ((int)$stmt->fetchColumn() > 0) {
        json_response(null, "Sarpras \"$nama\" sudah ada.", 409);
    }
}
