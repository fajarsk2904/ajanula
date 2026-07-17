=========================================================
ROMANCE WEB APP (Versi Statis HTML/JS) - Panduan GitHub Pages
=========================================================

ISI FOLDER:
  index.html         -> Halaman utama (HTML + CSS + JS jadi satu file)
  penjagahati.mp3     -> Musik latar
  /images             -> 13 foto kenangan

CATATAN PENTING SOAL PASSWORD:
  Password sekarang dicek pakai JavaScript (bukan PHP lagi), karena
  GitHub Pages cuma bisa serve file statis, tidak bisa jalankan PHP.
  Artinya password "16112025" secara teknis ada di source code
  halaman (bisa dilihat kalau ada yang buka "View Page Source").
  Untuk kebutuhan personal seperti ini masih aman, tapi bukan
  proteksi tingkat keamanan tinggi.

-------------------------------------------------
CARA UPLOAD KE GITHUB PAGES
-------------------------------------------------
1. Buat akun GitHub (kalau belum punya) di github.com
2. Klik "New repository", kasih nama misal "ajanula-maaf"
   - Pilih Public
   - Centang "Add a README file" (boleh, nanti ditimpa)
3. Masuk ke repo yang baru dibuat, klik "Add file" > "Upload files"
4. Drag & drop semua isi folder ini:
     index.html
     penjagahati.mp3
     folder images/ (beserta 13 foto di dalamnya)
   Pastikan strukturnya tetap sama persis (index.html di root,
   images sebagai subfolder)
5. Klik "Commit changes"
6. Masuk ke tab "Settings" repo > menu "Pages" di sidebar kiri
7. Di bagian "Source", pilih branch "main" dan folder "/ (root)"
   lalu klik "Save"
8. Tunggu 1-2 menit, GitHub akan kasih link seperti:
     https://username.github.io/ajanula-maaf/
9. Buka link itu di HP untuk cek, lalu kirim ke pasangan kamu

-------------------------------------------------
CARA GANTI PASSWORD / TEKS / FOTO NANTINYA
-------------------------------------------------
- Buka index.html di GitHub (klik file > ikon pensil "Edit")
- Cari baris "const SANDI_WEB" untuk ganti password
- Cari "const suratMaaf" untuk ganti isi surat
- Cari "const galeri" untuk ubah foto/caption/tanggal
- Setelah edit, klik "Commit changes" - otomatis update di link

=========================================================
