<?php
/**
 * Helper fungsi bersama ADUIN
 * Mata Kuliah: Pemrograman Web
 */

/* ======================================================================
   1. HTTP: CORS, respons JSON, input
   ====================================================================== */

// Tangani CORS (Cross-Origin Resource Sharing)
function cors(): void {
    if (!headers_sent()) {
        header("Access-Control-Allow-Origin: *");
        header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
        header("Access-Control-Max-Age: 86400");
    }

    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        if (!headers_sent()) {
            http_response_code(204);
        }
        exit;
    }
}

// Kirim respons dalam format JSON standar
function json_response($data = null, string $message = '', int $statusCode = 200): void {
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code($statusCode);
    }
    echo json_encode([
        'success' => ($statusCode >= 200 && $statusCode < 300),
        'message' => $message,
        'data'    => $data
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

// Respons untuk error server. Detail teknis hanya tampil jika debug aktif di config.php
function server_error(Throwable $e, string $pesan = 'Terjadi kesalahan pada server.'): void {
    global $ADUIN;
    error_log('[ADUIN] ' . $e->getMessage());
    json_response(null, $pesan . (!empty($ADUIN['debug']) ? ' (' . $e->getMessage() . ')' : ''), 500);
}

// Batasi metode HTTP yang diizinkan
function require_method(string ...$methods): string {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (!in_array($method, $methods, true)) {
        json_response(null, 'Metode tidak diizinkan. Gunakan ' . implode('/', $methods) . '.', 405);
    }
    return $method;
}

// Ambil data input baik dari JSON body maupun form-data/x-www-form-urlencoded
function get_input(): array {
    // Unggahan melebihi post_max_size membuat $_POST & $_FILES kosong: beri pesan yang jelas.
    $len = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
    $max = ini_bytes(ini_get('post_max_size'));
    if ($len > 0 && $max > 0 && $len > $max) {
        json_response(null, 'Ukuran data yang dikirim terlalu besar (batas server ' . ini_get('post_max_size') . ').', 413);
    }

    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';

    if (stripos($contentType, 'application/json') !== false) {
        $raw = file_get_contents('php://input');
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }

    if (!empty($_POST)) {
        return $_POST;
    }

    // Tangani PUT / PATCH / DELETE dari php://input jika dikirim sebagai query-string
    if (in_array($_SERVER['REQUEST_METHOD'] ?? '', ['PUT', 'PATCH', 'DELETE'], true)) {
        $raw = file_get_contents('php://input');
        if (!empty($raw)) {
            $json = json_decode($raw, true);
            if (is_array($json)) {
                return $json;
            }
            parse_str($raw, $parsed);
            return is_array($parsed) ? $parsed : [];
        }
    }

    return [];
}

// Potong teks aman UTF-8 (tidak bergantung pada ekstensi mbstring)
function potong_teks(string $teks, int $maks): string {
    if (preg_match_all('/./us', $teks, $m) === false) return substr($teks, 0, $maks);
    return count($m[0]) > $maks ? implode('', array_slice($m[0], 0, $maks - 3)) . '...' : $teks;
}

function ini_bytes(string $val): int {
    $val  = trim($val);
    if ($val === '') return 0;
    $unit = strtolower(substr($val, -1));
    $num  = (int)$val;
    switch ($unit) {
        case 'g': $num *= 1024;
        // no break
        case 'm': $num *= 1024;
        // no break
        case 'k': $num *= 1024;
    }
    return $num;
}

/* ======================================================================
   2. UPLOAD FOTO
   ====================================================================== */

// Pesan untuk kode error unggahan PHP
function pesan_error_upload(int $kode): string {
    switch ($kode) {
        case UPLOAD_ERR_INI_SIZE:
        case UPLOAD_ERR_FORM_SIZE:
            return 'Ukuran foto melebihi batas server (upload_max_filesize ' . ini_get('upload_max_filesize') . ').';
        case UPLOAD_ERR_PARTIAL:
            return 'Foto hanya terunggah sebagian. Coba lagi.';
        case UPLOAD_ERR_NO_TMP_DIR:
        case UPLOAD_ERR_CANT_WRITE:
            return 'Server tidak dapat menyimpan foto sementara.';
        default:
            return 'Foto gagal diunggah.';
    }
}

// Cloudinary aktif bila ketiga kredensial terisi di config.php
function cloudinary_aktif(): bool {
    global $ADUIN;
    return !empty($ADUIN['cloudinary_cloud_name'])
        && !empty($ADUIN['cloudinary_api_key'])
        && !empty($ADUIN['cloudinary_api_secret']);
}

// Tanda tangan: parameter diurutkan abjad, digabung "k=v&k=v", ditambah secret, lalu SHA-1
function cloudinary_tanda_tangan(array $params, string $secret): string {
    ksort($params);
    $pairs = [];
    foreach ($params as $k => $v) {
        $pairs[] = $k . '=' . $v;
    }
    return sha1(implode('&', $pairs) . $secret);
}

// Kirim POST multipart ke API Cloudinary
function cloudinary_kirim(string $endpoint, array $post): array {
    global $ADUIN;
    $ch = curl_init('https://api.cloudinary.com/v1_1/' . $ADUIN['cloudinary_cloud_name'] . '/' . $endpoint);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $post,
        CURLOPT_TIMEOUT        => 60,
    ]);
    $res  = curl_exec($ch);
    $err  = curl_error($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $json = is_string($res) ? json_decode($res, true) : null;
    return ['code' => $code, 'json' => is_array($json) ? $json : [], 'error' => $err];
}

// Unggah satu file gambar, mengembalikan URL https dari Cloudinary
function cloudinary_upload(string $fileTmp, string $subfolder): string {
    global $ADUIN;
    $ditandatangani = [
        'folder'    => trim($ADUIN['cloudinary_folder'] ?: 'aduin', '/') . '/' . $subfolder,
        'timestamp' => time(),
    ];
    $hasil = cloudinary_kirim('image/upload', $ditandatangani + [
        'file'      => new CURLFile($fileTmp),
        'api_key'   => $ADUIN['cloudinary_api_key'],
        'signature' => cloudinary_tanda_tangan($ditandatangani, $ADUIN['cloudinary_api_secret']),
    ]);

    if ($hasil['code'] !== 200 || empty($hasil['json']['secure_url'])) {
        $alasan = $hasil['json']['error']['message'] ?? ($hasil['error'] ?: 'tidak ada respons');
        json_response(null, 'Gagal mengunggah foto ke Cloudinary: ' . $alasan, 502);
    }
    return $hasil['json']['secure_url'];
}

// Hapus gambar di Cloudinary berdasarkan URL-nya
function cloudinary_hapus(string $url): void {
    global $ADUIN;
    if (!cloudinary_aktif() || !preg_match('#/upload/(?:v\d+/)?(.+)\.[a-z0-9]+$#i', $url, $m)) return;
    $ditandatangani = ['public_id' => $m[1], 'timestamp' => time()];
    cloudinary_kirim('image/destroy', $ditandatangani + [
        'api_key'   => $ADUIN['cloudinary_api_key'],
        'signature' => cloudinary_tanda_tangan($ditandatangani, $ADUIN['cloudinary_api_secret']),
    ]);
}

// Upload satu file gambar. Mengembalikan path relatif (mis. uploads/bukti/xxx.jpg) atau null bila tidak ada file.
// Memanggil json_response (400) bila file ada tetapi tidak valid.
function upload_foto(array $file, string $subfolder = 'bukti'): ?string {
    global $ADUIN;

    $err = $file['error'] ?? UPLOAD_ERR_NO_FILE;
    if ($err === UPLOAD_ERR_NO_FILE || empty($file['tmp_name'])) {
        return null;
    }
    if ($err !== UPLOAD_ERR_OK) {
        json_response(null, pesan_error_upload((int)$err), 400);
    }
    if (($file['size'] ?? 0) > $ADUIN['max_foto_bytes']) {
        json_response(null, 'Ukuran foto maksimal ' . round($ADUIN['max_foto_bytes'] / 1048576) . ' MB.', 400);
    }

    // Validasi isi file benar-benar gambar (bukan sekadar ekstensi)
    $info = @getimagesize($file['tmp_name']);
    $mapExt = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_GIF => 'gif', IMAGETYPE_WEBP => 'webp'];
    if ($info === false || !isset($mapExt[$info[2]])) {
        json_response(null, 'File "' . ($file['name'] ?? '') . '" bukan gambar JPG/PNG/WEBP/GIF yang valid.', 400);
    }
    $extension = $mapExt[$info[2]];

    // Jika Cloudinary dikonfigurasi, simpan di sana dan kembalikan URL-nya
    if (cloudinary_aktif()) {
        return cloudinary_upload($file['tmp_name'], preg_replace('/[^a-z0-9_-]/i', '', $subfolder));
    }

    $subfolder     = preg_replace('/[^a-z0-9_-]/i', '', $subfolder);
    $baseUploadDir = __DIR__ . '/uploads/' . $subfolder . '/';
    if (!is_dir($baseUploadDir) && !mkdir($baseUploadDir, 0775, true) && !is_dir($baseUploadDir)) {
        json_response(null, 'Folder unggahan tidak dapat dibuat di server.', 500);
    }

    $newFileName = time() . '_' . bin2hex(random_bytes(6)) . '.' . $extension;
    if (!move_uploaded_file($file['tmp_name'], $baseUploadDir . $newFileName)) {
        json_response(null, 'Foto gagal disimpan di server.', 500);
    }

    return 'uploads/' . $subfolder . '/' . $newFileName;
}

