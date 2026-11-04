# Roadmap & Ide Pengembangan Masa Depan (LMS SMPN 3 Ketapang)

Dokumen ini memuat peta jalan strategis (*product roadmap*), ide-ide inovasi fitur, dan rekomendasi arsitektur lanjutan untuk membawa LMS Mandiri SMPN 3 Ketapang menjadi platform pembelajaran digital modern terdepan. Inisiatif diklasifikasikan ke dalam 3 fase strategis: **Fase 1 (Quick Wins)**, **Fase 2 (Enhanced Interactivity)**, dan **Fase 3 (Ecosystem Expansion)**.

> [!NOTE]
> Fitur-fitur yang **sudah aktif dan beroperasi** saat ini di Dashboard Guru (seperti *Generator Materi Otomatis AI Gemini*, *Generator Kuis Formatif AI*, *Papan Pengumuman Sekolah*, *Pelacak Progres Membaca Siswa*, *Penilaian Tugas dengan Catatan Guru*, dan *Tatap Muka Virtual Agora RTC*) terdokumentasi lengkap di berkas [`docs/DOKUMENTASI_SISTEM.md`](./DOKUMENTASI_SISTEM.md). Rencana di bawah ini adalah inisiatif **baru** untuk pengembangan selanjutnya.

---

## Matriks Prioritas & Dampak Inovasi

```
Dampak Tinggi  │  [AI Tutor Belajar Murid]    [Papan Tulis Kolaboratif]     [Mode Belajar Offline PWA]
               │  [Ekspor Buku Nilai Excel]   [Presensi Otomatis Meet]       [Portal Wali Murid]
               │
Dampak Sedang  │  [Gamifikasi XP & Badges]    [Deteksi Dini Siswa Lambat]   [Breakout Rooms Meet]
               │  [Koreksi AI Esai Bahasa]    [Voice Note di Chat Kelas]    [Audiobook Modul Materi]
               └─────────────────────────────────────────────────────────────────────────────
                                 Fase 1                        Fase 2                        Fase 3
                            (Jangka Pendek)               (Jangka Menengah)              (Jangka Panjang)
```

---

## 1. Fase 1: Peningkatan Cepat & Nilai Tambah Langsung (Quick Wins)

### 1.1. Ekspor Rekapitulasi Nilai ke Format Excel Resmi (.xlsx)
- **Konteks & Masalah**: Guru saat ini dapat mengunduh nilai kuis dan tugas dalam format CSV, namun format baku buku nilai Kurikulum Merdeka dinas pendidikan membutuhkan berkas Excel lengkap dengan rumus rata-rata dan status KKM.
- **Solusi Fitur**:
  - Tombol *"Ekspor Buku Nilai Raport"* di halaman `/guru/progres` dan `/guru/kelas/:id`.
  - Menggunakan library `exceljs` untuk menghasilkan berkas `.xlsx` dengan formula otomatis: Nilai Rata-Rata Kuis, Nilai Tugas, Bobot Penilaian, dan Keterangan Capaian Kompetensi.
- **Estimasi Kompleksitas**: Rendah - Sedang (2–3 hari kerja).

### 1.2. Gamifikasi Pembelajaran: Sistem XP, Level, & Lencana Digital
- **Konteks & Masalah**: Siswa memerlukan dorongan motivasi tambahan agar antusias membuka modul bacaan dan mengumpulkan tugas lebih awal.
- **Solusi Fitur**:
  - **Experience Points (XP)**:
    - Menuntaskan pembacaan bab materi: `+50 XP`
    - Mengerjakan kuis formatif di atas KKM: `+100 XP`
    - Mengumpulkan tugas sebelum tenggat waktu: `+75 XP`
    - Menerbitkan karya mading yang disukai teman: `+30 XP`
  - **Level Akun Siswa**: Level 1 (Pemula) hingga Level 10 (Pujangga Ahli).
  - **Koleksi Lencana Digital (*Badges*)**:
    - *Kutu Buku*: Membaca 10 modul materi pelajaran.
    - *Sempurna*: Meraih nilai 100 pada kuis formatif.
    - *Pena Emas*: Menerbitkan 3 karya literasi di Mading.
