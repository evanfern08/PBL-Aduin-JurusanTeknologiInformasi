-- ======================================================================
-- ADUIN - DATABASE LENGKAP (struktur + data contoh), sudah termasuk migrasi.
-- Import ke database KOSONG bernama aduin_db:
--   createdb -U postgres aduin_db
--   psql -U postgres -d aduin_db -f database/aduin.sql
-- (atau pgAdmin: klik kanan aduin_db > Query Tool > buka file ini > Execute)
-- Akun contoh: lihat README.md (password semua akun contoh: password123)
-- ======================================================================
--
-- PostgreSQL database dump
--


-- Dumped from database version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: dosen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dosen (
    nip character varying(30) NOT NULL,
    bidang_keahlian character varying(100),
    id_user integer
);


--
-- Name: kategori_fasilitas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kategori_fasilitas (
    id_fasilitas integer NOT NULL,
    nama_kategori character varying(100) NOT NULL,
    deskripsi text
);


--
-- Name: kategori_fasilitas_id_fasilitas_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.kategori_fasilitas_id_fasilitas_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: kategori_fasilitas_id_fasilitas_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.kategori_fasilitas_id_fasilitas_seq OWNED BY public.kategori_fasilitas.id_fasilitas;


--
-- Name: mahasiswa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mahasiswa (
    nim character varying(20) NOT NULL,
    prodi character varying(100) NOT NULL,
    id_user integer
);


--
-- Name: penanganan_tugas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.penanganan_tugas (
    id_penanganan integer NOT NULL,
    id_pengaduan integer NOT NULL,
    id_teknisi integer NOT NULL,
    waktu_mulai timestamp without time zone,
    waktu_selesai timestamp without time zone,
    foto_hasil character varying(255),
    catatan_teknisi text,
    foto_sebelum character varying(255),
    revisi_ke integer DEFAULT 0 NOT NULL,
    catatan_revisi text
);


--
-- Name: penanganan_tugas_id_penanganan_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.penanganan_tugas_id_penanganan_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: penanganan_tugas_id_penanganan_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.penanganan_tugas_id_penanganan_seq OWNED BY public.penanganan_tugas.id_penanganan;


--
-- Name: pengaduan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pengaduan (
    id_pengaduan integer NOT NULL,
    id_pelapor integer NOT NULL,
    id_ruangan integer NOT NULL,
    id_fasilitas integer NOT NULL,
    judul_laporan character varying(150) NOT NULL,
    deskripsi text NOT NULL,
    foto_bukti text,
    status character varying(30) DEFAULT 'Menunggu Verifikasi'::character varying,
    alasan_penolakan text,
    tanggal_lapor timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    id_verifikator integer,
    CONSTRAINT pengaduan_status_check CHECK (((status)::text = ANY (ARRAY[('Menunggu Verifikasi'::character varying)::text, ('Diproses'::character varying)::text, ('Diteruskan ke Pusat'::character varying)::text, ('Ditolak'::character varying)::text, ('Selesai'::character varying)::text])))
);


--
-- Name: pengaduan_id_pengaduan_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pengaduan_id_pengaduan_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pengaduan_id_pengaduan_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pengaduan_id_pengaduan_seq OWNED BY public.pengaduan.id_pengaduan;


