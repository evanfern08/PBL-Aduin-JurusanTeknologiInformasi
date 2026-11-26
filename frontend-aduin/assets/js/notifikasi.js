(function () {
  'use strict';

  const A = window.ADUIN;
  const API = A.API;
  const $ = (id) => document.getElementById(id);
  let bound = false;

  function renderItems(items, total) {
    $('inbox-badge-count').textContent = String(total);
    $('inbox-badge-count').classList.toggle('hidden', total === 0);
    $('inbox-list').innerHTML = items.length ? items.map((item) => {
      const id = Number(item.id_pengaduan);
      const days = Number(item.hari_mengendap);
      if (!Number.isSafeInteger(id) || id <= 0 || !Number.isInteger(days) || days <= 3) {
        throw new Error('Data laporan mengendap tidak valid.');
      }
      return '<a class="inbox-item" href="riwayat.html?laporan=' + id + '">' +
        '<div class="inbox-item-title">' + A.escapeHtml(item.judul) + '</div>' +
        '<div class="inbox-item-loc">' + A.escapeHtml(item.lokasi) + '</div>' +
        '<span class="badge-mengendap">Mengendap &gt; 3 Hari (' + days + ' hari)</span></a>';
    }).join('') : '<div class="inbox-state">Tidak ada laporan yang mengendap.</div>';
  }

  async function loadItems() {
    const list = $('inbox-list');
    list.innerHTML = Array.from({ length: 3 }, () =>
      '<div class="inbox-item inbox-skeleton" aria-hidden="true"><div class="report-skeleton-line medium"></div>' +
      '<div class="report-skeleton-line short"></div><span class="inbox-skeleton-badge"></span></div>'
    ).join('');

    try {
      const session = A.getSession();
      if (!session || !session.id_user) throw new Error('Sesi verifikator tidak ditemukan.');
      const response = await API.get('api/laporan/mengendap.php', { id_verifikator: session.id_user });
      if (!response || !Array.isArray(response.data) || !response.meta ||
          !Number.isInteger(Number(response.meta.total)) || Number(response.meta.total) !== response.data.length) {
        throw new Error('Respons laporan mengendap tidak valid.');
      }
      renderItems(response.data, Number(response.meta.total));
    } catch (error) {
      console.error('[Perlu follow-up ke Pusat] Gagal memuat data:', error);
      list.innerHTML = '<div class="inbox-state"><span>Gagal memuat laporan mengendap.</span>' +
        '<button type="button" class="btn btn-ghost" id="btnRetryMengendap">Coba lagi</button></div>';
      $('btnRetryMengendap').addEventListener('click', loadItems);
    }
  }

  function init() {
    const button = $('btn-reminder');
    const dropdown = $('inbox-dropdown');
    const list = $('inbox-list');
    if (!button || !dropdown || !list || bound) return;
    bound = true;

    button.addEventListener('click', (event) => {
      event.stopPropagation();
      dropdown.classList.toggle('hidden');
    });
    document.addEventListener('click', (event) => {
      if (!dropdown.contains(event.target) && event.target !== button) dropdown.classList.add('hidden');
    });
    list.addEventListener('click', (event) => {
      if (event.target.closest('a.inbox-item')) dropdown.classList.add('hidden');
    });

    loadItems();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();