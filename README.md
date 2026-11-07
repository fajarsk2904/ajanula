# HitungKu — Kalkulator Matematika & Keuangan

Situs statis (HTML + CSS + JavaScript murni, tanpa framework dan tanpa proses build) berisi kumpulan kalkulator. Semua perhitungan berjalan di browser, jadi bisa langsung dipasang di **GitHub Pages**.

## Isi

| Kategori | Kalkulator |
| --- | --- |
| Matematika | Kalkulator ilmiah, persentase, FPB & KPK, bilangan prima & faktorisasi, statistik data, persamaan kuadrat, bangun datar & ruang, konversi satuan |
| Kredit & Properti | Simulasi kredit (flat / anuitas / efektif menurun), simulasi KPR (fixed → floating), kemampuan ambil KPR |
| Investasi & Kebebasan Finansial | Bunga majemuk & investasi, target tabungan, inflasi & daya beli, kebebasan finansial (FIRE), CAGR & Aturan 72 |
| Bisnis & Belanja | Diskon & PPN, margin / markup / BEP, split bill |
| Lainnya | Usia & selisih tanggal, BMI |

## Cara memasang di GitHub Pages

1. Buat repository baru di GitHub (mis. `hitungku`).
2. Unggah keempat file ini ke root repository: `index.html`, `style.css`, `script.js`, `README.md`.
3. Buka **Settings → Pages**.
4. Pada **Build and deployment**, pilih **Source: Deploy from a branch**, lalu pilih branch `main` dan folder `/ (root)`, kemudian **Save**.
5. Tunggu 1–2 menit. Situs tersedia di `https://<username>.github.io/<nama-repo>/`.

Untuk mencoba di komputer sendiri, cukup buka `index.html` di browser.

## Menambah kalkulator baru

Buka `script.js`, lalu tambahkan satu objek ke array `CALCS`:

```js
{
  id: 'contoh',            // dipakai di URL (#contoh)
  cat: 'math',             // math | kredit | invest | bisnis | lain
  icon: '✨',
  title: 'Kalkulator Contoh',
  desc: 'Deskripsi singkat.',
  keywords: 'kata kunci pencarian',
  fields: [
    numf('a', 'Angka A', 10),
    money('b', 'Nominal', 1000000)
  ],
  calc(v) {
    chk(v.a > 0, 'A harus lebih dari 0.');   // lempar pesan error ke pengguna
    return {
      cards: [{ label: 'Hasil', value: rp(v.a * v.b), big: true }],
      notes: ['Catatan tambahan (opsional).']
      // opsional: sections, chart, table
    };
  }
}
```

Jenis field: `numf` (angka), `money` (rupiah dengan pemisah ribuan), serta objek biasa dengan `type` `select`, `text`, `textarea`, atau `date`.

## Catatan

Hasil bersifat estimasi untuk simulasi dan edukasi, bukan nasihat keuangan. Ketentuan bunga, biaya, dan pajak sebenarnya mengikuti kebijakan bank atau lembaga terkait.