--
-- Name: riwayat_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.riwayat_status (
    id_riwayat integer NOT NULL,
    id_pengaduan integer NOT NULL,
    changed_by integer NOT NULL,
    status_baru character varying(30) NOT NULL,
    keterangan text,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: riwayat_status_id_riwayat_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.riwayat_status_id_riwayat_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: riwayat_status_id_riwayat_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.riwayat_status_id_riwayat_seq OWNED BY public.riwayat_status.id_riwayat;


--
-- Name: ruangan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ruangan (
    id_ruangan integer NOT NULL,
    nama_ruangan character varying(150) NOT NULL,
    lantai integer NOT NULL
);


--
-- Name: ruangan_id_ruangan_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ruangan_id_ruangan_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ruangan_id_ruangan_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ruangan_id_ruangan_seq OWNED BY public.ruangan.id_ruangan;


--
-- Name: sekjur; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sekjur (
    id_sekjur integer NOT NULL,
    nip character varying(30) NOT NULL,
    jabatan character varying(100),
    id_user integer
);


--
-- Name: sekjur_id_sekjur_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sekjur_id_sekjur_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sekjur_id_sekjur_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sekjur_id_sekjur_seq OWNED BY public.sekjur.id_sekjur;


--
-- Name: teknisi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teknisi (
    id_teknisi integer NOT NULL,
    spesialisasi character varying(100),
    id_user integer,
    nip character varying(30),
    status character varying(20) DEFAULT 'Aktif'::character varying NOT NULL,
    CONSTRAINT teknisi_status_check CHECK (((status)::text = ANY ((ARRAY['Aktif'::character varying, 'Cuti'::character varying, 'Nonaktif'::character varying])::text[])))
);


--
-- Name: teknisi_id_teknisi_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.teknisi_id_teknisi_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: teknisi_id_teknisi_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.teknisi_id_teknisi_seq OWNED BY public.teknisi.id_teknisi;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id_user integer NOT NULL,
    nama character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    password character varying(255) NOT NULL,
    role character varying(20) NOT NULL,
    foto_user character varying(255),
    CONSTRAINT users_role_check CHECK (((role)::text = ANY (ARRAY[('mahasiswa'::character varying)::text, ('dosen'::character varying)::text, ('sekjur'::character varying)::text, ('teknisi'::character varying)::text])))
);


--
-- Name: users_id_user_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_user_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_user_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_user_seq OWNED BY public.users.id_user;


--
-- Name: kategori_fasilitas id_fasilitas; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kategori_fasilitas ALTER COLUMN id_fasilitas SET DEFAULT nextval('public.kategori_fasilitas_id_fasilitas_seq'::regclass);


--
-- Name: penanganan_tugas id_penanganan; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.penanganan_tugas ALTER COLUMN id_penanganan SET DEFAULT nextval('public.penanganan_tugas_id_penanganan_seq'::regclass);


--
-- Name: pengaduan id_pengaduan; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pengaduan ALTER COLUMN id_pengaduan SET DEFAULT nextval('public.pengaduan_id_pengaduan_seq'::regclass);


--
-- Name: riwayat_status id_riwayat; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.riwayat_status ALTER COLUMN id_riwayat SET DEFAULT nextval('public.riwayat_status_id_riwayat_seq'::regclass);


--
-- Name: ruangan id_ruangan; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ruangan ALTER COLUMN id_ruangan SET DEFAULT nextval('public.ruangan_id_ruangan_seq'::regclass);


--
-- Name: sekjur id_sekjur; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sekjur ALTER COLUMN id_sekjur SET DEFAULT nextval('public.sekjur_id_sekjur_seq'::regclass);


--
-- Name: teknisi id_teknisi; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teknisi ALTER COLUMN id_teknisi SET DEFAULT nextval('public.teknisi_id_teknisi_seq'::regclass);


--
-- Name: users id_user; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id_user SET DEFAULT nextval('public.users_id_user_seq'::regclass);


