/**
 * laporan_pusat.js - Halaman Verifikator: Laporan untuk UPA PP Pusat.
 * Menampilkan daftar laporan, checkbox select, search, dan export Word.
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
    const laporanTerpilih = new Set();

    async function muatLaporan() {
        const data = await API.get('verifikator/dashboard.php');
        laporan = data.laporan;
        return laporan;
    }

    function perbaruiKontrolDokumen() {
        const tbody = $('laporanPusatTableBody');
        const selectAll = $('selectAllPusatReports');
        const tombolEkspor = $('exportPusatReports');
        const terlihat = tbody ? [...tbody.querySelectorAll('input[data-select-pusat-report]')].filter((input) =>
            input.closest('tr').style.display !== 'none') : [];
        const tercentang = terlihat.filter((input) => input.checked).length;

        if (selectAll) {
            selectAll.checked = terlihat.length > 0 && tercentang === terlihat.length;
            selectAll.indeterminate = tercentang > 0 && tercentang < terlihat.length;
        }
        if (tombolEkspor) tombolEkspor.disabled = laporanTerpilih.size === 0;
        setText('selectedPusatReportCount', laporanTerpilih.size + ' laporan dipilih');
    }

    async function eksporDokumenPusat() {
        const terpilih = laporan.filter((l) =>
            l.status === 'Diteruskan ke Pusat' && laporanTerpilih.has(l.id_pengaduan)
        );

        if (!terpilih.length) {
            A.showToast('Pilih minimal satu laporan yang diteruskan ke pusat.', 'error');
            return;
        }

        const ids = terpilih.map((l) => l.id_pengaduan);
        const tombol = $('exportPusatReports');
        const originalText = tombol.innerHTML;

        tombol.disabled = true;
        tombol.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...';

        try {
            const response = await fetch(`${API.base}/api/export_dokumen.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ids: ids,
                    id_verifikator: sesi.id_user
                })
            });

            if (!response.ok) {
                let pesanError = `Gagal membuat dokumen Word (HTTP ${response.status})`;
                try {
                    const errJson = await response.json();
                    if (errJson && errJson.message) pesanError = errJson.message;
                } catch (_) { }
                throw new Error(pesanError);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Laporan_Kerusakan_UPA_PP_${A.tanggalIso(new Date().toISOString())}.docx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            A.showToast('Dokumen Word berhasil diunduh!', 'success');
        } catch (err) {
            A.showToast(err.message || 'Gagal membuat dokumen Word.', 'error');
        } finally {
            tombol.disabled = false;
            tombol.innerHTML = originalText;
        }
    }

    function renderLaporanPusat() {
        const tbody = $('laporanPusatTableBody');
        if (!tbody) return;
        const daftarPusat = laporan.filter((l) => l.status === 'Diteruskan ke Pusat');
        const idValid = new Set(daftarPusat.map((l) => l.id_pengaduan));
        laporanTerpilih.forEach((id) => {
            if (!idValid.has(id)) laporanTerpilih.delete(id);
        });

        tbody.innerHTML = '';
        if (!daftarPusat.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="padding:24px;">Belum ada laporan yang diteruskan ke pusat.</td></tr>';
        }

        daftarPusat.forEach((l) => {
            const tr = document.createElement('tr');
            tr.dataset.id = l.id_pengaduan;
            tr.innerHTML =
                '<td class="text-center"><input type="checkbox" data-select-pusat-report="' + l.id_pengaduan +
                '" aria-label="Pilih laporan #' + l.id_pengaduan + '"' +
                (laporanTerpilih.has(l.id_pengaduan) ? ' checked' : '') + '></td>' +
                '<td><span class="cell-meta">#' + l.id_pengaduan + '</span><br><span class="cell-name">' + esc(l.judul_laporan) +
                '</span><span class="cell-meta" style="display:block;margin-top:4px;">' + esc(l.nama_pelapor) + ' · ' +
                (l.role_pelapor === 'dosen' ? 'NIP' : 'NIM') + ': ' + esc(l.identitas_pelapor || '-') + '</span></td>' +
                '<td><span class="cell-name">' + esc(l.nama_ruangan) + '</span><span class="cell-meta" style="display:block;margin-top:4px;">Lantai ' +
                l.lantai + '</span></td>' +
                '<td><span class="status-pill">' + esc(l.nama_kategori) + '</span></td>' +
                '<td>' + A.tanggalJam(l.tanggal_lapor) + '</td>' +
                '<td><span class="status-pill ' + A.pillClass(l.status) + '">' + esc(l.status) + '</span></td>';
            tbody.appendChild(tr);
        });

        const cariInput = $('pusatSearchInput');
        const terapkanPencarian = () => {
            const query = cariInput ? cariInput.value.toLowerCase().trim() : '';
            let tampil = 0;
            tbody.querySelectorAll('tr[data-id]').forEach((row) => {
                const cocok = row.textContent.toLowerCase().includes(query);
                row.style.display = cocok ? '' : 'none';
                if (cocok) tampil++;
            });
            setText('pusatFilterResult', 'Menampilkan ' + tampil + ' dari ' + daftarPusat.length + ' laporan.');
            perbaruiKontrolDokumen();
        };

        if (!tbody.dataset.batchBound) {
            tbody.dataset.batchBound = '1';
            tbody.addEventListener('change', (event) => {
                const checkbox = event.target.closest('input[data-select-pusat-report]');
                if (!checkbox) return;
                const id = Number(checkbox.dataset.selectPusatReport);
                if (checkbox.checked) laporanTerpilih.add(id);
                else laporanTerpilih.delete(id);
                perbaruiKontrolDokumen();
            });
            $('selectAllPusatReports').addEventListener('change', (event) => {
                tbody.querySelectorAll('input[data-select-pusat-report]').forEach((checkbox) => {
                    if (checkbox.closest('tr').style.display === 'none') return;
                    checkbox.checked = event.target.checked;
                    const id = Number(checkbox.dataset.selectPusatReport);
                    if (checkbox.checked) laporanTerpilih.add(id);
                    else laporanTerpilih.delete(id);
                });
                perbaruiKontrolDokumen();
            });
            $('exportPusatReports').addEventListener('click', eksporDokumenPusat);
            if (cariInput) cariInput.addEventListener('input', terapkanPencarian);
        }
        terapkanPencarian();
    }

    document.addEventListener('DOMContentLoaded', async () => {
        if (!$('laporanPusatTableBody')) return;
        try {
            await muatLaporan();
            renderLaporanPusat();
        } catch (err) {
            A.showToast(err.message, 'error');
        }
    });
})();