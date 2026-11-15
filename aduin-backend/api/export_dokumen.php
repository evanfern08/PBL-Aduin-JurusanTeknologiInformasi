<?php
/**
 * POST /api/export_dokumen.php
 * Batch export laporan "Diteruskan ke Pusat" ke surat Word (.docx) dari template.
 *
 * Body JSON : {"ids": [2, 5, 14], "id_verifikator": 3, "nomor_surat": "461/TI/RT/2026" (opsional)}
 * Respons   : file .docx (binary) bila sukses, atau JSON {success:false, message:...} bila gagal.
 *
 * Catatan Vercel: filesystem read-only kecuali /tmp, dan respons function maksimal ~4,5 MB.
 * Karena itu foto Cloudinary diperkecil lewat transformasi URL sebelum diunduh.
 */

declare(strict_types=1);

use PhpOffice\PhpWord\Settings;
use PhpOffice\PhpWord\TemplateProcessor;

// Pengaturan ukuran foto di sel tabel Word (piksel) - ubah sesuai selera
const FOTO_LEBAR  = 120;
const FOTO_TINGGI = 90;
const MAKS_LAPORAN = 40;               // batas aman agar tidak timeout / melebihi 4,5 MB
const MAKS_UKURAN_RESPONS = 4400000;   // ~4,2 MB (batas Vercel 4,5 MB)

date_default_timezone_set('Asia/Jakarta');
@ini_set('display_errors', '0');       // notice/warning PHP tidak boleh merusak file binary
ob_start();

/* ---------- CORS ---------- */
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Expose-Headers: Content-Disposition, Content-Length');
header('Access-Control-Max-Age: 86400');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../koneksi.php';   // membuat $pdo (Supabase PostgreSQL)
require_once __DIR__ . '/../fungsi.php';    // json_response(), get_input(), ambil_user(), daftar_foto()
require_once __DIR__ . '/../vendor/autoload.php';

/* ---------- File sementara: selalu dibersihkan, sukses maupun gagal ---------- */
$fileSementara = [];
register_shutdown_function(function () use (&$fileSementara) {
    foreach ($fileSementara as $f) {
        if (is_string($f) && is_file($f)) @unlink($f);
    }
});

/* ---------- Helper ---------- */
function tanggal_indonesia(?string $waktu = null): string
{
    $bulan = [1 => 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
              'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    try {
        $d = new DateTimeImmutable($waktu ?: 'now');
    } catch (Exception $e) {
        $d = new DateTimeImmutable('now');
    }
    return $d->format('j') . ' ' . $bulan[(int)$d->format('n')] . ' ' . $d->format('Y');
}

/* Cloudinary: minta versi JPG ringan (maks 800px). PhpWord tidak mendukung WEBP/HEIC,
 * dan file asli bisa berukuran MB sehingga dokumen melewati batas 4,5 MB Vercel. */
function url_foto_ringan(string $url): string
{
    if (preg_match('#^(https://res\.cloudinary\.com/[^/]+/image/upload/)(.+)$#i', $url, $m)) {
        $sisa = preg_replace('/\.[a-z0-9]+$/i', '.jpg', $m[2]);
        return $m[1] . 'f_jpg,w_800,c_limit,q_auto/' . $sisa;
    }
    return $url;
}

/* Unduh banyak gambar sekaligus (paralel) ke /tmp. Mengembalikan [kunci => path file valid]. */
function unduh_foto(array $daftarUrl, array &$fileSementara): array
{
    $mh = curl_multi_init();
    $tugas = [];
    foreach ($daftarUrl as $kunci => $url) {
        $path = tempnam(sys_get_temp_dir(), 'aduin_foto_');
        $fh = fopen($path, 'wb');
        $fileSementara[] = $path;
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_FILE            => $fh,
            CURLOPT_FOLLOWLOCATION  => true,
            CURLOPT_MAXREDIRS       => 3,
            CURLOPT_CONNECTTIMEOUT  => 5,
            CURLOPT_TIMEOUT         => 15,
            CURLOPT_FAILONERROR     => true,
            CURLOPT_MAXFILESIZE     => 8 * 1024 * 1024,
            CURLOPT_PROTOCOLS       => CURLPROTO_HTTP | CURLPROTO_HTTPS,
            CURLOPT_USERAGENT       => 'ADUIN-Export/1.0',
        ]);
        curl_multi_add_handle($mh, $ch);
        $tugas[$kunci] = [$ch, $fh, $path];
    }

    do {
        $status = curl_multi_exec($mh, $aktif);
        if ($aktif) curl_multi_select($mh, 1.0);
    } while ($aktif && $status === CURLM_OK);

    $hasil = [];
    foreach ($tugas as $kunci => [$ch, $fh, $path]) {
        $ok = curl_errno($ch) === 0 && (int)curl_getinfo($ch, CURLINFO_HTTP_CODE) === 200;
        curl_multi_remove_handle($mh, $ch);
        curl_close($ch);
        fclose($fh);
        if (!$ok || filesize($path) === 0) continue;

        // Pastikan isinya gambar yang didukung PhpWord, lalu beri ekstensi yang benar
        $info = @getimagesize($path);
        $ext = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_GIF => 'gif'][$info[2] ?? 0] ?? null;
        if ($ext === null) continue;
        $final = $path . '.' . $ext;
        if (@rename($path, $final)) {
            $fileSementara[] = $final;
            $hasil[$kunci] = $final;
        }
    }
    curl_multi_close($mh);
    return $hasil;
}

/* ---------- Main ---------- */
require_method('POST');

