/**
 * api.js - Klien API ADUIN (dipakai semua halaman)
 * Berisi: pemanggil API, sesi login, penjaga halaman per peran, dan helper tampilan.
 */
(function () {
  'use strict';

  const CFG = window.ADUIN_CONFIG || { API_BASE: 'https://pbl-aduin-jurusanteknologiinformasi-eta.vercel.app/api' };
  const API_BASE = CFG.API_BASE.replace(/\/+$/, '');

  /* Lokasi akar frontend (folder yang berisi login.html), dihitung dari lokasi api.js */
  const ROOT = (function () {
    const s = document.currentScript && document.currentScript.src;
    return s ? s.replace(/assets\/js\/api\.js(\?.*)?$/, '') : '';
  })();

  /* ====================== SESI ====================== */
  const SESSION_KEY = 'aduin_session';
  const ROLE_MAP = { mahasiswa: 'Pelapor', dosen: 'Pelapor', sekjur: 'Verifikator', teknisi: 'Teknisi' };
  const HOME = { Pelapor: 'pelapor/index.html', Verifikator: 'verifikator/index.html', Teknisi: 'teknisi/index.html' };

  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; }
  }
  function saveSession(profil) {
    const s = Object.assign({}, profil, { peran: ROLE_MAP[profil.role] || 'Pelapor' });
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    return s;
  }
  function clearSession() { localStorage.removeItem(SESSION_KEY); }

  function peranDariUrl() {
    const p = window.location.pathname.toLowerCase();
    if (p.indexOf('/pelapor/') !== -1) return 'Pelapor';
    if (p.indexOf('/verifikator/') !== -1) return 'Verifikator';
    if (p.indexOf('/teknisi/') !== -1) return 'Teknisi';
    return null;
  }

  /* Arahkan ke login bila belum masuk, atau ke dashboard yang benar bila salah peran. */
  function guard() {
    const halaman = window.location.pathname.toLowerCase();
    if (/(login|register)\.html$/.test(halaman)) return true;
    const s = getSession();
    if (!s) { window.location.replace(ROOT + 'login.html'); return false; }
    const perluPeran = peranDariUrl();
    if (perluPeran && perluPeran !== s.peran) { window.location.replace(ROOT + HOME[s.peran]); return false; }
    return true;
  }

  /* ====================== REQUEST ====================== */
  async function request(method, path, data, params) {
    let url = API_BASE + '/' + path.replace(/^\/+/, '');
    if (params) {
      const q = new URLSearchParams();
      Object.keys(params).forEach(function (k) {
        if (params[k] !== undefined && params[k] !== null && params[k] !== '') q.append(k, params[k]);
      });
      const qs = q.toString();
      if (qs) url += '?' + qs;
    }

    const opts = { method: method, headers: {} };
    if (data instanceof FormData) {
      opts.body = data;
    } else if (data !== undefined && data !== null) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(data);
    }

    let res;
    try {
      res = await fetch(url, opts);
    } catch (e) {
      const err = new Error('Tidak dapat terhubung ke server (' + API_BASE + '). Pastikan backend sudah dijalankan.');
      err.network = true;
      throw err;
    }

    let json = null;
    try { json = await res.json(); } catch (e) { /* bukan JSON */ }
    if (!json) {
      throw new Error('Respons server tidak valid (HTTP ' + res.status + '). Periksa log PHP.');
    }
    if (!json.success) {
      const err = new Error(json.message || 'Permintaan gagal.');
      err.status = res.status;
      throw err;
    }
    return json.data;
  }

  const API = {
    base: API_BASE,
    get: function (path, params) { return request('GET', path, null, params); },
    post: function (path, data) { return request('POST', path, data); },
    put: function (path, data) { return request('PUT', path, data); },
    del: function (path, data) { return request('DELETE', path, data); },
  };

  /* ====================== HELPER TAMPILAN ====================== */
  function escapeHtml(str) {
    return String(str === null || str === undefined ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* 'uploads/bukti/x.jpg' -> 'http://localhost:8000/uploads/bukti/x.jpg' */
  function fileUrl(path) {
    if (!path) return '';
    if (/^(https?:|data:)/i.test(path)) return path;
    return API_BASE + '/' + String(path).replace(/^\/+/, '');
  }

  /* "2026-10-24 14:44:22.438037" (waktu WIB tanpa zona) -> Date */
  function parseTanggal(str) {
    if (!str) return null;
    const d = new Date(String(str).replace(' ', 'T').replace(/(\.\d{3})\d+/, '$1'));
    return isNaN(d.getTime()) ? null : d;
  }
  function tanggalPendek(str) {
    const d = parseTanggal(str);
    return d ? d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
  }
  function tanggalPanjang(str) {
    const d = parseTanggal(str);
    return d ? d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';
  }
  function jamMenit(str) {
    const d = parseTanggal(str);
    return d ? d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':') + ' WIB' : '-';
  }
  function tanggalJam(str) {
    const d = parseTanggal(str);
    return d ? tanggalPendek(str) + ' · ' + jamMenit(str) : '-';
  }
  function inisial(nama) {
    return String(nama || '?').trim().split(/\s+/).slice(0, 2).map(function (p) { return p[0]; }).join('').toUpperCase();
  }
  /* yyyy-mm-dd lokal, untuk pembanding filter tanggal */
  function tanggalIso(str) {
    const d = parseTanggal(str);
    if (!d) return '';
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /* Kelas warna pill per status tampilan */
  function pillClass(status) {
    return ({
      'Menunggu Verifikasi': 'status-pill-warning',
      'Dalam Perbaikan': 'status-pill-info',
      'Diproses': 'status-pill-info',
      'Menunggu Review Hasil': 'status-pill-warning',
      'Diteruskan ke Pusat': 'status-pill-purple',
      'Selesai': 'status-pill-success',
      'Ditolak': 'status-pill-danger',
      'Dikembalikan ke Pelapor': 'status-pill-danger',
    })[status] || 'status-pill-neutral';
  }

  /* Pelapor hanya melihat 4 status sederhana */
  function statusUntukPelapor(statusUi) {
    if (statusUi === 'Menunggu Verifikasi' || statusUi === 'Selesai') return statusUi;
    if (statusUi === 'Ditolak') return 'Dikembalikan ke Pelapor';
    return 'Diproses';
  }

  /* Perkecil gambar di browser sebelum diunggah agar ringan dan lolos batas ukuran server */
  function kompresGambar(file, maxSisi, kualitas) {
    maxSisi = maxSisi || 1600; kualitas = kualitas || 0.82;
    return new Promise(function (resolve) {
      if (!/^image\/(jpeg|png)$/.test(file.type)) { resolve(file); return; }
      const reader = new FileReader();
      reader.onerror = function () { resolve(file); };
      reader.onload = function (e) {
        const img = new Image();
        img.onerror = function () { resolve(file); };
        img.onload = function () {
          let w = img.width, h = img.height;
          const skala = Math.min(1, maxSisi / Math.max(w, h));
          w = Math.round(w * skala); h = Math.round(h * skala);
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          canvas.toBlob(function (blob) {
            if (!blob || blob.size >= file.size) { resolve(file); return; }
            resolve(new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }));
          }, 'image/jpeg', kualitas);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* Toast sederhana (styling ada di style.css) */
  function showToast(message, type) {
    type = type || 'success';
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast' + (type === 'error' ? ' toast-error' : type === 'info' ? ' toast-info' : '');
    const icon = type === 'error' ? '⚠' : type === 'info' ? 'ℹ' : '✓';
    toast.innerHTML = '<span style="display:flex;align-items:center;gap:8px;"><span>' + icon + '</span><span>' + escapeHtml(message) + '</span></span>';
    container.appendChild(toast);
    requestAnimationFrame(function () { toast.classList.add('show'); });
    setTimeout(function () {
      toast.classList.remove('show');
      setTimeout(function () { toast.remove(); }, 300);
    }, 4000);
  }

  /* Jalankan fungsi async dengan penanganan error seragam */
  async function jalankan(fn, pesanGagal) {
    try { return await fn(); }
    catch (e) { showToast(e.message || pesanGagal || 'Terjadi kesalahan.', 'error'); return undefined; }
  }

  window.ADUIN = {
    API: API, ROOT: ROOT, HOME: HOME,
    getSession: getSession, saveSession: saveSession, clearSession: clearSession, guard: guard,
    escapeHtml: escapeHtml, fileUrl: fileUrl, parseTanggal: parseTanggal,
    tanggalPendek: tanggalPendek, tanggalPanjang: tanggalPanjang, jamMenit: jamMenit, tanggalJam: tanggalJam,
    tanggalIso: tanggalIso, inisial: inisial, pillClass: pillClass, statusUntukPelapor: statusUntukPelapor,
    kompresGambar: kompresGambar, showToast: showToast, jalankan: jalankan,
  };
  /* Alias lama agar kode yang memanggil showToast() langsung tetap jalan */
  window.showToast = showToast;
  window.getSession = getSession;
  window.clearSession = clearSession;

  guard();
})();
