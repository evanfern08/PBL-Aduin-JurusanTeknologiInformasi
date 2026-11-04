/**
 * app.js - ADUIN: fungsi global semua halaman
 * (sidebar responsif, login, registrasi, profil di sidebar, halaman Pengaturan).
 * Membutuhkan config.js dan api.js dimuat lebih dulu.
 */
(function () {
  'use strict';

  const A = window.ADUIN;
  const API = A.API;

  /* ==========================================================================
     1. SIDEBAR RESPONSIF (HAMBURGER)
     ========================================================================== */
  function initResponsiveSidebar() {
    const sidebar = document.querySelector('.sidebar-blue');
    const mainContent = document.querySelector('.main-content');
    if (!sidebar || !mainContent) return;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'sidebar-toggle';
    toggle.setAttribute('aria-label', 'Buka menu navigasi');
    toggle.setAttribute('aria-controls', 'primary-sidebar');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = '<span></span><span></span><span></span>';
    sidebar.id = 'primary-sidebar';

    const backdrop = document.createElement('button');
    backdrop.type = 'button';
    backdrop.className = 'sidebar-backdrop';
    backdrop.setAttribute('aria-label', 'Tutup menu navigasi');
    backdrop.tabIndex = -1;

    document.body.append(backdrop, toggle);
    if (!mainContent.querySelector('.content-header')) mainContent.classList.add('has-sidebar-toggle');

    const closeMenu = () => {
      sidebar.classList.remove('is-open');
      document.body.classList.remove('sidebar-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Buka menu navigasi');
    };
    const openMenu = () => {
      sidebar.classList.add('is-open');
      document.body.classList.add('sidebar-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Tutup menu navigasi');
    };

    toggle.addEventListener('click', () => (sidebar.classList.contains('is-open') ? closeMenu() : openMenu()));
    backdrop.addEventListener('click', closeMenu);
    sidebar.addEventListener('click', (e) => { if (e.target.closest('a')) closeMenu(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    window.matchMedia('(min-width: 993px)').addEventListener('change', closeMenu);
  }

  /* ==========================================================================
     2. TOGGLE PASSWORD
     ========================================================================== */
  function initPasswordToggles() {
    document.querySelectorAll('.toggle-password-btn').forEach((btn) => {
      if (btn.dataset.bound === 'true') return;
      btn.dataset.bound = 'true';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const input = document.getElementById(btn.getAttribute('data-target'));
        if (!input) return;
        const eye = btn.querySelector('.eye-icon');
        const eyeOff = btn.querySelector('.eye-off-icon');
        const tampil = input.type === 'password';
        input.type = tampil ? 'text' : 'password';
        if (eye) eye.classList.toggle('hidden', tampil);
        if (eyeOff) eyeOff.classList.toggle('hidden', !tampil);
      });
    });
  }

  /* ==========================================================================
     3. PROFIL DI SIDEBAR + TOMBOL KELUAR (semua halaman setelah login)
     ========================================================================== */
  function setAvatar(el, session) {
    if (!el) return;
    if (session.foto_user) {
      el.innerHTML = '<img src="' + A.escapeHtml(A.fileUrl(session.foto_user)) + '" alt="' + A.escapeHtml(session.nama) + '" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">';
    } else {
      el.textContent = A.inisial(session.nama);
    }
  }

  function terapkanProfilSidebar() {
    const s = A.getSession();
    if (!s) return;
    document.querySelectorAll('.sidebar-user-name, [data-profile-name]').forEach((el) => { el.textContent = s.nama; });
    document.querySelectorAll('.sidebar-user-role').forEach((el) => { el.textContent = s.jabatan || s.peran; });
    document.querySelectorAll('[data-profile-first-name]').forEach((el) => { el.textContent = String(s.nama).trim().split(/\s+/)[0]; });
    document.querySelectorAll('.user-avatar-sm, [data-profile-initials]').forEach((el) => setAvatar(el, s));
  }

  function initLogout() {
    document.querySelectorAll('.btn-logout').forEach((btn) => {
      btn.addEventListener('click', () => A.clearSession());
    });
  }

  /* ==========================================================================
     4. LOGIN & REGISTRASI
     ========================================================================== */
  function tampilkanAlert(pesan) {
    const box = document.getElementById('alertBox');
    if (box) { box.textContent = pesan; box.classList.remove('hidden'); }
    else A.showToast(pesan, 'error');
  }

  function setLoading(form, loading, teks) {
    const btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    const span = btn.querySelector('span') || btn;
    if (loading) { btn.dataset.label = span.textContent; span.textContent = teks || 'Memproses...'; btn.disabled = true; }
    else { span.textContent = btn.dataset.label || span.textContent; btn.disabled = false; }
  }

  function initAuthForms() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      // Sudah login? langsung ke dashboard.
      const sesi = A.getSession();
      if (sesi && A.HOME[sesi.peran]) { window.location.replace(A.ROOT + A.HOME[sesi.peran]); return; }

      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('loginId').value.trim();
        const password = document.getElementById('loginPassword').value;
        if (!id || !password) { tampilkanAlert('Semua kolom wajib diisi.'); return; }

        setLoading(loginForm, true, 'Masuk...');
        try {
          const profil = await API.post('auth/login.php', { id: id, password: password });
          const s = A.saveSession(profil);
          A.showToast('Login berhasil sebagai ' + s.peran + '!', 'success');
          setTimeout(() => { window.location.href = A.ROOT + A.HOME[s.peran]; }, 500);
        } catch (err) {
          tampilkanAlert(err.message);
          setLoading(loginForm, false);
        }
      });
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
          nama: document.getElementById('regNama').value.trim(),
          role: document.getElementById('regRole').value,
          id: document.getElementById('regId').value.trim(),
          email: document.getElementById('regEmail').value.trim(),
          password: document.getElementById('regPassword').value,
        };
        if (!data.nama || !data.id || !data.email || !data.password) { tampilkanAlert('Semua kolom wajib diisi.'); return; }
        if (data.password.length < 8) { tampilkanAlert('Password minimal 8 karakter.'); return; }

        setLoading(registerForm, true, 'Mendaftar...');
        try {
          await API.post('auth/register.php', data);
          A.showToast('Pendaftaran berhasil! Silakan login.', 'success');
          setTimeout(() => { window.location.href = 'login.html'; }, 1000);
        } catch (err) {
          tampilkanAlert(err.message);
          setLoading(registerForm, false);
        }
      });
    }
  }

  /* ==========================================================================
     5. HALAMAN PENGATURAN
     ========================================================================== */
  const MENU = {
    Pelapor: [
      ['Dashboard', 'pelapor/index.html', 'fa-solid fa-border-all'],
      ['Buat Laporan', 'pelapor/laporan.html', 'fa-solid fa-plus'],
      ['Daftar Laporan', 'pelapor/daftar_laporan.html', 'fa-solid fa-clipboard-list'],
      ['Pengaturan', 'pengaturan.html', 'fa-solid fa-gear'],
    ],
    Verifikator: [
      ['Dashboard', 'verifikator/index.html', 'fa-solid fa-border-all'],
      ['Daftar Laporan', 'verifikator/riwayat.html', 'fa-solid fa-clipboard-list'],
      ['Statistik', 'verifikator/statistik.html', 'fa-solid fa-chart-simple'],
      ['Kelola Teknisi', 'verifikator/kelola_teknisi.html', 'fa-solid fa-users'],
      ['Kelola Fasilitas', 'verifikator/kelola_fasilitas.html', 'fa-solid fa-building'],
      ['Pengaturan', 'pengaturan.html', 'fa-solid fa-gear'],
    ],
    Teknisi: [
      ['Dashboard', 'teknisi/index.html', 'fa-solid fa-border-all'],
      ['Daftar Tugas', 'teknisi/daftar-tugas.html', 'fa-solid fa-list-check'],
      ['Daftar Laporan', 'teknisi/riwayat.html', 'fa-solid fa-clipboard-list'],
      ['Pengaturan', 'pengaturan.html', 'fa-solid fa-gear'],
    ],
  };

  async function initPengaturanPage() {
    const nav = document.getElementById('sidebarNav');
    if (!nav) return;

    let s = A.getSession();
    const peran = s.peran;

    nav.innerHTML = MENU[peran].map(([judul, link, ikon]) =>
      '<a href="' + link + '" class="nav-link ' + (judul === 'Pengaturan' ? 'active' : '') + '"><i class="' + ikon + '"></i><span>' + judul + '</span></a>'
    ).join('');
    const brand = document.querySelector('.sidebar-brand');
    if (brand) brand.href = A.HOME[peran];

    const roleClass = { Pelapor: 'role-pelapor', Verifikator: 'role-verifikator', Teknisi: 'role-teknisi' }[peran];
    const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v || '–'; };
    const avatarEls = ['sidebarAvatar', 'profileAvatar'].map((id) => document.getElementById(id)).filter(Boolean);
    avatarEls.forEach((el) => el.classList.add(roleClass));

    function render(p) {
      setText('sidebarName', p.nama);
      setText('sidebarRole', p.jabatan);
      setText('profileName', p.nama);
      const awalan = p.role === 'mahasiswa' ? 'NIM ' : p.role === 'teknisi' ? 'ID ' : 'NIP ';
      setText('profileId', p.identitas ? awalan + p.identitas : '–');
      setText('profileRoleBadge', p.jabatan);
      setText('profileEmail', p.email);
      setText('breadcrumbRole', peran);
      avatarEls.forEach((el) => setAvatar(el, p));
    }
    render(s);

    // Segarkan data profil dari server
    try {
      const p = await API.get('auth/profil.php', { id_user: s.id_user });
      s = A.saveSession(p);
      render(s);
    } catch (err) {
      A.showToast(err.message, 'error');
    }

    const avatarInput = document.getElementById('avatarUploadInput');
    if (avatarInput) {
      avatarInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { A.showToast('File harus berupa gambar (PNG/JPG).', 'error'); return; }
        if (file.size > 10 * 1024 * 1024) { A.showToast('Ukuran gambar maksimal 10MB.', 'error'); return; }
        try {
          const kecil = await A.kompresGambar(file, 800, 0.85);
          const fd = new FormData();
          fd.append('id_user', s.id_user);
          fd.append('foto', kecil, kecil.name);
          const hasil = await API.post('auth/foto_profil.php', fd);
          s = A.saveSession(Object.assign({}, s, { foto_user: hasil.foto_user }));
          render(s);
          A.showToast('Foto profil berhasil diperbarui!', 'success');
        } catch (err) {
          A.showToast(err.message, 'error');
        } finally {
          avatarInput.value = '';
        }
      });
    }

    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) btnLogout.addEventListener('click', () => A.clearSession());

    const form = document.getElementById('formUbahPassword');
    if (form) {
      const alertBox = document.getElementById('passwordAlert');
      const tampil = (pesan, ok) => {
        if (!alertBox) { A.showToast(pesan, ok ? 'success' : 'error'); return; }
        alertBox.textContent = pesan;
        alertBox.style.display = 'block';
        alertBox.style.background = ok ? '#ecfdf5' : '#fef2f2';
        alertBox.style.borderColor = ok ? '#bbf7d0' : '#fecaca';
        alertBox.style.color = ok ? '#065f46' : '#991b1b';
        setTimeout(() => { alertBox.style.display = 'none'; }, 4500);
      };
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const lama = document.getElementById('oldPassword').value;
        const baru = document.getElementById('newPassword').value;
        const konfirmasi = document.getElementById('confirmPassword').value;
        if (!lama || !baru || !konfirmasi) return tampil('Semua kolom kata sandi wajib diisi.', false);
        if (baru.length < 8) return tampil('Kata sandi baru minimal 8 karakter.', false);
        if (baru !== konfirmasi) return tampil('Konfirmasi kata sandi baru tidak cocok.', false);
        try {
          await API.post('auth/ubah_password.php', { id_user: s.id_user, password_lama: lama, password_baru: baru });
          tampil('Kata sandi berhasil diperbarui dengan aman!', true);
          A.showToast('Kata sandi berhasil diubah.', 'success');
          form.reset();
        } catch (err) {
          tampil(err.message, false);
        }
      });
    }
  }

  /* ==========================================================================
     6. AUTO INIT
     ========================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    initResponsiveSidebar();
    initPasswordToggles();
    initAuthForms();
    if (A.getSession()) {
      terapkanProfilSidebar();
      initLogout();
    }
    initPengaturanPage();
  });

  A.terapkanProfilSidebar = terapkanProfilSidebar;
})();
