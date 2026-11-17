/* Service worker Dashboard Kegiatan Dukcapil.
   Hanya menyimpan "cangkang" aplikasi (HTML, JS, ikon) agar bisa dibuka tanpa internet.
   Data dari Google Sheets/Drive TIDAK pernah disimpan di sini dan tidak dilewatkan lewat cache. */
const VERSI = 'dukcapil-v1';
const CANGKANG = ['./', 'index.html', 'app.js', 'config.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSI).then((c) => c.addAll(CANGKANG)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSI).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // POST ke Apps Script tidak disentuh
  const url = new URL(req.url);
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !fonts) return;   // Google Drive, Apps Script, dll: langsung ke jaringan

  if (req.mode === 'navigate') {                          // halaman: coba jaringan dulu, cadangan dari cache
    e.respondWith(
      fetch(req).then((res) => {
        const salin = res.clone(); caches.open(VERSI).then((c) => c.put('index.html', salin)); return res;
      }).catch(() => caches.match('index.html').then((r) => r || caches.match('./')))
    );
    return;
  }
  // berkas statis & font: pakai cache, perbarui di latar belakang
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then((res) => {
        if (res && (res.ok || res.type === 'opaque')) { const salin = res.clone(); caches.open(VERSI).then((c) => c.put(req, salin)); }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
