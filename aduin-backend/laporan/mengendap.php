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

function respons_laporan_mengendap(array $body, int $status = 200): void {
    if (!headers_sent()) {
        http_response_code($status);
    }
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    respons_laporan_mengendap(['ok' => false, 'pesan' => 'Metode tidak diizinkan. Gunakan GET.'], 405);
}

$idVerifikatorInput = $_GET['id_verifikator'] ?? null;
$idVerifikator = filter_var(is_scalar($idVerifikatorInput) ? $idVerifikatorInput : null, FILTER_VALIDATE_INT);
if (!$idVerifikator || $idVerifikator <= 0) {
    respons_laporan_mengendap(['ok' => false, 'pesan' => 'Akses ditolak.'], 403);
}

try {
    $cekVerifikator = $pdo->prepare('SELECT role FROM users WHERE id_user = :id');
    $cekVerifikator->bindValue(':id', $idVerifikator, PDO::PARAM_INT);
    $cekVerifikator->execute();
    if ($cekVerifikator->fetchColumn() !== 'sekjur') {
        respons_laporan_mengendap(['ok' => false, 'pesan' => 'Akses ditolak.'], 403);
    }

    $pdo->exec("SET TIME ZONE 'Asia/Jakarta'");
    $stmt = $pdo->prepare(
        'SELECT p.id_pengaduan, p.judul_laporan AS judul, r.nama_ruangan AS lokasi,
                (CURRENT_DATE - MAX(rs."timestamp")::date) AS hari_mengendap
         FROM pengaduan p
         JOIN riwayat_status rs ON rs.id_pengaduan = p.id_pengaduan
         JOIN ruangan r ON r.id_ruangan = p.id_ruangan
         WHERE p.status = :status_pengaduan
           AND rs.status_baru = :status_riwayat
         GROUP BY p.id_pengaduan, p.judul_laporan, r.nama_ruangan
         HAVING (CURRENT_DATE - MAX(rs."timestamp")::date) > :batas_hari
         ORDER BY hari_mengendap DESC, p.id_pengaduan DESC'
    );
    $stmt->bindValue(':status_pengaduan', 'Diteruskan ke Pusat', PDO::PARAM_STR);
    $stmt->bindValue(':status_riwayat', 'Diteruskan ke Pusat', PDO::PARAM_STR);
    $stmt->bindValue(':batas_hari', 3, PDO::PARAM_INT);
    $stmt->execute();

    $data = array_map(static function (array $row): array {
        return [
            'id_pengaduan' => (int)$row['id_pengaduan'],
            'judul' => $row['judul'],
            'lokasi' => $row['lokasi'],
            'hari_mengendap' => (int)$row['hari_mengendap'],
        ];
    }, $stmt->fetchAll());

    respons_laporan_mengendap([
        'ok' => true,
        'data' => $data,
        'meta' => ['total' => count($data)],
    ]);
} catch (PDOException $e) {
    error_log('[ADUIN] laporan_mengendap: ' . $e->getMessage());
    respons_laporan_mengendap(['ok' => false, 'pesan' => 'Gagal memuat laporan mengendap.'], 500);
}