--
-- Data for Name: dosen; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: kategori_fasilitas; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.kategori_fasilitas (id_fasilitas, nama_kategori, deskripsi) VALUES (1, 'AC', 'Fasilitas pendingin ruangan');
INSERT INTO public.kategori_fasilitas (id_fasilitas, nama_kategori, deskripsi) VALUES (2, 'Komputer', 'Komputer atau PC yang digunakan untuk kegiatan perkuliahan');
INSERT INTO public.kategori_fasilitas (id_fasilitas, nama_kategori, deskripsi) VALUES (3, 'Proyektor', 'Perangkat proyeksi untuk kegiatan pembelajaran dan presentasi');
INSERT INTO public.kategori_fasilitas (id_fasilitas, nama_kategori, deskripsi) VALUES (4, 'Monitor', 'Monitor atau layar komputer');
INSERT INTO public.kategori_fasilitas (id_fasilitas, nama_kategori, deskripsi) VALUES (5, 'Jaringan Internet', 'Koneksi internet dan jaringan Wi-Fi');
INSERT INTO public.kategori_fasilitas (id_fasilitas, nama_kategori, deskripsi) VALUES (6, 'Listrik', 'Stop kontak, sumber listrik, dan instalasi listrik');
INSERT INTO public.kategori_fasilitas (id_fasilitas, nama_kategori, deskripsi) VALUES (7, 'Lampu', 'Lampu penerangan ruangan');
INSERT INTO public.kategori_fasilitas (id_fasilitas, nama_kategori, deskripsi) VALUES (8, 'Kursi', 'Kursi untuk mahasiswa, dosen, atau pengguna ruangan');
INSERT INTO public.kategori_fasilitas (id_fasilitas, nama_kategori, deskripsi) VALUES (9, 'Meja', 'Meja untuk kegiatan perkuliahan dan pekerjaan');
INSERT INTO public.kategori_fasilitas (id_fasilitas, nama_kategori, deskripsi) VALUES (10, 'Pintu', 'Pintu dan komponen pendukungnya');
INSERT INTO public.kategori_fasilitas (id_fasilitas, nama_kategori, deskripsi) VALUES (11, 'Jendela', 'Jendela dan komponen pendukungnya');
INSERT INTO public.kategori_fasilitas (id_fasilitas, nama_kategori, deskripsi) VALUES (12, 'Toilet', 'Fasilitas dan perlengkapan toilet');
INSERT INTO public.kategori_fasilitas (id_fasilitas, nama_kategori, deskripsi) VALUES (13, 'Papan Tulis', 'Papan tulis dan perlengkapannya');
INSERT INTO public.kategori_fasilitas (id_fasilitas, nama_kategori, deskripsi) VALUES (14, 'CCTV', 'Perangkat kamera pengawas');
INSERT INTO public.kategori_fasilitas (id_fasilitas, nama_kategori, deskripsi) VALUES (15, 'Kabel Jaringan', 'Kabel dan konektor jaringan komputer');
INSERT INTO public.kategori_fasilitas (id_fasilitas, nama_kategori, deskripsi) VALUES (16, 'Gorden', 'Gorden atau tirai yang digunakan pada ruangan');
INSERT INTO public.kategori_fasilitas (id_fasilitas, nama_kategori, deskripsi) VALUES (17, 'Keyboard', 'Perangkat input untuk mengetik pada komputer');
INSERT INTO public.kategori_fasilitas (id_fasilitas, nama_kategori, deskripsi) VALUES (18, 'Mouse', 'Perangkat input untuk mengoperasikan komputer');
INSERT INTO public.kategori_fasilitas (id_fasilitas, nama_kategori, deskripsi) VALUES (19, 'Spidol Papan', 'Spidol yang digunakan untuk menulis pada papan tulis');
INSERT INTO public.kategori_fasilitas (id_fasilitas, nama_kategori, deskripsi) VALUES (20, 'Penghapus Papan', 'Penghapus yang digunakan untuk membersihkan papan tulis');
INSERT INTO public.kategori_fasilitas (id_fasilitas, nama_kategori, deskripsi) VALUES (21, 'Plafon', 'Plafon ruangan dan bagian pendukungnya');
INSERT INTO public.kategori_fasilitas (id_fasilitas, nama_kategori, deskripsi) VALUES (22, 'Lantai', 'Lantai ruangan yang mengalami kerusakan atau masalah');
INSERT INTO public.kategori_fasilitas (id_fasilitas, nama_kategori, deskripsi) VALUES (23, 'Tembok', 'Tembok atau dinding ruangan yang mengalami kerusakan');
INSERT INTO public.kategori_fasilitas (id_fasilitas, nama_kategori, deskripsi) VALUES (24, 'Fasilitas Auditorium', 'Fasilitas pendukung yang terdapat di Auditorium JTI');


--
-- Data for Name: mahasiswa; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.mahasiswa (nim, prodi, id_user) VALUES ('254107060052', 'Sistem Informasi Bisnis', 1);
INSERT INTO public.mahasiswa (nim, prodi, id_user) VALUES ('254107060143', 'Sistem Informasi Bisnis', 2);
INSERT INTO public.mahasiswa (nim, prodi, id_user) VALUES ('254107060128', 'Sistem Informasi Bisnis', 3);


