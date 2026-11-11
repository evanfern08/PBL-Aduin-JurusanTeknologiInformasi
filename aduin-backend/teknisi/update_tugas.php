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

$input = get_input();

$idPengaduan = (int)($_GET['id'] ?? $input['id_pengaduan'] ?? $input['id'] ?? 0);
$idTeknisi   = (int)($input['id_teknisi'] ?? 0);
$statusTugas = defined('PAKSA_STATUS_TUGAS') ? PAKSA_STATUS_TUGAS : trim((string)($input['status_tugas'] ?? ''));
$catatan     = trim((string)($input['catatan_teknis'] ?? $input['catatan'] ?? ''));

if ($idPengaduan <= 0) json_response(null, 'ID pengaduan tidak valid.', 400);
if ($idTeknisi <= 0)   json_response(null, 'ID teknisi wajib diisi.', 400);
if (!in_array($statusTugas, ['Tugas Baru', 'Sedang Dikerjakan', 'Selesai'], true)) {
    json_response(null, "Status tugas tidak valid. Pilihan: Tugas Baru, Sedang Dikerjakan, Selesai.", 400);
}

$fileBaru = [];

try {
    $teknisi = ambil_user($pdo, $idTeknisi, ['teknisi'], 'teknisi');

    $stmt = $pdo->prepare("SELECT pt.*, p.status AS status_pengaduan
                           FROM penanganan_tugas pt
                           JOIN pengaduan p ON p.id_pengaduan = pt.id_pengaduan
                           WHERE pt.id_pengaduan = :id");
    $stmt->execute([':id' => $idPengaduan]);
    $tugas = $stmt->fetch();

    if (!$tugas) {
        json_response(null, 'Tugas untuk pengaduan ini tidak ditemukan.', 404);
    }
    if ((int)$tugas['id_teknisi'] !== $idTeknisi) {
        json_response(null, 'Tugas ini ditugaskan kepada teknisi lain.', 403);
    }

    $sudahDiterima = $tugas['status_pengaduan'] === 'Selesai';
    if (!$sudahDiterima && $tugas['status_pengaduan'] !== 'Diproses') {
        json_response(null, 'Laporan ini tidak sedang dalam tahap perbaikan.', 409);
    }

    // Validasi server-side: foto hasil wajib saat status Selesai
    $fotoHasilExisting = isset($tugas['foto_hasil']) ? trim((string)$tugas['foto_hasil']) : '';
    $adaUploadFotoHasil = isset($_FILES['foto_hasil']) && !empty($_FILES['foto_hasil']['name']);
    if ($statusTugas === 'Selesai' && !$adaUploadFotoHasil && $fotoHasilExisting === '') {
        json_response(null, 'Foto hasil pengerjaan wajib diisi', 400);
    }

    // Foto hasil (opsional di status lain, wajib terpenuhi di Selesai). Foto sebelum berasal dari pengaduan (pelapor), bukan upload teknisi.
    $fotoHasil = null;
    if ($adaUploadFotoHasil) {
        $fotoHasil = upload_foto($_FILES['foto_hasil'], 'hasil');
        if ($fotoHasil) $fileBaru[] = $fotoHasil;
    }

    $pdo->beginTransaction();

    $mulaiBaru = $tugas['waktu_mulai'] === null;

    if ($sudahDiterima) {
        // Hasil sudah diterima verifikator: hanya catatan & bukti foto hasil yang boleh dilengkapi.
        $pdo->prepare("UPDATE penanganan_tugas
                       SET catatan_teknisi = COALESCE(NULLIF(:c, ''), catatan_teknisi),
                           foto_hasil      = COALESCE(:fh, foto_hasil)
                       WHERE id_pengaduan = :id")
            ->execute([':c' => $catatan, ':fh' => $fotoHasil, ':id' => $idPengaduan]);
        $pesan = 'Catatan dan bukti pengerjaan diperbarui.';

    } else {
        switch ($statusTugas) {
            case 'Tugas Baru':
                $setWaktu = "waktu_mulai = NULL, waktu_selesai = NULL";
                break;
            case 'Sedang Dikerjakan':
                $setWaktu = "waktu_mulai = COALESCE(waktu_mulai, NOW()), waktu_selesai = NULL";
                break;
            default: // Selesai
                $setWaktu = "waktu_mulai = COALESCE(waktu_mulai, NOW()), waktu_selesai = NOW()";
        }

        $pdo->prepare("UPDATE penanganan_tugas
                       SET $setWaktu,
                           catatan_teknisi = COALESCE(NULLIF(:c, ''), catatan_teknisi),
                           foto_hasil      = COALESCE(:fh, foto_hasil)
                       WHERE id_pengaduan = :id")
            ->execute([':c' => $catatan, ':fh' => $fotoHasil, ':id' => $idPengaduan]);

        if ($statusTugas === 'Selesai') {
            catat_riwayat($pdo, $idPengaduan, $idTeknisi, 'Menunggu Review Hasil',
                $catatan !== '' ? $catatan : 'Perbaikan telah selesai dikerjakan teknisi.');
            $pesan = 'Tugas ditandai selesai. Menunggu review hasil oleh verifikator.';
        } elseif ($statusTugas === 'Sedang Dikerjakan' && ($mulaiBaru || $tugas['waktu_selesai'] !== null)) {
            catat_riwayat($pdo, $idPengaduan, $idTeknisi, 'Dalam Perbaikan',
                ($mulaiBaru ? 'Teknisi mulai mengerjakan perbaikan.' : 'Teknisi mengerjakan ulang perbaikan.')
                . ($catatan !== '' ? ' ' . $catatan : ''));
            $pesan = 'Status tugas diperbarui menjadi Sedang Dikerjakan.';
        } else {
            $pesan = 'Tugas berhasil diperbarui.';
        }
    }

    // Hapus file lama yang tergantikan foto baru
    $pdo->commit();
    if ($fotoHasil && $fotoHasilExisting !== '') hapus_file_upload($fotoHasilExisting);

    json_response(ambil_pengaduan($pdo, $idPengaduan), $pesan);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    hapus_file_upload($fileBaru);
    server_error($e, 'Gagal memperbarui tugas.');
}