// Upload banyak foto dari field bertipe array (name="foto_bukti[]"). Mengembalikan daftar path.
function upload_banyak_foto(string $field, string $subfolder, int $maksimal): array {
    if (!isset($_FILES[$field])) return [];
    $f = $_FILES[$field];

    // Satu file tunggal (bukan array)
    if (!is_array($f['name'])) {
        $p = upload_foto($f, $subfolder);
        return $p ? [$p] : [];
    }

    $jumlah = count($f['name']);
    $hasil  = [];
    for ($i = 0; $i < $jumlah; $i++) {
        $one = [
            'name'     => $f['name'][$i],
            'type'     => $f['type'][$i],
            'tmp_name' => $f['tmp_name'][$i],
            'error'    => $f['error'][$i],
            'size'     => $f['size'][$i],
        ];
        if ($one['error'] === UPLOAD_ERR_NO_FILE) continue;
        if (count($hasil) >= $maksimal) {
            hapus_file_upload($hasil);
            json_response(null, "Maksimal $maksimal foto per laporan.", 400);
        }
        $p = upload_foto($one, $subfolder);
        if ($p) $hasil[] = $p;
    }
    return $hasil;
}

// Hapus file hasil upload (dipakai untuk rollback bila penyimpanan database gagal)
function hapus_file_upload($paths): void {
    foreach ((array)$paths as $p) {
        if (preg_match('#^https?://res\.cloudinary\.com/#', (string)$p)) { cloudinary_hapus($p); continue; }
        if (!$p || strpos($p, 'uploads/') !== 0 || strpos($p, '..') !== false) continue;
        $full = __DIR__ . '/' . $p;
        if (is_file($full)) @unlink($full);
    }
}