--
-- Data for Name: penanganan_tugas; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.penanganan_tugas (id_penanganan, id_pengaduan, id_teknisi, waktu_mulai, waktu_selesai, foto_hasil, catatan_teknisi, foto_sebelum, revisi_ke, catatan_revisi) VALUES (3, 1, 5, '2026-09-20 20:59:33.653353', NULL, NULL, 'Sedang pembersihan filter dan penggantian freon', NULL, 0, NULL);
INSERT INTO public.penanganan_tugas (id_penanganan, id_pengaduan, id_teknisi, waktu_mulai, waktu_selesai, foto_hasil, catatan_teknisi, foto_sebelum, revisi_ke, catatan_revisi) VALUES (4, 3, 5, '2026-09-20 20:59:33.653353', NULL, NULL, 'Mengecek kabel VGA dan power proyektor', NULL, 0, NULL);
INSERT INTO public.penanganan_tugas (id_penanganan, id_pengaduan, id_teknisi, waktu_mulai, waktu_selesai, foto_hasil, catatan_teknisi, foto_sebelum, revisi_ke, catatan_revisi) VALUES (6, 7, 5, '2026-10-24 14:49:44.386768', '2026-10-24 14:49:44.386768', NULL, 'Kabel HDMI telah diganti dan proyektor kembali normal.', NULL, 0, NULL);
INSERT INTO public.penanganan_tugas (id_penanganan, id_pengaduan, id_teknisi, waktu_mulai, waktu_selesai, foto_hasil, catatan_teknisi, foto_sebelum, revisi_ke, catatan_revisi) VALUES (7, 8, 5, '2026-10-24 14:51:20.981608', '2026-10-24 14:51:20.981608', NULL, 'Kabel HDMI telah diganti dan proyektor kembali normal.', NULL, 0, NULL);
INSERT INTO public.penanganan_tugas (id_penanganan, id_pengaduan, id_teknisi, waktu_mulai, waktu_selesai, foto_hasil, catatan_teknisi, foto_sebelum, revisi_ke, catatan_revisi) VALUES (8, 6, 5, NULL, NULL, NULL, NULL, NULL, 0, NULL);


--
-- Data for Name: pengaduan; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.pengaduan (id_pengaduan, id_pelapor, id_ruangan, id_fasilitas, judul_laporan, deskripsi, foto_bukti, status, alasan_penolakan, tanggal_lapor, id_verifikator) VALUES (1, 2, 1, 1, 'AC Tidak Dingin', 'AC di ruang R.05.01 mengeluarkan udara panas dan berisik.', NULL, 'Diproses', NULL, '2026-09-20 20:58:41.397958', 4);
INSERT INTO public.pengaduan (id_pengaduan, id_pelapor, id_ruangan, id_fasilitas, judul_laporan, deskripsi, foto_bukti, status, alasan_penolakan, tanggal_lapor, id_verifikator) VALUES (2, 3, 2, 8, 'Kursi Patah', 'Kursi di baris belakang patah di R.05.02.', NULL, 'Menunggu Verifikasi', NULL, '2026-09-20 20:58:41.397958', NULL);
INSERT INTO public.pengaduan (id_pengaduan, id_pelapor, id_ruangan, id_fasilitas, judul_laporan, deskripsi, foto_bukti, status, alasan_penolakan, tanggal_lapor, id_verifikator) VALUES (3, 1, 3, 3, 'Proyektor Mati Total', 'Proyektor di R.05.03 berkedip merah lalu mati.', NULL, 'Diproses', NULL, '2026-09-20 20:58:41.397958', 4);
INSERT INTO public.pengaduan (id_pengaduan, id_pelapor, id_ruangan, id_fasilitas, judul_laporan, deskripsi, foto_bukti, status, alasan_penolakan, tanggal_lapor, id_verifikator) VALUES (4, 1, 1, 1, 'Lampu proyektor berkedip saat presentasi', 'Perlu pengecekan kabel VGA/HDMI dan lampu proyektor di Lab.', NULL, 'Menunggu Verifikasi', NULL, '2026-10-24 14:44:22.438037', NULL);
INSERT INTO public.pengaduan (id_pengaduan, id_pelapor, id_ruangan, id_fasilitas, judul_laporan, deskripsi, foto_bukti, status, alasan_penolakan, tanggal_lapor, id_verifikator) VALUES (5, 1, 1, 1, 'Lampu proyektor berkedip saat presentasi', 'Perlu pengecekan kabel VGA/HDMI dan lampu proyektor di Lab.', NULL, 'Menunggu Verifikasi', NULL, '2026-10-24 14:47:56.05695', NULL);
INSERT INTO public.pengaduan (id_pengaduan, id_pelapor, id_ruangan, id_fasilitas, judul_laporan, deskripsi, foto_bukti, status, alasan_penolakan, tanggal_lapor, id_verifikator) VALUES (6, 1, 1, 1, 'Lampu proyektor berkedip saat presentasi', 'Perlu pengecekan kabel VGA/HDMI dan lampu proyektor di Lab.', NULL, 'Diproses', NULL, '2026-10-24 14:49:28.427269', 4);
INSERT INTO public.pengaduan (id_pengaduan, id_pelapor, id_ruangan, id_fasilitas, judul_laporan, deskripsi, foto_bukti, status, alasan_penolakan, tanggal_lapor, id_verifikator) VALUES (7, 1, 1, 1, 'Lampu proyektor berkedip saat presentasi', 'Perlu pengecekan kabel VGA/HDMI dan lampu proyektor di Lab.', NULL, 'Selesai', NULL, '2026-10-24 14:49:44.380519', 4);
INSERT INTO public.pengaduan (id_pengaduan, id_pelapor, id_ruangan, id_fasilitas, judul_laporan, deskripsi, foto_bukti, status, alasan_penolakan, tanggal_lapor, id_verifikator) VALUES (8, 1, 1, 1, 'Lampu proyektor berkedip saat presentasi', 'Perlu pengecekan kabel VGA/HDMI dan lampu proyektor di Lab.', NULL, 'Selesai', NULL, '2026-10-24 14:51:20.972477', 4);


