# Dokumentasi Teknis & Arsitektur Sistem LMS Mandiri SMPN 3 Ketapang

Dokumentasi ini disusun secara komprehensif agar pengembang maupun **Agen AI** di masa mendatang dapat langsung memahami konteks proyek, arsitektur, basis data, alur bisnis (*business flow*), dan seluruh fitur dalam aplikasi tanpa perlu melakukan eksplorasi manual dari awal.

---

## 1. Ikhtisar Proyek (Project Overview)

- **Nama Proyek**: LMS Mandiri SMPN 3 Ketapang (Platform Pembelajaran Terpadu)
- **Domain Produksi**: `https://lms-ernawaty.vercel.app`
- **Tujuan**: Memfasilitasi kegiatan belajar mengajar mandiri, pengumpulan tugas, pengerjaan kuis formatif, literasi mading, komunikasi real-time, serta sesi tatap muka interaktif (*Live Video Meet*) untuk guru dan siswa SMPN 3 Ketapang, Kalimantan Barat (Kurikulum Merdeka Fase D).
- **Teknologi Utama**:
  - **Frontend**: React 18, Vite 5, Tailwind CSS, Radix UI, Lucide Icons, Framer Motion.
  - **Backend & Database**: Firebase Authentication, Cloud Firestore (Real-time NoSQL), Firebase Cloud Messaging (FCM).
  - **Media Storage**: Cloudinary (Upload widget dengan cropping bawaan).
  - **Real-Time Video/Audio**: Agora RTC SDK NG (`agora-rtc-sdk-ng`, `agora-token`).
  - **AI Engine**: Google Gemini API (`@google/generative-ai`) dengan mekanisme *Round-Robin API Keys*.
  - **Keamanan Pesan**: Enkripsi end-to-end chat pribadi berbasis Web Crypto API (AES-GCM 256-bit).

---

## 2. Arsitektur Peran Pengguna (Role Architecture)

Sistem memiliki 2 peran utama yang dipisahkan secara ketat melalui Firestore Rules dan Protected Routes:

1. **Guru (Host / Administrator)**:
   - Akses via `/guru/login` atau `/masuk` (email guru terdaftar).
   - Mengelola kelas, siswa, klaim aktivasi akun, materi modul, bank soal kuis, tugas siswa, pengumuman sekolah, serta membuat & memimpin sesi Agora Live Meet.
2. **Murid (Siswa)**:
   - Masuk menggunakan Google Sign-In atau NISN via `/masuk`.
   - Pertama kali login harus melakukan **Aktivasi Akun** (`/aktivasi`) untuk klaim NISN dan memilih kelas yang disetujui guru.
   - Mengakses materi belajar, mengerjakan kuis interaktif, mengunggah tugas, mempublikasikan karya mading, chat real-time (grup kelas & personal terenkripsi), serta mengikuti Live Meet.

---

## 3. Struktur Koleksi Database Firestore

