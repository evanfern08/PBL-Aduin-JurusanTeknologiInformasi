-- ADUIN - STRUKTUR DATABASE SAJA (tanpa data). Untuk data contoh gunakan aduin.sql
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


