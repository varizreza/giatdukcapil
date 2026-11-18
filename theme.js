/* Tema: terang sebagai bawaan; pilihan pengguna disimpan di perangkat. */
(function () {
  var t = 'light';
  try { t = localStorage.getItem('dukcapil-tema') || 'light'; } catch (e) {}
  document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');
})();