// "a.jpg,b.jpg" -> ['a.jpg','b.jpg']
function daftar_foto(?string $csv): array {
    if ($csv === null || trim($csv) === '') return [];
    return array_values(array_filter(array_map('trim', explode(',', $csv))));
}

/* ======================================================================
   3. PENGGUNA & PERAN
   ====================================================================== */

// Ambil pengguna berdasarkan id, opsional dibatasi peran. Menghentikan request bila tidak sesuai.
function ambil_user(PDO $pdo, int $idUser, array $rolesDiizinkan = [], string $namaPeran = 'pengguna'): array {
    if ($idUser <= 0) {
        json_response(null, "ID $namaPeran wajib diisi.", 400);
    }
    $stmt = $pdo->prepare("SELECT id_user, nama, email, role, foto_user FROM users WHERE id_user = :id");
    $stmt->execute([':id' => $idUser]);
    $user = $stmt->fetch();
    if (!$user) {
        json_response(null, ucfirst($namaPeran) . ' tidak ditemukan.', 404);
    }
    if ($rolesDiizinkan && !in_array($user['role'], $rolesDiizinkan, true)) {
        json_response(null, 'Akses ditolak: akun ini tidak memiliki hak sebagai ' . $namaPeran . '.', 403);
    }
    return $user;
}

