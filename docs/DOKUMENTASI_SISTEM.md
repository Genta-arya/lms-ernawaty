# Dokumentasi Lengkap Sistem & Arsitektur Teknis LMS Mandiri SMPN 3 Ketapang

> **Tujuan Dokumen**: Berkas ini adalah acuan teknis definitif (*Single Source of Truth*) dan panduan fitur menyeluruh LMS Mandiri SMPN 3 Ketapang. Dokumen ini dirancang agar pengembang maupun **Agen AI** di masa depan dapat langsung memahami struktur proyek, logika bisnis, basis data, integrasi pihak ketiga, serta setiap modul fitur yang telah dibangun.

---

## 1. Identitas & Ikhtisar Proyek

- **Nama Aplikasi**: LMS Mandiri - SMPN 3 Ketapang (Platform Pembelajaran Digital Terpadu)
- **Domain Resmi**: `https://lms-ernawaty.vercel.app`
- **Sasaran Pengguna**: Siswa dan Guru SMP Negeri 3 Ketapang, Kabupaten Ketapang, Kalimantan Barat (Kurikulum Merdeka Fase D).
- **Fokus Utama**: Pembelajaran mandiri, literasi digital, evaluasi formatif instan, kolaborasi kelas real-time, manajemen tugas terstruktur, serta tatap muka video interaktif multi-partisipan.

### Tech Stack Utama
- **Frontend Core**: React 18 (`react`, `react-dom`), Vite 5, Tailwind CSS 3.4, PostCSS, Autoprefixer.
- **Komponen UI & Animasi**: Radix UI Primitives (`dialog`, `tabs`, `progress`, `dropdown-menu`, `select`, `switch`, dll.), Lucide React Icons, Framer Motion, `clsx`, `tailwind-merge`.
- **Backend & Autentikasi**: Firebase Authentication (Google OAuth & Email/Password), Cloud Firestore (NoSQL Real-Time Database), Firebase Cloud Messaging (FCM Push Notifications).
- **Media & Penyimpanan File**: Cloudinary Upload Widget dengan fitur pemotongan foto (*cropping*) bawaan.
- **Tatap Muka Video & Audio**: Agora RTC SDK NG (`agora-rtc-sdk-ng`, `agora-token`).
- **Kecerdasan Buatan (AI)**: Google Gemini API (`@google/generative-ai` & Direct REST v1beta) dengan arsitektur *Multi-Key Round-Robin Failover*.
- **Pengolah Format**: `react-markdown`, `remark-gfm` (Tabel, checklist, task lists), `papaparse` (Impor/Ekspor CSV).
- **Kriptografi & Keamanan Pesan**: Web Crypto API bawaan browser (Enkripsi Simetris AES-GCM 256-bit).

---

## 2. Struktur Direktori Proyek

```
lms-ernawaty/
├── public/                     # Aset publik statis
│   ├── icon.svg & logo.png     # Favicon & ikon resmi sekolah
│   ├── manifest.json           # Konfigurasi PWA Web App Manifest
│   ├── og-image.png / .jpg     # Banner Open Graph 1200x630 snapshot
│   ├── robots.txt              # Aturan crawler mesin pencari
│   ├── sitemap.xml             # XML sitemap Google Search Console
│   └── firebase-messaging-sw.js# Service Worker Push Notifications
├── docs/                       # Dokumentasi sistem & roadmap
│   ├── DOKUMENTASI_SISTEM.md
│   └── ROADMAP_DAN_IDE_PENGEMBANGAN.md
├── src/
│   ├── components/
│   │   ├── common/             # Komponen global (PageMeta, PwaInstallToast, UserAvatar, BottomNav, dll)
│   │   ├── guru/               # Komponen khusus guru (ModalDetailGuru)
│   │   ├── kelas/              # Chat kelas & chat pribadi (ModalChatPribadi, GlobalChatNotification)
│   │   ├── kuis/               # Generator kuis AI & Leaderboard harian kuis
│   │   ├── layout/             # Navbar, Footer, GuruLayout, MuridLayout, NotificationMenu
│   │   ├── mading/             # Carousel karya mading literasi siswa
│   │   ├── materi/             # WYSIWYG RichTextEditor, AI Materi Modal, ForumDiskusi bertingkat
│   │   ├── meet/               # Ruang temu AgoraMeetRoom, PreMeetLobbyModal, LiveMeetAlertToast
│   │   ├── pengumuman/         # PengumumanCarousel & modal detail pengumuman
│   │   └── ui/                 # Komponen atomik Radix + Tailwind (Button, Card, Dialog, Badge, Input, dll)
│   ├── context/                # React Contexts (AuthContext, ToastContext)
│   ├── data/                   # Data benih / template kurikulum (Teks Rekon Fase D)
│   ├── lib/                    # Utilitas umum (firebase, utils, csv, grading, editorUtils)
│   ├── pages/                  # Halaman publik (Beranda, Masuk, Aktivasi, Mading, MateriDetail)
│   │   ├── guru/               # 16 Halaman kelola guru (Dashboard, Kelas, Materi, Kuis, Tugas, Progres, Meet, dll)
│   │   └── murid/              # Halaman belajar murid (Dashboard, Kelas, Materi, Kuis, Tugas, Riwayat, Profil)
│   ├── services/               # Lapisan API Firestore, AI, Agora, Cloudinary, Presensi, dan FCM
│   ├── App.jsx                 # Routing tabel utama & provider wrapping
│   ├── index.css               # Tailwind directives & custom CSS
│   └── main.jsx                # Titik awal bootstrap React DOM
├── README.md                   # README resmi repository GitHub
├── firestore.rules             # Aturan keamanan database Firestore
├── firestore.indexes.json      # Indeks komposit Firestore
└── package.json
```

