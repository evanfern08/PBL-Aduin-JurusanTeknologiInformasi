<?php
/**
 * GET /api/statistik/ringkasan.php
 * Ringkasan jumlah laporan per status untuk Verifikator (Kajur/Sekjur).
 *
 * Akses   : hanya role verifikator (users.role = 'sekjur', mencakup Kajur & Sekjur).
 *           Bukan verifikator -> 403.
 * Query   : id_verifikator (wajib, via query string).
 * Respons : {"ok": true, "data": {"menunggu_verifikasi": 8, ..., "total": 48}}
 *           {"ok": false, "message": "..."}  (disertai HTTP 4xx/5xx)
 *
 * Pemetaan status:
 * Nilai status dipakai setelah dinormalisasi dari "Menunggu Verifikasi" menjadi
 * "menunggu_verifikasi", dan seterusnya. Dengan demikian endpoint mendukung
 * format database snake_case maupun nama status Indonesia yang sudah digunakan aplikasi.
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../koneksi.php';

// Metode: hanya GET yang diizinkan.
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    ringkasan_respons(null, 'Metode tidak diizinkan. Gunakan GET.', 405);
}

/**
 * Kirim respons JSON dengan kontrak {ok, data|message} khusus endpoint ini.
 */
function ringkasan_respons($data = null, string $message = '', int $status = 200): void {
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code($status);
    }
    $ok = $status >= 200 && $status < 300;
    $body = $ok
        ? ['ok' => true, 'data' => $data]
        : ['ok' => false, 'message' => $message];
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

$idVerifikator = (int)($_GET['id_verifikator'] ?? 0);

try {
    if ($idVerifikator <= 0) {
        ringkasan_respons(null, 'ID verifikator wajib diisi.', 400);
    }

    // 1. Validasi peran verifikator (sekjur = Kajur/Sekjur). Prepared statement.
    $stmt = $pdo->prepare("SELECT role FROM users WHERE id_user = :id");
    $stmt->execute([':id' => $idVerifikator]);
    $role = $stmt->fetchColumn();

    if ($role === false) {
        ringkasan_respons(null, 'Verifikator tidak ditemukan.', 403);
    }
    if ($role !== 'sekjur') {
        ringkasan_respons(null, 'Akses ditolak: hanya verifikator yang boleh membuka ringkasan laporan.', 403);
    }

    // 2. Satu query agregat (PostgreSQL COUNT(*) FILTER).
    $sql = "SELECT
                COUNT(*) FILTER (WHERE lower(replace(p.status, ' ', '_')) = 'menunggu_verifikasi') AS menunggu_verifikasi,
                COUNT(*) FILTER (WHERE lower(replace(p.status, ' ', '_')) = 'diteruskan_ke_pusat') AS diteruskan_ke_pusat,
                COUNT(*) FILTER (WHERE lower(replace(p.status, ' ', '_')) IN ('diproses', 'perlu_perbaikan_ulang')) AS dalam_perbaikan,
                COUNT(*) FILTER (WHERE lower(replace(p.status, ' ', '_')) = 'menunggu_validasi') AS menunggu_review_hasil,
                COUNT(*) FILTER (WHERE lower(replace(p.status, ' ', '_')) = 'selesai') AS selesai,
                COUNT(*) FILTER (WHERE lower(replace(p.status, ' ', '_')) = 'ditolak') AS ditolak,
                COUNT(*) AS total
            FROM pengaduan p";

    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $row = $stmt->fetch();

    ringkasan_respons([
        'menunggu_verifikasi'   => (int)$row['menunggu_verifikasi'],
        'diteruskan_ke_pusat'   => (int)$row['diteruskan_ke_pusat'],
        'dalam_perbaikan'       => (int)$row['dalam_perbaikan'],
        'menunggu_review_hasil' => (int)$row['menunggu_review_hasil'],
        'selesai'               => (int)$row['selesai'],
        'ditolak'               => (int)$row['ditolak'],
        'total'                 => (int)$row['total'],
    ]);

} catch (PDOException $e) {
    error_log('[ADUIN] ringkasan: ' . $e->getMessage());
    ringkasan_respons(null, 'Gagal memuat ringkasan laporan.', 500);
}