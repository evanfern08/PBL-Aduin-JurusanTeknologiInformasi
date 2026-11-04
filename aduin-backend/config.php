<?php
/**
 * Konfigurasi ADUIN (backend).
 *
 * Semua nilai bisa diganti lewat environment variable tanpa mengubah file ini,
 * contoh (Windows CMD):  set ADUIN_DB_PASS=rahasia
 * Jika tidak diatur, nilai default di bawah yang dipakai.
 */

// itu aja si

return [
    'db_host'  => getenv('ADUIN_DB_HOST') ?: 'localhost',
    'db_port'  => getenv('ADUIN_DB_PORT') ?: '5432',
    'db_name'  => getenv('ADUIN_DB_NAME') ?: 'aduin_db',
    'db_user'  => getenv('ADUIN_DB_USER') ?: 'postgres',
    'db_pass'  => getenv('ADUIN_DB_PASS') !== false ? getenv('ADUIN_DB_PASS') : 'y4sUd4hl4h',

    // Cloudinary (jika salah satu kosong, foto disimpan lokal di folder uploads/)
    'cloudinary_cloud_name' => 'v3xqfjax',
    'cloudinary_api_key'    => '341839249477862',
    'cloudinary_api_secret' => '7WCAh6BNIGUjofFEfdbCvGCjVNE',
    'cloudinary_folder'     => 'aduin',

    // true = pesan error teknis (SQL) ikut dikirim ke browser. Matikan saat demo/produksi.
    'debug'    => getenv('ADUIN_DEBUG') === '1',

    // Zona waktu sesi database, supaya NOW() konsisten (WIB).
    'timezone' => 'Asia/Jakarta',

    // Batas unggahan foto.
    'max_foto_bytes'   => 10 * 1024 * 1024,
    'max_foto_pengaduan' => 5,
];
