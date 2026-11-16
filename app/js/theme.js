/* Pesadithi Lab: light or dark. Light is the default; a choice is remembered in this browser only. Loaded early to avoid a flash. */
(function () {
  const KEY = 'pesadithi:theme';
  const get = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const set = (v) => { try { localStorage.setItem(KEY, v); } catch (e) { /* storage unavailable: still switches for this visit */ } };
  const apply = (t) => {
    document.documentElement.setAttribute('data-theme', t);
    const b = document.getElementById('themeBtn');
    if (b) { b.setAttribute('aria-pressed', String(t === 'dark')); b.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'); b.title = b.getAttribute('aria-label'); }
    window.dispatchEvent(new CustomEvent('pd-theme', { detail: t }));
  };
  apply(get() === 'dark' ? 'dark' : 'light');
  document.addEventListener('DOMContentLoaded', () => {
    const b = document.getElementById('themeBtn'); if (!b) return;
    apply(document.documentElement.getAttribute('data-theme'));
    b.addEventListener('click', () => { const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; set(t); apply(t); });
  });
})();