| Koleksi | Deskripsi | Kunci Utama / Relasi |
| :--- | :--- | :--- |
| `users` | Data profil pengguna (guru & murid) | `uid` (Auth UID), `role`, `nisn`, `kelasId` |
| `kelas` | Data rombel kelas (misal: 7A, 8B, 9C) | `id`, `nama`, `tingkat` (7, 8, 9), `waliKelas` |
| `murid` | Database induk data siswa resmi sekolah | `nisn` (Document ID), `nama`, `kelasId`, `statusKlaim` |
| `klaim_aktivasi` | Permintaan aktivasi akun siswa baru | `id`, `uid`, `nisn`, `nama`, `kelasId`, `status` (`pending`, `disetujui`, `ditolak`) |
| `materi` | Modul pelajaran Kurikulum Merdeka | `id`, `judul`, `deskripsi`, `konten` (Markdown/HTML), `tingkat`, `lampiran` |
| `kuis` | Bank soal kuis formatif | `id`, `judul`, `durasiMenit`, `passingScore`, `soal` (Array pilihan ganda) |
| `percobaan_kuis` | Riwayat pengerjaan kuis siswa | `id`, `kuisId`, `muridUid`, `skor`, `jawaban`, `lulus` |
| `tugas` | Penugasan dari guru | `id`, `judul`, `instruksi`, `deadline`, `tingkat`, `kelasId` |
| `pengumpulan_tugas` | Lembar jawaban & lampiran tugas siswa | `id`, `tugasId`, `muridUid`, `fileUrl`, `nilai`, `catatanGuru` |
| `pengumuman` | Pengumuman broadcast sekolah | `id`, `judul`, `isi`, `prioritas` (`penting`, `informasi`), `tingkat` |
| `karya_mading` | Artikel & puisi kreasi literasi siswa | `id`, `judul`, `isi`, `penulisNama`, `kategori`, `likes`, `komentar` |
| `sesi_meet` | Jadwal & status ruang temu video Agora | `id`, `judul`, `channelName`, `kelasId`, `status` (`terjadwal`, `berlangsung`, `selesai`) |
| `chat_kelas` | Pesan diskusi publik kelas | `subcollection: pesan` (real-time chat) |
| `chat_pribadi` | Ruang chat personal antar siswa | Dokumen ID: `chat_${uidMin}_${uidMax}`, pesan terenkripsi AES-GCM |

---

## 4. Alur Bisnis & Alur Fitur (Business Flows)

### A. Alur Masuk & Aktivasi Akun Siswa (Student Onboarding)
```
[Murid Buka /masuk]
        │
        ├──> [Klik "Masuk dengan Google"]
        │           │
        │           ▼
        │   [Firebase Auth Berhasil]
        │           │
        │           ├── Apakah profile.isClaimed === true?
        │           │       ├─ YA  ──> Arahkan ke Dashboard Murid (/murid)
        │           │       └─ TDK ──> Arahkan ke Halaman Aktivasi (/aktivasi)
        │           │
        ▼           ▼
[Halaman Aktivasi: Input NISN & Pilih Kelas]
        │
        ├── Cek Validitas NISN di koleksi 'murid'
        │
        ├── Buat Dokumen di 'klaim_aktivasi' (status: 'pending')
        │
        ▼
[Guru Membuka Panel /guru/permintaan]
        │
        ├── Guru memverifikasi identitas siswa
        │       ├─ Ditolak   ──> Siswa diminta mengulang klaim dengan data benar
        │       └─ Disetujui ──> Update 'users' (isClaimed: true, kelasId terkait)
        │
        ▼
[Siswa Login Kembali & Langsung Masuk ke Ruang Belajar Murid]
```

---

### B. Alur Pembelajaran & Evaluasi (Materi, Kuis, & Tugas)
1. **Materi Pelajaran**:
   - Guru menerbitkan modul dengan rich-editor / Markdown di `/guru/materi`.
   - Siswa mengakses di `/murid/materi`. Modul mencatat pembacaan materi untuk pelacakan progres belajar di `/guru/progres`.
2. **Kuis Formatif**:
   - Siswa membuka kuis di `/murid/kuis/:id`. Sistem menjalankan *timer countdown* otomatis.
   - Ketika waktu habis atau siswa mengirimkan jawaban, sistem menghitung skor instan dan menyimpannya di koleksi `percobaan_kuis`.
   - Siswa dapat melihat analisis jawaban benar/salah di `/murid/hasil/:percobaanId`.
3. **Pengumpulan Tugas**:
   - Siswa melihat daftar tugas aktif dan tenggat waktu (*deadline*) di `/murid/tugas`.
   - Unggah file jawaban melalui Cloudinary widget terintegrasi.
   - Guru memeriksa berkas di `/guru/tugas/:id/nilai`, memberikan nilai numerik (0–100) dan catatan evaluasi yang langsung ternotifikasi ke siswa.

---

### C. Alur Sesi Tatap Muka Online (Live Meet Ala Zoom via Agora RTC)
1. **Inisiasi oleh Guru**:
   - Guru membuka `/guru/meet`, memilih rombel kelas sasaran, dan mengklik **"Mulai Tatap Muka Sekarang"**.
   - Sistem memperbarui status sesi menjadi `berlangsung` di Firestore.