- **Estimasi Kompleksitas**: Sedang (3–4 hari kerja).

### 1.3. AI Tutor Pendamping Belajar Murid ("Tanya Bu Guru AI")
- **Konteks & Masalah**: Siswa sering merasa malu atau ragu bertanya langsung di kelas saat tidak memahami suatu kosakata asing atau kaidah kebahasaan.
- **Solusi Fitur**:
  - Asisten belajar mengambang (*floating chat tutor*) di halaman modul materi siswa (`/murid/materi`).
  - Menggunakan Google Gemini API dengan prompt tersegmentasi ketat: AI berperan ramah layaknya guru pembina SMPN 3 Ketapang yang sabar menjelaskan arti kata sulit, menyajikan analogi sederhana, dan membuat ringkasan kilat 3 poin utama.
- **Estimasi Kompleksitas**: Sedang (3 hari kerja).

---

## 2. Fase 2: Interaktivitas Lanjutan & Pembelajaran Cerdas (Enhanced Interactivity)

### 2.1. Papan Tulis Kolaboratif di Agora Meet (Digital Whiteboard)
- **Konteks & Masalah**: Saat tatap muka virtual berlangsung, guru kesulitan mencoret-coret diagram struktur teks atau bagan tata bahasa secara langsung bersama siswa.
- **Solusi Fitur**:
  - Kanvas kolaboratif terintegrasi di dalam ruang `AgoraMeetRoom.jsx` menggunakan library open-source seperti `tldraw` atau `fabric.js`.
  - Sinkronisasi goresan pensil, bentuk bangun, pengetikan teks, dan penghapus secara real-time antar peserta melalui Firestore / Firebase Realtime Database.
  - Guru dapat memberikan hak kontrol coret kepada siswa tertentu untuk menjawab pertanyaan langsung di layar.
- **Estimasi Kompleksitas**: Tinggi (1–2 minggu kerja).

### 2.2. Presensi & Absensi Otomatis Sesi Tatap Muka
- **Konteks & Masalah**: Guru membuang waktu 10–15 menit di awal sesi meet hanya untuk memanggil presensi satu per satu siswa.
- **Solusi Fitur**:
  - Sistem otomatis mencatat log waktu saat siswa masuk ke channel Agora dan waktu saat mereka keluar.
  - Menghitung persentase durasi kehadiran (misal: hadir minimal 75% durasi = status *"Hadir Penuh"*, di bawah itu = *"Hadir Sebagian"*).
  - Menghasilkan lembar presensi otomatis yang terhubung ke data kelas.
- **Estimasi Kompleksitas**: Sedang (4–5 hari kerja).

### 2.3. Peringatan Dini Penurunan Belajar (Early Intervention Alert)
- **Konteks & Masalah**: Guru baru menyadari siswa mengalami penurunan pemahaman saat evaluasi akhir semester telah dekat.
- **Solusi Fitur**:
  - Algoritma analitik cerdas di `/guru/progres` yang secara otomatis menandai siswa dengan badge peringatan kuning/merah jika:
    1. Mengalami penurunan skor kuis formatif 3 kali berturut-turut.
    2. Melewatkan pengumpulan 2 tugas berturut-turut.
    3. Tidak membuka materi belajar selama lebih dari 7 hari.
  - Memberikan rekomendasi tindakan bimbingan belajar atau remedial terarah bagi guru.
- **Estimasi Kompleksitas**: Sedang (4 hari kerja).

### 2.4. Koreksi Otomatis Tugas Esai Berbasis AI (Automated Grading Rubric)
- **Konteks & Masalah**: Mengoreksi ratusan esai atau cerpen siswa membutuhkan waktu berhari-hari bagi seorang guru.
- **Solusi Fitur**:
  - Fitur *"Bantu Nilai dengan AI"* di panel `/guru/tugas/:id/nilai`.
  - Google Gemini menganalisis berkas teks tugas siswa berdasarkan rubrik: Ejaan & Tanda Baca (PUEBI), Kesesuaian Tema, dan Keruntutan Paragraf.
  - AI menyajikan draf nilai awal dan komentar umpan balik yang membangun; guru memegang kendali penuh untuk menyetujui, mengedit, atau menolak saran AI.
