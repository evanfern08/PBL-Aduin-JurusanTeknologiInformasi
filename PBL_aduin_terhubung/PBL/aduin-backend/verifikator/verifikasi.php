<?php
// ==================================================================
// MODUL: VERIFIKATOR - PROSES VERIFIKASI PENGADUAN
// Mata Kuliah: Pemrograman Web
// Deskripsi: Semua keputusan Sekjur/Kajur atas sebuah pengaduan.
// Method   : POST (JSON atau form)
//   id_pengaduan (atau ?id=), id_verifikator, aksi, + parameter sesuai aksi
//
//   aksi              syarat status saat ini     parameter tambahan       status baru
//   ----------------  -------------------------  -----------------------  ----------------------
//   setujui_teknisi   Menunggu Verifikasi        id_teknisi               Diproses (Dalam Perbaikan)
//   teruskan_pusat    Menunggu Verifikasi        -                        Diteruskan ke Pusat
//   tolak             Menunggu Verifikasi        alasan                   Ditolak
//   batal_tolak       Ditolak                    alasan                   Menunggu Verifikasi
//   terima_hasil      Menunggu Review Hasil      -                        Selesai
//   tolak_hasil       Menunggu Review Hasil      alasan                   Diproses (Dalam Perbaikan)
//   selesai_pusat     Diteruskan ke Pusat        -                        Selesai
//
// Kompatibilitas: parameter lama "status" (Diproses/Disetujui/Ditolak/
//                 Diteruskan ke Pusat/Selesai) tetap dikenali.
// ==================================================================

require_once __DIR__ . '/../koneksi.php';
require_once __DIR__ . '/../fungsi.php';

cors();
require_method('POST');

$input = get_input();

$idPengaduan   = (int)($_GET['id'] ?? $input['id_pengaduan'] ?? $input['id'] ?? 0);
$idVerifikator = (int)($input['id_verifikator'] ?? $input['id_sekjur'] ?? 0);
$aksi          = trim((string)($input['aksi'] ?? ''));
$alasan        = trim((string)($input['alasan'] ?? $input['alasan_penolakan'] ?? $input['keterangan'] ?? ''));
$idTeknisi     = (int)($input['id_teknisi'] ?? 0);

if ($idPengaduan <= 0) json_response(null, 'ID pengaduan tidak valid.', 400);