2. **Notifikasi Real-Time ke Siswa**:
   - Komponen `LiveMeetAlertToast` di dashboard siswa secara otomatis menangkap status `berlangsung`.
   - **Di Ponsel (Mobile)**: Muncul *Floating Circular Action Button* di kiri bawah di atas bottom navigation dengan animasi *live ping pulse*. Siswa mengetuk ikon untuk melihat detail popover dan bergabung.
   - **Di Tablet/Desktop**: Muncul strip toast elegan di pojok kanan bawah.
3. **Pra-Meet Lobby (`PreMeetLobbyModal`)**:
   - Siswa / Guru dapat menguji kamera depan dan mikrofon sebelum masuk.
4. **Ruang Tatap Muka (`AgoraMeetRoom`)**:
   - Audio/Video HD multipihak menggunakan Agora RTC NG.
   - Fitur ruang temu: *Mute/Unmute Mic, Kamera On/Off, Switch Kamera Depan/Belakang, Chat Room Sesi, Angkat Tangan (Hand Raise), Mode Galeri / Speaker, dan Berbagi Layar (Share Screen) Desktop/Mobile Fallback*.
   - **Akhiri Sesi**: Guru dapat mengakhiri sesi untuk seluruh peserta via modal konfirmasi modern tanpa `window.confirm`.

---

### D. Fitur Chat Real-Time & Enkripsi Chat Pribadi
1. **Chat Kelas**: Diskusi terbuka sesama teman sekelas dan guru pembina.
2. **Chat Pribadi (`ModalChatPribadi`)**:
   - Komunikasi personal antar siswa menggunakan algoritma kriptografi AES-GCM 256-bit (`cryptoChat.js`).
   - Pesan di database Firestore tersimpan dalam bentuk ciphertext terenkripsi (aman dari intipan database publik).
   - Dilengkapi indikator kehadiran realtime (*Online / Last Seen*) via `presence.js` dan status sedang mengetik (*typing indicator*).

---

### E. Fitur PWA (Progressive Web App) & Mobile Experience
- Terdaftar dengan Service Worker dan `public/manifest.json`.
- Komponen `PwaInstallToast` menampilkan ajakan install aplikasi berbasis kapsul minimalis di atas tengah untuk HP dan kiri atas untuk tablet.
- Navigasi mobile bawah bergaya *Apple iOS Floating Glassmorphism* (`BottomNav.jsx`) dengan perataan aman (*safe-area-inset*).

---

## 5. Konfigurasi Lingkungan (Environment Variables)

Variabel lingkungan yang wajib ada di `.env` (atau Dashboard Vercel):
```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_VAPID_KEY=...

# Agora Video RTC
VITE_AGORA_APP_ID=...

# Cloudinary Media
VITE_CLOUDINARY_CLOUD_NAME=...
VITE_CLOUDINARY_UPLOAD_PRESET=...

# Gemini API Keys (Mendukung multiple keys dipisah koma untuk round-robin)
VITE_GEMINI_API_KEYS=key1,key2,key3
VITE_GEMINI_MODEL=gemini-1.5-flash
```

---

## 6. Standar Perubahan Kode untuk Pengembang / Agen AI Berikutnya
1. **Stacking Context & Modals**: Semua modal baru WAJIB dirender menggunakan `createPortal(..., document.body)` dengan backdrop `w-full h-full min-h-[100dvh] z-[99999]` dan penguncian scroll `document.body.style.overflow = "hidden"`.
2. **Mobile-First & Responsif**: Selalu perhitungkan keberadaan `BottomNav` (`bottom-0 z-50`) di tampilan HP. Letakkan floating action button di minimal `bottom-20` agar tidak bentrok.
3. **Git Workflow**: Setelah melakukan perbaikan atau fitur baru, pastikan untuk selalu melakukan commit yang deskriptif dan push ke remote branch `master`.
