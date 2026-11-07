<?php
require_once __DIR__ . '/../koneksi.php';
require_once __DIR__ . '/../fungsi.php';

cors();
require_method('POST');
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

$input    = get_input();
$id       = trim((string)($input['id'] ?? $input['email'] ?? $input['id_email'] ?? ''));
$password = (string)($input['password'] ?? '');

if ($id === '' || $password === '') {
    json_response(null, 'ID/email dan password wajib diisi.', 400);
}

try {
    $sql = "SELECT u.id_user, u.password
            FROM users u
            LEFT JOIN mahasiswa m ON m.id_user = u.id_user
            LEFT JOIN dosen d     ON d.id_user = u.id_user
            LEFT JOIN sekjur s    ON s.id_user = u.id_user
            LEFT JOIN teknisi t   ON t.id_user = u.id_user
            WHERE lower(u.email) = lower(:id)
               OR m.nim = :id OR d.nip = :id OR s.nip = :id OR t.nip = :id
            ORDER BY (lower(u.email) = lower(:id)) DESC
            LIMIT 1";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':id' => $id]);
    $user = $stmt->fetch();

    if (!$user || !cek_password($password, $user['password'])) {
        json_response(null, 'ID/Email atau password salah.', 401);
    }

    $profil = profil_lengkap($pdo, (int)$user['id_user']);

    if ($profil['role'] === 'teknisi' && $profil['status_teknisi'] === 'Nonaktif') {
        json_response(null, 'Akun teknisi ini dinonaktifkan. Hubungi verifikator.', 403);
    }

    // Data lama menyimpan password sebagai teks biasa: tingkatkan menjadi hash bcrypt saat login berhasil.
    if (!password_get_info($user['password'])['algo']) {
        $up = $pdo->prepare("UPDATE users SET password = :p WHERE id_user = :id");
        $up->execute([':p' => password_hash($password, PASSWORD_DEFAULT), ':id' => $user['id_user']]);
    }

    json_response($profil, 'Login berhasil.');

} catch (PDOException $e) {
    server_error($e, 'Kesalahan database saat login.');
}
