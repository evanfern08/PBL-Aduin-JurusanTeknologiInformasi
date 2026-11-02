<?php
// ==================================================================
// MODUL: AUTH - FOTO PROFIL
// Method: POST (multipart/form-data) {id_user, foto}
// ==================================================================

require_once __DIR__ . '/../koneksi.php';
require_once __DIR__ . '/../fungsi.php';

cors();
require_method('POST');

$input  = get_input();
$idUser = (int)($input['id_user'] ?? 0);

try {
    $user = ambil_user($pdo, $idUser);

    if (!isset($_FILES['foto'])) {
        json_response(null, 'File foto wajib dikirim.', 400);
    }
    $path = upload_foto($_FILES['foto'], 'profil');
    if (!$path) {
        json_response(null, 'File foto wajib dikirim.', 400);
    }

    $pdo->prepare("UPDATE users SET foto_user = :f WHERE id_user = :id")
        ->execute([':f' => $path, ':id' => $idUser]);

    if (!empty($user['foto_user'])) {
        hapus_file_upload($user['foto_user']);
    }

    json_response(['foto_user' => $path], 'Foto profil berhasil diperbarui.');

} catch (PDOException $e) {
    server_error($e, 'Gagal menyimpan foto profil.');
}
