<?php
// ==================================================================
// MODUL: AUTH - REGISTRASI PENGGUNA BARU
// Mata Kuliah: Pemrograman Web
// Deskripsi: Pendaftaran mandiri khusus mahasiswa & dosen (pelapor).
//            Akun teknisi dibuat oleh verifikator (Kelola Teknisi),
//            akun sekjur dibuat langsung di database.
// Method   : POST  {nama, email, password, role, nim | nip}
// ==================================================================

require_once __DIR__ . '/../koneksi.php';
require_once __DIR__ . '/../fungsi.php';

cors();
require_method('POST');

$input    = get_input();
$nama     = trim((string)($input['nama'] ?? ''));
$email    = trim((string)($input['email'] ?? ''));
$password = (string)($input['password'] ?? '');
$role     = trim((string)($input['role'] ?? 'mahasiswa'));

if ($nama === '' || $email === '' || $password === '') {
    json_response(null, 'Nama, email, dan password wajib diisi.', 400);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_response(null, 'Format email tidak valid.', 400);
}
if (strlen($password) < 8) {
    json_response(null, 'Password minimal 8 karakter.', 400);
}
if (!in_array($role, ['mahasiswa', 'dosen'], true)) {
    json_response(null, 'Pendaftaran mandiri hanya untuk mahasiswa atau dosen.', 400);
}

// ID kampus: NIM (mahasiswa) atau NIP (dosen). Frontend mengirim "id", tetapi nim/nip juga diterima.
$idKampus = trim((string)($input['id'] ?? ($role === 'mahasiswa' ? ($input['nim'] ?? '') : ($input['nip'] ?? ''))));
if ($idKampus === '') {
    json_response(null, ($role === 'mahasiswa' ? 'NIM' : 'NIP') . ' wajib diisi.', 400);
}

try {
    $cek = $pdo->prepare("SELECT 1 FROM users WHERE lower(email) = lower(:email)");
    $cek->execute([':email' => $email]);
    if ($cek->fetch()) {
        json_response(null, 'Email ini sudah terdaftar. Silakan gunakan email lain.', 409);
    }

    $tabel = $role === 'mahasiswa' ? 'mahasiswa' : 'dosen';
    $kolom = $role === 'mahasiswa' ? 'nim' : 'nip';
    $cekId = $pdo->prepare("SELECT 1 FROM $tabel WHERE $kolom = :id");
    $cekId->execute([':id' => $idKampus]);
    if ($cekId->fetch()) {
        json_response(null, ($role === 'mahasiswa' ? 'NIM' : 'NIP') . ' ini sudah terdaftar.', 409);
    }

    $pdo->beginTransaction();

    $stmtUser = $pdo->prepare("INSERT INTO users (nama, email, password, role)
                               VALUES (:nama, :email, :password, :role)
                               RETURNING id_user");
    $stmtUser->execute([
        ':nama'     => $nama,
        ':email'    => $email,
        ':password' => password_hash($password, PASSWORD_DEFAULT),
        ':role'     => $role,
    ]);
    $idUser = (int)$stmtUser->fetchColumn();

    if ($role === 'mahasiswa') {
        $prodi = trim((string)($input['prodi'] ?? '')) ?: 'Teknologi Informasi';
        $pdo->prepare("INSERT INTO mahasiswa (nim, prodi, id_user) VALUES (:nim, :prodi, :id_user)")
            ->execute([':nim' => $idKampus, ':prodi' => $prodi, ':id_user' => $idUser]);
    } else {
        $bidang = trim((string)($input['bidang_keahlian'] ?? '')) ?: 'Dosen JTI';
        $pdo->prepare("INSERT INTO dosen (nip, bidang_keahlian, id_user) VALUES (:nip, :bidang, :id_user)")
            ->execute([':nip' => $idKampus, ':bidang' => $bidang, ':id_user' => $idUser]);
    }

    $pdo->commit();

    json_response(['id_user' => $idUser, 'role' => $role, 'nama' => $nama], 'Registrasi akun berhasil.', 201);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    server_error($e, 'Gagal melakukan registrasi.');
}