// Data identitas lengkap pengguna (NIM/NIP, prodi, jabatan, spesialisasi) untuk profil & login
function profil_lengkap(PDO $pdo, int $idUser): ?array {
    $sql = "SELECT u.id_user, u.nama, u.email, u.role, u.foto_user,
                   m.nim, m.prodi,
                   d.nip AS nip_dosen, d.bidang_keahlian,
                   s.nip AS nip_sekjur, s.jabatan,
                   t.id_teknisi, t.nip AS nip_teknisi, t.spesialisasi, t.status AS status_teknisi
            FROM users u
            LEFT JOIN mahasiswa m ON m.id_user = u.id_user
            LEFT JOIN dosen d     ON d.id_user = u.id_user
            LEFT JOIN sekjur s    ON s.id_user = u.id_user
            LEFT JOIN teknisi t   ON t.id_user = u.id_user
            WHERE u.id_user = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':id' => $idUser]);
    $r = $stmt->fetch();
    if (!$r) return null;

    $identitas = $r['nim'] ?? $r['nip_dosen'] ?? $r['nip_sekjur'] ?? $r['nip_teknisi'] ?? null;
    $jabatanDefault = [
        'mahasiswa' => 'Mahasiswa', 'dosen' => 'Dosen',
        'sekjur' => 'Sekretaris Jurusan', 'teknisi' => 'Teknisi',
    ];

    return [
        'id_user'      => (int)$r['id_user'],
        'nama'         => $r['nama'],
        'email'        => $r['email'],
        'role'         => $r['role'],
        'foto_user'    => $r['foto_user'],
        'identitas'    => $identitas,
        'jabatan'      => $r['jabatan'] ?: ($jabatanDefault[$r['role']] ?? $r['role']),
        'prodi'        => $r['prodi'],
        'bidang_keahlian' => $r['bidang_keahlian'],
        'spesialisasi' => $r['spesialisasi'],
        'id_teknisi'   => $r['id_teknisi'] !== null ? (int)$r['id_teknisi'] : null,
        'status_teknisi' => $r['status_teknisi'],
    ];
}

// Cek password: mendukung hash bcrypt maupun teks biasa (data lama)
function cek_password(string $input, string $tersimpan): bool {
    return hash_equals($tersimpan, $input) || password_verify($input, $tersimpan);
}

/* ======================================================================
   4. PENGADUAN: query bersama & format hasil
   ====================================================================== */

/*
 * Pemetaan status database -> status tampilan (UI):
 *   pengaduan.status = 'Diproses'  + tugas belum selesai  -> 'Dalam Perbaikan'
 *   pengaduan.status = 'Diproses'  + tugas sudah selesai  -> 'Menunggu Review Hasil'
 *   status lain dipakai apa adanya.
 *
 * Status tugas teknisi (penanganan_tugas):
 *   waktu_selesai terisi -> 'Selesai'
 *   waktu_mulai terisi   -> 'Sedang Dikerjakan'
 *   selain itu           -> 'Tugas Baru'
 */