---

## 3. Skema Basis Data Cloud Firestore (15 Koleksi Utama)

| Koleksi | Penjelasan Entitas | Struktur Field Utama |
| :--- | :--- | :--- |
| `users` | Dokumen pengguna utama (Guru & Murid) | `uid`, `email`, `nama`, `role` (`guru` / `murid`), `fotoUrl`, `nisn`, `kelasId`, `kelasNama`, `tingkat`, `isClaimed`, `createdAt` |
| `murid` | Database induk data siswa resmi sekolah | `nisn` (ID Dokumen), `nama`, `jenisKelamin` (`Laki-laki` / `Perempuan`), `kelasId`, `kelasNama`, `tingkat`, `statusKlaim` (`belum` / `diklaim`), `akunMurid: { uid, email, fotoUrl }` |
| `kelas` | Rombongan belajar (Rombel) | `id`, `nama` (misal: 7A, 8B, 9A), `tingkat` (7, 8, 9), `waliKelas`, `tahunAjaran`, `keterangan`, `totalSiswa` |
| `klaim_aktivasi` | Antrean verifikasi akun siswa baru | `id`, `uid`, `email`, `nisn`, `nama`, `kelasId`, `kelasNama`, `status` (`pending`, `disetujui`, `ditolak`), `alasanPenolakan`, `createdAt` |
| `materi` | Modul pembelajaran Kurikulum Merdeka | `id`, `judul`, `deskripsi`, `konten` (Markdown/HTML), `mapel`, `tingkat` (Array: `["VII", "VIII"]`), `status` (`terbit` / `draft`), `penulisNama`, `durasiBacaMenit`, `lampiranUrl`, `createdAt` |
| `kuis` | Bank kuis formatif | `id`, `judul`, `deskripsi`, `materiId`, `tingkat`, `durasiMenit`, `passingScore` (KKM), `soal: [{ teks, opsi: [A,B,C,D], jawabanBenar, pembahasan }]`, `createdAt` |
| `percobaan_kuis` | Lembar hasil pengerjaan kuis siswa | `id`, `kuisId`, `materiId`, `muridUid`, `namaMurid`, `nisn`, `kelasId`, `kelasNama`, `skor` (0–100), `jawaban: { [index]: pilihan }`, `durasiDetik`, `lulus` (boolean), `createdAt` |
| `tugas` | Penugasan dari guru | `id`, `judul`, `deskripsi`, `deadline`, `tingkat`, `kelasId`, `mapel`, `penulisNama`, `fileTugasUrl`, `createdAt` |
| `pengumpulan_tugas`| Lembar penyerahan tugas siswa | `id`, `tugasId`, `muridUid`, `namaMurid`, `nisn`, `kelasId`, `fileUrl`, `fileName`, `catatanSiswa`, `status` (`menunggu_penilaian`, `dinilai`), `nilai` (0–100), `catatanGuru`, `dikumpulkanPada`, `dinilaiPada` |
| `pengumuman` | Informasi broadcast sekolah | `id`, `judul`, `isi` (Markdown), `prioritas` (`penting` / `informasi`), `status` (`aktif` / `arsip`), `penulisNama`, `tingkat` (Array), `createdAt` |
| `karya_mading` | Pojok literasi karya kreasi siswa | `id`, `judul`, `isi`, `kategori` (`puisi`, `cerpen`, `pantun`, `opini`, `artikel`), `penulisUid`, `penulisNama`, `penulisKelas`, `fotoUrl`, `likes: [uid]`, `komentarCount`, `createdAt` |
| `sesi_meet` | Ruang temu tatap muka Agora | `id`, `judul`, `channelName`, `kelasId`, `kelasNama`, `guruUid`, `guruNama`, `status` (`terjadwal`, `berlangsung`, `selesai`), `dimulaiPada`, `berakhirPada` |
| `diskusi_materi` | Komentar interaktif per modul materi | `id`, `materiId`, `parentId` (null untuk komentar utama, ID parent untuk reply), `userUid`, `userNama`, `userRole`, `fotoUrl`, `pesan`, `createdAt` |
| `chat_pribadi` | Komunikasi personal antar siswa | Dokumen: `chat_${uidMin}_${uidMax}`. Subkoleksi `pesan`: `id`, `pengirimUid`, `penerimaUid`, `ciphertext`, `iv`, `salt`, `dibaca` (boolean), `timestamp` |
| `chat_kelas` | Diskusi publik per rombel kelas | Dokumen: `kelas_${kelasId}`. Subkoleksi `pesan`: `id`, `pengirimUid`, `pengirimNama`, `pengirimRole`, `teks`, `timestamp` |
| `user_presence` | Indikator kehadiran real-time | `uid` (ID Dokumen), `isOnline` (boolean), `lastSeen` (timestamp), `deviceInfo` |

