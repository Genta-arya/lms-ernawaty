# Dokumentasi Lengkap Sistem & Arsitektur Teknis LMS Mandiri SMPN 3 Ketapang

> **Tujuan Dokumen**: Berkas ini adalah *Single Source of Truth* arsitektur teknis dan panduan fitur menyeluruh LMS Mandiri SMPN 3 Ketapang. Dokumen ini dirancang agar pengembang maupun **Agen AI** di masa depan dapat langsung memahami struktur proyek, logika bisnis, basis data, integrasi pihak ketiga, serta setiap modul fitur yang telah dibangun.

---

## 1. Ikhtisar & Identitas Proyek

- **Nama Aplikasi**: LMS Mandiri - SMPN 3 Ketapang (Platform Pembelajaran Digital Terpadu)
- **Domain Resmi**: `https://lms-ernawaty.vercel.app`
- **Sasaran Pengguna**: Siswa dan Guru SMP Negeri 3 Ketapang, Kabupaten Ketapang, Kalimantan Barat (Kurikulum Merdeka Fase D).
- **Fokus Utama**: Pembelajaran mandiri, literasi digital, evaluasi formatif instan, kolaborasi kelas real-time, serta tatap muka video interaktif multi-partisipan.

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
│   │   ├── guru/               # Halaman kelola guru (Dashboard, Kelas, Materi, Kuis, Tugas, Progres, Meet, dll)
│   │   └── murid/              # Halaman belajar murid (Dashboard, Kelas, Materi, Kuis, Tugas, Riwayat, Profil)
│   ├── services/               # Lapisan API Firestore, AI, Agora, Cloudinary, Presensi, dan FCM
│   ├── App.jsx                 # Routing tabel utama & provider wrapping
│   ├── index.css               # Tailwind directives & custom CSS
│   └── main.jsx                # Titik awal bootstrap React DOM
├── firestore.rules             # Aturan keamanan database Firestore
├── firestore.indexes.json      # Indeks komposit Firestore
└── package.json
```

---

## 3. Skema Basis Data Cloud Firestore

| Koleksi | Penjelasan Entitas | Struktur Field Utama |
| :--- | :--- | :--- |
| `users` | Dokumen pengguna utama (Guru & Murid) | `uid`, `email`, `nama`, `role` (`guru` / `murid`), `fotoUrl`, `nisn`, `kelasId`, `kelasNama`, `tingkat`, `isClaimed`, `createdAt` |
| `murid` | Database induk data siswa resmi sekolah | `nisn` (ID Dokumen), `nama`, `kelasId`, `kelasNama`, `tingkat`, `statusKlaim` (`belum` / `diklaim`), `akunMurid: { uid, email, fotoUrl }` |
| `kelas` | Rombongan belajar (Rombel) | `id`, `nama` (misal: 7A, 8B, 9A), `tingkat` (7, 8, 9), `waliKelas`, `totalSiswa` |
| `klaim_aktivasi` | Antrean verifikasi akun siswa baru | `id`, `uid`, `email`, `nisn`, `nama`, `kelasId`, `kelasNama`, `status` (`pending`, `disetujui`, `ditolak`), `alasanPenolakan`, `createdAt` |
| `materi` | Modul pembelajaran Kurikulum Merdeka | `id`, `judul`, `deskripsi`, `konten` (Markdown/HTML), `mapel`, `tingkat` (Array: `["VII", "VIII"]`), `penulisNama`, `durasiBacaMenit`, `lampiranUrl`, `createdAt` |
| `kuis` | Bank kuis formatif | `id`, `judul`, `deskripsi`, `materiId`, `tingkat`, `durasiMenit`, `passingScore` (KKM), `soal: [{ teks, opsi: [A,B,C,D], jawabanBenar, pembahasan }]`, `createdAt` |
| `percobaan_kuis` | Lembar hasil pengerjaan kuis siswa | `id`, `kuisId`, `materiId`, `muridUid`, `namaMurid`, `nisn`, `kelasId`, `kelasNama`, `skor` (0–100), `jawaban: { [index]: pilihan }`, `durasiDetik`, `lulus` (boolean), `createdAt` |
| `tugas` | Penugasan dari guru | `id`, `judul`, `deskripsi`, `deadline`, `tingkat`, `kelasId`, `mapel`, `penulisNama`, `fileTugasUrl`, `createdAt` |
| `pengumpulan_tugas`| Lembar penyerahan tugas siswa | `id`, `tugasId`, `muridUid`, `namaMurid`, `nisn`, `kelasId`, `fileUrl`, `fileName`, `catatanSiswa`, `status` (`menunggu_penilaian`, `dinilai`), `nilai` (0–100), `catatanGuru`, `dikumpulkanPada`, `dinilaiPada` |
| `pengumuman` | Informasi broadcast sekolah | `id`, `judul`, `isi` (Markdown), `prioritas` (`penting` / `informasi`), `penulisNama`, `tingkat` (Array), `createdAt` |
| `karya_mading` | Pojok literasi karya kreasi siswa | `id`, `judul`, `isi`, `kategori` (`puisi`, `cerpen`, `pantun`, `opini`, `artikel`), `penulisUid`, `penulisNama`, `penulisKelas`, `fotoUrl`, `likes: [uid]`, `komentarCount`, `createdAt` |
| `sesi_meet` | Ruang temu tatap muka Agora | `id`, `judul`, `channelName`, `kelasId`, `kelasNama`, `guruUid`, `guruNama`, `status` (`terjadwal`, `berlangsung`, `selesai`), `dimulaiPada`, `berakhirPada` |
| `diskusi_materi` | Komentar interaktif per modul materi | `id`, `materiId`, `parentId` (null untuk komentar utama, ID parent untuk reply), `userUid`, `userNama`, `userRole`, `fotoUrl`, `pesan`, `createdAt` |
| `chat_pribadi` | Komunikasi personal antar siswa | Dokumen: `chat_${uidMin}_${uidMax}`. Subkoleksi `pesan`: `id`, `pengirimUid`, `penerimaUid`, `ciphertext`, `iv`, `salt`, `dibaca` (boolean), `timestamp` |
| `chat_kelas` | Diskusi publik per rombel kelas | Dokumen: `kelas_${kelasId}`. Subkoleksi `pesan`: `id`, `pengirimUid`, `pengirimNama`, `pengirimRole`, `teks`, `timestamp` |
| `user_presence` | Indikator kehadiran real-time | `uid` (ID Dokumen), `isOnline` (boolean), `lastSeen` (timestamp), `deviceInfo` |

---

## 4. Telaah Mendalam Fitur Utama Sistem

### 4.1. Mesin AI Generator Materi & Kuis (`services/ai.js`)
- **Arsitektur Multi-Key Round-Robin**: Menggunakan 6 API Key Google Gemini yang tersimpan di environment `VITE_GEMINI_API_KEYS`. Sistem mendistribusikan beban secara merata dan otomatis berpindah ke kunci cadangan jika salah satu terkena limit (*quota exceeded* / HTTP 429).
- **Generator Modul Pembelajaran (`AiMateriGeneratorModal.jsx`)**:
  - Menerima topik instruksional guru.
  - Membangun prompt berbasis silabus Kurikulum Merdeka Fase D (Bahasa Indonesia).
  - Menghasilkan 4 bab materi terstruktur: Pengertian Konsep, Ciri-ciri & Struktur Kebahasaan, Contoh Nyata Teks, serta Ringkasan & Refleksi formatif.
- **Generator Kuis Otomatis (`AiKuisGeneratorModal.jsx`)**:
  - Menghasilkan 5 hingga 20 butir soal pilihan ganda (A, B, C, D) lengkap dengan kunci jawaban dan pembahasan rasional berdasarkan materi yang dipilih guru.

### 4.2. Editor Materi Dual-Mode WYSIWYG (`RichTextEditor.jsx`)
- Mengakomodasi kebutuhan guru yang terbiasa mengetik ala Microsoft Word (Mode Visual) maupun pengguna tingkat lanjut yang menyukai penulisan Markdown.
- Sinkronisasi instan dua arah (`markdownToHtml` & `htmlToMarkdown`).
- Mendukung elemen heading (H2, H3), format tebal/miring/garis bawah, blok kutipan (*blockquote*), tabel terstruktur, tautan eksternal, dan undo/redo.

### 4.3. Papan Peringkat Harian & Hasil Kuis (`LeaderboardHarian.jsx`, `percobaan.js`)
- Mendorong motivasi belajar siswa (*gamified learning*).
- Algoritma pemeringkatan: Siswa dengan skor tertinggi dan durasi pengerjaan tercepat pada hari yang sama menempati posisi teratas.
- Menampilkan avatar siswa, nama rombel kelas yang terformat rapi, dan lencana peringkat (Emas, Perak, Perunggu).

### 4.4. Forum Diskusi Terintegrasi per Materi (`ForumDiskusi.jsx`)
- Tersemat langsung di bawah setiap modul materi pelajaran.
- Mendukung komentar berantai (*threaded discussion / 1-level reply*).
- Terdapat penanda lencana khusus: Guru diverifikasi dengan badge hijau mencolok (*Pengajar / Guru*) dan siswa dengan badge biru.

### 4.5. Pojok Kreasi Mading Siswa (`Mading.jsx`, `MadingCarousel.jsx`, `karya.js`)
- Wadah apresiasi karya literasi siswa: puisi, pantun, cerita pendek, resensi buku, dan artikel opini.
- Carousel karya terbaru di halaman beranda.
- Fitur interaksi: Jumlah pembaca, tombol suka (*likes*), komentar apresiasi, dan tombol *"Salin Kutipan"* berformat otomatis lengkap dengan atribusi nama siswa dan sekolah.

### 4.6. Pusat Notifikasi Terpadu (`NotificationMenu.jsx`, `MuridNotificationMenu.jsx`)
- **Notifikasi Guru**:
  - Notifikasi real-time jika ada siswa baru melakukan klaim aktivasi NISN.
  - Notifikasi jika ada siswa yang mengumpulkan tugas dan belum dinilai.
  - Notifikasi saat ada siswa yang menyelesaikan kuis dan jika ada karya mading baru.
- **Notifikasi Murid**:
  - Tab kategori terpisah: Semua, Pesan Pribadi, Materi Baru, Tugas Baru, dan Nilai Kuis.
  - Menampilkan cuplikan chat pribadi yang sudah didekripsi otomatis dari ciphertext.

### 4.7. Sesi Tatap Muka Online Interaktif Ala Zoom (`AgoraMeetRoom.jsx`, `PreMeetLobbyModal.jsx`)
- Menggunakan Agora RTC NG dengan latensi sangat rendah (*ultra-low latency*).
- **Lobby Pra-Meet**: Peserta dapat mengecek kamera dan mikrofon sebelum bergabung.
- **Fitur Ruang Temu**:
  - Kontrol mic & kamera (termasuk tombol flip kamera depan/belakang di HP).
  - Angkat tangan (*Hand Raise*) dengan notifikasi visual ke guru host.
  - Berbagi layar (*Screen Share*) dengan fallback notifikasi ramah untuk peramban mobile.
  - Sisi samping percakapan teks (*Chat Drawer*) di dalam ruang tatap muka.
  - **Modal Akhiri Sesi**: Guru dapat memilih *"Akhiri untuk Semua"* (status selesai) atau keluar sementara tanpa menggunakan alert bawaan browser.

### 4.8. Sistem Enkripsi Chat Pribadi (`cryptoChat.js`, `ModalChatPribadi.jsx`)
- Menggunakan standar industri Web Crypto API (AES-GCM 256-bit) dengan turunan kunci PBKDF2 (100.000 iterasi hash SHA-256).
- Pesan yang dikirimkan disimpan dalam bentuk `ciphertext`, `iv`, dan `salt`. Hanya akun pengirim dan penerima yang memegang pasangan kunci untuk mendekripsi teks di peramban mereka masing-masing.
- Dilengkapi indikator kehadiran realtime (*Online / Waktu Terakhir Dilihat*) dan indikator saat lawan bicara sedang mengetik.

### 4.9. Pengelolaan Data Siswa & Impor/Ekspor CSV (`lib/csv.js`, `guru/Murid.jsx`)
- Guru dapat mengunduh format template CSV siswa resmi.
- Validasi otomatis data: NISN wajib 10 digit numerik, nama lengkap, dan rombel kelas valid.
- Pendaftaran ratusan siswa sekaligus hanya dalam hitungan detik secara massal.

### 4.10. PWA & Responsivitas Mobile UX (`PwaInstallToast.jsx`, `BottomNav.jsx`, `LiveMeetAlertToast.jsx`)
- **PwaInstallToast**:
  - Di HP: Tampil sebagai kapsul ramping minimalis (*Dynamic Island pill*) di bagian atas tengah.
  - Di Tablet: Tampil di sudut kiri atas.
  - Menangkap event `beforeinstallprompt` untuk pemasangan aplikasi native satu klik.
- **BottomNav**:
  - Mengusung gaya *Apple iOS Glassmorphism* mengambang dengan indikator geser tab yang halus (*sliding soft pill*).
  - Memperhitungkan *safe-area-inset* perangkat Android & iPhone.
- **LiveMeetAlertToast Mobile**:
  - Tampil sebagai *Floating Circular Action Button* di sisi kiri bawah tepat **di atas Bottom Navigation Bar** (`bottom-20 left-4`) agar tidak menghalangi navigasi.
  - Dilengkapi animasi denyut (*ping pulse*) saat sesi aktif, yang bila diketuk akan membuka kartu popover detail sesi untuk bergabung.

---

## 5. Konfigurasi Lingkungan Produksi (.env)

| Variabel | Fungsi / Tujuan | Contoh Nilai |
| :--- | :--- | :--- |
| `VITE_FIREBASE_API_KEY` | Kunci Web API Firebase Authentication | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Domain handler OAuth Google Sign-in | `lsm-ernawaty.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Identitas proyek Google Cloud / Firebase | `lsm-ernawaty` |
| `VITE_FIREBASE_STORAGE_BUCKET`| Bucket penyimpanan file Firebase | `lsm-ernawaty.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Project Number untuk push notification | `123456789...` |
| `VITE_FIREBASE_APP_ID` | ID Aplikasi Web Firebase Client | `1:123456:web:...` |
| `VITE_FIREBASE_VAPID_KEY` | Public key sertifikat Web Push FCM | `BEl6...` |
| `VITE_AGORA_APP_ID` | App ID Agora Console untuk video RTC | `a1b2c3d4...` |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloud Name Cloudinary Storage | `dxyz123...` |
| `VITE_CLOUDINARY_UPLOAD_PRESET`| Unsigned Upload Preset Cloudinary | `lms_preset` |
| `VITE_GEMINI_API_KEYS` | Daftar kunci API Gemini (pisahkan koma) | `key1,key2,key3,key4,key5,key6` |
| `VITE_GEMINI_MODEL` | Model AI Google Gemini | `gemini-1.5-flash` |

---

## 6. Aturan Penting bagi Pengembang / Agen AI

1. **Aturan Penanganan Modal & Backdrop**:
   - Seluruh modal popup baru **WAJIB** dirender ke akar body menggunakan `createPortal(..., document.body)`.
   - Backdrop overlay wajib menggunakan kelas: `fixed inset-0 w-full h-full min-h-[100dvh] z-[999999] bg-black/75 backdrop-blur-md`.
   - Selalu tambahkan efek penguncian scroll pada halaman latar:
     ```javascript
     useEffect(() => {
       const originalOverflow = document.body.style.overflow
       document.body.style.overflow = "hidden"
       return () => { document.body.style.overflow = originalOverflow }
     }, [])
     ```
2. **Koordinasi Z-Index**:
   - Konten Halaman Biasa: `z-0` s.d `z-10`
   - Navbar Atas: `sticky top-0 z-40`
   - Bottom Navigation Mobile: `fixed bottom-0 z-50`
   - Floating Action Buttons Mobile: `fixed bottom-20 z-40`
   - Modals & Confirm Dialogs: `z-[99999]` s.d `z-[999999]`
3. **Penyimpanan Pesan & Privasi**:
   - Jangan pernah menyimpan pesan chat pribadi siswa dalam bentuk teks polos (*plaintext*) ke Firestore; selalu lewatkan fungsi enkripsi di `cryptoChat.js`.
4. **Git Remote Workflow**:
   - Repository terhubung ke remote `origin master` di GitHub (`Genta-arya/lms-ernawaty`).
   - Setiap pekerjaan fitur atau bugfix harus langsung di-commit dengan pesan Conventional Commits dan di-push ke branch `master`.
