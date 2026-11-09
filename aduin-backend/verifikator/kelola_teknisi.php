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
$method = require_method('POST', 'PUT', 'PATCH', 'DELETE');

$input = get_input();
$idVerifikator = (int)($input['id_verifikator'] ?? $_GET['id_verifikator'] ?? 0);

$nama         = trim((string)($input['nama'] ?? ''));
$email        = trim((string)($input['email'] ?? ''));
$password     = (string)($input['password'] ?? '');
$nip          = trim((string)($input['nip'] ?? ''));
$spesialisasi = trim((string)($input['spesialisasi'] ?? ''));
$status       = trim((string)($input['status'] ?? 'Aktif'));

try {
    ambil_user($pdo, $idVerifikator, ['sekjur'], 'verifikator');

    if ($method === 'POST') {
        if ($nama === '' || $email === '' || $nip === '' || $spesialisasi === '') {
            json_response(null, 'Nama, email, ID/NIP, dan spesialisasi wajib diisi.', 400);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) json_response(null, 'Format email tidak valid.', 400);
        if (strlen($password) < 8) json_response(null, 'Password awal minimal 8 karakter.', 400);
        if (!in_array($status, ['Aktif', 'Cuti', 'Nonaktif'], true)) json_response(null, 'Status tidak valid.', 400);

        $c = $pdo->prepare("SELECT (SELECT COUNT(*) FROM users WHERE lower(email) = lower(:e)) AS e,
                                   (SELECT COUNT(*) FROM teknisi WHERE nip = :n) AS n");
        $c->execute([':e' => $email, ':n' => $nip]);
        $ada = $c->fetch();
        if ((int)$ada['e'] > 0) json_response(null, 'Email sudah terdaftar.', 409);
        if ((int)$ada['n'] > 0) json_response(null, 'ID/NIP sudah terdaftar.', 409);

        $pdo->beginTransaction();
        $stmt = $pdo->prepare("INSERT INTO users (nama, email, password, role) VALUES (:n, :e, :p, 'teknisi') RETURNING id_user");
        $stmt->execute([':n' => $nama, ':e' => $email, ':p' => password_hash($password, PASSWORD_DEFAULT)]);
        $idBaru = (int)$stmt->fetchColumn();
        $pdo->prepare("INSERT INTO teknisi (spesialisasi, id_user, nip, status) VALUES (:s, :u, :nip, :st)")
            ->execute([':s' => $spesialisasi, ':u' => $idBaru, ':nip' => $nip, ':st' => $status]);
        $pdo->commit();

        json_response(['id_user' => $idBaru], 'Teknisi baru berhasil ditambahkan.', 201);
    }

    $idUser = (int)($input['id_user'] ?? $_GET['id_user'] ?? 0);
    $ada = $pdo->prepare("SELECT t.id_teknisi, t.nip FROM teknisi t JOIN users u ON u.id_user = t.id_user WHERE u.id_user = :id");
    $ada->execute([':id' => $idUser]);
    $lama = $ada->fetch();
    if (!$lama) json_response(null, 'Teknisi tidak ditemukan.', 404);

    if ($method === 'DELETE') {
        $tugas = $pdo->prepare("SELECT COUNT(*) FROM penanganan_tugas WHERE id_teknisi = :id");
        $tugas->execute([':id' => $idUser]);
        if ((int)$tugas->fetchColumn() > 0) {
            json_response(null, 'Teknisi ini memiliki riwayat tugas sehingga tidak dapat dihapus. Ubah statusnya menjadi Nonaktif.', 409);
        }
        $cekLog = $pdo->prepare("SELECT COUNT(*) FROM riwayat_status WHERE changed_by = :id");
        $cekLog->execute([':id' => $idUser]);
        if ((int)$cekLog->fetchColumn() > 0) {
            json_response(null, 'Teknisi ini tercatat pada riwayat laporan sehingga tidak dapat dihapus. Ubah statusnya menjadi Nonaktif.', 409);
        }
        $pdo->prepare("DELETE FROM users WHERE id_user = :id AND role = 'teknisi'")->execute([':id' => $idUser]);
        json_response(null, 'Teknisi berhasil dihapus.');
    }

    // PUT / PATCH
    if ($nama === '' || $email === '' || $nip === '' || $spesialisasi === '') {
        json_response(null, 'Nama, email, ID/NIP, dan spesialisasi wajib diisi.', 400);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) json_response(null, 'Format email tidak valid.', 400);
    if (!in_array($status, ['Aktif', 'Cuti', 'Nonaktif'], true)) json_response(null, 'Status tidak valid.', 400);
    if ($password !== '' && strlen($password) < 8) json_response(null, 'Password baru minimal 8 karakter.', 400);

    $c = $pdo->prepare("SELECT (SELECT COUNT(*) FROM users WHERE lower(email) = lower(:e) AND id_user <> :id) AS e,
                               (SELECT COUNT(*) FROM teknisi WHERE nip = :n AND id_user <> :id) AS n");
    $c->execute([':e' => $email, ':n' => $nip, ':id' => $idUser]);
    $dup = $c->fetch();
    if ((int)$dup['e'] > 0) json_response(null, 'Email sudah dipakai pengguna lain.', 409);
    if ((int)$dup['n'] > 0) json_response(null, 'ID/NIP sudah dipakai teknisi lain.', 409);

    $pdo->beginTransaction();
    $pdo->prepare("UPDATE users SET nama = :n, email = :e WHERE id_user = :id")
        ->execute([':n' => $nama, ':e' => $email, ':id' => $idUser]);
    if ($password !== '') {
        $pdo->prepare("UPDATE users SET password = :p WHERE id_user = :id")
            ->execute([':p' => password_hash($password, PASSWORD_DEFAULT), ':id' => $idUser]);
    }
    $pdo->prepare("UPDATE teknisi SET nip = :nip, spesialisasi = :s, status = :st WHERE id_user = :id")
        ->execute([':nip' => $nip, ':s' => $spesialisasi, ':st' => $status, ':id' => $idUser]);
    $pdo->commit();

    json_response(null, 'Data teknisi berhasil diperbarui.');

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    server_error($e, 'Gagal memproses data teknisi.');
}