---

## 4. Telaah Mendalam Seluruh Fitur di Dashboard Guru (`/guru/*`)

Dashboard Guru adalah pusat komando operasional pembelajaran yang mencakup 10 modul besar:

### 4.1. Beranda Dashboard Guru (`/guru` -> `Dashboard.jsx`)
- **Kartu Statistik Realtime**: Memantau total siswa terdaftar, total rombel kelas aktif, jumlah modul ajar (terbit vs draf), dan bank kuis.
- **Badge Alert Permintaan Aktivasi Siswa**: Indikator *pulsing dot* otomatis jika ada akun siswa yang baru mendaftar dan menunggu verifikasi.
- **Pusat Monitoring Cepat**: Tautan pintas ke modul tugas yang belum dinilai, pengumuman sekolah, progres belajar per bab, dan hasil evaluasi kuis.
- **Widget Diskusi Materi Terkini**: Menampilkan obrolan tanya jawab terbaru dari siswa pada modul-modul materi pembelajaran dengan tombol langsung *"Lihat & Tanggapi"*.

### 4.2. Manajemen Rombongan Belajar / Kelas (`/guru/kelas` & `/guru/kelas/:id`)
- Menambah, mengubah nama, tingkat (Kelas 7, 8, 9), tahun ajaran, dan keterangan rombel.
- Di halaman detail kelas: Menampilkan seluruh daftar siswa di rombel terkait, status klaim akun masing-masing siswa, serta fitur *Quick Add Murid*.

### 4.3. Data Induk Siswa & Impor Massal CSV (`/guru/murid` -> `Murid.jsx`)
- **Pencarian & Filter Cepat**: Filter berdasarkan rombel kelas atau kata kunci pencarian (Nama / NISN).
- **Impor Massal CSV (`lib/csv.js`)**: Guru dapat mengunggah berkas CSV dan sistem otomatis memvalidasi keaslian data (tepat 10 digit angka NISN, nama, kelas). Mampu mengimpor ratusan siswa dalam sekali klik.
- **Ekspor Data Siswa**: Mengunduh database siswa ke format CSV.
- **Unlink Akun Siswa**: Guru memiliki hak untuk memutuskan tautan akun Google siswa jika terjadi kesalahan klaim NISN atau pergantian perangkat HP.

### 4.4. Verifikasi & Persetujuan Aktivasi Akun (`/guru/permintaan` -> `Permintaan.jsx`)
- Menampilkan antrean siswa yang baru mendaftar lewat Google Sign-In dan melakukan klaim NISN.
- Guru dapat memeriksa kesesuaian Nama, NISN, dan Kelas.
- Pilihan aksi: **Setujui** (langsung mengaktifkan profil siswa) atau **Tolak** dengan menyertakan alasan tertulis yang akan dibaca siswa.

