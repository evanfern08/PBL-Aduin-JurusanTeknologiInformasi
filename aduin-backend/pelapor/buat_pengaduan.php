<?php
// ==================================================================
// MODUL: PELAPOR - BUAT PENGADUAN BARU
// Mata Kuliah: Pemrograman Web
// Deskripsi: Menerima laporan kerusakan fasilitas dari mahasiswa/dosen.
// Method   : POST (multipart/form-data atau JSON)
//            id_pelapor, id_ruangan, id_fasilitas, judul_laporan, deskripsi,
//            foto_bukti[] (opsional, maksimal 5 foto)
// ==================================================================

require_once __DIR__ . '/../koneksi.php';
require_once __DIR__ . '/../fungsi.php';

cors();
require_method('POST');

$input        = get_input();
$idPelapor    = (int)($input['id_pelapor'] ?? 0);
$idRuangan    = (int)($input['id_ruangan'] ?? 0);
$idFasilitas  = (int)($input['id_fasilitas'] ?? $input['id_kategori'] ?? 0);
$judulLaporan = trim((string)($input['judul_laporan'] ?? $input['judul_keluhan'] ?? ''));
$deskripsi    = trim((string)($input['deskripsi'] ?? ''));

if ($idPelapor <= 0 || $idRuangan <= 0 || $idFasilitas <= 0 || $judulLaporan === '' || $deskripsi === '') {
    json_response(null, 'Data belum lengkap. Harap isi ruangan, kategori fasilitas, dan deskripsi kerusakan.', 400);
}
$judulLaporan = potong_teks($judulLaporan, 150);

$fotoTersimpan = [];

try {
    ambil_user($pdo, $idPelapor, ['mahasiswa', 'dosen'], 'pelapor');

    $cek = $pdo->prepare("SELECT (SELECT COUNT(*) FROM ruangan WHERE id_ruangan = :r) AS r,
                                 (SELECT COUNT(*) FROM kategori_fasilitas WHERE id_fasilitas = :f) AS f");
    $cek->execute([':r' => $idRuangan, ':f' => $idFasilitas]);
    $c = $cek->fetch();
    if ((int)$c['r'] === 0) json_response(null, 'Ruangan tidak ditemukan.', 400);
    if ((int)$c['f'] === 0) json_response(null, 'Kategori fasilitas tidak ditemukan.', 400);

    // Foto bukti (opsional, sampai 5 file)
    $fotoTersimpan = upload_banyak_foto('foto_bukti', 'bukti', $ADUIN['max_foto_pengaduan']);
    $fotoBukti     = $fotoTersimpan ? implode(',', $fotoTersimpan) : null;

    $pdo->beginTransaction();

    $stmt = $pdo->prepare("INSERT INTO pengaduan
                (id_pelapor, id_ruangan, id_fasilitas, judul_laporan, deskripsi, foto_bukti, status, tanggal_lapor)
            VALUES (:id_pelapor, :id_ruangan, :id_fasilitas, :judul, :deskripsi, :foto, 'Menunggu Verifikasi', NOW())
            RETURNING id_pengaduan");
    $stmt->execute([
        ':id_pelapor'   => $idPelapor,
        ':id_ruangan'   => $idRuangan,
        ':id_fasilitas' => $idFasilitas,
        ':judul'        => $judulLaporan,
        ':deskripsi'    => $deskripsi,
        ':foto'         => $fotoBukti,
    ]);
    $idPengaduan = (int)$stmt->fetchColumn();

    catat_riwayat($pdo, $idPengaduan, $idPelapor, 'Menunggu Verifikasi', 'Laporan berhasil dikirim oleh pelapor.');

    $pdo->commit();

    json_response(
        ['id_pengaduan' => $idPengaduan, 'foto_bukti' => $fotoBukti, 'foto_list' => $fotoTersimpan],
        'Pengaduan berhasil diajukan.',
        201
    );

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    hapus_file_upload($fotoTersimpan);
    server_error($e, 'Gagal menyimpan pengaduan.');
}
