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
require_method('POST', 'PUT');

$input    = get_input();
$idUser   = (int)($input['id_user'] ?? 0);
$lama     = (string)($input['password_lama'] ?? '');
$baru     = (string)($input['password_baru'] ?? '');

if ($idUser <= 0 || $lama === '' || $baru === '') {
    json_response(null, 'ID user, password lama, dan password baru wajib diisi.', 400);
}
if (strlen($baru) < 8) {
    json_response(null, 'Password baru minimal 8 karakter.', 400);
}

try {
    $stmt = $pdo->prepare("SELECT password FROM users WHERE id_user = :id");
    $stmt->execute([':id' => $idUser]);
    $tersimpan = $stmt->fetchColumn();

    if ($tersimpan === false) {
        json_response(null, 'Pengguna tidak ditemukan.', 404);
    }
    if (!cek_password($lama, $tersimpan)) {
        json_response(null, 'Kata sandi lama tidak cocok.', 403);
    }

    $pdo->prepare("UPDATE users SET password = :p WHERE id_user = :id")
        ->execute([':p' => password_hash($baru, PASSWORD_DEFAULT), ':id' => $idUser]);

    json_response(null, 'Kata sandi berhasil diperbarui.');

} catch (PDOException $e) {
    server_error($e, 'Gagal mengubah kata sandi.');
}
