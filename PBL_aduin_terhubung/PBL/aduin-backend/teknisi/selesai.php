<?php
// ==================================================================
// MODUL: TEKNISI - SELESAIKAN TUGAS PERBAIKAN
// Pintasan untuk update_tugas.php dengan status_tugas = 'Selesai'.
// Field: id_pengaduan, id_teknisi, catatan_teknis, foto_hasil (opsional)
// ==================================================================

define('PAKSA_STATUS_TUGAS', 'Selesai');
require __DIR__ . '/update_tugas.php';