--
-- Data for Name: riwayat_status; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.riwayat_status (id_riwayat, id_pengaduan, changed_by, status_baru, keterangan, "timestamp") VALUES (1, 4, 1, 'Menunggu Verifikasi', 'Laporan berhasil dikirim oleh pelapor.', '2026-10-24 14:44:22.438037');
INSERT INTO public.riwayat_status (id_riwayat, id_pengaduan, changed_by, status_baru, keterangan, "timestamp") VALUES (2, 5, 1, 'Menunggu Verifikasi', 'Laporan berhasil dikirim oleh pelapor.', '2026-10-24 14:47:56.05695');
INSERT INTO public.riwayat_status (id_riwayat, id_pengaduan, changed_by, status_baru, keterangan, "timestamp") VALUES (3, 6, 1, 'Menunggu Verifikasi', 'Laporan berhasil dikirim oleh pelapor.', '2026-10-24 14:49:28.427269');
INSERT INTO public.riwayat_status (id_riwayat, id_pengaduan, changed_by, status_baru, keterangan, "timestamp") VALUES (4, 6, 4, 'Diproses', 'Laporan disetujui, diteruskan ke teknisi lab.', '2026-10-24 14:49:28.431888');
INSERT INTO public.riwayat_status (id_riwayat, id_pengaduan, changed_by, status_baru, keterangan, "timestamp") VALUES (5, 7, 1, 'Menunggu Verifikasi', 'Laporan berhasil dikirim oleh pelapor.', '2026-10-24 14:49:44.380519');
INSERT INTO public.riwayat_status (id_riwayat, id_pengaduan, changed_by, status_baru, keterangan, "timestamp") VALUES (6, 7, 4, 'Diproses', 'Laporan disetujui, diteruskan ke teknisi lab.', '2026-10-24 14:49:44.384565');
INSERT INTO public.riwayat_status (id_riwayat, id_pengaduan, changed_by, status_baru, keterangan, "timestamp") VALUES (7, 7, 5, 'Selesai', 'Kabel HDMI telah diganti dan proyektor kembali normal.', '2026-10-24 14:49:44.386768');
INSERT INTO public.riwayat_status (id_riwayat, id_pengaduan, changed_by, status_baru, keterangan, "timestamp") VALUES (8, 8, 1, 'Menunggu Verifikasi', 'Laporan berhasil dikirim oleh pelapor.', '2026-10-24 14:51:20.972477');
INSERT INTO public.riwayat_status (id_riwayat, id_pengaduan, changed_by, status_baru, keterangan, "timestamp") VALUES (9, 8, 4, 'Diproses', 'Laporan disetujui, diteruskan ke teknisi lab.', '2026-10-24 14:51:20.978675');
INSERT INTO public.riwayat_status (id_riwayat, id_pengaduan, changed_by, status_baru, keterangan, "timestamp") VALUES (10, 8, 5, 'Selesai', 'Kabel HDMI telah diganti dan proyektor kembali normal.', '2026-10-24 14:51:20.981608');


