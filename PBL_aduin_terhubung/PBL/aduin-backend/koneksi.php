<?php
/**
 * Koneksi Database PostgreSQL (PDO)
 * Mata Kuliah: Pemrograman Web
 * Pengaturan ada di config.php
 */

$ADUIN = require __DIR__ . '/config.php';

try {
    $pdo = new PDO(
        "pgsql:host={$ADUIN['db_host']};port={$ADUIN['db_port']};dbname={$ADUIN['db_name']}",
        $ADUIN['db_user'],
        $ADUIN['db_pass'],
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]
    );
    $pdo->exec("SET TIME ZONE '" . $ADUIN['timezone'] . "'");
} catch (PDOException $e) {
    if (!headers_sent()) {
        header('Access-Control-Allow-Origin: *');
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(500);
    }
    echo json_encode([
        'success' => false,
        'message' => 'Koneksi database gagal. Periksa config.php (host, port, nama DB, user, password) '
                   . 'dan pastikan ekstensi pdo_pgsql aktif di php.ini.'
                   . ($ADUIN['debug'] ? ' Detail: ' . $e->getMessage() : ''),
        'data'    => null,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
