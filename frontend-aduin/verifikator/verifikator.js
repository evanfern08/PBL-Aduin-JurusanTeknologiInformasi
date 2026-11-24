/**
 * verifikator.js - Halaman Verifikator (Sekjur/Kajur):
 * Dashboard, Daftar Laporan (riwayat), Statistik, Kelola Teknisi.
 * Semua data berasal dari backend lewat API (assets/js/api.js).
 */
(function () {
    'use strict';

    const A = window.ADUIN;
    const API = A.API;
    const esc = A.escapeHtml;
    const sesi = A.getSession();
    if (!sesi) return;

    const $ = (id) => document.getElementById(id);
    const setText = (id, v) => { const el = $(id); if (el) el.textContent = v; };

    let laporan = [];
    let teknisiAktif = [];

    async function muatLaporan() {
        const data = await API.get('verifikator/dashboard.php');
        laporan = data.laporan;
        return laporan;
    }
    const cari = (id) => laporan.find((l) => l.id_pengaduan === Number(id));

    /* Kirim keputusan verifikator ke backend */
    async function keputusan(id, aksi, tambahan) {
        return API.post('verifikator/verifikasi.php', Object.assign({ id_pengaduan: id, id_verifikator: sesi.id_user, aksi: aksi }, tambahan || {}));
    }

    /* ==========================================================================
       FILTER (dipakai Dashboard & Statistik)
       ========================================================================== */
    function isiFilter(prefix, sumber = laporan) {
        const opsi = (selId, ambil) => {
            const sel = $(prefix + selId);
            if (!sel) return;
            const nilai = sel.value;
            const pertama = sel.options[0];
            const set = new Set(sumber.map(ambil).filter(Boolean));
            sel.replaceChildren(pertama);
            [...set].sort((a, b) => a.localeCompare(b, 'id')).forEach((v) => {
                const o = document.createElement('option');
                o.value = v; o.textContent = v;
                sel.appendChild(o);
            });
            sel.value = nilai;
        };
        opsi('FilterCategory', (l) => l.nama_kategori);
        opsi('FilterRoom', (l) => l.nama_ruangan);
        opsi('FilterStatus', (l) => l.status_ui);
    }

    function bacaFilter(prefix) {
        const v = (id) => ($(prefix + id) ? $(prefix + id).value : '');
        return { kategori: v('FilterCategory'), dari: v('FilterFrom'), sampai: v('FilterTo'), ruang: v('FilterRoom'), status: v('FilterStatus') };
    }

    function lolosFilter(l, f) {
        if (f.kategori && l.nama_kategori !== f.kategori) return false;
        if (f.ruang && l.nama_ruangan !== f.ruang) return false;
        if (f.status && l.status_ui !== f.status) return false;
        const tgl = A.tanggalIso(l.tanggal_lapor);
        if (f.dari && (!tgl || tgl < f.dari)) return false;
        if (f.sampai && (!tgl || tgl > f.sampai)) return false;
        return true;
    }

    function ikatFilter(prefix, onChange) {
        ['FilterCategory', 'FilterFrom', 'FilterTo', 'FilterRoom', 'FilterStatus'].forEach((s) => {
            const el = $(prefix + s);
            if (el) el.addEventListener('change', onChange);
        });
        const reset = $(prefix + 'FilterReset');
        if (reset) reset.addEventListener('click', () => {
            ['FilterCategory', 'FilterFrom', 'FilterTo', 'FilterRoom', 'FilterStatus'].forEach((s) => { const el = $(prefix + s); if (el) el.value = ''; });
            onChange();
        });
    }

    /* ==========================================================================
       DASHBOARD
       ========================================================================== */
    let activeReport = null;

    async function muatTeknisiAktif() {
        teknisiAktif = await API.get('master/teknisi.php', { aktif: 1 });
        const sel = $('assignedTechnician');
        if (!sel) return;
        if (!teknisiAktif.length) {
            sel.innerHTML = '<option value="">Tidak ada teknisi aktif</option>';
            return;
        }
        sel.innerHTML = teknisiAktif.map((t) =>
            '<option value="' + t.id_user + '">' + esc(t.nama) + ' (' + esc(t.spesialisasi || 'Teknisi') + ') — ' + t.tugas_berjalan + ' tugas</option>').join('');
    }

    function renderMetrik() {
        const hit = (fn) => laporan.filter(fn).length;
        setText('metricMenunggu', hit((l) => l.status === 'Menunggu Verifikasi'));
        setText('metricDiproses', hit((l) => l.status === 'Diproses' || l.status === 'Diteruskan ke Pusat'));
        setText('metricSelesai', hit((l) => l.status === 'Selesai'));
        setText('metricDitolak', hit((l) => l.status === 'Ditolak'));
    }

    function renderDashboard() {
        const tbody = $('verifikatorTableBody');
        if (!tbody) return;
        const scrollContainer = $('verifikatorListScroll');
        const posisiScroll = scrollContainer ? scrollContainer.scrollTop : 0;
        const antreanVerifikasi = laporan.filter((l) => l.status === 'Menunggu Verifikasi');
        renderMetrik();
        isiFilter('dashboard', antreanVerifikasi);

        tbody.innerHTML = '';
        if (!antreanVerifikasi.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted" style="padding:24px;">Tidak ada laporan yang menunggu verifikasi.</td></tr>';
        }

        antreanVerifikasi.forEach((l) => {
            const tr = document.createElement('tr');
            tr.dataset.id = l.id_pengaduan;
            const foto = l.foto_list.length
                ? (function () {
                    const MAKS = 4;
                    const thumbs = l.foto_list.slice(0, MAKS).map(function (f, i) {
                        return '<img src="' + esc(A.fileUrl(f)) + '" class="thumb-preview" alt="Foto ' + (i + 1) +
                            '" data-foto-index="' + i + '" data-foto-json=\'' + esc(JSON.stringify(l.foto_list)) + '\'>';
                    }).join('');
                    const sisa = l.foto_list.length - MAKS;
                    const more = sisa > 0
                        ? '<div class="gallery-thumb-more" data-foto-index="' + MAKS +
                        '" data-foto-json=\'' + esc(JSON.stringify(l.foto_list)) + '\'>+' + sisa + '</div>'
                        : '';
                    return '<div class="gallery-thumb-grid" style="max-width:200px;">' + thumbs + more + '</div>';
                })()
                : '<span class="text-muted">Tanpa foto</span>';
            const aksi = l.status === 'Menunggu Verifikasi'
                ? '<div class="action-group"><button type="button" class="btn-icon btn-icon-success" data-aksi="approve" title="Setujui">✓</button>' +
                '<button type="button" class="btn-icon btn-icon-danger" data-aksi="reject" title="Tolak">✕</button></div>'
                : '<span class="status-pill ' + A.pillClass(l.status_ui) + '">' + esc(l.status_ui) + '</span>';

            tr.innerHTML =
                '<td><div class="cell-reporter"><div class="cell-avatar">' + esc(A.inisial(l.nama_pelapor)) + '</div><div>' +
                '<span class="cell-name" style="display:block;">' + esc(l.nama_pelapor) + '</span>' +
                '<span class="cell-meta" style="display:block;margin-top:3px;">' + (l.role_pelapor === 'dosen' ? 'NIP' : 'NIM') + ': ' + esc(l.identitas_pelapor || '-') + '</span></div></div></td>' +
                '<td><span class="cell-name" style="display:block;">' + esc(l.nama_ruangan) + '</span>' +
                '<span class="cell-meta" style="display:block;margin-top:3px;">Lantai ' + l.lantai + '</span></td>' +
                '<td><span class="status-pill">' + esc(l.nama_kategori) + '</span>' +
                '<span class="cell-meta" style="display:block;margin-top:6px;">' + esc(l.judul_laporan) + '</span>' +
                '<span class="cell-meta" style="display:block;">' + A.tanggalJam(l.tanggal_lapor) + '</span></td>' +
                '<td class="text-center">' + foto + '</td><td class="text-right">' + aksi + '</td>';

            tr.querySelectorAll('[data-foto-index]').forEach(function (el) {
                el.addEventListener('click', function (e) {
                    e.stopPropagation();
                    const fotos = JSON.parse(el.dataset.fotoJson || '[]');
                    const idx = parseInt(el.dataset.fotoIndex, 10) || 0;
                    window.bukaLightbox(fotos, idx);
                });
            });
            const ap = tr.querySelector('[data-aksi="approve"]');
            if (ap) ap.addEventListener('click', () => window.openApproveModal(l.id_pengaduan, l.judul_laporan));
            const rj = tr.querySelector('[data-aksi="reject"]');
            if (rj) rj.addEventListener('click', () => window.openRejectModal(l.id_pengaduan, l.judul_laporan));
            tbody.appendChild(tr);
        });

        const cariInput = $('tableSearchInput');
        const hasil = $('dashboardFilterResult');
        const terapkan = () => {
            const f = bacaFilter('dashboard');
            const q = cariInput ? cariInput.value.toLowerCase().trim() : '';
            let tampil = 0;
            tbody.querySelectorAll('tr[data-id]').forEach((row) => {
                const l = cari(row.dataset.id);
                const ok = l && lolosFilter(l, f) && row.textContent.toLowerCase().includes(q);
                row.style.display = ok ? '' : 'none';
                if (ok) tampil++;
            });
            if (hasil) hasil.textContent = 'Menampilkan ' + tampil + ' dari ' + antreanVerifikasi.length + ' laporan yang menunggu verifikasi.';
        };
        if (cariInput && !cariInput.dataset.bound) { cariInput.dataset.bound = '1'; cariInput.addEventListener('input', terapkan); }
        if (!tbody.dataset.filterBound) { tbody.dataset.filterBound = '1'; ikatFilter('dashboard', terapkan); }
        window.__terapkanFilterDashboard = terapkan;
        terapkan();
        if (scrollContainer) {
            window.requestAnimationFrame(() => {
                scrollContainer.scrollTop = Math.min(posisiScroll, Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight));
            });
        }
    }

    window.openApproveModal = function (id, judul) {
        activeReport = { id: id, judul: judul };
        setText('approveTargetTitle', '#' + id + ' - ' + judul);
        $('approveModal').classList.remove('hidden');
    };
    window.closeApproveModal = function () { $('approveModal').classList.add('hidden'); activeReport = null; };
    window.openRejectModal = function (id, judul) {
        activeReport = { id: id, judul: judul };
        setText('rejectTargetTitle', '#' + id + ' - ' + judul);
        $('rejectModal').classList.remove('hidden');
    };
    window.closeRejectModal = function () { $('rejectModal').classList.add('hidden'); activeReport = null; };
    window.openImageModal = function (src) {
        const img = $('modalImagePreview');
        if (img) img.src = src;
        $('imageModal').classList.remove('hidden');
    };
    window.closeImageModal = function () { $('imageModal').classList.add('hidden'); };

    function ikatModalDashboard() {
        document.querySelectorAll('input[name="dispositionOption"]').forEach((radio) => {
            radio.addEventListener('change', (e) => {
                const wrap = $('technicianPickerWrap');
                if (wrap) wrap.style.display = e.target.value === 'UPA PP Pusat' ? 'none' : 'block';
            });
        });

        $('btnConfirmApprove').addEventListener('click', async () => {
            if (!activeReport) return;
            const pilihan = document.querySelector('input[name="dispositionOption"]:checked');
            const pusat = pilihan && pilihan.value === 'UPA PP Pusat';
            const btn = $('btnConfirmApprove');
            const id = activeReport.id;

            if (!pusat && !$('assignedTechnician').value) { A.showToast('Pilih teknisi yang akan ditugaskan.', 'error'); return; }
            btn.disabled = true;
            try {
                const hasil = await keputusan(id, pusat ? 'teruskan_pusat' : 'setujui_teknisi', pusat ? {} : { id_teknisi: Number($('assignedTechnician').value) });
                A.showToast(pusat ? 'Laporan diteruskan ke UPA PP Pusat.' : 'Laporan disetujui dan ditugaskan ke ' + (hasil.nama_teknisi || 'teknisi') + '.', 'success');
                window.closeApproveModal();
                await muatLaporan();
                renderDashboard();
                muatTeknisiAktif().catch(() => { });
            } catch (err) {
                A.showToast(err.message, 'error');
            } finally { btn.disabled = false; }
        });

        $('btnConfirmReject').addEventListener('click', async () => {
            if (!activeReport) return;
            const alasan = $('rejectReason').value.trim();
            if (!alasan) { A.showToast('Alasan penolakan wajib diisi.', 'error'); return; }
            const btn = $('btnConfirmReject');
            btn.disabled = true;
            try {
                await keputusan(activeReport.id, 'tolak', { alasan: alasan });
                A.showToast('Laporan ditolak dengan catatan resmi.', 'info');
                window.closeRejectModal();
                await muatLaporan();
                renderDashboard();
            } catch (err) {
                A.showToast(err.message, 'error');
            } finally { btn.disabled = false; }
        });
    }

    /* ==========================================================================
       DAFTAR LAPORAN (riwayat.html)
       ========================================================================== */
    const URUTAN = { 'Menunggu Verifikasi': 0, 'Dalam Perbaikan': 2, 'Diteruskan ke Pusat': 2, 'Menunggu Review Hasil': 3, 'Selesai': 4 };

    function kartuRiwayat(l) {
        const card = document.createElement('div');
        card.className = 'glass-card riwayat-card';
        card.dataset.status = l.status_ui;
        card.style.cursor = 'pointer';

        const ditolak = l.status_ui === 'Ditolak';
        const pusat = l.status_ui === 'Diteruskan ke Pusat';
        const review = l.status_ui === 'Menunggu Review Hasil';
        const idx = URUTAN[l.status_ui] ?? 0;

        const node = [
            { label: 'Menunggu Verifikasi', sub: A.tanggalPendek(l.tanggal_lapor) },
            { label: 'Diverifikasi', sub: l.tanggal_verifikasi ? A.tanggalPendek(l.tanggal_verifikasi) : 'Validasi Kajur' },
            { label: pusat ? 'UPA PP Pusat' : 'Dalam Perbaikan', sub: pusat ? 'Diserahkan ke Pusat' : (l.nama_teknisi || 'Teknisi') },
            { label: 'Menunggu Review Hasil', sub: 'Pemeriksaan hasil' },
            { label: 'Selesai', sub: 'Fasilitas normal' },
        ];
        const timeline = node.map((n, i) => {
            let cls = 'timeline-node', dot = i + 1;
            if (!ditolak) {
                if (i < idx || (i === 1 && idx >= 2)) { cls += ' done'; dot = '✓'; }
                else if (i === idx) {
                    if (l.status_ui === 'Selesai') { cls += ' success'; dot = '✓'; }
                    else { cls += ' active'; dot = i === 0 ? '…' : i === 2 ? '⚙' : i + 1; }
                }
            } else if (i === 0) { cls += ' done'; dot = '✓'; }
            return '<div class="' + cls + '"><div class="timeline-dot">' + dot + '</div><span class="timeline-caption">' + esc(n.label) + '</span><span class="timeline-sub">' + esc(n.sub) + '</span></div>';
        }).join('');

        let aksi = '';
        if (review) {
            aksi = '<button type="button" class="btn btn-success" data-act="terima-hasil">✓ Terima Hasil</button>' +
                '<button type="button" class="btn btn-danger" data-act="tolak-hasil">Tolak Hasil Perbaikan</button>';
        } else if (ditolak) {
            aksi = '<button type="button" class="btn btn-ghost" data-act="batal-tolak" style="border:1px solid #cbd5e1;">↺ Batal Penolakan</button>';
        }

        let catatan = '';
        if (ditolak && l.alasan_penolakan) catatan = '<p style="font-size:12px;color:#b91c1c;margin-top:10px;">Alasan penolakan: ' + esc(l.alasan_penolakan) + '</p>';
        else if (l.status_ui === 'Dalam Perbaikan' && l.revisi_ke > 0 && l.catatan_revisi) {
            catatan = '<p style="font-size:12px;color:#b45309;margin-top:10px;">Revisi ke-' + l.revisi_ke + ' dikirim ke teknisi: ' + esc(l.catatan_revisi) + '</p>';
        }

        card.innerHTML =
            '<div class="riwayat-head"><div><h3 class="riwayat-title">' + esc(l.judul_laporan) + '<span class="riwayat-code">#' + l.id_pengaduan + '</span></h3>' +
            '<p class="riwayat-meta">' + esc(l.nama_ruangan) + ' · Pelapor: ' + esc(l.nama_pelapor) + ' · ' + A.tanggalJam(l.tanggal_lapor) + '</p></div>' +
            '<span class="status-pill ' + A.pillClass(l.status_ui) + '">' + esc(l.status_ui) + '</span></div>' + catatan +
            '<div class="timeline-wrap"><div class="timeline-label">Progress Tracker Timeline</div><div class="timeline">' + timeline + '</div></div>' +
            (aksi ? '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px;">' + aksi + '</div>' : '');

        card.querySelectorAll('[data-act]').forEach((btn) => btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (btn.dataset.act === 'terima-hasil') terimaHasil(l);
            else window.bukaModalAksi(btn.dataset.act, l);
        }));
        card.addEventListener('click', () => window.bukaModalDetail(l.id_pengaduan));
        return card;
    }

    let filterPill = 'Semua';
    function renderRiwayat() {
        const list = $('riwayatList');
        if (!list) return;
        list.innerHTML = '';
        if (!laporan.length) list.innerHTML = '<p class="glass-card text-muted">Belum ada laporan.</p>';
        laporan.forEach((l) => list.appendChild(kartuRiwayat(l)));
        terapkanPill();
        renderReminder();
    }

    function terapkanPill() {
        document.querySelectorAll('.filter-pill').forEach((p) => p.classList.toggle('active', p.dataset.filter === filterPill));
        document.querySelectorAll('.riwayat-card').forEach((c) => {
            c.style.display = (filterPill === 'Semua' || c.dataset.status === filterPill) ? '' : 'none';
        });
    }

    function ikatPill() {
        const statusDariUrl = new URLSearchParams(window.location.search).get('status');
        const mapStatusUrl = {
            menunggu_verifikasi: 'Menunggu Verifikasi',
            diteruskan_ke_pusat: 'Diteruskan ke Pusat',
            dalam_perbaikan: 'Dalam Perbaikan',
            menunggu_review_hasil: 'Menunggu Review Hasil',
            selesai: 'Selesai',
            ditolak: 'Ditolak',
        };
        if (statusDariUrl && mapStatusUrl[statusDariUrl]) filterPill = mapStatusUrl[statusDariUrl];
        document.querySelectorAll('.filter-pill').forEach((p) => p.addEventListener('click', () => { filterPill = p.dataset.filter; terapkanPill(); }));
        terapkanPill();
    }

    async function muatUlangRiwayat() {
        await muatLaporan();
        renderRiwayat();
    }

    async function terimaHasil(l) {
        if (!confirm('Terima hasil perbaikan? Status laporan menjadi Selesai (final).')) return;
        try {
            await keputusan(l.id_pengaduan, 'terima_hasil');
            A.showToast('Hasil perbaikan diterima. Laporan Selesai.', 'success');
            await muatUlangRiwayat();
        } catch (err) { A.showToast(err.message, 'error'); }
    }

    let aksiAktif = null;
    const AKSI = {
        'tolak-hasil': {
            title: 'Tolak Hasil Perbaikan', aksi: 'tolak_hasil',
            desc: 'Laporan kembali ke "Dalam Perbaikan" dan muncul lagi di tab "Sedang Dikerjakan" milik teknisi.',
            label: 'Alasan penolakan (jadi catatan revisi teknisi)', placeholder: 'Contoh: AC masih bocor, foto sesudah tidak jelas.',
            btn: 'Tolak Hasil Perbaikan', cls: 'btn btn-danger', ok: 'Hasil ditolak. Laporan kembali ke teknisi.',
        },
        'batal-tolak': {
            title: 'Batalkan Penolakan', aksi: 'batal_tolak',
            desc: 'Status laporan kembali ke "Menunggu Verifikasi" sehingga bisa diputuskan ulang. Pembatalan dicatat di riwayat status.',
            label: 'Alasan pembatalan', placeholder: 'Contoh: Salah menekan tombol tolak.',
            btn: 'Kembalikan ke Antrean', cls: 'btn btn-success', ok: 'Penolakan dibatalkan. Laporan kembali ke antrean verifikasi.',
        },
    };

    window.bukaModalAksi = function (jenis, l) {
        const cfg = AKSI[jenis];
        if (!cfg) return;
        aksiAktif = { jenis: jenis, id: l.id_pengaduan };
        setText('aksiTitle', cfg.title);
        setText('aksiTarget', '#' + l.id_pengaduan + ' - ' + l.judul_laporan);
        setText('aksiDesc', cfg.desc);
        setText('aksiLabel', cfg.label);
        const ta = $('aksiAlasan');
        ta.value = ''; ta.placeholder = cfg.placeholder;
        const btn = $('btnAksiKonfirmasi');
        btn.textContent = cfg.btn; btn.className = cfg.cls;
        $('modalAksiStatus').classList.remove('hidden');
    };
    window.tutupModalAksi = function () { $('modalAksiStatus').classList.add('hidden'); aksiAktif = null; };
    window.konfirmasiAksi = async function () {
        if (!aksiAktif) return;
        const alasan = $('aksiAlasan').value.trim();
        if (!alasan) { A.showToast('Alasan wajib diisi.', 'error'); return; }
        const cfg = AKSI[aksiAktif.jenis];
        try {
            await keputusan(aksiAktif.id, cfg.aksi, { alasan: alasan });
            A.showToast(cfg.ok, 'success');
            window.tutupModalAksi();
            await muatUlangRiwayat();
        } catch (err) { A.showToast(err.message, 'error'); }
    };

    window.bukaModalDetail = async function (id) {
        const modal = $('modalDetailPengaduan');
        if (!modal) return;
        let d;
        try { d = await API.get('verifikator/detail.php', { id: id }); }
        catch (err) { A.showToast(err.message, 'error'); return; }

        setText('detailJudul', d.judul_laporan);
        setText('detailId', '#' + d.id_pengaduan);
        setText('detailPelapor', d.nama_pelapor + (d.identitas_pelapor ? ' (' + d.identitas_pelapor + ')' : ''));
        setText('detailLokasi', d.nama_ruangan);
        setText('detailKategori', d.nama_kategori);
        setText('detailStatus', d.status_ui);
        setText('detailTanggal', A.tanggalJam(d.tanggal_lapor));
        setText('detailDeskripsi', d.deskripsi || '-');

        const fotoBox = $('detailFotoContainer');
        const fotoGrid = $('detailFotoGrid');
        if (fotoBox && fotoGrid) {
            if (d.foto_list.length) {
                fotoBox.style.display = 'block';
                fotoGrid.innerHTML = d.foto_list.map(function (f, i) {
                    return '<img src="' + esc(A.fileUrl(f)) + '" class="thumb-preview" alt="Foto kerusakan ' + (i + 1) +
                        '" data-detail-foto-index="' + i + '">';
                }).join('');
                fotoGrid.querySelectorAll('[data-detail-foto-index]').forEach(function (el) {
                    el.addEventListener('click', function () {
                        const idx = parseInt(el.dataset.detailFotoIndex, 10) || 0;
                        window.bukaLightbox(d.foto_list, idx);
                    });
                });
            } else {
                fotoBox.style.display = 'none';
                fotoGrid.innerHTML = '';
            }
        }

        const hasil = $('detailHasil');
        if (hasil) {
            const adaSebelum = Array.isArray(d.foto_sebelum) ? d.foto_sebelum.length : !!d.foto_sebelum;
            const adaHasil = Array.isArray(d.foto_hasil) ? d.foto_hasil.length : !!d.foto_hasil;

            if (d.catatan_teknisi || adaHasil || adaSebelum) {
                hasil.style.display = 'block';
                const keArray = (v) => !v ? [] : Array.isArray(v) ? v : [v];
                const renderGrid = (judul, fotos) => {
                    if (!fotos.length) return '';
                    const html = fotos.map(function (f, i) {
                        return '<img src="' + esc(A.fileUrl(f)) + '" class="thumb-preview" alt="' + judul + ' ' + (i + 1) +
                            '" data-hasil-foto="' + i + '" data-hasil-json=\'' + esc(JSON.stringify(fotos)) + '\'>';
                    }).join('');
                    return '<div style="margin-top:10px;"><em>' + judul + ' (' + fotos.length + '):</em>' +
                        '<div class="gallery-thumb-grid" style="max-width:100%;">' + html + '</div></div>';
                };
                const sebelumArr = keArray(d.foto_sebelum);
                const hasilArr = keArray(d.foto_hasil);
                hasil.innerHTML = '<strong>Hasil kerja teknisi' + (d.nama_teknisi ? ' (' + esc(d.nama_teknisi) + ')' : '') + ':</strong><br>' +
                    esc(d.catatan_teknisi || '-') +
                    renderGrid('Foto sebelum', sebelumArr) +
                    renderGrid('Foto sesudah', hasilArr);
                hasil.querySelectorAll('[data-hasil-foto]').forEach(function (el) {
                    el.addEventListener('click', function () {
                        const fotos = JSON.parse(el.dataset.hasilJson || '[]');
                        const idx = parseInt(el.dataset.hasilFoto, 10) || 0;
                        window.bukaLightbox(fotos, idx);
                    });
                });
            } else {
                hasil.style.display = 'none';
            }
        }

        const log = $('detailChangeLog');
        if (log) {
            log.innerHTML = d.riwayat.length ? d.riwayat.map((r) =>
                '<div style="border-left:3px solid #cbd5e1;padding:4px 0 4px 10px;margin-bottom:10px;font-size:12px;">' +
                '<strong>' + esc(r.status_baru) + '</strong><span style="color:#94a3b8;"> · ' + A.tanggalJam(r.timestamp) + '</span><br>' +
                '<span>Oleh: ' + esc(r.nama_pengubah) + '</span><br><span style="color:#475569;">' + esc(r.keterangan || '-') + '</span></div>').join('')
                : '<p class="text-muted" style="font-size:12px;">Belum ada perubahan status.</p>';
        }

        const footer = $('detailFooter'), btn = $('btnSelesaiPusat');
        if (footer && btn) {
            const pusat = d.status_ui === 'Diteruskan ke Pusat';
            footer.style.display = pusat ? 'block' : 'none';
            btn.onclick = pusat ? async () => {
                if (!confirm('Penanganan di UPA PP Pusat sudah selesai? Status akan diubah menjadi Selesai.')) return;
                try {
                    await keputusan(d.id_pengaduan, 'selesai_pusat');
                    A.showToast('Status laporan diubah menjadi Selesai!', 'success');
                    window.tutupDetail();
                    await muatUlangRiwayat();
                } catch (err) { A.showToast(err.message, 'error'); }
            } : null;
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex', 'active');
    };
    window.bukaDetail = window.bukaModalDetail;
    window.tutupDetail = window.tutupMod = function () {
        const modal = $('modalDetailPengaduan');
        if (modal) modal.classList.add('hidden');
        if (modal) modal.classList.remove('flex', 'active');
    };

    let lightboxState = { fotos: [], index: 0, el: null };

    function bukaLightbox(fotos, startIndex) {
        if (!fotos || !fotos.length) return;
        let box = $('foto-lightbox');
        if (!box) {
            box = document.createElement('div');
            box.id = 'foto-lightbox';
            box.className = 'gallery-lightbox hidden';
            box.setAttribute('role', 'dialog');
            box.setAttribute('aria-modal', 'true');
            box.setAttribute('aria-label', 'Galeri foto');
            document.body.append(box);
        }
        lightboxState.fotos = fotos;
        lightboxState.index = Math.max(0, Math.min(startIndex || 0, fotos.length - 1));
        lightboxState.el = box;
        renderLightbox();
        box.classList.remove('hidden');
        document.addEventListener('keydown', lightboxKeyHandler);
    }

    function renderLightbox() {
        const box = lightboxState.el;
        if (!box) return;
        const fotos = lightboxState.fotos;
        const i = lightboxState.index;
        const total = fotos.length;
        const dots = fotos.map(function (_, idx) {
            return '<button type="button" class="gallery-dot' + (idx === i ? ' active' : '') +
                '" data-dot-index="' + idx + '" aria-label="Foto ' + (idx + 1) + '"></button>';
        }).join('');
        box.innerHTML =
            '<button type="button" class="gallery-lightbox-close" id="lightbox-close" aria-label="Tutup galeri">&times;</button>' +
            '<div class="gallery-lightbox-stage">' +
            (total > 1 ? '<button type="button" class="gallery-nav-btn gallery-nav-prev" id="lightbox-prev" aria-label="Sebelumnya">&#8249;</button>' : '') +
            '<img class="gallery-lightbox-img" id="lightbox-img" src="' + esc(A.fileUrl(fotos[i])) + '" alt="Foto ' + (i + 1) + ' dari ' + total + '">' +
            (total > 1 ? '<button type="button" class="gallery-nav-btn gallery-nav-next" id="lightbox-next" aria-label="Berikutnya">&#8250;</button>' : '') +
            '</div>' +
            '<p class="gallery-lightbox-caption">Foto ' + (i + 1) + ' dari ' + total + '</p>' +
            (total > 1 ? '<div class="gallery-lightbox-dots">' + dots + '</div>' : '');
        box.querySelector('#lightbox-close').onclick = tutupLightbox;
        const prev = box.querySelector('#lightbox-prev');
        const next = box.querySelector('#lightbox-next');
        if (prev) prev.onclick = function () { lightboxNav(-1); };
        if (next) next.onclick = function () { lightboxNav(1); };
        box.querySelectorAll('[data-dot-index]').forEach(function (dot) {
            dot.onclick = function () {
                lightboxState.index = parseInt(dot.dataset.dotIndex, 10) || 0;
                renderLightbox();
            };
        });
        box.onclick = function (e) { if (e.target === box) tutupLightbox(); };
    }

    function lightboxNav(delta) {
        const total = lightboxState.fotos.length;
        if (!total) return;
        lightboxState.index = (lightboxState.index + delta + total) % total;
        renderLightbox();
    }

    function tutupLightbox() {
        const box = $('foto-lightbox');
        if (box) box.classList.add('hidden');
        document.removeEventListener('keydown', lightboxKeyHandler);
    }

    function lightboxKeyHandler(e) {
        if (e.key === 'Escape') tutupLightbox();
        else if (e.key === 'ArrowLeft') lightboxNav(-1);
        else if (e.key === 'ArrowRight') lightboxNav(1);
    }

    window.bukaLightbox = bukaLightbox;
    window.tutupLightbox = tutupLightbox;

    function renderReminder() {
        const btn = $('btn-reminder');
        if (!btn) return;
        const dropdown = $('inbox-dropdown'), listEl = $('inbox-list'), badge = $('inbox-badge-count');
        const hari = (s) => { const d = A.parseTanggal(s); return d ? Math.floor((Date.now() - d.getTime()) / 86400000) : 0; };
        const mengendap = laporan.filter((l) => l.status_ui === 'Diteruskan ke Pusat' && hari(l.tanggal_status_terakhir || l.tanggal_lapor) > 3);
        badge.textContent = mengendap.length;
        badge.classList.toggle('hidden', mengendap.length === 0);
        listEl.innerHTML = mengendap.length ? mengendap.map((l) =>
            '<div class="inbox-item" data-id="' + l.id_pengaduan + '"><div class="inbox-item-title">' + esc(l.judul_laporan) + '</div>' +
            '<div class="inbox-item-loc">' + esc(l.nama_ruangan) + '</div>' +
            '<span class="badge-mengendap">Mengendap > 3 Hari (' + hari(l.tanggal_status_terakhir || l.tanggal_lapor) + ' hari)</span></div>').join('')
            : '<div style="padding:16px;text-align:center;color:#737d92;font-size:13px;">Tidak ada laporan yang mengendap.</div>';
        listEl.querySelectorAll('.inbox-item').forEach((it) => it.addEventListener('click', () => { dropdown.classList.add('hidden'); window.bukaModalDetail(it.dataset.id); }));
        if (!btn.dataset.bound) {
            btn.dataset.bound = '1';
            btn.addEventListener('click', (e) => { e.stopPropagation(); dropdown.classList.toggle('hidden'); });
            document.addEventListener('click', (e) => { if (!dropdown.contains(e.target) && e.target !== btn) dropdown.classList.add('hidden'); });
        }
    }

    function formatDurasi(ms) {
        if (ms === null || isNaN(ms)) return '—';
        const menit = ms / 60000;
        if (menit < 60) return Math.round(menit) + ' Menit';
        if (menit < 1440) return (menit / 60).toFixed(1) + ' Jam';
        return (menit / 1440).toFixed(1) + ' Hari';
    }
    function rata(daftar) { return daftar.length ? daftar.reduce((a, b) => a + b, 0) / daftar.length : null; }

    const HARI_SINGKAT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const BULAN_SINGKAT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const WARNA_KATEGORI = ['#30affe', '#226cc6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316'];
    let chartTren = null;
    let chartKategori = null;

    function tanggalHariIni() {
        const bagian = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Jakarta',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).formatToParts(new Date());
        const nilai = {};
        bagian.forEach((item) => { nilai[item.type] = item.value; });
        return nilai.year + '-' + nilai.month + '-' + nilai.day;
    }

    function tanggalUtc(iso) {
        const bagian = iso.split('-').map(Number);
        return new Date(Date.UTC(bagian[0], bagian[1] - 1, bagian[2]));
    }

    function isoUtc(tanggal) {
        return tanggal.getUTCFullYear() + '-' +
            String(tanggal.getUTCMonth() + 1).padStart(2, '0') + '-' +
            String(tanggal.getUTCDate()).padStart(2, '0');
    }

    function geserTanggal(iso, jumlahHari) {
        const tanggal = tanggalUtc(iso);
        tanggal.setUTCDate(tanggal.getUTCDate() + jumlahHari);
        return isoUtc(tanggal);
    }

    function tanggalPalingAwalSampaiHariIni(hariIni) {
        const tanggal = laporan.map((l) => A.tanggalIso(l.tanggal_lapor))
            .filter((tgl) => tgl && tgl <= hariIni)
            .sort();
        return tanggal[0] || hariIni;
    }

    function rentangPreset(preset, hariIni) {
        if (preset === '7') return { dari: geserTanggal(hariIni, -6), sampai: hariIni };
        if (preset === '30') return { dari: geserTanggal(hariIni, -29), sampai: hariIni };
        if (preset === 'all') return { dari: tanggalPalingAwalSampaiHariIni(hariIni), sampai: hariIni };
        return { dari: hariIni.slice(0, 7) + '-01', sampai: hariIni };
    }

    function hitungRentangGrafik(dari, sampai, data) {
        const jumlahHari = Math.round((tanggalUtc(sampai) - tanggalUtc(dari)) / 86400000) + 1;
        const tanggalLaporan = data.map((l) => A.tanggalIso(l.tanggal_lapor)).filter(Boolean);
        let label = [];
        let nilai = [];
        let satuan;
        let jumlahRentang;

        if (jumlahHari <= 7) {
            satuan = 'hari';
            jumlahRentang = jumlahHari;
            for (let i = 0; i < jumlahHari; i++) {
                const tanggal = geserTanggal(dari, i);
                label.push(HARI_SINGKAT[tanggalUtc(tanggal).getUTCDay()]);
                nilai.push(tanggalLaporan.filter((item) => item === tanggal).length);
            }
        } else if (jumlahHari <= 14) {
            satuan = 'hari';
            jumlahRentang = jumlahHari;
            for (let i = 0; i < jumlahHari; i++) {
                const tanggal = geserTanggal(dari, i);
                label.push('Hari ' + (i + 1));
                nilai.push(tanggalLaporan.filter((item) => item === tanggal).length);
            }
        } else if (jumlahHari <= 90) {
            satuan = 'minggu';
            jumlahRentang = jumlahHari;
            for (let mulai = 0; mulai < jumlahHari; mulai += 7) {
                const akhir = Math.min(mulai + 7, jumlahHari);
                label.push('Minggu ' + (label.length + 1));
                nilai.push(tanggalLaporan.filter((item) => {
                    const selisih = Math.round((tanggalUtc(item) - tanggalUtc(dari)) / 86400000);
                    return selisih >= mulai && selisih < akhir;
                }).length);
            }
        } else {
            satuan = 'bulan';
            const awal = tanggalUtc(dari);
            const akhir = tanggalUtc(sampai);
            jumlahRentang = (akhir.getUTCFullYear() - awal.getUTCFullYear()) * 12 +
                akhir.getUTCMonth() - awal.getUTCMonth() + 1;
            for (let i = 0; i < jumlahRentang; i++) {
                const tanggal = new Date(Date.UTC(awal.getUTCFullYear(), awal.getUTCMonth() + i, 1));
                const bulan = String(tanggal.getUTCMonth() + 1).padStart(2, '0');
                const kunci = tanggal.getUTCFullYear() + '-' + bulan;
                label.push(BULAN_SINGKAT[tanggal.getUTCMonth()]);
                nilai.push(tanggalLaporan.filter((item) => item.slice(0, 7) === kunci).length);
            }
        }

        return { label: label, nilai: nilai, satuan: satuan, jumlahRentang: jumlahRentang };
    }

    function renderStatistik() {
        const tbody = $('rankingTableBody');
        if (!tbody) return;
        isiFilter('stat');
        const dariInput = $('statFilterFrom');
        const sampaiInput = $('statFilterTo');
        const hariIni = tanggalHariIni();
        const bulanIni = rentangPreset('month', hariIni);
        dariInput.value = bulanIni.dari;
        sampaiInput.value = bulanIni.sampai;

        const error = $('statFilterError');
        const tombolPreset = [...document.querySelectorAll('[data-stat-preset]')];
        const perbaruiPresetAktif = () => {
            const hariSekarang = tanggalHariIni();
            tombolPreset.forEach((tombol) => {
                const preset = rentangPreset(tombol.dataset.statPreset, hariSekarang);
                const aktif = dariInput.value === preset.dari && sampaiInput.value === preset.sampai;
                tombol.classList.toggle('active', aktif);
                tombol.setAttribute('aria-pressed', aktif ? 'true' : 'false');
            });
        };
        const tampilkanError = (pesan) => {
            if (!error) return;
            error.textContent = pesan;
            error.classList.toggle('hidden', !pesan);
        };

        const terapkan = () => {
            const dari = dariInput.value;
            const sampai = sampaiInput.value;
            if (Boolean(dari) !== Boolean(sampai)) {
                tampilkanError('Isi kedua tanggal, atau kosongkan keduanya untuk menampilkan semua laporan.');
                return;
            }
            if (dari && sampai < dari) {
                tampilkanError('Tanggal akhir harus sama dengan atau setelah tanggal awal.');
                return;
            }

            tampilkanError('');
            perbaruiPresetAktif();
            const rentang = dari ? { dari: dari, sampai: sampai } : rentangPreset('all', tanggalHariIni());
            const f = Object.assign(bacaFilter('stat'), rentang);
            const data = laporan.filter((l) => lolosFilter(l, f));
            const grafik = hitungRentangGrafik(rentang.dari, rentang.sampai, data);

            setText('statTotal', data.length + ' Tiket');
            const selesai = data.filter((l) => l.status_ui === 'Selesai' || l.status === 'Selesai').length;
            setText('statResolusi', data.length ? ((selesai / data.length) * 100).toFixed(1) + '%' : '0%');
            const durasiKerja = data.filter((l) => l.waktu_mulai && l.waktu_selesai)
                .map((l) => A.parseTanggal(l.waktu_selesai) - A.parseTanggal(l.waktu_mulai));
            const durasiRespon = data.filter((l) => l.tanggal_verifikasi)
                .map((l) => A.parseTanggal(l.tanggal_verifikasi) - A.parseTanggal(l.tanggal_lapor));
            setText('statRata', formatDurasi(rata(durasiKerja)));
            setText('statRespon', formatDurasi(rata(durasiRespon)));

            const hasil = $('statFilterResult');
            if (hasil) hasil.textContent = data.length ? 'Menampilkan ringkasan ' + data.length + ' laporan' : 'Tidak ada laporan pada periode ini';
            renderRingkasanLaporan(data);

            const perRuang = new Map();
            data.forEach((l) => perRuang.set(l.nama_ruangan, (perRuang.get(l.nama_ruangan) || 0) + 1));
            const ranking = [...perRuang.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
            tbody.innerHTML = ranking.length ? ranking.map(([lokasi, n], i) =>
                '<tr><td><strong>#' + (i + 1) + '</strong></td><td>' + esc(lokasi) + '</td><td style="text-align:right;padding-right:24px;">' + n + ' Laporan</td></tr>').join('')
                : '<tr><td colspan="3" class="text-muted" style="padding:16px;">Tidak ada data.</td></tr>';

            const rentangLabel = grafik.satuan === 'bulan' ? 'bulan' : 'hari';
            setText('statChartTrendSubtitle', 'Frekuensi laporan per ' + grafik.satuan + ' · ' + grafik.jumlahRentang + ' ' + rentangLabel + ' terpilih');
            const kategori = new Map();
            data.forEach((l) => kategori.set(l.nama_kategori, (kategori.get(l.nama_kategori) || 0) + 1));
            const kategoriTerisi = [...kategori.entries()].filter(([, jumlah]) => jumlah > 0);
            gambarGrafik(grafik.label, grafik.nilai, kategoriTerisi.map(([nama]) => nama), kategoriTerisi.map(([, jumlah]) => jumlah));
        };

        const reset = () => {
            const rentang = rentangPreset('month', tanggalHariIni());
            dariInput.value = rentang.dari;
            sampaiInput.value = rentang.sampai;
            ['Category', 'Room', 'Status'].forEach((field) => {
                const input = $('statFilter' + field);
                if (input) input.value = '';
            });
            terapkan();
        };

        tombolPreset.forEach((tombol) => tombol.addEventListener('click', () => {
            const rentang = rentangPreset(tombol.dataset.statPreset, tanggalHariIni());
            dariInput.value = rentang.dari;
            sampaiInput.value = rentang.sampai;
            terapkan();
        }));
        [dariInput, sampaiInput].forEach((input) => input.addEventListener('input', () => {
            tampilkanError('');
            perbaruiPresetAktif();
        }));
        $('statFilterApply').addEventListener('click', terapkan);
        $('statFilterReset').addEventListener('click', reset);
        ['Category', 'Room', 'Status'].forEach((field) => {
            const input = $('statFilter' + field);
            if (input) input.addEventListener('change', terapkan);
        });
        perbaruiPresetAktif();
        terapkan();
    }

    function renderRingkasanLaporan(data) {
        const grid = $('ringkasanGrid');
        if (!grid) return;
        const kartu = [
            { label: 'Menunggu Verifikasi', status: 'menunggu_verifikasi', icon: 'fa-hourglass-half', theme: 'summary-yellow', matches: ['Menunggu Verifikasi'] },
            { label: 'Diteruskan ke Pusat', status: 'diteruskan_ke_pusat', icon: 'fa-building', theme: 'summary-purple', matches: ['Diteruskan ke Pusat'] },
            { label: 'Dalam Perbaikan', status: 'dalam_perbaikan', icon: 'fa-screwdriver-wrench', theme: 'summary-blue', matches: ['Dalam Perbaikan', 'Diproses'] },
            { label: 'Menunggu Review Hasil', status: 'menunggu_review_hasil', icon: 'fa-image', theme: 'summary-tosca', matches: ['Menunggu Review Hasil'] },
            { label: 'Selesai', status: 'selesai', icon: 'fa-circle-check', theme: 'summary-green', matches: ['Selesai'] },
            { label: 'Ditolak', status: 'ditolak', icon: 'fa-circle-xmark', theme: 'summary-red', matches: ['Ditolak'] },
        ];
        A.animateCountUp($('ringkasanTotal'), data.length);
        grid.classList.remove('hidden');
        grid.removeAttribute('aria-busy');
        const errorBox = $('ringkasanError');
        if (errorBox) errorBox.classList.add('hidden');
        grid.innerHTML = kartu.map((item) => {
            const jumlah = data.filter((l) => item.matches.includes(l.status_ui || l.status)).length;
            const persen = data.length ? Math.round((jumlah / data.length) * 100) : 0;
            return '<button type="button" class="report-summary-item ' + item.theme + '" data-status="' + item.status + '" aria-label="' + esc(item.label) + ': ' + jumlah + ' laporan">' +
                '<span class="report-summary-item-head"><span class="report-summary-icon"><i class="fa-solid ' + item.icon + '" aria-hidden="true"></i></span><span>' + esc(item.label) + '</span></span>' +
                '<strong class="report-summary-count" data-count-value="' + jumlah + '">0</strong>' +
                '<span class="report-summary-percent" data-count-percent="' + persen + '">0% dari total</span>' +
                '</button>';
        }).join('');
        grid.querySelectorAll('[data-count-value]').forEach((el) => A.animateCountUp(el, Number(el.dataset.countValue)));
        grid.querySelectorAll('[data-count-percent]').forEach((el) => A.animateCountUp(el, Number(el.dataset.countPercent), '% dari total'));
        grid.querySelectorAll('[data-status]').forEach((item) => {
            item.addEventListener('click', () => {
                window.location.href = 'riwayat.html?status=' + encodeURIComponent(item.dataset.status);
            });
        });
    }

    function gambarGrafik(labelTren, dataTren, labelKat, dataKat) {
        if (typeof Chart === 'undefined') return;
        const tren = $('trenChart'), kat = $('kategoriChart');
        if (tren) {
            if (!chartTren) {
                chartTren = new Chart(tren, {
                    type: 'line',
                    data: { labels: [], datasets: [{ label: 'Jumlah Laporan', data: [], borderColor: '#226cc6', backgroundColor: 'rgba(48,175,254,0.15)', fill: true, tension: 0, pointBackgroundColor: '#fff', pointBorderColor: '#30affe', pointBorderWidth: 3, pointRadius: 5 }] },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0, stepSize: 1 }, grid: { color: '#f1f5f9' } }, x: { grid: { display: false }, ticks: { autoSkip: false } } } },
                });
            }
            chartTren.data.labels = labelTren;
            chartTren.data.datasets[0].data = dataTren;
            chartTren.update();
        }
        if (kat) {
            if (!chartKategori) {
                chartKategori = new Chart(kat, {
                    type: 'doughnut',
                    data: { labels: [], datasets: [{ data: [], backgroundColor: WARNA_KATEGORI, borderWidth: 0 }] },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    boxWidth: 12,
                                    font: { size: 11 },
                                    generateLabels: (chart) => {
                                        const total = chart.data.datasets[0].data.reduce((jumlah, nilai) => jumlah + nilai, 0);
                                        return Chart.overrides.doughnut.plugins.legend.labels.generateLabels(chart)
                                            .filter((item) => chart.data.datasets[0].data[item.index] > 0)
                                            .map((item) => {
                                                const persen = total ? Math.round((chart.data.datasets[0].data[item.index] / total) * 100) : 0;
                                                return Object.assign({}, item, { text: item.text + ' ' + persen + '%' });
                                            });
                                    },
                                },
                            },
                        },
                        cutout: '65%',
                    },
                });
            }
            chartKategori.data.labels = labelKat;
            chartKategori.data.datasets[0].data = dataKat;
            chartKategori.update();
        }
    }

    let daftarTeknisi = [];

    async function muatTeknisi() {
        daftarTeknisi = await API.get('master/teknisi.php');
        renderTabelTeknisi();
    }

    function renderTabelTeknisi() {
        const tbody = $('tabelTeknisiBody');
        if (!tbody) return;
        if (!daftarTeknisi.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding:32px;color:var(--muted);">Belum ada data teknisi.</td></tr>';
            setText('teknisiSearchResult', 'Belum ada data teknisi.');
            return;
        }
        const query = ($('teknisiSearchInput')?.value || '').trim().toLowerCase();
        const hasil = daftarTeknisi.filter((t) =>
            [t.nama, t.email, t.nip, t.spesialisasi, t.status]
                .some((value) => String(value || '').toLowerCase().includes(query))
        );
        setText('teknisiSearchResult', 'Menampilkan ' + hasil.length + ' dari ' + daftarTeknisi.length + ' teknisi.');
        if (!hasil.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding:32px;color:var(--muted);">Teknisi tidak ditemukan.</td></tr>';
            return;
        }
        tbody.innerHTML = hasil.map((t, i) => {
            const st = t.status === 'Aktif' ? 'status-pill-success' : t.status === 'Cuti' ? 'status-pill-warning' : 'status-pill-danger';
            const tg = t.tugas_berjalan > 0 ? 'status-pill-info' : 'status-pill-neutral';
            return '<tr><td class="text-center" style="color:var(--muted);font-weight:700;">' + (i + 1) + '</td>' +
                '<td><div class="cell-reporter"><div class="avatar-circle">' + esc(A.inisial(t.nama)) + '</div><div><span class="cell-name">' + esc(t.nama) + '</span>' +
                '<span class="cell-meta" style="display:block;">' + esc(t.email) + '</span></div></div></td>' +
                '<td><span class="cell-name">' + esc(t.nip || '-') + '</span></td>' +
                '<td><span class="status-pill status-pill-info">' + esc(t.spesialisasi || '-') + '</span></td>' +
                '<td><span class="status-pill ' + st + '">' + esc(t.status) + '</span></td>' +
                '<td><span class="status-pill ' + tg + '">' + t.tugas_berjalan + ' tugas</span></td>' +
                '<td class="text-right"><div class="action-group" style="justify-content:flex-end;">' +
                '<button type="button" class="btn-icon" title="Edit" data-edit="' + t.id_user + '" style="color:var(--blue-dark);border-color:#bfdbfe;background:#eff6ff;">✎</button>' +
                '<button type="button" class="btn-icon btn-icon-danger" title="Hapus" data-hapus="' + t.id_user + '">🗑</button></div></td></tr>';
        }).join('');
        tbody.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => window.bukaModalTeknisi(Number(b.dataset.edit))));
        tbody.querySelectorAll('[data-hapus]').forEach((b) => b.addEventListener('click', () => window.hapusTeknisi(Number(b.dataset.hapus))));
    }

    window.bukaModalTeknisi = function (id) {
        const modal = $('modalTeknisi');
        if (!modal) return;
        $('formTeknisi').reset();
        $('teknisiId').value = '';
        const pw = $('passwordTeknisi');
        if (id) {
            const t = daftarTeknisi.find((x) => x.id_user === id);
            if (!t) return;
            setText('modalTeknisiTitle', 'Edit Data Teknisi');
            $('teknisiId').value = t.id_user;
            $('namaTeknisi').value = t.nama;
            $('emailTeknisi').value = t.email;
            $('nipTeknisi').value = t.nip || '';
            $('spesialisasiTeknisi').value = t.spesialisasi || '';
            $('statusTeknisi').value = t.status;
            pw.required = false;
            pw.placeholder = 'Kosongkan jika tidak diubah';
        } else {
            setText('modalTeknisiTitle', 'Tambah Teknisi Baru');
            pw.required = true;
            pw.placeholder = 'Minimal 8 karakter';
        }
        modal.classList.remove('hidden');
    };
    window.tutupModalTeknisi = function () { const m = $('modalTeknisi'); if (m) m.classList.add('hidden'); };

    window.simpanTeknisi = async function (event) {
        event.preventDefault();
        const id = $('teknisiId').value;
        const data = {
            id_verifikator: sesi.id_user,
            nama: $('namaTeknisi').value.trim(),
            email: $('emailTeknisi').value.trim(),
            password: $('passwordTeknisi').value,
            nip: $('nipTeknisi').value.trim(),
            spesialisasi: $('spesialisasiTeknisi').value,
            status: $('statusTeknisi').value,
        };
        if (!data.nama || !data.email || !data.nip || !data.spesialisasi || !data.status) { A.showToast('Semua kolom wajib diisi!', 'error'); return; }
        try {
            if (id) { data.id_user = Number(id); await API.put('verifikator/kelola_teknisi.php', data); A.showToast('Data teknisi berhasil diperbarui.', 'success'); }
            else { await API.post('verifikator/kelola_teknisi.php', data); A.showToast('Teknisi baru berhasil ditambahkan.', 'success'); }
            window.tutupModalTeknisi();
            await muatTeknisi();
        } catch (err) { A.showToast(err.message, 'error'); }
    };

    window.hapusTeknisi = async function (id) {
        const t = daftarTeknisi.find((x) => x.id_user === id);
        if (!t || !confirm('Yakin ingin menghapus teknisi "' + t.nama + '"?')) return;
        try {
            await API.del('verifikator/kelola_teknisi.php', { id_verifikator: sesi.id_user, id_user: id });
            A.showToast('Teknisi "' + t.nama + '" telah dihapus.', 'info');
            await muatTeknisi();
        } catch (err) { A.showToast(err.message, 'error'); }
    };

    document.addEventListener('DOMContentLoaded', async () => {
        try {
            if ($('tabelTeknisiBody')) {
                $('teknisiSearchInput')?.addEventListener('input', renderTabelTeknisi);
                await muatTeknisi();
                return;
            }

            if ($('verifikatorTableBody')) {
                ikatModalDashboard();
                await Promise.all([muatLaporan(), muatTeknisiAktif()]);
                renderDashboard();
                return;
            }
            if ($('riwayatList')) {
                ikatPill();
                await muatLaporan();
                renderRiwayat();
                return;
            }
            if ($('rankingTableBody')) {
                await muatLaporan();
                renderStatistik();
            }
        } catch (err) {
            A.showToast(err.message, 'error');
        }
    });

})();