--
-- Data for Name: ruangan; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (9, 'R.05.09 - Toilet Wanita Fasum (mahasiswi)', 5);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (21, 'R.06.09 - Toilet Wanita Fasum (karyawan)', 6);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (42, 'R.07.09 - Toilet Wanita Fasum (mahasiswi)', 7);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (11, 'R.05.11 - Toilet Pria Fasum (mahasiswa)', 5);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (23, 'R.06.11 - Toilet Pria Fasum (karyawan)', 6);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (44, 'R.07.11 - Toilet Pria Fasum (mahasiswa)', 7);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (1, 'R.05.01 - Ruang Kelas Teori 1', 5);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (2, 'R.05.02 - Ruang Kelas Teori 2', 5);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (3, 'R.05.03 - Ruang Kelas Teori 3', 5);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (4, 'R.05.04 - Ruang Kelas Teori 4', 5);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (5, 'R.05.05 - Ruang Kelas Teori 5', 5);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (6, 'R.05.06 - Ruang Kelas Teori 6', 5);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (7, 'R.05.07 - Ruang Kelas Teori 7', 5);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (8, 'R.05.08 - Laboratorium Proyek 1', 5);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (10, 'R.05.10 - Ruang Teknisi', 5);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (12, 'Lobby lantai 5', 5);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (13, 'R.06.01 - Ruang Dosen 1', 6);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (14, 'R.06.02 - Ruang Dosen 2', 6);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (15, 'R.06.03 - Ruang Dosen 3', 6);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (16, 'R.06.04 - Ruang Dosen 4', 6);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (17, 'R.06.05 - Ruang Jurusan TI', 6);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (18, 'R.06.06 - Ruang Dosen 5', 6);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (19, 'R.06.07 - Ruang Program Studi', 6);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (20, 'R.06.08 - Ruang Dosen 6', 6);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (22, 'R.06.10 - Meeting Room 2', 6);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (24, 'R.06.12 - Musholla', 6);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (25, 'R.06.13 - Ruang Baca', 6);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (26, 'R.06.14 - Ruang Arsip', 6);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (27, 'R.06.15 - Laboratorium Sistem Informasi 1', 6);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (28, 'R.06.16 - Laboratorium Sistem Informasi 2', 6);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (29, 'R.06.17 - Laboratorium Sistem Informasi 3', 6);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (30, 'R.06.18 - Laboratorium Proyek 2', 6);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (31, 'R.06.19 - Laboratorium Proyek 3', 6);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (32, 'R.06.20 - Ruang Ecosystem', 6);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (33, 'Lobby lantai 6', 6);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (34, 'R.07.01 - Ruang LIG 1', 7);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (35, 'R.07.02 - Ruang LIG 2', 7);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (36, 'R.07.03 - Ruang LIG 3', 7);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (37, 'R.07.04 - Ruang LIG 4', 7);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (38, 'R.07.05 - Ruang LIG 5', 7);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (39, 'R.07.06 - Ruang LIG 6', 7);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (40, 'R.07.07 - Laboratorium Komputasi Jaringan 1', 7);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (41, 'R.07.08 - Ruang LIG 7', 7);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (43, 'R.07.10 - Ruang Teknisi', 7);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (45, 'R.07.13 - Laboratorium Komputasi Jaringan 2', 7);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (46, 'R.07.14 - Ruang LIG 8', 7);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (47, 'R.07.15 - Laboratorium Komputasi Jaringan 3', 7);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (48, 'R.07.16 - Laboratorium Visual Komputer 1', 7);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (49, 'R.07.17 - Ruang Kelas Teori 8', 7);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (50, 'R.07.18 - Laboratorium Visual Komputer 2', 7);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (51, 'R.07.19 - Laboratorium Proyek 4', 7);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (53, 'Lobby lantai 7', 7);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (52, 'R.07.20 - Laboratorium Kecerdasan Buatan 1', 7);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (54, 'R.08.01 - Ruang Kelas Teori', 8);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (57, 'R.08.04 - Ruang Teknisi', 8);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (58, 'R.08.05 - Ruang Kelas Teori 9', 8);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (59, 'R.08.06 - Ruang Kelas Teori 10', 8);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (60, 'Auditorium JTI', 8);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (61, 'Lobby lantai 8', 8);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (62, 'Kantin', 8);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (56, 'R.08.03 - Toilet Wanita Fasum (karyawan)', 8);
INSERT INTO public.ruangan (id_ruangan, nama_ruangan, lantai) VALUES (55, 'R.08.02 - Toilet Pria Fasum (karyawan)', 8);


