# Roadmap & Ide Pengembangan Masa Depan (Feature Ideation & Roadmap)

Dokumen ini berisi kumpulan inisiatif, inovasi fitur, dan rekomendasi peningkatan arsitektur untuk pengembangan LMS Mandiri SMPN 3 Ketapang ke tahap selanjutnya. Ide-ide di bawah dikelompokkan berdasarkan prioritas dan dampak bagi kegiatan belajar mengajar.

---

## 1. Integrasi Kecerdasan Buatan Tingkat Lanjut (AI-Powered Learning)

### A. AI Tutor Pribadi & Asisten Belajar Murid ("Tanya Bu Guru AI")
- **Deskripsi**: Bot asisten interaktif di pojok kanan bawah modul materi yang dapat ditanyai siswa kapan saja jika belum memahami bagian bacaan tertentu.
- **Implementasi**: Menggunakan Google Gemini API dengan *system prompt* yang dibatasi hanya pada silabus Kurikulum Merdeka SMPN 3 Ketapang.
- **Fitur Unggulan**:
  - Ringkasan materi otomatis (*TL;DR / Quick Summary*).
  - Penjelasan konsep sulit dengan bahasa analogi sederhana yang ramah remaja SMP.
  - Kuis latihan instan hasil generasi AI berdasarkan materi yang sedang dibaca.

### B. Generator Soal Kuis Otomatis untuk Guru (AI Quiz Creator)
- **Deskripsi**: Guru cukup mengunggah berkas modul atau mengetikkan topik pembahasan, lalu AI otomatis menghasilkan 10–20 soal pilihan ganda beserta kunci jawaban dan opsi pengecoh yang berbobot.
- **Dampak**: Menghemat waktu persiapan guru hingga 80% saat membuat kuis formatif baru.

### C. Koreksi Tugas Otomatis Berbasis Rubrik & AI (Automated Grading Assistant)
- **Deskripsi**: Untuk tugas esai Bahasa Indonesia atau karya tulis literasi, AI menganalisis tata bahasa (*PUEBI*), kesesuaian struktur teks, serta orisinalitas, lalu memberikan draf saran nilai awal dan komentar yang tinggal disetujui atau disesuaikan oleh guru.

---

## 2. Gamifikasi & Motivasi Belajar Siswa (Gamification Engine)

### A. Sistem Poin, Level, & Lencana Digital (Badges & Achievement System)
- **Mekanisme**: Siswa mendapatkan *Exp Points (XP)* setiap kali:
  - Menyelesaikan pembacaan materi (+50 XP).
  - Mengerjakan kuis formatif dengan nilai di atas KKM (+100 XP).
  - Mengumpulkan tugas tepat waktu (+75 XP).
  - Membaca dan menyukai karya literasi teman di Mading (+10 XP).
- **Lencana (Badges)**:
  - *Kutu Buku*: Membaca 10 modul pelajaran.
  - *Master Kuis*: Meraih nilai 100 berturut-turut pada 3 kuis berbeda.
  - *Pujangga Muda*: Menerbitkan 3 karya puisi/artikel di Mading.
- **Leaderboard Rombel**: Papan peringkat mingguan dan bulanan yang ramah dan kompetitif di dashboard murid.

---

## 3. Peningkatan Fitur Tatap Muka Online (Agora Live Meet 2.0)

### A. Papan Tulis Digital Bersama (Collaborative Whiteboard)
- **Deskripsi**: Kanvas interaktif di dalam room Agora Meet tempat guru bisa mencoret-coret rumus, membuat peta konsep (*mind map*), atau meminta siswa mengerjakan soal secara langsung di layar.
- **Teknologi**: Menggunakan library kanvas HTML5 seperti `tldraw` atau `fabric.js` disinkronkan melalui Firebase Realtime Database.

### B. Presensi / Absensi Otomatis Sesi Meet
- **Deskripsi**: Sistem otomatis mencatat log durasi kehadiran siswa di ruang temu: jam masuk, jam keluar, dan total menit kehadiran, lalu mengekspornya langsung ke lembar rekapitulasi kehadiran guru.

### C. Breakout Rooms (Ruang Diskusi Kelompok)
- **Deskripsi**: Guru dapat membagi siswa yang sedang online di dalam satu sesi besar menjadi beberapa sub-ruangan kecil (3–5 orang) untuk diskusi kelompok, lalu memanggil mereka kembali ke ruang utama.

---

## 4. Fitur Offline & Optimalisasi PWA (Offline-First Learning)

### A. Download Modul untuk Baca Offline (Offline Reading Mode)
- **Deskripsi**: Siswa yang memiliki keterbatasan kuota internet di rumah dapat menekan tombol **"Simpan Offline"** pada modul teks rekon atau materi Bahasa Indonesia saat berada di sekolah / area Wi-Fi.
- **Implementasi**: Menggunakan IndexedDB lokal melalui Service Worker caching (`CacheStorage API`).

### B. Push Notification PWA Native (Web Push via FCM)
- **Deskripsi**: Notifikasi instan langsung ke layar kunci HP siswa layaknya aplikasi Play Store ketika:
  - Guru memulai sesi Live Meet.
  - Guru mengunggah tugas baru dengan tenggat waktu dekat.
  - Teman sekelas mengirimkan pesan chat pribadi.

---

## 5. Portal Orang Tua Siswa (Parent Monitoring Portal)

### A. Akses Pantau Wali Murid (Parent View Mode)
- **Deskripsi**: Tampilan ringan khusus orang tua/wali murid berbasis kode QR atau token unik siswa untuk melihat:
  - Catatan kehadiran kuis dan nilai evaluasi harian anak.
  - Pengumuman penting dari pihak sekolah.
  - Riwayat pengumpulan tugas anak (sudah mengumpulkan atau terlambat).
- **Dampak Positif**: Meningkatkan kolaborasi antara pihak sekolah dan orang tua di rumah.

---

## 6. Analitik & Pelaporan Pembelajaran Komprehensif (Teacher Analytics)

### A. Ekspor Laporan Nilai ke Excel / PDF Resmi
- **Fitur**: Tombol satu klik untuk mengekspor rekap nilai kuis formatif dan tugas ke format `.xlsx` (Excel) sesuai format buku nilai kurikulum dinas pendidikan.

### B. Grafik Deteksi Dini Siswa yang Memerlukan Bimbingan (Early Intervention Alert)
- **Mekanisme**: Sistem mendeteksi otomatis siswa yang mengalami penurunan nilai berturut-turut atau belum membuka modul materi selama lebih dari 7 hari, lalu memberikan tanda pengingat bagi guru wali kelas untuk memberikan pendampingan khusus.
