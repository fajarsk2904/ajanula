'use strict';
/* =====================================================================
   ZaidMath — kumpulan kalkulator matematika & keuangan
   Semua logika ada di file ini. Untuk menambah kalkulator baru,
   cukup tambahkan satu objek ke array CALCS (lihat README.md).
   ===================================================================== */

/* ---------- Helper umum ---------- */
const $ = (s, r = document) => r.querySelector(s);
const fmt = (n, d = 2) =>
  Number.isFinite(n) ? new Intl.NumberFormat('id-ID', { maximumFractionDigits: d }).format(n) : '—';
const idr = n => fmt(Math.round(n), 0);
const rp = n => {
  if (!Number.isFinite(n)) return '—';
  const r = Math.round(n);
  return (r < 0 ? '-' : '') + 'Rp ' + new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Math.abs(r));
};
const pct = (n, d = 2) => (Number.isFinite(n) ? fmt(n, d) + '%' : '—');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const chk = (cond, msg) => { if (!cond) throw new Error(msg); };
const sum = (arr, k) => arr.reduce((a, r) => a + r[k], 0);
const fmtInt = n => String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const short = n => {
  const a = Math.abs(n), s = n < 0 ? '-' : '';
  if (a >= 1e12) return s + fmt(a / 1e12, 1) + ' T';
  if (a >= 1e9) return s + fmt(a / 1e9, 1) + ' M';
  if (a >= 1e6) return s + fmt(a / 1e6, 1) + ' jt';
  if (a >= 1e3) return s + fmt(a / 1e3, 0) + ' rb';
  return s + fmt(a, 1);
};
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const parseDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const parseList = s => s.split(/[\s,;]+/).filter(Boolean);

/* Pembayaran anuitas bulanan: P pokok, r bunga per bulan, n jumlah bulan */
function pmt(P, r, n) {
  if (n <= 0) return 0;
  if (r === 0) return P / n;
  return (P * r) / (1 - Math.pow(1 + r, -n));
}
/* Cari bunga bulanan dari cicilan tetap (bisection) */
function solveRate(P, pay, n) {
  if (pay * n <= P) return 0;
  let lo = 0, hi = 1;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (pmt(P, mid, n) < pay) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}
/* Jadwal angsuran: flat | anuitas | menurun */
function loanSchedule(P, n, annualRate, method) {
  const r = annualRate / 1200, rows = [];
  const ann = method === 'anuitas' ? pmt(P, r, n) : 0;
  let bal = P;
  for (let k = 1; k <= n; k++) {
    let interest, principal;
    if (method === 'flat') { interest = P * r; principal = P / n; }
    else if (method === 'anuitas') { interest = bal * r; principal = ann - interest; }
    else { interest = bal * r; principal = P / n; }
    bal = Math.max(0, bal - principal);
    rows.push({ k, pay: principal + interest, principal, interest, bal });
  }
  return rows;
}
/* Jadwal KPR dengan beberapa segmen bunga (fixed lalu floating) */
function mortgageSchedule(P, n, segs) {
  const rows = [];
  let bal = P, k = 0;
  for (let si = 0; si < segs.length && k < n; si++) {
    const last = si === segs.length - 1;
    const m = last ? n - k : Math.min(segs[si].months, n - k);
    const r = segs[si].rate / 1200;
    const pay = pmt(bal, r, n - k);
    for (let j = 0; j < m; j++) {
      const interest = bal * r, principal = pay - interest;
      bal = Math.max(0, bal - principal);
      k++;
      rows.push({ k, pay, principal, interest, bal });
    }
  }
  return rows;
}
function yearlyRows(rows) {
  const out = [];
  for (let i = 0; i < rows.length; i += 12) {
    const ch = rows.slice(i, i + 12);
    out.push([
      Math.floor(i / 12) + 1,
      idr(sum(ch, 'pay') / ch.length),
      idr(sum(ch, 'principal')),
      idr(sum(ch, 'interest')),
      idr(ch[ch.length - 1].bal)
    ]);
  }
  return out;
}
function loanChart(P, rows) {
  const labels = ['0'], bal = [P], cum = [0];
  let c = 0;
  for (let i = 0; i < rows.length; i += 12) {
    const ch = rows.slice(i, i + 12);
    ch.forEach(r => (c += r.interest));
    labels.push(String(Math.ceil((i + ch.length) / 12)));
    bal.push(ch[ch.length - 1].bal);
    cum.push(c);
  }
  return {
    title: 'Sisa pinjaman & bunga kumulatif (sumbu X = tahun ke-)',
    labels,
    series: [{ name: 'Sisa pinjaman', data: bal }, { name: 'Bunga kumulatif', data: cum }]
  };
}

/* ---------- Matematika murni ---------- */
function factorize(n) {
  const f = [];
  for (let p = 2; p * p <= n; p += p === 2 ? 1 : 2) {
    let c = 0;
    while (n % p === 0) { n /= p; c++; }
    if (c) f.push([p, c]);
  }
  if (n > 1) f.push([n, 1]);
  return f;
}
function isPrime(n) {
  if (n < 2) return false;
  if (n < 4) return true;
  if (n % 2 === 0) return false;
  for (let p = 3; p * p <= n; p += 2) if (n % p === 0) return false;
  return true;
}

