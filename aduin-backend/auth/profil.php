<?php
// ==================================================================
// MODUL: AUTH - PROFIL PENGGUNA
// Mata Kuliah: Pemrograman Web
// GET  ?id_user=1            -> detail profil lengkap
// POST/PUT {id_user, nama}   -> perbarui nama
// ==================================================================

require_once __DIR__ . '/../koneksi.php';
require_once __DIR__ . '/../fungsi.php';

cors();
$method = require_method('GET', 'POST', 'PUT');

try {
    if ($method === 'GET') {
        $idUser = (int)($_GET['id_user'] ?? $_GET['id'] ?? 0);
        if ($idUser <= 0) {
            json_response(null, 'Parameter ID user tidak valid.', 400);
        }
        $profil = profil_lengkap($pdo, $idUser);
        if (!$profil) {
            json_response(null, 'Data pengguna tidak ditemukan.', 404);
        }
        json_response($profil, 'Data profil berhasil diambil.');
    }

    $input  = get_input();
    $idUser = (int)($input['id_user'] ?? $_GET['id_user'] ?? 0);
    $nama   = trim((string)($input['nama'] ?? ''));

    if ($idUser <= 0 || $nama === '') {
        json_response(null, 'ID user dan nama wajib diisi.', 400);
    }
    ambil_user($pdo, $idUser);

    $pdo->prepare("UPDATE users SET nama = :nama WHERE id_user = :id")
        ->execute([':nama' => $nama, ':id' => $idUser]);

    json_response(profil_lengkap($pdo, $idUser), 'Profil berhasil diperbarui.');

} catch (PDOException $e) {
    server_error($e, 'Gagal memproses profil.');
}
