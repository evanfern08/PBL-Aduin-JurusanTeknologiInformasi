<?php
// Izin akses domain cross-origin (CORS)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

// Tangani request 'preflight' OPTIONS dari browser
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

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