### 4.5. Manajemen Modul Materi Ajar (`/guru/materi` & `/guru/materi/:id/edit`)
- **Generator Materi Berbasis AI (`AiMateriGeneratorModal.jsx`)**: Guru cukup memasukkan topik instruksional, lalu Google Gemini AI menyusun modul lengkap 4 bab (Pengertian, Struktur Ciri Kebahasaan, Contoh Teks, Refleksi).
- **Editor Dual-Mode WYSIWYG (`RichTextEditor.jsx`)**: Pilihan mode mengetik visual ala Microsoft Word atau Markdown murni dengan sinkronisasi otomatis.
- **Template Materi Bawaan**: Tombol *"Buat dari Template"* untuk menghasilkan modul Teks Rekon Kurikulum Merdeka instan.
- **Pengaturan Modul**: Tingkat sasaran kelas (VII, VIII, IX), durasi estimasi baca, lampiran URL, dan status penerbitan (`draft` / `terbit`).
- **Modal Diskusi Materi**: Guru dapat memantau dan membalas tanya jawab siswa langsung dari tabel daftar materi.

### 4.6. Bank Soal & Kuis Formatif (`/guru/kuis` & `/guru/kuis/:id/edit`)
- **Generator Soal AI (`AiKuisGeneratorModal.jsx`)**: Menganalisis materi yang dipilih dan otomatis menghasilkan butir-butir soal pilihan ganda (A, B, C, D) lengkap dengan kunci jawaban dan pembahasan.
- **Editor Butir Soal Fleksibel**: Menambah, mengubah, menghapus soal, mengatur opsi jawaban, memilih kunci, dan menyusun pembahasan.
- **Pengaturan Kuis**: Durasi countdown pengerjaan (menit) dan Nilai Ambang Batas Kelulusan (*Passing Score / KKM*).
- **Template Kuis Cepat**: Tombol template untuk memuat paket soal Teks Rekon siap uji.

### 4.7. Evaluasi Hasil Kuis & Analisis Butir Soal (`/guru/kuis/:id/hasil` -> `KuisHasil.jsx`)
- **Ringkasan Nilai Komprehensif**: Rata-rata nilai kelas, skor tertinggi, skor terendah, dan persentase kelulusan KKM.
- **Tabel Lembar Jawaban Siswa**: Memeriksa detail jawaban tiap siswa (benar/salah per nomor).
- **Filter per Kelas**: Menampilkan hasil evaluasi per rombel tertentu.
- **Ekspor Nilai CSV**: Mengunduh lembar rekapitulasi nilai kuis ke format spreadsheet.
- **Reset Percobaan**: Menghapus percobaan kuis siswa jika diperlukan remedial atau ujian ulang.

### 4.8. Manajemen & Penilaian Tugas Siswa (`/guru/tugas` & `/guru/tugas/:id/nilai`)
- **Pemberian Tugas**: Membuat instruksi penugasan, batas waktu pengumpulan (*deadline*), tingkat kelas, dan lampiran berkas panduan.
- **Panel Penilaian Tugas (`TugasNilai.jsx`)**:
  - Filter tab: Siswa yang **Sudah Mengumpulkan** vs Siswa yang **Belum Mengumpulkan**.
  - Tinjau Berkas Tugas: Membuka berkas jawaban siswa yang diunggah ke Cloudinary.
  - Dialog Penilaian Modern: Input nilai numerik (0–100) dan catatan evaluasi guru.
  - Ekspor Nilai Tugas ke berkas CSV.

### 4.9. Pemantauan Progres Membaca Materi (`/guru/progres` -> `Progres.jsx`)
- Matriks matriks pemantauan real-time: Baris siswa dan kolom modul materi.
- Indikator centang hijau untuk materi yang telah selesai dibaca tuntas oleh siswa.
- Dialog inspeksi mendalam: Menampilkan waktu persis siswa menyelesaikan pembacaan materi.

### 4.10. Papan Pengumuman Sekolah (`/guru/pengumuman` -> `Pengumuman.jsx`)
- Menulis pengumuman dengan Rich Editor / Markdown.
- Pilihan tingkat prioritas: **Penting** (berwarna merah tegas) atau **Informasi** (berwarna biru).
- Target sasaran tingkatan kelas (VII, VIII, IX).
- Pengumuman otomatis tayang secara real-time di carousel beranda siswa dan publik.

