-- ======================================================================
-- ADUIN - MIGRASI DATABASE (aman dijalankan berulang kali / idempotent)
--
-- Jalankan HANYA jika database kamu sebelumnya dibuat dari dump lama
-- (aduin_plain.sql). Jika kamu import database/aduin.sql yang baru,
-- file ini TIDAK perlu dijalankan karena sudah termasuk di dalamnya.
--
--   psql -U postgres -d aduin_db -f database/migrasi.sql
-- ======================================================================

BEGIN;

-- 1) PERBAIKAN BUG: sequence users sebelumnya di-set ke 1 (is_called = false),
--    sehingga registrasi akun baru selalu gagal "duplicate key id_user=1".
SELECT setval('public.users_id_user_seq',
              GREATEST((SELECT COALESCE(MAX(id_user), 0) FROM public.users), 1), true);
SELECT setval('public.teknisi_id_teknisi_seq',
              GREATEST((SELECT COALESCE(MAX(id_teknisi), 0) FROM public.teknisi), 1), true);
SELECT setval('public.sekjur_id_sekjur_seq',
              GREATEST((SELECT COALESCE(MAX(id_sekjur), 0) FROM public.sekjur), 1), true);
SELECT setval('public.pengaduan_id_pengaduan_seq',
              GREATEST((SELECT COALESCE(MAX(id_pengaduan), 0) FROM public.pengaduan), 1), true);
SELECT setval('public.riwayat_status_id_riwayat_seq',
              GREATEST((SELECT COALESCE(MAX(id_riwayat), 0) FROM public.riwayat_status), 1), true);
SELECT setval('public.penanganan_tugas_id_penanganan_seq',
              GREATEST((SELECT COALESCE(MAX(id_penanganan), 0) FROM public.penanganan_tugas), 1), true);

-- 2) Pelapor boleh mengunggah sampai 5 foto -> daftar path disimpan di satu kolom.
ALTER TABLE public.pengaduan ALTER COLUMN foto_bukti TYPE text;

-- 3) Penanganan tugas: foto sebelum, hitungan revisi, dan catatan revisi dari Kajur.
ALTER TABLE public.penanganan_tugas ADD COLUMN IF NOT EXISTS foto_sebelum varchar(255);
ALTER TABLE public.penanganan_tugas ADD COLUMN IF NOT EXISTS revisi_ke integer NOT NULL DEFAULT 0;
ALTER TABLE public.penanganan_tugas ADD COLUMN IF NOT EXISTS catatan_revisi text;

--    waktu_mulai sekarang baru terisi ketika teknisi benar-benar mulai mengerjakan.
--    NULL = "Tugas Baru", terisi = "Sedang Dikerjakan", waktu_selesai terisi = "Selesai".
ALTER TABLE public.penanganan_tugas ALTER COLUMN waktu_mulai DROP DEFAULT;

-- 4) Teknisi: ID/NIP dan status ketersediaan (dipakai halaman Kelola Teknisi).
ALTER TABLE public.teknisi ADD COLUMN IF NOT EXISTS nip varchar(30);
ALTER TABLE public.teknisi ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'Aktif';

DO $$
BEGIN
    ALTER TABLE public.teknisi
        ADD CONSTRAINT teknisi_status_check CHECK (status IN ('Aktif', 'Cuti', 'Nonaktif'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS teknisi_nip_key ON public.teknisi (nip) WHERE nip IS NOT NULL;

-- 5) Index untuk query yang sering dipakai.
CREATE INDEX IF NOT EXISTS idx_pengaduan_pelapor ON public.pengaduan (id_pelapor);
CREATE INDEX IF NOT EXISTS idx_pengaduan_status  ON public.pengaduan (status);
CREATE INDEX IF NOT EXISTS idx_riwayat_pengaduan ON public.riwayat_status (id_pengaduan);
CREATE INDEX IF NOT EXISTS idx_tugas_teknisi     ON public.penanganan_tugas (id_teknisi);

-- 6) Data contoh: pengaduan #6 berstatus "Diproses" tetapi belum punya penugasan teknisi,
--    sehingga tidak muncul di halaman teknisi manapun. Tugaskan ke teknisi yang ada.
INSERT INTO public.penanganan_tugas (id_pengaduan, id_teknisi, waktu_mulai)
SELECT 6, u.id_user, NULL
FROM public.users u
WHERE u.role = 'teknisi'
  AND EXISTS (SELECT 1 FROM public.pengaduan p WHERE p.id_pengaduan = 6 AND p.status = 'Diproses')
  AND NOT EXISTS (SELECT 1 FROM public.penanganan_tugas t WHERE t.id_pengaduan = 6)
ORDER BY u.id_user
LIMIT 1;

COMMIT;