/* Evaluator ekspresi aman (tanpa eval) */
function evalExpr(src) {
  const s = String(src)
    .replace(/×/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-')
    .replace(/π/g, 'pi').replace(/√/g, 'sqrt')
    .replace(/,/g, '.').replace(/\s+/g, '').toLowerCase();
  if (!s) throw new Error('Ekspresi kosong');
  const rad = x => (x * Math.PI) / 180;
  const FN = {
    sqrt: Math.sqrt, ln: Math.log, log: Math.log10, abs: Math.abs,
    sin: x => Math.sin(rad(x)), cos: x => Math.cos(rad(x)), tan: x => Math.tan(rad(x))
  };
  const CONST = { pi: Math.PI, e: Math.E };
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  let i = 0;
  function expr() {
    let v = term();
    while (s[i] === '+' || s[i] === '-') { const o = s[i++]; const r = term(); v = o === '+' ? v + r : v - r; }
    return v;
  }
  function term() {
    let v = unary();
    while (s[i] === '*' || s[i] === '/') { const o = s[i++]; const r = unary(); v = o === '*' ? v * r : v / r; }
    return v;
  }
  function unary() {
    if (s[i] === '-') { i++; return -unary(); }
    if (s[i] === '+') { i++; return unary(); }
    return power();
  }
  function power() {
    const b = postfix();
    if (s[i] === '^') { i++; return Math.pow(b, unary()); }
    return b;
  }
  function postfix() {
    let v = primary();
    while (s[i] === '%') { i++; v /= 100; }
    return v;
  }
  function primary() {
    if (s[i] === '(') {
      i++;
      const v = expr();
      if (s[i] !== ')') throw new Error('Kurung belum ditutup');
      i++;
      return v;
    }
    let m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/.exec(s.slice(i));
    if (m) { i += m[0].length; return parseFloat(m[0]); }
    m = /^[a-z]+/.exec(s.slice(i));
    if (m) {
      const name = m[0];
      if (has(CONST, name)) { i += name.length; return CONST[name]; }
      if (has(FN, name)) {
        i += name.length;
        if (s[i] !== '(') throw new Error('Gunakan tanda kurung setelah ' + name);
        i++;
        const v = expr();
        if (s[i] !== ')') throw new Error('Kurung belum ditutup');
        i++;
        return FN[name](v);
      }
      throw new Error('Fungsi tidak dikenal: ' + name);
    }
    throw new Error('Ekspresi belum lengkap');
  }
  const v = expr();
  if (i < s.length) throw new Error('Karakter tidak valid: ' + s[i]);
  return v;
}

/* ---------- Shorthand definisi field ---------- */
const money = (id, label, value, extra = {}) => ({ id, label, type: 'money', value, ...extra });
const numf = (id, label, value, suffix, extra = {}) => ({ id, label, type: 'number', value, suffix, ...extra });

/* ---------- Konversi satuan ---------- */
const lin = (k, t, a, b, f) => ({ k, t, a, b, f: x => x * f, g: y => y / f });
const UNITS = [
  lin('km-mi', 'Kilometer ⇄ Mil', 'km', 'mil', 0.621371192),
  lin('m-ft', 'Meter ⇄ Kaki (feet)', 'm', 'ft', 3.280839895),
  lin('cm-in', 'Sentimeter ⇄ Inci', 'cm', 'inci', 0.393700787),
  lin('kg-lb', 'Kilogram ⇄ Pon (lb)', 'kg', 'lb', 2.2046226218),
  lin('g-oz', 'Gram ⇄ Ons (oz)', 'g', 'oz', 0.03527396195),
  lin('l-gal', 'Liter ⇄ Galon (US)', 'liter', 'galon', 0.2641720524),
  { k: 'c-f', t: 'Celsius ⇄ Fahrenheit', a: '°C', b: '°F', f: x => (x * 9) / 5 + 32, g: y => ((y - 32) * 5) / 9 },
  { k: 'c-k', t: 'Celsius ⇄ Kelvin', a: '°C', b: 'K', f: x => x + 273.15, g: y => y - 273.15 },
  lin('kmh-ms', 'km/jam ⇄ m/detik', 'km/jam', 'm/detik', 1 / 3.6),
  lin('kmh-mph', 'km/jam ⇄ mil/jam', 'km/jam', 'mph', 0.621371192),
  lin('ha-m2', 'Hektar ⇄ Meter persegi', 'ha', 'm²', 10000),
  lin('m2-ft2', 'Meter persegi ⇄ Kaki persegi', 'm²', 'ft²', 10.7639104),
  lin('jam-mnt', 'Jam ⇄ Menit', 'jam', 'menit', 60),
  lin('gb-mb', 'Gigabyte ⇄ Megabyte', 'GB', 'MB', 1024)
];

/* =====================================================================
   DAFTAR KALKULATOR
   ===================================================================== */
const CATS = [
  { id: 'math', name: 'Matematika', icon: '🧮' },
  { id: 'kredit', name: 'Kredit & Properti', icon: '🏠' },
  { id: 'invest', name: 'Investasi & Kebebasan Finansial', icon: '📈' },
  { id: 'bisnis', name: 'Bisnis & Belanja', icon: '🛒' },
  { id: 'lain', name: 'Lainnya', icon: '🧰' }
];

const CALCS = [
  /* ============ MATEMATIKA ============ */
  {
    id: 'kalkulator', cat: 'math', icon: '🧮', title: 'Kalkulator',
    desc: 'Kalkulator ilmiah: + − × ÷, pangkat, persen, akar, sin/cos/tan, ln, log.',
    keywords: 'hitung dasar tambah kurang kali bagi ilmiah',
    custom: initCalculator
  },
  {
    id: 'persen', cat: 'math', icon: '％', title: 'Persentase',
    desc: 'Hitung persen dari angka, perbandingan persen, kenaikan/penurunan, dan tambah/kurang persen.',
    keywords: 'persen presentase naik turun',
    fields: [numf('a', 'Angka A', 15), numf('b', 'Angka B', 200)],
    calc(v) {
      const { a, b } = v;
      const cards = [
        { label: `${fmt(a, 4)}% dari ${fmt(b, 4)}`, value: fmt((a / 100) * b, 6), big: true },
        { label: `${fmt(b, 4)} ditambah ${fmt(a, 4)}%`, value: fmt(b * (1 + a / 100), 6) },
        { label: `${fmt(b, 4)} dikurangi ${fmt(a, 4)}%`, value: fmt(b * (1 - a / 100), 6) },
        { label: `${fmt(a, 4)} adalah berapa persen dari ${fmt(b, 4)}`, value: b !== 0 ? pct((a / b) * 100, 4) : 'Tidak terdefinisi (B = 0)' },
        { label: `Perubahan dari ${fmt(a, 4)} ke ${fmt(b, 4)}`, value: a !== 0 ? pct(((b - a) / Math.abs(a)) * 100, 4) : 'Tidak terdefinisi (A = 0)', sub: b >= a ? 'kenaikan' : 'penurunan' }
      ];
      return { cards };
    }
  },
  {
    id: 'fpb-kpk', cat: 'math', icon: '🔢', title: 'FPB & KPK',
    desc: 'Faktor persekutuan terbesar dan kelipatan persekutuan terkecil dari beberapa bilangan.',
    keywords: 'fpb kpk gcd lcm',
    fields: [{ id: 'list', label: 'Bilangan (pisahkan dengan koma atau spasi)', type: 'text', value: '12, 18, 24', wide: true }],
    calc(v) {
      const toks = parseList(v.list);
      chk(toks.length >= 2, 'Masukkan minimal 2 bilangan.');
      chk(toks.length <= 20, 'Maksimal 20 bilangan.');
      chk(toks.every(t => /^\d{1,30}$/.test(t)), 'Gunakan bilangan bulat positif (maks. 30 digit).');
      const ns = toks.map(BigInt);
      chk(ns.every(n => n > 0n), 'Semua bilangan harus lebih dari 0.');
      const gcd = (a, b) => { while (b) { [a, b] = [b, a % b]; } return a; };
      const g = ns.reduce(gcd);
      const l = ns.reduce((a, b) => (a / gcd(a, b)) * b);
      return {
        cards: [
          { label: 'FPB (faktor persekutuan terbesar)', value: g.toLocaleString('id-ID'), big: true },
          { label: 'KPK (kelipatan persekutuan terkecil)', value: l.toLocaleString('id-ID') },
          { label: 'Saling prima?', value: g === 1n ? 'Ya (FPB = 1)' : 'Tidak' }
        ]
      };
    }
  },
  {
    id: 'prima', cat: 'math', icon: '🔍', title: 'Bilangan Prima & Faktorisasi',
    desc: 'Cek bilangan prima, faktorisasi prima, jumlah pembagi, dan prima terdekat.',
    keywords: 'prima faktor pembagi',
    fields: [numf('n', 'Bilangan bulat positif', 360, '', { step: 1 })],
    calc(v) {
      const n = v.n;
      chk(Number.isInteger(n) && n >= 1 && n <= 1e12, 'Masukkan bilangan bulat antara 1 dan 1.000.000.000.000.');
      const f = n > 1 ? factorize(n) : [];
      const divCount = f.reduce((a, [, e]) => a * (e + 1), 1);
      const divSum = f.reduce((a, [p, e]) => { let s = 1, t = 1; for (let k = 1; k <= e; k++) { t *= p; s += t; } return a * s; }, 1);
      const facStr = n === 1 ? '1' : f.map(([p, e]) => (e > 1 ? `${p}<sup>${e}</sup>` : `${p}`)).join(' × ');
      let nx = n + 1, guard = 0;
      while (!isPrime(nx) && guard++ < 100000) nx++;
      let pv = n - 1;
      while (pv >= 2 && !isPrime(pv)) pv--;
      return {
        cards: [
          { label: `${fmt(n, 0)} adalah bilangan prima?`, value: isPrime(n) ? 'Ya, prima ✓' : 'Bukan prima', big: true, tone: '' },
          { label: 'Faktorisasi prima', value: facStr },
          { label: 'Jumlah pembagi positif', value: fmt(divCount, 0) },
          { label: 'Jumlah semua pembagi', value: fmt(divSum, 0) },
          { label: 'Prima sebelumnya', value: pv >= 2 ? fmt(pv, 0) : '—' },
          { label: 'Prima berikutnya', value: fmt(nx, 0) }
        ]
      };
    }
  },
  {
    id: 'statistik', cat: 'math', icon: '📊', title: 'Statistik Data',
    desc: 'Rata-rata, median, modus, jangkauan, varians, dan simpangan baku dari sekumpulan data.',
    keywords: 'mean median modus standar deviasi rata-rata',
    fields: [{ id: 'data', label: 'Data (pisahkan dengan koma, spasi, atau baris baru)', type: 'textarea', value: '70, 85, 90, 65, 85, 100, 78', wide: true, hint: 'Gunakan titik untuk desimal, mis. 7.5' }],
    calc(v) {
      const xs = parseList(v.data).map(Number);
      chk(xs.length >= 1 && xs.every(Number.isFinite), 'Data harus berupa angka. Gunakan titik untuk desimal.');
      chk(xs.length <= 10000, 'Maksimal 10.000 data.');
      const n = xs.length, total = xs.reduce((a, b) => a + b, 0), mean = total / n;
      const s = [...xs].sort((a, b) => a - b);
      const median = n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
      const freq = new Map();
      xs.forEach(x => freq.set(x, (freq.get(x) || 0) + 1));
      const mx = Math.max(...freq.values());
      const modes = [...freq].filter(([, c]) => c === mx).map(([k]) => k);
      const modeStr = mx === 1 && n > 1 ? 'Tidak ada' : modes.map(m => fmt(m, 6)).join(', ') + ` (${mx}×)`;
      const ss = xs.reduce((a, x) => a + (x - mean) ** 2, 0);
      const varP = ss / n, varS = n > 1 ? ss / (n - 1) : NaN;
      return {
        cards: [
          { label: 'Rata-rata (mean)', value: fmt(mean, 6), big: true },
          { label: 'Median', value: fmt(median, 6) },
          { label: 'Modus', value: modeStr },
          { label: 'Jumlah data', value: fmt(n, 0) },
          { label: 'Total', value: fmt(total, 6) },
          { label: 'Minimum', value: fmt(s[0], 6) },
          { label: 'Maksimum', value: fmt(s[n - 1], 6) },
          { label: 'Jangkauan', value: fmt(s[n - 1] - s[0], 6) },
          { label: 'Simpangan baku (populasi)', value: fmt(Math.sqrt(varP), 6) },
          { label: 'Simpangan baku (sampel)', value: n > 1 ? fmt(Math.sqrt(varS), 6) : '—' },
          { label: 'Varians (populasi)', value: fmt(varP, 6) },
          { label: 'Varians (sampel)', value: n > 1 ? fmt(varS, 6) : '—' }
        ]
      };
    }
  },
  {
    id: 'kuadrat', cat: 'math', icon: '📐', title: 'Persamaan Kuadrat',
    desc: 'Selesaikan ax² + bx + c = 0: diskriminan, akar-akar (termasuk kompleks), dan titik puncak.',
    keywords: 'akar kuadrat diskriminan parabola',
    fields: [numf('a', 'a', 1, ''), numf('b', 'b', -5, ''), numf('c', 'c', 6, '')],
    calc(v) {
      const { a, b, c } = v;
      if (a === 0) {
        chk(b !== 0, 'Jika a = 0 dan b = 0, ini bukan persamaan yang dapat diselesaikan.');
        return { cards: [{ label: 'Persamaan linear (a = 0)', value: `x = ${fmt(-c / b, 8)}`, big: true }] };
      }
      const D = b * b - 4 * a * c;
      const cards = [];
      if (D > 0) {
        const x1 = (-b + Math.sqrt(D)) / (2 * a), x2 = (-b - Math.sqrt(D)) / (2 * a);
        cards.push({ label: 'Dua akar real berbeda', value: `x₁ = ${fmt(x1, 8)}<br>x₂ = ${fmt(x2, 8)}`, big: true });
      } else if (D === 0) {
        cards.push({ label: 'Satu akar real (kembar)', value: `x = ${fmt(-b / (2 * a), 8)}`, big: true });
      } else {
        const re = -b / (2 * a), im = Math.sqrt(-D) / (2 * Math.abs(a));
        cards.push({ label: 'Dua akar kompleks', value: `x = ${fmt(re, 6)} ± ${fmt(im, 6)}i`, big: true });
      }
      cards.push(
        { label: 'Diskriminan (D = b² − 4ac)', value: fmt(D, 8) },
        { label: 'Titik puncak parabola', value: `(${fmt(-b / (2 * a), 6)} , ${fmt(c - (b * b) / (4 * a), 6)})` },
        { label: 'Arah parabola', value: a > 0 ? 'Membuka ke atas (minimum)' : 'Membuka ke bawah (maksimum)' }
      );
      return { cards };
    }
  },
  {
    id: 'geometri', cat: 'math', icon: '📏', title: 'Bangun Datar & Ruang',
    desc: 'Luas, keliling, volume, dan luas permukaan: lingkaran, bola, tabung, kerucut, balok, segitiga.',
    keywords: 'luas keliling volume lingkaran bola tabung balok kerucut segitiga',
    fields: [
      numf('r', 'Jari-jari (r)', 7, ''),
      numf('p', 'Panjang (p)', 10, ''),
      numf('l', 'Lebar (l)', 6, ''),
      numf('t', 'Tinggi (t)', 8, '')
    ],
    calc(v) {
      const { r, p, l, t } = v, PI = Math.PI, f = x => fmt(x, 4);
      chk([r, p, l, t].every(x => x >= 0), 'Semua ukuran harus bernilai 0 atau lebih.');
      const slant = Math.sqrt(r * r + t * t);
      return {
        sections: [
          { title: '⭕ Lingkaran (r)', cards: [{ label: 'Luas', value: f(PI * r * r) }, { label: 'Keliling', value: f(2 * PI * r) }] },
          { title: '🔵 Bola (r)', cards: [{ label: 'Volume', value: f((4 / 3) * PI * r ** 3) }, { label: 'Luas permukaan', value: f(4 * PI * r * r) }] },
          { title: '🥫 Tabung (r, t)', cards: [{ label: 'Volume', value: f(PI * r * r * t) }, { label: 'Luas permukaan', value: f(2 * PI * r * (r + t)) }] },
          { title: '🔺 Kerucut (r, t)', cards: [{ label: 'Volume', value: f((PI * r * r * t) / 3) }, { label: 'Garis pelukis', value: f(slant) }, { label: 'Luas permukaan', value: f(PI * r * (r + slant)) }] },
          { title: '▭ Persegi panjang (p, l)', cards: [{ label: 'Luas', value: f(p * l) }, { label: 'Keliling', value: f(2 * (p + l)) }, { label: 'Diagonal', value: f(Math.hypot(p, l)) }] },
          { title: '📦 Balok (p, l, t)', cards: [{ label: 'Volume', value: f(p * l * t) }, { label: 'Luas permukaan', value: f(2 * (p * l + p * t + l * t)) }, { label: 'Diagonal ruang', value: f(Math.sqrt(p * p + l * l + t * t)) }] },
          { title: '△ Segitiga (alas = p, tinggi = t)', cards: [{ label: 'Luas', value: f((p * t) / 2) }] }
        ]
      };
    }
  },
  {
    id: 'konversi', cat: 'math', icon: '🔄', title: 'Konversi Satuan',
    desc: 'Ubah satuan panjang, berat, suhu, volume, kecepatan, luas, dan data.',
    keywords: 'satuan konversi suhu celsius fahrenheit mil kaki pon',
    fields: [
      numf('x', 'Nilai', 100, ''),
      { id: 'u', label: 'Jenis konversi', type: 'select', value: 'km-mi', options: UNITS.map(u => ({ v: u.k, t: u.t })), wide: true }
    ],
    calc(v) {
      const u = UNITS.find(q => q.k === v.u);
      chk(u, 'Jenis konversi tidak dikenal.');
      return {
        cards: [
          { label: `${fmt(v.x, 6)} ${u.a} sama dengan`, value: `${fmt(u.f(v.x), 6)} ${u.b}`, big: true },
          { label: `${fmt(v.x, 6)} ${u.b} sama dengan`, value: `${fmt(u.g(v.x), 6)} ${u.a}` }
        ]
      };
    }
  },

  /* ============ KREDIT & PROPERTI ============ */
  {
    id: 'kredit', cat: 'kredit', icon: '🚗', title: 'Simulasi Kredit & Cicilan',
    desc: 'Cicilan kendaraan, elektronik, atau pinjaman: bunga flat, anuitas, atau efektif menurun, lengkap dengan tabel angsuran.',
    keywords: 'cicilan motor mobil pinjaman bunga flat anuitas angsuran',
    fields: [
      money('harga', 'Harga barang / nilai pinjaman', 250000000, { wide: true }),
      numf('dp', 'Uang muka (DP)', 20, '%'),
      numf('bunga', 'Bunga per tahun', 8, '%'),
      numf('tenor', 'Tenor', 4, 'tahun', { step: 0.25 }),
      {
        id: 'metode', label: 'Metode bunga', type: 'select', value: 'flat', wide: true,
        options: [
          { v: 'flat', t: 'Flat (umum pada kredit kendaraan)' },
          { v: 'anuitas', t: 'Anuitas / efektif (cicilan tetap)' },
          { v: 'menurun', t: 'Efektif menurun (pokok tetap, bunga turun)' }
        ]
      }
    ],
    calc(v) {
      chk(v.harga > 0, 'Harga harus lebih dari 0.');
      chk(v.dp >= 0 && v.dp < 100, 'DP harus antara 0% dan 99%.');
      chk(v.bunga >= 0 && v.bunga <= 100, 'Bunga harus antara 0% dan 100% per tahun.');
      chk(v.tenor > 0 && v.tenor <= 40, 'Tenor harus antara 0 dan 40 tahun.');
      const dp = (v.harga * v.dp) / 100, P = v.harga - dp, n = Math.round(v.tenor * 12);
      chk(n >= 1, 'Tenor minimal 1 bulan.');
      const rows = loanSchedule(P, n, v.bunga, v.metode);
      const totalInt = sum(rows, 'interest'), totalPay = sum(rows, 'pay');
      const cards = [];
      if (v.metode === 'menurun') {
        cards.push({ label: 'Cicilan bulan pertama', value: rp(rows[0].pay), big: true }, { label: 'Cicilan bulan terakhir', value: rp(rows[n - 1].pay) });
      } else {
        cards.push({ label: 'Cicilan per bulan', value: rp(rows[0].pay), big: true });
      }
      cards.push(
        { label: 'Uang muka (DP)', value: rp(dp) },
        { label: 'Pokok pinjaman', value: rp(P) },
        { label: 'Total bunga', value: rp(totalInt), tone: 'warn' },
        { label: 'Total cicilan', value: rp(totalPay) },
        { label: 'Total biaya (DP + cicilan)', value: rp(dp + totalPay) }
      );
      const notes = [];
      if (v.metode === 'flat') {
        const eff = solveRate(P, rows[0].pay, n) * 1200;
        cards.push({ label: 'Bunga efektif setara', value: pct(eff), sub: 'per tahun, ≈ bunga anuitas', tone: 'warn' });
        notes.push('Bunga flat dihitung dari pokok awal setiap bulan: cicilan = pokok ÷ tenor + pokok × bunga ÷ 12.');
        notes.push(`Bunga flat ${pct(v.bunga)} setara bunga efektif ±${pct(eff)} per tahun, jauh lebih mahal dari kelihatannya.`);
      } else if (v.metode === 'anuitas') {
        notes.push('Anuitas: cicilan = P × r ÷ (1 − (1 + r)^−n), dengan r = bunga bulanan dan n = jumlah bulan.');
      } else {
        notes.push('Efektif menurun: pokok dibayar tetap setiap bulan, bunga dihitung dari sisa pinjaman sehingga cicilan makin kecil.');
      }
      notes.push('Belum termasuk biaya provisi, administrasi, asuransi, dan denda keterlambatan.');
      return {
        cards, notes, chart: loanChart(P, rows),
        table: {
          title: 'Tabel angsuran bulanan', open: false,
          headers: ['Bulan', 'Cicilan (Rp)', 'Pokok (Rp)', 'Bunga (Rp)', 'Sisa pinjaman (Rp)'],
          rows: rows.map(r => [r.k, idr(r.pay), idr(r.principal), idr(r.interest), idr(r.bal)])
        }
      };
    }
  },
  {
    id: 'kpr', cat: 'kredit', icon: '🏠', title: 'Simulasi KPR',
    desc: 'Cicilan KPR dengan bunga fixed lalu floating, biaya awal, penghasilan minimal, dan ringkasan per tahun.',
    keywords: 'kpr rumah properti hipotek cicilan fixed floating bunga',
    fields: [
      money('harga', 'Harga properti', 800000000, { wide: true }),
      numf('dp', 'Uang muka (DP)', 20, '%'),
      numf('tenor', 'Tenor', 20, 'tahun'),
      numf('fixed', 'Bunga fixed', 6.5, '%'),
      numf('fixedYears', 'Masa fixed', 3, 'tahun', { step: 0.5 }),
      numf('floating', 'Bunga floating (setelah fixed)', 11, '%', { wide: true }),
      numf('biaya', 'Biaya akad & lain-lain', 5, '% harga', { hint: 'Estimasi: provisi, administrasi, notaris, BPHTB, asuransi.', wide: true }),
      money('gaji', 'Penghasilan bulanan (opsional)', 0, { optional: true, wide: true, hint: 'Isi untuk melihat rasio cicilan terhadap penghasilan.' })
    ],
    calc(v) {
      chk(v.harga > 0, 'Harga properti harus lebih dari 0.');
      chk(v.dp >= 0 && v.dp < 100, 'DP harus antara 0% dan 99%.');
      chk(v.tenor > 0 && v.tenor <= 35, 'Tenor harus antara 0 dan 35 tahun.');
      chk(v.fixed >= 0 && v.floating >= 0 && v.fixed <= 100 && v.floating <= 100, 'Bunga harus antara 0% dan 100%.');
      chk(v.fixedYears >= 0, 'Masa fixed tidak boleh negatif.');
      const dp = (v.harga * v.dp) / 100, P = v.harga - dp, n = Math.round(v.tenor * 12);
      chk(n >= 1, 'Tenor minimal 1 bulan.');
      const fm = Math.min(Math.round(v.fixedYears * 12), n);
      const segs = fm < n ? [{ months: fm, rate: v.fixed }, { months: n, rate: v.floating }] : [{ months: n, rate: v.fixed }];
      const rows = mortgageSchedule(P, n, segs);
      const totalInt = sum(rows, 'interest'), totalPay = sum(rows, 'pay');
      const payFixed = fm > 0 ? rows[0].pay : null;
      const payFloat = fm < n ? rows[n - 1].pay : null;
      const maxPay = Math.max(payFixed || 0, payFloat || 0);
      const biayaAwal = (v.harga * v.biaya) / 100;
      const cards = [];
      if (payFixed !== null) cards.push({ label: `Cicilan masa fixed (${fm} bulan pertama)`, value: rp(payFixed), big: true, sub: `Bunga ${pct(v.fixed)} per tahun` });
      if (payFloat !== null) cards.push(payFixed === null
        ? { label: 'Cicilan per bulan', value: rp(payFloat), big: true, sub: `Bunga ${pct(v.floating)} per tahun` }
        : { label: `Cicilan masa floating (setelah ${fm} bulan)`, value: rp(payFloat), tone: 'warn', sub: `Asumsi bunga ${pct(v.floating)} per tahun` });
      cards.push(
        { label: 'Plafon pinjaman', value: rp(P) },
        { label: 'Uang muka (DP)', value: rp(dp) },
        { label: 'Biaya akad & lain-lain', value: rp(biayaAwal) },
        { label: 'Dana awal yang disiapkan', value: rp(dp + biayaAwal), tone: 'ok', sub: 'DP + biaya' },
        { label: 'Total bunga', value: rp(totalInt), tone: 'warn' },
        { label: 'Total cicilan', value: rp(totalPay) },
        { label: 'Penghasilan minimal disarankan', value: rp(maxPay / 0.35), sub: 'jika cicilan maks. 35% dari penghasilan' }
      );
      if (v.gaji > 0) {
        const ratio = (maxPay / v.gaji) * 100;
        cards.push({ label: 'Rasio cicilan terhadap penghasilanmu', value: pct(ratio, 1), tone: ratio > 35 ? 'bad' : 'ok', sub: ratio > 35 ? 'di atas batas aman 35%' : 'masih dalam batas aman' });
      }
      return {
        cards, chart: loanChart(P, rows),
        notes: [
          'Cicilan dihitung anuitas: tetap selama masa fixed, lalu dihitung ulang dari sisa pokok saat bunga floating berlaku.',
          'Bunga floating pada kenyataannya berubah-ubah mengikuti kebijakan bank, jadi anggap hasilnya sebagai skenario.',
          'Biaya akad bervariasi (BPHTB, notaris, provisi, asuransi jiwa & kebakaran). Cek rincian dari bank dan developer.'
        ],
        table: {
          title: 'Ringkasan per tahun', open: true,
          headers: ['Tahun', 'Rata-rata cicilan/bln (Rp)', 'Pokok dibayar (Rp)', 'Bunga dibayar (Rp)', 'Sisa pinjaman (Rp)'],
          rows: yearlyRows(rows)
        }
      };
    }
  },
  {
    id: 'kemampuan-kpr', cat: 'kredit', icon: '💡', title: 'Kemampuan Ambil KPR',
    desc: 'Dari penghasilan dan cicilan yang sudah ada, berapa plafon dan harga rumah yang masih aman?',
    keywords: 'afford mampu plafon maksimal rasio dti gaji',
    fields: [
      money('gaji', 'Penghasilan bulanan', 15000000, { wide: true }),
      money('gaji2', 'Penghasilan pasangan (opsional)', 0, { optional: true, wide: true }),
      money('lain', 'Cicilan lain per bulan (opsional)', 0, { optional: true, wide: true }),
      numf('rasio', 'Batas rasio cicilan', 35, '%', { hint: 'Umumnya bank memakai 30–40% dari penghasilan.' }),
      numf('bunga', 'Bunga per tahun', 9, '%'),
      numf('tenor', 'Tenor', 20, 'tahun'),
      numf('dp', 'Uang muka (DP)', 20, '%')
    ],
    calc(v) {
      chk(v.rasio > 0 && v.rasio <= 100, 'Rasio harus antara 0% dan 100%.');
      chk(v.tenor > 0 && v.tenor <= 35, 'Tenor harus antara 0 dan 35 tahun.');
      chk(v.bunga >= 0 && v.bunga <= 100, 'Bunga harus antara 0% dan 100%.');
      chk(v.dp >= 0 && v.dp < 100, 'DP harus antara 0% dan 99%.');
      const income = v.gaji + v.gaji2;
      const maxPay = (income * v.rasio) / 100 - v.lain;
      chk(maxPay > 0, 'Cicilan lain sudah melebihi batas rasio. Tidak ada ruang untuk cicilan KPR baru.');
      const n = Math.round(v.tenor * 12), r = v.bunga / 1200;
      const plafon = r === 0 ? maxPay * n : (maxPay * (1 - Math.pow(1 + r, -n))) / r;
      const harga = plafon / (1 - v.dp / 100);
      return {
        cards: [
          { label: 'Harga rumah maksimal', value: rp(harga), big: true, sub: `dengan DP ${pct(v.dp, 0)}` },
          { label: 'Plafon KPR maksimal', value: rp(plafon) },
          { label: 'Cicilan maksimal per bulan', value: rp(maxPay) },
          { label: 'DP yang dibutuhkan', value: rp(harga - plafon) },
          { label: 'Total penghasilan dihitung', value: rp(income) }
        ],
        notes: ['Perhitungan memakai cicilan anuitas dengan bunga tetap sepanjang tenor. Sisakan juga ruang untuk dana darurat dan biaya awal (±5% harga).']
      };
    }
  },

  /* ============ INVESTASI & KEBEBASAN FINANSIAL ============ */
  {
    id: 'investasi', cat: 'invest', icon: '📈', title: 'Bunga Majemuk & Investasi',
    desc: 'Proyeksi pertumbuhan modal awal dan setoran rutin dengan return majemuk, termasuk daya beli setelah inflasi.',
    keywords: 'compound bunga berbunga reksa dana saham tabungan deposito proyeksi',
    fields: [
      money('awal', 'Modal awal', 10000000, { wide: true }),
      money('setor', 'Setoran per bulan', 1000000, { wide: true }),
      numf('naik', 'Kenaikan setoran / tahun', 0, '%', { hint: 'Mis. 5% jika setoran naik seiring gaji.' }),
      numf('ret', 'Return per tahun', 10, '%'),
      numf('tahun', 'Jangka waktu', 20, 'tahun'),
      numf('inflasi', 'Inflasi per tahun', 3, '%')
    ],
    calc(v) {
      chk(v.tahun > 0 && v.tahun <= 60, 'Jangka waktu harus antara 0 dan 60 tahun.');
      chk(v.ret > -50 && v.ret <= 100, 'Return harus antara -50% dan 100% per tahun.');
      chk(v.awal >= 0 && v.setor >= 0, 'Modal dan setoran tidak boleh negatif.');
      const rm = Math.pow(1 + v.ret / 100, 1 / 12) - 1, months = Math.round(v.tahun * 12);
      let bal = v.awal, dep = v.setor, tot = v.awal;
      const labels = ['0'], balS = [v.awal], totS = [v.awal], rows = [];
      for (let m = 1; m <= months; m++) {
        bal = bal * (1 + rm) + dep;
        tot += dep;
        if (m % 12 === 0 || m === months) {
          const y = Math.ceil(m / 12);
          rows.push([y, idr(tot), idr(bal - tot), idr(bal)]);
          labels.push(String(y)); balS.push(bal); totS.push(tot);
          if (m % 12 === 0) dep *= 1 + v.naik / 100;
        }
      }
      const real = bal / Math.pow(1 + v.inflasi / 100, v.tahun);
      return {
        cards: [
          { label: `Nilai akhir setelah ${fmt(v.tahun, 2)} tahun`, value: rp(bal), big: true },
          { label: 'Total modal disetor', value: rp(tot) },
          { label: 'Total keuntungan', value: rp(bal - tot), tone: 'ok' },
          { label: 'Pertumbuhan', value: tot > 0 ? fmt(bal / tot, 2) + '× modal' : '—' },
          { label: 'Setara uang hari ini', value: rp(real), sub: `setelah inflasi ${pct(v.inflasi)} per tahun`, tone: 'warn' }
        ],
        chart: { title: 'Pertumbuhan investasi (sumbu X = tahun ke-)', labels, series: [{ name: 'Nilai investasi', data: balS }, { name: 'Total modal disetor', data: totS }] },
        notes: ['Return diasumsikan konstan dan dimajemukkan bulanan; setoran dilakukan di akhir bulan. Return nyata investasi naik-turun dan tidak dijamin.'],
        table: { title: 'Rincian per tahun', open: false, headers: ['Tahun', 'Total modal (Rp)', 'Keuntungan (Rp)', 'Nilai investasi (Rp)'], rows }
      };
    }
  },
  {
    id: 'target-tabungan', cat: 'invest', icon: '🎯', title: 'Target Tabungan / Dana Tujuan',
    desc: 'Berapa yang harus ditabung per bulan untuk dana pendidikan, DP rumah, nikah, atau liburan, termasuk efek inflasi.',
    keywords: 'dana pendidikan target menabung goal nikah haji',
    fields: [
      money('target', 'Target dana (harga hari ini)', 200000000, { wide: true }),
      money('sekarang', 'Dana yang sudah ada', 20000000, { wide: true, optional: true }),
      numf('tahun', 'Jangka waktu', 8, 'tahun'),
      numf('ret', 'Return per tahun', 7, '%'),
      numf('inflasi', 'Inflasi per tahun', 4, '%', { wide: true })
    ],
    calc(v) {
      chk(v.tahun > 0 && v.tahun <= 60, 'Jangka waktu harus antara 0 dan 60 tahun.');
      chk(v.target > 0, 'Target dana harus lebih dari 0.');
      chk(v.ret > -50 && v.ret <= 100, 'Return harus antara -50% dan 100%.');
      const n = Math.round(v.tahun * 12), rm = Math.pow(1 + v.ret / 100, 1 / 12) - 1;
      const targetNom = v.target * Math.pow(1 + v.inflasi / 100, v.tahun);
      const fvNow = v.sekarang * Math.pow(1 + rm, n);
      const need = targetNom - fvNow;
      const cards = [{ label: 'Target dana nanti (setelah inflasi)', value: rp(targetNom), sub: `harga hari ini ${rp(v.target)}` }];
      const notes = [];
      if (need <= 0) {
        cards.unshift({ label: 'Setoran per bulan', value: 'Rp 0', big: true, tone: 'ok', sub: 'Dana yang ada saja sudah cukup 🎉' });
        cards.push({ label: 'Dana saat ini akan menjadi', value: rp(fvNow) });
      } else {
        const setor = rm === 0 ? need / n : (need * rm) / (Math.pow(1 + rm, n) - 1);
        const total = setor * n;
        cards.unshift({ label: 'Setoran per bulan yang dibutuhkan', value: rp(setor), big: true });
        cards.push(
          { label: 'Total setoran', value: rp(total) },
          { label: 'Perkiraan hasil investasi', value: rp(targetNom - v.sekarang - total), tone: 'ok' }
        );
        notes.push('Setoran dilakukan di akhir setiap bulan dan dianggap tetap. Naikkan setoran seiring gaji agar lebih ringan.');
      }
      return { cards, notes };
    }
  },
  {
    id: 'inflasi', cat: 'invest', icon: '🎈', title: 'Inflasi & Daya Beli',
    desc: 'Lihat harga barang di masa depan dan seberapa tergerus nilai uangmu oleh inflasi.',
    keywords: 'inflasi harga masa depan nilai uang daya beli',
    fields: [
      money('harga', 'Nilai / harga hari ini', 100000000, { wide: true }),
      numf('inflasi', 'Inflasi per tahun', 4, '%'),
      numf('tahun', 'Jangka waktu', 10, 'tahun')
    ],
    calc(v) {
      chk(v.harga >= 0, 'Nilai tidak boleh negatif.');
      chk(v.tahun > 0 && v.tahun <= 60, 'Jangka waktu harus antara 0 dan 60 tahun.');
      chk(v.inflasi > -50 && v.inflasi <= 100, 'Inflasi harus antara -50% dan 100%.');
      const g = Math.pow(1 + v.inflasi / 100, v.tahun);
      const rows = [];
      for (let y = 1; y <= Math.ceil(v.tahun); y++) {
        const f = Math.pow(1 + v.inflasi / 100, y);
        rows.push([y, idr(v.harga * f), idr(v.harga / f)]);
      }
      return {
        cards: [
          { label: `Harga barang yang sama ${fmt(v.tahun, 2)} tahun lagi`, value: rp(v.harga * g), big: true },
          { label: `Daya beli uang ${rp(v.harga)} nanti`, value: rp(v.harga / g), tone: 'warn', sub: 'setara uang hari ini' },
          { label: 'Penurunan daya beli', value: pct((1 - 1 / g) * 100, 1), tone: 'bad' },
          { label: 'Kenaikan harga total', value: pct((g - 1) * 100, 1) }
        ],
        table: { title: 'Rincian per tahun', open: false, headers: ['Tahun', 'Harga nanti (Rp)', 'Daya beli uang (Rp)'], rows }
      };
    }
  },
  {
    id: 'fire', cat: 'invest', icon: '🔥', title: 'Kebebasan Finansial (FIRE)',
    desc: 'Hitung angka kebebasan finansial, progresmu sekarang, dan perkiraan kapan aset bisa menanggung biaya hidup.',
    keywords: 'financial freedom fire pensiun dini passive income dana pensiun swr 4%',
    fields: [
      numf('usia', 'Usia sekarang', 30, 'tahun'),
      money('pengeluaran', 'Pengeluaran bulanan (hari ini)', 8000000, { wide: true }),
      money('aset', 'Aset investasi saat ini', 100000000, { wide: true, optional: true }),
      money('setor', 'Investasi per bulan', 5000000, { wide: true, optional: true }),
      numf('naik', 'Kenaikan setoran / tahun', 5, '%', { hint: 'Mengikuti kenaikan gaji.' }),
      numf('ret', 'Return investasi / tahun', 10, '%', { hint: 'Nominal, sebelum inflasi.' }),
      numf('inflasi', 'Inflasi per tahun', 4, '%'),
      numf('swr', 'Tingkat penarikan aman', 4, '%', { hint: 'Aturan 4% populer; untuk horizon >40 tahun banyak yang memakai 3–3,5%.' })
    ],
    calc(v) {
      chk(v.usia > 0 && v.usia < 100, 'Usia tidak valid.');
      chk(v.pengeluaran > 0, 'Pengeluaran bulanan harus lebih dari 0.');
      chk(v.swr > 0 && v.swr <= 15, 'Tingkat penarikan harus antara 0% dan 15%.');
      chk(v.ret > -50 && v.ret <= 100 && v.inflasi > -50 && v.inflasi <= 100, 'Return dan inflasi di luar batas wajar.');
      const rm = Math.pow(1 + v.ret / 100, 1 / 12) - 1, inf = v.inflasi / 100;
      const fiToday = (v.pengeluaran * 12) / (v.swr / 100);
      let assets = v.aset, dep = v.setor, hit = null;
      const labels = [], A = [], T = [], rows = [];
      for (let y = 0; y <= 60; y++) {
        const target = fiToday * Math.pow(1 + inf, y);
        labels.push(String(y)); A.push(assets); T.push(target);
        rows.push([y, v.usia + y, idr(assets), idr(target)]);
        if (assets >= target) { hit = { y, assets, target }; break; }
        for (let m = 0; m < 12; m++) assets = assets * (1 + rm) + dep;
        dep *= 1 + v.naik / 100;
      }
      const cards = [];
      if (hit) {
        if (hit.y === 0) cards.push({ label: 'Status', value: 'Kamu sudah mencapai angka FI 🎉', big: true });
        else cards.push({ label: 'Perkiraan mencapai kebebasan finansial', value: `${hit.y} tahun lagi (usia ${v.usia + hit.y})`, big: true });
        cards.push(
          { label: 'Aset saat itu (nominal)', value: rp(hit.assets) },
          { label: 'Target FI saat itu (nominal)', value: rp(hit.target), sub: 'sudah disesuaikan inflasi' },
          { label: 'Pengeluaran bulanan saat itu', value: rp(v.pengeluaran * Math.pow(1 + inf, hit.y)), sub: `setara ${rp(v.pengeluaran)} hari ini` }
        );
      } else {
        cards.push({ label: 'Perkiraan mencapai kebebasan finansial', value: 'Belum tercapai dalam 60 tahun', big: true, tone: 'bad' });
      }
      cards.push(
        { label: 'Angka FI hari ini', value: rp(fiToday), sub: 'pengeluaran tahunan ÷ tingkat penarikan' },
        { label: 'Progres saat ini', value: pct((v.aset / fiToday) * 100, 1) },
        { label: 'Pendapatan pasif dari aset sekarang', value: rp((v.aset * (v.swr / 100)) / 12), sub: 'per bulan, pada tingkat penarikan aman' }
      );
      const notes = [
        'Angka FI = pengeluaran tahunan ÷ tingkat penarikan (4% → 25× pengeluaran tahunan). Target dinaikkan tiap tahun sesuai inflasi.',
        'Ini simulasi sederhana dengan return konstan. Return nyata fluktuatif, jadi sisakan margin keamanan dan dana darurat.'
      ];
      if (!hit) notes.push('Coba naikkan investasi per bulan, turunkan pengeluaran, atau perpanjang horizon waktu.');
      return {
        cards, notes,
        chart: { title: 'Aset vs target kebebasan finansial (sumbu X = tahun dari sekarang)', labels, series: [{ name: 'Aset kamu', data: A }, { name: 'Target FI (disesuaikan inflasi)', data: T }] },
        table: { title: 'Proyeksi per tahun', open: false, headers: ['Tahun', 'Usia', 'Aset (Rp)', 'Target FI (Rp)'], rows }
      };
    }
  },
  {
    id: 'cagr', cat: 'invest', icon: '🚀', title: 'CAGR & Aturan 72',
    desc: 'Hitung laju pertumbuhan tahunan rata-rata (CAGR) dan perkiraan waktu uang berlipat ganda.',
    keywords: 'cagr return pertumbuhan rule of 72 gandakan',
    fields: [
      money('awal', 'Nilai awal', 50000000, { wide: true }),
      money('akhir', 'Nilai akhir', 120000000, { wide: true }),
      numf('tahun', 'Lama', 5, 'tahun', { step: 0.5 }),
      numf('ret', 'Return untuk Aturan 72', 10, '% / tahun')
    ],
    calc(v) {
      chk(v.awal > 0 && v.akhir > 0, 'Nilai awal dan akhir harus lebih dari 0.');
      chk(v.tahun > 0, 'Lama harus lebih dari 0.');
      chk(v.ret > 0, 'Return harus lebih dari 0 untuk Aturan 72.');
      const cagr = (Math.pow(v.akhir / v.awal, 1 / v.tahun) - 1) * 100;
      return {
        sections: [
          {
            title: 'Pertumbuhan tahunan (CAGR)', cards: [
              { label: 'CAGR', value: pct(cagr, 2), big: true, sub: 'per tahun' },
              { label: 'Total pertumbuhan', value: pct((v.akhir / v.awal - 1) * 100, 2) },
              { label: 'Kelipatan', value: fmt(v.akhir / v.awal, 2) + '×' }
            ]
          },
          {
            title: `Waktu menggandakan uang pada ${pct(v.ret, 2)} per tahun`, cards: [
              { label: 'Aturan 72 (pendekatan)', value: fmt(72 / v.ret, 1) + ' tahun' },
              { label: 'Perhitungan eksak', value: fmt(Math.log(2) / Math.log(1 + v.ret / 100), 2) + ' tahun' }
            ]
          }
        ]
      };
    }
  },

  /* ============ BISNIS & BELANJA ============ */
  {
    id: 'diskon', cat: 'bisnis', icon: '🏷️', title: 'Diskon & PPN',
    desc: 'Harga setelah diskon bertingkat dan PPN, atau pisahkan PPN dari harga yang sudah termasuk pajak.',
    keywords: 'diskon ppn pajak belanja sale harga akhir',
    fields: [
      money('harga', 'Harga satuan', 1500000, { wide: true }),
      numf('qty', 'Jumlah', 1, 'unit'),
      numf('d1', 'Diskon 1', 30, '%'),
      numf('d2', 'Diskon tambahan', 10, '%', { optional: true }),
      numf('ppn', 'PPN', 11, '%'),
      {
        id: 'mode', label: 'Harga yang diinput', type: 'select', value: 'belum', wide: true,
        options: [{ v: 'belum', t: 'Belum termasuk PPN' }, { v: 'sudah', t: 'Sudah termasuk PPN' }]
      }
    ],
    calc(v) {
      chk(v.harga >= 0 && v.qty > 0, 'Harga dan jumlah harus valid.');
      chk(v.d1 >= 0 && v.d1 <= 100 && v.d2 >= 0 && v.d2 <= 100, 'Diskon harus antara 0% dan 100%.');
      chk(v.ppn >= 0 && v.ppn <= 100, 'PPN harus antara 0% dan 100%.');
      const awal = v.harga * v.qty, setelah = awal * (1 - v.d1 / 100) * (1 - v.d2 / 100);
      let dpp, ppn, total;
      if (v.mode === 'belum') { dpp = setelah; ppn = dpp * (v.ppn / 100); total = dpp + ppn; }
      else { total = setelah; dpp = total / (1 + v.ppn / 100); ppn = total - dpp; }
      return {
        cards: [
          { label: 'Total yang dibayar', value: rp(total), big: true },
          { label: 'Harga sebelum diskon', value: rp(awal) },
          { label: 'Potongan diskon', value: rp(awal - setelah), tone: 'ok', sub: `diskon efektif ${pct((1 - setelah / (awal || 1)) * 100, 2)}` },
          { label: 'Dasar pengenaan pajak (DPP)', value: rp(dpp) },
          { label: `PPN ${pct(v.ppn, 2)}`, value: rp(ppn) }
        ],
        notes: ['Diskon bertingkat dihitung berurutan: 30% + 10% bukan 40%, melainkan 37% efektif.']
      };
    }
  },
  {
    id: 'laba', cat: 'bisnis', icon: '💼', title: 'Margin, Markup & Titik Impas (BEP)',
    desc: 'Hitung margin keuntungan, markup, titik impas, dan laba bulanan usaha kecil.',
    keywords: 'laba untung bep break even margin markup hpp usaha jualan',
    fields: [
      money('hpp', 'Modal / HPP per unit', 15000, { wide: true }),
      money('jual', 'Harga jual per unit', 25000, { wide: true }),
      money('fix', 'Biaya tetap per bulan', 5000000, { wide: true, hint: 'Sewa, gaji, listrik, dan biaya rutin lainnya.' }),
      numf('qty', 'Perkiraan terjual / bulan', 800, 'unit', { wide: true })
    ],
    calc(v) {
      chk(v.hpp >= 0 && v.jual > 0, 'Harga jual harus lebih dari 0 dan modal tidak boleh negatif.');
      chk(v.qty >= 0 && v.fix >= 0, 'Jumlah dan biaya tetap tidak boleh negatif.');
      const unit = v.jual - v.hpp;
      const bep = unit > 0 ? Math.ceil(v.fix / unit) : NaN;
      const laba = unit * v.qty - v.fix;
      const cards = [
        { label: 'Laba bersih per bulan', value: rp(laba), big: true, tone: '' },
        { label: 'Laba kotor per unit', value: rp(unit) },
        { label: 'Margin (laba ÷ harga jual)', value: pct((unit / v.jual) * 100, 2) },
        { label: 'Markup (laba ÷ modal)', value: v.hpp > 0 ? pct((unit / v.hpp) * 100, 2) : '—' },
        { label: 'Titik impas (BEP)', value: unit > 0 ? `${fmt(bep, 0)} unit / bulan` : 'Tidak tercapai', tone: unit > 0 ? '' : 'bad' },
        { label: 'BEP dalam rupiah', value: unit > 0 ? rp(bep * v.jual) : '—' }
      ];
      const notes = [];
      if (unit <= 0) notes.push('Harga jual tidak lebih tinggi dari modal, sehingga usaha tidak akan pernah impas.');
      else if (laba < 0) notes.push(`Dengan ${fmt(v.qty, 0)} unit, usaha masih rugi. Butuh minimal ${fmt(bep, 0)} unit agar impas.`);
      return { cards, notes };
    }
  },
  {
    id: 'split-bill', cat: 'bisnis', icon: '🍽️', title: 'Patungan / Split Bill',
    desc: 'Bagi tagihan makan bersama, lengkap dengan pajak, service, dan pembulatan.',
    keywords: 'split bill patungan bagi tagihan restoran',
    fields: [
      money('total', 'Total tagihan (sebelum pajak)', 850000, { wide: true }),
      numf('pajak', 'Pajak & service', 10, '%'),
      numf('orang', 'Jumlah orang', 5, 'orang', { step: 1 })
    ],
    calc(v) {
      chk(v.total >= 0, 'Total tagihan tidak boleh negatif.');
      chk(Number.isInteger(v.orang) && v.orang >= 1 && v.orang <= 1000, 'Jumlah orang harus bilangan bulat 1–1000.');
      const grand = v.total * (1 + v.pajak / 100), per = grand / v.orang, round = Math.ceil(per / 1000) * 1000;
      return {
        cards: [
          { label: 'Per orang', value: rp(per), big: true },
          { label: 'Dibulatkan ke atas (Rp 1.000)', value: rp(round), sub: `terkumpul ${rp(round * v.orang)}` },
          { label: 'Total dengan pajak', value: rp(grand) },
          { label: 'Pajak & service', value: rp(grand - v.total) }
        ]
      };
    }
  },

  /* ============ LAINNYA ============ */
  {
    id: 'usia', cat: 'lain', icon: '🎂', title: 'Usia & Selisih Tanggal',
    desc: 'Hitung usia tepat, selisih hari antar dua tanggal, dan hitung mundur ulang tahun berikutnya.',
    keywords: 'umur ulang tahun hari tanggal selisih',
    fields: [
      { id: 'lahir', label: 'Tanggal awal / lahir', type: 'date', value: '1995-06-15' },
      { id: 'acuan', label: 'Tanggal acuan', type: 'date', value: todayStr }
    ],
    calc(v) {
      chk(v.lahir && v.acuan, 'Isi kedua tanggal.');
      const a = parseDate(v.lahir), b = parseDate(v.acuan);
      chk(a <= b, 'Tanggal awal harus sebelum atau sama dengan tanggal acuan.');
      let y = b.getFullYear() - a.getFullYear(), m = b.getMonth() - a.getMonth(), d = b.getDate() - a.getDate();
      if (d < 0) { m--; d += new Date(b.getFullYear(), b.getMonth(), 0).getDate(); }
      if (m < 0) { y--; m += 12; }
      const days = Math.round((b - a) / 864e5);
      let next = new Date(b.getFullYear(), a.getMonth(), a.getDate());
      if (next < b) next = new Date(b.getFullYear() + 1, a.getMonth(), a.getDate());
      const left = Math.round((next - b) / 864e5);
      const dFmt = dt => dt.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      return {
        cards: [
          { label: 'Selisih / usia', value: `${y} tahun ${m} bulan ${d} hari`, big: true },
          { label: 'Total hari', value: fmt(days, 0) + ' hari' },
          { label: 'Total minggu', value: `${fmt(Math.floor(days / 7), 0)} minggu ${days % 7} hari` },
          { label: 'Total bulan', value: fmt(y * 12 + m, 0) + ' bulan' },
          { label: 'Tanggal awal jatuh pada', value: dFmt(a) },
          { label: 'Ulang tahun berikutnya', value: left === 0 ? 'Hari ini! 🎉' : `${fmt(left, 0)} hari lagi`, sub: dFmt(next) }
        ]
      };
    }
  },
  {
    id: 'bmi', cat: 'lain', icon: '⚖️', title: 'BMI & Berat Ideal',
    desc: 'Indeks massa tubuh dan rentang berat badan sehat berdasarkan kategori Asia-Pasifik (WHO).',
    keywords: 'bmi berat badan tinggi ideal obesitas kurus',
    fields: [numf('tinggi', 'Tinggi badan', 170, 'cm'), numf('berat', 'Berat badan', 68, 'kg')],
    calc(v) {
      chk(v.tinggi >= 50 && v.tinggi <= 260, 'Tinggi badan harus antara 50 dan 260 cm.');
      chk(v.berat >= 10 && v.berat <= 500, 'Berat badan harus antara 10 dan 500 kg.');
      const m = v.tinggi / 100, bmi = v.berat / (m * m);
      const cat = bmi < 18.5 ? ['Kekurangan berat badan', 'warn'] : bmi < 23 ? ['Normal', 'ok'] : bmi < 25 ? ['Kelebihan berat badan (berisiko)', 'warn'] : bmi < 30 ? ['Obesitas tingkat I', 'bad'] : ['Obesitas tingkat II', 'bad'];
      const lo = 18.5 * m * m, hi = 22.9 * m * m;
      return {
        cards: [
          { label: 'BMI', value: fmt(bmi, 1), big: true, sub: cat[0] },
          { label: 'Kategori', value: cat[0], tone: cat[1] },
          { label: 'Rentang berat normal', value: `${fmt(lo, 1)} – ${fmt(hi, 1)} kg` },
          { label: v.berat > hi ? 'Kelebihan dari batas atas' : v.berat < lo ? 'Kekurangan dari batas bawah' : 'Selisih dari rentang normal', value: v.berat > hi ? `${fmt(v.berat - hi, 1)} kg` : v.berat < lo ? `${fmt(lo - v.berat, 1)} kg` : '0 kg' }
        ],
        notes: ['BMI hanyalah indikator kasar dan tidak membedakan massa otot dan lemak. Konsultasikan dengan tenaga kesehatan untuk penilaian menyeluruh.']
      };
    }
  }
];

/* =====================================================================
   KALKULATOR ILMIAH (komponen khusus)
   ===================================================================== */
function initCalculator(root) {
  const KEYS = [
    { t: 'C', v: 'C', c: 'fn' }, { t: '⌫', v: 'DEL', c: 'fn' }, { t: '(', v: '(', c: 'fn' }, { t: ')', v: ')', c: 'fn' },
    { t: '√', v: 'sqrt(', c: 'fn' }, { t: 'π', v: 'pi', c: 'fn' }, { t: 'xʸ', v: '^', c: 'fn' }, { t: '÷', v: '÷', c: 'op' },
    { t: '7', v: '7' }, { t: '8', v: '8' }, { t: '9', v: '9' }, { t: '×', v: '×', c: 'op' },
    { t: '4', v: '4' }, { t: '5', v: '5' }, { t: '6', v: '6' }, { t: '−', v: '-', c: 'op' },
    { t: '1', v: '1' }, { t: '2', v: '2' }, { t: '3', v: '3' }, { t: '+', v: '+', c: 'op' },
    { t: '0', v: '0' }, { t: '.', v: '.' }, { t: '%', v: '%', c: 'fn' }, { t: '=', v: '=', c: 'eq' }
  ];
  const FNS = ['sin(', 'cos(', 'tan(', 'ln(', 'log(', 'abs(', 'e'];
  root.innerHTML = `
    <div class="sci panel">
      <div class="sci-screen">
        <div id="cprev" class="sci-prev" aria-live="polite"></div>
        <input id="cin" class="sci-input" type="text" autocomplete="off" spellcheck="false" placeholder="0" aria-label="Ekspresi">
      </div>
      <div class="sci-fn">${FNS.map(t => `<button type="button" data-ins="${t}">${t.replace('(', '')}</button>`).join('')}</div>
      <div class="sci-keys">${KEYS.map(k => `<button type="button" class="k ${k.c || ''}" data-k="${esc(k.v)}">${k.t}</button>`).join('')}</div>
      <div class="sci-hist"><h3>Riwayat</h3><div id="chist"><span class="muted small">Belum ada perhitungan.</span></div></div>
    </div>
    <p class="muted small">Tips: ketik langsung dengan keyboard, tekan Enter untuk hasil. “%” berarti dibagi 100 (50% = 0,5). sin/cos/tan memakai derajat.</p>`;
  const inp = $('#cin', root), prev = $('#cprev', root), hist = [];
  const clean = v => String(parseFloat(v.toPrecision(12)));

  function preview() {
    const t = inp.value.trim();
    if (!t) { prev.textContent = ''; return; }
    try { const v = evalExpr(t); prev.textContent = Number.isFinite(v) ? '= ' + fmt(v, 10) : ''; } catch (e) { prev.textContent = ''; }
  }
  function insert(t) {
    const s = inp.selectionStart ?? inp.value.length, e = inp.selectionEnd ?? s;
    inp.value = inp.value.slice(0, s) + t + inp.value.slice(e);
    const p = s + t.length;
    inp.setSelectionRange(p, p);
    preview();
  }
  function del() {
    const s = inp.selectionStart ?? inp.value.length, e = inp.selectionEnd ?? s;
    if (s !== e) inp.value = inp.value.slice(0, s) + inp.value.slice(e);
    else if (s > 0) { inp.value = inp.value.slice(0, s - 1) + inp.value.slice(s); inp.setSelectionRange(s - 1, s - 1); }
    preview();
  }
  function renderHist() {
    $('#chist', root).innerHTML = hist.length
      ? hist.map((h, i) => `<button type="button" data-h="${i}">${esc(h.e)} = <b>${esc(h.r)}</b></button>`).join('')
      : '<span class="muted small">Belum ada perhitungan.</span>';
  }
  function equals() {
    const t = inp.value.trim();
    if (!t) return;
    try {
      const v = evalExpr(t);
      if (!Number.isFinite(v)) throw new Error('Hasil tidak terdefinisi (mis. pembagian dengan nol)');
      const out = clean(v);
      hist.unshift({ e: t, r: out });
      hist.length = Math.min(hist.length, 10);
      inp.value = out;
      prev.textContent = '';
      renderHist();
    } catch (e) { prev.textContent = '⚠️ ' + e.message; }
  }
  root.addEventListener('click', ev => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.ins) insert(b.dataset.ins);
    else if (b.dataset.h) { inp.value = hist[+b.dataset.h].r; preview(); }
    else if (b.dataset.k) {
      const k = b.dataset.k;
      if (k === 'C') { inp.value = ''; preview(); }
      else if (k === 'DEL') del();
      else if (k === '=') equals();
      else insert(k);
    }
  });
  inp.addEventListener('input', preview);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); equals(); } });
}