try {
    $input = get_input();

    // 1. Validasi ID laporan
    $ids = array_values(array_unique(array_filter(
        array_map('intval', (array)($input['ids'] ?? [])),
        fn ($v) => $v > 0
    )));
    if (!$ids) {
        json_response(null, 'Tidak ada laporan yang dipilih.', 400);
    }
    if (count($ids) > MAKS_LAPORAN) {
        json_response(null, 'Maksimal ' . MAKS_LAPORAN . ' laporan per dokumen. Pilih lebih sedikit laporan.', 400);
    }

    // 2. Hanya verifikator (sekjur) yang boleh export - pola sama dengan verifikasi.php
    ambil_user($pdo, (int)($input['id_verifikator'] ?? 0), ['sekjur'], 'verifikator');

    // 3. Ambil data laporan (nama tabel/kolom sesuai skema ADUIN)
    $in = implode(',', array_fill(0, count($ids), '?'));
    $sql = "SELECT p.id_pengaduan, p.judul_laporan, p.deskripsi, p.foto_bukti, p.tanggal_lapor,
                   r.nama_ruangan, r.lantai,
                   k.nama_kategori,
                   u.nama AS nama_pelapor
            FROM pengaduan p
            JOIN ruangan r            ON p.id_ruangan   = r.id_ruangan
            JOIN kategori_fasilitas k ON p.id_fasilitas = k.id_fasilitas
            JOIN users u              ON p.id_pelapor   = u.id_user
            WHERE p.id_pengaduan IN ($in)
            ORDER BY p.tanggal_lapor ASC, p.id_pengaduan ASC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($ids);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!$data) {
        json_response(null, 'Data laporan tidak ditemukan.', 404);
    }

    // 4. Unduh foto pertama tiap laporan (foto_bukti bisa berisi beberapa URL dipisah koma)
    $urlFoto = [];
    foreach ($data as $i => $row) {
        $pertama = daftar_foto($row['foto_bukti'] ?? null)[0] ?? '';
        if (preg_match('#^https?://#i', $pertama)) {
            $urlFoto[$i] = url_foto_ringan($pertama);
        }
    }
    $fotoLokal = $urlFoto ? unduh_foto($urlFoto, $fileSementara) : [];

    // 5. Load template
    $pathTemplate = __DIR__ . '/../templates/template_laporan_pusat.docx';
    if (!is_file($pathTemplate)) {
        json_response(null, 'Template Word tidak ditemukan di templates/template_laporan_pusat.docx.', 500);
    }
    Settings::setOutputEscapingEnabled(true);   // teks pengguna (&, <, >) aman di XML Word
    $tp = new TemplateProcessor($pathTemplate);

    // 6. Variabel global surat
    $nomor = trim((string)($input['nomor_surat'] ?? ''));
    $tp->setValue('nomor_surat', $nomor !== '' ? $nomor : '……../TI/RT/' . date('Y'));
    $tp->setValue('tanggal_surat', tanggal_indonesia());
    $tp->setValue('total_laporan', (string)count($data));

    // 7. Gandakan baris tabel (placeholder ${no} ada di baris yang akan digandakan)
    $tp->cloneRow('no', count($data));

    // 8. Isi tiap baris. Setelah cloneRow, nama menjadi no#1, lokasi#1, dst.
    foreach ($data as $idx => $row) {
        $n = $idx + 1;
        $lokasi = $row['nama_ruangan'] . ($row['lantai'] !== null && $row['lantai'] !== '' ? ' Lantai ' . $row['lantai'] : '');
        $tp->setValues([
            "no#$n"          => (string)$n,
            "tanggal#$n"     => tanggal_indonesia($row['tanggal_lapor']),
            "lokasi#$n"      => $lokasi,
            "ruangan#$n"     => $row['nama_ruangan'],
            "kategori#$n"    => $row['nama_kategori'],
            "nama_barang#$n" => $row['judul_laporan'],
            "judul#$n"       => $row['judul_laporan'],
            "jumlah#$n"      => '1',
            "kerusakan#$n"   => $row['deskripsi'],
            "deskripsi#$n"   => $row['deskripsi'],
            "pelapor#$n"     => $row['nama_pelapor'],
        ]);

        if (isset($fotoLokal[$idx])) {
            $tp->setImageValue("foto#$n", [
                'path'   => $fotoLokal[$idx],
                'width'  => FOTO_LEBAR,
                'height' => FOTO_TINGGI,
                'ratio'  => true,
            ]);
        } else {
            $tp->setValue("foto#$n", 'Tidak ada foto bukti');
        }
    }

    // 9. Simpan ke /tmp (file foto TIDAK boleh dihapus sebelum saveAs selesai)
    $hasil = tempnam(sys_get_temp_dir(), 'aduin_docx_');
    $fileSementara[] = $hasil;
    $tp->saveAs($hasil);

    $ukuran = (int)filesize($hasil);
    if ($ukuran > MAKS_UKURAN_RESPONS) {
        json_response(null, 'Dokumen terlalu besar (' . round($ukuran / 1048576, 1) . ' MB) untuk diunduh sekaligus. Pilih lebih sedikit laporan.', 413);
    }

    // 10. Kirim ke browser
    $namaFile = 'Laporan_Kerusakan_UPA_PP_' . date('Y-m-d') . '.docx';
    while (ob_get_level() > 0) ob_end_clean();
    header('Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    header('Content-Disposition: attachment; filename="' . $namaFile . '"');
    header('Content-Length: ' . $ukuran);
    header('Cache-Control: no-store');
    http_response_code(200);
    readfile($hasil);
    exit;   // register_shutdown_function menghapus semua file di /tmp

} catch (Throwable $e) {
    while (ob_get_level() > 0) ob_end_clean();
    server_error($e, 'Gagal membuat dokumen Word.');
}
