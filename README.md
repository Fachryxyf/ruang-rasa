# Ruang Rasa

[![Pages](https://img.shields.io/github/deployments/Fachryxyf/ruang-rasa/github-pages?label=pages&logo=github)](https://fachryxyf.github.io/ruang-rasa/)
[![Three.js](https://img.shields.io/badge/three.js-r169-000000?logo=threedotjs&logoColor=white)](https://threejs.org/)
[![No build step](https://img.shields.io/badge/build-none-1f883d)](#menjalankan)
[![License](https://img.shields.io/github/license/Fachryxyf/ruang-rasa)](LICENSE)
[![Last commit](https://img.shields.io/github/last-commit/Fachryxyf/ruang-rasa)](https://github.com/Fachryxyf/ruang-rasa/commits/main)
[![Repo size](https://img.shields.io/github/repo-size/Fachryxyf/ruang-rasa)](https://github.com/Fachryxyf/ruang-rasa)

Visualisasi 3D interaktif dari satu gagasan: **rasa adalah satu variabel dasar yang berubah bentuk lewat konteks**, bukan kumpulan emosi yang masing-masing berdiri terpisah.

**[→ Buka visualisasinya](https://fachryxyf.github.io/ruang-rasa/)**

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
assets/style.css  layout, tipografi, palet gelap
assets/main.js    scene, shader, pemetaan konteks
check.mjs         pemeriksaan batasan (1 mesh, 1 material, shape valid)
```

## Aksesibilitas

Teks dapat dibaca penuh tanpa WebGL — canvas berperan sebagai latar (`aria-hidden`). Tombol konteks memakai `aria-pressed` dan dapat diakses lewat keyboard. `prefers-reduced-motion` menghentikan animasi idle dan smooth scroll.

## Batas klaim

Ini model konseptual dan metafora reflektif, **bukan temuan empiris**. Gagasannya dirumuskan lewat observasi pribadi lebih dulu, lalu dibandingkan dengan literatur ilmu emosi.

Bersinggungan dengan *core affect* dan *circumplex model* (James A. Russell) serta *theory of constructed emotion* (Lisa Feldman Barrett), tetapi tidak identik dengan keduanya, dan tidak menyangkal *basic emotion theory*. Kemiripannya struktural, bukan pembuktian.

## Lisensi

[MIT](LICENSE)