/* =====================================================================
   RENDER UI
   ===================================================================== */
const COLORS = ['#4f46e5', '#10b981', '#f59e0b'];
let currentId = 'home';
let lastChart = null;

const cardsHTML = cs => `<div class="cards">${cs.map(c =>
  `<div class="card${c.big ? ' big' : ''}${c.tone ? ' ' + c.tone : ''}"><span class="k">${c.label}</span><strong class="v">${c.value}</strong>${c.sub ? `<small>${c.sub}</small>` : ''}</div>`
).join('')}</div>`;

const tableHTML = t => `<details class="tbl"${t.open ? ' open' : ''}><summary>${t.title}</summary><div class="table-wrap"><table><thead><tr>${t.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${t.rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;

function resultHTML(res) {
  let h = '';
  if (res.cards) h += cardsHTML(res.cards);
  (res.sections || []).forEach(s => { h += `<h3>${s.title}</h3>` + cardsHTML(s.cards); });
  if (res.chart) {
    h += `<div class="chart-box"><h3>${res.chart.title}</h3><canvas id="chart" role="img" aria-label="${esc(res.chart.title)}"></canvas><div class="legend">${res.chart.series.map((s, i) => `<span><i style="background:${COLORS[i % COLORS.length]}"></i>${s.name}</span>`).join('')}</div></div>`;
  }
  if (res.table) h += tableHTML(res.table);
  if (res.notes && res.notes.length) h += `<ul class="notes">${res.notes.map(n => `<li>${n}</li>`).join('')}</ul>`;
  return h;
}

function fieldHTML(f) {
  const val = typeof f.value === 'function' ? f.value() : f.value;
  let input;
  if (f.type === 'select') {
    input = `<select id="f_${f.id}">${f.options.map(o => `<option value="${esc(o.v)}"${String(o.v) === String(val) ? ' selected' : ''}>${esc(o.t)}</option>`).join('')}</select>`;
  } else if (f.type === 'textarea') {
    input = `<textarea id="f_${f.id}" rows="4">${esc(val)}</textarea>`;
  } else if (f.type === 'text') {
    input = `<input class="plain" id="f_${f.id}" type="text" value="${esc(val)}" style="width:100%;padding:11px 12px;border:1px solid var(--border);border-radius:12px;background:var(--bg)">`;
  } else if (f.type === 'date') {
    input = `<input id="f_${f.id}" type="date" value="${esc(val)}">`;
  } else if (f.type === 'money') {
    input = `<div class="input-wrap"><span class="affix">Rp</span><input id="f_${f.id}" type="text" inputmode="numeric" data-money="1" value="${fmtInt(val)}"></div>`;
  } else {
    input = `<div class="input-wrap"><input id="f_${f.id}" type="number" inputmode="decimal" step="${f.step || 'any'}" value="${val}">${f.suffix ? `<span class="affix">${esc(f.suffix)}</span>` : ''}</div>`;
  }
  return `<label class="field${f.wide ? ' wide' : ''}" for="f_${f.id}"><span class="lbl">${esc(f.label)}</span>${input}${f.hint ? `<small>${esc(f.hint)}</small>` : ''}</label>`;
}

function readValues(def, root) {
  const v = {};
  def.fields.forEach(f => {
    const el = $('#f_' + f.id, root);
    if (f.type === 'money') v[f.id] = parseInt(el.value.replace(/\D/g, ''), 10) || 0;
    else if (f.type === 'number') v[f.id] = el.value === '' ? (f.optional ? 0 : NaN) : parseFloat(el.value);
    else v[f.id] = el.value;
  });
  return v;
}

function formatMoneyInput(el) {
  const pos = el.selectionStart ?? el.value.length;
  const before = el.value.slice(0, pos).replace(/\D/g, '').length;
  const digits = el.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  el.value = formatted;
  let count = 0, i = 0;
  for (; i < formatted.length && count < before; i++) if (/\d/.test(formatted[i])) count++;
  try { el.setSelectionRange(i, i); } catch (e) { /* abaikan */ }
}

/* ---------- Grafik garis (canvas, tanpa library) ---------- */
function drawChart(cv, cfg) {
  const dpr = window.devicePixelRatio || 1;
  const w = cv.clientWidth, h = cv.clientHeight;
  if (!w || !h) return;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const st = getComputedStyle(document.documentElement);
  const grid = st.getPropertyValue('--border').trim() || '#ddd', txt = st.getPropertyValue('--muted').trim() || '#777';
  const L = 62, R = 14, T = 12, B = 30, n = cfg.labels.length;
  let max = Math.max(0, ...cfg.series.flatMap(s => s.data.filter(Number.isFinite)));
  if (max <= 0) max = 1;
  const p = Math.pow(10, Math.floor(Math.log10(max))), f = max / p;
  const top = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  ctx.font = '12px system-ui, sans-serif';
  ctx.lineWidth = 1; ctx.strokeStyle = grid; ctx.fillStyle = txt;
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let i = 0; i <= 5; i++) {
    const y = T + (h - T - B) * (1 - i / 5);
    ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(w - R, y); ctx.stroke();
    ctx.fillText(short((top * i) / 5), L - 8, y);
  }
  const X = i => L + (n <= 1 ? 0 : (i * (w - L - R)) / (n - 1));
  const Y = val => T + (h - T - B) * (1 - Math.min(val, top) / top);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  const every = Math.max(1, Math.ceil(n / 8));
  cfg.labels.forEach((lb, i) => { if (i % every === 0) ctx.fillText(lb, X(i), h - B + 8); });
  cfg.series.forEach((s, si) => {
    ctx.strokeStyle = COLORS[si % COLORS.length]; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    ctx.beginPath();
    s.data.forEach((val, i) => { const x = X(i), y = Y(val); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
    ctx.stroke();
  });
}
function redrawChart() {
  if (!lastChart) return;
  const cv = $('#chart');
  if (cv) drawChart(cv, lastChart);
}

/* ---------- Halaman ---------- */
function renderHome() {
  $('#main').innerHTML = `
    <section class="hero">
      <h1>Hitung apa saja,<br>langsung di browser.</h1>
      <p>Kumpulan kalkulator matematika dan keuangan.</p>
    </section>
    ${CATS.map(cat => `<h2 class="cat-title">${cat.icon} ${cat.name}</h2><div class="tile-grid">${CALCS.filter(c => c.cat === cat.id).map(c =>
      `<a class="tile" href="#${c.id}"><span class="tile-ic">${c.icon}</span><strong>${c.title}</strong><span>${c.desc}</span></a>`).join('')}</div>`).join('')}
    <p class="disclaimer">Hasil bersifat estimasi untuk simulasi dan edukasi, bukan nasihat keuangan. Bunga, biaya, dan pajak sebenarnya mengikuti ketentuan bank atau lembaga terkait.</p>`;
}

function renderCalc(def) {
  const main = $('#main');
  const head = `<div class="calc-head"><span class="emoji">${def.icon}</span><div><h1>${def.title}</h1><p>${def.desc}</p></div></div>`;
  lastChart = null;
  if (def.custom) {
    main.innerHTML = `<section>${head}<div id="customRoot"></div></section>`;
    def.custom($('#customRoot'));
    return;
  }
  main.innerHTML = `<section>${head}
    <div class="calc-body">
      <form id="form" class="panel" autocomplete="off" onsubmit="return false">
        <div class="form-grid">${def.fields.map(fieldHTML).join('')}</div>
        <div class="actions">
          <button type="button" class="btn" id="resetBtn">↺ Reset</button>
          <button type="button" class="btn" id="copyBtn">📋 Salin hasil</button>
        </div>
      </form>
      <div id="result" class="result" aria-live="polite"></div>
    </div></section>`;
  const form = $('#form'), out = $('#result');
  function run() {
    try {
      const v = readValues(def, form);
      if (Object.values(v).some(x => typeof x === 'number' && Number.isNaN(x))) throw new Error('Lengkapi semua isian dengan angka yang valid.');
      const res = def.calc(v);
      out.innerHTML = resultHTML(res);
      lastChart = res.chart || null;
      if (res.chart) drawChart($('#chart', out), res.chart);
    } catch (e) {
      lastChart = null;
      out.innerHTML = `<div class="error">⚠️ ${esc(e.message)}</div>`;
    }
  }
  form.addEventListener('input', ev => {
    if (ev.target.dataset && ev.target.dataset.money) formatMoneyInput(ev.target);
    run();
  });
  $('#resetBtn').addEventListener('click', () => renderCalc(def));
  $('#copyBtn').addEventListener('click', ev => {
    const lines = [`${def.title} — HitungKu`];
    out.querySelectorAll('.card').forEach(c => lines.push(`${c.querySelector('.k').textContent}: ${c.querySelector('.v').textContent}`));
    const btn = ev.currentTarget;
    const done = ok => { btn.textContent = ok ? '✓ Tersalin' : 'Gagal menyalin'; setTimeout(() => (btn.textContent = '📋 Salin hasil'), 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText(lines.join('\n')).then(() => done(true), () => done(false));
    else done(false);
  });
  run();
}

/* ---------- Navigasi & router ---------- */
function buildNav(q = '') {
  q = q.trim().toLowerCase();
  const html = CATS.map(cat => {
    const items = CALCS.filter(c => c.cat === cat.id && (!q || `${c.title} ${c.desc} ${c.keywords || ''}`.toLowerCase().includes(q)));
    if (!items.length) return '';
    return `<div class="nav-group"><h4>${cat.icon} ${cat.name}</h4>${items.map(c => `<a href="#${c.id}" class="${c.id === currentId ? 'active' : ''}">${c.icon} ${c.title}</a>`).join('')}</div>`;
  }).join('');
  $('#nav').innerHTML = html || '<p class="muted small">Kalkulator tidak ditemukan.</p>';
}
function route() {
  const id = (location.hash || '#home').slice(1);
  const def = CALCS.find(c => c.id === id);
  currentId = def ? id : 'home';
  if (def) renderCalc(def); else renderHome();
  buildNav($('#search').value);
  document.title = def ? `${def.title} — ZaidMath` : 'ZaidMath — Kalkulator Matematika & Keuangan';
  document.body.classList.remove('menu-open');
  window.scrollTo(0, 0);
}

function init() {
  const root = document.documentElement;
  try { const t = localStorage.getItem('hk-theme'); if (t) root.dataset.theme = t; } catch (e) { /* abaikan */ }
  $('#themeBtn').addEventListener('click', () => {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('hk-theme', root.dataset.theme); } catch (e) { /* abaikan */ }
    redrawChart();
  });
  $('#menuBtn').addEventListener('click', () => document.body.classList.toggle('menu-open'));
  $('#scrim').addEventListener('click', () => document.body.classList.remove('menu-open'));
  $('#search').addEventListener('input', e => buildNav(e.target.value));
  let t;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(redrawChart, 120); });
  window.addEventListener('hashchange', route);
  route();
}

if (typeof document !== 'undefined') init();
if (typeof module !== 'undefined') module.exports = { CALCS, evalExpr, pmt, loanSchedule, mortgageSchedule };
