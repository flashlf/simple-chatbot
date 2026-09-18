# Changelog

Semua perubahan penting pada proyek **Executive AI Assistant & Notulen Chatbot** didokumentasikan di berkas ini.

Format changelog ini mengacu pada panduan [Keep a Changelog](https://keepachangelog.com/id/1.0.0/) dan menerapkan standar [Semantic Versioning](https://semver.org/).

---

## [1.1.0] - 2026-09-18

### 🎨 Refactoring UI & Desain Visual
- **Pembaruan Palet Warna & Visual Depth**:
  - Mengimplementasikan skema warna Color Hunt terkurasi:
    - `#010736` (*Dark Navy*) sebagai basis kanvas layar penuh dan header.
    - `#0D1C42` (*Deep Blue*) untuk bubble obrolan pengguna, kontainer input, dan kartu notulen.
    - `#22396F` (*Slate Blue*) untuk bubble obrolan AI, garis pemisah halus (*subtle border*), dan elemen interaktif.
    - `#FCF1D0` (*Cream / Gold Accent*) untuk judul beranda, tombol aktif, ikon mikrofon/kirim, dan indikator status online.
- **Peningkatan Aksesibilitas (WCAG AAA)**:
  - Mengganti teks umum dengan putih lembut `#F3F4F6` untuk kontras tinggi terhadap latar belakang gelap.
  - Mengatur teks placeholder input menjadi abu-abu netral `#9CA3AF` untuk kejelasan fokus pengetikan.
- **Efek Bayangan & Elevasi**:
  - Menambahkan *ambient shadow* bertingkat pada bubble AI, kartu sambutan, dan modal pilihan audio.

### 📚 Dokumentasi
- Menambahkan berkas [`README.md`](README.md) komprehensif berisi panduan instalasi, penggunaan fitur audio, struktur proyek, dan rincian endpoint API.
- Menyematkan pratinjau antarmuka visual menggunakan aset tangkapan layar dari direktori [`assets/`](assets/) (`interface-1.png` dan `interface-2.png`).
- Menambahkan berkas [`CHANGELOG.md`](CHANGELOG.md) untuk pelacakan histori versi.

---

## [1.0.0] - 2026-09-18

### ✨ Fitur Baru
- **Antarmuka Mobile-First**:
  - Pembangunan UI client-side di folder `public/` (`index.html`, `style.css`, `app.js`).
  - Dukungan *safe-area-inset* untuk layar smartphone dan layout responsif otomatis di desktop.
- **Fitur Perekaman Audio Lengkap**:
  - Integrasi perekam mikrofon perangkat (*MediaRecorder API*) dilengkapi visualizer gelombang suara dan timer *real-time*.
  - Integrasi perekaman audio dari tab atau jendela aplikasi (*Screen / Window / Tab Audio Capture* via `getDisplayMedia`) untuk menangkap suara rapat online.
  - Fitur unggah berkas audio (`.mp3`, `.wav`, `.ogg`, `.m4a`, `.webm`, `.flac`) dengan indikator ukuran file.
  - Pemutar audio kustom (*in-chat audio player*) langsung di dalam bubble percakapan.
- **Format Notulen Eksekutif**:
  - Integrasi Gemini 3.6 Flash dengan instruksi sistem terstruktur (Ringkasan Eksekutif, Keputusan Utama, *Action Items*, dan Isu Tertunda).
  - Rendering Markdown otomatis via `marked.js` untuk tabel, poin, dan blok kode.

### 🔧 Peningkatan Backend
- Penambahan middleware `express.static('public')` pada `index.js` untuk menyajikan antarmuka statis.
- Sanitasi MIME-type audio pada endpoint `/generate-from-audio` agar kompatibel penuh dengan `@google/genai`.