--
-- Data for Name: sekjur; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.sekjur (id_sekjur, nip, jabatan, id_user) VALUES (1, '198501012010121001', 'Sekretaris Jurusan TI', 4);


--
-- Data for Name: teknisi; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.teknisi (id_teknisi, spesialisasi, id_user, nip, status) VALUES (1, 'Hardware & Jaringan', 5, NULL, 'Aktif');


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.users (id_user, nama, email, password, role, foto_user) VALUES (1, 'Rachmah Nur Chotimah', 'rachmah@polinema.ac.id', 'password123', 'mahasiswa', NULL);
INSERT INTO public.users (id_user, nama, email, password, role, foto_user) VALUES (2, 'Alfatitah Alifia Putri', 'alfatitah@polinema.ac.id', 'password123', 'mahasiswa', NULL);
INSERT INTO public.users (id_user, nama, email, password, role, foto_user) VALUES (3, 'Evan Fernanda Adiwitya', 'evan@polinema.ac.id', 'password123', 'mahasiswa', NULL);
INSERT INTO public.users (id_user, nama, email, password, role, foto_user) VALUES (4, 'Septya Andhita Pradhana', 'septya@polinema.ac.id', 'password123', 'sekjur', NULL);
INSERT INTO public.users (id_user, nama, email, password, role, foto_user) VALUES (5, 'Muhammad Bakhtiar Muqribillah', 'bakhtiar@polinema.ac.id', 'password123', 'teknisi', NULL);


--
-- Name: kategori_fasilitas_id_fasilitas_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.kategori_fasilitas_id_fasilitas_seq', 24, true);


--
-- Name: penanganan_tugas_id_penanganan_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.penanganan_tugas_id_penanganan_seq', 8, true);


--
-- Name: pengaduan_id_pengaduan_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pengaduan_id_pengaduan_seq', 8, true);


--
-- Name: riwayat_status_id_riwayat_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.riwayat_status_id_riwayat_seq', 10, true);


--
-- Name: ruangan_id_ruangan_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ruangan_id_ruangan_seq', 62, true);


--
-- Name: sekjur_id_sekjur_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sekjur_id_sekjur_seq', 1, true);


--
-- Name: teknisi_id_teknisi_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.teknisi_id_teknisi_seq', 1, true);


--
-- Name: users_id_user_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_user_seq', 5, true);


--
-- Name: dosen dosen_id_user_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dosen
    ADD CONSTRAINT dosen_id_user_key UNIQUE (id_user);


--
-- Name: dosen dosen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dosen
    ADD CONSTRAINT dosen_pkey PRIMARY KEY (nip);


--
-- Name: kategori_fasilitas kategori_fasilitas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kategori_fasilitas
    ADD CONSTRAINT kategori_fasilitas_pkey PRIMARY KEY (id_fasilitas);


--
-- Name: mahasiswa mahasiswa_id_user_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mahasiswa
    ADD CONSTRAINT mahasiswa_id_user_key UNIQUE (id_user);


--
-- Name: mahasiswa mahasiswa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mahasiswa
    ADD CONSTRAINT mahasiswa_pkey PRIMARY KEY (nim);


--
-- Name: penanganan_tugas penanganan_tugas_id_pengaduan_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.penanganan_tugas
    ADD CONSTRAINT penanganan_tugas_id_pengaduan_key UNIQUE (id_pengaduan);


--
-- Name: penanganan_tugas penanganan_tugas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.penanganan_tugas
    ADD CONSTRAINT penanganan_tugas_pkey PRIMARY KEY (id_penanganan);


--
-- Name: pengaduan pengaduan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pengaduan
    ADD CONSTRAINT pengaduan_pkey PRIMARY KEY (id_pengaduan);


--
-- Name: riwayat_status riwayat_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.riwayat_status
    ADD CONSTRAINT riwayat_status_pkey PRIMARY KEY (id_riwayat);


--
-- Name: ruangan ruangan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ruangan
    ADD CONSTRAINT ruangan_pkey PRIMARY KEY (id_ruangan);