try {
    $verifikator = ambil_user($pdo, $idVerifikator, ['sekjur'], 'verifikator');
    $p = ambil_pengaduan($pdo, $idPengaduan);
    if (!$p) json_response(null, 'Pengaduan tidak ditemukan.', 404);

    $statusUi = $p['status_ui'];

    // Terjemahkan parameter "status" versi lama menjadi aksi
    if ($aksi === '' && !empty($input['status'])) {
        switch (trim((string)$input['status'])) {
            case 'Diproses':
            case 'Disetujui':           $aksi = 'setujui_teknisi'; break;
            case 'Diteruskan ke Pusat': $aksi = 'teruskan_pusat'; break;
            case 'Ditolak':             $aksi = 'tolak'; break;
            case 'Selesai':             $aksi = ($statusUi === 'Diteruskan ke Pusat') ? 'selesai_pusat' : 'terima_hasil'; break;
        }
    }

    $syarat = [
        'setujui_teknisi' => 'Menunggu Verifikasi',
        'teruskan_pusat'  => 'Menunggu Verifikasi',
        'tolak'           => 'Menunggu Verifikasi',
        'batal_tolak'     => 'Ditolak',
        'terima_hasil'    => 'Menunggu Review Hasil',
        'tolak_hasil'     => 'Menunggu Review Hasil',
        'selesai_pusat'   => 'Diteruskan ke Pusat',
    ];
    if (!isset($syarat[$aksi])) {
        json_response(null, 'Aksi verifikasi tidak dikenali.', 400);
    }
    if ($statusUi !== $syarat[$aksi]) {
        json_response(null, "Aksi tidak dapat dilakukan: status laporan saat ini \"$statusUi\", seharusnya \"{$syarat[$aksi]}\".", 409);
    }
    if (in_array($aksi, ['tolak', 'batal_tolak', 'tolak_hasil'], true) && $alasan === '') {
        json_response(null, 'Alasan wajib diisi.', 400);
    }

    $pdo->beginTransaction();

    switch ($aksi) {

        case 'setujui_teknisi':
            if ($idTeknisi <= 0) {
                $pdo->rollBack();
                json_response(null, 'Pilih teknisi yang akan ditugaskan.', 400);
            }
            $cekT = $pdo->prepare("SELECT u.nama, t.status FROM users u JOIN teknisi t ON t.id_user = u.id_user
                                   WHERE u.id_user = :id AND u.role = 'teknisi'");
            $cekT->execute([':id' => $idTeknisi]);
            $t = $cekT->fetch();
            if (!$t) {
                $pdo->rollBack();
                json_response(null, 'Teknisi tidak ditemukan.', 404);
            }
            if ($t['status'] !== 'Aktif') {
                $pdo->rollBack();
                json_response(null, "Teknisi {$t['nama']} sedang berstatus {$t['status']} dan tidak dapat ditugaskan.", 409);
            }

            $pdo->prepare("UPDATE pengaduan SET status = 'Diproses', id_verifikator = :v, alasan_penolakan = NULL
                           WHERE id_pengaduan = :id")
                ->execute([':v' => $idVerifikator, ':id' => $idPengaduan]);

            // Satu penugasan per pengaduan (UNIQUE id_pengaduan): buat baru atau timpa penugasan lama.
            $pdo->prepare("INSERT INTO penanganan_tugas (id_pengaduan, id_teknisi, waktu_mulai, waktu_selesai, foto_hasil, foto_sebelum, catatan_teknisi, revisi_ke, catatan_revisi)
                           VALUES (:id, :t, NULL, NULL, NULL, NULL, NULL, 0, NULL)
                           ON CONFLICT (id_pengaduan) DO UPDATE
                           SET id_teknisi = EXCLUDED.id_teknisi, waktu_mulai = NULL, waktu_selesai = NULL,
                               foto_hasil = NULL, foto_sebelum = NULL, catatan_teknisi = NULL,
                               revisi_ke = 0, catatan_revisi = NULL")
                ->execute([':id' => $idPengaduan, ':t' => $idTeknisi]);

            catat_riwayat($pdo, $idPengaduan, $idVerifikator, 'Dalam Perbaikan',
                'Laporan disetujui dan ditugaskan ke teknisi ' . $t['nama'] . ($alasan !== '' ? '. ' . $alasan : '.'));
            $pesan = 'Laporan disetujui dan ditugaskan ke ' . $t['nama'] . '.';
            break;

        case 'teruskan_pusat':
            $pdo->prepare("UPDATE pengaduan SET status = 'Diteruskan ke Pusat', id_verifikator = :v, alasan_penolakan = NULL
                           WHERE id_pengaduan = :id")
                ->execute([':v' => $idVerifikator, ':id' => $idPengaduan]);
            catat_riwayat($pdo, $idPengaduan, $idVerifikator, 'Diteruskan ke Pusat',
                'Laporan diteruskan ke UPA PP Pusat' . ($alasan !== '' ? '. ' . $alasan : '.'));
            $pesan = 'Laporan diteruskan ke UPA PP Pusat.';
            break;

        case 'tolak':
            $pdo->prepare("UPDATE pengaduan SET status = 'Ditolak', id_verifikator = :v, alasan_penolakan = :a
                           WHERE id_pengaduan = :id")
                ->execute([':v' => $idVerifikator, ':a' => $alasan, ':id' => $idPengaduan]);
            catat_riwayat($pdo, $idPengaduan, $idVerifikator, 'Ditolak', 'Laporan ditolak: ' . $alasan);
            $pesan = 'Laporan ditolak.';
            break;

        case 'batal_tolak':
            $pdo->prepare("UPDATE pengaduan SET status = 'Menunggu Verifikasi', id_verifikator = NULL, alasan_penolakan = NULL
                           WHERE id_pengaduan = :id")
                ->execute([':id' => $idPengaduan]);
            catat_riwayat($pdo, $idPengaduan, $idVerifikator, 'Menunggu Verifikasi', 'Penolakan dibatalkan: ' . $alasan);
            $pesan = 'Penolakan dibatalkan. Laporan kembali ke antrean verifikasi.';
            break;

        case 'terima_hasil':
            $pdo->prepare("UPDATE pengaduan SET status = 'Selesai', id_verifikator = :v WHERE id_pengaduan = :id")
                ->execute([':v' => $idVerifikator, ':id' => $idPengaduan]);
            catat_riwayat($pdo, $idPengaduan, $idVerifikator, 'Selesai',
                'Hasil perbaikan diterima.' . ($alasan !== '' ? ' ' . $alasan : ''));
            $pesan = 'Hasil perbaikan diterima. Laporan selesai.';
            break;

        case 'tolak_hasil':
            $pdo->prepare("UPDATE penanganan_tugas
                           SET waktu_selesai = NULL, revisi_ke = revisi_ke + 1, catatan_revisi = :a
                           WHERE id_pengaduan = :id")
                ->execute([':a' => $alasan, ':id' => $idPengaduan]);
            catat_riwayat($pdo, $idPengaduan, $idVerifikator, 'Dalam Perbaikan', 'Hasil perbaikan ditolak: ' . $alasan);
            $pesan = 'Hasil ditolak. Laporan dikembalikan ke teknisi untuk dikerjakan ulang.';
            break;

        case 'selesai_pusat':
            $pdo->prepare("UPDATE pengaduan SET status = 'Selesai', id_verifikator = :v WHERE id_pengaduan = :id")
                ->execute([':v' => $idVerifikator, ':id' => $idPengaduan]);
            catat_riwayat($pdo, $idPengaduan, $idVerifikator, 'Selesai',
                'Penanganan di UPA PP Pusat selesai.' . ($alasan !== '' ? ' ' . $alasan : ''));
            $pesan = 'Laporan ditandai selesai.';
            break;
    }

    $pdo->commit();

    json_response(ambil_pengaduan($pdo, $idPengaduan), $pesan);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    server_error($e, 'Gagal memperbarui status verifikasi.');
}
