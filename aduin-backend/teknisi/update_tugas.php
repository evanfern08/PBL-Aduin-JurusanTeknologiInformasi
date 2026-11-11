<?php
// teknisi/update_tugas.php
require_once __DIR__ . '/../koneksi.php';
require_once __DIR__ . '/../fungsi.php';

cors();
require_method('POST');

$input = get_input();

$idPengaduan = (int)($_GET['id'] ?? $input['id_pengaduan'] ?? $input['id'] ?? 0);
$idTeknisi   = (int)($input['id_teknisi'] ?? 0);
$statusTugas = defined('PAKSA_STATUS_TUGAS')
    ? PAKSA_STATUS_TUGAS
    : trim((string)($input['status_tugas'] ?? ''));
$catatan     = trim((string)($input['catatan_teknis'] ?? $input['catatan'] ?? ''));

if ($idPengaduan <= 0) json_response(null, 'ID pengaduan tidak valid.', 400);
if ($idTeknisi   <= 0) json_response(null, 'ID teknisi wajib diisi.', 400);
if (!in_array($statusTugas, ['Tugas Baru', 'Sedang Dikerjakan', 'Selesai'], true)) {
    json_response(null, 'Status tugas tidak valid.', 400);
}

$fileBaru = [];

try {
    // 1) Validasi teknisi
    $teknisi = ambil_user($pdo, $idTeknisi, ['teknisi'], 'teknisi');

    // 2) Ambil tugas + status pengaduan + foto_hasil existing
    $stmt = $pdo->prepare("
        SELECT pt.*, p.status AS status_pengaduan
        FROM penanganan_tugas pt
        JOIN pengaduan p ON p.id_pengaduan = pt.id_pengaduan
        WHERE pt.id_pengaduan = :id
    ");
    $stmt->execute([':id' => $idPengaduan]);
    $tugas = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$tugas) {
        json_response(null, 'Tugas untuk pengaduan ini tidak ditemukan.', 404);
    }
    if ((int)$tugas['id_teknisi'] !== $idTeknisi) {
        json_response(null, 'Tugas ini ditugaskan kepada teknisi lain.', 403);
    }

    $sudahDiterima = ($tugas['status_pengaduan'] === 'Selesai');
    if (!$sudahDiterima && $tugas['status_pengaduan'] !== 'Diproses') {
        json_response(null, 'Laporan ini tidak sedang dalam tahap perbaikan.', 409);
    }

    // ============================================================
    // 3) VALIDASI SERVER-SIDE: FOTO HASIL WAJIB SAAT SELESAI
    // ============================================================
    $fotoHasilExisting  = trim((string)($tugas['foto_hasil'] ?? ''));
    $adaUploadFotoHasil = isset($_FILES['foto_hasil'])
                       && !empty($_FILES['foto_hasil']['name'])
                       && (int)($_FILES['foto_hasil']['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK;

    if ($statusTugas === 'Selesai' && !$adaUploadFotoHasil && $fotoHasilExisting === '') {
        json_response(null, 'Foto hasil pengerjaan wajib diisi.', 400);
    }

    // 4) Upload foto hasil (jika ada file baru)
    $fotoHasilBaru = null;
    if ($adaUploadFotoHasil) {
        $fotoHasilBaru = upload_foto($_FILES['foto_hasil'], 'hasil');
        if (!$fotoHasilBaru) {
            json_response(null, 'Gagal mengunggah foto hasil pengerjaan.', 500);
        }
        $fileBaru[] = $fotoHasilBaru;
    }

    $pdo->beginTransaction();

    $mulaiBaru = ($tugas['waktu_mulai'] === null);

    if ($sudahDiterima) {
        // Sudah final: hanya boleh melengkapi catatan & foto hasil
        $pdo->prepare("
            UPDATE penanganan_tugas
            SET catatan_teknisi = COALESCE(NULLIF(:c, ''), catatan_teknisi),
                foto_hasil      = COALESCE(:fh, foto_hasil)
            WHERE id_pengaduan = :id
        ")->execute([
            ':c'  => $catatan,
            ':fh' => $fotoHasilBaru,
            ':id' => $idPengaduan,
        ]);
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

        $pdo->prepare("
            UPDATE penanganan_tugas
            SET $setWaktu,
                catatan_teknisi = COALESCE(NULLIF(:c, ''), catatan_teknisi),
                foto_hasil      = COALESCE(:fh, foto_hasil)
            WHERE id_pengaduan = :id
        ")->execute([
            ':c'  => $catatan,
            ':fh' => $fotoHasilBaru,
            ':id' => $idPengaduan,
        ]);

        if ($statusTugas === 'Selesai') {
            catat_riwayat(
                $pdo, $idPengaduan, $idTeknisi, 'Menunggu Review Hasil',
                $catatan !== '' ? $catatan : 'Perbaikan telah selesai dikerjakan teknisi.'
            );
            $pesan = 'Tugas ditandai selesai. Menunggu review hasil oleh verifikator.';

        } elseif ($statusTugas === 'Sedang Dikerjakan'
                  && ($mulaiBaru || $tugas['waktu_selesai'] !== null)) {
            catat_riwayat(
                $pdo, $idPengaduan, $idTeknisi, 'Dalam Perbaikan',
                ($mulaiBaru ? 'Teknisi mulai mengerjakan perbaikan.' : 'Teknisi mengerjakan ulang perbaikan.')
                . ($catatan !== '' ? ' ' . $catatan : '')
            );
            $pesan = 'Status tugas diperbarui menjadi Sedang Dikerjakan.';

        } else {
            $pesan = 'Tugas berhasil diperbarui.';
        }
    }

    $pdo->commit();

    // 5) Hapus file lama setelah commit (hanya jika tergantikan)
    if ($fotoHasilBaru && $fotoHasilExisting !== '' && $fotoHasilExisting !== $fotoHasilBaru) {
        hapus_file_upload($fotoHasilExisting);
    }

    json_response(ambil_pengaduan($pdo, $idPengaduan), $pesan);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    hapus_file_upload($fileBaru);
    server_error($e, 'Gagal memperbarui tugas.');
}