- **Estimasi Kompleksitas**: Sedang - Tinggi (5–6 hari kerja).

---

## 3. Fase 3: Ekosistem & Skalabilitas Menyeluruh (Ecosystem Expansion)

### 3.1. Mode Belajar Offline PWA (Offline-First Learning Storage)
- **Konteks & Masalah**: Banyak siswa tinggal di area dengan jaringan seluler tidak stabil atau kuota internet terbatas di rumah.
- **Solusi Fitur**:
  - Tombol *"Unduh Modul Offline"* pada setiap materi dan kuis.
  - Menyimpan teks modul, gambar penjelasan, dan paket soal kuis ke penyimpanan lokal peramban menggunakan IndexedDB & CacheStorage API.
  - Siswa dapat membaca materi dan mengerjakan kuis saat offline di rumah. Ketika HP mereka kembali terhubung ke internet di sekolah, data skor otomatis terkirim (*auto-sync*) ke Cloud Firestore.
- **Estimasi Kompleksitas**: Tinggi (2 minggu kerja).

### 3.2. Portal Pantau Orang Tua / Wali Murid (Parent Monitoring View)
- **Konteks & Masalah**: Orang tua siswa ingin mengetahui apakah anak mereka rajin mengumpulkan tugas tanpa harus meminjam akun Google pribadi siswa.
- **Solusi Fitur**:
  - Halaman publik ringan `/pantau` yang dapat diakses dengan memasukkan NISN dan Token Keamanan Orang Tua (dapat dicetak pada kartu pelajar).
  - Tampilan ringkas berisi: Status pengumpulan tugas minggu ini, rekapitulasi nilai kuis terbaru, dan catatan khusus dari guru wali kelas.
- **Estimasi Kompleksitas**: Sedang (5–6 hari kerja).

### 3.3. Breakout Rooms (Ruang Diskusi Kelompok Tatap Muka)
- **Konteks & Masalah**: Pembelajaran Kurikulum Merdeka menekankan kerja kelompok (*Problem-Based Learning*), namun di dalam satu room video besar semua siswa bercampur.
- **Solusi Fitur**:
  - Guru dapat membagi seluruh peserta ruang temu menjadi beberapa sub-channel Agora otomatis atau manual (misal: Kelompok 1, Kelompok 2, Kelompok 3).
  - Siswa hanya mendengar dan melihat anggota kelompoknya sendiri.
  - Guru dapat berpindah-pindah antar ruang kelompok untuk memantau diskusi dan memanggil semua siswa kembali ke ruang utama.
- **Estimasi Kompleksitas**: Tinggi (2 minggu kerja).

### 3.4. Pesan Suara (*Voice Note*) di Chat Kelas & Diskusi Materi
- **Konteks & Masalah**: Pada materi Bahasa Indonesia lisan (seperti membaca puisi, deklamasi, atau pidato persuasif), komunikasi teks kurang mewadahi kemampuan artikulasi vokal siswa.
- **Solusi Fitur**:
  - Tombol rekam audio langsung di ruang obrolan kelas atau forum materi.
  - File suara terkompresi otomatis (`.mp3`/`.webm`) disimpan ke Cloudinary dan dapat diputar langsung di linimasa obrolan.
- **Estimasi Kompleksitas**: Sedang (4 hari kerja).

---

## 4. Rekomendasi Peningkatan Arsitektur & Keamanan Berkelanjutan

1. **Audit Keamanan Firestore Rules**:
   - Memperketat aturan penulisan koleksi `karya_mading` dan `chat_pribadi` agar hanya pemilik UID yang sesuai yang dapat menulis atau mengubah dokumennya.
2. **Pembersihan Data Berkala (Cloud Functions / Firebase Functions)**:
   - Membuat fungsi pembersih harian (*cron clean-up*) untuk dokumen `user_presence` yang tidak aktif lebih dari 30 hari guna menghemat kuota pembacaan Firestore.
3. **Pengarsipan Tahun Ajaran**:
   - Mekanisme arsip data tugas dan nilai ketika pergantian tahun ajaran baru tiba agar database tetap ringan dan performa kueri tetap optimal.