### 4.11. Sesi Tatap Muka Virtual Guru (`/guru/meet` -> `Meet.jsx`)
- Pembuatan sesi tatap muka online berbasis Agora RTC.
- Status sesi: *Terjadwal, Berlangsung, dan Selesai*.
- Guru bertindak sebagai **Host**: Mengontrol mikrofon/kamera, melihat daftar peserta hadir, menerima angkat tangan siswa, berbagi layar, dan mengakhiri sesi untuk seluruh peserta.

### 4.12. Profil & Keamanan Akun Guru (`/guru/profil` -> `Profil.jsx`)
- Pengaturan biodata, NIP, nomor kontak WhatsApp, dan mata pelajaran ampu.
- Unggah foto profil dengan *Cloudinary Cropping Widget* (lingkaran proporsional).
- Penggantian kata sandi akun (*Re-authenticate & Update Password*).

---

## 5. Telaah Fitur di Sisi Murid (`/murid/*`)

1. **Dashboard Murid (`Dashboard.jsx`)**: Menampilkan carousel pengumuman sekolah, ringkasan tugas aktif, modul materi yang perlu dibaca, dan kuis formatif yang tersedia.
2. **Kelas & Ruang Teman (`MuridKelas.jsx`)**:
   - Melihat teman sekelas dan wali kelas.
   - Ruang **Chat Kelas Realtime** untuk diskusi terbuka.
   - Fitur **Chat Pribadi Terenkripsi** (`ModalChatPribadi.jsx`) antar sesama siswa dengan enkripsi AES-GCM 256-bit dan indikator online.
   - Modal profil dan riwayat capaian belajar teman.
3. **Modul Belajar Mandiri (`MateriBelajar.jsx` & `MateriDetail.jsx`)**:
   - Membaca modul materi dengan typography ramah mata.
   - Forum tanya jawab bertingkat di bawah setiap materi.
   - Pelacak status selesai baca otomatis yang dicatat ke sistem.
4. **Pengerjaan Kuis Real-Time (`KuisKerjakan.jsx` & `Hasil.jsx`)**:
   - Countdown timer otomatis.
   - Navigasi nomor soal fleksibel.
   - Perhitungan skor instan dan lembar pembahasan jawaban.
   - Terintegrasi dengan **Leaderboard Harian** kelas.
5. **Penyerahan Tugas (`TugasList.jsx` & `TugasDetail.jsx`)**:
   - Melihat instruksi tugas dan batas waktu penyerahan.
   - Unggah berkas jawaban melalui Cloudinary widget.
   - Menerima umpan balik nilai dan catatan evaluasi dari guru.
6. **Mading Siswa (`Mading.jsx`)**: Menerbitkan karya puisi, pantun, cerpen, serta saling memberikan apresiasi suka dan komentar.

---

## 6. Standar Teknis & Aturan Pengembang / Agen AI

1. **Penggunaan Portal pada Modal**:
   - Seluruh modal popup **WAJIB** menggunakan `createPortal(..., document.body)` dengan kelas backdrop:
     `fixed inset-0 w-full h-full min-h-[100dvh] z-[999999] bg-black/75 backdrop-blur-md`
   - Kunci scroll latar belakang: `document.body.style.overflow = "hidden"`.
2. **Koordinasi Z-Index**:
   - Halaman Biasa: `z-0` s.d `z-10`
   - Navbar Atas: `sticky top-0 z-40`
   - Bottom Nav Mobile: `fixed bottom-0 z-50`
   - Floating Action Meet: `fixed bottom-20 z-40`
   - Modals & Confirm Dialogs: `z-[99999]` s.d `z-[999999]`
3. **Privasi Chat**:
   - Jangan pernah menyimpan pesan obrolan personal dalam bentuk teks biasa di Firestore; selalu gunakan modul `cryptoChat.js`.
4. **Git Workflow**:
   - Selalu lakukan commit terstruktur dan push ke remote `origin master`.
5. **Otomatisasi Firebase Rules**:
   - Setiap kali terjadi penambahan, penyesuaian, atau pembuatan rules baru pada [`firestore.rules`](../firestore.rules), pengembang / agen AI **WAJIB** langsung mengeksekusi deployment ke Firebase via perintah:
     ```bash
     npm run deploy:rules
     ```
