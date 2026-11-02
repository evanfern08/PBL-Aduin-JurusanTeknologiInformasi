<?php
/**
 * Test Koneksi Database PostgreSQL Native
 * Mata Kuliah: Pemrograman Web
 */

require_once __DIR__ . '/koneksi.php';
require_once __DIR__ . '/fungsi.php';

cors();

try {
    $stmt = $pdo->query("SELECT version()");
    $version = $stmt->fetchColumn();

    json_response([
        'database'  => 'PostgreSQL 18',
        'connected' => true,
        'version'   => $version
    ], 'Berhasil terhubung ke database PostgreSQL 18!');
} catch (Exception $e) {
    json_response(null, 'Gagal terhubung ke database: ' . $e->getMessage(), 500);
}
