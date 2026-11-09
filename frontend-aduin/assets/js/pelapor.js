/**
 * pelapor.js - Halaman Pelapor (mahasiswa/dosen): dashboard, buat laporan, daftar laporan.
 * Semua data diambil dari backend lewat API (lihat assets/js/api.js).
 */
(function () {
  'use strict';

  const A = window.ADUIN;
  const API = A.API;
  const esc = A.escapeHtml;
  const sesi = A.getSession();
  if (!sesi) return; // guard() di api.js sudah mengarahkan ke login

  let semuaLaporan = [];

  async function muatLaporan() {
    semuaLaporan = await API.get('pelapor/riwayat.php', { id_pelapor: sesi.id_user });
    return semuaLaporan;
  }

  /* ------------------------------------------------------------------
     Timeline progres (4 langkah, versi sederhana untuk pelapor)
     ------------------------------------------------------------------ */
  function progresLaporan(r) {
    const status = A.statusUntukPelapor(r.status_ui);
    const kembali = status === 'Dikembalikan ke Pelapor';
    const aktif = status === 'Menunggu Verifikasi' ? 0 : status === 'Selesai' ? 3 : 1;

    const langkah = [
      { label: 'Dikirim', sub: A.tanggalPendek(r.tanggal_lapor) },
      { label: 'Diverifikasi', sub: status !== 'Menunggu Verifikasi' ? A.tanggalPendek(r.tanggal_verifikasi) : '-' },
      { label: kembali ? 'Dikembalikan' : 'Diproses', sub: kembali ? 'Dikembalikan ke Pelapor' : (r.nama_teknisi ? 'Ditangani ' + r.nama_teknisi : 'Ditangani Teknisi') },
      { label: 'Selesai', sub: status === 'Selesai' ? A.tanggalPendek(r.tanggal_status_terakhir) : '-' },
    ];

    const nodes = langkah.map(function (l, i) {
      const tercapai = status === 'Selesai' || i < aktif;
      const sedang = i === aktif && status !== 'Selesai';
      const cls = status === 'Selesai' ? ' success' : tercapai ? ' done' : sedang ? ' active' : '';
      return '<div class="timeline-node' + cls + '"><div class="timeline-dot">' + (tercapai ? '✓' : i + 1) +
        '</div><span class="timeline-caption">' + esc(l.label) + '</span><span class="timeline-sub">' + esc(l.sub) + '</span></div>';
    }).join('');

    return '<div class="timeline-wrap"><p class="timeline-label">PROGRES LAPORAN</p><div class="timeline">' + nodes + '</div></div>';
  }

  /* ------------------------------------------------------------------
     Dashboard (index.html)
     ------------------------------------------------------------------ */
  function renderDashboard() {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = String(v); };
    const st = (r) => A.statusUntukPelapor(r.status_ui);
    set('total-reports', semuaLaporan.length);
    set('pending-reports', semuaLaporan.filter((r) => st(r) === 'Menunggu Verifikasi').length);
    set('processing-reports', semuaLaporan.filter((r) => st(r) === 'Diproses').length);
    set('completed-reports', semuaLaporan.filter((r) => st(r) === 'Selesai').length);

    const tbody = document.getElementById('dashboard-reports');
    if (!tbody) return;
    const terbaru = semuaLaporan.slice(0, 5);
    if (!terbaru.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-muted">Belum ada laporan. Buat laporan pertamamu untuk mulai.</td></tr>';
      return;
    }
    tbody.innerHTML = terbaru.map(function (r) {
      const s = st(r);
      return '<tr><td>' + esc(r.nama_pelapor) + '</td><td>' + esc(r.nama_ruangan) + '</td><td>' + esc(r.nama_kategori) +
        '</td><td><span class="status-pill ' + A.pillClass(s) + '">' + esc(s) + '</span></td></tr>';
    }).join('');
  }

  /* ------------------------------------------------------------------
     Daftar laporan (daftar_laporan.html)
     ------------------------------------------------------------------ */
  function kartuLaporan(r) {
    const s = A.statusUntukPelapor(r.status_ui);
    const card = document.createElement('article');
    card.className = 'glass-card riwayat-card';
    card.style.cursor = 'pointer';
    card.dataset.status = s;

    let html =
      '<div class="riwayat-head"><div>' +
      '<h3 class="riwayat-title">' + esc(r.judul_laporan) + '<span class="riwayat-code">#' + r.id_pengaduan + '</span></h3>' +
      '<p class="riwayat-meta">' + esc(r.nama_ruangan) + ' · ' + A.tanggalJam(r.tanggal_lapor) + '</p>' +
      '<p class="riwayat-meta">Pelapor: ' + esc(r.nama_pelapor) + ' · ' + esc(r.nama_kategori) + '</p></div>' +
      '<span class="status-pill ' + A.pillClass(s) + '">' + esc(s) + '</span></div>';

    if (r.deskripsi) html += '<p class="card-subtitle">' + esc(r.deskripsi) + '</p>';
    if (s === 'Dikembalikan ke Pelapor' && r.alasan_penolakan) {
      html += '<p style="font-size:12px;color:#b91c1c;margin-top:8px;">Alasan dikembalikan: ' + esc(r.alasan_penolakan) + '</p>';
    }
        if (r.foto_list.length) {
      html += '<div class="report-photo-grid">' +
        AduinGallery.render(r.foto_list.map((f) => A.fileUrl(f)), { maxVisible: 4 }) + '</div>';
    }
    html += progresLaporan(r);
    card.innerHTML = html;
        card.addEventListener('click', (e) => {
      if (e.target.closest('.aduin-gallery__item')) return;   // klik foto = buka viewer, bukan modal
      bukaDetail(r);
    });
    return card;
  }

  function bukaDetail(r) {
    let modal = document.getElementById('detail-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'detail-modal';
      modal.className = 'modal-overlay hidden';
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
      document.body.append(modal);
    }
    const s = A.statusUntukPelapor(r.status_ui);
    const urlBukti = r.foto_list.map((f) => A.fileUrl(f));              // TAMBAH
    const urlHasil = (r.foto_hasil_list || []).map((f) => A.fileUrl(f)); // TAMBAH
    modal.innerHTML =
      '<div class="modal-box" style="max-width:560px;max-height:90vh;overflow:auto;">' +
      '<div class="modal-header"><div><h3 class="modal-title">' + esc(r.judul_laporan) + '</h3>' +
      '<span class="modal-subtitle">#' + r.id_pengaduan + ' · ' + esc(r.nama_ruangan) + '</span></div>' +
      '<button type="button" class="modal-close" id="close-modal">&times;</button></div>' +
      '<div class="modal-body" style="font-size:13px;">' +
      '<p><strong>Kategori:</strong> ' + esc(r.nama_kategori) + '</p>' +
      '<p><strong>Status:</strong> <span class="status-pill ' + A.pillClass(s) + '">' + esc(s) + '</span></p>' +
      '<p><strong>Dilaporkan:</strong> ' + A.tanggalJam(r.tanggal_lapor) + '</p>' +
      '<p><strong>Deskripsi:</strong> ' + esc(r.deskripsi) + '</p>' +
      (r.alasan_penolakan ? '<p style="color:#b91c1c;"><strong>Alasan dikembalikan:</strong> ' + esc(r.alasan_penolakan) + '</p>' : '') +
      '<p><strong>Foto bukti pelapor (' + urlBukti.length + '):</strong></p>' +
      AduinGallery.render(urlBukti, { size: 'lg', maxVisible: 6, emptyText: 'Tidak ada foto.' }) +
      (urlHasil.length
        ? '<p><strong>Foto hasil pengerjaan (' + urlHasil.length + '):</strong></p>' +
          AduinGallery.render(urlHasil, { size: 'lg', maxVisible: 6 })
        : '') +
      '</div></div>';
    modal.classList.remove('hidden');
    document.getElementById('close-modal').onclick = () => modal.classList.add('hidden');
  }

  function renderDaftar() {
    const list = document.getElementById('reports-list');
    if (!list) return;
    const filter = list.dataset.filter || 'all';
    list.replaceChildren();
    const tampil = semuaLaporan.filter((r) => filter === 'all' || A.statusUntukPelapor(r.status_ui) === filter);
    tampil.forEach((r) => list.append(kartuLaporan(r)));
    if (!tampil.length) {
      const p = document.createElement('p');
      p.className = 'glass-card text-muted';
      p.textContent = 'Belum ada laporan untuk status ini.';
      list.append(p);
    }
  }

  function initFilter() {
    const list = document.getElementById('reports-list');
    if (!list) return;
    document.querySelectorAll('[data-report-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-report-filter]').forEach((b) => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        list.dataset.filter = btn.dataset.reportFilter;
        renderDaftar();
      });
    });
  }

  /* ------------------------------------------------------------------
     Form buat laporan (laporan.html)
     ------------------------------------------------------------------ */
  async function isiPilihan() {
    const selRuang = document.getElementById('report-room');
    const selKat = document.getElementById('report-category');
    const [ruangan, kategori] = await Promise.all([API.get('master/ruangan.php'), API.get('master/kategori.php')]);

    // Kelompokkan ruangan per lantai
    const perLantai = {};
    ruangan.forEach((r) => { (perLantai[r.lantai] = perLantai[r.lantai] || []).push(r); });
    selRuang.innerHTML = '<option value="">Pilih ruangan / fasilitas</option>' +
      Object.keys(perLantai).sort((a, b) => a - b).map((lt) =>
        '<optgroup label="Lantai ' + lt + '">' +
        perLantai[lt].map((r) => '<option value="' + r.id_ruangan + '">' + esc(r.nama_ruangan) + '</option>').join('') + '</optgroup>'
      ).join('');
    selKat.innerHTML = '<option value="">Pilih kategori</option>' +
      kategori.map((k) => '<option value="' + k.id_fasilitas + '">' + esc(k.nama_kategori) + '</option>').join('');
  }

  function initFormLaporan() {
    const form = document.getElementById('report-form');
    if (!form) return;

    const feedback = document.getElementById('report-feedback');
    const tampilPesan = (pesan, galat) => {
      feedback.textContent = pesan;
      feedback.className = 'alert-box status-pill ' + (galat ? 'status-pill-danger' : 'status-pill-success');
    };

    isiPilihan().catch((e) => tampilPesan('Gagal memuat daftar ruangan/kategori: ' + e.message, true));

    const dateInput = document.getElementById('report-date');
    if (dateInput) {
      dateInput.value = new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date()) + ' WIB';
    }

    /* ---- foto ---- */
    let fotoDipilih = [];
    const MAKS_FOTO = 5, MAKS_UKURAN = 10 * 1024 * 1024;
    const photoInput = document.getElementById('report-photo');
    const feedbackFoto = document.getElementById('photo-feedback');
    const dropzone = document.getElementById('photo-dropzone');
    const previewList = document.getElementById('photo-preview-list');

    const pesanFoto = (t, galat) => {
      feedbackFoto.textContent = t;
      feedbackFoto.className = t ? 'status-pill ' + (galat ? 'status-pill-danger' : 'status-pill-success') : 'text-muted';
    };

    function tambahFoto(daftar) {
      if (!daftar || !daftar.length) return;
      const valid = [];
      for (const f of Array.from(daftar)) {
        if (!['image/png', 'image/jpeg'].includes(f.type)) return pesanFoto('File "' + f.name + '" bukan PNG/JPG.', true);
        if (f.size > MAKS_UKURAN) return pesanFoto('File "' + f.name + '" melebihi 10MB.', true);
        valid.push(f);
      }
      const gabung = fotoDipilih.concat(valid);
      if (gabung.length > MAKS_FOTO) {
        fotoDipilih = gabung.slice(0, MAKS_FOTO);
        pesanFoto('Maksimal hanya ' + MAKS_FOTO + ' foto yang diperbolehkan.', true);
      } else {
        fotoDipilih = gabung;
        pesanFoto(fotoDipilih.length + ' foto berhasil dipilih.', false);
      }
      gambarPratinjau();
    }

        let urlPratinjau = [];
    function gambarPratinjau() {
      urlPratinjau.forEach((u) => URL.revokeObjectURL(u));
      previewList.innerHTML = '';
      if (!fotoDipilih.length) { urlPratinjau = []; pesanFoto('', false); return; }
      urlPratinjau = fotoDipilih.map((f) => URL.createObjectURL(f));
      fotoDipilih.forEach((file, index) => {
        const li = document.createElement('li');
        li.className = 'aduin-uploader__thumb';
        const img = document.createElement('img');
        img.src = urlPratinjau[index];
        img.alt = file.name;
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', () => AduinGallery.open(urlPratinjau, index));
        const x = document.createElement('button');
        x.type = 'button';
        x.className = 'aduin-uploader__remove';
        x.setAttribute('aria-label', 'Hapus ' + file.name);
        x.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
        x.onclick = () => {
          fotoDipilih.splice(index, 1);
          if (fotoDipilih.length) pesanFoto(fotoDipilih.length + ' foto berhasil dipilih.', false);
          gambarPratinjau();
        };
        li.append(img, x);
        previewList.appendChild(li);
      });
    }

    const pilihBtn = document.getElementById('choose-report-photo');
    if (pilihBtn && photoInput) {
      pilihBtn.addEventListener('click', () => { photoInput.value = ''; photoInput.click(); });
      photoInput.addEventListener('change', () => tambahFoto(photoInput.files));
    }
    if (dropzone) {
      dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('status-badge-success'); });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('status-badge-success'));
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('status-badge-success');
        tambahFoto(e.dataTransfer.files);
      });
    }

    /* ---- kirim ---- */
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;

      const selKat = document.getElementById('report-category');
      const kategoriNama = selKat.selectedOptions[0].textContent.trim();
      const deskripsi = document.getElementById('report-description').value.trim();
      const judul = kategoriNama + ': ' + (deskripsi.split(/[.!?\n]/)[0].slice(0, 55) || kategoriNama);

      const fd = new FormData();
      fd.append('id_pelapor', sesi.id_user);
      fd.append('id_ruangan', document.getElementById('report-room').value);
      fd.append('id_fasilitas', selKat.value);
      fd.append('judul_laporan', judul);
      fd.append('deskripsi', deskripsi);

      const tombol = form.querySelector('button[type="submit"]');
      tombol.disabled = true;
      tampilPesan('Mengirim laporan...', false);
      try {
        for (const f of fotoDipilih) {
          const kecil = await A.kompresGambar(f);
          fd.append('foto_bukti[]', kecil, kecil.name);
        }
        await API.post('pelapor/buat_pengaduan.php', fd);
        A.showToast('Laporan berhasil dikirim!', 'success');
        setTimeout(() => { window.location.href = 'daftar_laporan.html'; }, 700);
      } catch (err) {
        tampilPesan(err.message, true);
        tombol.disabled = false;
      }
    });
  }

  /* ------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('report-form')) initFormLaporan();

    const butuhData = document.getElementById('total-reports') || document.getElementById('reports-list');
    if (butuhData) {
      initFilter();
      try {
        await muatLaporan();
        renderDashboard();
        renderDaftar();
      } catch (err) {
        A.showToast(err.message, 'error');
        const tbody = document.getElementById('dashboard-reports');
        if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="text-muted">Gagal memuat laporan.</td></tr>';
      }
    }
  });
})();
