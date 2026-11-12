/**
 * kelola_sarpras.js - Halaman Kelola Sarpras (verifikator).
 * Data = tabel kategori_fasilitas. Daftar: GET master/kategori.php,
 * simpan/hapus: verifikator/kelola_sarpras.php.
 */
(function () {
  'use strict';

  const A = window.ADUIN;
  const API = A.API;
  const esc = A.escapeHtml;
  const toast = (msg, tipe) => A.showToast(msg, tipe);
  const sesi = A.getSession();
  if (!sesi) return; // guard() di api.js sudah mengarahkan ke login

  let daftar = [];

  async function muat() {
    try {
      daftar = await API.get('master/kategori.php');
      render();
    } catch (err) {
      toast(err.message, 'error');
      const tbody = document.getElementById('tabelFasilitasBody');
      if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="text-center" style="padding:32px;color:var(--muted);">Gagal memuat data sarpras.</td></tr>';
    }
  }

  function render() {
    const tbody = document.getElementById('tabelFasilitasBody');
    if (!tbody) return;
    if (!daftar.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center" style="padding:32px;color:var(--muted);">Belum ada data sarpras.</td></tr>';
      return;
    }
    tbody.innerHTML = daftar.map((it, i) => `
      <tr>
        <td class="text-center" style="color:var(--muted);font-weight:700;">${i + 1}</td>
        <td><span class="cell-name">${esc(it.nama_kategori)}</span></td>
        <td><span class="cell-meta">${esc(it.deskripsi) || '-'}</span></td>
        <td class="text-right">
          <div class="action-group" style="justify-content:flex-end;">
            <button type="button" class="btn-icon" title="Edit" onclick="bukaModalFasilitas(${Number(it.id_fasilitas)})"
              style="color:var(--blue-dark);border-color:#bfdbfe;background:#eff6ff;">✎</button>
            <button type="button" class="btn-icon btn-icon-danger" title="Hapus" onclick="hapusFasilitas(${Number(it.id_fasilitas)})">🗑</button>
          </div>
        </td>
      </tr>`).join('');
  }

  window.bukaModalFasilitas = function (id) {
    const modal = document.getElementById('modalFasilitas');
    if (!modal) return;
    document.getElementById('formFasilitas').reset();
    document.getElementById('fasilitasId').value = '';
    document.getElementById('modalFasilitasTitle').textContent = 'Tambah Sarpras';
    if (id) {
      const it = daftar.find((x) => Number(x.id_fasilitas) === Number(id));
      if (!it) return;
      document.getElementById('modalFasilitasTitle').textContent = 'Edit Sarpras';
      document.getElementById('fasilitasId').value = it.id_fasilitas;
      document.getElementById('namaFasilitas').value = it.nama_kategori;
      document.getElementById('deskripsiFasilitas').value = it.deskripsi || '';
    }
    modal.classList.remove('hidden');
  };

  window.tutupModalFasilitas = function () {
    const modal = document.getElementById('modalFasilitas');
    if (modal) modal.classList.add('hidden');
  };

  window.simpanFasilitas = async function (event) {
    event.preventDefault();
    const id = document.getElementById('fasilitasId').value;
    const nama = document.getElementById('namaFasilitas').value.trim();
    const deskripsi = document.getElementById('deskripsiFasilitas').value.trim();
    if (!nama) { toast('Nama sarpras wajib diisi.', 'error'); return; }

    const tombol = event.target.querySelector('button[type="submit"]');
    if (tombol) tombol.disabled = true;
    try {
      const data = { id_verifikator: sesi.id_user, nama_kategori: nama, deskripsi: deskripsi };
      if (id) {
        data.id_fasilitas = Number(id);
        await API.put('verifikator/kelola_sarpras.php', data);
      } else {
        await API.post('verifikator/kelola_sarpras.php', data);
      }
      toast(id ? 'Data sarpras berhasil diperbarui.' : 'Sarpras baru berhasil ditambahkan.', 'success');
      window.tutupModalFasilitas();
      await muat();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      if (tombol) tombol.disabled = false;
    }
  };

  window.hapusFasilitas = async function (id) {
    const it = daftar.find((x) => Number(x.id_fasilitas) === Number(id));
    if (!it || !confirm('Yakin ingin menghapus sarpras "' + it.nama_kategori + '"?')) return;
    try {
      await API.del('verifikator/kelola_sarpras.php', { id_verifikator: sesi.id_user, id_fasilitas: Number(id) });
      toast('Sarpras "' + it.nama_kategori + '" telah dihapus.', 'info');
      await muat();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  document.addEventListener('DOMContentLoaded', muat);
})();
