/* Dibaca dari config.js. Biasanya tidak perlu diubah di sini. */
var API_URL = (window.DUKCAPIL && window.DUKCAPIL.API_URL) || '';
var MAKS_MB = (window.DUKCAPIL && window.DUKCAPIL.MAKS_MB) || 10;
/* cegah halaman dibuka di dalam frame situs lain (clickjacking) */
try { if (window.top !== window.self) { document.documentElement.style.display = 'none'; window.top.location = window.self.location; } } catch (e) { document.documentElement.style.display = 'none'; }

(function () {
  var $ = function (id) { return document.getElementById(id); };
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function uid(p) { return (p || 'a') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function str(v, max) { return String(v == null ? '' : v).slice(0, max || 300); }

  var T0 = new Date(); T0.setHours(0, 0, 0, 0);
  function iso(off) { var d = new Date(T0); d.setDate(d.getDate() + off); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function dayDiff(s) { return Math.round((new Date(s + 'T00:00:00') - T0) / 864e5); }
  function fmtDate(s) { return new Date(s + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); }
  function when(n) { return n < 0 ? 'Lewat ' + (-n) + ' hari' : n === 0 ? 'Hari ini' : 'H-' + n; }

  /* ---------- tautan undangan (#setup=...) ---------- */
  (function () {
    var m = /^#setup=([A-Za-z0-9_=-]+)$/.exec(location.hash || '');
    if (!m) return;
    try {
      var u = atob(m[1].replace(/-/g, '+').replace(/_/g, '/'));
      if (/^https:\/\/script\.google\.com\/.+\/exec$/.test(u)) lsSet('dukcapil-api', u);
    } catch (e) {}
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  })();

  /* ---------- sambungan (disimpan per browser) ---------- */
  /* sesi login: token bertanda tangan dari server. Tanpa "ingat saya" disimpan di sessionStorage (hilang saat tab ditutup). */
  var AUTHK = 'dukcapil-sesi', CACHEK = 'dukcapil-cache';
  var ROLES = { admin: 'Admin', editor: 'Editor', viewer: 'Pembaca' };
  function loadAuth() {
    try {
      var r = sessionStorage.getItem(AUTHK) || localStorage.getItem(AUTHK), o = r ? JSON.parse(r) : null;
      if (o && o.t && o.me && o.exp > Date.now()) return o;
    } catch (e) {}
    return null;
  }
  function clearAuthStore() { try { sessionStorage.removeItem(AUTHK); } catch (e) {} lsDel(AUTHK); }
  function saveAuth(o) {
    clearAuthStore();
    try { (o.ingat ? localStorage : sessionStorage).setItem(AUTHK, JSON.stringify(o)); } catch (e) {}
  }
  var auth = loadAuth(), publik = true;
  function peranNow() { return auth ? auth.me.peran : 'tamu'; }
  function canEdit() { var r = peranNow(); return r === 'admin' || r === 'editor'; }
  function isAdmin() { return peranNow() === 'admin'; }
  function apiUrl() { var v = lsGet('dukcapil-api'); return v !== null ? v : API_URL; }
  function maxMb() { var v = parseInt(lsGet('dukcapil-max'), 10); return v > 0 ? v : MAKS_MB; }
  var REMOTE = !!apiUrl();

  /* ---------- konfigurasi isi dashboard ---------- */
  var PALN = ['Tanpa warna', 'Abu-abu', 'Teal', 'Jingga', 'Ungu', 'Merah muda', 'Hijau', 'Biru', 'Cokelat'];
  function cv(c) { return c ? 'var(--p' + c + ')' : 'var(--muted)'; }

  function dpaT(id, n, docs) {
    return { id: id, n: n, kat: 'dpa', docs: ['Usulan kegiatan masuk Renja/RKA', 'DPA/DPPA yang disahkan (kegiatan dan pagu tercantum)'].concat(docs) };
  }
  function jbT(id, n, docs) { return { id: id, n: n, kat: 'jb', docs: docs }; }
  var DEF_TAGS = [
    ['penduduk-rentan', 'Pendataan penduduk rentan', 3], ['perekaman-ktp-el', 'Perekaman KTP-el', 2], ['pemilih-pemula', 'Pemilih pemula', 7],
    ['akta-kelahiran', 'Akta kelahiran', 5], ['ikd', 'Identitas Kependudukan Digital', 4], ['kia', 'Kartu Identitas Anak', 6],
    ['disabilitas-lansia', 'Disabilitas dan lansia', 8], ['sosialisasi', 'Sosialisasi', 1], ['kerja-sama', 'Kerja sama', 7],
    ['inovasi-layanan', 'Inovasi layanan', 2], ['perlindungan-data', 'Perlindungan data pribadi', 4], ['penertiban-data', 'Penertiban data', 1]
  ];
  var IDEA_TAGS = {
    'Bimtek peningkatan kapasitas petugas layanan': ['sosialisasi'],
    'Survei Kepuasan Masyarakat': ['inovasi-layanan'],
    'Digitalisasi arsip dokumen kependudukan': ['penertiban-data'],
    'Perekaman KTP-el pemilih pemula di SMA/SMK': ['perekaman-ktp-el', 'pemilih-pemula'],
    'Jemput bola perekaman penduduk rentan': ['penduduk-rentan', 'perekaman-ktp-el'],
    'Aktivasi Identitas Kependudukan Digital (IKD) massal': ['ikd'],
    'Pelayanan khusus lansia, disabilitas, dan warga sakit': ['penduduk-rentan', 'disabilitas-lansia'],
    'Pendataan KIA (Kartu Identitas Anak) di PAUD dan SD': ['kia'],
    'Penertiban data ganda dan NIK tidak aktif': ['penertiban-data'],
    'Sosialisasi pindah datang online': ['sosialisasi', 'inovasi-layanan'],
    'Percepatan akta kelahiran anak': ['akta-kelahiran'],
    'Kerja sama dengan rumah sakit dan bidan untuk akta kelahiran': ['akta-kelahiran', 'kerja-sama'],
    'Pelaporan kematian lewat RT/RW, desa, dan puskesmas': ['kerja-sama'],
    'Layanan terpadu isbat nikah dan akta': ['kerja-sama'],
    'Sosialisasi pentingnya akta bagi calon pengantin dan orang tua baru': ['sosialisasi', 'akta-kelahiran'],
    'Rekonsiliasi data kependudukan semester': ['penertiban-data'],
    'PKS pemanfaatan data dengan perbankan, BPJS, dan instansi lain': ['kerja-sama'],
    'Pemeliharaan jaringan dan pencadangan data SIAK': ['perlindungan-data'],
    'Sosialisasi perlindungan data pribadi bagi operator': ['sosialisasi', 'perlindungan-data'],
    'Mobil layanan dukcapil keliling': ['inovasi-layanan'],
    'Aplikasi antrean dan pengaduan online': ['inovasi-layanan'],
    'Konten edukasi di media sosial dan video layanan': ['sosialisasi']
  };

  function defCfg() {
    var ideas = [
      ['sekr', 'Penyusunan LKjIP dan Perjanjian Kinerja', 'admin', 'Laporan kinerja instansi tahunan beserta data dukung capaian indikator tiap bidang.'],
      ['sekr', 'Bimtek peningkatan kapasitas petugas layanan', 'sosialisasi', 'Pelatihan petugas front office dan operator SIAK soal pelayanan prima dan ketentuan terbaru.'],
      ['sekr', 'Survei Kepuasan Masyarakat', 'monev', 'Ukur kepuasan pengguna layanan secara berkala dan tindak lanjuti keluhan terbanyak.'],
      ['sekr', 'Digitalisasi arsip dokumen kependudukan', 'pengadaan', 'Pindai dan tata arsip fisik agar pencarian dokumen cepat dan aman dari kerusakan.'],
      ['daftar', 'Perekaman KTP-el pemilih pemula di SMA/SMK', 'jb-sekolah', 'Petugas datang ke sekolah untuk merekam siswa yang sudah atau akan genap 17 tahun.'],
      ['daftar', 'Aktivasi Identitas Kependudukan Digital (IKD) massal', 'jemput', 'Aktivasi IKD di kantor desa, kampus, atau instansi dengan meja bantuan khusus.'],
      ['daftar', 'Pelayanan khusus lansia, disabilitas, dan warga sakit', 'jb-khusus', 'Layanan datang ke rumah atau panti untuk warga yang sulit ke kantor.'],
      ['daftar', 'Jemput bola perekaman penduduk rentan', 'jb-khusus', 'Rekam KTP-el warga yang sulit datang ke kantor: lansia, penyandang disabilitas, warga sakit, dan penghuni panti.'],
      ['daftar', 'Pendataan KIA (Kartu Identitas Anak) di PAUD dan SD', 'jb-sekolah', 'Percepat kepemilikan KIA lewat kerja sama dengan sekolah dan posyandu.'],
      ['daftar', 'Penertiban data ganda dan NIK tidak aktif', 'monev', 'Verifikasi data ganda, pindah, dan meninggal agar data penduduk bersih.'],
      ['daftar', 'Sosialisasi pindah datang online', 'sosialisasi', 'Kenalkan layanan pindah datang tanpa tatap muka ke kecamatan, desa, dan kelurahan.'],
      ['sipil', 'Percepatan akta kelahiran anak', 'jemput', 'Layanan terpadu di kecamatan atau desa untuk anak yang belum punya akta kelahiran.'],
      ['sipil', 'Kerja sama dengan rumah sakit dan bidan untuk akta kelahiran', 'pks', 'Pengajuan akta langsung dari fasilitas kesehatan saat bayi lahir.'],
      ['sipil', 'Pelaporan kematian lewat RT/RW, desa, dan puskesmas', 'pks', 'Alur lapor kematian yang lebih cepat supaya data penduduk tidak tertinggal.'],
      ['sipil', 'Layanan terpadu isbat nikah dan akta', 'pks', 'Kolaborasi dengan pengadilan agama dan kantor urusan agama untuk dokumen perkawinan.'],
      ['sipil', 'Sosialisasi pentingnya akta bagi calon pengantin dan orang tua baru', 'sosialisasi', 'Edukasi pencatatan peristiwa penting lewat KUA, posyandu, dan kelompok PKK.'],
      ['piak', 'Rekonsiliasi data kependudukan semester', 'rakor', 'Cocokkan data daerah dengan data pusat dan siapkan perbaikan yang diperlukan.'],
      ['piak', 'Rekonsiliasi data pemilih dengan KPU', 'rakor', 'Samakan data penduduk potensial pemilih sebelum tahapan pemilihan.'],
      ['piak', 'PKS pemanfaatan data dengan perbankan, BPJS, dan instansi lain', 'pks', 'Perluas pemanfaatan data kependudukan untuk verifikasi identitas layanan publik.'],
      ['piak', 'Pemeliharaan jaringan dan pencadangan data SIAK', 'pengadaan', 'Pastikan perangkat, jaringan, dan cadangan data siap agar layanan tidak terhenti.'],
      ['piak', 'Sosialisasi perlindungan data pribadi bagi operator', 'sosialisasi', 'Aturan akses, hak pengguna, dan pengamanan data penduduk untuk petugas dan mitra.'],
      ['pdip', 'Mobil layanan dukcapil keliling', 'jb-keliling', 'Jadwal rutin layanan keliling ke kecamatan jauh dan wilayah kepulauan.'],
      ['pdip', 'Aplikasi antrean dan pengaduan online', 'inovasi', 'Daftar antrean dari rumah dan pantau status pengaduan secara terbuka.'],
      ['pdip', 'Infografis data agregat kependudukan per semester', 'inovasi', 'Publikasi jumlah penduduk dan cakupan dokumen agar mudah dipakai perencanaan daerah.'],
      ['pdip', 'Konten edukasi di media sosial dan video layanan', 'inovasi', 'Seri video singkat soal syarat dan alur layanan agar warga tidak bolak-balik ke kantor.'],
      ['pdip', 'Penghargaan desa/kelurahan tertib administrasi kependudukan', 'monev', 'Penilaian dan apresiasi wilayah dengan cakupan dokumen dan pelaporan peristiwa terbaik.']
    ];
    return {
      instansi: 'Dinas Kependudukan dan Pencatatan Sipil',
      judul: 'Dashboard Kegiatan Dukcapil',
      bidang: [
        { id: 'sekr', n: 'Sekretariat', s: 'Umum, kepegawaian, keuangan, perencanaan', c: 1 },
        { id: 'daftar', n: 'Pendaftaran Penduduk', s: 'KTP-el, KK, KIA, pindah datang, IKD', c: 2 },
        { id: 'sipil', n: 'Pencatatan Sipil', s: 'Akta kelahiran, kematian, perkawinan, perceraian', c: 3 },
        { id: 'piak', n: 'Informasi Adminduk (PIAK)', s: 'SIAK, data, jaringan, kerja sama data', c: 4 },
        { id: 'pdip', n: 'Pemanfaatan Data & Inovasi', s: 'Inovasi layanan, data agregat, publikasi', c: 5 }
      ],
      tipe: [
        dpaT('sosialisasi', 'Sosialisasi / bimtek', ['Surat tugas atau SK panitia', 'KAK (kerangka acuan kerja)', 'RAB', 'Surat undangan atau permohonan lokasi', 'Materi paparan', 'Daftar hadir peserta', 'Notulen atau berita acara', 'Foto dokumentasi', 'Laporan kegiatan', 'SPJ (kwitansi, bukti pembayaran)']),
        dpaT('rakor', 'Rapat koordinasi / rekonsiliasi', ['Surat undangan rapat', 'Agenda dan bahan rapat', 'Daftar hadir', 'Notulen', 'Rencana tindak lanjut', 'Foto dokumentasi', 'Laporan hasil rapat']),
        dpaT('pks', 'Kerja sama (PKS / MoU)', ['Surat permohonan atau penawaran kerja sama', 'Draf PKS atau MoU', 'Telaah bagian hukum', 'Persetujuan pimpinan', 'PKS bertanda tangan', 'Rencana kerja bersama', 'Laporan pelaksanaan kerja sama']),
        dpaT('inovasi', 'Inovasi / pengembangan layanan', ['Proposal inovasi', 'SK tim inovasi', 'SOP layanan baru', 'Petunjuk teknis atau manual', 'Hasil uji coba', 'Bahan publikasi (brosur, pengumuman)', 'Laporan pelaksanaan', 'Bukti dukung penilaian inovasi']),
        dpaT('monev', 'Monitoring, evaluasi, survei', ['Surat tugas tim', 'Instrumen atau format monev', 'Data hasil pengumpulan', 'Analisis dan rekomendasi', 'Laporan hasil monev', 'Tindak lanjut rekomendasi']),
        dpaT('pengadaan', 'Pengadaan barang / jasa', ['Usulan kebutuhan', 'Spesifikasi teknis dan HPS', 'Dokumen pemilihan penyedia', 'Kontrak atau SPK', 'Berita acara serah terima', 'Foto bukti barang atau jasa', 'SPJ pembayaran']),
        dpaT('admin', 'Pelaporan & administrasi', ['Data dukung', 'Draf dokumen', 'Reviu atasan', 'Dokumen final bertanda tangan', 'Pengiriman dan pengarsipan']),
        jbT('jemput', 'Jemput bola di desa / kelurahan / kecamatan', ['Surat tugas petugas', 'Surat pemberitahuan ke desa, kelurahan, atau kecamatan lokasi', 'Daftar sasaran (nama dan NIK)', 'Berita acara pelayanan', 'Rekap dokumen terbit (KTP-el, KIA, akta, IKD)', 'Foto dokumentasi', 'Laporan kegiatan', 'SPJ perjalanan dinas dan transport']),
        jbT('jb-sekolah', 'Jemput bola di sekolah / kampus', ['Surat tugas petugas', 'Surat pemberitahuan atau izin dari sekolah/kampus', 'Daftar siswa/mahasiswa sasaran (nama dan NIK)', 'Berita acara pelayanan', 'Rekap dokumen terbit (KTP-el, KIA, IKD)', 'Foto dokumentasi', 'Laporan kegiatan', 'SPJ perjalanan dinas dan transport']),
        jbT('jb-khusus', 'Layanan khusus (lansia, disabilitas, panti, rumah sakit)', ['Surat tugas petugas', 'Surat pengantar dari panti, rumah sakit, atau desa', 'Daftar penerima layanan (nama dan NIK)', 'Berita acara pelayanan', 'Rekap dokumen terbit', 'Foto dokumentasi (dengan persetujuan penerima layanan)', 'Laporan kegiatan', 'SPJ perjalanan dinas dan transport']),
        jbT('jb-keliling', 'Layanan keliling (mobil dukcapil)', ['Jadwal dan rute layanan keliling', 'Surat tugas petugas dan pengemudi', 'Surat pemberitahuan ke kecamatan dan desa', 'Daftar antrean atau sasaran', 'Berita acara pelayanan', 'Rekap dokumen terbit', 'Foto dokumentasi', 'Laporan kegiatan', 'SPJ BBM dan perjalanan dinas'])
      ],
      tags: DEF_TAGS.map(function (t) { return { id: t[0], n: t[1], c: t[2] }; }),
      ideas: ideas.map(function (x, i) { return { id: 'i' + (i + 1), b: x[0], t: x[1], k: x[2], d: x[3], tg: (IDEA_TAGS[x[1]] || []).slice() }; })
    };
  }

  function normCfg(x) {
    var d = defCfg();
    if (!x || typeof x !== 'object') return d;
    var o = { instansi: str(x.instansi || d.instansi, 120), judul: str(x.judul || d.judul, 80) };
    o.bidang = (Array.isArray(x.bidang) ? x.bidang : []).map(function (b) {
      return { id: str(b.id, 40) || uid('b'), n: str(b.n, 80).trim(), s: str(b.s, 160), c: (+b.c >= 1 && +b.c <= 8) ? +b.c : 1 };
    }).filter(function (b) { return b.n; });
    if (!o.bidang.length) o.bidang = d.bidang;
    o.tipe = (Array.isArray(x.tipe) ? x.tipe : []).map(function (t) {
      var id = str(t.id, 40) || uid('t');
      return { id: id, n: str(t.n, 80).trim(), kat: (t.kat === 'jb' || t.kat === 'dpa') ? t.kat : (id === 'jemput' ? 'jb' : 'dpa'), docs: (Array.isArray(t.docs) ? t.docs : []).map(function (s) { return str(s, 160).trim(); }).filter(Boolean) };
    }).filter(function (t) { return t.n; });
    ['dpa', 'jb'].forEach(function (kt) {
      if (!o.tipe.some(function (t) { return t.kat === kt; })) o.tipe = o.tipe.concat(d.tipe.filter(function (t) { return t.kat === kt; }));
    });
    var bid = o.bidang.map(function (b) { return b.id; }), tid = o.tipe.map(function (t) { return t.id; });
    o.tags = Array.isArray(x.tags) ? x.tags.map(function (t) {
      return { id: str(t.id, 40) || uid('g'), n: str(t.n, 60).trim(), c: (+t.c >= 0 && +t.c <= 8) ? +t.c : 0 };
    }).filter(function (t) { return t.n; }) : d.tags;
    var tgid = o.tags.map(function (t) { return t.id; });
    o.ideas = (Array.isArray(x.ideas) ? x.ideas : []).map(function (i) {
      return { id: str(i.id, 40) || uid('i'), b: bid.indexOf(i.b) > -1 ? i.b : bid[0], t: str(i.t, 160).trim(), k: tid.indexOf(i.k) > -1 ? i.k : tid[0], d: str(i.d, 400),
               tg: (Array.isArray(i.tg) ? i.tg : []).filter(function (v, n, arr) { return arr.indexOf(v) === n && tgid.indexOf(v) > -1; }) };
    }).filter(function (i) { return i.t; });
    return o;
  }

  var cfg;
  (function () { var raw = lsGet('dukcapil-cfg'), p = null; try { p = raw ? JSON.parse(raw) : null; } catch (e) {} cfg = normCfg(p); })();
  function saveCfgLocal() { lsSet('dukcapil-cfg', JSON.stringify(cfg)); }
  function BD(id) { for (var i = 0; i < cfg.bidang.length; i++) if (cfg.bidang[i].id === id) return cfg.bidang[i]; return { id: id, n: '(bidang dihapus)', s: '', c: 0 }; }
  function TP(id) { for (var i = 0; i < cfg.tipe.length; i++) if (cfg.tipe[i].id === id) return cfg.tipe[i]; return { id: id, n: '(jenis dihapus)', docs: [] }; }
  function mkDocs(tipe, done) { return TP(tipe).docs.map(function (t, i) { return { t: t, d: i < done, f: null }; }); }

  /* ---------- data kegiatan ---------- */
  var KEY = 'dukcapil-kegiatan-v1';
  var DS = { usulan: 'Usulan', masuk: 'Masuk DPA', laksana: 'Dilaksanakan', real: 'Terealisasi', batal: 'Dibatalkan' };
  var KATN = { dpa: 'Kegiatan DPA', jb: 'Jemput bola' };
  function seed() {
    function a(name, j, b, k, off, done, x) {
      var o = { id: uid(), name: name, j: j, b: b, k: k, date: iso(off), docs: mkDocs(k, done), sample: true };
      for (var p in x) o[p] = x[p];
      return o;
    }
    var Y = T0.getFullYear();
    return { acts: [
      a('Perekaman KTP-el pemilih pemula di SMA/SMK', 'jb', 'daftar', 'jb-sekolah', 6, 5, { loc: 'SMAN 1 dan SMKN 2', ptg: 'Tim perekaman 4 orang', sas: 180, ter: 0, tags: ['perekaman-ktp-el', 'pemilih-pemula'] }),
      a('Percepatan akta kelahiran anak di tiga kecamatan', 'jb', 'sipil', 'jemput', 20, 2, { loc: 'Kecamatan Utara, Timur, Selatan', ptg: 'Tim pencatatan sipil', sas: 250, ter: 0, tags: ['akta-kelahiran'] }),
      a('Pelayanan dokumen untuk lansia dan disabilitas di panti', 'jb', 'daftar', 'jb-khusus', -20, 8, { loc: 'Panti Wreda Kasih', ptg: 'Tim layanan khusus', sas: 40, ter: 37, cat: 'Tiga penghuni menunggu data pendukung.', tags: ['penduduk-rentan', 'disabilitas-lansia'] }),
      a('Rekonsiliasi data kependudukan semester II', 'dpa', 'piak', 'rakor', -3, 6, { th: Y, sub: 'Pengelolaan informasi administrasi kependudukan', pagu: 18000000, real: 6500000, pptk: 'Kabid PIAK', ds: 'laksana', tags: ['penertiban-data'] }),
      a('Penyusunan LKjIP dan Perjanjian Kinerja', 'dpa', 'sekr', 'admin', 14, 2, { th: Y, sub: 'Perencanaan, penganggaran, dan evaluasi kinerja', pagu: 12000000, pptk: 'Sekretaris', ds: 'masuk' }),
      a('Survei Kepuasan Masyarakat layanan dukcapil', 'dpa', 'pdip', 'monev', 9, 4, { th: Y, sub: 'Peningkatan mutu pelayanan', pagu: 25000000, pptk: 'Kabid Pemanfaatan Data', ds: 'laksana', tags: ['inovasi-layanan'] }),
      a('PKS pemanfaatan data dengan BPJS', 'dpa', 'piak', 'pks', 30, 0, { th: Y + 1, sub: 'Pemanfaatan data kependudukan', pptk: 'Kabid PIAK', ds: 'usulan', tags: ['kerja-sama'] }),
      a('Bimtek petugas layanan front office', 'dpa', 'sekr', 'sosialisasi', -12, 12, { th: Y, sub: 'Peningkatan kapasitas aparatur', pagu: 30000000, real: 28750000, pptk: 'Kasubag Umum dan Kepegawaian', ds: 'real', tags: ['sosialisasi'] })
    ].map(normAct) };
  }
  function load() {
    try { var r = lsGet(KEY); if (r) { var s = JSON.parse(r); if (s && Array.isArray(s.acts)) { s.acts = s.acts.map(normAct); return s; } } } catch (e) {}
    return seed();
  }
  var state = REMOTE ? { acts: [] } : load();
  function save() { if (REMOTE) return; lsSet(KEY, JSON.stringify(state)); }

  /* ---------- data inovasi ---------- */
  var KEYI = 'dukcapil-inovasi-v1';
  var IST = { jalan: 'Sedang berjalan', rencana: 'Direncanakan', selesai: 'Sudah berjalan', tunda: 'Ditunda' };
  var ORDI = { jalan: 0, rencana: 1, tunda: 2, selesai: 3 };
  function normInov(v) {
    return {
      id: String(v.id), name: str(v.name, 160), st: IST[v.st] ? v.st : 'rencana', b: String(v.b || ''),
      start: str(v.start, 10), end: str(v.end, 10), pic: str(v.pic, 120), sas: str(v.sas, 160),
      desc: str(v.desc, 600), man: str(v.man, 600), lnk: str(v.lnk, 300), cat: str(v.cat, 400), sample: !!v.sample,
      tags: (Array.isArray(v.tags) ? v.tags : []).map(String).filter(function (x, n, arr) { return arr.indexOf(x) === n && cfg.tags.some(function (t) { return t.id === x; }); })
    };
  }
  function seedInov() {
    return [
      { id: uid('v'), name: 'Aplikasi antrean dan pengaduan online', st: 'jalan', b: 'pdip', start: iso(-60), end: iso(30), pic: 'Kabid Pemanfaatan Data', sas: 'Pemohon layanan dan warga', desc: 'Warga mengambil nomor antrean dari rumah dan memantau status pengaduan lewat ponsel.', man: 'Waktu tunggu di kantor berkurang dan keluhan tertangani lebih cepat.', tags: ['inovasi-layanan'], sample: true },
      { id: uid('v'), name: 'Pengajuan akta kelahiran langsung dari rumah sakit', st: 'rencana', b: 'sipil', start: iso(45), end: iso(200), pic: 'Kabid Pencatatan Sipil', sas: 'Orang tua bayi yang baru lahir', desc: 'Rumah sakit mengirim data kelahiran ke dinas sehingga akta terbit tanpa orang tua datang ke kantor.', man: 'Cakupan akta kelahiran naik dan orang tua tidak perlu mengantre.', tags: ['akta-kelahiran', 'kerja-sama'], sample: true },
      { id: uid('v'), name: 'Aktivasi IKD di titik layanan desa', st: 'selesai', b: 'daftar', start: iso(-200), end: iso(-30), pic: 'Kabid Pendaftaran Penduduk', sas: 'Warga desa dan perangkat desa', desc: 'Meja aktivasi IKD di kantor desa pada hari layanan.', man: 'Jumlah warga yang memiliki IKD bertambah.', tags: ['ikd'], sample: true }
    ].map(normInov);
  }
  function loadInov() {
    try { var r = lsGet(KEYI); if (r) { var o = JSON.parse(r); if (o && Array.isArray(o.items)) return o.items.map(normInov); } } catch (e) {}
    return seedInov();
  }
  /* ---------- data pelaksanaan jemput bola ---------- */
  var KEYJ = 'dukcapil-jemputbola-v1';
  var HSL = [['rek', 'Perekaman KTP-el'], ['kia', 'KIA'], ['akta', 'Akta kelahiran'], ['kk', 'Kartu Keluarga'], ['ikd', 'Aktivasi IKD'], ['lain', 'Layanan lain']];
  function normJb(v) {
    var o = {
      id: String(v.id), name: str(v.name, 160), date: /^\d{4}-\d{2}-\d{2}$/.test(v.date || '') ? v.date : iso(0), b: String(v.b || ''), k: String(v.k || ''), kid: String(v.kid || ''),
      kec: str(v.kec, 80), desa: str(v.desa, 80), loc: str(v.loc, 200), ptg: str(v.ptg, 160), sas: num0(v.sas), ter: num0(v.ter),
      kend: str(v.kend, 600), tl: str(v.tl, 600), cat: str(v.cat, 400), sample: !!v.sample,
      cov: /^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(String(v.cov || '')) && String(v.cov).length <= 45000 ? String(v.cov) : '', covi: str(v.covi, 80),
      tags: (Array.isArray(v.tags) ? v.tags : []).map(String).filter(function (x, n, arr) { return arr.indexOf(x) === n && cfg.tags.some(function (t) { return t.id === x; }); }),
      files: (Array.isArray(v.files) ? v.files : []).filter(function (f) { return f && /^https?:\/\//i.test(String(f.u || '')); }).map(function (f) {
        return { n: str(f.n, 120), u: str(f.u, 500), i: str(f.i, 80), k: f.k === 'link' ? 'link' : (f.k === 'foto' ? 'foto' : 'dok'), at: str(f.at, 30) };
      })
    };
    HSL.forEach(function (h) { o[h[0]] = num0(v[h[0]]); });
    return o;
  }
  function seedJb() {
    return [
      { id: uid('j'), name: 'Jemput bola perekaman KTP-el di Desa Sukamaju', date: iso(-20), b: 'daftar', kec: 'Sukamaju', desa: 'Sukamaju', loc: 'Balai Desa Sukamaju', ptg: 'Tim perekaman Bidang Pendaftaran', sas: 120, ter: 96, rek: 84, kia: 0, akta: 0, kk: 12, ikd: 0, lain: 0, kend: 'Jaringan di balai desa sempat terputus dua kali.', tl: 'Warga yang belum terlayani dijadwalkan di kantor kecamatan.', tags: ['perekaman-ktp-el', 'penduduk-rentan'], sample: true },
      { id: uid('j'), name: 'Layanan akta kelahiran dan KIA di Posyandu Melati', date: iso(-9), b: 'sipil', kec: 'Cibening', desa: 'Mekarsari', loc: 'Posyandu Melati', ptg: 'Petugas Pencatatan Sipil', sas: 60, ter: 52, rek: 0, kia: 31, akta: 21, kk: 0, ikd: 0, lain: 0, kend: '', tl: '', tags: ['akta-kelahiran', 'kia'], sample: true },
      { id: uid('j'), name: 'Aktivasi IKD bagi lansia dan penyandang disabilitas', date: iso(-3), b: 'pdip', kec: 'Sukamaju', desa: 'Sukamulya', loc: 'Rumah warga dan balai RW 03', ptg: 'Tim IKD', sas: 40, ter: 35, rek: 0, kia: 0, akta: 0, kk: 0, ikd: 35, lain: 0, kend: 'Sebagian lansia tidak membawa ponsel pintar.', tl: 'Dijadwalkan kunjungan ulang bersama kader.', tags: ['ikd', 'disabilitas-lansia'], sample: true }
    ].map(normJb);
  }
  function loadJb() {
    try { var r = lsGet(KEYJ); if (r) { var o = JSON.parse(r); if (o && Array.isArray(o.items)) return o.items.map(normJb); } } catch (e) {}
    return seedJb();
  }
  var jbp = REMOTE ? [] : loadJb();
  function saveJb() { if (REMOTE) return; lsSet(KEYJ, JSON.stringify({ items: jbp })); }
  function findJb(id) { return jbp.filter(function (v) { return v.id === id; })[0]; }
  var KEYK = 'dukcapil-ikd-v1';
  function normIkd(v) {
    var n = function (x) { x = Math.round(Number(x)); return x > 0 ? x : 0; }, al = v.al;
    if (typeof al === 'string') { try { al = JSON.parse(al); } catch (e) { al = []; } }
    return { id: String(v.id), opd: str(v.opd, 120), tgl: str(v.tgl, 10), total: n(v.total), aktif: n(v.aktif), belum: n(v.belum), lain: n(v.lain), nok: n(v.nok), nbl: n(v.nbl), nlain: n(v.nlain),
      al: (Array.isArray(al) ? al : []).slice(0, 8).map(function (x) { return [str(x && x[0], 90), n(x && x[1])]; }) };
  }
  function loadIkd() {
    try { var r = lsGet(KEYK); if (r) { var o = JSON.parse(r); if (o && Array.isArray(o.items)) return o.items.map(normIkd); } } catch (e) {}
    return [];
  }
  var inov = REMOTE ? [] : loadInov();
  var ikd = REMOTE ? [] : loadIkd();
  function saveIkd() { if (REMOTE) return; lsSet(KEYK, JSON.stringify({ items: ikd })); }
  function saveInov() { if (REMOTE) return; lsSet(KEYI, JSON.stringify({ items: inov })); }
  function findInov(id) { return inov.filter(function (v) { return v.id === id; })[0]; }

  var ui = { umenu: null, gm: null, srvIkd: false, ikdm: null, ikdq: [], ikdel: null, tab: 'dash', kat: 'dpa', fb: 'all', fs: 'all', ft: 'all', ftags: [], tconfirm: null, q: '', ib: 'all', ik: 'all', bk: { kat: 'all', th: 'all', b: 'all', tg: 'all', q: '' }, open: {}, confirm: null, busy: {}, loadErr: REMOTE ? 'Memuat data…' : '', jdoc: 'all', jsel: null, jy: 'all', jb: 'all', jk: 'all', jt: 'all', jq: '', jopen: {}, jtags: [], jdel: null, jup: {}, jfiles: [], vs: 'all', vb: 'all', vt: 'all', vq: '', vopen: {}, vtags: [], vdel: null, sset: 'conn', sib: 'all', dirty: false };

  function info(a) {
    var t = a.docs.length, d = a.docs.filter(function (x) { return x.d; }).length, days = dayDiff(a.date), st;
    if (t > 0 && d === t) st = 'selesai'; else if (days < 0) st = 'terlambat'; else if (d > 0) st = 'berjalan'; else st = 'belum';
    return { t: t, d: d, days: days, st: st, pct: t ? Math.round(d / t * 100) : 0 };
  }
  var ST = { terlambat: 'Terlambat', berjalan: 'Berjalan', belum: 'Belum mulai', selesai: 'Selesai' };
  var ORD = { terlambat: 0, berjalan: 1, belum: 2, selesai: 3 };

  /* ---------- tampilan ringkasan, daftar, ide ---------- */
  function rp(n) { return 'Rp ' + Math.round(n || 0).toLocaleString('id-ID'); }
  function rpS(n) {
    n = n || 0;
    if (n >= 1e9) return 'Rp ' + (n / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' M';
    if (n >= 1e6) return 'Rp ' + (n / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' jt';
    return rp(n);
  }
  function yr(a) { return (a.j === 'dpa' && a.th) ? a.th : (parseInt(String(a.date).slice(0, 4), 10) || T0.getFullYear()); }
  function scoped() { return (ui.tab === 'dpa' || ui.tab === 'jb') ? state.acts.filter(function (a) { return a.j === ui.tab; }) : state.acts; }
  function TG(id) { for (var i = 0; i < cfg.tags.length; i++) if (cfg.tags[i].id === id) return cfg.tags[i]; return { id: id, n: '(tag dihapus)', c: 0 }; }
  function tagsHtml(ids) {
    if (!ids || !ids.length) return '';
    return '<div class="tgrow">' + ids.map(function (id) { var t = TG(id); return '<span class="tg" style="--c:' + cv(t.c) + '"><i class="dot"></i>' + esc(t.n) + '</span>'; }).join('') + '</div>';
  }
  function tagNames(a) { return a.tags.map(function (id) { return TG(id).n; }).join('; '); }
  function tog(arr, v) { var i = arr.indexOf(v); if (i > -1) arr.splice(i, 1); else arr.push(v); }
  function tagPicker(sel, ctx, id) {
    if (!cfg.tags.length) return '<span class="note">Belum ada tag. Tambahkan di menu Tagging.</span>';
    return cfg.tags.map(function (t) {
      return '<button class="chip tgchip" type="button" data-act="tagtog" data-ctx="' + ctx + '" data-id="' + esc(id) + '" data-t="' + esc(t.id) + '" aria-pressed="' + (sel.indexOf(t.id) > -1) + '" style="--c:' + cv(t.c) + '"><i class="dot"></i>' + esc(t.n) + '</button>';
    }).join('');
  }
  function colorOpts0(sel) { var h = ''; for (var c = 0; c <= 8; c++) h += '<option value="' + c + '"' + (c === sel ? ' selected' : '') + '>' + PALN[c] + '</option>'; return h; }
  function slug(n) {
    var b = String(n).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'tag', id = b, k = 2;
    while (cfg.tags.some(function (t) { return t.id === id; })) id = b + '-' + (k++);
    return id;
  }
  function commitCfg() {
    saveCfgLocal();
    if (REMOTE) {
      failed = false; inflight++; refreshSync();
      api({ action: 'setcfg', cfg: cfg }).catch(onFail).then(function () { inflight--; refreshSync(); });
    }
  }
  function addTag(name, c) {
    name = String(name || '').trim().slice(0, 60);
    if (!name) return 'Isi nama tag.';
    if (cfg.tags.some(function (t) { return t.n.toLowerCase() === name.toLowerCase(); })) return 'Tag "' + name + '" sudah ada.';
    cfg.tags.push({ id: slug(name), n: name, c: c >= 0 && c <= 8 ? c : 0 });
    commitCfg();
    return '';
  }
  function delTag(id) {
    cfg.tags = cfg.tags.filter(function (t) { return t.id !== id; });
    var off = function (arr) { return (arr || []).filter(function (v) { return v !== id; }); };
    cfg.ideas.forEach(function (x) { x.tg = off(x.tg); });
    if (draft) draft.ideas.forEach(function (x) { x.tg = off(x.tg); });
    state.acts.forEach(function (a) { if (a.tags.indexOf(id) > -1) { a.tags = off(a.tags); push(a); } });
    inov.forEach(function (v) { if (v.tags.indexOf(id) > -1) { v.tags = off(v.tags); pushInov(v); } });
    jbp.forEach(function (v) { if (v.tags.indexOf(id) > -1) { v.tags = off(v.tags); pushJb(v); } });
    ui.jtags = off(ui.jtags);
    if (ui.jt === id) ui.jt = 'all';
    ui.vtags = off(ui.vtags);
    if (ui.vt === id) ui.vt = 'all';
    if (ui.ft === id) ui.ft = 'all';
    if (ui.bk.tg === id) ui.bk.tg = 'all';
    save(); saveInov(); saveJb(); commitCfg();
  }
  function afterTagChange() { buildSelects(); renderAll(); }
  function renderTags() {
    var tc = {};
    [state.acts, jbp, inov].forEach(function (l) { l.forEach(function (x) { (x.tags || []).forEach(function (t) { tc[t] = (tc[t] || 0) + 1; }); }); });
    $('tag-chart').innerHTML = card('Pemakaian tag (kegiatan, jemput bola, inovasi)', barRows(Object.keys(tc).sort(function (a, b) { return tc[b] - tc[a]; }).slice(0, 8).map(function (t) { return { l: TG(t).n, v: tc[t], s: String(tc[t]) }; }), 4));
    $('n-tag').textContent = cfg.tags.length;
    var h = cfg.tags.map(function (t) {
      var na = state.acts.filter(function (a) { return a.tags.indexOf(t.id) > -1; }).length;
      var nv = inov.filter(function (v) { return v.tags.indexOf(t.id) > -1; }).length, nj = jbp.filter(function (v) { return v.tags.indexOf(t.id) > -1; }).length;
      var ni = cfg.ideas.filter(function (x) { return (x.tg || []).indexOf(t.id) > -1; }).length;
      var del = ui.tconfirm === t.id
        ? '<span class="row-btns"><button class="btn danger small" type="button" data-act="tg-del-yes" data-id="' + esc(t.id) + '">Ya, hapus' + (na + nv + nj ? ' dan lepas dari ' + (na + nv + nj) + ' item' : '') + '</button><button class="btn ghost small" type="button" data-act="tg-del-no">Batal</button></span>'
        : '<button class="btn ghost small" type="button" data-act="tg-del" data-id="' + esc(t.id) + '">Hapus</button>';
      return '<div class="trow" style="--c:' + cv(t.c) + '"><i class="dot"></i>' +
        '<input type="text" data-act="tgname" data-id="' + esc(t.id) + '" value="' + esc(t.n) + '" maxlength="60" aria-label="Nama tag">' +
        '<select data-act="tgcol" data-id="' + esc(t.id) + '" aria-label="Warna tag">' + colorOpts0(t.c) + '</select>' +
        '<div class="cnt"><span>' + na + ' kegiatan · ' + nj + ' jemput bola · ' + nv + ' inovasi · ' + ni + ' ide</span>' + (na ? '<button class="btn ghost small" type="button" data-act="tg-view" data-id="' + esc(t.id) + '">Lihat di Bank data</button>' : '') + (nj ? '<button class="btn ghost small" type="button" data-act="tg-viewj" data-id="' + esc(t.id) + '">Lihat jemput bola</button>' : '') + (nv ? '<button class="btn ghost small" type="button" data-act="tg-viewi" data-id="' + esc(t.id) + '">Lihat inovasi</button>' : '') + '</div>' + del + '</div>';
    }).join('');
    $('tag-list').innerHTML = h || '<div class="empty">Belum ada tag. Tambahkan tag pertama di atas.</div>';
  }

  /* ---------- jemput bola: dashboard, form, dokumentasi ---------- */
  function nf(n) { return Number(n || 0).toLocaleString('id-ID'); }
  function jbSumHasil(v) { return HSL.reduce(function (t, h) { return t + v[h[0]]; }, 0); }
  function jbRows() {
    var q = ui.jq.trim().toLowerCase();
    return jbp.filter(function (v) {
      return (ui.jy === 'all' || v.date.slice(0, 4) === ui.jy) && (ui.jb === 'all' || v.b === ui.jb) && (ui.jk === 'all' || v.kec === ui.jk) && (ui.jt === 'all' || v.tags.indexOf(ui.jt) > -1) && (ui.jdoc === 'all' || (ui.jdoc === 'ada') === (v.files.length > 0)) &&
        (!q || [v.name, v.kec, v.desa, v.loc, v.ptg, v.kend, v.tl, v.cat, tagNames(v)].join(' ').toLowerCase().indexOf(q) > -1);
    }).sort(function (a, b) { return b.date.localeCompare(a.date); });
  }
  function jbBuildSelects() {
    var yrs = {}; yrs[String(T0.getFullYear())] = 1;
    var kecs = {};
    jbp.forEach(function (v) { yrs[v.date.slice(0, 4)] = 1; if (v.kec) kecs[v.kec] = 1; });
    var yl = Object.keys(yrs).sort().reverse();
    if (ui.jy !== 'all' && !yrs[ui.jy]) ui.jy = 'all';
    $('jy').innerHTML = '<option value="all">Semua tahun</option>' + yl.map(function (y) { return '<option value="' + y + '"' + (y === ui.jy ? ' selected' : '') + '>' + y + '</option>'; }).join('');
    if (ui.jb !== 'all' && !cfg.bidang.some(function (b) { return b.id === ui.jb; })) ui.jb = 'all';
    $('jfb').innerHTML = '<option value="all">Semua bidang</option>' + opts(cfg.bidang, ui.jb);
    $('jfb').value = ui.jb;
    var kl = Object.keys(kecs).sort();
    if (ui.jk !== 'all' && !kecs[ui.jk]) ui.jk = 'all';
    $('jfk').innerHTML = '<option value="all">Semua kecamatan</option>' + kl.map(function (k) { return '<option value="' + esc(k) + '"' + (k === ui.jk ? ' selected' : '') + '>' + esc(k) + '</option>'; }).join('');
    $('dl-kec').innerHTML = kl.map(function (k) { return '<option value="' + esc(k) + '">'; }).join('');
    if (ui.jt !== 'all' && !cfg.tags.some(function (t) { return t.id === ui.jt; })) ui.jt = 'all';
    $('jft').innerHTML = '<option value="all">Semua tag</option>' + opts(cfg.tags, ui.jt);
    $('jft').value = ui.jt;
    var bsel = $('jf-b').value;
    $('jf-b').innerHTML = opts(cfg.bidang, bsel);
    if (!cfg.bidang.some(function (b) { return b.id === bsel; })) $('jf-b').value = cfg.bidang[0].id;
    var ksel = $('jf-k').value;
    $('jf-k').innerHTML = '<option value="">(tidak ditentukan)</option>' + opts(cfg.tipe.filter(function (t) { return t.kat === 'jb'; }), ksel);
    $('jf-k').value = ksel;
    var rsel = $('jf-kid').value;
    $('jf-kid').innerHTML = '<option value="">(tidak terkait)</option>' + state.acts.filter(function (a) { return a.j === 'jb'; }).map(function (a) { return '<option value="' + esc(a.id) + '">' + esc(a.name) + '</option>'; }).join('');
    $('jf-kid').value = rsel;
  }
  /* ---------- Menu, urutan, hak akses ---------- */
  var MENUS = [['dash', 'Ringkasan'], ['dpa', 'Kegiatan DPA'], ['jbl', 'Jemput Bola'], ['jb', 'Rencana jemput bola'], ['inov', 'Inovasi'], ['ikd', 'Aktivasi IKD'], ['bank', 'Bank data'], ['tag', 'Tagging'], ['ide', 'Bank ide']];
  var menuOrder = MENUS.map(function (m) { return m[0]; }), myMenu = null;
  function menuLabel(k) { for (var i = 0; i < MENUS.length; i++) if (MENUS[i][0] === k) return MENUS[i][1]; return k; }
  function normOrder(o) {
    var base = MENUS.map(function (m) { return m[0]; }), out = (Array.isArray(o) ? o : []).filter(function (k, i, a) { return base.indexOf(k) >= 0 && a.indexOf(k) === i; });
    base.forEach(function (k) { if (out.indexOf(k) < 0) out.push(k); });
    return out;
  }
  function tabAllowed(k) {
    if (k === 'set' || k === 'akun') return isAdmin();
    return isAdmin() || !myMenu || myMenu.indexOf(k) >= 0;
  }
  function firstTab() { for (var i = 0; i < menuOrder.length; i++) if (tabAllowed(menuOrder[i])) return menuOrder[i]; return 'dash'; }
  function applyTabs() {
    var nav = document.querySelector('nav.tabs'); if (!nav) return;
    menuOrder.forEach(function (k) { var b = $('tab-' + k); if (b) nav.appendChild(b); });
    nav.appendChild($('tab-akun')); nav.appendChild($('tab-set'));
    MENUS.forEach(function (m) { $('tab-' + m[0]).hidden = !tabAllowed(m[0]); });
    $('tab-akun').hidden = !isAdmin(); $('tab-set').hidden = !isAdmin();
    if (!tabAllowed(ui.tab) && ui.tab !== 'akun' && ui.tab !== 'set') setTab(firstTab());
  }

  /* ---------- Aktivasi IKD ---------- */
  function ikdSum() {
    var s = { n: ikd.length, total: 0, aktif: 0, belum: 0, lain: 0, nok: 0, nbl: 0, nlain: 0, tuntas: 0, al: {} };
    ikd.forEach(function (o) {
      s.total += o.total; s.aktif += o.aktif; s.belum += o.belum; s.lain += o.lain; s.nok += o.nok; s.nbl += o.nbl; s.nlain += o.nlain;
      if (o.total > 0 && o.belum === 0 && o.lain === 0) s.tuntas++;
      o.al.forEach(function (x) { s.al[x[0]] = (s.al[x[0]] || 0) + x[1]; });
    });
    return s;
  }
  function ikdDonut(s) {
    return donut([{ l: 'Sudah aktif', v: s.aktif, c: 'var(--ok)' }, { l: 'Belum aktif', v: s.belum, c: 'var(--crit)' }, { l: 'Tidak diketahui', v: s.lain, c: 'var(--p1)' }],
      s.total ? Math.round(s.aktif / s.total * 100) + '%' : '0%', 'sudah aktif');
  }
  function pctOf(a, t) { return t ? Math.round(a / t * 100) : 0; }
  function ikdRows() {
    var q = ($('ikd-q').value || '').trim().toLowerCase(), so = $('ikd-sort').value;
    var rows = ikd.filter(function (o) { return !q || o.opd.toLowerCase().indexOf(q) > -1; });
    rows.sort(function (a, b) {
      if (so === 'belum') return b.belum - a.belum || a.opd.localeCompare(b.opd, 'id');
      if (so === 'nama') return a.opd.localeCompare(b.opd, 'id');
      return pctOf(a.aktif, a.total) - pctOf(b.aktif, b.total) || b.belum - a.belum;
    });
    return rows;
  }
  function renderIkd() {
    $('ikd-old').hidden = !(REMOTE && !ui.srvIkd && canEdit());
    if (!$('ikd-old').hidden) { var au = String(apiUrl() || '').replace(/^https:\/\/script\.google\.com\/macros\/s\//, ''); $('ikd-old-url').textContent = '…' + au.slice(0, 6) + '…' + au.slice(-14); }
    var s = ikdSum(), nikT = s.nok + s.nbl + s.nlain, nikOpd = ikd.filter(function (o) { return o.nok + o.nbl + o.nlain > 0; });
    $('ikd-tiles').innerHTML =
      '<div class="tile"><span class="k">Pegawai terdata</span><span class="v">' + nf(s.total) + '</span><span class="s">dari ' + s.n + ' OPD</span></div>' +
      '<div class="tile"><span class="k">IKD sudah aktif</span><span class="v">' + nf(s.aktif) + '</span><span class="s">' + pctOf(s.aktif, s.total) + '% dari seluruh pegawai</span></div>' +
      '<div class="tile' + (s.belum ? ' alert' : '') + '"><span class="k">IKD belum aktif</span><span class="v">' + nf(s.belum) + '</span><span class="s">' + pctOf(s.belum, s.total) + '%' + (s.lain ? ' · ' + s.lain + ' tidak diketahui' : '') + '</span></div>' +
      '<div class="tile"><span class="k">OPD IKD tuntas</span><span class="v">' + s.tuntas + '</span><span class="s">semua pegawai sudah aktif, dari ' + s.n + ' OPD</span></div>';
    var top = ikd.filter(function (o) { return o.belum > 0; }).sort(function (a, b) { return b.belum - a.belum; }).slice(0, 8).map(function (o) { return { l: o.opd, v: o.belum, s: o.belum + ' dari ' + o.total }; });
    var al = Object.keys(s.al).sort(function (a, b) { return s.al[b] - s.al[a]; }).slice(0, 6).map(function (k) { return { l: k, v: s.al[k], s: nf(s.al[k]) }; });
    $('ikd-charts').innerHTML =
      '<div class="bars">' + card('Status aktivasi IKD', ikdDonut(s)) + '</div>' +
      '<div class="bars">' + card('OPD dengan IKD belum aktif terbanyak', barRows(top, 3)) + '</div>' +
      '<div class="bars">' + card('Alasan IKD belum aktif', barRows(al, 4)) + '</div>';
    var tuntasN = nikOpd.filter(function (o) { return o.nbl === 0 && o.nlain === 0; }).length;
    $('ma-tiles').innerHTML = !nikT ? '<div class="tile" style="grid-column:1/-1"><span class="k">Status MyASN</span><span class="s">Kolom status NIK di MyASN tidak ada pada berkas yang diunggah.</span></div>' :
      '<div class="tile"><span class="k">Pegawai dengan data MyASN</span><span class="v">' + nf(nikT) + '</span><span class="s">dari ' + nikOpd.length + ' OPD</span></div>' +
      '<div class="tile"><span class="k">NIK terverifikasi</span><span class="v">' + nf(s.nok) + '</span><span class="s">' + pctOf(s.nok, nikT) + '% dari data MyASN</span></div>' +
      '<div class="tile' + (s.nbl ? ' alert' : '') + '"><span class="k">NIK belum terverifikasi</span><span class="v">' + nf(s.nbl) + '</span><span class="s">' + pctOf(s.nbl, nikT) + '%' + (s.nlain ? ' · ' + s.nlain + ' tidak diketahui' : '') + '</span></div>' +
      '<div class="tile"><span class="k">OPD verifikasi tuntas</span><span class="v">' + tuntasN + '</span><span class="s">semua NIK terverifikasi, dari ' + nikOpd.length + ' OPD</span></div>';
    var topN = nikOpd.filter(function (o) { return o.nbl > 0; }).sort(function (a, b) { return b.nbl - a.nbl; }).slice(0, 8).map(function (o) { return { l: o.opd, v: o.nbl, s: o.nbl + ' dari ' + (o.nok + o.nbl + o.nlain) }; });
    $('ma-charts').innerHTML = nikT ?
      '<div class="bars">' + card('Status verifikasi NIK di MyASN', maDonut(s)) + '</div><div class="bars">' + card('OPD dengan NIK belum terverifikasi terbanyak', barRows(topN, 1)) + '</div>' : '';
    var rows = ikdRows();
    if (!ikd.length) { $('ikd-table').innerHTML = '<div class="empty" style="border:0">Belum ada data. Klik "Unggah Excel" lalu pilih berkas rekap IKD per OPD.</div>'; return; }
    if (!rows.length) { $('ikd-table').innerHTML = '<div class="empty" style="border:0">Tidak ada OPD yang cocok.</div>'; return; }
    var canDel = canEdit() && !ui.offline, canSee = !!auth && !ui.offline;
    $('ikd-table').innerHTML = '<table class="bank ikt"><thead><tr><th>OPD</th><th class="num">Pegawai</th><th class="num">IKD sudah aktif</th><th class="num">IKD belum aktif</th><th>% IKD aktif</th><th class="num">MyASN terverifikasi</th><th class="num">MyASN belum</th><th>% MyASN</th><th>Data per</th><th></th></tr></thead><tbody>' +
      rows.map(function (o) {
        var p = pctOf(o.aktif, o.total), pb = pctOf(o.belum, o.total), pl = Math.max(0, 100 - p - pb), nt = o.nok + o.nbl + o.nlain;
        var q = pctOf(o.nok, nt), qb = pctOf(o.nbl, nt), ql = Math.max(0, 100 - q - qb), act = '';
        if (canSee) act += '<button class="btn ghost small" type="button" data-act="ikd-peg" data-id="' + esc(o.id) + '">Lihat pegawai</button> ';
        if (canDel) act += ui.ikdel === o.id
          ? '<button class="btn danger small" type="button" data-act="ikd-del-yes" data-id="' + esc(o.id) + '">Ya, hapus</button> <button class="btn ghost small" type="button" data-act="ikd-del-no">Batal</button>'
          : '<button class="btn ghost small" type="button" data-act="ikd-del" data-id="' + esc(o.id) + '">Hapus</button>';
        return '<tr><td><strong>' + esc(o.opd) + '</strong></td><td class="num">' + nf(o.total) + '</td><td class="num">' + nf(o.aktif) + '</td><td class="num">' + nf(o.belum) + (o.lain ? ' <span class="note">(+' + o.lain + ' tak jelas)</span>' : '') + '</td>' +
          '<td><div class="stk" title="' + p + '% aktif"><i style="width:' + p + '%;background:var(--ok)"></i><i style="width:' + pb + '%;background:var(--crit)"></i><i style="width:' + pl + '%;background:var(--p1)"></i></div><span class="mono">' + p + '%</span></td>' +
          (nt ? '<td class="num">' + nf(o.nok) + '</td><td class="num">' + nf(o.nbl) + (o.nlain ? ' <span class="note">(+' + o.nlain + ' tak jelas)</span>' : '') + '</td>' +
            '<td><div class="stk" title="' + q + '% terverifikasi"><i style="width:' + q + '%;background:var(--ok)"></i><i style="width:' + qb + '%;background:var(--crit)"></i><i style="width:' + ql + '%;background:var(--p1)"></i></div><span class="mono">' + q + '%</span></td>'
            : '<td class="num">-</td><td class="num">-</td><td>-</td>') +
          '<td>' + esc(o.tgl) + '</td><td>' + act + '</td></tr>';
      }).join('') + '</tbody></table>' + (canSee ? '' : '<p class="note" style="margin:10px 14px">Masuk untuk melihat nama dan NIP pegawai.</p>');
  }
  function maDonut(s) {
    var t = s.nok + s.nbl + s.nlain;
    return donut([{ l: 'Terverifikasi', v: s.nok, c: 'var(--ok)' }, { l: 'Belum terverifikasi', v: s.nbl, c: 'var(--crit)' }, { l: 'Tidak diketahui', v: s.nlain, c: 'var(--p1)' }], pctOf(s.nok, t) + '%', 'terverifikasi');
  }
  /* daftar pegawai (hanya untuk pengguna yang sudah masuk; diambil dari server tiap dibuka, tidak disimpan di perangkat) */
  function pill(v, kind) {
    var m = kind === 'i' ? { A: ['ok', 'Sudah aktif'], B: ['no', 'Belum aktif'] } : { V: ['ok', 'Terverifikasi'], B: ['no', 'Belum terverifikasi'] };
    var x = m[v] || ['na', '-'];
    return '<span class="pill ' + x[0] + '">' + x[1] + '</span>';
  }
  function ikdmEditable() { return canEdit() && !ui.offline; }
  function ikdmDirty() { var m = ui.ikdm; return !!(m && m.rows && JSON.stringify(m.rows) !== m.snap); }
  function ikdmRows() {
    var m = ui.ikdm, q = $('ikm-q').value.trim().toLowerCase(), fi = $('ikm-fi').value, fn = $('ikm-fn').value, out = [];
    m.rows.forEach(function (r, i) {
      if ((!q || r[1].toLowerCase().indexOf(q) > -1 || r[0].indexOf(q) > -1) && (fi === 'all' || r[2] === fi) && (fn === 'all' || (fn === '?' ? (r[3] !== 'V' && r[3] !== 'B') : r[3] === fn))) out.push({ r: r, i: i });
    });
    return out;
  }
  function aggRows(rows) {
    var g = { total: rows.length, aktif: 0, belum: 0, lain: 0, nok: 0, nbl: 0, nlain: 0 }, al = {};
    rows.forEach(function (x) {
      if (x[2] === 'A') g.aktif++; else if (x[2] === 'B') g.belum++; else g.lain++;
      if (x[3] === 'V') g.nok++; else if (x[3] === 'B') g.nbl++; else if (x[3] !== '') g.nlain++;
      if (x[2] === 'B' && x[4]) { var k = nrm(x[4]).slice(0, 90); if (k && k !== '-') al[k] = (al[k] || 0) + 1; }
    });
    g.al = Object.keys(al).sort(function (a, b) { return al[b] - al[a]; }).slice(0, 8).map(function (k) { return [k, al[k]]; });
    return g;
  }
  function ikdmMeta() {
    var m = ui.ikdm; if (!m || !m.rows) return;
    var c = { A: 0, B: 0, V: 0, N: 0 };
    m.rows.forEach(function (r) { if (r[2] === 'A') c.A++; else if (r[2] === 'B') c.B++; if (r[3] === 'V') c.V++; else if (r[3] === 'B') c.N++; });
    $('ikm-sum').innerHTML = '<span><strong>IKD:</strong> ' + c.A + ' sudah aktif · ' + c.B + ' belum aktif</span><span><strong>MyASN:</strong> ' + c.V + ' terverifikasi · ' + c.N + ' belum terverifikasi</span><span><strong>Total:</strong> ' + m.rows.length + ' pegawai</span>';
    var ed = ikdmEditable(), d = ikdmDirty();
    $('ikm-add').hidden = !ed; $('ikm-saverow').hidden = !(ed && d);
    $('ikm-dirty').textContent = m.warn ? 'Perubahan belum disimpan. Simpan dulu, atau klik Tutup sekali lagi untuk membuangnya.' : 'Ada perubahan yang belum disimpan.';
  }
  function selHtml(i, f, v, opts, label) {
    return '<select class="ikm-sel" data-i="' + i + '" data-f="' + f + '" aria-label="' + label + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === v ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>';
  }
  var OPT_I = [['A', 'Sudah aktif'], ['B', 'Belum aktif'], ['?', 'Tidak diketahui']];
  var OPT_N = [['V', 'Terverifikasi'], ['B', 'Belum terverifikasi'], ['?', 'Tidak diketahui'], ['', 'Tidak ada data']];
  function renderIkdm() {
    var m = ui.ikdm; if (!m) return;
    if (m.err) { $('ikm-sum').textContent = ''; $('ikm-add').hidden = true; $('ikm-saverow').hidden = true; $('ikm-table').innerHTML = '<div class="empty" style="border:0">' + esc(m.err) + '</div>'; return; }
    if (!m.rows) { $('ikm-sum').textContent = ''; $('ikm-add').hidden = true; $('ikm-saverow').hidden = true; $('ikm-table').innerHTML = '<div class="empty" style="border:0">Memuat…</div>'; return; }
    ikdmMeta();
    var ed = ikdmEditable();
    if (!m.rows.length) { $('ikm-table').innerHTML = '<div class="empty" style="border:0">Daftar pegawai OPD ini belum tersimpan. Unggah ulang berkas Excel OPD ini untuk menyimpannya' + (ed ? ', atau tambahkan pegawai di atas.' : '.') + '</div>'; return; }
    var list = ikdmRows(), shown = list.slice(0, 500);
    $('ikm-table').innerHTML = '<table class="bank ikt"><thead><tr><th>No</th><th>Nama</th><th>NIP/NIPPPK</th><th>Status IKD</th><th>Status NIK di MyASN</th><th>Keterangan</th>' + (ed ? '<th></th>' : '') + '</tr></thead><tbody>' +
      shown.map(function (x, n) {
        var r = x.r, i = x.i;
        return '<tr><td>' + (n + 1) + '</td><td>' + esc(r[1]) + '</td><td class="mono">' + esc(r[0]) + '</td>' +
          '<td>' + (ed ? selHtml(i, 2, r[2], OPT_I, 'Status IKD ' + esc(r[1])) : pill(r[2], 'i')) + '</td>' +
          '<td>' + (ed ? selHtml(i, 3, r[3], OPT_N, 'Status MyASN ' + esc(r[1])) : pill(r[3], 'n')) + '</td>' +
          '<td>' + (ed ? '<input type="text" class="ikm-ket" data-i="' + i + '" maxlength="160" value="' + esc(r[4]) + '" aria-label="Keterangan ' + esc(r[1]) + '">' : esc(r[4])) + '</td>' +
          (ed ? '<td><button class="btn ghost small" type="button" data-act="ikm-del" data-i="' + i + '" aria-label="Hapus ' + esc(r[1]) + '">Hapus</button></td>' : '') + '</tr>';
      }).join('') + '</tbody></table>' +
      '<p class="note" style="margin:10px 14px">' + (list.length > shown.length ? 'Menampilkan 500 dari ' + list.length + ' pegawai. Persempit dengan pencarian atau saringan. ' : list.length + ' pegawai. ') + '</p>';
    if (!list.length) $('ikm-table').innerHTML = '<div class="empty" style="border:0">Tidak ada pegawai yang cocok.</div>';
  }
  function openIkdm(id) {
    var o = ikd.filter(function (v) { return v.id === id; })[0]; if (!o || !auth) return;
    ui.ikdm = { id: id, opd: o.opd, rows: null, err: '', snap: '', warn: false };
    $('ikm-t').textContent = o.opd; $('ikm-s').textContent = ikdmEditable() ? 'Daftar nama dan NIP. Ubah status atau keterangan, lalu klik "Simpan perubahan".' : 'Daftar nama dan NIP. Hanya terlihat setelah masuk.';
    $('ikm-q').value = ''; $('ikm-fi').value = 'all'; $('ikm-fn').value = 'all';
    $('ikd-modal').hidden = false; document.body.classList.add('noscroll'); renderIkdm();
    api({ action: 'ikdpeg', id: id }).then(function (j) {
      if (ui.ikdm && ui.ikdm.id === id) { ui.ikdm.rows = (j.p || []).map(function (r) { return [str(r[0], 30), str(r[1], 160), str(r[2], 1), str(r[3], 1), str(r[4], 160)]; }); ui.ikdm.snap = JSON.stringify(ui.ikdm.rows); renderIkdm(); }
    }).catch(function (e) {
      if (!(ui.ikdm && ui.ikdm.id === id)) return;
      var em = e && e.message || '';
      ui.ikdm.err = /aksi tidak dikenal/.test(em) ? 'Apps Script Anda belum versi terbaru (belum mengenal daftar pegawai). Tempel Code.gs terbaru ke Apps Script, lalu Deploy > Kelola deployment > Edit > Versi baru > Deploy. Setelah itu unggah ulang berkas Excel OPD ini.'
        : em === 'offline' ? 'Anda sedang offline. Sambungkan internet lalu buka lagi.'
        : em === 'forbidden' ? 'Akun Anda tidak punya akses ke menu Aktivasi IKD.'
        : em === 'Failed to fetch' ? 'Tidak bisa menghubungi Google Apps Script. Periksa koneksi, atau pastikan akses Web App diatur ke "Siapa saja" dan URL di config.js benar.'
        : 'Daftar pegawai tidak bisa dimuat (' + em + ').';
      renderIkdm();
    });
  }
  function closeIkdm(force) {
    var m = ui.ikdm;
    if (m && !force && ikdmDirty() && !m.warn) { m.warn = true; ikdmMeta(); return; }
    ui.ikdm = null; $('ikd-modal').hidden = true;
    document.body.classList.toggle('noscroll', !$('login-modal').hidden || !$('acct-modal').hidden || !$('jb-modal').hidden);
  }
  function ikdmSave() {
    var m = ui.ikdm; if (!m || !m.rows || !ikdmDirty() || !ikdmEditable()) return;
    if (!m.rows.length) { toast('Daftar tidak boleh kosong. Untuk membuang satu OPD, pakai tombol Hapus di tabel OPD.'); return; }
    if (m.rows.length > 3000) { toast('Maksimal 3000 pegawai per OPD'); return; }
    var g = aggRows(m.rows), o = normIkd({ id: m.id, opd: m.opd, tgl: iso(0), total: g.total, aktif: g.aktif, belum: g.belum, lain: g.lain, nok: g.nok, nbl: g.nbl, nlain: g.nlain, al: g.al });
    var snap = JSON.stringify(m.rows);
    toast('Menyimpan perubahan…');
    pushIkd(Object.assign({}, o, { p: m.rows })).then(function () {
      ikd = ikd.filter(function (v) { return v.id !== o.id; }); ikd.push(o); saveIkd();
      if (ui.ikdm && ui.ikdm.id === m.id) { ui.ikdm.snap = snap; ui.ikdm.warn = false; }
      renderAll(); if (ui.ikdm) renderIkdm();
      toast('Perubahan disimpan');
    }, function (e) { toast('Gagal menyimpan: ' + (e.message || 'galat')); });
  }
  function ikdmCsv() {
    var m = ui.ikdm; if (!m || !m.rows) return;
    var L = { A: 'Sudah aktif', B: 'Belum aktif' }, N = { V: 'Terverifikasi', B: 'Belum terverifikasi' };
    var lines = [['No', 'Nama', 'NIP/NIPPPK', 'Status IKD', 'Status NIK di MyASN', 'Keterangan'].map(csvCell).join(',')];
    ikdmRows().forEach(function (x, n) {
      var r = x.r;
      lines.push([csvCell(n + 1), csvCell(r[1]), /^\d{8,30}$/.test(r[0]) ? '="' + r[0] + '"' : csvCell(r[0]), csvCell(L[r[2]] || '-'), csvCell(N[r[3]] || '-'), csvCell(r[4])].join(','));
    });
    saveCsv(lines.join('\r\n'), 'pegawai-ikd-' + m.id + '-' + iso(0) + '.csv');
  }
  function ikdCsvText() {
    var lines = [['OPD', 'Pegawai', 'Sudah aktif', 'Belum aktif', 'Tidak diketahui', '% aktif', 'NIK terverifikasi', 'NIK belum terverifikasi', 'Data per']];
    ikdRows().forEach(function (o) { lines.push([o.opd, o.total, o.aktif, o.belum, o.lain, pctOf(o.aktif, o.total), o.nok, o.nbl, o.tgl]); });
    return lines.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n');
  }

  /* pembaca berkas: .xlsx dibaca langsung di browser (tanpa pustaka luar), .csv juga didukung */
  function u16(d, o) { return d[o] | d[o + 1] << 8; }
  function u32(d, o) { return (d[o] | d[o + 1] << 8 | d[o + 2] << 16 | d[o + 3] << 24) >>> 0; }
  function unzip(buf) {
    var d = new Uint8Array(buf), e = -1, i;
    for (i = d.length - 22; i >= Math.max(0, d.length - 65557); i--) if (u32(d, i) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error('Bukan berkas .xlsx yang valid');
    var n = u16(d, e + 10), off = u32(d, e + 16), files = {}, dec = new TextDecoder();
    for (var k = 0; k < n; k++) {
      if (u32(d, off) !== 0x02014b50) break;
      var nl = u16(d, off + 28), el = u16(d, off + 30), cl = u16(d, off + 32);
      files[dec.decode(d.subarray(off + 46, off + 46 + nl))] = { m: u16(d, off + 10), c: u32(d, off + 20), lo: u32(d, off + 42) };
      off += 46 + nl + el + cl;
    }
    return { d: d, f: files };
  }
  function zipText(z, name) {
    var f = z.f[name];
    if (!f) return Promise.resolve(null);
    var d = z.d, lo = f.lo, s = lo + 30 + u16(d, lo + 26) + u16(d, lo + 28), raw = d.subarray(s, s + f.c);
    if (f.m === 0) return Promise.resolve(new TextDecoder().decode(raw));
    if (typeof DecompressionStream === 'undefined') return Promise.reject(new Error('Browser ini belum bisa membaca .xlsx. Simpan berkas sebagai CSV lalu unggah lagi.'));
    return new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer().then(function (b) { return new TextDecoder().decode(b); });
  }
  function siText(si) {
    var s = '';
    for (var c = si.firstChild; c; c = c.nextSibling) {
      if (c.nodeType !== 1) continue;
      if (c.localName === 't') s += c.textContent;
      else if (c.localName === 'r') { var t = c.getElementsByTagName('t'); for (var q = 0; q < t.length; q++) s += t[q].textContent; }
    }
    return s;
  }
  function colIdx(ref) { var m = /^([A-Z]+)/.exec(ref || ''), n = 0; if (!m) return 0; for (var i = 0; i < m[1].length; i++) n = n * 26 + m[1].charCodeAt(i) - 64; return n - 1; }
  function readXlsx(buf) {
    var z = unzip(buf), P = new DOMParser();
    return Promise.all([zipText(z, 'xl/workbook.xml'), zipText(z, 'xl/_rels/workbook.xml.rels'), zipText(z, 'xl/sharedStrings.xml')]).then(function (r) {
      if (!r[0]) throw new Error('Isi berkas .xlsx tidak dikenali');
      var wb = P.parseFromString(r[0], 'application/xml'), sh = wb.getElementsByTagName('sheet')[0], path = 'xl/worksheets/sheet1.xml';
      if (sh && r[1]) {
        var rid = ''; for (var a = 0; a < sh.attributes.length; a++) if (/(^|:)id$/.test(sh.attributes[a].name) && sh.attributes[a].name !== 'sheetId') rid = sh.attributes[a].value;
        var rl = P.parseFromString(r[1], 'application/xml').getElementsByTagName('Relationship');
        for (var q = 0; q < rl.length; q++) if (rl[q].getAttribute('Id') === rid) { var tg = rl[q].getAttribute('Target'); path = tg.charAt(0) === '/' ? tg.slice(1) : 'xl/' + tg; }
      }
      var ss = [];
      if (r[2]) { var sis = P.parseFromString(r[2], 'application/xml').getElementsByTagName('si'); for (var i = 0; i < sis.length; i++) ss.push(siText(sis[i])); }
      return zipText(z, path).then(function (x) {
        if (!x) throw new Error('Lembar kerja pertama tidak ditemukan');
        var rows = [], rs = P.parseFromString(x, 'application/xml').getElementsByTagName('row');
        for (var i = 0; i < rs.length && i < 6000; i++) {
          var cs = rs[i].getElementsByTagName('c'), line = [], rn = parseInt(rs[i].getAttribute('r'), 10);
          for (var k = 0; k < cs.length; k++) {
            var c = cs[k], t = c.getAttribute('t'), vEl = c.getElementsByTagName('v')[0], v = vEl ? vEl.textContent : '';
            if (t === 's') v = ss[+v] || ''; else if (t === 'inlineStr') { var is = c.getElementsByTagName('is')[0]; v = is ? siText(is) : ''; }
            line[colIdx(c.getAttribute('r'))] = v;
          }
          if (rn) rows[rn - 1] = line; else rows.push(line);
        }
        for (var j = 0; j < rows.length; j++) if (!rows[j]) rows[j] = [];
        return rows;
      });
    });
  }
  function readCsv(text) {
    text = text.replace(/^﻿/, '');
    var first = text.split(/\r?\n/)[0] || '', del = [';', '\t', ','].sort(function (a, b) { return first.split(b).length - first.split(a).length; })[0];
    var rows = [], row = [], cur = '', q = false;
    for (var i = 0; i < text.length && rows.length < 6000; i++) {
      var ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true;
      else if (ch === del) { row.push(cur); cur = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += ch;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }
  function nrm(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().toUpperCase(); }
  var GENERIC = /^(REKAP|DATA|FILE|EXCEL|AKTIVASI|IDENTITAS|KEPENDUDUKAN|DIGITAL|IKD|ASN|PNS|PPPK|NIPPPK|DAN|DI|YANG|TELAH|SUDAH|TERVERIFIKASI|VERIFIKASI|NIK|NIP|MYASN|MY|DENGAN|PEGAWAI|TAHUN|JAN\w*|FEB\w*|MAR\w*|APR\w*|MEI|JUN\w*|JUL\w*|AGU\w*|SEP\w*|OKT\w*|NOV\w*|DES\w*|\d+)$/i;
  function opdFromFile(fn) {
    var s = String(fn || '').replace(/^[0-9a-f]{8}-(?=[A-Za-z])/, '').replace(/\.[a-z0-9]+$/i, '').split(/\s+-\s+|_-_/)[0].replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim(), tk = s.split(' ');
    while (tk.length > 1 && GENERIC.test(tk[0])) tk.shift();
    while (tk.length > 1 && GENERIC.test(tk[tk.length - 1])) tk.pop();
    return tk.join(' ');
  }
  function nipText(v) {
    var s = String(v == null ? '' : v).replace(/\s+/g, '');
    if (/^[\d.,]+E\+?\d+$/i.test(s)) { var n = Number(s.replace(',', '.')); if (isFinite(n)) s = n.toLocaleString('fullwide', { useGrouping: false }); }
    return s.slice(0, 30);
  }
  function analyzeIkd(rows, fname) {
    var hi = -1, i, j;
    for (i = 0; i < Math.min(rows.length, 30) && hi < 0; i++) {
      var cells = (rows[i] || []).map(nrm);
      if (cells.some(function (c) { return /^NIP/.test(c); }) && cells.some(function (c) { return /IKD|STATUS/.test(c); })) hi = i;
    }
    if (hi < 0) throw new Error('Baris judul kolom tidak ditemukan. Pastikan ada kolom NAMA, NIP/NIPPPK, dan STATUS IKD.');
    var H = (rows[hi] || []).map(nrm), ci = -1, cn = -1, ck = -1, cm = -1, cp = -1;
    H.forEach(function (h, k) {
      if (ci < 0 && /IKD/.test(h)) ci = k;
      else if (cn < 0 && /NIK|MY ?ASN/.test(h)) cn = k;
      else if (ck < 0 && /KETERANGAN|ALASAN/.test(h)) ck = k;
      if (cm < 0 && /^NAMA/.test(h)) cm = k;
      if (cp < 0 && /^NIP/.test(h)) cp = k;
    });
    if (ci < 0) throw new Error('Kolom status IKD tidak ditemukan.');
    var opd = '';
    for (i = 0; i < hi && !opd; i++) for (j = 0; j < (rows[i] || []).length && !opd; j++) {
      var t = nrm(rows[i][j]);
      if (t.length > 4 && /DINAS|BADAN|BIRO|SEKRETARIAT|KANTOR|BAGIAN|INSPEKTORAT|SATUAN|KECAMATAN|KELURAHAN|\bUPT|RSUD|RUMAH SAKIT|SEKOLAH|SMA|SMK/.test(t) && !/DATA|VERIFIKASI|AKTIVASI|REKAP|PROVINSI|PEMERINTAH/.test(t)) opd = String(rows[i][j]).replace(/\s+/g, ' ').trim();
    }
    if (!opd) opd = opdFromFile(fname);
    var r = { p: [], opd: str(opd, 120), total: 0, aktif: 0, belum: 0, lain: 0, nok: 0, nbl: 0, nlain: 0, al: {}, hasNik: cn >= 0 };
    for (i = hi + 1; i < rows.length; i++) {
      var ro = rows[i] || [], nm = nrm(cm >= 0 ? ro[cm] : ro[1]);
      if (!nm || /^\d+$/.test(nm) || /^(JUMLAH|TOTAL)\b/.test(nm)) continue;
      r.total++;
      var st = nrm(ro[ci]), cs, ns = '';
      if (/BELUM|TIDAK/.test(st)) { r.belum++; cs = 'B'; } else if (/SUDAH|AKTIF|^YA$/.test(st)) { r.aktif++; cs = 'A'; } else { r.lain++; cs = '?'; }
      if (cn >= 0) { var nk = nrm(ro[cn]); if (/BELUM|TIDAK/.test(nk)) { r.nbl++; ns = 'B'; } else if (/VERIFIKASI|SUDAH|VALID/.test(nk)) { r.nok++; ns = 'V'; } else { r.nlain++; ns = '?'; } }
      var kt = ck >= 0 ? String(ro[ck] == null ? '' : ro[ck]).replace(/\s+/g, ' ').trim() : '';
      r.p.push([nipText(ro[cp >= 0 ? cp : 2]), String(cm >= 0 ? ro[cm] : ro[1]).replace(/\s+/g, ' ').trim().slice(0, 160), cs, ns, kt === '-' ? '' : kt.slice(0, 160)]);
      if (ck >= 0 && /BELUM|TIDAK/.test(st)) { var al = nrm(ro[ck]); if (al && al !== '-') { al = al.slice(0, 90); r.al[al] = (r.al[al] || 0) + 1; } }
    }
    if (!r.total) throw new Error('Tidak ada baris pegawai yang terbaca.');
    r.nipCut = r.p.filter(function (x) { return /^\d{18}$/.test(x[0]) && /000$/.test(x[0]); }).length > r.total * 0.25;
    r.al = Object.keys(r.al).sort(function (a, b) { return r.al[b] - r.al[a]; }).slice(0, 8).map(function (k) { return [k, r.al[k]]; });
    return r;
  }
  function ikdPrev() {
    $('ikd-import').hidden = !ui.ikdq.length;
    $('ikd-prev').innerHTML = ui.ikdq.map(function (x, i) {
      if (x.err) return '<div class="ikdrow err"><div><strong>' + esc(x.name) + '</strong></div><div>' + esc(x.err) + '</div></div>';
      var r = x.r;
      return '<div class="ikdrow"><div><label class="f" for="ikd-n' + i + '">Nama OPD<input type="text" id="ikd-n' + i + '" class="ikd-opd" data-i="' + i + '" maxlength="120" value="' + esc(x.opd) + '"></label><div class="fn">' + esc(x.name) + '</div></div>' +
        '<div><strong>' + nf(r.total) + '</strong> pegawai · <strong>' + nf(r.aktif) + '</strong> sudah aktif · <strong>' + nf(r.belum) + '</strong> belum aktif' + (r.lain ? ' · ' + r.lain + ' tidak diketahui' : '') +
        (r.hasNik ? '<br><span class="note">NIK terverifikasi ' + nf(r.nok) + ', belum ' + nf(r.nbl) + '</span>' : '<br><span class="note">Kolom status NIK/MyASN tidak ditemukan.</span>') + (r.nipCut ? '<br><span class="note" style="color:var(--warn)">Banyak NIP berakhiran 000. Kemungkinan NIP terpotong oleh Excel (kolom berformat angka). Perbaiki dengan format Teks di berkas asal.</span>' : '') + (ui.ikdq.filter(function (y) { return !y.err && y.opd.trim().toLowerCase() === x.opd.trim().toLowerCase(); }).length > 1 ? '<br><span class="note" style="color:var(--warn)">Nama OPD sama dengan berkas lain di daftar ini; hanya yang terakhir yang disimpan.</span>' : '') + (ikd.some(function (o) { return o.id === ikdId(x.opd); }) ? '<br><span class="note">OPD ini sudah ada; datanya akan diperbarui.</span>' : '') + '</div></div>';
    }).join('');
  }
  function ikdId(opd) { return 'o-' + String(opd).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60); }
  function ikdFiles(files) {
    ui.ikdq = [];
    var list = Array.prototype.slice.call(files, 0, 60);
    list.reduce(function (p, f) {
      return p.then(function () {
        var item = { name: f.name };
        if (f.size > 12 * 1024 * 1024) { item.err = 'Berkas terlalu besar (maksimal 12 MB).'; ui.ikdq.push(item); return; }
        var rd = /\.csv$/i.test(f.name) ? f.text().then(readCsv) : f.arrayBuffer().then(readXlsx);
        return rd.then(function (rows) { item.r = analyzeIkd(rows, f.name); item.opd = item.r.opd; }).catch(function (e) { item.err = e.message || 'Berkas tidak bisa dibaca.'; }).then(function () { ui.ikdq.push(item); });
      });
    }, Promise.resolve()).then(ikdPrev);
  }
  function pushIkd(o) {
    if (!REMOTE) return Promise.resolve();
    failed = false; inflight++; refreshSync();
    var once = function () { return api({ action: 'upsertikd', item: o }); };
    return once().catch(function (e) { if (QUIET.indexOf(e.message) >= 0 || e.message === 'offline') throw e; return new Promise(function (r) { setTimeout(r, 1500); }).then(once); })
      .then(function () { inflight--; refreshSync(); }, function (e) { inflight--; refreshSync(); throw e; });
  }
  function ikdSave() {
    var items = ui.ikdq.filter(function (x) { return !x.err && x.opd.trim(); }), done = 0, bad = [];
    if (!items.length) { toast('Tidak ada data yang disimpan'); return; }
    ui.ikdq = []; ikdPrev();
    var chain = Promise.resolve();
    items.forEach(function (x, idx) {
      chain = chain.then(function () {
        var o = normIkd({ id: ikdId(x.opd), opd: x.opd.trim(), tgl: iso(0), total: x.r.total, aktif: x.r.aktif, belum: x.r.belum, lain: x.r.lain, nok: x.r.nok, nbl: x.r.nbl, nlain: x.r.nlain, al: x.r.al });
        ikd = ikd.filter(function (v) { return v.id !== o.id; }); ikd.push(o); saveIkd(); renderAll();
        if (items.length > 1) toast('Menyimpan ' + (idx + 1) + ' dari ' + items.length + ': ' + o.opd);
        return pushIkd(Object.assign({}, o, { p: x.r.p })).then(function () { done++; }, function (e) { bad.push(o.opd + ' (' + (e.message || 'gagal') + ')'); });
      });
    });
    chain.then(function () {
      renderAll();
      toast(bad.length ? done + ' OPD tersimpan, gagal: ' + bad.join('; ') : done + ' OPD tersimpan');
    });
  }

  var PAL = ['--p2', '--p7', '--p3', '--p4', '--p5', '--p6', '--p8', '--p1'];
  function pc(i) { return 'var(' + PAL[i % PAL.length] + ')'; }
  function donut(items, centre, sub) {
    var tot = items.reduce(function (s, x) { return s + x.v; }, 0);
    if (!tot) return '<p class="note" style="margin:0">Belum ada data.</p>';
    var C = 2 * Math.PI * 52, off = 0, segs = '', leg = '';
    items.forEach(function (x) {
      if (!x.v) return;
      var len = x.v / tot * C;
      segs += '<circle cx="70" cy="70" r="52" fill="none" stroke-width="22" style="stroke:' + x.c + '" stroke-dasharray="' + len.toFixed(2) + ' ' + (C - len).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" transform="rotate(-90 70 70)"><title>' + esc(x.l) + ': ' + x.v + '</title></circle>';
      off += len;
    });
    items.forEach(function (x) { leg += '<li><i style="background:' + x.c + '"></i><span>' + esc(x.l) + '</span><b>' + nf(x.v) + ' · ' + Math.round(x.v / tot * 100) + '%</b></li>'; });
    return '<div class="donut"><svg viewBox="0 0 140 140" role="img" aria-label="Diagram lingkaran, total ' + centre + '"><circle cx="70" cy="70" r="52" fill="none" stroke-width="22" style="stroke:var(--surface-2)"/>' + segs +
      '<text x="70" y="72" text-anchor="middle" class="dn-v">' + esc(String(centre)) + '</text><text x="70" y="90" text-anchor="middle" class="dn-s">' + esc(sub || '') + '</text></svg><ul class="legend">' + leg + '</ul></div>';
  }
  function columns(items, ci) {
    var mx = items.reduce(function (m, x) { return Math.max(m, x.v); }, 0);
    if (!items.length || !mx) return '<p class="note" style="margin:0">Belum ada data.</p>';
    var W = 320, Ht = 170, L = 8, R = 8, T = 18, B = 24, n = items.length, slot = (W - L - R) / n, bw = Math.min(30, slot * 0.62), ph = Ht - T - B, g = '', b = '';
    [0.5, 1].forEach(function (f) { var y = T + ph - ph * f; g += '<line class="gl" x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '" stroke-dasharray="3 4"/>'; });
    g += '<line class="gl" x1="' + L + '" x2="' + (W - R) + '" y1="' + (T + ph) + '" y2="' + (T + ph) + '"/>';
    items.forEach(function (x, k) {
      var h = Math.max(x.v ? 3 : 0, x.v / mx * ph), cx = L + slot * k + slot / 2, y = T + ph - h;
      b += '<rect x="' + (cx - bw / 2).toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="6" style="fill:' + pc(ci || 0) + '"><title>' + esc(x.l) + ': ' + esc(x.s || String(x.v)) + '</title></rect>';
      if (x.v && n <= 12) b += '<text class="vl" x="' + cx.toFixed(1) + '" y="' + (y - 4).toFixed(1) + '" text-anchor="middle">' + nf(x.v) + '</text>';
      if (n <= 7 || k % 2 === 0) b += '<text class="ax" x="' + cx.toFixed(1) + '" y="' + (Ht - 7) + '" text-anchor="middle">' + esc(x.l) + '</text>';
    });
    return '<svg class="cols" viewBox="0 0 ' + W + ' ' + Ht + '" role="img" aria-label="Diagram batang">' + g + b + '</svg>';
  }
  function monthItems(list, valFn) {
    var m = {};
    list.forEach(function (a) { var k = String(a.date).slice(0, 7); if (/^\d{4}-\d{2}$/.test(k)) m[k] = (m[k] || 0) + valFn(a); });
    return Object.keys(m).sort().slice(-12).map(function (k) {
      var d = new Date(+k.slice(0, 4), +k.slice(5, 7) - 1, 1);
      return { l: d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }), v: m[k], s: nf(m[k]) };
    });
  }
  function card(h, body) { return '<h2>' + h + '</h2>' + body; }
  function barRows(items, color) {
    var mx = items.reduce(function (m, x) { return Math.max(m, x.v); }, 0);
    if (!items.length || !mx) return '<p class="note" style="margin:0">Belum ada data.</p>';
    return items.map(function (x) {
      return '<div class="brow" style="--c:' + cv(color) + '"><div class="l"><span>' + esc(x.l) + '</span><span class="mono">' + esc(x.s) + '</span></div><div class="track"><i style="width:' + Math.round(x.v / mx * 100) + '%"></i></div></div>';
    }).join('');
  }
  function jbMetaHtml(v) {
    var bd = BD(v.b), rc = v.kid ? findAct(v.kid) : null;
    var wil = [v.desa, v.kec].filter(Boolean).join(', ');
    return '<span class="b" style="--c:' + cv(bd.c) + '"><i class="dot"></i>' + esc(bd.n) + '</span><span class="mono">' + fmtDate(v.date) + '</span>' + (wil ? '<span>' + esc(wil) + '</span>' : '') +
      '<span>' + nf(v.ter) + (v.sas ? ' / ' + nf(v.sas) : '') + ' warga</span>' + (rc ? '<span>Rencana: ' + esc(rc.name) + '</span>' : '');
  }
  function jfi(v, k, label, type, full) {
    var id = 'jr-' + v.id + '-' + k, val = v[k] == null ? '' : v[k], h;
    var at = ' id="' + id + '" data-act="jfld" data-id="' + v.id + '" data-k="' + k + '"';
    if (k === 'b') h = '<select' + at + '>' + opts(cfg.bidang, v.b) + '</select>';
    else if (k === 'k') h = '<select' + at + '><option value="">(tidak ditentukan)</option>' + opts(cfg.tipe.filter(function (t) { return t.kat === 'jb'; }), v.k) + '</select>';
    else if (k === 'kid') h = '<select' + at + '><option value="">(tidak terkait)</option>' + state.acts.filter(function (a) { return a.j === 'jb'; }).map(function (a) { return '<option value="' + esc(a.id) + '"' + (a.id === v.kid ? ' selected' : '') + '>' + esc(a.name) + '</option>'; }).join('') + '</select>';
    else if (type === 'date') h = '<input type="date"' + at + ' value="' + esc(val) + '">';
    else if (type === 'num') h = '<input type="number" min="0" inputmode="numeric"' + at + ' value="' + esc(val) + '">';
    else if (type === 'area') h = '<textarea rows="2" maxlength="600"' + at + '>' + esc(val) + '</textarea>';
    else h = '<input type="text" maxlength="200"' + (k === 'kec' ? ' list="dl-kec"' : '') + at + ' value="' + esc(val) + '">';
    return '<label class="f' + (full ? ' full' : '') + '" for="' + id + '">' + label + h + '</label>';
  }
  function thumbSrc(v, f, w) {
    if (f.k !== 'foto' || !f.i) return '';
    if (v.cov && f.i === v.covi) return v.cov;
    return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(f.i) + '&sz=w' + w;
  }
  function coverSrc(v) {
    if (v.cov) return v.cov;
    for (var i = 0; i < v.files.length; i++) { var u = thumbSrc(v, v.files[i], 640); if (u) return u; }
    return '';
  }
  function coverHtml(v, cls) {
    var src = coverSrc(v);
    return src ? '<img class="jbcov" loading="lazy" referrerpolicy="no-referrer" alt="" src="' + esc(src) + '">' : '<div class="ph" style="--c:' + cv(BD(v.b).c) + '"><b>' + esc((BD(v.b).n || '?').charAt(0)) + '</b><span>Belum ada foto</span></div>';
  }
  function jbGallery(v) {
    if (!v.files.length) return '<p class="note" style="margin:0">Belum ada dokumentasi.</p>';
    return '<div class="gal">' + v.files.map(function (f, n) {
      var src = thumbSrc(v, f, 400);
      var thumb = src ? '<img class="jbth" loading="lazy" referrerpolicy="no-referrer" alt="" src="' + esc(src) + '">' : '';
      var ico = '<div class="ico">' + (f.k === 'link' ? 'Tautan' : f.k === 'foto' ? 'Foto' : 'Berkas') + '</div>';
      return '<div class="gwrap"><a class="gth" href="' + esc(f.u) + '" target="_blank" rel="noopener">' + (thumb || ico) + '<div class="cap">' + esc(f.n || 'Berkas') + '</div></a>' +
        '<button class="lepas" type="button" data-act="jb-rmf" data-id="' + v.id + '" data-n="' + n + '">Lepas dari daftar</button></div>';
    }).join('') + '</div>';
  }
  function renderJb(skipModal) {
    $('n-jbl').textContent = jbp.length;
    jbBuildSelects0();
    var rows = jbRows();
    var ter = 0, sas = 0, nd = 0, nf0 = 0, wil = {}, kec = {}, mon = {}, hs = {};
    HSL.forEach(function (h) { hs[h[0]] = 0; });
    rows.forEach(function (v) {
      ter += v.ter; sas += v.sas;
      var fc = v.files.length; nf0 += fc; if (fc) nd++;
      if (v.kec) kec[v.kec] = (kec[v.kec] || 0) + v.ter;
      wil[(v.kec || '') + '|' + (v.desa || '')] = 1;
      var m = v.date.slice(0, 7); mon[m] = mon[m] || { n: 0, t: 0 }; mon[m].n++; mon[m].t += v.ter;
      HSL.forEach(function (h) { hs[h[0]] += v[h[0]]; });
    });
    var nkec = Object.keys(kec).length, ndesa = Object.keys(wil).filter(function (k) { return k.split('|')[1]; }).length;
    var miss = rows.length - nd, pct = rows.length ? Math.round(nd / rows.length * 100) : 0;
    $('jb-banner').hidden = REMOTE || !jbp.some(function (v) { return v.sample; });
    $('jb-tiles').innerHTML =
      '<div class="tile"><span class="k">Pelaksanaan</span><span class="v">' + rows.length + '</span><span class="s">' + (ui.jy === 'all' ? 'semua periode' : 'tahun ' + ui.jy) + '</span></div>' +
      '<div class="tile"><span class="k">Warga terlayani</span><span class="v">' + nf(ter) + '</span><span class="s">' + (sas ? 'dari sasaran ' + nf(sas) + ' (' + Math.round(ter / sas * 100) + '%)' : 'sasaran belum diisi') + '</span></div>' +
      '<div class="tile"><span class="k">Wilayah terjangkau</span><span class="v">' + nkec + '</span><span class="s">kecamatan · ' + ndesa + ' desa/kelurahan</span></div>' +
      '<div class="tile' + (miss ? ' alert' : '') + '"><span class="k">Dokumentasi</span><span class="v">' + pct + '%</span><span class="s">' + nf0 + ' berkas · ' + (miss ? miss + ' kegiatan belum ada' : 'semua kegiatan terdokumentasi') + '</span></div>';
    var ml = Object.keys(mon).sort().slice(-12).map(function (m) {
      var d = new Date(+m.slice(0, 4), +m.slice(5, 7) - 1, 1);
      return { l: d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }), v: mon[m].t, s: mon[m].n + ' kegiatan · ' + nf(mon[m].t) };
    });
    $('jb-bm').innerHTML = '<h2>Warga terlayani per bulan</h2>' + columns(ml, 0);
    var kl = Object.keys(kec).sort(function (a, b) { return kec[b] - kec[a]; }).slice(0, 8).map(function (k) { return { l: k, v: kec[k], s: nf(kec[k]) }; });
    $('jb-bw').innerHTML = '<h2>Warga terlayani per kecamatan</h2>' + barRows(kl, 5);
    var hl = HSL.map(function (h) { return { l: h[1], v: hs[h[0]], s: nf(hs[h[0]]) }; }).filter(function (x) { return x.v > 0; });
    $('jb-bh').innerHTML = '<h2>Hasil layanan</h2>' + donut(hl.map(function (x, k) { return { l: x.l, v: x.v, c: pc(k) }; }), nf(hl.reduce(function (s, x) { return s + x.v; }, 0)), 'layanan');
    var nAda = jbp.filter(function (v) { return v.files.length; }).length;
    $('jb-chips').innerHTML = [['all', 'Semua', jbp.length], ['ada', 'Ada dokumentasi', nAda], ['belum', 'Belum ada dokumentasi', jbp.length - nAda]].map(function (c) {
      return '<button class="chip" type="button" data-act="jbdoc" data-s="' + c[0] + '" aria-pressed="' + (ui.jdoc === c[0]) + '">' + c[1] + ' <span class="mono">' + c[2] + '</span></button>';
    }).join('');
    if (!rows.length) {
      $('jb-list').innerHTML = '<div class="empty" style="grid-column:1/-1">' + (jbp.length ? 'Tidak ada data yang cocok dengan saringan.' : 'Belum ada catatan. Klik "Catat jemput bola" untuk mencatat pelaksanaan pertama.') + '</div>';
    } else {
      $('jb-list').innerHTML = rows.map(function (v) {
        var up = ui.jup[v.id], nfoto = v.files.filter(function (f) { return f.k === 'foto'; }).length, nfile = v.files.length;
        var wil = [v.desa, v.kec].filter(Boolean).join(', ') || v.loc || 'Lokasi belum diisi';
        var pctv = v.sas ? Math.min(100, Math.round(v.ter / v.sas * 100)) : 0;
        var hc = HSL.filter(function (h) { return v[h[0]] > 0; }).slice(0, 4).map(function (h) { return '<span>' + esc(h[1]) + ' <b>' + nf(v[h[0]]) + '</b></span>'; }).join('');
        var bdg = up ? 'Mengunggah ' + up.i + ' dari ' + up.n + '…' : nfoto ? nfoto + ' foto' + (nfile > nfoto ? ' · ' + (nfile - nfoto) + ' lainnya' : '') : nfile ? nfile + ' berkas' : '';
        return '<button class="jcard" type="button" data-act="jb-open" data-id="' + v.id + '" aria-label="Buka rincian: ' + esc(v.name) + '">' +
          '<div class="jcov">' + coverHtml(v) + '<span class="dt">' + fmtDate(v.date) + '</span>' + (bdg ? '<span class="bdg">' + esc(bdg) + '</span>' : '') + '</div>' +
          '<div class="jcb"><div class="tt">' + esc(v.name) + '</div><div class="wl">' + esc(wil) + '</div>' +
          '<div class="st"><span><b>' + nf(v.ter) + '</b> warga' + (v.sas ? ' dari ' + nf(v.sas) : '') + '</span>' + (v.sas ? '<span class="mono">' + pctv + '%</span>' : '') + '</div>' +
          (v.sas ? '<div class="track" style="--c:' + cv(BD(v.b).c) + '"><i style="width:' + pctv + '%"></i></div>' : '') +
          (hc ? '<div class="hc">' + hc + '</div>' : '') +
          '<div class="ft">' + tagsHtml(v.tags) + (nfile ? '' : '<span class="pill belum">Belum ada dokumentasi</span>') + '</div></div></button>';
      }).join('');
    }
    renderJbModal(skipModal);
  }
  function jbBodyHtml(v) {
    var up = ui.jup[v.id];
    var del = ui.jdel === v.id
      ? '<span class="row-btns"><button class="btn danger small" type="button" data-act="jb-del-yes" data-id="' + v.id + '">Ya, hapus</button><button class="btn ghost small" type="button" data-act="jb-del-no">Batal</button></span>'
      : '<button class="btn ghost small" type="button" data-act="jb-del" data-id="' + v.id + '">Hapus catatan</button>';
    var upl = REMOTE
      ? '<label class="upl' + (up ? ' off' : '') + '" for="jbu-' + v.id + '">' + (up ? 'Mengunggah ' + up.i + ' dari ' + up.n + '…' : 'Unggah foto atau berkas') + '<input type="file" id="jbu-' + v.id + '" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" data-act="jbfile" data-id="' + v.id + '"' + (up ? ' disabled' : '') + '></label>'
      : '<span class="note">Hubungkan ke Google Drive di tab Pengaturan untuk mengunggah berkas. Sementara itu Anda bisa menambahkan tautan.</span>';
    return '<div class="subh">Dokumentasi</div>' + jbGallery(v) +
      '<div class="row-btns">' + upl + '</div>' +
      '<div class="fgrid rin"><label class="f full" for="jl-' + v.id + '">Tambah tautan dokumentasi (misalnya folder Google Drive atau berita)<input type="text" id="jl-' + v.id + '" maxlength="500" placeholder="https://"></label></div>' +
      '<div><button class="btn ghost small" type="button" data-act="jb-addlink" data-id="' + v.id + '">Tambah tautan</button></div>' +
      '<div class="subh">Rincian pelaksanaan</div><div class="fgrid rin">' +
      jfi(v, 'name', 'Nama kegiatan', 'text', true) + jfi(v, 'date', 'Tanggal pelaksanaan', 'date') + jfi(v, 'b', 'Bidang') + jfi(v, 'k', 'Jenis layanan') + jfi(v, 'kid', 'Rencana terkait') +
      jfi(v, 'kec', 'Kecamatan', 'text') + jfi(v, 'desa', 'Desa / kelurahan', 'text') + jfi(v, 'loc', 'Lokasi pelaksanaan', 'text', true) + jfi(v, 'ptg', 'Petugas', 'text', true) +
      jfi(v, 'sas', 'Sasaran (orang)', 'num') + jfi(v, 'ter', 'Warga terlayani (orang)', 'num') + '</div>' +
      '<div class="subh">Hasil layanan</div><div class="fgrid rin">' + HSL.map(function (h) { return jfi(v, h[0], h[1], 'num'); }).join('') + '</div>' +
      '<div class="fgrid rin">' + jfi(v, 'kend', 'Kendala di lapangan', 'area', true) + jfi(v, 'tl', 'Tindak lanjut', 'area', true) + jfi(v, 'cat', 'Catatan', 'text', true) + '</div>' +
      '<div class="subh">Tagging</div><div class="chips">' + tagPicker(v.tags, 'jbp', v.id) + '</div>' +
      '<div><button class="btn ghost small" type="button" data-act="goto-tag">Kelola tag</button></div>' +
      '<div class="body-tools"><span class="note">Menghapus catatan tidak menghapus berkas di Google Drive.</span>' + del + '</div>';
  }
  function renderJbModal(skip) {
    var m = $('jb-modal'), v = ui.jsel ? findJb(ui.jsel) : null;
    if (!v) { ui.jsel = null; m.hidden = true; m.innerHTML = ''; document.body.classList.remove('noscroll'); return; }
    if (skip && !m.hidden) {
      var t = $('jbmt'), mm = $('jbmm'); if (t) t.textContent = v.name; if (mm) mm.innerHTML = jbMetaHtml(v);
      return;
    }
    var first = m.hidden, sc = m.scrollTop;
    m.innerHTML = '<div class="mbox"><div class="mhero"><button class="mclose" type="button" data-act="jb-close">Tutup</button>' + coverHtml(v) + '</div>' +
      '<div class="mpad"><div><div class="mt" id="jbmt">' + esc(v.name) + '</div><div class="meta" id="jbmm">' + jbMetaHtml(v) + '</div></div>' + jbBodyHtml(v) + '</div></div>';
    m.hidden = false; document.body.classList.add('noscroll');
    if (first) { m.scrollTop = 0; var cb = m.querySelector('.mclose'); if (cb) cb.focus({ preventScroll: true }); } else m.scrollTop = sc;
  }
  function jbBuildSelects0() { jbBuildSelects(); }
  function pushJb(v) {
    if (!REMOTE) return;
    failed = false; pending[v.id] = true; refreshSync();
    clearTimeout(timers[v.id]);
    timers[v.id] = setTimeout(function () {
      var cur = findJb(v.id);
      delete pending[v.id];
      if (!cur) { refreshSync(); return; }
      inflight++;
      api({ action: 'upsertjb', item: cur }).catch(onFail).then(function () { inflight--; refreshSync(); });
    }, 600);
  }
  function pushDelJb(id) {
    if (!REMOTE) return;
    clearTimeout(timers[id]); delete pending[id]; inflight++; refreshSync();
    api({ action: 'deljb', id: id }).catch(onFail).then(function () { inflight--; refreshSync(); });
  }
  function renderAll0() { renderSummary(); renderList(); renderIdeas(); renderJb(true); }
  function jfldChange(el) {
    var v = findJb(el.getAttribute('data-id')), k = el.getAttribute('data-k');
    if (!v) return;
    var val = el.value;
    if (k === 'name' && !String(val).trim()) { toast('Nama kegiatan tidak boleh kosong'); renderJb(); return; }
    if (k === 'date') { if (/^\d{4}-\d{2}-\d{2}$/.test(val)) v.date = val; else { renderJb(); return; } }
    else if (k === 'sas' || k === 'ter' || HSL.some(function (h) { return h[0] === k; })) v[k] = num0(val);
    else if (k === 'b' || k === 'k' || k === 'kid') v[k] = String(val);
    else v[k] = str(val, k === 'kend' || k === 'tl' ? 600 : k === 'loc' ? 200 : k === 'cat' ? 400 : k === 'ptg' ? 160 : k === 'name' ? 160 : 80).trim();
    saveJb(); pushJb(v);
    renderAll0();
  }
  /* foto dikecilkan sebelum diunggah; sekaligus dibuat sampul kecil (4:3) yang disimpan di data */
  function thumbOf(img) {
    var W = 420, H = 315, c = document.createElement('canvas'), x = c.getContext('2d');
    c.width = W; c.height = H; x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    var sr = img.width / img.height, tr = W / H, sx = 0, sy = 0, sw = img.width, sh = img.height;
    if (sr > tr) { sw = img.height * tr; sx = (img.width - sw) / 2; } else { sh = img.width / tr; sy = (img.height - sh) / 2; }
    x.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
    var q = 0.72, d = c.toDataURL('image/jpeg', q);
    while (d.length > 40000 && q > 0.3) { q -= 0.1; d = c.toDataURL('image/jpeg', q); }
    return d.length <= 45000 ? d : '';
  }
  function shrink(file) {
    return new Promise(function (resolve) {
      var plain = function (th) {
        var fr = new FileReader();
        fr.onerror = function () { resolve(null); };
        fr.onload = function () { resolve({ data: String(fr.result).split(',')[1] || '', mime: file.type || 'application/octet-stream', name: file.name, size: file.size, thumb: th || '' }); };
        fr.readAsDataURL(file);
      };
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { plain(''); return; }
      var url = URL.createObjectURL(file), img = new Image();
      img.onerror = function () { URL.revokeObjectURL(url); plain(''); };
      img.onload = function () {
        var th = '';
        try { th = thumbOf(img); } catch (e) {}
        if (file.size < 700 * 1024) { URL.revokeObjectURL(url); plain(th); return; }
        try {
          var r = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas');
          c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          URL.revokeObjectURL(url);
          var du = c.toDataURL('image/jpeg', 0.82);
          resolve({ data: du.split(',')[1] || '', mime: 'image/jpeg', name: file.name.replace(/\.[^.]+$/, '') + '.jpg', size: Math.round(du.length * 0.75), thumb: th });
        } catch (e) { URL.revokeObjectURL(url); plain(th); }
      };
      img.src = url;
    });
  }
  function uploadJbFiles(id, list) {
    var files = Array.prototype.slice.call(list || []);
    if (!files.length) return;
    if (!REMOTE) { toast('Hubungkan ke Google Drive dulu di tab Pengaturan'); return; }
    var v = findJb(id); if (!v) return;
    var okN = 0, i = 0, limit = maxMb() * 1024 * 1024;
    ui.jup[id] = { i: 1, n: files.length }; renderJb();
    (function next() {
      if (i >= files.length) { delete ui.jup[id]; renderJb(); toast(okN ? okN + ' berkas tersimpan di Google Drive' : 'Tidak ada berkas yang terunggah'); return; }
      var f = files[i]; i++;
      ui.jup[id] = { i: i, n: files.length }; renderJb();
      shrink(f).then(function (x) {
        if (!x || !x.data) { toast('Berkas tidak bisa dibaca: ' + f.name); return null; }
        if (x.size > limit) { toast('Berkas terlalu besar (maks ' + maxMb() + ' MB): ' + f.name); return null; }
        var cur = findJb(id); if (!cur) return null;
        return api({ action: 'uploadjb', jbId: id, jbName: cur.name, jbDate: cur.date, name: x.name, mime: x.mime, data: x.data }).then(function (j) {
          var c2 = findJb(id); if (!c2) return;
          var isFoto = /^image\//.test(x.mime);
          c2.files.push({ n: j.file.name, u: j.file.url, i: j.file.id || '', k: isFoto ? 'foto' : 'dok', at: j.file.at || '' });
          if (isFoto && !c2.cov && x.thumb) { c2.cov = x.thumb; c2.covi = j.file.id || ''; }
          saveJb(); pushJb(c2); okN++;
        });
      }).catch(function (e) { if (QUIET.indexOf(e.message) < 0) toast('Gagal mengunggah ' + f.name + ': ' + e.message); }).then(next);
    })();
  }
  function openJbForm() {
    ['name', 'kec', 'desa', 'loc', 'ptg', 'sas', 'ter', 'kend', 'tl'].forEach(function (k) { $('jf-' + k).value = ''; });
    $('jf-date').value = iso(0); jbBuildSelects();
    $('jf-k').value = ''; $('jf-kid').value = '';
    HSL.forEach(function (h) { $('jf-h-' + h[0]).value = ''; });
    ui.jtags = []; ui.jfiles = []; $('jf-files').value = '';
    $('jf-tags').innerHTML = tagPicker(ui.jtags, 'jform', '');
    jfNote();
    $('jb-form').hidden = false;
    $('jb-form').scrollIntoView({ block: 'start', behavior: 'smooth' });
    $('jf-name').focus({ preventScroll: true });
  }
  function jfNote() {
    $('jf-fnote').textContent = !REMOTE ? 'Belum terhubung ke Google Drive. Berkas bisa diunggah setelah koneksi diatur di tab Pengaturan, atau tambahkan tautan di rincian kegiatan.' :
      ui.jfiles.length ? ui.jfiles.length + ' berkas dipilih: ' + ui.jfiles.map(function (f) { return f.name; }).join(', ') : 'Foto akan dikecilkan otomatis sebelum diunggah. Bisa memilih beberapa berkas sekaligus.';
    $('jf-uplw').classList.toggle('off', !REMOTE);
  }
  function jbCsvText() {
    var head = ['Kegiatan', 'Tanggal', 'Bidang', 'Jenis layanan', 'Kecamatan', 'Desa/Kelurahan', 'Lokasi', 'Petugas', 'Sasaran', 'Terlayani'].concat(HSL.map(function (h) { return h[1]; })).concat(['Kendala', 'Tindak lanjut', 'Catatan', 'Tagging', 'Jumlah dokumentasi', 'Tautan dokumentasi']);
    var lines = [head].concat(jbRows().map(function (v) {
      return [v.name, v.date, BD(v.b).n, v.k ? TP(v.k).n : '', v.kec, v.desa, v.loc, v.ptg, v.sas, v.ter].concat(HSL.map(function (h) { return v[h[0]]; })).concat([v.kend, v.tl, v.cat, tagNames(v), v.files.length, v.files.map(function (f) { return f.u; }).join(' ')]);
    }));
    return '﻿' + lines.map(function (r) { return r.map(csvCell).join(';'); }).join('\r\n');
  }

  /* ---------- inovasi ---------- */
  function periodeText(v) {
    var t = v.start && v.end ? fmtDate(v.start) + ' – ' + fmtDate(v.end) : v.start ? 'Mulai ' + fmtDate(v.start) : v.end ? 'Target ' + fmtDate(v.end) : 'Jadwal belum diisi';
    if (v.end && (v.st === 'jalan' || v.st === 'rencana')) {
      var d = dayDiff(v.end);
      t += ' · ' + (d < 0 ? 'lewat ' + (-d) + ' hari dari target' : d === 0 ? 'target hari ini' : 'H-' + d);
    }
    return t;
  }
  function ivMetaHtml(v) {
    var bd = BD(v.b);
    return '<span class="b" style="--c:' + cv(bd.c) + '"><i class="dot"></i>' + esc(bd.n) + '</span><span class="mono">' + periodeText(v) + '</span>' + (v.pic ? '<span>' + esc(v.pic) + '</span>' : '');
  }
  function ifi(v, k, label, type, full) {
    var id = 'ir-' + v.id + '-' + k, val = v[k] || '', h;
    var at = ' id="' + id + '" data-act="ifld" data-id="' + v.id + '" data-k="' + k + '"';
    if (k === 'st') h = '<select' + at + '>' + Object.keys(IST).map(function (x) { return '<option value="' + x + '"' + (x === v.st ? ' selected' : '') + '>' + esc(IST[x]) + '</option>'; }).join('') + '</select>';
    else if (k === 'b') h = '<select' + at + '>' + opts(cfg.bidang, v.b) + '</select>';
    else if (type === 'date') h = '<input type="date"' + at + ' value="' + esc(val) + '">';
    else if (type === 'area') h = '<textarea rows="3" maxlength="600"' + at + '>' + esc(val) + '</textarea>';
    else h = '<input type="text" maxlength="' + (k === 'lnk' ? 300 : 160) + '"' + at + ' value="' + esc(val) + '">';
    return '<label class="f' + (full ? ' full' : '') + '" for="' + id + '">' + label + h + '</label>';
  }
  function inovRows() {
    var q = ui.vq.trim().toLowerCase();
    return inov.filter(function (v) {
      return (ui.vs === 'all' || v.st === ui.vs) && (ui.vb === 'all' || v.b === ui.vb) && (ui.vt === 'all' || v.tags.indexOf(ui.vt) > -1) &&
        (!q || [v.name, v.desc, v.man, v.pic, v.sas, v.cat, tagNames(v)].join(' ').toLowerCase().indexOf(q) > -1);
    }).sort(function (p, r) {
      var kp = p.end || p.start || '9999-12-31', kr = r.end || r.start || '9999-12-31';
      return ORDI[p.st] - ORDI[r.st] || (p.st === 'selesai' ? kr.localeCompare(kp) : kp.localeCompare(kr));
    });
  }
  function renderInov() {
    var n = { rencana: 0, jalan: 0, selesai: 0, tunda: 0 };
    inov.forEach(function (v) { n[v.st]++; });
    $('n-inov').textContent = inov.length;
    $('inov-banner').hidden = REMOTE || !inov.some(function (v) { return v.sample; });
    $('inov-tiles').innerHTML =
      '<div class="tile"><span class="k">Total inovasi</span><span class="v">' + inov.length + '</span><span class="s">' + (n.tunda ? n.tunda + ' ditunda' : 'semua tercatat') + '</span></div>' +
      '<div class="tile"><span class="k">Direncanakan</span><span class="v">' + n.rencana + '</span><span class="s">akan dilakukan</span></div>' +
      '<div class="tile"><span class="k">Sedang berjalan</span><span class="v">' + n.jalan + '</span><span class="s">dalam pelaksanaan</span></div>' +
      '<div class="tile"><span class="k">Sudah berjalan</span><span class="v">' + n.selesai + '</span><span class="s">selesai dilaksanakan</span></div>';
    $('inov-charts').innerHTML = '<div class="bars">' + card('Status inovasi', donut([
      { l: IST.selesai, v: n.selesai, c: 'var(--ok)' }, { l: IST.jalan, v: n.jalan, c: 'var(--p7)' },
      { l: IST.rencana, v: n.rencana, c: 'var(--p3)' }, { l: IST.tunda, v: n.tunda, c: 'var(--p1)' }], inov.length, 'inovasi')) + '</div><div class="bars">' +
      card('Inovasi per bidang', barRows(cfg.bidang.map(function (b) { var c = inov.filter(function (v) { return v.b === b.id; }).length; return { l: b.n, v: c, s: String(c) }; }), 1)) + '</div>';
    $('inov-chips').innerHTML = [['all', 'Semua', inov.length], ['rencana', IST.rencana, n.rencana], ['jalan', IST.jalan, n.jalan], ['selesai', IST.selesai, n.selesai], ['tunda', IST.tunda, n.tunda]].map(function (c) {
      return '<button class="chip" type="button" data-act="ivs" data-s="' + c[0] + '" aria-pressed="' + (ui.vs === c[0]) + '">' + esc(c[1]) + ' <span class="mono">' + c[2] + '</span></button>';
    }).join('');
    var rows = inovRows();
    if (!rows.length) {
      $('inov-list').innerHTML = '<div class="empty">' + (inov.length ? 'Tidak ada inovasi yang cocok dengan saringan.' : 'Belum ada inovasi. Klik "Tambah inovasi" untuk mencatat inovasi pertama.') + '</div>';
      return;
    }
    $('inov-list').innerHTML = rows.map(function (v) {
      var open = !!ui.vopen[v.id];
      var link = /^https?:\/\//i.test(v.lnk) ? '<div class="ivlink note">Tautan: <a href="' + esc(v.lnk) + '" target="_blank" rel="noopener">' + esc(v.lnk) + '</a></div>' : '';
      var del = ui.vdel === v.id
        ? '<span class="row-btns"><button class="btn danger small" type="button" data-act="iv-del-yes" data-id="' + v.id + '">Ya, hapus</button><button class="btn ghost small" type="button" data-act="iv-del-no">Batal</button></span>'
        : '<button class="btn ghost small" type="button" data-act="iv-del" data-id="' + v.id + '">Hapus inovasi</button>';
      var body = open ? '<div class="act-body"><div class="subh">Rincian inovasi</div><div class="fgrid rin">' +
        ifi(v, 'name', 'Nama inovasi', 'text', true) + ifi(v, 'st', 'Status') + ifi(v, 'b', 'Bidang') +
        ifi(v, 'start', 'Tanggal mulai', 'date') + ifi(v, 'end', 'Target selesai / tanggal selesai', 'date') +
        ifi(v, 'pic', 'Penanggung jawab', 'text') + ifi(v, 'sas', 'Sasaran / pengguna', 'text') +
        ifi(v, 'desc', 'Deskripsi inovasi', 'area', true) + ifi(v, 'man', 'Manfaat atau hasil yang diharapkan', 'area', true) +
        ifi(v, 'lnk', 'Tautan (aplikasi, SK, atau bukti)', 'text', true) + ifi(v, 'cat', 'Catatan', 'text', true) + '</div>' + link +
        '<div class="subh">Tagging</div><div class="chips">' + tagPicker(v.tags, 'inov', v.id) + '</div>' +
        '<div><button class="btn ghost small" type="button" data-act="goto-tag">Kelola tag</button></div>' +
        '<div class="body-tools"><span></span>' + del + '</div></div>' : '';
      return '<article class="act" id="iv-' + v.id + '">' +
        '<button class="act-head" type="button" data-act="iv-open" data-id="' + v.id + '" aria-expanded="' + open + '">' +
        '<div><div class="act-title" id="ivtitle-' + v.id + '">' + esc(v.name) + '</div><div class="meta" id="ivmeta-' + v.id + '">' + ivMetaHtml(v) + '</div><div id="ivtags-' + v.id + '">' + tagsHtml(v.tags) + '</div></div>' +
        '<div class="right"><span class="pill ' + ({ jalan: 'berjalan', rencana: 'belum', selesai: 'selesai', tunda: 'tunda' }[v.st]) + '">' + esc(IST[v.st]) + '</span><span class="chev">▸</span></div>' +
        '</button>' + body + '</article>';
    }).join('');
  }
  function pushInov(v) {
    if (!REMOTE) return;
    failed = false; pending[v.id] = true; refreshSync();
    clearTimeout(timers[v.id]);
    timers[v.id] = setTimeout(function () {
      var cur = findInov(v.id);
      delete pending[v.id];
      if (!cur) { refreshSync(); return; }
      inflight++;
      api({ action: 'upsertinov', item: cur }).catch(onFail).then(function () { inflight--; refreshSync(); });
    }, 600);
  }
  function pushDelInov(id) {
    if (!REMOTE) return;
    clearTimeout(timers[id]); delete pending[id]; inflight++; refreshSync();
    api({ action: 'delinov', id: id }).catch(onFail).then(function () { inflight--; refreshSync(); });
  }
  function ifldChange(el) {
    var v = findInov(el.getAttribute('data-id')), k = el.getAttribute('data-k');
    if (!v) return;
    var val = el.value;
    if (k === 'name' && !String(val).trim()) { toast('Nama inovasi tidak boleh kosong'); renderInov(); return; }
    if (k === 'st') { if (IST[val]) v.st = val; }
    else if (k === 'b') v.b = val;
    else v[k] = str(val, k === 'desc' || k === 'man' ? 600 : (k === 'lnk' ? 300 : (k === 'start' || k === 'end' ? 10 : 160))).trim();
    saveInov(); pushInov(v);
    if (k === 'st' || k === 'b') { renderAll(); return; }
    var m = $('ivmeta-' + v.id); if (m) m.innerHTML = ivMetaHtml(v);
    var t = $('ivtitle-' + v.id); if (t) t.textContent = v.name;
  }
  function openInovForm() {
    $('iv-name').value = ''; $('iv-st').value = 'rencana'; $('iv-b').value = cfg.bidang[0].id;
    $('iv-start').value = ''; $('iv-end').value = ''; $('iv-pic').value = ''; $('iv-sas').value = '';
    $('iv-desc').value = ''; $('iv-man').value = ''; $('iv-lnk').value = '';
    ui.vtags = [];
    $('iv-tags').innerHTML = tagPicker(ui.vtags, 'iform', '');
    $('inov-form').hidden = false;
    $('inov-form').scrollIntoView({ block: 'start', behavior: 'smooth' });
    $('iv-name').focus({ preventScroll: true });
  }
  function saveCsv(text, name) {
    try {
      var blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
      var url = URL.createObjectURL(blob), el = document.createElement('a');
      el.href = url; el.download = name;
      document.body.appendChild(el); el.click();
      setTimeout(function () { document.body.removeChild(el); URL.revokeObjectURL(url); }, 500);
    } catch (e) { toast('Unduhan tidak didukung di browser ini'); }
  }
  function inovCsvText() {
    var head = ['Inovasi', 'Status', 'Bidang', 'Mulai', 'Target selesai', 'Penanggung jawab', 'Sasaran', 'Deskripsi', 'Manfaat', 'Tautan', 'Catatan', 'Tagging'];
    var lines = [head].concat(inovRows().map(function (v) { return [v.name, IST[v.st], BD(v.b).n, v.start, v.end, v.pic, v.sas, v.desc, v.man, v.lnk, v.cat, tagNames(v)]; }));
    return '﻿' + lines.map(function (r) { return r.map(csvCell).join(';'); }).join('\r\n');
  }
  function exportInovCsv() { saveCsv(inovCsvText(), 'inovasi-' + iso(0) + '.csv'); }

  function ideaKat(x) { return TP(x.k).kat === 'jb' ? 'jb' : 'dpa'; }

  function extraMeta(a) {
    var h = '';
    if (a.j === 'dpa') {
      h += '<span class="tag dpa">' + esc(DS[a.ds] || DS.usulan) + '</span>';
      if (a.pagu > 0) h += '<span class="mono">' + rp(a.pagu) + (a.real > 0 ? ' · realisasi ' + Math.round(a.real / a.pagu * 100) + '%' : '') + '</span>';
    } else {
      if (a.loc) h += '<span>' + esc(a.loc) + '</span>';
      if (a.sas > 0 || a.ter > 0) h += '<span class="mono">Terlayani ' + a.ter + (a.sas > 0 ? '/' + a.sas : '') + '</span>';
    }
    return h;
  }
  function metaHtml(a) {
    var i = info(a), bd = BD(a.b);
    return '<span class="b" style="--c:' + cv(bd.c) + '"><i class="dot"></i>' + esc(bd.n) + '</span>' +
      '<span>' + esc(TP(a.k).n) + '</span>' +
      '<span class="mono">' + fmtDate(a.date) + (i.st === 'selesai' ? '' : ' · ' + when(i.days)) + '</span>' + extraMeta(a);
  }
  function fi(a, k, label, type, full) {
    var id = 'r-' + a.id + '-' + k, v = a[k], h;
    var at = ' id="' + id + '" data-act="fld" data-id="' + a.id + '" data-k="' + k + '"';
    if (k === 'ds') h = '<select' + at + '>' + Object.keys(DS).map(function (x) { return '<option value="' + x + '"' + (x === a.ds ? ' selected' : '') + '>' + esc(DS[x]) + '</option>'; }).join('') + '</select>';
    else if (type === 'number') h = '<input type="number" min="0" step="1"' + at + ' value="' + (v ? v : '') + '" placeholder="0">';
    else h = '<input type="text" maxlength="' + (k === 'cat' ? 400 : 160) + '"' + at + ' value="' + esc(v || '') + '">';
    return '<label class="f' + (full ? ' full' : '') + '" for="' + id + '">' + label + h + '</label>';
  }
  function rincian(a) {
    var h = a.j === 'dpa'
      ? fi(a, 'ds', 'Status DPA') + fi(a, 'th', 'Tahun anggaran', 'number') + fi(a, 'sub', 'Program / sub kegiatan', 'text', true) + fi(a, 'pagu', 'Pagu anggaran (Rp)', 'number') + fi(a, 'real', 'Realisasi (Rp)', 'number') + fi(a, 'pptk', 'PPTK / penanggung jawab', 'text', true)
      : fi(a, 'loc', 'Lokasi', 'text') + fi(a, 'ptg', 'Petugas / tim', 'text') + fi(a, 'sas', 'Target sasaran (orang)', 'number') + fi(a, 'ter', 'Terlayani (orang)', 'number') + fi(a, 'cat', 'Catatan', 'text', true);
    return '<div class="fgrid rin">' + h + '</div>';
  }
  function renderKegHead() {
    $('keg-title').textContent = ui.kat === 'jb' ? 'Jemput bola' : 'Kegiatan DPA';
    $('keg-desc').textContent = ui.kat === 'jb'
      ? 'Pelayanan ke lokasi sasaran. Catat lokasi, target sasaran, jumlah warga terlayani, dan dokumen pelaksanaannya.'
      : 'Kegiatan yang diusulkan atau sudah masuk DPA. Pantau status, pagu, realisasi, dan kelengkapan dokumen dari usulan sampai SPJ.';
  }

  function sumOf(sc) {
    var all = sc.map(function (a) { return { a: a, i: info(a) }; });
    var s = { all: all, c: { selesai: 0, terlambat: 0, berjalan: 0, belum: 0 }, td: 0, tt: 0, soon: 0 };
    all.forEach(function (x) {
      s.td += x.i.d; s.tt += x.i.t; s.c[x.i.st]++;
      if (x.i.st !== 'selesai' && x.i.st !== 'terlambat' && x.i.days <= 7) s.soon++;
    });
    return s;
  }
  function tilesHtml(s, lbl) {
    var late = s.c.terlambat, done = s.c.selesai, attn = late + s.soon, pct = s.tt ? Math.round(s.td / s.tt * 100) : 0;
    return '<div class="tile"><span class="k">Kegiatan aktif</span><span class="v">' + (s.all.length - done) + '</span><span class="s">dari ' + s.all.length + lbl + '</span></div>' +
      '<div class="tile"><span class="k">Dokumen lengkap</span><span class="v">' + pct + '%</span><span class="s">' + s.td + ' dari ' + s.tt + ' dokumen</span></div>' +
      '<div class="tile' + (attn ? ' alert' : '') + '"><span class="k">Perlu perhatian</span><span class="v">' + attn + '</span><span class="s">' + late + ' terlambat, ' + s.soon + ' jatuh tempo ≤ 7 hari</span></div>' +
      '<div class="tile"><span class="k">Selesai</span><span class="v">' + done + '</span><span class="s">semua dokumen lengkap</span></div>';
  }
  function statusDonut(s) {
    return card('Status kegiatan', donut([
      { l: 'Selesai', v: s.c.selesai, c: 'var(--ok)' }, { l: 'Berjalan', v: s.c.berjalan, c: 'var(--p7)' },
      { l: 'Belum mulai', v: s.c.belum, c: 'var(--p1)' }, { l: 'Terlambat', v: s.c.terlambat, c: 'var(--crit)' }], s.all.length, 'kegiatan'));
  }
  function bidangBars(s) {
    var rows = cfg.bidang.map(function (b) {
      var d = 0, t = 0;
      s.all.forEach(function (x) { if (x.a.b === b.id) { d += x.i.d; t += x.i.t; } });
      var p = t ? Math.round(d / t * 100) : 0;
      return '<div class="brow" style="--c:' + cv(b.c) + '" title="' + esc(b.s) + '"><div class="l"><span><i class="dot"></i>' + esc(b.n) + '</span><span class="mono">' + (t ? d + '/' + t + ' · ' + p + '%' : 'belum ada') + '</span></div><div class="track"><i style="width:' + p + '%"></i></div></div>';
    }).join('');
    return card('Kelengkapan dokumen per bidang', rows);
  }
  function renderSummary() {
    var g = sumOf(state.acts);
    $('tiles').innerHTML = tilesHtml(g, ' kegiatan');
    $('d-status').innerHTML = statusDonut(g);
    $('d-bulan').innerHTML = card('Kegiatan per bulan (menurut tanggal)', columns(monthItems(state.acts, function () { return 1; }), 1));
    $('bars').innerHTML = bidangBars(g);
    $('d-warga').innerHTML = card('Warga terlayani jemput bola per bulan', columns(monthItems(jbp, function (v) { return v.ter || 0; }), 0));
    var ni = { rencana: 0, jalan: 0, selesai: 0, tunda: 0 };
    inov.forEach(function (v) { if (ni[v.st] !== undefined) ni[v.st]++; });
    $('d-inov').innerHTML = card('Status inovasi', donut([
      { l: IST.selesai, v: ni.selesai, c: 'var(--ok)' }, { l: IST.jalan, v: ni.jalan, c: 'var(--p7)' },
      { l: IST.rencana, v: ni.rencana, c: 'var(--p3)' }, { l: IST.tunda, v: ni.tunda, c: 'var(--p1)' }], inov.length, 'inovasi'));
    var ks = ikdSum();
    $('d-ikd').innerHTML = card('Aktivasi IKD (semua OPD)', ikdDonut(ks));
    $('d-myasn').innerHTML = card('Verifikasi NIK di MyASN (semua OPD)', ks.nok + ks.nbl + ks.nlain ? maDonut(ks) : '<p class="note" style="margin:0">Belum ada data.</p>');
    if (ui.tab === 'dpa' || ui.tab === 'jb') {
      var s = sumOf(scoped());
      $('keg-tiles').innerHTML = tilesHtml(s, ui.tab === 'dpa' ? ' kegiatan DPA' : ' kegiatan jemput bola');
      $('keg-charts').innerHTML = '<div class="bars">' + statusDonut(s) + '</div><div class="bars">' + bidangBars(s) + '</div>';
    }
    $('n-dpa').textContent = state.acts.filter(function (a) { return a.j === 'dpa'; }).length;
    $('n-jb').textContent = state.acts.filter(function (a) { return a.j === 'jb'; }).length;
    $('n-bank').textContent = state.acts.length;
    $('n-tag').textContent = cfg.tags.length;
    $('n-inov').textContent = inov.length;
    $('n-jbl').textContent = jbp.length;
    $('n-ikd').textContent = ikd.length;
    $('banner').hidden = REMOTE || !(ui.tab === 'dash' || ui.tab === 'dpa' || ui.tab === 'jb') || !state.acts.some(function (a) { return a.sample; });
  }

  function renderList() {
    renderKegHead();
    if (ui.loadErr) { $('list').innerHTML = '<div class="empty">' + esc(ui.loadErr) + '</div>'; return; }
    var q = ui.q.trim().toLowerCase();
    var items = state.acts.map(function (a) { return { a: a, i: info(a) }; }).filter(function (x) {
      return x.a.j === ui.kat && (ui.fb === 'all' || x.a.b === ui.fb) && (ui.ft === 'all' || x.a.tags.indexOf(ui.ft) > -1) && (ui.fs === 'all' || x.i.st === ui.fs) && (!q || x.a.name.toLowerCase().indexOf(q) > -1);
    }).sort(function (p, r) { return ORD[p.i.st] - ORD[r.i.st] || p.a.date.localeCompare(r.a.date); });
    if (!items.length) {
      var has = state.acts.some(function (a) { return a.j === ui.kat; });
      $('list').innerHTML = '<div class="empty">' + (has ? 'Tidak ada kegiatan yang cocok dengan filter.' : 'Belum ada ' + (ui.kat === 'jb' ? 'kegiatan jemput bola' : 'kegiatan DPA') + '. Tambahkan kegiatan baru atau ambil dari tab Bank ide.') + '</div>';
      return;
    }
    $('list').innerHTML = items.map(function (x) {
      var a = x.a, i = x.i, open = !!ui.open[a.id];
      var docs = a.docs.map(function (d, n) {
        var fa = '';
        if (REMOTE) {
          var busy = ui.busy[a.id + ':' + n];
          fa = '<div class="fileact">' +
            (d.f && /^https:\/\//.test(d.f.url) ? '<a href="' + esc(d.f.url) + '" target="_blank" rel="noopener">' + esc(d.f.name) + '</a>' : '') +
            '<input type="file" hidden id="file-' + a.id + '-' + n + '" data-act="file" data-id="' + a.id + '" data-n="' + n + '">' +
            '<button class="btn ghost" type="button" data-act="pick" data-id="' + a.id + '" data-n="' + n + '"' + (busy ? ' disabled' : '') + '>' + (busy ? 'Mengunggah…' : (d.f ? 'Ganti file' : 'Unggah')) + '</button></div>';
        }
        return '<div class="docrow"><label class="doc"><input type="checkbox" data-act="toggle" data-id="' + a.id + '" data-n="' + n + '"' + (d.d ? ' checked' : '') + '><span>' + esc(d.t) + '</span></label>' + fa + '</div>';
      }).join('');
      var del = ui.confirm === a.id
        ? '<span class="row-btns"><button class="btn danger small" type="button" data-act="del-yes" data-id="' + a.id + '">Ya, hapus</button><button class="btn ghost small" type="button" data-act="del-no">Batal</button></span>'
        : '<button class="btn ghost small" type="button" data-act="del" data-id="' + a.id + '">Hapus kegiatan</button>';
      var body = open ? '<div class="act-body">' +
        '<div class="subh">Rincian kegiatan</div>' + rincian(a) +
        '<div class="subh">Tagging</div><div class="chips">' + tagPicker(a.tags, 'act', a.id) + '</div>' +
        '<div><button class="btn ghost small" type="button" data-act="goto-tag">Kelola tag</button></div>' +
        '<div class="subh">Dokumen yang perlu dilengkapi</div>' +
        '<div class="docs">' + (docs || '<span class="note">Belum ada dokumen. Tambahkan di bawah.</span>') + '</div>' +
        '<div class="body-tools"><form class="adddoc" data-id="' + a.id + '"><input type="text" placeholder="Tambah dokumen lain" aria-label="Tambah dokumen lain" maxlength="120"><button class="btn ghost small" type="submit">Tambah</button></form>' +
        '<label class="dateedit">Tanggal <input type="date" data-act="date" data-id="' + a.id + '" value="' + esc(a.date) + '"></label>' + del + '</div></div>' : '';
      return '<article class="act ' + i.st + '" id="act-' + a.id + '">' +
        '<button class="act-head" type="button" data-act="open" data-id="' + a.id + '" aria-expanded="' + open + '">' +
        '<div><div class="act-title">' + esc(a.name) + '</div><div class="meta" id="meta-' + a.id + '">' + metaHtml(a) + '</div>' + tagsHtml(a.tags) + '</div>' +
        '<div class="right"><span class="pill ' + i.st + '">' + ST[i.st] + '</span><div class="track" aria-hidden="true"><i style="width:' + i.pct + '%"></i></div><span class="mono">' + i.d + '/' + i.t + ' <span class="chev">▸</span></span></div>' +
        '</button>' + body + '</article>';
    }).join('');
  }

  function renderIdeas() {
    $('n-ide').textContent = cfg.ideas.length;
    if (ui.ib !== 'all' && !cfg.bidang.some(function (b) { return b.id === ui.ib; })) ui.ib = 'all';
    var base = cfg.ideas.filter(function (x) { return ui.ik === 'all' || ideaKat(x) === ui.ik; });
    var chips = [{ id: 'all', n: 'Semua bidang', c: 0, cnt: base.length }].concat(cfg.bidang.map(function (b) {
      return { id: b.id, n: b.n, c: b.c, cnt: base.filter(function (x) { return x.b === b.id; }).length };
    }));
    $('chips').innerHTML = chips.map(function (c) {
      return '<button class="chip" type="button" data-act="ichip" data-b="' + esc(c.id) + '" aria-pressed="' + (ui.ib === c.id) + '" style="--c:' + cv(c.c) + '">' + (c.id === 'all' ? '' : '<i class="dot"></i>') + esc(c.n) + ' <span class="mono">' + c.cnt + '</span></button>';
    }).join('');
    $('chips2').innerHTML = [['all', 'Semua kategori'], ['dpa', 'Kegiatan DPA'], ['jb', 'Jemput bola']].map(function (c) {
      return '<button class="chip" type="button" data-act="ikat" data-k="' + c[0] + '" aria-pressed="' + (ui.ik === c[0]) + '">' + c[1] + '</button>';
    }).join('');
    var shown = cfg.ideas.map(function (x, n) { return { x: x, n: n }; }).filter(function (o) {
      return (ui.ib === 'all' || o.x.b === ui.ib) && (ui.ik === 'all' || ideaKat(o.x) === ui.ik);
    });
    $('ideas').innerHTML = shown.length ? shown.map(function (o) {
      var x = o.x, bd = BD(x.b), tp = TP(x.k), kt = ideaKat(x);
      return '<div class="idea"><span class="meta" style="margin:0;--c:' + cv(bd.c) + '"><span class="b"><i class="dot"></i>' + esc(bd.n) + '</span><span class="tag' + (kt === 'dpa' ? ' dpa' : '') + '">' + KATN[kt] + '</span></span>' +
        '<h3>' + esc(x.t) + '</h3><p>' + esc(x.d) + '</p>' + tagsHtml(x.tg) +
        '<div class="foot"><span class="cnt">' + esc(tp.n) + ' · ' + tp.docs.length + ' dokumen</span>' +
        '<button class="btn small" type="button" data-act="idea" data-n="' + o.n + '">Jadikan kegiatan</button></div></div>';
    }).join('') : '<div class="empty">Belum ada ide untuk pilihan ini. Tambahkan di tab Pengaturan.</div>';
  }

  function renderAll() {
    renderSummary(); renderList(); renderIdeas();
    if (ui.tab === 'bank') renderBank();
    if (ui.tab === 'tag') renderTags();
    if (ui.tab === 'inov') renderInov();
    if (ui.tab === 'jbl') renderJb();
    if (ui.tab === 'ikd') renderIkd();
    if (!$('jb-form').hidden) $('jf-tags').innerHTML = tagPicker(ui.jtags, 'jform', '');
    if (!$('inov-form').hidden) $('iv-tags').innerHTML = tagPicker(ui.vtags, 'iform', '');
  }

  function toast(m) {
    var t = $('toast'); t.textContent = m; t.hidden = false;
    clearTimeout(toast.h); toast.h = setTimeout(function () { t.hidden = true; }, 2800);
  }

  /* ---------- header, pilihan (select) ---------- */
  function applyHeader() {
    $('h1').textContent = cfg.judul;
    document.title = cfg.judul;
    $('today').textContent = cfg.instansi + ' · ' + T0.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  function opts(list, sel) { return list.map(function (x) { return '<option value="' + esc(x.id) + '"' + (x.id === sel ? ' selected' : '') + '>' + esc(x.n) + '</option>'; }).join(''); }
  function optsT(list, sel) {
    return list.map(function (t) { return '<option value="' + esc(t.id) + '"' + (t.id === sel ? ' selected' : '') + '>' + (t.kat === 'jb' ? 'Jemput bola · ' : 'DPA · ') + esc(t.n) + '</option>'; }).join('');
  }
  function showX(kat) {
    ['th', 'sub', 'pagu', 'pptk', 'ds'].forEach(function (k) { $('w-' + k).hidden = kat !== 'dpa'; });
    ['loc', 'ptg', 'sas'].forEach(function (k) { $('w-' + k).hidden = kat !== 'jb'; });
  }
  function fillTipe(kat, sel) {
    var list = cfg.tipe.filter(function (t) { return t.kat === kat; });
    $('f-tipe').innerHTML = opts(list, sel);
    if (!list.some(function (t) { return t.id === sel; })) $('f-tipe').value = list[0].id;
    showX(kat);
    preview();
  }
  function fillBankSelects() {
    var ys = {};
    state.acts.forEach(function (a) { ys[yr(a)] = 1; });
    var years = Object.keys(ys).sort().reverse();
    if (ui.bk.th !== 'all' && !ys[ui.bk.th]) ui.bk.th = 'all';
    if (ui.bk.b !== 'all' && !cfg.bidang.some(function (b) { return b.id === ui.bk.b; })) ui.bk.b = 'all';
    $('bk-th').innerHTML = '<option value="all">Semua tahun</option>' + years.map(function (y) { return '<option value="' + y + '"' + (String(ui.bk.th) === y ? ' selected' : '') + '>' + y + '</option>'; }).join('');
    $('bk-b').innerHTML = '<option value="all">Semua bidang</option>' + opts(cfg.bidang, ui.bk.b);
    if (ui.bk.tg !== 'all' && !cfg.tags.some(function (t) { return t.id === ui.bk.tg; })) ui.bk.tg = 'all';
    $('bk-tg').innerHTML = '<option value="all">Semua tag</option>' + opts(cfg.tags, ui.bk.tg);
    $('bk-kat').value = ui.bk.kat; $('bk-th').value = ui.bk.th; $('bk-b').value = ui.bk.b; $('bk-tg').value = ui.bk.tg;
  }
  function buildSelects() {
    if (ui.fb !== 'all' && !cfg.bidang.some(function (b) { return b.id === ui.fb; })) ui.fb = 'all';
    $('fb').innerHTML = '<option value="all">Semua bidang</option>' + opts(cfg.bidang, ui.fb);
    $('fb').value = ui.fb;
    if (ui.ft !== 'all' && !cfg.tags.some(function (t) { return t.id === ui.ft; })) ui.ft = 'all';
    $('ft').innerHTML = '<option value="all">Semua tag</option>' + opts(cfg.tags, ui.ft);
    $('ft').value = ui.ft;
    var vb0 = $('iv-b').value;
    $('iv-b').innerHTML = opts(cfg.bidang, vb0);
    if (!cfg.bidang.some(function (b) { return b.id === vb0; })) $('iv-b').value = cfg.bidang[0].id;
    if (ui.vb !== 'all' && !cfg.bidang.some(function (b) { return b.id === ui.vb; })) ui.vb = 'all';
    $('ivf-b').innerHTML = '<option value="all">Semua bidang</option>' + opts(cfg.bidang, ui.vb);
    $('ivf-b').value = ui.vb;
    if (ui.vt !== 'all' && !cfg.tags.some(function (t) { return t.id === ui.vt; })) ui.vt = 'all';
    $('ivf-t').innerHTML = '<option value="all">Semua tag</option>' + opts(cfg.tags, ui.vt);
    $('ivf-t').value = ui.vt;
    jbBuildSelects();
    var b0 = $('f-bidang').value, t0 = $('f-tipe').value, k0 = $('f-kat').value === 'jb' ? 'jb' : 'dpa';
    $('f-bidang').innerHTML = opts(cfg.bidang, b0);
    if (!cfg.bidang.some(function (b) { return b.id === b0; })) $('f-bidang').value = cfg.bidang[0].id;
    fillTipe(k0, t0);
    fillBankSelects();
  }
  function rebuildAll() { applyHeader(); buildSelects(); renderAll(); }

  function setTab(t) {
    ui.tab = t;
    if (t === 'dpa' || t === 'jb') ui.kat = t;
    $('view-keg').hidden = !(t === 'dpa' || t === 'jb');
    $('view-inov').hidden = t !== 'inov';
    $('view-jbl').hidden = t !== 'jbl';
    $('view-ikd').hidden = t !== 'ikd';
    $('view-dash').hidden = t !== 'dash';
    $('view-bank').hidden = t !== 'bank';
    $('view-tag').hidden = t !== 'tag';
    $('view-ide').hidden = t !== 'ide';
    $('view-set').hidden = t !== 'set';
    $('view-akun').hidden = t !== 'akun';
    ['dash', 'dpa', 'jbl', 'jb', 'inov', 'ikd', 'bank', 'tag', 'ide', 'akun', 'set'].forEach(function (k) { $('tab-' + k).setAttribute('aria-selected', t === k); });
    if (t === 'bank') fillBankSelects();
    renderAll();
    if (t === 'set') renderSettings();
    if (t === 'akun') loadUsers();
  }
  function preview() {
    var tp = TP($('f-tipe').value);
    $('f-preview').innerHTML = '<strong>Dokumen yang perlu dilengkapi (' + tp.docs.length + ')</strong><ul>' + tp.docs.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul>';
  }
  function openForm(pre) {
    pre = pre || {};
    var j = pre.j || (ui.kat === 'jb' ? 'jb' : 'dpa');
    $('f-kat').value = j;
    fillTipe(j, pre.k);
    $('form-title').textContent = pre.name ? 'Jadikan kegiatan' : (j === 'jb' ? 'Jemput bola baru' : 'Kegiatan DPA baru');
    $('f-name').value = pre.name || '';
    $('f-bidang').value = pre.b || cfg.bidang[0].id;
    $('f-date').value = iso(14);
    $('f-th').value = iso(14).slice(0, 4);
    $('f-ds').value = 'usulan';
    ['f-sub', 'f-pagu', 'f-pptk', 'f-loc', 'f-sas', 'f-ptg'].forEach(function (id) { $(id).value = ''; });
    ui.ftags = (pre.tg || []).filter(function (v) { return cfg.tags.some(function (t) { return t.id === v; }); });
    $('f-tags').innerHTML = tagPicker(ui.ftags, 'form', '');
    setTab(j);
    $('form').hidden = false;
    $('form').scrollIntoView({ block: 'start', behavior: 'smooth' });
    $('f-name').focus({ preventScroll: true });
  }

  /* ---------- bank data ---------- */
  function bankRows() {
    var q = ui.bk.q.trim().toLowerCase();
    return state.acts.filter(function (a) {
      return (ui.bk.kat === 'all' || a.j === ui.bk.kat) && (ui.bk.th === 'all' || String(yr(a)) === String(ui.bk.th)) && (ui.bk.b === 'all' || a.b === ui.bk.b) &&
        (ui.bk.tg === 'all' || a.tags.indexOf(ui.bk.tg) > -1) &&
        (!q || [a.name, a.sub, a.loc, a.pptk, a.ptg, a.cat, tagNames(a)].join(' ').toLowerCase().indexOf(q) > -1);
    }).sort(function (p, r) { return r.date.localeCompare(p.date); });
  }
  function rinText(a) {
    if (a.j === 'dpa') return esc(DS[a.ds] || '') + (a.pagu > 0 ? '<br><span class="mono">' + rp(a.pagu) + (a.real > 0 ? ' · real. ' + rp(a.real) : '') + '</span>' : '') + (a.sub ? '<br><span class="note">' + esc(a.sub) + '</span>' : '');
    return esc(a.loc || '-') + ((a.sas > 0 || a.ter > 0) ? '<br><span class="mono">Terlayani ' + a.ter + (a.sas > 0 ? '/' + a.sas : '') + '</span>' : '');
  }
  function renderBank() {
    var rows = bankRows(), nd = 0, nj = 0, pagu = 0, real = 0, sas = 0, ter = 0, td = 0, tt = 0;
    rows.forEach(function (a) {
      var i = info(a); td += i.d; tt += i.t;
      if (a.j === 'dpa') { nd++; pagu += a.pagu; real += a.real; } else { nj++; sas += a.sas; ter += a.ter; }
    });
    $('bank-tiles').innerHTML =
      '<div class="tile"><span class="k">Kegiatan tercatat</span><span class="v">' + rows.length + '</span><span class="s">' + nd + ' DPA · ' + nj + ' jemput bola</span></div>' +
      '<div class="tile"><span class="k">Total pagu DPA</span><span class="v sm">' + rpS(pagu) + '</span><span class="s">realisasi ' + rpS(real) + (pagu > 0 ? ' (' + Math.round(real / pagu * 100) + '%)' : '') + '</span></div>' +
      '<div class="tile"><span class="k">Warga terlayani</span><span class="v">' + ter.toLocaleString('id-ID') + '</span><span class="s">' + (sas > 0 ? 'dari target ' + sas.toLocaleString('id-ID') + ' (' + Math.round(ter / sas * 100) + '%)' : 'jemput bola') + '</span></div>' +
      '<div class="tile"><span class="k">Dokumen lengkap</span><span class="v">' + (tt ? Math.round(td / tt * 100) : 0) + '%</span><span class="s">' + td + ' dari ' + tt + ' dokumen</span></div>';
    var byY = {}; rows.forEach(function (a) { var y = yr(a); byY[y] = (byY[y] || 0) + 1; });
    $('bank-charts').innerHTML = '<div class="bars">' + card('Komposisi kategori', donut([{ l: 'Kegiatan DPA', v: nd, c: 'var(--p2)' }, { l: 'Jemput bola', v: nj, c: 'var(--p3)' }], rows.length, 'kegiatan')) + '</div><div class="bars">' +
      card('Kegiatan per tahun', columns(Object.keys(byY).sort().map(function (y) { return { l: y, v: byY[y], s: byY[y] + ' kegiatan' }; }), 1)) + '</div>';
    if (!rows.length) { $('bank-table').innerHTML = '<div class="empty" style="border:0">Tidak ada kegiatan yang cocok dengan saringan.</div>'; return; }
    $('bank-table').innerHTML = '<table class="bank"><thead><tr><th>Tanggal</th><th>Kegiatan</th><th>Kategori</th><th>Bidang</th><th>Dokumen</th><th>Rincian</th><th></th></tr></thead><tbody>' +
      rows.map(function (a) {
        var i = info(a), bd = BD(a.b);
        return '<tr><td class="mono">' + fmtDate(a.date) + '</td>' +
          '<td><div class="kegtop"><strong>' + esc(a.name) + '</strong><span class="note">' + esc(TP(a.k).n) + '</span>' + tagsHtml(a.tags) + '</div></td>' +
          '<td><span class="tag' + (a.j === 'dpa' ? ' dpa' : '') + '">' + KATN[a.j] + '</span></td>' +
          '<td><span class="dotl" style="--c:' + cv(bd.c) + '"><i class="dot"></i>' + esc(bd.n) + '</span></td>' +
          '<td class="mono">' + i.d + '/' + i.t + ' · ' + i.pct + '%</td>' +
          '<td>' + rinText(a) + '</td>' +
          '<td><button class="btn ghost small" type="button" data-act="bank-open" data-id="' + a.id + '">Buka</button></td></tr>';
      }).join('') + '</tbody></table>';
  }
  function csvCell(v) { var t = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return '"' + t.replace(/"/g, '""') + '"'; }
  function csvText() {
    var head = ['Kategori', 'Kegiatan', 'Bidang', 'Jenis kegiatan', 'Tanggal', 'Tahun', 'Status dokumen', 'Dokumen lengkap', 'Total dokumen', 'Status DPA', 'Program/sub kegiatan', 'Pagu (Rp)', 'Realisasi (Rp)', 'PPTK', 'Lokasi', 'Petugas/tim', 'Target sasaran', 'Terlayani', 'Catatan', 'Tagging'];
    var lines = [head].concat(bankRows().map(function (a) {
      var i = info(a), d = a.j === 'dpa';
      return [KATN[a.j], a.name, BD(a.b).n, TP(a.k).n, a.date, yr(a), ST[i.st], i.d, i.t, d ? DS[a.ds] : '', a.sub, d ? a.pagu : '', d ? a.real : '', a.pptk, a.loc, a.ptg, d ? '' : a.sas, d ? '' : a.ter, a.cat, tagNames(a)];
    }));
    return '﻿' + lines.map(function (r) { return r.map(csvCell).join(';'); }).join('\r\n');
  }
  function exportCsv() {
    try {
      var blob = new Blob([csvText()], { type: 'text/csv;charset=utf-8' });
      var url = URL.createObjectURL(blob), el = document.createElement('a');
      el.href = url; el.download = 'bank-data-kegiatan-' + iso(0) + '.csv';
      document.body.appendChild(el); el.click();
      setTimeout(function () { document.body.removeChild(el); URL.revokeObjectURL(url); }, 500);
    } catch (e) { toast('Unduhan tidak didukung di browser ini'); }
  }

  /* ---------- sambungan ke Google Sheets & Drive ---------- */
  var pending = {}, timers = {}, inflight = 0, failed = false;
  function setSync(cls, txt) { $('sync').className = 'sync ' + cls; $('sync-t').textContent = txt; }
  function refreshSync() {
    if (!REMOTE) return;
    if (ui.offline) setSync('err', 'Offline (hanya baca)');
    else if (failed) setSync('err', 'Gagal menyimpan, coba lagi');
    else if (inflight || Object.keys(pending).length) setSync('busy', 'Menyimpan…');
    else setSync('ok', auth ? 'Tersimpan di Google Sheets' : 'Mode lihat saja (belum masuk)');
  }
  function api(payload) {
    if (!navigator.onLine) return Promise.reject(new Error('offline'));
    if (auth) payload.token = auth.t;
    return fetch(apiUrl(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload), credentials: 'omit', referrerPolicy: 'no-referrer' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j && j.error === 'unauthorized') { sesiHabis(); throw new Error('unauthorized'); }
        if (j && j.error === 'login_required') { showLogin('Silakan masuk untuk membuka data.'); throw new Error('unauthorized'); }
        if (j && j.error === 'must_change') { openAcct(true); throw new Error('must_change'); }
        if (j && j.error === 'forbidden') { toast('Peran Anda tidak diizinkan melakukan ini'); throw new Error('forbidden'); }
        if (!j || !j.ok) throw new Error((j && j.error) || 'Gagal');
        return j;
      });
  }
  var QUIET = ['unauthorized', 'must_change', 'forbidden'];
  function onFail(e) { if (QUIET.indexOf(e.message) < 0) { failed = true; toast(e.message === 'offline' ? 'Anda sedang offline, perubahan tidak tersimpan' : 'Gagal menyimpan ke Google Sheets (' + (e.message || 'galat') + ')'); } }
  function findAct(id) { return state.acts.filter(function (x) { return x.id === id; })[0]; }
  function num0(v) { return Math.max(0, Math.round(+v || 0)); }
  function normAct(a) {
    var tp = TP(String(a.k || '')), j = (a.j === 'jb' || a.j === 'dpa') ? a.j : (tp.kat === 'jb' ? 'jb' : 'dpa');
    return {
      id: String(a.id), name: String(a.name || ''), j: j, b: String(a.b || ''), k: String(a.k || ''), date: a.date || iso(0), sample: !!a.sample,
      th: num0(a.th), sub: str(a.sub, 160), pagu: num0(a.pagu), real: num0(a.real), pptk: str(a.pptk, 100), ds: DS[a.ds] ? a.ds : (j === 'dpa' ? 'usulan' : ''),
      loc: str(a.loc, 160), sas: num0(a.sas), ter: num0(a.ter), ptg: str(a.ptg, 120), cat: str(a.cat, 400),
      tags: (Array.isArray(a.tags) ? a.tags : []).map(String).filter(function (v, n, arr) { return arr.indexOf(v) === n && cfg.tags.some(function (t) { return t.id === v; }); }),
      docs: (a.docs || []).map(function (d) { return { t: String(d.t || ''), d: !!d.d, f: d.f && d.f.url ? d.f : null }; })
    };
  }
  function applyList(j, cached) {
    if (j.cfg) { cfg = normCfg(j.cfg); saveCfgLocal(); if (!ui.dirty) newDraft(); }
    state.acts = j.acts.map(normAct);
    inov = (j.inov || []).map(normInov);
    jbp = (j.jbl || []).map(normJb);
    ikd = (j.ikd || []).map(normIkd);
    ui.srvIkd = (j.ikdv || 0) >= 2;
    myMenu = Array.isArray(j.menu) ? j.menu : null; menuOrder = normOrder(j.urut);
    publik = j.publik !== false;
    if (!cached) {
      if (auth && j.sesi === false) { sesiHabis(true); }
      else if (auth && j.me) { auth.me = j.me; saveAuth(auth); }
    }
    ui.loadErr = ''; failed = false;
    applyTabs();
    if (!Object.keys(ui.open).length && state.acts.length) ui.open[state.acts[0].id] = true;
    refreshSync(); applyRole(); rebuildAll();
    if (ui.tab === 'set' && !ui.dirty) renderSettings();
  }
  function showOffline(on, t) {
    ui.offline = !!on;
    $('offline').hidden = !on;
    if (on) $('off-t').textContent = 'Anda sedang offline. Data terakhir (' + (t ? new Date(t).toLocaleString('id-ID') : 'tersimpan') + ') ditampilkan dan hanya bisa dibaca.';
    refreshSync(); lockUI();
  }
  function pull() {
    setSync('busy', 'Memuat dari Google Sheets…');
    return api({ action: 'list' }).then(function (j) {
      showOffline(false);
      applyList(j, false);
      try { var c = JSON.stringify({ t: Date.now(), data: { cfg: j.cfg, acts: j.acts, inov: j.inov, jbl: j.jbl, ikd: j.ikd, menu: j.menu, urut: j.urut, publik: j.publik } }); if (c.length < 4500000) lsSet(CACHEK, c); } catch (x) {}
    }).catch(function (e) {
      if (QUIET.indexOf(e.message) > -1) return;
      var netDown = e.message === 'offline' || e.name === 'TypeError';
      var c = null;
      try { c = JSON.parse(lsGet(CACHEK) || 'null'); } catch (x) {}
      if (netDown && c && c.data) { applyList(c.data, true); showOffline(true, c.t); return; }
      ui.loadErr = netDown ? 'Tidak ada koneksi ke server dan belum ada data tersimpan di perangkat ini.' : 'Tidak bisa memuat data (' + e.message + '). Periksa koneksi di tab Pengaturan, lalu klik Muat ulang.';
      setSync('err', 'Gagal memuat'); renderAll();
    });
  }
  function push(a) {
    if (!REMOTE) return;
    failed = false; pending[a.id] = true; refreshSync();
    clearTimeout(timers[a.id]);
    timers[a.id] = setTimeout(function () {
      var cur = findAct(a.id);
      delete pending[a.id];
      if (!cur) { refreshSync(); return; }
      inflight++;
      api({ action: 'upsert', act: cur }).catch(onFail).then(function () { inflight--; refreshSync(); });
    }, 600);
  }
  function pushDel(id) {
    if (!REMOTE) return;
    clearTimeout(timers[id]); delete pending[id]; inflight++; refreshSync();
    api({ action: 'delete', id: id }).catch(onFail).then(function () { inflight--; refreshSync(); });
  }
  function idle() { return !inflight && !Object.keys(pending).length && !Object.keys(ui.busy).length; }
  function uploadFile(a, n, file) {
    if (!file) return;
    if (file.size > maxMb() * 1024 * 1024) { toast('File terlalu besar (maks ' + maxMb() + ' MB)'); return; }
    var k = a.id + ':' + n;
    ui.busy[k] = true; renderList();
    var fr = new FileReader();
    fr.onerror = function () { delete ui.busy[k]; renderList(); toast('File tidak bisa dibaca'); };
    fr.onload = function () {
      var data = String(fr.result).split(',')[1] || '';
      api({ action: 'upload', actId: a.id, actName: a.name, docNo: n + 1, docTitle: a.docs[n] ? a.docs[n].t : '', name: file.name, mime: file.type, data: data })
        .then(function (j) {
          var cur = findAct(a.id) || a;
          if (cur.docs[n]) { cur.docs[n].f = j.file; cur.docs[n].d = true; }
          push(cur); toast('File tersimpan di Google Drive');
        })
        .catch(function (e) { if (QUIET.indexOf(e.message) < 0) toast('Gagal mengunggah: ' + e.message); })
        .then(function () { delete ui.busy[k]; renderAll(); });
    };
    fr.readAsDataURL(file);
  }

  /* ---------- menu Pengaturan ---------- */
  var draft = null;
  function newDraft() {
    draft = JSON.parse(JSON.stringify(cfg));
    draft.tipe.forEach(function (t) { t.docsText = t.docs.join('\n'); });
    ui.dirty = false;
  }
  function setMsg(text, cls) { var m = $('s-msg2'); if (m) { m.className = 'note ' + (cls || ''); m.textContent = text; } }

  function setNavHtml() {
    var items = [['conn', 'Koneksi'], ['ident', 'Identitas'], ['bidang', 'Bidang'], ['tipe', 'Jenis &amp; dokumen'], ['ideas', 'Bank ide'], ['log', 'Riwayat']];
    $('set-nav').innerHTML = items.map(function (x) {
      return '<button class="chip" type="button" data-act="sset" data-s="' + x[0] + '" aria-pressed="' + (ui.sset === x[0]) + '">' + x[1] + '</button>';
    }).join('');
  }

  function secConn() {
    return '<div class="panel"><h2>Koneksi</h2>' +
      '<p class="note" style="margin:0">Data tersimpan di Google Sheets dan dokumen di Google Drive. Alamat server juga bisa diisi permanen di berkas config.js supaya semua pengguna langsung tersambung.</p>' +
      '<div class="fgrid"><label class="f full" for="s-url">URL Web App Apps Script (berakhiran /exec)<input type="text" id="s-url" value="' + esc(apiUrl()) + '" placeholder="https://script.google.com/macros/s/.../exec" autocomplete="off" spellcheck="false"></label>' +
      '<label class="f" for="s-max">Batas ukuran file (MB)<input type="number" id="s-max" min="1" max="30" value="' + maxMb() + '"></label></div>' +
      '<div class="row-btns"><button class="btn" type="button" data-act="s-conn">Simpan dan uji koneksi</button><button class="btn ghost" type="button" data-act="s-invite">Buat tautan undangan</button></div>' +
      '<div id="s-msg" class="note" role="status"></div><div id="s-invite"></div>' +
      '<p class="note" style="margin:0">Tautan undangan hanya berisi alamat server, tanpa kata sandi. Batas ukuran file di server diatur di Code.gs (MAKS_MB).</p></div>';
  }
  function pwGen() {
    var A = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ', N = '23456789', out = '', r = new Uint32Array(12);
    (window.crypto || window.msCrypto).getRandomValues(r);
    for (var i = 0; i < 12; i++) out += (i === 4 || i === 9 ? N : A + N).charAt(r[i] % (i === 4 || i === 9 ? N.length : A.length + N.length));
    return out;
  }
  function menuChecks(cls, sel) {
    return '<div class="chks">' + MENUS.map(function (m) {
      return '<label class="chk"><input type="checkbox" class="' + cls + '" data-m="' + m[0] + '"' + (!sel || sel.indexOf(m[0]) >= 0 ? ' checked' : '') + '> ' + esc(m[1]) + '</label>';
    }).join('') + '</div>';
  }
  function menuSummary(menu, admin) {
    if (admin) return 'semua menu (admin)';
    if (!menu) return 'semua menu';
    return menu.map(menuLabel).join(', ');
  }
  function menuPanel(key, menu, extra) {
    return '<div class="mpanel"><div><b>Menu yang boleh dilihat</b><div class="note">' + (extra || 'Pengaturan dan Akun hanya untuk admin.') + '</div></div>' + menuChecks('um-c', menu) +
      '<div class="row-btns"><button class="btn small" type="button" data-act="um-save" data-u="' + esc(key) + '">Simpan akses</button><button class="btn ghost small" type="button" data-act="um-all">Pilih semua</button><button class="btn ghost small" type="button" data-act="um-no">Batal</button></div></div>';
  }
  function secUsers() {
    var h = '<div class="panel"><h2>Daftar akun</h2><p class="note" style="margin:0">Admin: semua fitur, termasuk Pengaturan dan Akun. Editor: menambah dan mengubah data. Pembaca: hanya melihat setelah masuk. Untuk tiap akun, pilih menu mana saja yang boleh dilihat. Kata sandi sementara wajib diganti pengguna saat masuk pertama kali.</p>';
    if (!ui.users) return h + '<p class="note">Memuat daftar akun…</p></div>';
    h += '<div class="rin"><div class="srow2" style="flex-wrap:wrap"><div style="flex:1 1 200px;min-width:0"><b>Tamu (belum masuk)</b><div class="note">Menu: ' + esc(menuSummary(ui.gm, false)) + '. Tamu hanya bisa melihat; nama dan NIP pegawai tidak pernah terlihat.</div></div>' +
      '<button class="btn ghost small" type="button" data-act="u-menu" data-u="_tamu">Atur menu</button></div>' +
      (ui.umenu === '_tamu' ? menuPanel('_tamu', ui.gm, 'Menu apa saja yang terlihat tanpa login.') : '') + '</div>';
    h += ui.users.map(function (u) {
      var self = auth && auth.me.u === u.u, st = u.kunci ? 'Terkunci' : (u.aktif ? 'Aktif' : 'Nonaktif');
      var dU = ' data-u="' + esc(u.u) + '"', adm = u.peran === 'admin';
      return '<div class="rin"><div class="srow2" style="flex-wrap:wrap"><div style="flex:1 1 200px;min-width:0"><b>' + esc(u.nama) + '</b><div class="note">' + esc(u.u) + (self ? ' (Anda)' : '') + ' · masuk terakhir: ' + (u.terakhir ? esc(new Date(u.terakhir).toLocaleString('id-ID')) : 'belum pernah') + '</div><div class="note">Menu: ' + esc(menuSummary(u.menu, adm)) + '</div></div>' +
        '<select data-act="u-role"' + dU + ' aria-label="Peran ' + esc(u.u) + '"' + (self ? ' disabled' : '') + '>' + Object.keys(ROLES).map(function (r) { return '<option value="' + r + '"' + (r === u.peran ? ' selected' : '') + '>' + ROLES[r] + '</option>'; }).join('') + '</select>' +
        '<span class="pill ' + (u.aktif && !u.kunci ? 'selesai' : 'terlambat') + '">' + st + '</span>' +
        (adm ? '' : '<button class="btn ghost small" type="button" data-act="u-menu"' + dU + '>Atur menu</button>') +
        '<button class="btn ghost small" type="button" data-act="u-toggle"' + dU + (self ? ' disabled' : '') + '>' + (u.aktif ? 'Nonaktifkan' : 'Aktifkan') + '</button>' +
        '<button class="btn ghost small" type="button" data-act="u-reset"' + dU + '>Setel ulang sandi</button></div>' +
        (ui.umenu === u.u && !adm ? menuPanel(u.u, u.menu) : '') +
        (ui.ureset === u.u ? '<div class="adddoc" style="margin-top:8px;max-width:none"><input type="text" id="ur-pw" autocomplete="off" spellcheck="false" placeholder="Kata sandi sementara" aria-label="Kata sandi sementara"><button class="btn ghost small" type="button" data-act="u-gen2">Buat acak</button><button class="btn small" type="button" data-act="u-reset-go"' + dU + '>Simpan</button><button class="btn ghost small" type="button" data-act="u-reset-no">Batal</button></div>' : '') + '</div>';
    }).join('');
    h += '<div class="subh">Tambah akun</div><div class="fgrid">' +
      '<label class="f" for="au-user">Nama pengguna<input type="text" id="au-user" maxlength="32" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="huruf kecil, angka, titik"></label>' +
      '<label class="f" for="au-nama">Nama lengkap<input type="text" id="au-nama" maxlength="60" autocomplete="off"></label>' +
      '<label class="f" for="au-peran">Peran<select id="au-peran"><option value="editor">Editor</option><option value="viewer">Pembaca</option><option value="admin">Admin</option></select></label>' +
      '<label class="f" for="au-pw">Kata sandi sementara<input type="text" id="au-pw" maxlength="100" autocomplete="off" spellcheck="false" placeholder="min. 10, huruf dan angka"></label>' +
      '<div class="f full"><span>Menu yang boleh dilihat (diabaikan untuk admin)</span>' + menuChecks('am-c', null) + '</div></div>' +
      '<div class="row-btns"><button class="btn ghost" type="button" data-act="u-gen">Buat kata sandi acak</button><button class="btn" type="button" data-act="u-add">Tambah akun</button></div>' +
      '<div id="u-msg" class="note" role="status"></div></div>';
    return h;
  }
  function secOrder() {
    return '<div class="panel"><h2>Urutan menu</h2><p class="note" style="margin:0">Atur urutan tab untuk semua pengguna. Tab Akun dan Pengaturan selalu di paling kanan.</p>' +
      menuOrder.map(function (k, n) {
        return '<div class="mrow"><span class="no">' + (n + 1) + '</span><span class="nm">' + esc(menuLabel(k)) + '</span>' +
          '<button class="btn ghost small" type="button" data-act="mn-up" data-m="' + k + '"' + (n === 0 ? ' disabled' : '') + ' aria-label="Naikkan ' + esc(menuLabel(k)) + '">▲</button>' +
          '<button class="btn ghost small" type="button" data-act="mn-dn" data-m="' + k + '"' + (n === menuOrder.length - 1 ? ' disabled' : '') + ' aria-label="Turunkan ' + esc(menuLabel(k)) + '">▼</button></div>';
      }).join('') +
      '<div class="row-btns"><button class="btn ghost" type="button" data-act="mn-reset">Kembalikan urutan standar</button></div></div>';
  }
  function renderUsers() {
    var b = $('akun-body'); if (!b || ui.tab !== 'akun') return;
    b.innerHTML = secUsers() + secOrder();
  }
  function saveOrder() {
    applyTabs(); renderUsers();
    api({ action: 'menuset', order: menuOrder }).then(function (j) { menuOrder = normOrder(j.urut); }).catch(onFail);
  }
  function secLog() {
    var h = '<div class="panel"><h2>Riwayat aktivitas</h2><p class="note" style="margin:0">200 catatan terakhir: siapa masuk, mengubah, mengunggah, dan percobaan masuk yang gagal.</p>';
    if (!ui.logs) return h + '<p class="note">Memuat…</p></div>';
    if (!ui.logs.length) return h + '<p class="note">Belum ada catatan.</p></div>';
    return h + '<div class="tablewrap"><table class="bank" style="min-width:640px"><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Objek</th><th>Keterangan</th></tr></thead><tbody>' +
      ui.logs.map(function (x) { return '<tr><td class="mono">' + esc(new Date(x.t).toLocaleString('id-ID')) + '</td><td>' + esc(x.u) + '</td><td>' + esc(String(x.a).replace(/_/g, ' ')) + '</td><td class="mono">' + esc(x.o) + '</td><td>' + esc(x.k) + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
  }
  function loadUsers() {
    ui.users = null; renderUsers();
    api({ action: 'users' }).then(function (j) { ui.users = j.users; ui.gm = Array.isArray(j.gm) ? j.gm : null; if (j.urut) menuOrder = normOrder(j.urut); renderUsers(); })
      .catch(function (e) { if (QUIET.indexOf(e.message) < 0) toast('Gagal memuat pengguna: ' + e.message); });
  }
  function loadLog() {
    ui.logs = null; renderSettings();
    api({ action: 'log' }).then(function (j) { ui.logs = j.log; if (ui.tab === 'set' && ui.sset === 'log') renderSettings(); })
      .catch(function (e) { if (QUIET.indexOf(e.message) < 0) toast('Gagal memuat riwayat: ' + e.message); });
  }
  function userCall(payload, okMsg) {
    return api(payload).then(function (j) { ui.users = j.users; ui.ureset = null; ui.umenu = null; renderUsers(); toast(okMsg); })
      .catch(function (e) { if (QUIET.indexOf(e.message) < 0) { var m = $('u-msg'); if (m) { m.className = 'note err'; m.textContent = e.message; } toast(e.message); } else renderUsers(); });
  }
  function secIdent() {
    return '<div class="panel"><h2>Identitas</h2><div class="fgrid">' +
      '<label class="f full" for="d-instansi">Nama instansi<input type="text" id="d-instansi" data-s="top" data-k="instansi" value="' + esc(draft.instansi) + '" maxlength="120"></label>' +
      '<label class="f full" for="d-judul">Judul dashboard<input type="text" id="d-judul" data-s="top" data-k="judul" value="' + esc(draft.judul) + '" maxlength="80"></label></div></div>';
  }
  function colorOpts(sel) { var h = ''; for (var c = 1; c <= 8; c++) h += '<option value="' + c + '"' + (c === sel ? ' selected' : '') + '>' + PALN[c] + '</option>'; return h; }
  function secBidang() {
    return '<div class="panel"><h2>Bidang</h2><p class="note" style="margin:0">Sesuaikan dengan struktur organisasi di daerah Anda. Bidang yang masih dipakai kegiatan atau ide tidak bisa dihapus.</p>' +
      draft.bidang.map(function (b, i) {
        return '<div class="srow"><span class="cwrap" style="--c:' + cv(b.c) + '"><i class="dot"></i><select data-s="bidang" data-i="' + i + '" data-k="c" aria-label="Warna">' + colorOpts(b.c) + '</select></span>' +
          '<input type="text" data-s="bidang" data-i="' + i + '" data-k="n" value="' + esc(b.n) + '" placeholder="Nama bidang" aria-label="Nama bidang" maxlength="80">' +
          '<input type="text" data-s="bidang" data-i="' + i + '" data-k="s" value="' + esc(b.s) + '" placeholder="Tugas pokok singkat" aria-label="Tugas pokok singkat" maxlength="160">' +
          '<button class="btn danger small" type="button" data-act="s-del" data-s="bidang" data-i="' + i + '">Hapus</button></div>';
      }).join('') +
      '<div><button class="btn ghost small" type="button" data-act="s-add" data-s="bidang">+ Tambah bidang</button></div></div>';
  }
  function tipeBlock(t, i) {
    return '<div class="panel"><div class="srow2"><input type="text" data-s="tipe" data-i="' + i + '" data-k="n" value="' + esc(t.n) + '" placeholder="Nama jenis kegiatan" aria-label="Nama jenis kegiatan" maxlength="80">' +
      '<select data-s="tipe" data-i="' + i + '" data-k="kat" aria-label="Kategori"><option value="dpa"' + (t.kat === 'dpa' ? ' selected' : '') + '>Kegiatan DPA</option><option value="jb"' + (t.kat === 'jb' ? ' selected' : '') + '>Jemput bola</option></select>' +
      '<button class="btn danger small" type="button" data-act="s-del" data-s="tipe" data-i="' + i + '">Hapus</button></div>' +
      '<label class="f">Dokumen yang perlu dilengkapi (satu dokumen per baris)<textarea rows="7" data-s="tipe" data-i="' + i + '" data-k="docsText">' + esc(t.docsText) + '</textarea></label></div>';
  }
  function secTipe() {
    var h = '<p class="note" style="margin:0">Jenis kegiatan dikelompokkan menurut kategori, dan tiap jenis punya daftar dokumen sendiri. Perubahan hanya berlaku untuk kegiatan yang dibuat sesudahnya. Kegiatan yang sudah ada tetap memakai daftar lamanya.</p>';
    [['dpa', 'Kegiatan DPA'], ['jb', 'Jemput bola']].forEach(function (g) {
      h += '<h3 style="font-size:1.05rem;margin-top:4px">' + g[1] + '</h3>';
      draft.tipe.forEach(function (t, i) { if (t.kat === g[0]) h += tipeBlock(t, i); });
      h += '<div><button class="btn ghost small" type="button" data-act="s-add" data-s="tipe" data-kat="' + g[0] + '">+ Tambah jenis untuk ' + g[1] + '</button></div>';
    });
    return h;
  }
  function secIdeas() {
    var filt = '<label class="f" style="max-width:320px">Tampilkan bidang<select data-s="filt"><option value="all">Semua bidang</option>' + opts(draft.bidang, ui.sib) + '</select></label>';
    var cards = draft.ideas.map(function (x, i) { return { x: x, i: i }; }).filter(function (o) { return ui.sib === 'all' || o.x.b === ui.sib; }).map(function (o) {
      var x = o.x, i = o.i;
      return '<div class="panel"><div class="srow2"><input type="text" data-s="ideas" data-i="' + i + '" data-k="t" value="' + esc(x.t) + '" placeholder="Judul ide kegiatan" aria-label="Judul ide" maxlength="160">' +
        '<button class="btn danger small" type="button" data-act="s-del" data-s="ideas" data-i="' + i + '">Hapus</button></div>' +
        '<div class="fgrid"><label class="f">Bidang<select data-s="ideas" data-i="' + i + '" data-k="b">' + opts(draft.bidang, x.b) + '</select></label>' +
        '<label class="f">Jenis kegiatan<select data-s="ideas" data-i="' + i + '" data-k="k">' + optsT(draft.tipe, x.k) + '</select></label></div>' +
        '<label class="f">Penjelasan singkat<textarea rows="2" data-s="ideas" data-i="' + i + '" data-k="d" maxlength="400">' + esc(x.d) + '</textarea></label>' +
        '<div class="f"><span>Tagging</span><div class="chips">' + tagPicker(x.tg || [], 'idea', i) + '</div></div></div>';
    }).join('');
    return '<div class="row-btns" style="align-items:flex-end;justify-content:space-between">' + filt +
      '<button class="btn ghost small" type="button" data-act="s-add" data-s="ideas">+ Tambah ide</button></div>' +
      (cards || '<div class="empty">Belum ada ide untuk bidang ini.</div>');
  }
  function renderSettings() {
    if (!draft) newDraft();
    setNavHtml();
    var h;
    if (ui.sset === 'conn') h = secConn();
    else if (ui.sset === 'log') h = secLog();
    else {
      h = ui.sset === 'ident' ? secIdent() : ui.sset === 'bidang' ? secBidang() : ui.sset === 'tipe' ? secTipe() : secIdeas();
      h += '<div class="setbar"><button class="btn" type="button" data-act="s-save">Simpan pengaturan</button>' +
        '<button class="btn ghost" type="button" data-act="s-cancel">Batalkan perubahan</button>' +
        '<button class="btn ghost" type="button" data-act="s-reset">Muat isi bawaan</button></div>' +
        '<div id="s-msg2" class="note" role="status"></div>';
    }
    $('set-body').innerHTML = h;
  }

  function onSetInput(e) {
    var el = e.target, s = el.getAttribute && el.getAttribute('data-s');
    if (!s) return;
    var k = el.getAttribute('data-k'), v = el.value;
    if (s === 'filt') { ui.sib = v; renderSettings(); return; }
    ui.dirty = true;
    if (s === 'top') { draft[k] = v; return; }
    var item = draft[s][+el.getAttribute('data-i')];
    if (!item) return;
    item[k] = k === 'c' ? +v : v;
    if (k === 'c' && el.parentNode) el.parentNode.style.setProperty('--c', cv(+v));
    if (s === 'tipe' && k === 'kat') renderSettings();
  }

  function usedBy(kind, id) {
    var f = kind === 'bidang' ? 'b' : 'k';
    return [state.acts.filter(function (a) { return a[f] === id; }).length, draft.ideas.filter(function (x) { return x[f] === id; }).length, kind === 'bidang' ? inov.filter(function (v) { return v.b === id; }).length : 0, jbp.filter(function (v) { return v[f] === id; }).length];
  }
  function setAdd(s, kat) {
    ui.dirty = true;
    if (s === 'bidang') draft.bidang.push({ id: uid('b'), n: '', s: '', c: (draft.bidang.length % 8) + 1 });
    else if (s === 'tipe') draft.tipe.push({ id: uid('t'), n: '', kat: kat === 'jb' ? 'jb' : 'dpa', docs: [], docsText: '' });
    else { ui.sib = 'all'; draft.ideas.unshift({ id: uid('i'), b: draft.bidang[0].id, t: '', k: draft.tipe[0].id, d: '', tg: [] }); }
    renderSettings();
    var sel = s === 'ideas' ? '[data-s="ideas"][data-i="0"][data-k="t"]' : '[data-s="' + s + '"][data-i="' + (draft[s].length - 1) + '"][data-k="n"]';
    var f = document.querySelector(sel);
    if (f) f.focus();
  }
  function setDel(s, i) {
    if (s === 'ideas') { draft.ideas.splice(i, 1); ui.dirty = true; renderSettings(); return; }
    var it = draft[s][i];
    if (s === 'bidang' && draft.bidang.length <= 1) { setMsg('Minimal harus ada satu bidang.', 'err'); return; }
    if (s === 'tipe' && draft.tipe.filter(function (t) { return t.kat === it.kat; }).length <= 1) { setMsg('Setiap kategori minimal punya satu jenis kegiatan.', 'err'); return; }
    var u = usedBy(s, it.id);
    if (u[0] || u[1] || u[2] || u[3]) { setMsg('Masih dipakai ' + u[0] + ' kegiatan, ' + u[1] + ' ide, ' + u[2] + ' inovasi, dan ' + u[3] + ' catatan jemput bola. Pindahkan dulu ke yang lain.', 'err'); return; }
    draft[s].splice(i, 1); ui.dirty = true; renderSettings();
  }

  function saveSettings() {
    var o = { instansi: draft.instansi.trim(), judul: draft.judul.trim() };
    if (!o.judul) { setMsg('Judul dashboard tidak boleh kosong.', 'err'); return; }
    if (!o.instansi) { setMsg('Nama instansi tidak boleh kosong.', 'err'); return; }
    var i;
    for (i = 0; i < draft.bidang.length; i++) if (!draft.bidang[i].n.trim()) { ui.sset = 'bidang'; renderSettings(); setMsg('Ada bidang tanpa nama. Isi atau hapus.', 'err'); return; }
    for (i = 0; i < draft.tipe.length; i++) if (!draft.tipe[i].n.trim()) { ui.sset = 'tipe'; renderSettings(); setMsg('Ada jenis kegiatan tanpa nama. Isi atau hapus.', 'err'); return; }
    o.bidang = draft.bidang.map(function (b) { return { id: b.id, n: b.n.trim(), s: b.s.trim(), c: b.c }; });
    o.tipe = draft.tipe.map(function (t) {
      return { id: t.id, n: t.n.trim(), kat: t.kat === 'jb' ? 'jb' : 'dpa', docs: String(t.docsText || '').split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean) };
    });
    if (!o.tipe.some(function (t) { return t.kat === 'dpa'; }) || !o.tipe.some(function (t) { return t.kat === 'jb'; })) {
      ui.sset = 'tipe'; renderSettings(); setMsg('Setiap kategori (Kegiatan DPA dan Jemput bola) minimal punya satu jenis kegiatan.', 'err'); return;
    }
    o.tags = cfg.tags.map(function (t) { return { id: t.id, n: t.n, c: t.c }; });
    o.ideas = draft.ideas.filter(function (x) { return x.t.trim(); }).map(function (x) { return { id: x.id, b: x.b, t: x.t.trim(), k: x.k, d: x.d.trim(), tg: (x.tg || []).slice() }; });
    var bid = o.bidang.map(function (b) { return b.id; }), tid = o.tipe.map(function (t) { return t.id; });
    var bad = state.acts.filter(function (a) { return bid.indexOf(a.b) < 0 || tid.indexOf(a.k) < 0; });
    if (bad.length) { setMsg(bad.length + ' kegiatan masih memakai bidang atau jenis yang tidak ada lagi (contoh: "' + bad[0].name + '"). Pertahankan bidang dan jenis itu.', 'err'); return; }
    var badJ = jbp.filter(function (v) { return bid.indexOf(v.b) < 0; });
    if (badJ.length) { setMsg(badJ.length + ' catatan jemput bola masih memakai bidang yang tidak ada lagi (contoh: "' + badJ[0].name + '"). Pertahankan bidang itu.', 'err'); return; }
    var badI = inov.filter(function (v) { return bid.indexOf(v.b) < 0; });
    if (badI.length) { setMsg(badI.length + ' inovasi masih memakai bidang yang tidak ada lagi (contoh: "' + badI[0].name + '"). Pertahankan bidang itu.', 'err'); return; }
    cfg = normCfg(o);
    saveCfgLocal();
    newDraft();
    rebuildAll();
    renderSettings();
    if (REMOTE) {
      failed = false; inflight++; refreshSync();
      api({ action: 'setcfg', cfg: cfg }).then(function () { toast('Pengaturan disimpan di Google Sheets'); })
        .catch(function (e) { onFail(e); toast('Tersimpan di browser ini, tetapi gagal ke Google Sheets'); })
        .then(function () { inflight--; refreshSync(); });
    } else toast('Pengaturan disimpan');
  }

  function testUrl(url, msg, done) {
    if (!/^https:\/\/script\.google\.com\/.+\/exec$/.test(url)) { msg.className = 'note err'; msg.textContent = 'URL tidak valid. Harus diawali https://script.google.com dan berakhiran /exec.'; return; }
    msg.className = 'note'; msg.textContent = 'Menguji koneksi…';
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'ping' }), credentials: 'omit', referrerPolicy: 'no-referrer' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || !j.ok) { msg.className = 'note err'; msg.textContent = 'Server menjawab: ' + ((j && j.error) || 'tidak dikenal'); return; }
        done();
      })
      .catch(function () { msg.className = 'note err'; msg.textContent = 'Tidak bisa terhubung. Periksa URL dan pastikan deployment memberi akses "Anyone".'; });
  }
  function connSave() {
    var url = $('s-url').value.trim(), mx = parseInt($('s-max').value, 10) || 10, msg = $('s-msg');
    testUrl(url, msg, function () {
      lsSet('dukcapil-api', url); lsSet('dukcapil-max', String(Math.min(30, Math.max(1, mx))));
      msg.className = 'note good'; msg.textContent = 'Terhubung. Memuat ulang…';
      setTimeout(function () { location.reload(); }, 700);
    });
  }
  function makeInvite() {
    var link = location.origin + location.pathname + '#setup=' + btoa(apiUrl()).replace(/\+/g, '-').replace(/\//g, '_');
    $('s-invite').innerHTML = '<label class="f" for="s-link">Tautan undangan<input type="text" id="s-link" readonly value="' + esc(link) + '"></label>';
    var inp = $('s-link'); inp.focus(); inp.select();
    try { navigator.clipboard.writeText(link).then(function () { toast('Tautan disalin'); }, function () {}); } catch (e) {}
  }

  /* ---------- login, akun, peran ---------- */
  var SAFE = ['open', 'ichip', 'ikat', 'ivs', 'iv-open', 'jb-open', 'jb-close', 'jbdoc', 'tg-view', 'tg-viewi', 'tg-viewj', 'bank-open', 'goto-tag', 'sset', 'ikd-peg', 'ikd-pclose'];
  function readOnly() { return !canEdit() || !!ui.offline; }
  function lockUI() {
    var ro = readOnly();
    document.body.classList.toggle('ro', ro);
    var marked = document.querySelectorAll('[data-ro]');
    if (!ro) {
      for (var i = 0; i < marked.length; i++) { marked[i].disabled = false; marked[i].removeAttribute('data-ro'); }
      var hid = document.querySelectorAll('[data-rohide]');
      for (var j = 0; j < hid.length; j++) { hid[j].hidden = false; hid[j].removeAttribute('data-rohide'); }
      return;
    }
    var f = document.querySelectorAll('.act-body input, .act-body select, .act-body textarea, .mpad input, .mpad select, .mpad textarea, #view-tag input, #view-tag select, #form input, #form select, #form textarea');
    for (var k = 0; k < f.length; k++) if (!f[k].disabled && f[k].closest('#login-modal, #acct-modal') === null) { f[k].disabled = true; f[k].setAttribute('data-ro', '1'); }
    var b = document.querySelectorAll('button[data-act]');
    for (var m = 0; m < b.length; m++) {
      if (SAFE.indexOf(b[m].getAttribute('data-act')) < 0 && b[m].closest('#login-modal, #acct-modal') === null && !b[m].hidden) { b[m].hidden = true; b[m].setAttribute('data-rohide', '1'); }
    }
  }
  var lockQ = 0;
  function lockSoon() { if (lockQ) return; lockQ = requestAnimationFrame(function () { lockQ = 0; lockUI(); }); }
  function applyRole() {
    var li = !!auth;
    $('btn-login').hidden = li; $('btn-acct').hidden = !li;
    if (li) { $('btn-acct').textContent = ''; var nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = auth.me.nama + ' · ' + (ROLES[auth.me.peran] || ''); var ini = document.createElement('span'); ini.className = 'ini'; ini.textContent = (auth.me.nama || '?').charAt(0).toUpperCase(); $('btn-acct').appendChild(ini); $('btn-acct').appendChild(nm); $('btn-acct').title = nm.textContent; }
    if (!isAdmin() && (ui.tab === 'set' || ui.tab === 'akun')) setTab(firstTab());
    applyTabs();
    lockUI();
  }
  function modalOpen(id, on) {
    $(id).hidden = !on;
    var any = !$('login-modal').hidden || !$('acct-modal').hidden || !$('jb-modal').hidden;
    document.body.classList.toggle('noscroll', any);
  }
  function showLogin(msg) {
    $('lg-setup').hidden = REMOTE; $('lg-form').hidden = !REMOTE;
    $('lg-msg').className = 'note' + (msg ? ' err' : ''); $('lg-msg').textContent = msg || '';
    $('lg-guest').hidden = !(publik && REMOTE);
    $('lg-sub').textContent = publik ? 'Masuk untuk menambah atau mengubah data. Tanpa masuk, Anda hanya bisa melihat.' : 'Masuk untuk membuka data.';
    modalOpen('login-modal', true);
    setTimeout(function () { var el = REMOTE ? $('lg-user') : $('lg-url'); if (el) el.focus(); }, 30);
  }
  function hideLogin() { modalOpen('login-modal', false); }
  function sesiHabis(quiet) {
    auth = null; clearAuthStore(); lsDel(CACHEK); if (ui.ikdm) closeIkdm(true);
    applyRole(); rebuildAll(); refreshSync();
    if (!quiet || !publik) showLogin('Sesi Anda berakhir. Silakan masuk lagi.');
    else toast('Sesi Anda berakhir. Silakan masuk lagi.');
  }
  function doLogin(e) {
    e.preventDefault();
    var u = $('lg-user').value.trim(), pw = $('lg-pass').value, ingat = $('lg-ingat').checked, btn = $('lg-go');
    if (!u || !pw) return;
    btn.disabled = true; $('lg-msg').className = 'note'; $('lg-msg').textContent = 'Memeriksa…';
    api({ action: 'login', username: u, password: pw, ingat: ingat }).then(function (j) {
      auth = { t: j.token, exp: j.exp, me: j.me, ingat: ingat };
      saveAuth(auth); $('lg-pass').value = ''; hideLogin(); applyRole();
      if (j.must) openAcct(true);
      pull(); toast('Selamat datang, ' + j.me.nama);
    }).catch(function (err) {
      $('lg-msg').className = 'note err';
      $('lg-msg').textContent = err.message === 'offline' ? 'Tidak ada koneksi internet.' : err.name === 'TypeError' ? 'Tidak bisa terhubung ke server.' : err.message;
      $('lg-pass').value = ''; $('lg-pass').focus();
    }).then(function () { btn.disabled = false; });
  }
  function openAcct(forced) {
    if (!auth) return;
    ui.must = !!forced;
    $('ac-name').textContent = auth.me.nama; $('ac-role').textContent = auth.me.u + ' · ' + (ROLES[auth.me.peran] || '');
    $('ac-uname').value = auth.me.u;
    $('ac-must').hidden = !forced; $('ac-close').hidden = !!forced;
    $('ac-msg').textContent = ''; $('ac-old').value = ''; $('ac-new').value = ''; $('ac-new2').value = '';
    modalOpen('acct-modal', true);
    setTimeout(function () { $('ac-old').focus(); }, 30);
  }
  function closeAcct() { if (ui.must) return; modalOpen('acct-modal', false); }
  function pwClientErr(pw, user) {
    if (pw.length < 10) return 'Kata sandi minimal 10 karakter.';
    if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return 'Kata sandi harus mengandung huruf dan angka.';
    if (pw.toLowerCase().indexOf(user.toLowerCase()) > -1) return 'Kata sandi tidak boleh memuat nama pengguna.';
    return '';
  }
  function doChangePw(e) {
    e.preventDefault();
    var o = $('ac-old').value, n = $('ac-new').value, n2 = $('ac-new2').value, m = $('ac-msg');
    m.className = 'note err';
    if (n !== n2) { m.textContent = 'Kata sandi baru dan pengulangannya tidak sama.'; return; }
    var er = pwClientErr(n, auth.me.u); if (er) { m.textContent = er; return; }
    m.className = 'note'; m.textContent = 'Menyimpan…';
    api({ action: 'changepw', lama: o, baru: n, ingat: !!auth.ingat }).then(function (j) {
      auth = { t: j.token, exp: j.exp, me: j.me, ingat: auth.ingat }; saveAuth(auth);
      ui.must = false; modalOpen('acct-modal', false); applyRole(); toast('Kata sandi diganti'); pull();
    }).catch(function (err) { if (QUIET.indexOf(err.message) < 0) { m.className = 'note err'; m.textContent = err.message === 'offline' ? 'Tidak ada koneksi internet.' : err.message; } });
  }
  function doLogout(all) {
    var done = function () {
      auth = null; clearAuthStore(); lsDel(CACHEK); ui.must = false; modalOpen('acct-modal', false);
      state.acts = []; inov = []; jbp = []; ikd = []; if (ui.ikdm) closeIkdm(true); ui.jsel = null; renderJbModal();
      applyRole(); rebuildAll(); toast('Anda sudah keluar'); pull();
    };
    api({ action: all ? 'logoutall' : 'logout' }).catch(function () {}).then(done);
  }

  /* ---------- pemasangan event ---------- */

  $('btn-new').addEventListener('click', function () { openForm(); });

  /* ---------- UX: ikon, laci menu, grafik bisa dilipat ---------- */
  var ICON = {
    sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/></svg>',
    moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/></svg>'
  };
  var TABICON = {
    dash: '<path d="M4 13h6V4H4zM14 20h6V11h-6zM4 20h6v-3H4zM14 8h6V4h-6z"/>',
    dpa: '<path d="M7 3h8l4 4v14H7zM14 3v5h5M10 13h6M10 17h6"/>',
    jbl: '<path d="M12 21s-6-5.6-6-10.5a6 6 0 0 1 12 0C18 15.4 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.2"/>',
    jb: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/>',
    inov: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    ikd: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.6-1.6 1.8-2.3 3-2.3s2.4.7 3 2.3M15 10h3M15 13.5h3"/>',
    bank: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
    tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
    ide: '<path d="M4 5h16v11H9l-5 4z"/>',
    akun: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.5-3.5 3-5.2 6-5.2s5.5 1.7 6 5.2M16 5.2a3 3 0 0 1 0 5.6M18 15c1.8.6 2.8 2.3 3 5"/>',
    set: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>'
  };
  (function uxInit() {
    var nav = document.querySelector('nav.tabs');
    if (nav && !nav.querySelector('.brand')) {
      var br = document.createElement('div'); br.className = 'brand';
      br.innerHTML = '<i aria-hidden="true">D</i><span>Dukcapil<br><small style="font-weight:500;opacity:.7">Dashboard kegiatan</small></span>';
      nav.insertBefore(br, nav.firstChild);
    }
    Object.keys(TABICON).forEach(function (k) {
      var b = $('tab-' + k); if (!b || b.querySelector('svg')) return;
      b.insertAdjacentHTML('afterbegin', '<svg viewBox="0 0 24 24" aria-hidden="true">' + TABICON[k] + '</svg>');
    });
    function nav_(open) {
      document.body.classList.toggle('nav-open', open);
      $('nav-scrim').hidden = !open;
      $('btn-menu').setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    $('btn-menu').addEventListener('click', function () { nav_(!document.body.classList.contains('nav-open')); });
    $('nav-scrim').addEventListener('click', function () { nav_(false); });
    nav.addEventListener('click', function (e) { if (e.target.closest('.tab')) { nav_(false); window.scrollTo(0, 0); } });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') nav_(false); });
    var wide = window.matchMedia && window.matchMedia('(min-width: 1001px)').matches;
    ['keg-charts', 'inov-charts', 'bank-charts'].forEach(function (id) {
      var g = $(id); if (!g || g.parentNode.classList.contains('fold')) return;
      var d = document.createElement('details'); d.className = 'fold'; if (wide) d.open = true;
      d.innerHTML = '<summary>Grafik ringkasan</summary>';
      g.parentNode.insertBefore(d, g); d.appendChild(g);
    });
  })();

  function paintTheme() {
    var dk = document.documentElement.getAttribute('data-theme') === 'dark';
    $('btn-theme').innerHTML = (dk ? ICON.sun : ICON.moon) + '<span class="bl">' + (dk ? 'Mode terang' : 'Mode gelap') + '</span>';
    $('btn-theme').setAttribute('aria-label', dk ? 'Ganti ke mode terang' : 'Ganti ke mode gelap');
    document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) { m.setAttribute('content', dk ? '#0C1514' : '#F8FCFB'); });
  }
  $('btn-theme').addEventListener('click', function () {
    var nx = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nx);
    try { localStorage.setItem('dukcapil-tema', nx); } catch (e) {}
    paintTheme();
  });
  paintTheme();
  $('btn-cancel').addEventListener('click', function () { $('form').hidden = true; });
  $('f-tipe').addEventListener('change', preview);
  $('f-kat').addEventListener('change', function () {
    var j = $('f-kat').value === 'jb' ? 'jb' : 'dpa';
    $('form-title').textContent = j === 'jb' ? 'Jemput bola baru' : 'Kegiatan DPA baru';
    fillTipe(j, '');
  });
  $('bk-kat').addEventListener('change', function (e) { ui.bk.kat = e.target.value; renderBank(); });
  $('bk-th').addEventListener('change', function (e) { ui.bk.th = e.target.value; renderBank(); });
  $('bk-b').addEventListener('change', function (e) { ui.bk.b = e.target.value; renderBank(); });
  $('bk-tg').addEventListener('change', function (e) { ui.bk.tg = e.target.value; renderBank(); });
  $('ft').addEventListener('change', function (e) { ui.ft = e.target.value; renderList(); });
  $('tag-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var m = $('t-msg'), err = addTag($('t-name').value, +$('t-c').value || 0);
    if (err) { m.className = 'note err'; m.textContent = err; return; }
    $('t-name').value = ''; m.className = 'note good'; m.textContent = 'Tag ditambahkan.';
    afterTagChange();
  });
  $('bk-q').addEventListener('input', function (e) { ui.bk.q = e.target.value; renderBank(); });
  $('btn-csv').addEventListener('click', exportCsv);
  $('btn-new-jbl').addEventListener('click', function () { ui.jsel = null; renderJbModal(); openJbForm(); });
  $('jb-modal').addEventListener('click', function (e) { if (e.target === this) { ui.jsel = null; ui.jdel = null; renderJb(); } });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ui.jsel) { ui.jsel = null; ui.jdel = null; renderJb(); } });
  $('btn-jf-cancel').addEventListener('click', function () { $('jb-form').hidden = true; });
  $('jy').addEventListener('change', function (e) { ui.jy = e.target.value; renderJb(); });
  $('jfb').addEventListener('change', function (e) { ui.jb = e.target.value; renderJb(); });
  $('jfk').addEventListener('change', function (e) { ui.jk = e.target.value; renderJb(); });
  $('jft').addEventListener('change', function (e) { ui.jt = e.target.value; renderJb(); });
  $('jq').addEventListener('input', function (e) { ui.jq = e.target.value; renderJb(); });
  $('btn-csv-jb').addEventListener('click', function () { saveCsv(jbCsvText(), 'jemput-bola-' + iso(0) + '.csv'); });
  $('jf-files').addEventListener('change', function (e) { ui.jfiles = Array.prototype.slice.call(e.target.files || []); jfNote(); });
  $('jb-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('jf-name').value.trim();
    if (!name) return;
    var o = { id: uid('j'), name: name, date: $('jf-date').value, b: $('jf-b').value, k: $('jf-k').value, kid: $('jf-kid').value, kec: $('jf-kec').value.trim(), desa: $('jf-desa').value.trim(), loc: $('jf-loc').value.trim(), ptg: $('jf-ptg').value.trim(), sas: $('jf-sas').value, ter: $('jf-ter').value, kend: $('jf-kend').value.trim(), tl: $('jf-tl').value.trim(), tags: ui.jtags, files: [] };
    HSL.forEach(function (h) { o[h[0]] = $('jf-h-' + h[0]).value; });
    var v = normJb(o), pend = ui.jfiles.slice();
    jbp.push(v); saveJb(); pushJb(v);
    ui.jdoc = 'all'; ui.jy = 'all'; ui.jb = 'all'; ui.jk = 'all'; ui.jt = 'all'; ui.jq = ''; $('jq').value = '';
    ui.jfiles = []; $('jf-files').value = '';
    $('jb-form').hidden = true;
    buildSelects(); renderAll(); toast('Catatan jemput bola disimpan');
    if (pend.length) uploadJbFiles(v.id, pend);
  });
  $('btn-new-inov').addEventListener('click', function () { openInovForm(); });
  $('btn-new-ikd').addEventListener('click', function () { if (!readOnly()) $('ikd-file').click(); });
  $('ikd-file').addEventListener('change', function (e) { var fl = e.target.files; if (fl && fl.length && !readOnly()) ikdFiles(fl); e.target.value = ''; });
  $('ikd-prev').addEventListener('input', function (e) { var el = e.target; if (el.classList.contains('ikd-opd')) { var x = ui.ikdq[+el.getAttribute('data-i')]; if (x) x.opd = el.value; } });
  $('ikd-q').addEventListener('input', renderIkd);
  $('ikm-q').addEventListener('input', renderIkdm);
  $('ikm-fi').addEventListener('change', renderIkdm);
  $('ikm-fn').addEventListener('change', renderIkdm);
  $('ikm-csv').addEventListener('click', ikdmCsv);
  $('ikm-table').addEventListener('change', function (e) {
    var el = e.target, m = ui.ikdm; if (!m || !el.classList || !el.classList.contains('ikm-sel')) return;
    var i = +el.getAttribute('data-i'), f = +el.getAttribute('data-f');
    if (m.rows[i]) { m.rows[i][f] = el.value; m.warn = false; if ($('ikm-fi').value !== 'all' || $('ikm-fn').value !== 'all') renderIkdm(); else ikdmMeta(); }
  });
  $('ikm-table').addEventListener('input', function (e) {
    var el = e.target, m = ui.ikdm; if (!m || !el.classList || !el.classList.contains('ikm-ket')) return;
    var i = +el.getAttribute('data-i'); if (m.rows[i]) { m.rows[i][4] = el.value.slice(0, 160); m.warn = false; ikdmMeta(); }
  });
  $('ikd-modal').addEventListener('click', function (e) { if (e.target === this) closeIkdm(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ui.ikdm) closeIkdm(); });
  $('ikd-sort').addEventListener('change', renderIkd);
  $('btn-csv-ikd').addEventListener('click', function () { saveCsv(ikdCsvText(), 'aktivasi-ikd-' + iso(0) + '.csv'); });
  $('btn-iv-cancel').addEventListener('click', function () { $('inov-form').hidden = true; });
  $('ivf-b').addEventListener('change', function (e) { ui.vb = e.target.value; renderInov(); });
  $('ivf-t').addEventListener('change', function (e) { ui.vt = e.target.value; renderInov(); });
  $('ivf-q').addEventListener('input', function (e) { ui.vq = e.target.value; renderInov(); });
  $('btn-csv-inov').addEventListener('click', exportInovCsv);
  $('inov-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('iv-name').value.trim();
    if (!name) return;
    var v = normInov({ id: uid('v'), name: name, st: $('iv-st').value, b: $('iv-b').value, start: $('iv-start').value, end: $('iv-end').value, pic: $('iv-pic').value, sas: $('iv-sas').value, desc: $('iv-desc').value, man: $('iv-man').value, lnk: $('iv-lnk').value, tags: ui.vtags });
    inov.push(v); saveInov(); pushInov(v);
    ui.vopen[v.id] = true; ui.vs = 'all'; ui.vb = 'all'; ui.vt = 'all'; ui.vq = '';
    $('ivf-q').value = '';
    $('inov-form').hidden = true;
    buildSelects(); renderAll(); toast('Inovasi disimpan');
  });
  $('fb').addEventListener('change', function (e) { ui.fb = e.target.value; renderList(); });
  $('fs').addEventListener('change', function (e) { ui.fs = e.target.value; renderList(); });
  $('fq').addEventListener('input', function (e) { ui.q = e.target.value; renderList(); });
  $('btn-clear-sample').addEventListener('click', function () {
    state.acts = state.acts.filter(function (a) { return !a.sample; });
    save(); renderAll(); toast('Contoh kegiatan dihapus');
  });
  document.querySelectorAll('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { $('form').hidden = true; $('inov-form').hidden = true; $('jb-form').hidden = true; ui.jsel = null; renderJbModal(); setTab(b.getAttribute('data-tab')); }); });
  $('set-body').addEventListener('input', onSetInput);
  $('set-body').addEventListener('change', onSetInput);

  $('form').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('f-name').value.trim(), k = $('f-tipe').value, j = $('f-kat').value === 'jb' ? 'jb' : 'dpa';
    if (!name || !$('f-date').value) return;
    var o = { id: uid(), name: name, j: j, b: $('f-bidang').value, k: k, date: $('f-date').value, docs: mkDocs(k, 0), tags: ui.ftags.slice() };
    if (j === 'dpa') { o.th = $('f-th').value; o.sub = $('f-sub').value.trim(); o.pagu = $('f-pagu').value; o.pptk = $('f-pptk').value.trim(); o.ds = $('f-ds').value; }
    else { o.loc = $('f-loc').value.trim(); o.sas = $('f-sas').value; o.ptg = $('f-ptg').value.trim(); }
    var a = normAct(o);
    state.acts.push(a); push(a);
    ui.open[a.id] = true; ui.fb = 'all'; ui.fs = 'all'; ui.q = '';
    $('fb').value = 'all'; $('fs').value = 'all'; $('fq').value = '';
    ui.ft = 'all'; $('ft').value = 'all';
    save(); $('form').hidden = true; setTab(j); toast('Kegiatan disimpan');
  });

  document.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t.classList && t.classList.contains('jbcov')) { var ph = document.createElement('div'); ph.className = 'ph'; ph.innerHTML = '<b>◩</b><span>Foto belum bisa ditampilkan</span>'; t.parentNode.replaceChild(ph, t); }
    if (t && t.classList && t.classList.contains('jbth')) { var d = document.createElement('div'); d.className = 'ico'; d.textContent = 'Foto'; t.parentNode.replaceChild(d, t); }
  }, true);

  document.addEventListener('submit', function (e) {
    var f = e.target.closest && e.target.closest('.adddoc');
    if (!f) return;
    e.preventDefault();
    var inp = f.querySelector('input'), v = inp.value.trim();
    if (!v) return;
    var a = findAct(f.getAttribute('data-id'));
    if (a) { a.docs.push({ t: v, d: false, f: null }); save(); push(a); renderAll(); }
  });

  document.addEventListener('change', function (e) {
    var el = e.target, act = el.getAttribute && el.getAttribute('data-act');
    if (act === 'ifld') { ifldChange(el); return; }
    if (act === 'u-role') { userCall({ action: 'userset', username: el.getAttribute('data-u'), peran: el.value }, 'Peran diubah'); return; }
    if (act === 'jfld') { jfldChange(el); return; }
    if (act === 'jbfile') { var jid = el.getAttribute('data-id'), jl = el.files; uploadJbFiles(jid, jl); return; }
    if (act === 'tgname' || act === 'tgcol') {
      var tt = cfg.tags.filter(function (x) { return x.id === el.getAttribute('data-id'); })[0];
      if (!tt) return;
      if (act === 'tgcol') { tt.c = +el.value || 0; }
      else {
        var nv = String(el.value || '').trim().slice(0, 60);
        if (!nv) { toast('Nama tag tidak boleh kosong'); renderTags(); return; }
        if (cfg.tags.some(function (x) { return x.id !== tt.id && x.n.toLowerCase() === nv.toLowerCase(); })) { toast('Nama tag sudah ada'); renderTags(); return; }
        tt.n = nv;
      }
      commitCfg(); afterTagChange();
      return;
    }
    if (act !== 'toggle' && act !== 'date' && act !== 'file' && act !== 'fld') return;
    var a = findAct(el.getAttribute('data-id'));
    if (!a) return;
    if (act === 'file') { uploadFile(a, +el.getAttribute('data-n'), el.files && el.files[0]); return; }
    if (act === 'fld') {
      var fk = el.getAttribute('data-k'), fv = el.value;
      if (fk === 'ds') { if (DS[fv]) a.ds = fv; }
      else if (fk === 'th' || fk === 'pagu' || fk === 'real' || fk === 'sas' || fk === 'ter') a[fk] = num0(fv);
      else a[fk] = str(fv, fk === 'cat' ? 400 : 160).trim();
      save(); push(a); renderSummary();
      var mm = $('meta-' + a.id); if (mm) mm.innerHTML = metaHtml(a);
      return;
    }
    if (act === 'toggle') a.docs[+el.getAttribute('data-n')].d = el.checked;
    else if (el.value) a.date = el.value;
    save(); push(a); renderAll();
  });

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el || el.tagName === 'INPUT') return;
    var act = el.getAttribute('data-act'), id = el.getAttribute('data-id');
    if (act === 'open') { ui.open[id] = !ui.open[id]; ui.confirm = null; renderList(); }
    else if (act === 'del') { ui.confirm = id; renderList(); }
    else if (act === 'del-no') { ui.confirm = null; renderList(); }
    else if (act === 'del-yes') { state.acts = state.acts.filter(function (a) { return a.id !== id; }); ui.confirm = null; save(); pushDel(id); renderAll(); toast('Kegiatan dihapus'); }
    else if (act === 'pick') { var fi = document.getElementById('file-' + id + '-' + el.getAttribute('data-n')); if (fi) fi.click(); }
    else if (act === 'ichip') { ui.ib = el.getAttribute('data-b'); renderIdeas(); }
    else if (act === 'ikat') { ui.ik = el.getAttribute('data-k'); renderIdeas(); }
    else if (act === 'tagtog') {
      var cx = el.getAttribute('data-ctx'), tid = el.getAttribute('data-t');
      if (cx === 'form') { tog(ui.ftags, tid); $('f-tags').innerHTML = tagPicker(ui.ftags, 'form', ''); }
      else if (cx === 'act') { var ta = findAct(id); if (ta) { tog(ta.tags, tid); save(); push(ta); renderList(); renderSummary(); } }
      else if (cx === 'jbp') { var tj = findJb(id); if (tj) { tog(tj.tags, tid); saveJb(); pushJb(tj); renderJb(); } }
      else if (cx === 'jform') { tog(ui.jtags, tid); $('jf-tags').innerHTML = tagPicker(ui.jtags, 'jform', ''); }
      else if (cx === 'inov') { var tv = findInov(id); if (tv) { tog(tv.tags, tid); saveInov(); pushInov(tv); renderInov(); } }
      else if (cx === 'iform') { tog(ui.vtags, tid); $('iv-tags').innerHTML = tagPicker(ui.vtags, 'iform', ''); }
      else if (cx === 'idea') { var di = draft.ideas[+id]; if (di) { di.tg = di.tg || []; tog(di.tg, tid); ui.dirty = true; renderSettings(); } }
    }
    else if (act === 'goto-tag') { $('form').hidden = true; $('inov-form').hidden = true; $('jb-form').hidden = true; ui.jsel = null; renderJbModal(); setTab('tag'); }
    else if (act === 'jb-open') { ui.jsel = id; ui.jdel = null; renderJb(); }
    else if (act === 'jb-close') { ui.jsel = null; ui.jdel = null; renderJb(); }
    else if (act === 'jbdoc') { ui.jdoc = el.getAttribute('data-s'); renderJb(); }
    else if (act === 'jb-del') { ui.jdel = id; renderJb(); }
    else if (act === 'jb-del-no') { ui.jdel = null; renderJb(); }
    else if (act === 'jb-del-yes') { jbp = jbp.filter(function (v) { return v.id !== id; }); ui.jdel = null; ui.jsel = null; saveJb(); pushDelJb(id); renderAll(); toast('Catatan dihapus'); }
    else if (act === 'jb-rmf') { var rv = findJb(id); if (rv) { var gone = rv.files.splice(+el.getAttribute('data-n'), 1)[0]; if (gone && gone.i && gone.i === rv.covi) { rv.cov = ''; rv.covi = ''; } saveJb(); pushJb(rv); renderJb(); } }
    else if (act === 'jb-addlink') {
      var lv = findJb(id), li = $('jl-' + id), lu = li ? li.value.trim() : '';
      if (!lv) return;
      if (!/^https?:\/\/\S+$/i.test(lu)) { toast('Tautan harus diawali http:// atau https://'); return; }
      lv.files.push({ n: lu.replace(/^https?:\/\//i, '').slice(0, 60), u: lu.slice(0, 500), i: '', k: 'link', at: '' });
      saveJb(); pushJb(lv); renderJb(); toast('Tautan ditambahkan');
    }
    else if (act === 'jb-clear-sample') { jbp = jbp.filter(function (v) { return !v.sample; }); saveJb(); buildSelects(); renderAll(); toast('Contoh dihapus'); }
    else if (act === 'tg-viewj') { ui.jt = id; ui.jy = 'all'; ui.jb = 'all'; ui.jk = 'all'; ui.jq = ''; $('jq').value = ''; buildSelects(); setTab('jbl'); }
    else if (act === 'iv-open') { ui.vopen[id] = !ui.vopen[id]; ui.vdel = null; renderInov(); }
    else if (act === 'iv-del') { ui.vdel = id; renderInov(); }
    else if (act === 'iv-del-no') { ui.vdel = null; renderInov(); }
    else if (act === 'iv-del-yes') { inov = inov.filter(function (v) { return v.id !== id; }); ui.vdel = null; saveInov(); pushDelInov(id); renderAll(); toast('Inovasi dihapus'); }
    else if (act === 'ivs') { ui.vs = el.getAttribute('data-s'); renderInov(); }
    else if (act === 'ikd-peg') openIkdm(id);
    else if (act === 'ikd-pclose') closeIkdm();
    else if (act === 'ikm-save') ikdmSave();
    else if (act === 'ikm-undo') { var mm = ui.ikdm; if (mm && mm.snap) { mm.rows = JSON.parse(mm.snap); mm.warn = false; renderIkdm(); } }
    else if (act === 'ikm-del') { var md = ui.ikdm, di = +el.getAttribute('data-i'); if (md && md.rows && md.rows[di] && ikdmEditable()) { md.rows.splice(di, 1); md.warn = false; renderIkdm(); } }
    else if (act === 'ikm-add') {
      var ma = ui.ikdm, an = $('ik-an').value.replace(/\s+/g, ' ').trim(), ap = $('ik-ap').value.replace(/\s+/g, '');
      if (!ma || !ma.rows || !ikdmEditable()) return;
      if (!an) { toast('Isi nama pegawai'); return; }
      if (!/^\d{8,30}$/.test(ap)) { toast('NIP/NIPPPK harus berupa angka (8 sampai 30 digit)'); return; }
      if (ma.rows.some(function (r) { return r[0] === ap; })) { toast('NIP itu sudah ada di daftar'); return; }
      ma.rows.unshift([ap, an.slice(0, 160), $('ik-ai').value, $('ik-ak').value, '']); ma.warn = false;
      $('ik-an').value = ''; $('ik-ap').value = ''; renderIkdm();
    }
    else if (act === 'ikd-save') { if (!readOnly()) ikdSave(); }
    else if (act === 'ikd-cancel') { ui.ikdq = []; ikdPrev(); }
    else if (act === 'ikd-del') { ui.ikdel = id; renderIkd(); }
    else if (act === 'ikd-del-no') { ui.ikdel = null; renderIkd(); }
    else if (act === 'ikd-del-yes') { ikd = ikd.filter(function (v) { return v.id !== id; }); ui.ikdel = null; saveIkd(); if (REMOTE) { inflight++; refreshSync(); api({ action: 'delikd', id: id }).catch(onFail).then(function () { inflight--; refreshSync(); }); } renderAll(); toast('Data OPD dihapus'); }
    else if (act === 'iv-clear-sample') { inov = inov.filter(function (v) { return !v.sample; }); saveInov(); renderAll(); toast('Contoh inovasi dihapus'); }
    else if (act === 'tg-viewi') { ui.vt = id; ui.vs = 'all'; ui.vb = 'all'; ui.vq = ''; $('ivf-q').value = ''; buildSelects(); setTab('inov'); }
    else if (act === 'tg-del') { ui.tconfirm = id; renderTags(); }
    else if (act === 'tg-del-no') { ui.tconfirm = null; renderTags(); }
    else if (act === 'tg-del-yes') { ui.tconfirm = null; delTag(id); afterTagChange(); toast('Tag dihapus'); }
    else if (act === 'tg-view') { ui.bk = { kat: 'all', th: 'all', b: 'all', tg: id, q: '' }; $('bk-q').value = ''; setTab('bank'); }
    else if (act === 'bank-open') {
      var ba = findAct(id);
      if (ba) {
        ui.open[id] = true; ui.fb = 'all'; ui.fs = 'all'; ui.q = '';
        $('fb').value = 'all'; $('fs').value = 'all'; $('fq').value = '';
        ui.ft = 'all'; $('ft').value = 'all';
        setTab(ba.j);
        var card = document.getElementById('act-' + id);
        if (card) card.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    }
    else if (act === 'idea') { var x = cfg.ideas[+el.getAttribute('data-n')]; if (x) openForm({ name: x.t, b: x.b, k: x.k, j: ideaKat(x), tg: x.tg }); }
    else if (act === 'sset') { ui.sset = el.getAttribute('data-s'); if (ui.sset === 'log') loadLog(); else renderSettings(); }
    else if (act === 's-add') setAdd(el.getAttribute('data-s'), el.getAttribute('data-kat'));
    else if (act === 's-del') setDel(el.getAttribute('data-s'), +el.getAttribute('data-i'));
    else if (act === 's-save') saveSettings();
    else if (act === 's-cancel') { newDraft(); renderSettings(); setMsg('Perubahan dibatalkan.', ''); }
    else if (act === 's-reset') { draft = defCfg(); draft.tipe.forEach(function (t) { t.docsText = t.docs.join('\n'); }); ui.dirty = true; renderSettings(); setMsg('Isi bawaan dimuat. Klik Simpan pengaturan untuk menerapkan.', ''); }
    else if (act === 's-conn') connSave();
    else if (act === 's-invite') makeInvite();
    else if (act === 'u-gen') { var gi = $('au-pw'); if (gi) gi.value = pwGen(); }
    else if (act === 'u-gen2') { var g2 = $('ur-pw'); if (g2) g2.value = pwGen(); }
    else if (act === 'u-add') userCall({ action: 'useradd', username: $('au-user').value.trim(), nama: $('au-nama').value.trim(), peran: $('au-peran').value, password: $('au-pw').value, menu: (function () { var s = [].slice.call(document.querySelectorAll('.am-c')).filter(function (c) { return c.checked; }).map(function (c) { return c.getAttribute('data-m'); }); return s.length === MENUS.length ? null : s; })() }, 'Pengguna ditambahkan. Berikan kata sandi sementara kepadanya.');
    else if (act === 'u-toggle') { var tu = (ui.users || []).filter(function (x) { return x.u === el.getAttribute('data-u'); })[0]; if (tu) userCall({ action: 'userset', username: tu.u, aktif: !tu.aktif }, tu.aktif ? 'Pengguna dinonaktifkan' : 'Pengguna diaktifkan'); }
    else if (act === 'u-reset') { ui.ureset = el.getAttribute('data-u'); ui.umenu = null; renderUsers(); }
    else if (act === 'u-reset-no') { ui.ureset = null; renderUsers(); }
    else if (act === 'u-menu') { ui.umenu = el.getAttribute('data-u'); ui.ureset = null; renderUsers(); }
    else if (act === 'um-no') { ui.umenu = null; renderUsers(); }
    else if (act === 'um-all') { document.querySelectorAll('.um-c').forEach(function (c) { c.checked = true; }); }
    else if (act === 'um-save') {
      var key = el.getAttribute('data-u'), sel = [].slice.call(document.querySelectorAll('.um-c')).filter(function (c) { return c.checked; }).map(function (c) { return c.getAttribute('data-m'); });
      if (!sel.length) { toast('Pilih minimal satu menu'); }
      else {
        var val = sel.length === MENUS.length ? null : sel;
        if (key === '_tamu') api({ action: 'menuset', guest: val }).then(function (j) { ui.gm = Array.isArray(j.gm) ? j.gm : null; ui.umenu = null; renderUsers(); toast('Menu tamu disimpan'); }).catch(function (e) { toast('Gagal menyimpan: ' + e.message); });
        else userCall({ action: 'userset', username: key, menu: val }, 'Akses menu disimpan');
      }
    }
    else if (act === 'mn-up' || act === 'mn-dn') {
      var mk = el.getAttribute('data-m'), mi = menuOrder.indexOf(mk), mj = act === 'mn-up' ? mi - 1 : mi + 1;
      if (mi >= 0 && mj >= 0 && mj < menuOrder.length) { var tmp = menuOrder[mi]; menuOrder[mi] = menuOrder[mj]; menuOrder[mj] = tmp; saveOrder(); }
    }
    else if (act === 'mn-reset') { menuOrder = MENUS.map(function (m) { return m[0]; }); saveOrder(); }
    else if (act === 'u-reset-go') userCall({ action: 'userreset', username: el.getAttribute('data-u'), password: ($('ur-pw') || {}).value || '' }, 'Kata sandi disetel ulang. Berikan kata sandi sementara kepadanya.');
  });

  /* ---------- mulai ---------- */
  newDraft();
  $('f-ds').innerHTML = Object.keys(DS).map(function (x) { return '<option value="' + x + '">' + esc(DS[x]) + '</option>'; }).join('');
  $('t-c').innerHTML = colorOpts0(0);
  $('jf-hasil').innerHTML = HSL.map(function (h) { return '<label class="f" for="jf-h-' + h[0] + '">' + h[1] + '<input type="number" min="0" inputmode="numeric" id="jf-h-' + h[0] + '"></label>'; }).join('');
  $('iv-st').innerHTML = Object.keys(IST).map(function (x) { return '<option value="' + x + '">' + esc(IST[x]) + '</option>'; }).join('');
  applyHeader();
  buildSelects();
  ['dpa', 'jb'].forEach(function (kt) {
    var f = state.acts.filter(function (a) { return a.j === kt; }).map(function (a) { return { a: a, i: info(a) }; }).sort(function (p, r) { return ORD[p.i.st] - ORD[r.i.st] || p.a.date.localeCompare(r.a.date); })[0];
    if (f) ui.open[f.a.id] = true;
  });
  setTab('dash');
  (function () {
    var qt = new URLSearchParams(location.search).get('tab');
    if (qt && ['dpa', 'jbl', 'jb', 'inov', 'bank', 'tag', 'ide'].indexOf(qt) > -1) setTab(qt);
  })();
  applyRole();
  new MutationObserver(lockSoon).observe(document.body, { childList: true, subtree: true });

  $('btn-login').addEventListener('click', function () { showLogin(''); });
  $('btn-acct').addEventListener('click', function () { openAcct(false); });
  $('lg-form').addEventListener('submit', doLogin);
  $('lg-guest').addEventListener('click', hideLogin);
  $('lg-show').addEventListener('change', function (e) { $('lg-pass').type = e.target.checked ? 'text' : 'password'; });
  $('lg-setup').addEventListener('submit', function (e) {
    e.preventDefault();
    var url = $('lg-url').value.trim();
    testUrl(url, $('lg-smsg'), function () { lsSet('dukcapil-api', url); $('lg-smsg').className = 'note good'; $('lg-smsg').textContent = 'Terhubung. Memuat ulang…'; setTimeout(function () { location.reload(); }, 500); });
  });
  $('ac-form').addEventListener('submit', doChangePw);
  $('ac-close').addEventListener('click', closeAcct);
  $('ac-out').addEventListener('click', function () { doLogout(false); });
  $('ac-outall').addEventListener('click', function () { doLogout(true); });
  $('acct-modal').addEventListener('click', function (e) { if (e.target === this) closeAcct(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('acct-modal').hidden) closeAcct(); });

  $('btn-refresh').addEventListener('click', function () {
    if (!idle()) { toast('Tunggu, proses simpan atau unggah belum selesai'); return; }
    pull().then(function () { if (!ui.loadErr && !ui.offline) toast('Data dimuat ulang'); });
  });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && REMOTE && idle() && $('login-modal').hidden && !ui.must) pull(); });
  window.addEventListener('offline', function () { showOffline(true, null); });
  window.addEventListener('online', function () { showOffline(false); if (REMOTE && idle()) pull(); });

  /* ---------- PWA: pasang ke layar utama + service worker ---------- */
  var deferredInstall = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredInstall = e; $('btn-install').hidden = false; });
  window.addEventListener('appinstalled', function () { deferredInstall = null; $('btn-install').hidden = true; toast('Aplikasi terpasang'); });
  var isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.navigator.standalone && !window.matchMedia('(display-mode: standalone)').matches;
  if (isIos) $('btn-install').hidden = false;
  $('btn-install').addEventListener('click', function () {
    if (deferredInstall) { deferredInstall.prompt(); deferredInstall.userChoice.then(function () { deferredInstall = null; $('btn-install').hidden = true; }); }
    else toast('Di iPhone/iPad: ketuk tombol Bagikan lalu "Tambahkan ke Layar Utama"');
  });
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () {
      var hadCtl = !!navigator.serviceWorker.controller, reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', function () { if (hadCtl && !reloaded && !ui.ikdq.length) { reloaded = true; location.reload(); } });
      navigator.serviceWorker.register('sw.js').then(function (reg) {
        reg.addEventListener('updatefound', function () {
          var nw = reg.installing;
          if (nw) nw.addEventListener('statechange', function () { if (nw.state === 'installed' && navigator.serviceWorker.controller) toast('Versi baru tersedia. Muat ulang halaman untuk memakainya.'); });
        });
      }).catch(function () {});
    });
  }

  /* ---------- mulai ---------- */
  if (!REMOTE) { setSync('err', 'Belum tersambung'); showLogin(''); }
  else {
    if (!navigator.onLine) showOffline(true, null);
    pull().then(function () { if (!auth && !publik) showLogin(''); });
  }
})();
