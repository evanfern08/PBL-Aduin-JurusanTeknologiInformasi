<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../koneksi.php';
require_once __DIR__ . '/../fungsi.php';

function daftar_laporan_respons(array $body, int $status = 200): void {
    if (!headers_sent()) {
        http_response_code($status);
    }
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    daftar_laporan_respons(['ok' => false, 'message' => 'Metode tidak diizinkan. Gunakan GET.'], 405);
}

$idVerifikatorInput = $_GET['id_verifikator'] ?? null;
$idVerifikator = filter_var(is_scalar($idVerifikatorInput) ? $idVerifikatorInput : null, FILTER_VALIDATE_INT);
if (!$idVerifikator || $idVerifikator <= 0) {
    daftar_laporan_respons(['ok' => false, 'message' => 'Akses ditolak: hanya verifikator yang boleh membuka daftar laporan.'], 403);
}

try {
    $cekVerifikator = $pdo->prepare("SELECT role FROM users WHERE id_user = :id");
    $cekVerifikator->execute([':id' => $idVerifikator]);
    if ($cekVerifikator->fetchColumn() !== 'sekjur') {
        daftar_laporan_respons(['ok' => false, 'message' => 'Akses ditolak: hanya verifikator yang boleh membuka daftar laporan.'], 403);
    }

    $zonaWaktu = new DateTimeZone('Asia/Jakarta');
    $hariIni = new DateTimeImmutable('today', $zonaWaktu);
    $tanggalDariDefault = $hariIni->modify('-7 days')->format('Y-m-d');
    $tanggalSampaiDefault = $hariIni->format('Y-m-d');

    $parseTanggal = static function ($value, string $fallback) use ($zonaWaktu): string {
        if ($value === null || $value === '') {
            return $fallback;
        }
        if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            daftar_laporan_respons(['ok' => false, 'message' => 'Format tanggal harus YYYY-MM-DD.'], 400);
        }
        $tanggal = DateTimeImmutable::createFromFormat('!Y-m-d', $value, $zonaWaktu);
        $errors = DateTimeImmutable::getLastErrors();
        if (!$tanggal || ($errors !== false && ($errors['warning_count'] > 0 || $errors['error_count'] > 0)) || $tanggal->format('Y-m-d') !== $value) {
            daftar_laporan_respons(['ok' => false, 'message' => 'Tanggal tidak valid.'], 400);
        }
        return $value;
    };

    $perPageValue = $_GET['per_page'] ?? 10;
    $perPageInput = filter_var(is_scalar($perPageValue) ? $perPageValue : null, FILTER_VALIDATE_INT);
    $perPage = in_array($perPageInput, [10, 25, 50], true) ? $perPageInput : 10;
    $pageValue = $_GET['page'] ?? 1;
    $pageInput = filter_var(is_scalar($pageValue) ? $pageValue : null, FILTER_VALIDATE_INT);
    $page = $pageInput && $pageInput > 0 ? $pageInput : 1;
    $statusValue = $_GET['status'] ?? '';
    if (!is_string($statusValue)) {
        daftar_laporan_respons(['ok' => false, 'message' => 'Parameter status tidak valid.'], 400);
    }
    $status = trim($statusValue);
    if ($status === 'Semua') {
        $status = '';
    }

    $tanggalAda = !empty($_GET['tanggal_dari']) || !empty($_GET['tanggal_sampai']);
    $semuaTanggal = (($_GET['tanggal_semua'] ?? '') === '1') || (!$tanggalAda && $status !== '');
    $tanggalDari = null;
    $tanggalSampai = null;
    $where = ' WHERE 1 = 1';
    $parameter = [];
    if (!$semuaTanggal) {
        $tanggalDari = $parseTanggal($_GET['tanggal_dari'] ?? null, $tanggalDariDefault);
        $tanggalSampai = $parseTanggal($_GET['tanggal_sampai'] ?? null, $tanggalSampaiDefault);
        if ($tanggalDari > $tanggalSampai) {
            daftar_laporan_respons(['ok' => false, 'message' => 'Tanggal dari tidak boleh melewati tanggal sampai.'], 400);
        }
        $where .= " AND p.tanggal_lapor >= :tanggal_dari
                    AND p.tanggal_lapor < (CAST(:tanggal_sampai AS date) + INTERVAL '1 day')";
        $parameter = [
            ':tanggal_dari' => $tanggalDari,
            ':tanggal_sampai' => $tanggalSampai,
        ];
    }

    $statusParamMap = [
        'menunggu_verifikasi' => 'Menunggu Verifikasi',
        'diteruskan_ke_pusat' => 'Diteruskan ke Pusat',
        'dalam_perbaikan' => 'Dalam Perbaikan',
        'menunggu_review_hasil' => 'Menunggu Review Hasil',
        'selesai' => 'Selesai',
        'ditolak' => 'Ditolak',
    ];
    $status = $statusParamMap[$status] ?? $status;
    if ($status !== '') {
        $where .= ' AND (' . sql_status_ui_case() . ') = :status';
        $parameter[':status'] = $status;
    }

    $from = ' FROM pengaduan p LEFT JOIN penanganan_tugas pt ON pt.id_pengaduan = p.id_pengaduan';
    $stmtTotal = $pdo->prepare('SELECT COUNT(*)' . $from . $where);
    $stmtTotal->execute($parameter);
    $total = (int)$stmtTotal->fetchColumn();
    $totalPages = (int)ceil($total / $perPage);
    $page = min($page, max(1, $totalPages));
    $offset = ($page - 1) * $perPage;

    $stmtData = $pdo->prepare(sql_pengaduan_select() . $where . ' ORDER BY p.tanggal_lapor DESC, p.id_pengaduan DESC LIMIT :per_page OFFSET :offset');
    foreach ($parameter as $name => $value) {
        $stmtData->bindValue($name, $value, PDO::PARAM_STR);
    }
    $stmtData->bindValue(':per_page', $perPage, PDO::PARAM_INT);
    $stmtData->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmtData->execute();
    $laporan = array_map('format_pengaduan', $stmtData->fetchAll());

    if ($laporan) {
        $idLaporan = array_column($laporan, 'id_pengaduan');
        $stmtRiwayat = $pdo->prepare(
            'SELECT rs.id_riwayat, rs.id_pengaduan, rs.changed_by, rs.status_baru, rs.keterangan,
                    rs."timestamp", u.nama AS nama_pengubah, u.role AS role_pengubah
             FROM riwayat_status rs
             JOIN users u ON u.id_user = rs.changed_by
             WHERE rs.id_pengaduan IN (' . implode(', ', array_fill(0, count($idLaporan), '?')) . ')
             ORDER BY rs."timestamp" ASC, rs.id_riwayat ASC'
        );
        foreach ($idLaporan as $index => $id) {
            $stmtRiwayat->bindValue($index + 1, $id, PDO::PARAM_INT);
        }
        $stmtRiwayat->execute();

        $riwayatPerLaporan = [];
        foreach ($stmtRiwayat->fetchAll() as $riwayat) {
            $riwayatPerLaporan[(int)$riwayat['id_pengaduan']][] = $riwayat;
        }
        foreach ($laporan as &$item) {
            $item['riwayat_status'] = $riwayatPerLaporan[$item['id_pengaduan']] ?? [];
        }
        unset($item);
    }

    daftar_laporan_respons([
        'ok' => true,
        'data' => $laporan,
        'meta' => [
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'total_pages' => $totalPages,
            'tanggal_dari' => $tanggalDari,
            'tanggal_sampai' => $tanggalSampai,
        ],
    ]);
} catch (PDOException $e) {
    error_log('[ADUIN] laporan_daftar: ' . $e->getMessage());
    daftar_laporan_respons(['ok' => false, 'message' => 'Gagal memuat daftar laporan.'], 500);
}
