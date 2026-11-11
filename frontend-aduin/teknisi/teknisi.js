/**
 * teknisi.js - Halaman Teknisi: dashboard, daftar tugas, riwayat perbaikan.
 * Data tugas diambil dari backend (teknisi/tugas.php) dan diperbarui lewat teknisi/update_tugas.php.
 */
(function () {
  'use strict';

  const A = window.ADUIN;
  const API = A.API;
  const esc = A.escapeHtml;
  const sesi = A.getSession();
  if (!sesi) return;

  let tugas = [];
  let tugasAktifId = null;      // tugas yang sedang diedit di modal update
  let detailAktifId = null;     // tugas yang sedang dibuka di modal detail

  const cariTugas = (id) => tugas.find((t) => t.id_pengaduan === Number(id));

  async function muat() {
    tugas = await API.get('teknisi/tugas.php', { id_teknisi: sesi.id_user });
  }

  /* ------------------------------------------------------------------
     Metrik & kartu
     ------------------------------------------------------------------ */
  function hitung() {
    return {
      baru: tugas.filter((t) => t.status_tugas === 'Tugas Baru').length,
      proses: tugas.filter((t) => t.status_tugas === 'Sedang Dikerjakan').length,
      selesai: tugas.filter((t) => t.status_tugas === 'Selesai').length,
    };
  }

  function renderMetrik() {
    const h = hitung();
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('metric-baru', h.baru);
    set('metric-proses', h.proses);
    set('metric-selesai', h.selesai);
  }

  function badgeStatus(t) {
    const kelas = t.status_tugas === 'Selesai' ? 'status-pill-success' : t.status_tugas === 'Sedang Dikerjakan' ? 'status-pill-info' : 'status-pill-warning';
    let label = t.status_tugas;
    if (t.status_ui === 'Menunggu Review Hasil') label = 'Menunggu review';
    return '<span class="status-pill ' + kelas + '" style="float:right;">' + esc(label) + '</span>';
  }

  function kartuTugas(t) {
    const selesai = t.status_tugas === 'Selesai';
    const card = document.createElement('article');
    card.className = 'glass-card task-card';
    card.dataset.status = t.status_tugas;

    const revisi = t.revisi_ke > 0 && t.catatan_revisi && !selesai
      ? '<p style="font-size:12px;color:#b45309;margin:8px 0;">Revisi ke-' + t.revisi_ke + ': ' + esc(t.catatan_revisi) + '</p>' : '';

    const tombol = selesai
      ? '<button class="btn btn-ghost" style="width:100%;border:1px solid #cbd5e1;" data-aksi="detail">Lihat Detail Pengerjaan</button>'
      : '<button class="btn btn-success" style="width:100%;" data-aksi="update">Update Status &amp; Upload Bukti</button>';

    card.innerHTML =
      '<div class="task-body">' +
      '<h3 class="card-title">' + esc(t.judul_laporan) + ' <small style="float:right;font-size:12px;color:#666;">#' + t.id_pengaduan + '</small></h3>' +
      '<p style="margin:6px 0;">' + badgeStatus(t) + '<span class="status-pill status-pill-neutral">' + esc(t.nama_kategori) + '</span></p>' +
      '<p class="text-muted" style="margin:10px 0;"><i class="fa-solid fa-location-dot"></i> ' + esc(t.nama_ruangan) + '</p>' +
      '<p class="text-muted"><i class="fa-regular fa-user"></i> ' + esc(t.nama_pelapor) + '</p>' +
      '<p class="text-muted" style="margin-bottom:10px;"><i class="fa-regular fa-clock"></i> ' +
      (selesai ? 'Selesai ' + A.tanggalJam(t.waktu_selesai) : 'Dilaporkan ' + A.tanggalJam(t.tanggal_lapor)) + '</p>' +
      '<p style="font-size:13px;color:#475569;margin-bottom:10px;">' + esc(t.deskripsi) + '</p>' +
      (t.foto_list.length ? '<div style="display:flex;gap:6px;margin-bottom:10px;">' + t.foto_list.slice(0, 3).map((f) =>
        '<a href="' + esc(A.fileUrl(f)) + '" target="_blank" rel="noopener"><img src="' + esc(A.fileUrl(f)) + '" alt="Foto laporan" style="width:56px;height:56px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0;"></a>').join('') + '</div>' : '') +
      revisi + tombol + '</div>';

    const btn = card.querySelector('[data-aksi]');
    btn.addEventListener('click', () => (selesai ? window.lihatDetailRiwayat(t.id_pengaduan) : bukaModalUpdate(t.id_pengaduan)));
    return card;
  }

  function isiKontainer(el, daftar, kosong) {
    el.innerHTML = '';
    if (!daftar.length) { el.innerHTML = '<p class="text-muted" style="grid-column:1/-1;">' + kosong + '</p>'; return; }
    daftar.forEach((t) => el.appendChild(kartuTugas(t)));
  }

  /* ------------------------------------------------------------------
     Halaman
     ------------------------------------------------------------------ */
  function renderDashboard() {
    const el = document.getElementById('task-list-container');
    if (!el || document.getElementById('tab-container')) return;
    isiKontainer(el, tugas.filter((t) => t.status_tugas !== 'Selesai'), 'Tidak ada tugas aktif saat ini.');
  }

  let tabAktif = 'Tugas Baru';
  function renderDaftarTugas() {
    const tabs = document.getElementById('tab-container');
    const el = document.getElementById('task-list-container');
    if (!tabs || !el) return;

    const h = hitung();
    const def = [['Tugas Baru', h.baru], ['Sedang Dikerjakan', h.proses], ['Selesai', h.selesai]];
    tabs.innerHTML = def.map(([nama, n]) => {
      const aktif = nama === tabAktif;
      return '<button type="button" class="btn btn-ghost" data-tab="' + nama + '" style="' +
        (aktif ? 'color:#0284c7;border-bottom:2px solid #0284c7;border-radius:0;font-weight:600;' : 'color:#64748b;') + '">' + nama + ' (' + n + ')</button>';
    }).join('');
    tabs.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { tabAktif = b.dataset.tab; renderDaftarTugas(); }));

    isiKontainer(el, tugas.filter((t) => t.status_tugas === tabAktif), 'Tidak ada tugas pada kategori ini.');
  }

  let filterRiwayat = 'semua';
  function renderRiwayat() {
    const el = document.getElementById('history-list');
    if (!el) return;

    const sekarang = new Date();
    const awalMinggu = new Date(sekarang); awalMinggu.setDate(sekarang.getDate() - 7);
    const lulus = (t) => {
      const d = A.parseTanggal(t.waktu_selesai);
      if (!d) return false;
      if (filterRiwayat === 'minggu ini') return d >= awalMinggu;
      if (filterRiwayat === 'bulan ini') return d.getMonth() === sekarang.getMonth() && d.getFullYear() === sekarang.getFullYear();
      return true;
    };
    const daftar = tugas.filter((t) => t.status_tugas === 'Selesai' && lulus(t));

    el.innerHTML = '';
    if (!daftar.length) { el.innerHTML = '<p class="text-muted">Belum ada riwayat perbaikan.</p>'; return; }

    daftar.forEach((t) => {
      const card = document.createElement('article');
      card.className = 'glass-card riwayat-card';
      card.style.cursor = 'pointer';
      const menunggu = t.status_ui === 'Menunggu Review Hasil';
      card.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">' +
        '<div><h3 class="card-title" style="margin:0;">' + esc(t.judul_laporan) + '</h3>' +
        '<p class="text-muted" style="font-size:14px;margin-top:4px;">' + esc(t.nama_ruangan) + '</p></div>' +
        '<span class="status-badge ' + (menunggu ? 'status-badge-warning' : 'status-badge-success') + '">' + (menunggu ? 'Menunggu review' : 'Selesai') + '</span></div>' +
        '<div style="display:flex;gap:20px;flex-wrap:wrap;font-size:13px;color:#64748b;margin-bottom:15px;border-bottom:1px solid #f3f4f6;padding-bottom:10px;">' +
        '<span><i class="fa-regular fa-square-check"></i> Selesai ' + A.tanggalJam(t.waktu_selesai) + '</span>' +
        '<span><i class="fa-regular fa-clock"></i> Dikerjakan ' + durasi(t) + '</span></div>' +
        '<div><span style="font-size:12px;font-weight:600;color:#94a3b8;">Catatan Teknisi</span>' +
        '<p style="margin-top:4px;font-size:14px;color:#334155;">' + esc(t.catatan_teknisi || '-') + '</p></div>';
      card.addEventListener('click', () => window.lihatDetailRiwayat(t.id_pengaduan));
      el.appendChild(card);
    });
  }

  function durasi(t) {
    const a = A.parseTanggal(t.waktu_mulai), b = A.parseTanggal(t.waktu_selesai);
    if (!a || !b) return '-';
    const menit = Math.max(0, Math.round((b - a) / 60000));
    if (menit < 60) return menit + ' menit';
    if (menit < 1440) return Math.round(menit / 60) + ' jam';
    return Math.round(menit / 1440) + ' hari';
  }

  function initFilterRiwayat() {
    const tombol = document.querySelectorAll('.filter-btn-riwayat');
    tombol.forEach((b) => b.addEventListener('click', (e) => {
      e.preventDefault();
      tombol.forEach((x) => { x.className = 'btn btn-ghost filter-btn-riwayat'; x.style.border = '1px solid #d1d5db'; });
      b.className = 'btn btn-success filter-btn-riwayat';
      b.style.border = 'none';
      filterRiwayat = b.textContent.trim().toLowerCase();
      renderRiwayat();
    }));
  }

  function renderSemua() {
    renderMetrik();
    renderDashboard();
    renderDaftarTugas();
    renderRiwayat();
  }

  /* ------------------------------------------------------------------
     Modal detail (modalDetailPengaduan di HTML)
     ------------------------------------------------------------------ */
  window.lihatDetailRiwayat = function (id) {
    const t = cariTugas(id);
    const modal = document.getElementById('modalDetailPengaduan');
    if (!t || !modal) return;
    detailAktifId = t.id_pengaduan;

    const set = (el, v) => { const e = document.getElementById(el); if (e) e.textContent = v; };
    set('detailJudul', t.judul_laporan);
    set('detailId', '#' + t.id_pengaduan);
    set('detailLokasi', t.nama_ruangan);
    set('detailPelapor', t.nama_pelapor);
    set('detailStatus', t.status_ui === 'Menunggu Review Hasil' ? 'Menunggu review verifikator' : t.status_tugas);
    set('detailTanggal', A.tanggalJam(t.waktu_selesai));
    set('detailDeskripsi', t.catatan_teknisi || '-');

    // Bukti foto pengerjaan
    const body = modal.querySelector('.modal-body');
    let fotoBox = document.getElementById('detailFotoTeknisi');
    if (!fotoBox) { fotoBox = document.createElement('div'); fotoBox.id = 'detailFotoTeknisi'; fotoBox.style.marginTop = '12px'; body.appendChild(fotoBox); }
    const foto = (judul, path) => path
      ? '<div><strong>' + judul + '</strong><br><a href="' + esc(A.fileUrl(path)) + '" target="_blank" rel="noopener"><img src="' + esc(A.fileUrl(path)) +
      '" alt="' + judul + '" style="max-width:100%;max-height:160px;border-radius:8px;margin-top:6px;border:1px solid #e2e8f0;"></a></div>' : '';
    fotoBox.innerHTML = foto('Foto sebelum', t.foto_sebelum) + foto('Foto sesudah', t.foto_hasil);

    modal.classList.remove('hidden');
    modal.classList.add('active');
  };

  window.tutupDetail = function () {
    const modal = document.getElementById('modalDetailPengaduan');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('active'); }
  };

  window.editLaporanSelesai = function () {
    const id = detailAktifId;
    window.tutupDetail();
    if (id) bukaModalUpdate(id);
  };

  /* ------------------------------------------------------------------
     Modal update tugas (dibuat dinamis)
     ------------------------------------------------------------------ */
  /* ================================================================
     teknisi.js — potongan yang DIUBAH (fungsi pastikanModalUpdate)
     ================================================================ */
  function pastikanModalUpdate() {
    if (document.getElementById('modalTeknisiUpdate')) return;

    const inp = 'width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;color:#1e293b;background:#f8fafc;outline:none;';

    document.body.insertAdjacentHTML('beforeend', `
  <div id="modalTeknisiUpdate" class="modal-overlay hidden">
    <div class="modal-box" style="max-width:560px;max-height:92vh;overflow:auto;">
      <div class="modal-header">
        <div>
          <span id="modalTaskCode" style="font-size:11px;font-weight:700;background:#e0f2fe;color:#0284c7;padding:3px 8px;border-radius:6px;">#</span>
          <h3 id="modalTaskTitle" class="modal-title" style="margin-top:6px;">Update Pengerjaan Tugas</h3>
        </div>
        <button type="button" class="modal-close" id="btnTutupModalTeknisi">&times;</button>
      </div>

      <form id="formTeknisiUpdate" class="modal-body" novalidate>
        <p id="infoRevisi" style="display:none;font-size:12px;color:#b45309;background:#fffbeb;padding:8px 10px;border-radius:8px;margin-bottom:12px;"></p>

        <!-- ============ STATUS ============ -->
        <div style="margin-bottom:14px;">
          <label class="form-label" for="selectStatusTugas">Status Pengerjaan</label>
          <select id="selectStatusTugas" required style="${inp}cursor:pointer;">
            <option value="Tugas Baru">Tugas Baru (Belum Mulai)</option>
            <option value="Sedang Dikerjakan">Sedang Dikerjakan (Dalam Proses)</option>
            <option value="Selesai">Selesai (Perbaikan Tuntas)</option>
          </select>
        </div>

        <!-- ============ FOTO SEBELUM (READONLY DARI PELAPOR) ============ -->
        <div style="margin-bottom:14px;">
          <label class="form-label">Foto Sebelum (dari Pelapor)</label>
          <div id="fotoSebelumBox"
               style="border:1px solid #e2e8f0;border-radius:8px;padding:10px;background:#f8fafc;min-height:70px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            <!-- diisi JS -->
          </div>
        </div>

        <!-- ============ CATATAN ============ -->
        <div style="margin-bottom:14px;">
          <label class="form-label" for="textareaCatatanPerbaikan">Catatan Hasil Perbaikan</label>
          <textarea id="textareaCatatanPerbaikan" rows="3" required
                    placeholder="Contoh: Kabel power dan sekring diganti..."
                    style="${inp}resize:vertical;"></textarea>
        </div>

        <!-- ============ FOTO SESUDAH (WAJIB SAAT SELESAI) ============ -->
        <div style="margin-bottom:18px;">
          <label class="form-label" for="fileFotoSesudah">
            Foto Hasil Pengerjaan <span id="labelWajibFoto" style="color:#dc2626;font-size:11px;">(wajib saat status Selesai)</span>
          </label>
          <div style="border:1px dashed #cbd5e1;border-radius:8px;padding:10px;background:#f8fafc;">
            <input type="file" id="fileFotoSesudah" accept="image/jpeg,image/png"
                   style="font-size:12px;width:100%;color:#64748b;">
            <div id="previewFotoSesudahWrap" style="margin-top:8px;display:none;">
              <img id="imgPreviewFotoSesudah" alt="Preview hasil"
                   style="max-height:90px;border-radius:6px;border:1px solid #e2e8f0;">
            </div>
            <p id="fotoLamaSesudah" style="font-size:11px;color:#64748b;margin-top:6px;"></p>
            <p id="errFotoSesudah" style="font-size:11px;color:#dc2626;margin-top:4px;display:none;"></p>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-ghost" id="btnBatalTeknisiModal">Batal</button>
          <button type="submit" class="btn btn-success" id="btnSimpanTeknisiTask">Simpan Perubahan</button>
        </div>
      </form>
    </div>
  </div>`);

    const modal = document.getElementById('modalTeknisiUpdate');
    const tutup = () => { modal.classList.add('hidden'); tugasAktifId = null; };
    document.getElementById('btnTutupModalTeknisi').addEventListener('click', tutup);
    document.getElementById('btnBatalTeknisiModal').addEventListener('click', tutup);

    const form = document.getElementById('formTeknisiUpdate');
    const statusField = document.getElementById('selectStatusTugas');
    const catatanField = document.getElementById('textareaCatatanPerbaikan');
    const fotoHasilField = document.getElementById('fileFotoSesudah');
    const errFoto = document.getElementById('errFotoSesudah');
    const labelWajib = document.getElementById('labelWajibFoto');

    /* ------------------------------------------------------------
       Render Foto Sebelum — dari pengaduan.foto_bukti (dari pelapor)
       ------------------------------------------------------------ */
    function renderFotoSebelum(pathList) {
      const box = document.getElementById('fotoSebelumBox');
      const arr = Array.isArray(pathList) ? pathList : (pathList ? [pathList] : []);
      if (!arr.length) {
        box.innerHTML = '<span style="font-size:12px;color:#94a3b8;font-style:italic;">Tidak ada foto dari pelapor</span>';
        return;
      }
      box.innerHTML = arr.map((p) => `
      <a href="${esc(A.fileUrl(p))}" target="_blank" rel="noopener">
        <img src="${esc(A.fileUrl(p))}" alt="Foto sebelum"
             style="width:74px;height:74px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0;cursor:zoom-in;">
      </a>`).join('');
    }

    /* ------------------------------------------------------------
       Validasi dinamis: foto sesudah wajib saat status = Selesai
       ------------------------------------------------------------ */
    function perbaruiValidasiFotoHasil() {
      const t = cariTugas(tugasAktifId);
      const sudahAdaFoto = !!(t && t.foto_hasil);
      const perluUpload = statusField.value === 'Selesai' && !sudahAdaFoto;
      const fileDipilih = fotoHasilField.files.length > 0;

      // Atribut required untuk native browser validation
      fotoHasilField.required = perluUpload;

      // Label dinamis
      labelWajib.style.display = perluUpload ? 'inline' : 'none';

      // Pesan error custom
      if (perluUpload && !fileDipilih) {
        errFoto.textContent = 'Foto bukti hasil pengerjaan wajib diunggah!';
        errFoto.style.display = 'block';
      } else {
        errFoto.style.display = 'none';
      }
    }

    statusField.required = true;
    statusField.addEventListener('change', perbaruiValidasiFotoHasil);
    fotoHasilField.addEventListener('change', () => {
      const f = fotoHasilField.files[0];
      const wrap = document.getElementById('previewFotoSesudahWrap');

      // Validasi tipe file
      if (f && !['image/jpeg', 'image/png'].includes(f.type)) {
        fotoHasilField.value = '';
        fotoHasilField.setCustomValidity('Pilih file gambar JPG atau PNG.');
        fotoHasilField.reportValidity();
        wrap.style.display = 'none';
        return;
      }
      fotoHasilField.setCustomValidity('');

      if (f) {
        document.getElementById('imgPreviewFotoSesudah').src = URL.createObjectURL(f);
        wrap.style.display = 'block';
      } else {
        wrap.style.display = 'none';
      }
      perbaruiValidasiFotoHasil();
    });

    catatanField.addEventListener('input', () => catatanField.setCustomValidity(''));

    /* ------------------------------------------------------------
       Submit form
       ------------------------------------------------------------ */
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!tugasAktifId) return;

      const t = cariTugas(tugasAktifId);
      const status = statusField.value;
      const catatan = catatanField.value.trim();

      catatanField.setCustomValidity(catatan ? '' : 'Catatan hasil perbaikan wajib diisi.');
      perbaruiValidasiFotoHasil();

      // === VALIDASI FINAL: Foto Sesudah wajib saat Selesai ===
      if (status === 'Selesai') {
        const adaFileBaru = fotoHasilField.files.length > 0;
        const adaFileLama = !!(t && t.foto_hasil);
        if (!adaFileBaru && !adaFileLama) {
          errFoto.textContent = 'Foto bukti hasil pengerjaan wajib diunggah!';
          errFoto.style.display = 'block';
          fotoHasilField.focus();
          return; // hentikan submit
        }
      }

      if (!form.reportValidity()) return;

      const fd = new FormData();
      fd.append('id_pengaduan', tugasAktifId);
      fd.append('id_teknisi', sesi.id_user);
      fd.append('status_tugas', status);
      fd.append('catatan_teknis', catatan);

      const btn = document.getElementById('btnSimpanTeknisiTask');
      btn.disabled = true;
      try {
        // HANYA foto hasil yang di-upload teknisi. Foto sebelum TIDAK di-upload ulang.
        const f = fotoHasilField.files[0];
        if (f) {
          const kecil = await A.kompresGambar(f);
          fd.append('foto_hasil', kecil, kecil.name);
        }
        await API.post('teknisi/update_tugas.php', fd);
        A.showToast(
          status === 'Selesai'
            ? 'Tugas ditandai selesai. Menunggu review verifikator.'
            : 'Tugas #' + tugasAktifId + ' diperbarui.',
          'success'
        );
        tutup();
        await muat();
        renderSemua();
      } catch (err) {
        A.showToast(err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });

    /* ------------------------------------------------------------
       Buka modal — isi Foto Sebelum & Foto Lama
       ------------------------------------------------------------ */
    window.__isiModalTeknisi = function (t) {
      document.getElementById('modalTaskCode').textContent = '#' + t.id_pengaduan;
      document.getElementById('modalTaskTitle').textContent = t.judul_laporan;
      statusField.value = t.status_tugas;
      catatanField.value = t.catatan_teknisi || '';

      // Foto sebelum dari pengaduan (bisa array / string)
      renderFotoSebelum(t.foto_list || t.foto_bukti || []);

      // Info foto hasil yang sudah ada
      document.getElementById('fotoLamaSesudah').textContent =
        t.foto_hasil ? 'Sudah ada foto hasil (unggah baru untuk mengganti).' : '';

      // Reset input file
      fotoHasilField.value = '';
      fotoHasilField.setCustomValidity('');
      document.getElementById('previewFotoSesudahWrap').style.display = 'none';

      // Status terkunci bila sudah selesai (review)
      statusField.disabled = t.status_ui === 'Selesai';

      // Info revisi
      const info = document.getElementById('infoRevisi');
      if (t.revisi_ke > 0 && t.catatan_revisi && t.status_tugas !== 'Selesai') {
        info.style.display = 'block';
        info.textContent = 'Revisi ke-' + t.revisi_ke + ' dari verifikator: ' + t.catatan_revisi;
      } else {
        info.style.display = 'none';
      }

      perbaruiValidasiFotoHasil();
    };
  }

  function bukaModalUpdate(id) {
    const t = cariTugas(id);
    if (!t) return;
    pastikanModalUpdate();
    tugasAktifId = t.id_pengaduan;
    window.__isiModalTeknisi(t);
    document.getElementById('modalTeknisiUpdate').classList.remove('hidden');

    document.getElementById('modalTaskCode').textContent = '#' + t.id_pengaduan;
    document.getElementById('modalTaskTitle').textContent = t.judul_laporan;
    document.getElementById('selectStatusTugas').value = t.status_tugas;
    document.getElementById('textareaCatatanPerbaikan').value = t.catatan_teknisi || '';

    // Tugas yang sudah selesai (menunggu review/diterima) tidak dapat dimundurkan statusnya dari sini
    document.getElementById('selectStatusTugas').disabled = t.status_ui === 'Selesai';

    const info = document.getElementById('infoRevisi');
    if (t.revisi_ke > 0 && t.catatan_revisi && t.status_tugas !== 'Selesai') {
      info.style.display = 'block';
      info.textContent = 'Revisi ke-' + t.revisi_ke + ' dari verifikator: ' + t.catatan_revisi;
    } else {
      info.style.display = 'none';
    }

    ['Sebelum', 'Sesudah'].forEach((n) => {
      document.getElementById('fileFoto' + n).value = '';
      document.getElementById('fileFoto' + n).setCustomValidity('');
      document.getElementById('previewFoto' + n + 'Wrap').style.display = 'none';
      const lama = n === 'Sebelum' ? t.foto_sebelum : t.foto_hasil;
      document.getElementById('fotoLama' + n).textContent = lama ? 'Sudah ada foto (unggah baru untuk mengganti)' : '';
    });
    document.getElementById('textareaCatatanPerbaikan').setCustomValidity('');
    document.getElementById('selectStatusTugas').dispatchEvent(new Event('change'));

    document.getElementById('modalTeknisiUpdate').classList.remove('hidden');
  }
  window.openModalForTask = bukaModalUpdate;

  /* ------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', async () => {
    initFilterRiwayat();
    try {
      await muat();
      renderSemua();
    } catch (err) {
      A.showToast(err.message, 'error');
      ['task-list-container', 'history-list'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<p class="text-muted">Gagal memuat data tugas.</p>';
      });
    }
  });
})();
