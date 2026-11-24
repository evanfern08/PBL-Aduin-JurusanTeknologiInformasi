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
  function isiFilter(prefix) {
    const opsi = (selId, ambil) => {
      const sel = $(prefix + selId);
      if (!sel) return;
      const nilai = sel.value;
      const pertama = sel.options[0];
      const set = new Set(laporan.map(ambil).filter(Boolean));
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
  let activeReport = null; // laporan yang sedang di modal approve/reject

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
    renderMetrik();
    isiFilter('dashboard');

    tbody.innerHTML = '';
    if (!laporan.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted" style="padding:24px;">Belum ada laporan masuk.</td></tr>';
    }

    laporan.forEach((l) => {
      const tr = document.createElement('tr');
      tr.dataset.id = l.id_pengaduan;
      const foto = l.foto_list.length
        ? '<button type="button" class="thumb-btn" data-foto="' + esc(A.fileUrl(l.foto_list[0])) + '"><img src="' + esc(A.fileUrl(l.foto_list[0])) + '" alt="Bukti" class="thumb-img"></button>' +
          (l.foto_list.length > 1 ? '<span class="cell-meta" style="display:block;">+' + (l.foto_list.length - 1) + ' foto</span>' : '')
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

      const fotoBtn = tr.querySelector('[data-foto]');
      if (fotoBtn) fotoBtn.addEventListener('click', () => window.openImageModal(fotoBtn.dataset.foto));
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
      if (hasil) hasil.textContent = 'Menampilkan ' + tampil + ' dari ' + laporan.length + ' laporan.';
    };
    if (cariInput && !cariInput.dataset.bound) { cariInput.dataset.bound = '1'; cariInput.addEventListener('input', terapkan); }
    if (!tbody.dataset.filterBound) { tbody.dataset.filterBound = '1'; ikatFilter('dashboard', terapkan); }
    window.__terapkanFilterDashboard = terapkan;
    terapkan();
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
        muatTeknisiAktif().catch(() => {});
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

  const STATUS_DAFTAR = [
    'Semua',
    'Menunggu Verifikasi',
    'Diteruskan ke Pusat',
    'Dalam Perbaikan',
    'Menunggu Review Hasil',
    'Selesai',
    'Ditolak',
  ];
  const STATUS_URL_MAP = {
    menunggu_verifikasi: 'Menunggu Verifikasi',
    diteruskan_ke_pusat: 'Diteruskan ke Pusat',
    dalam_perbaikan: 'Dalam Perbaikan',
    menunggu_review_hasil: 'Menunggu Review Hasil',
    selesai: 'Selesai',
    ditolak: 'Ditolak',
  };
  let stateRiwayat = null;
  let metaRiwayat = null;
  let draftRentang = { dari: '', sampai: '' };
  let nomorPermintaanRiwayat = 0;

  function hariIniJakarta() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const ambil = (jenis) => parts.find((part) => part.type === jenis).value;
    return ambil('year') + '-' + ambil('month') + '-' + ambil('day');
  }

  function tambahHariIso(iso, jumlah) {
    const tanggal = new Date(iso + 'T12:00:00Z');
    tanggal.setUTCDate(tanggal.getUTCDate() + jumlah);
    return tanggal.toISOString().slice(0, 10);
  }

  function rentangPreset(preset) {
    const hariIni = hariIniJakarta();
    if (preset === 'all') return { dari: '', sampai: '' };
    if (preset === 'month') return { dari: hariIni.slice(0, 8) + '01', sampai: hariIni };
    const jumlahHari = preset === '30' ? 30 : 7;
    return { dari: tambahHariIso(hariIni, -jumlahHari), sampai: hariIni };
  }

  function bacaStateRiwayatUrl() {
    const params = new URLSearchParams(window.location.search);
    const statusUrl = params.get('status') || '';
    const status = STATUS_DAFTAR.includes(statusUrl) ? statusUrl : (STATUS_URL_MAP[statusUrl] || 'Semua');
    const tanggalSemua = params.get('tanggal_semua') === '1';
    const adaTanggal = Boolean(params.get('tanggal_dari') || params.get('tanggal_sampai'));
    let rentang = { dari: '', sampai: '' };
    if (tanggalSemua) {
      rentang = rentangPreset('all');
    } else if (adaTanggal) {
      const defaultRentang = rentangPreset('7');
      rentang = {
        dari: params.get('tanggal_dari') || defaultRentang.dari,
        sampai: params.get('tanggal_sampai') || defaultRentang.sampai,
      };
    } else if (!statusUrl || status === 'Semua') {
      rentang = rentangPreset('7');
    }

    const perPage = Number(params.get('per_page'));
    const page = Number(params.get('page'));
    return {
      status: status,
      dari: rentang.dari,
      sampai: rentang.sampai,
      perPage: [10, 25, 50].includes(perPage) ? perPage : 10,
      page: Number.isInteger(page) && page > 0 ? page : 1,
    };
  }

  function simpanStateRiwayatUrl(push) {
    const params = new URLSearchParams();
    if (stateRiwayat.status !== 'Semua') params.set('status', stateRiwayat.status);
    if (stateRiwayat.dari && stateRiwayat.sampai) {
      params.set('tanggal_dari', stateRiwayat.dari);
      params.set('tanggal_sampai', stateRiwayat.sampai);
    } else {
      params.set('tanggal_semua', '1');
    }
    params.set('per_page', String(stateRiwayat.perPage));
    params.set('page', String(stateRiwayat.page));
    const url = window.location.pathname + '?' + params.toString();
    if (push) window.history.pushState(null, '', url);
    else window.history.replaceState(null, '', url);
  }

  function tanggalTerformat(iso) {
    const tanggal = new Date(iso + 'T12:00:00Z');
    const part = {};
    new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric',
    }).formatToParts(tanggal).forEach((item) => { part[item.type] = item.value; });
    return part;
  }

  function labelRentangTanggal(dari, sampai) {
    const awal = tanggalTerformat(dari);
    const akhir = tanggalTerformat(sampai);
    const tahunAwal = awal.year === akhir.year ? '' : ' ' + awal.year;
    return awal.day + ' ' + awal.month + tahunAwal + ' – ' + akhir.day + ' ' + akhir.month + ' ' + akhir.year;
  }

  function presetRentangAktif(rentang) {
    if (!rentang.dari && !rentang.sampai) return 'all';
    return ['7', '30', 'month'].find((preset) => {
      const nilai = rentangPreset(preset);
      return nilai.dari === rentang.dari && nilai.sampai === rentang.sampai;
    }) || '';
  }

  function renderKontrolRentang() {
    const inputDari = $('dateFilterFrom');
    const inputSampai = $('dateFilterTo');
    if (!inputDari || !inputSampai) return;
    inputDari.value = draftRentang.dari;
    inputSampai.value = draftRentang.sampai;
    const preset = presetRentangAktif(draftRentang);
    document.querySelectorAll('[data-date-preset]').forEach((button) => {
      const active = button.dataset.datePreset === preset;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function renderFilterRiwayat() {
    document.querySelectorAll('.filter-pill').forEach((button) => {
      const active = button.dataset.filter === stateRiwayat.status;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const aktif = Boolean(stateRiwayat.dari && stateRiwayat.sampai) || stateRiwayat.status !== 'Semua';
    $('dateFilterDot').classList.toggle('hidden', !aktif);
    const row = $('activeDateFilter');
    row.classList.toggle('hidden', !stateRiwayat.dari || !stateRiwayat.sampai);
    if (stateRiwayat.dari && stateRiwayat.sampai) {
      const preset = presetRentangAktif(stateRiwayat);
      const presetLabel = preset === '7' ? '7 hari terakhir'
        : preset === '30' ? '30 hari terakhir'
          : preset === 'month' ? 'Bulan ini' : 'Rentang kustom';
      $('activeDateFilterText').textContent = labelRentangTanggal(stateRiwayat.dari, stateRiwayat.sampai) + ' · ' + presetLabel;
    }
  }

  function bukaPanelTanggal(buka) {
    const panel = $('dateFilterPanel');
    const tombol = $('btnDateFilter');
    panel.classList.toggle('hidden', !buka);
    tombol.classList.toggle('is-open', buka);
    tombol.setAttribute('aria-expanded', String(buka));
    if (buka) {
      draftRentang = { dari: stateRiwayat.dari || '', sampai: stateRiwayat.sampai || '' };
      renderKontrolRentang();
      $('dateFilterError').classList.add('hidden');
    }
  }

  function setRentangDraft(preset) {
    draftRentang = rentangPreset(preset);
    renderKontrolRentang();
    $('dateFilterError').classList.add('hidden');
  }

  function tampilkanSkeletonRiwayat() {
    const list = $('riwayatList');
    list.setAttribute('aria-busy', 'true');
    list.innerHTML = Array.from({ length: 3 }, () =>
      '<div class="report-skeleton-card" aria-hidden="true"><div class="report-skeleton-line medium"></div>' +
      '<div class="report-skeleton-line short"></div><div class="report-skeleton-line long"></div>' +
      '<div class="report-skeleton-timeline"><span></span><span></span><span></span><span></span><span></span></div></div>'
    ).join('');
    $('reportPagination').classList.add('hidden');
  }

  function buatStateRiwayat(pesan, tombol) {
    const list = $('riwayatList');
    list.removeAttribute('aria-busy');
    list.innerHTML = '<div class="report-state-card"><strong>' + esc(pesan) + '</strong>' +
      (tombol ? '<button type="button" class="btn btn-ghost" id="' + tombol.id + '">' + esc(tombol.label) + '</button>' : '') + '</div>';
    if (tombol && tombol.aksi) $(tombol.id).addEventListener('click', tombol.aksi);
  }

  function renderPaginationRiwayat() {
    const pagination = $('reportPagination');
    if (!metaRiwayat) {
      pagination.classList.add('hidden');
      return;
    }
    pagination.classList.remove('hidden');
    const total = Number(metaRiwayat.total);
    const halaman = Number(metaRiwayat.page);
    const perHalaman = Number(metaRiwayat.per_page);
    const totalHalaman = Number(metaRiwayat.total_pages);
    const mulai = total ? (halaman - 1) * perHalaman + 1 : 0;
    const akhir = Math.min(halaman * perHalaman, total);
    const rentangAwal = Math.max(1, Math.min(halaman - 2, totalHalaman - 4));
    const rentangAkhir = Math.min(totalHalaman, rentangAwal + 4);
    let tombolHalaman = '';
    for (let nomor = rentangAwal; nomor <= rentangAkhir; nomor++) {
      tombolHalaman += '<button type="button" class="report-page-button' + (nomor === halaman ? ' active' : '') +
        '" data-page="' + nomor + '" aria-label="Halaman ' + nomor + '"' +
        (nomor === halaman ? ' aria-current="page"' : '') + '>' + nomor + '</button>';
    }
    pagination.innerHTML =
      '<div class="report-pagination-info"><span>Tampilkan</span><select id="reportPerPage" aria-label="Jumlah laporan per halaman">' +
      [10, 25, 50].map((jumlah) => '<option value="' + jumlah + '"' + (jumlah === perHalaman ? ' selected' : '') + '>' + jumlah + '</option>').join('') +
      '</select><span>per halaman · ' + mulai + '–' + akhir + ' dari ' + total + ' laporan</span></div>' +
      '<div class="report-pagination-buttons"><button type="button" class="report-page-button" data-page="' + (halaman - 1) +
      '" aria-label="Halaman sebelumnya"' + (halaman <= 1 ? ' disabled' : '') + '><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button>' +
      tombolHalaman + '<button type="button" class="report-page-button" data-page="' + (halaman + 1) +
      '" aria-label="Halaman berikutnya"' + (halaman >= totalHalaman ? ' disabled' : '') + '><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button></div>';

    $('reportPerPage').addEventListener('change', () => {
      stateRiwayat.perPage = Number($('reportPerPage').value);
      stateRiwayat.page = 1;
      pindahHalamanRiwayat();
    });
    pagination.querySelectorAll('[data-page]').forEach((button) => {
      button.addEventListener('click', () => {
        if (button.disabled) return;
        stateRiwayat.page = Number(button.dataset.page);
        pindahHalamanRiwayat(true);
      });
    });
  }

  async function pindahHalamanRiwayat(scrollKeDaftar) {
    simpanStateRiwayatUrl(true);
    await muatHalamanRiwayat();
    if (scrollKeDaftar) {
      const posisi = $('riwayatList').getBoundingClientRect().top + window.scrollY - 16;
      window.scrollTo({ top: posisi, behavior: 'smooth' });
    }
  }

  async function muatHalamanRiwayat() {
    if (!stateRiwayat) return;
    const nomorPermintaan = ++nomorPermintaanRiwayat;
    tampilkanSkeletonRiwayat();
    const params = {
      id_verifikator: sesi.id_user,
      status: stateRiwayat.status !== 'Semua' ? stateRiwayat.status : undefined,
      tanggal_dari: stateRiwayat.dari || undefined,
      tanggal_sampai: stateRiwayat.sampai || undefined,
      tanggal_semua: !stateRiwayat.dari && !stateRiwayat.sampai ? 1 : undefined,
      per_page: stateRiwayat.perPage,
      page: stateRiwayat.page,
    };
    try {
      const response = await API.get('api/laporan/daftar.php', params);
      if (nomorPermintaan !== nomorPermintaanRiwayat) return;
      if (!response || !Array.isArray(response.data) || !response.meta) {
        throw new Error('Respons daftar laporan tidak valid.');
      }
      laporan = response.data;
      metaRiwayat = response.meta;
      stateRiwayat.page = Number(metaRiwayat.page) || 1;
      stateRiwayat.perPage = Number(metaRiwayat.per_page) || 10;
      if (metaRiwayat.tanggal_dari && metaRiwayat.tanggal_sampai) {
        stateRiwayat.dari = metaRiwayat.tanggal_dari;
        stateRiwayat.sampai = metaRiwayat.tanggal_sampai;
      }
      simpanStateRiwayatUrl(false);
      renderFilterRiwayat();
      renderRiwayat();
    } catch (err) {
      if (nomorPermintaan !== nomorPermintaanRiwayat) return;
      console.error('[Daftar Laporan] Gagal memuat data:', err);
      buatStateRiwayat('Gagal memuat laporan: ' + (err.message || 'Terjadi kesalahan.'), {
        id: 'btnRetryRiwayat',
        label: 'Coba lagi',
        aksi: muatHalamanRiwayat,
      });
      metaRiwayat = null;
    }
  }

  function renderRiwayat() {
    const list = $('riwayatList');
    if (!list) return;
    list.innerHTML = '';
    list.removeAttribute('aria-busy');
    if (!laporan.length) {
      buatStateRiwayat('Tidak ada laporan pada rentang ini', {
        id: 'btnViewAllReports',
        label: 'Lihat semua laporan',
        aksi: () => {
          stateRiwayat.status = 'Semua';
          stateRiwayat.dari = '';
          stateRiwayat.sampai = '';
          stateRiwayat.page = 1;
          renderFilterRiwayat();
          simpanStateRiwayatUrl(true);
          muatHalamanRiwayat();
        },
      });
    } else {
      laporan.forEach((l) => list.appendChild(kartuRiwayat(l)));
    }
    renderPaginationRiwayat();
    renderReminder();
  }

  function ikatPill() {
    document.querySelectorAll('.filter-pill').forEach((button) => button.addEventListener('click', () => {
      stateRiwayat.status = button.dataset.filter;
      stateRiwayat.page = 1;
      renderFilterRiwayat();
      pindahHalamanRiwayat();
    }));

    $('btnDateFilter').addEventListener('click', (event) => {
      event.stopPropagation();
      bukaPanelTanggal($('dateFilterPanel').classList.contains('hidden'));
    });
    $('dateFilterPanel').addEventListener('click', (event) => event.stopPropagation());
    document.addEventListener('click', (event) => {
      if (!$('reportFilterControl').contains(event.target)) bukaPanelTanggal(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') bukaPanelTanggal(false);
    });

    document.querySelectorAll('[data-date-preset]').forEach((button) => {
      button.addEventListener('click', () => setRentangDraft(button.dataset.datePreset));
    });
    ['dateFilterFrom', 'dateFilterTo'].forEach((id) => {
      $(id).addEventListener('change', () => {
        draftRentang = { dari: $('dateFilterFrom').value, sampai: $('dateFilterTo').value };
        renderKontrolRentang();
        $('dateFilterError').classList.add('hidden');
      });
    });
    $('btnDateFilterReset').addEventListener('click', () => setRentangDraft('7'));
    $('btnDateFilterApply').addEventListener('click', () => {
      const dari = $('dateFilterFrom').value;
      const sampai = $('dateFilterTo').value;
      const error = $('dateFilterError');
      if (Boolean(dari) !== Boolean(sampai)) {
        error.textContent = 'Isi tanggal Dari dan Sampai, atau pilih preset Semua.';
        error.classList.remove('hidden');
        return;
      }
      if (dari && dari > sampai) {
        error.textContent = 'Tanggal Dari tidak boleh melewati tanggal Sampai.';
        error.classList.remove('hidden');
        return;
      }
      stateRiwayat.dari = dari;
      stateRiwayat.sampai = sampai;
      stateRiwayat.page = 1;
      bukaPanelTanggal(false);
      renderFilterRiwayat();
      pindahHalamanRiwayat();
    });
    $('btnClearDateFilter').addEventListener('click', () => {
      stateRiwayat.dari = '';
      stateRiwayat.sampai = '';
      stateRiwayat.page = 1;
      renderFilterRiwayat();
      pindahHalamanRiwayat();
    });
    window.addEventListener('popstate', () => {
      stateRiwayat = bacaStateRiwayatUrl();
      draftRentang = { dari: stateRiwayat.dari || '', sampai: stateRiwayat.sampai || '' };
      renderKontrolRentang();
      renderFilterRiwayat();
      muatHalamanRiwayat();
    });
  }

  async function muatUlangRiwayat() {
    await muatHalamanRiwayat();
  }

  async function terimaHasil(l) {
    if (!confirm('Terima hasil perbaikan? Status laporan menjadi Selesai (final).')) return;
    try {
      await keputusan(l.id_pengaduan, 'terima_hasil');
      A.showToast('Hasil perbaikan diterima. Laporan Selesai.', 'success');
      await muatUlangRiwayat();
    } catch (err) { A.showToast(err.message, 'error'); }
  }

  /* ---- Modal aksi (tolak hasil / batal tolak) ---- */
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

  /* ---- Modal detail ---- */
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
    if (fotoBox) {
      if (d.foto_list.length) {
        fotoBox.style.display = 'block';
        fotoBox.innerHTML = '<strong>Foto Bukti Kerusakan:</strong><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">' +
          d.foto_list.map((f) => '<a href="' + esc(A.fileUrl(f)) + '" target="_blank" rel="noopener"><img src="' + esc(A.fileUrl(f)) +
            '" alt="Foto kerusakan" style="height:110px;border-radius:8px;border:1px solid #e2e8f0;object-fit:cover;"></a>').join('') + '</div>';
      } else { fotoBox.style.display = 'none'; fotoBox.innerHTML = ''; }
    }

    const hasil = $('detailHasil');
    if (hasil) {
      if (d.catatan_teknisi || d.foto_hasil || d.foto_sebelum) {
        hasil.style.display = 'block';
        const foto = (judul, p) => p ? '<div style="margin-top:8px;"><em>' + judul + '</em><br><a href="' + esc(A.fileUrl(p)) + '" target="_blank" rel="noopener"><img src="' + esc(A.fileUrl(p)) +
          '" alt="' + judul + '" style="max-width:100%;max-height:150px;border-radius:8px;"></a></div>' : '';
        hasil.innerHTML = '<strong>Hasil kerja teknisi' + (d.nama_teknisi ? ' (' + esc(d.nama_teknisi) + ')' : '') + ':</strong><br>' +
          esc(d.catatan_teknisi || '-') + foto('Foto sebelum', d.foto_sebelum) + foto('Foto sesudah', d.foto_hasil);
      } else { hasil.style.display = 'none'; }
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

  /* ---- Pengingat: laporan di UPA PP Pusat mengendap > 3 hari ---- */
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

  /* ==========================================================================
     STATISTIK
     ========================================================================== */
  function formatDurasi(ms) {
    if (ms === null || isNaN(ms)) return '—';
    const menit = ms / 60000;
    if (menit < 60) return Math.round(menit) + ' Menit';
    if (menit < 1440) return (menit / 60).toFixed(1) + ' Jam';
    return (menit / 1440).toFixed(1) + ' Hari';
  }
  function rata(daftar) { return daftar.length ? daftar.reduce((a, b) => a + b, 0) / daftar.length : null; }

  function renderStatistik() {
    const tbody = $('rankingTableBody');
    if (!tbody) return;
    isiFilter('stat');

    const terapkan = () => {
      const f = bacaFilter('stat');
      const data = laporan.filter((l) => lolosFilter(l, f));
      const filtered = Object.values(f).some(Boolean);

      setText('statTotal', data.length + ' Tiket');
      const selesai = data.filter((l) => l.status === 'Selesai').length;
      setText('statResolusi', data.length ? ((selesai / data.length) * 100).toFixed(1) + '%' : '0%');

      const durasiKerja = data.filter((l) => l.waktu_mulai && l.waktu_selesai)
        .map((l) => A.parseTanggal(l.waktu_selesai) - A.parseTanggal(l.waktu_mulai));
      const durasiRespon = data.filter((l) => l.tanggal_verifikasi)
        .map((l) => A.parseTanggal(l.tanggal_verifikasi) - A.parseTanggal(l.tanggal_lapor));
      setText('statRata', formatDurasi(rata(durasiKerja)));
      setText('statRespon', formatDurasi(rata(durasiRespon)));

      const hasil = $('statFilterResult');
      if (hasil) hasil.textContent = filtered ? 'Statistik menampilkan ' + data.length + ' dari ' + laporan.length + ' laporan.' : 'Menampilkan ringkasan seluruh ' + laporan.length + ' laporan.';

      // Peringkat ruangan
      const perRuang = new Map();
      data.forEach((l) => perRuang.set(l.nama_ruangan, (perRuang.get(l.nama_ruangan) || 0) + 1));
      const ranking = [...perRuang.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
      tbody.innerHTML = ranking.length ? ranking.map(([lokasi, n], i) =>
        '<tr><td><strong>#' + (i + 1) + '</strong></td><td>' + esc(lokasi) + '</td><td style="text-align:right;padding-right:24px;">' + n + ' Laporan</td></tr>').join('')
        : '<tr><td colspan="3" class="text-muted" style="padding:16px;">Tidak ada data.</td></tr>';

      // Tren 7 hari terakhir (berakhir pada laporan terbaru) & distribusi kategori
      const tanggalAda = data.map((l) => A.parseTanggal(l.tanggal_lapor)).filter(Boolean);
      const akhir = tanggalAda.length ? new Date(Math.max.apply(null, tanggalAda)) : new Date();
      const hariList = Array.from({ length: 7 }, (_, i) => { const d = new Date(akhir); d.setDate(d.getDate() - (6 - i)); return d; });
      const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      const tren = hariList.map((d) => data.filter((l) => A.tanggalIso(l.tanggal_lapor) === iso(d)).length);
      const kat = new Map();
      data.forEach((l) => kat.set(l.nama_kategori, (kat.get(l.nama_kategori) || 0) + 1));

      gambarGrafik(hariList.map((d) => d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })), tren, [...kat.keys()], [...kat.values()]);
    };

    ikatFilter('stat', terapkan);
    terapkan();
  }

  function gambarGrafik(labelTren, dataTren, labelKat, dataKat) {
    if (typeof Chart === 'undefined') return;
    const tren = $('trenChart'), kat = $('kategoriChart');
    if (tren) {
      const lama = Chart.getChart(tren); if (lama) lama.destroy();
      new Chart(tren, {
        type: 'line',
        data: { labels: labelTren, datasets: [{ label: 'Jumlah Laporan', data: dataTren, borderColor: '#226cc6', backgroundColor: 'rgba(48,175,254,0.15)', fill: true, tension: 0.4, pointBackgroundColor: '#fff', pointBorderColor: '#30affe', pointBorderWidth: 3, pointRadius: 5 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } },
      });
    }
    if (kat) {
      const lama = Chart.getChart(kat); if (lama) lama.destroy();
      new Chart(kat, {
        type: 'doughnut',
        data: { labels: labelKat, datasets: [{ data: dataKat, backgroundColor: ['#30affe', '#226cc6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316'], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }, cutout: '65%' },
      });
    }
  }

  /* ==========================================================================
     KELOLA TEKNISI
     ========================================================================== */
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
      return;
    }
    tbody.innerHTML = daftarTeknisi.map((t, i) => {
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

  /* ==========================================================================
     INIT
     ========================================================================== */
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      if ($('tabelTeknisiBody')) { await muatTeknisi(); return; }

      if ($('verifikatorTableBody')) {
        ikatModalDashboard();
        await Promise.all([muatLaporan(), muatTeknisiAktif()]);
        renderDashboard();
        return;
      }
      if ($('riwayatList')) {
        stateRiwayat = bacaStateRiwayatUrl();
        draftRentang = { dari: stateRiwayat.dari || '', sampai: stateRiwayat.sampai || '' };
        ikatPill();
        renderKontrolRentang();
        renderFilterRiwayat();
        simpanStateRiwayatUrl(false);
        await muatHalamanRiwayat();
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