function sql_pengaduan_select(): string {
    return "SELECT p.id_pengaduan, p.id_pelapor, p.id_ruangan, p.id_fasilitas,
                   p.id_fasilitas AS id_kategori,
                   p.judul_laporan, p.judul_laporan AS judul_keluhan,
                   p.deskripsi, p.foto_bukti, p.status, p.alasan_penolakan,
                   p.tanggal_lapor, p.id_verifikator,
                   CASE
                       WHEN p.status = 'Diproses' AND pt.waktu_selesai IS NOT NULL THEN 'Menunggu Review Hasil'
                       WHEN p.status = 'Diproses' THEN 'Dalam Perbaikan'
                       ELSE p.status
                   END AS status_ui,
                   r.nama_ruangan, r.lantai,
                   k.nama_kategori,
                   u.nama AS nama_pelapor, u.email AS email_pelapor, u.role AS role_pelapor,
                   COALESCE(m.nim, d.nip) AS identitas_pelapor,
                   uv.nama AS nama_verifikator,
                   pt.id_teknisi, ut.nama AS nama_teknisi,
                   pt.waktu_mulai, pt.waktu_selesai, pt.catatan_teknisi,
                   pt.foto_hasil, pt.foto_sebelum, pt.revisi_ke, pt.catatan_revisi,
                   CASE
                       WHEN pt.id_penanganan IS NULL THEN NULL
                       WHEN pt.waktu_selesai IS NOT NULL THEN 'Selesai'
                       WHEN pt.waktu_mulai IS NOT NULL THEN 'Sedang Dikerjakan'
                       ELSE 'Tugas Baru'
                   END AS status_tugas,
                   (SELECT MIN(rs.\"timestamp\") FROM riwayat_status rs
                     WHERE rs.id_pengaduan = p.id_pengaduan
                       AND rs.status_baru <> 'Menunggu Verifikasi') AS tanggal_verifikasi,
                   (SELECT MAX(rs.\"timestamp\") FROM riwayat_status rs
                     WHERE rs.id_pengaduan = p.id_pengaduan) AS tanggal_status_terakhir
            FROM pengaduan p
            JOIN ruangan r            ON p.id_ruangan   = r.id_ruangan
            JOIN kategori_fasilitas k ON p.id_fasilitas = k.id_fasilitas
            JOIN users u              ON p.id_pelapor   = u.id_user
            LEFT JOIN mahasiswa m     ON m.id_user      = u.id_user
            LEFT JOIN dosen d         ON d.id_user      = u.id_user
            LEFT JOIN users uv        ON p.id_verifikator = uv.id_user
            LEFT JOIN penanganan_tugas pt ON pt.id_pengaduan = p.id_pengaduan
            LEFT JOIN users ut        ON pt.id_teknisi  = ut.id_user";
}

// Tambahkan field turunan (daftar foto, integer) ke satu baris pengaduan
function format_pengaduan(array $row): array {
    $row['id_pengaduan']  = (int)$row['id_pengaduan'];
    $row['id_pelapor']    = (int)$row['id_pelapor'];
    $row['id_ruangan']    = (int)$row['id_ruangan'];
    $row['id_fasilitas']  = (int)$row['id_fasilitas'];
    $row['id_kategori']   = (int)$row['id_kategori'];
    $row['lantai']        = (int)$row['lantai'];
    $row['id_verifikator'] = $row['id_verifikator'] !== null ? (int)$row['id_verifikator'] : null;
    $row['id_teknisi']    = $row['id_teknisi'] !== null ? (int)$row['id_teknisi'] : null;
    $row['revisi_ke']     = (int)($row['revisi_ke'] ?? 0);
    $row['foto_list']     = daftar_foto($row['foto_bukti'] ?? null);
    return $row;
}

function ambil_pengaduan(PDO $pdo, int $idPengaduan): ?array {
    $stmt = $pdo->prepare(sql_pengaduan_select() . " WHERE p.id_pengaduan = :id");
    $stmt->execute([':id' => $idPengaduan]);
    $row = $stmt->fetch();
    return $row ? format_pengaduan($row) : null;
}

// Catat perubahan status ke riwayat_status
function catat_riwayat(PDO $pdo, int $idPengaduan, int $oleh, string $statusBaru, string $keterangan): void {
    $stmt = $pdo->prepare("INSERT INTO riwayat_status (id_pengaduan, changed_by, status_baru, keterangan, \"timestamp\")
                           VALUES (:id, :oleh, :status, :ket, NOW())");
    $stmt->execute([':id' => $idPengaduan, ':oleh' => $oleh, ':status' => $statusBaru, ':ket' => $keterangan]);
}

// Daftar riwayat perubahan status satu pengaduan
function ambil_riwayat(PDO $pdo, int $idPengaduan): array {
    $stmt = $pdo->prepare("SELECT rs.id_riwayat, rs.id_pengaduan, rs.changed_by, rs.status_baru, rs.keterangan,
                                  rs.\"timestamp\", u.nama AS nama_pengubah, u.role AS role_pengubah
                           FROM riwayat_status rs
                           JOIN users u ON rs.changed_by = u.id_user
                           WHERE rs.id_pengaduan = :id
                           ORDER BY rs.\"timestamp\" ASC, rs.id_riwayat ASC");
    $stmt->execute([':id' => $idPengaduan]);
    return $stmt->fetchAll();
}