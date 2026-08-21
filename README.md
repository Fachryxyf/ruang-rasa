# Ruang Rasa

[![Pages](https://img.shields.io/github/deployments/Fachryxyf/ruang-rasa/github-pages?label=pages&logo=github)](https://ruang-rasa.fachryxyf.com)
[![Three.js](https://img.shields.io/badge/three.js-r169-000000?logo=threedotjs&logoColor=white)](https://threejs.org/)
[![No build step](https://img.shields.io/badge/build-none-1f883d)](#menjalankan)
[![License](https://img.shields.io/github/license/Fachryxyf/ruang-rasa)](LICENSE)
[![Last commit](https://img.shields.io/github/last-commit/Fachryxyf/ruang-rasa)](https://github.com/Fachryxyf/ruang-rasa/commits/main)
[![Repo size](https://img.shields.io/github/repo-size/Fachryxyf/ruang-rasa)](https://github.com/Fachryxyf/ruang-rasa)

Visualisasi 3D interaktif dari satu gagasan: **rasa adalah satu variabel dasar yang berubah bentuk lewat konteks**, bukan kumpulan emosi yang masing-masing berdiri terpisah.

**[→ ruang-rasa.fachryxyf.com](https://ruang-rasa.fachryxyf.com)**

## Gagasannya

Hati dapat dipahami sebagai ruang, bukan wadah berisi benda-benda bernama cinta, rindu, sedih, dan marah. Yang ada di dalamnya mungkin satu bahan saja. Konteks, ingatan, dan interpretasi yang membentuknya:

```
rasa + konteks + ingatan + interpretasi → pengalaman emosional yang diberi nama
```

Ketika rindu terasa hilang saat teman datang, belum tentu rasanya lenyap. Yang berubah campurannya. Nama-nama emosi adalah label linguistik terhadap konfigurasi pengalaman — bukan bukti bahwa substansinya berbeda.

## Kenapa satu mesh

Visualisasinya menerapkan argumen itu sebagai batasan teknis, bukan cuma dekorasi:

- **Satu** `IcosahedronGeometry`, **satu** `ShaderMaterial`, dari awal halaman sampai akhir.
- Konteks hanya menggeser uniform: amplitudo, frekuensi noise, kecepatan churn, warna.
- Tidak ada objek yang ditambah, dihapus, atau ditukar. Bahannya memang tidak pernah diganti.

Kalau tiap emosi digambarkan sebagai objek 3D terpisah, visualisasinya justru membantah teksnya. `check.mjs` menjaga batasan ini tetap benar.

Bentuk mengikuti scroll lewat `IntersectionObserver`. Panel terakhir menyerahkan kontrolnya ke pembaca — pilih konteks, bahannya tetap sama.

## Membentuk dengan tangan sendiri

Memilih konteks lewat tombol masih memilih dari daftar. Tanah liat yang tidak bisa
ditekan langsung bukan tanah liat, cuma gambar tanah liat. Jadi permukaannya
dapat ditekan:

- **Tekan dan tahan** di permukaannya. Ia mengalah di bawah tekanan, makin dalam
  selama ditahan, sampai batas `MARK_MAX`.
- **Geser sambil menahan** dan cekungannya ikut berjalan bersama tangan.
- **Lepaskan, dan bekasnya tinggal.** Tidak ada tombol reset. Bekas itu hanya
  memudar lewat waktu, dengan paruh waktu `MARK_HALF_LIFE` = 75 detik.

Bagian terakhir itu bukan detail teknis, itu klaim yang sama dengan naskahnya:
*ada bentuk yang hanya bisa berubah melalui waktu, sedikit demi sedikit.* Tombol
"hapus semua bekas" akan membantah kalimat itu, jadi tombol itu tidak ada — dan
`check.mjs` memastikan tidak ada yang menambahkannya nanti.

Mekanismenya tetap patuh pada batasan satu mesh:

- Bekas disimpan sebagai **uniform array berukuran tetap** (`MARK_SLOTS = 12`):
  arah di permukaan dan kedalamannya. Tidak ada geometry baru, tidak ada alokasi
  di dalam render loop.
- Vertex shader menjumlahkan tiga sumber perpindahan: churn konteks, cekungan
  yang tersimpan, dan tekanan yang sedang berlangsung.
- Normal dihitung ulang dari permukaan yang sudah berpindah lewat *finite
  difference*, bukan diambil dari bola aslinya. Tanpa itu, cekungannya bergerak
  tapi cahayanya tidak ikut — terlihat seperti tekstur, bukan bentuk.
- Slot dipakai ulang: menekan dekat bekas lama memperdalam bekas itu, bukan
  membuat yang baru. Kalau semua slot terpakai, yang paling samar yang diganti.

Titik tekan diambil dengan `Raycaster` ke sebuah `Sphere` matematis, lalu
dikonversi ke ruang lokal mesh — jadi bekasnya menempel pada tanah liat dan ikut
berputar bersamanya, bukan menempel di layar.

## Menjalankan

Tanpa bundler, tanpa dependency, tanpa `npm install`. Three.js dimuat dari CDN via import map.

Modul ES butuh HTTP, jadi buka lewat server lokal — bukan `file://`:

```bash
python3 -m http.server 8000
# buka http://localhost:8000
```

Server ini hanya untuk pratinjau lokal. Yang di-deploy tetap file statis; GitHub Pages menyajikannya langsung tanpa Python.

Self-check:

```bash
node check.mjs
```

## Struktur

```
index.html        markup + isi teks
favicon.svg       ikon: satu massa tanah liat, satu bekas
assets/style.css  layout, tipografi, palet gelap
assets/main.js    scene, shader, pemetaan konteks, mekanisme membentuk
check.mjs         pemeriksaan batasan (1 mesh, 1 material, 1 geometry,
                  bekas hanya memudar, jalur keyboard ada, favicon tertaut)
```

## Aksesibilitas

Teks dapat dibaca penuh tanpa WebGL; kalau konteks WebGL gagal dibuat, canvas-nya
dilepas dan naskahnya tetap utuh.

Karena permukaannya sekarang dapat dibentuk, canvas bukan lagi dekorasi dan tidak
lagi `aria-hidden`. Ia sebuah kontrol:

- `tabindex="0"` dengan `role="application"` dan `aria-label` yang menjelaskan cara memakainya.
- **Jalur keyboard penuh, bukan versi seadanya:** panah memindahkan titik tekan
  dalam koordinat sferis, Enter atau spasi menahan tekanan — mekanisme yang sama
  persis dengan pointer, bukan pengganti yang lebih miskin.
- Jumlah bekas dilaporkan lewat `aria-live="polite"`, jadi hasil membentuk tidak
  hanya tersedia secara visual.
- Teks tetap dapat diklik meski berada di atas tanah liat: `main` memakai
  `pointer-events: none` dan hanya elemen isi yang mengaktifkannya kembali, jadi
  ruang kosong antar paragraf meneruskan tekanan ke permukaan di belakangnya.

Tombol konteks memakai `aria-pressed`. `prefers-reduced-motion` menghentikan churn
idle dan smooth scroll — tetapi membentuk tetap berfungsi, karena itu respons
terhadap tindakan pembaca, bukan animasi yang berjalan sendiri.

## Batas klaim

Ini model konseptual dan metafora reflektif, **bukan temuan empiris**. Gagasannya dirumuskan lewat observasi pribadi lebih dulu, lalu dibandingkan dengan literatur ilmu emosi.

Bersinggungan dengan *core affect* dan *circumplex model* (James A. Russell) serta *theory of constructed emotion* (Lisa Feldman Barrett), tetapi tidak identik dengan keduanya, dan tidak menyangkal *basic emotion theory*. Kemiripannya struktural, bukan pembuktian.

## Lisensi

[MIT](LICENSE)
