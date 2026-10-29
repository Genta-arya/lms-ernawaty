# LMS Sederhana SMPN 3 Ketapang (v2.0)

Media Pembelajaran Mandiri Bahasa Inggris — **Teks Rekon (*Recount Text*)**  
Fase D (Kelas VII, VIII, IX — Kurikulum Merdeka)  
Guru Pengampu: **Ibu Ernawaty**

---

## 🚀 Fitur Unggulan

1. **Autentikasi Dua Jalur:**
   - **Guru:** Login aman via Email & Password, dilindungi Firestore Security Rules (`guru/{uid}`).
   - **Murid:** Login cepat sekali-klik dengan akun **Google**, diverifikasi dengan data siswa resmi SMPN 3 Ketapang (Jalur A otomatis atau Jalur B persetujuan guru).
2. **Paket Materi Siap Pakai (Lampiran A):**
   - Materi 1: Teks Rekon (Pengertian, Jenis, dan Struktur)
   - Materi 2: Unsur Kebahasaan Teks Rekon (Simple Past Tense, Time Connectives)
   - Materi 3: Menulis Teks Rekon & Mengenal Factual Recount
   - *Generator 1-Klik* di Dashboard Guru untuk menginjeksi materi dari template.
3. **Kuis Formatif Interaktif (Lampiran B):**
   - 28 butir soal latihan formatif (Pilihan Ganda, Benar/Salah, Isian Singkat).
   - Penilaian instan di browser murid, dilengkapi pembahasan mendalam di setiap butir soal.
4. **Analisis Guru & Monitoring:**
   - Rekap nilai kuis, statistik rata-rata, persentase kelulusan, dan daftar siswa yang belum mengerjakan.
   - Analisis butir soal untuk mendeteksi soal tersulit yang butuh evaluasi di kelas.
   - Matriks progres membaca per kelas.
   - Ekspor data siswa & hasil kuis ke CSV.

---

## 🛠️ Panduan Menjalankan Proyek

### 1. Instalasi Dependensi
```bash
npm install
```

### 2. Konfigurasi Firebase
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Isi variabel Firebase dengan kredensial dari **Firebase Console**:
```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=smpn3-ketapang.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=smpn3-ketapang
VITE_FIREBASE_STORAGE_BUCKET=smpn3-ketapang.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 3. Setup Awal di Firebase Console
1. Aktifkan provider **Email/Password** dan **Google** di Firebase Authentication.
2. Buat dokumen manual untuk akun guru:
   - Koleksi: `guru`
   - ID Dokumen: `<UID_GURU>` (didapat dari tab Authentication setelah mendaftarkan akun guru)
   - Fields:
     - `nama`: `"Ernawaty"`
     - `mapel`: `"Bahasa Inggris"`
     - `nip`: `""`
     - `email`: `"email_guru@sekolah.sch.id"`
3. Buat dokumen sekolah:
   - Koleksi: `sekolah`
   - Dokumen ID: `utama`
   - Fields: `nama`: `"SMPN 3 Ketapang"`, `alamat`: `"Ketapang, Kalimantan Barat"`
4. Deploy Security Rules:
```bash
firebase deploy --only firestore:rules,firestore:indexes
```

### 4. Jalankan Server Pengembangan
```bash
npm run dev
```

### 5. Build & Deploy ke Firebase Hosting
```bash
npm run build
firebase deploy --only hosting
```