--
-- Name: sekjur sekjur_id_user_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sekjur
    ADD CONSTRAINT sekjur_id_user_key UNIQUE (id_user);


--
-- Name: sekjur sekjur_nip_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sekjur
    ADD CONSTRAINT sekjur_nip_key UNIQUE (nip);


--
-- Name: sekjur sekjur_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sekjur
    ADD CONSTRAINT sekjur_pkey PRIMARY KEY (id_sekjur);


--
-- Name: teknisi teknisi_id_user_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teknisi
    ADD CONSTRAINT teknisi_id_user_key UNIQUE (id_user);


--
-- Name: teknisi teknisi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teknisi
    ADD CONSTRAINT teknisi_pkey PRIMARY KEY (id_teknisi);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id_user);


--
-- Name: idx_pengaduan_pelapor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pengaduan_pelapor ON public.pengaduan USING btree (id_pelapor);


--
-- Name: idx_pengaduan_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pengaduan_status ON public.pengaduan USING btree (status);


--
-- Name: idx_riwayat_pengaduan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_riwayat_pengaduan ON public.riwayat_status USING btree (id_pengaduan);


--
-- Name: idx_tugas_teknisi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tugas_teknisi ON public.penanganan_tugas USING btree (id_teknisi);


--
-- Name: teknisi_nip_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX teknisi_nip_key ON public.teknisi USING btree (nip) WHERE (nip IS NOT NULL);


--
-- Name: dosen dosen_id_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dosen
    ADD CONSTRAINT dosen_id_user_fkey FOREIGN KEY (id_user) REFERENCES public.users(id_user) ON DELETE CASCADE;


--
-- Name: mahasiswa mahasiswa_id_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mahasiswa
    ADD CONSTRAINT mahasiswa_id_user_fkey FOREIGN KEY (id_user) REFERENCES public.users(id_user) ON DELETE CASCADE;


--
-- Name: penanganan_tugas penanganan_tugas_id_pengaduan_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.penanganan_tugas
    ADD CONSTRAINT penanganan_tugas_id_pengaduan_fkey FOREIGN KEY (id_pengaduan) REFERENCES public.pengaduan(id_pengaduan) ON DELETE CASCADE;


--
-- Name: penanganan_tugas penanganan_tugas_id_teknisi_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.penanganan_tugas
    ADD CONSTRAINT penanganan_tugas_id_teknisi_fkey FOREIGN KEY (id_teknisi) REFERENCES public.users(id_user);


--
-- Name: pengaduan pengaduan_id_fasilitas_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pengaduan
    ADD CONSTRAINT pengaduan_id_fasilitas_fkey FOREIGN KEY (id_fasilitas) REFERENCES public.kategori_fasilitas(id_fasilitas);


--
-- Name: pengaduan pengaduan_id_pelapor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pengaduan
    ADD CONSTRAINT pengaduan_id_pelapor_fkey FOREIGN KEY (id_pelapor) REFERENCES public.users(id_user);


--
-- Name: pengaduan pengaduan_id_ruangan_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pengaduan
    ADD CONSTRAINT pengaduan_id_ruangan_fkey FOREIGN KEY (id_ruangan) REFERENCES public.ruangan(id_ruangan);


--
-- Name: pengaduan pengaduan_id_verifikator_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pengaduan
    ADD CONSTRAINT pengaduan_id_verifikator_fkey FOREIGN KEY (id_verifikator) REFERENCES public.users(id_user);


--
-- Name: riwayat_status riwayat_status_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.riwayat_status
    ADD CONSTRAINT riwayat_status_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id_user);


--
-- Name: riwayat_status riwayat_status_id_pengaduan_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.riwayat_status
    ADD CONSTRAINT riwayat_status_id_pengaduan_fkey FOREIGN KEY (id_pengaduan) REFERENCES public.pengaduan(id_pengaduan) ON DELETE CASCADE;


--
-- Name: sekjur sekjur_id_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sekjur
    ADD CONSTRAINT sekjur_id_user_fkey FOREIGN KEY (id_user) REFERENCES public.users(id_user) ON DELETE CASCADE;


--
-- Name: teknisi teknisi_id_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teknisi
    ADD CONSTRAINT teknisi_id_user_fkey FOREIGN KEY (id_user) REFERENCES public.users(id_user) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--


