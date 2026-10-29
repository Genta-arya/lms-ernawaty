# PRD — LMS Sederhana SMPN 3 Ketapang

| | |
|---|---|
| **Versi** | 2.0 (MVP) |
| **Tanggal** | 29 Oktober 2026 |
| **Sekolah** | SMPN 3 Ketapang |
| **Guru** | Ernawaty |
| **Jenjang** | SMP, Fase D (kelas VII–IX, Kurikulum Merdeka) |
| **Mata pelajaran / materi awal** | Bahasa Inggris / Teks Rekon (*Recount Text*): struktur dan unsur kebahasaan |
| **Stack** | React (JSX, Vite), shadcn/ui, Tailwind CSS via CDN, Firebase (Auth + Firestore + Hosting) |

**Perubahan dari v1.0:**
1. **Murid login dengan Google** (Firebase Authentication) dan terhubung ke data murid (NISN, nama, kelas) lewat proses aktivasi.
2. **Kuis per materi**: guru membuat soal, murid mengerjakan, guru melihat hasil dan analisis soal.
3. **Portal murid** (dashboard, progres baca, riwayat kuis) dan **laporan hasil/progres** untuk guru.
4. **Isi materi dan bank soal Teks Rekon** sudah disiapkan (Lampiran A dan B), diselaraskan dengan struktur materi recount pada Kurikulum Merdeka Fase D (Lampiran C).

---

## 1. Ringkasan

LMS sederhana untuk SMPN 3 Ketapang yang dikelola satu guru, Ibu **Ernawaty**. Guru login (email & password) untuk mengelola profil, kelas, data murid, materi, dan kuis. Murid login dengan **akun Google**, membaca materi sesuai tingkat kelasnya, mengerjakan **kuis latihan per materi**, dan melihat riwayat skor. Materi pertama adalah **Teks Rekon** (struktur dan kebahasaan) lengkap dengan kuisnya. Tidak ada server sendiri: aplikasi berbicara langsung ke Firebase dari browser.

## 2. Tujuan

- Guru mengelola kelas, murid, materi, dan kuis dalam satu tempat.
- Murid belajar mandiri: membaca materi, berlatih lewat kuis, dan langsung melihat pembahasan.
- Guru memantau siapa yang sudah membaca/mengerjakan dan soal mana yang paling sulit.
- Tetap sederhana dan murah (cukup paket gratis Firebase).

## 3. Non-Goals (di luar MVP)

- Penilaian resmi/ujian yang menuntut keamanan kunci jawaban (lihat bagian 11).
- Pengumpulan tugas file, rapor, absensi, forum, notifikasi.
- Multi-guru dan multi-sekolah.
- Upload file besar (PDF/PPT/video).

## 4. Pengguna

| Peran | Cara masuk | Akses |
|---|---|---|
| **Guru (Ernawaty)** | Email & password (akun dibuat manual di Firebase Console) | Penuh: profil, kelas, murid, materi, kuis, hasil. |
| **Murid** | Akun **Google** | Materi terbit sesuai tingkatnya, kuis terbit, riwayat dan progres **miliknya sendiri**. |
| **Pengunjung** | Tanpa login | Hanya membaca materi berstatus terbit. |

## 5. Fitur & Kebutuhan Fungsional

### 5.1 Autentikasi

| ID | Kebutuhan |
|---|---|
| AUTH-1 | **Guru:** `/guru/login` dengan email & password (`signInWithEmailAndPassword`), plus *lupa password* (`sendPasswordResetEmail`). |
| AUTH-2 | Semua `/guru/*` dilindungi; akun dianggap guru hanya jika dokumen `guru/{uid}` ada di Firestore (dibuat manual saat setup). |
| AUTH-3 | **Murid:** `/masuk` dengan tombol **"Masuk dengan Google"** (`GoogleAuthProvider`, `signInWithPopup`; fallback `signInWithRedirect` bila popup diblokir). |
| AUTH-4 | Hanya akun Google dengan **email terverifikasi** yang diproses sebagai murid. |
| AUTH-5 | Setelah login Google, aplikasi menentukan status: (a) sudah terhubung (`akunMurid/{uid}` ada) → `/murid`; (b) email cocok dengan data murid → aktivasi otomatis; (c) selain itu → `/aktivasi`. |
| AUTH-6 | Murid tidak dapat membuka `/guru/*`; halaman `/murid/*` hanya untuk akun yang sudah terhubung. |
| AUTH-7 | Tombol **Logout** di navbar guru dan murid. |
| AUTH-8 | Deteksi *in-app browser* (mis. dibuka dari aplikasi tertentu) dan tampilkan petunjuk "Buka di Chrome/Safari" karena login Google dapat diblokir di sana. |
| AUTH-9 | **Jangan** menonaktifkan *sign-up* di pengaturan Firebase Authentication (murid membuat akun lewat Google). Keamanan dijaga oleh Security Rules dan pengecekan provider (bagian 9). |
| AUTH-10 | Pesan error jelas dan state loading saat status auth dicek. |

### 5.2 Aktivasi Akun Murid

Murid harus dikaitkan dengan satu data murid (NISN) agar kuis dan progresnya tercatat atas nama yang benar.

| ID | Kebutuhan |
|---|---|
| AKT-1 | **Jalur A (otomatis):** guru mengisi *email Google* pada data murid. Saat murid login dengan email yang sama, akun otomatis terhubung ke NISN tersebut. |
| AKT-2 | **Jalur B (permintaan):** jika email belum terdaftar, murid mengisi **NISN (10 digit)** dan **nama lengkap**, lalu mengirim permintaan aktivasi (status *menunggu*). Halaman `/aktivasi` menampilkan status permintaan. |
| AKT-3 | Guru membuka `/guru/permintaan` untuk melihat daftar permintaan beserta kecocokan data (NISN ditemukan? nama sama? kelas apa?), lalu **Setujui** atau **Tolak** (dengan catatan). |
| AKT-4 | Saat disetujui, sistem membuat tautan akun murid ↔ NISN dan menghapus permintaan. |
| AKT-5 | Satu akun Google hanya terhubung ke satu NISN. Jika NISN sudah terhubung ke akun lain, guru diberi peringatan sebelum menyetujui. |
| AKT-6 | Guru dapat **memutus tautan** akun murid (mis. murid ganti akun) agar murid dapat aktivasi ulang. |
| AKT-7 | Permintaan aktivasi hanya dapat dibuat oleh akun Google. |

### 5.3 Profil Guru

| ID | Kebutuhan |
|---|---|
| PRO-1 | `/guru/profil`: ubah nama lengkap (awal: **Ernawaty**), NIP (opsional), mata pelajaran (awal: **Bahasa Inggris**), no. HP, bio, URL foto. |
| PRO-2 | Nama sekolah **SMPN 3 Ketapang** tampil di profil dan header (dokumen `sekolah/utama`). |
| PRO-3 | Email tidak dapat diubah di halaman ini. |
| PRO-4 | **Ganti password** dengan re-autentikasi (`updatePassword`). |

### 5.4 Kelola Kelas

| ID | Kebutuhan |
|---|---|
| KLS-1 | `/guru/kelas`: daftar kelas (nama, tingkat, tahun ajaran, jumlah murid). |
| KLS-2 | Tambah/ubah/hapus kelas: nama (mis. VII A), tingkat (VII/VIII/IX), tahun ajaran (mis. 2026/2027), keterangan. |
| KLS-3 | Kelas yang masih memiliki murid tidak dapat dihapus. |
| KLS-4 | Nama kelas unik dalam satu tahun ajaran. |
| KLS-5 | Detail kelas menampilkan daftar murid, status akun (terhubung/belum), dan tombol cepat tambah murid. |
| KLS-6 | Jumlah murid dihitung dengan `getCountFromServer`. |

### 5.5 Data Murid

| ID | Kebutuhan |
|---|---|
| MRD-1 | `/guru/murid`: tabel **NISN**, **Nama**, **Kelas**, **Email Google** (opsional), **Status akun** (Terhubung / Belum), aksi. |
| MRD-2 | Tambah murid: NISN (wajib, 10 digit angka, unik), Nama (wajib), Kelas (wajib), Email Google (opsional, huruf kecil). |
| MRD-3 | Keunikan NISN: NISN dipakai sebagai **ID dokumen** dan dicek lewat transaksi sebelum simpan. |
| MRD-4 | Ubah nama, kelas, dan email. NISN tidak dapat diubah. |
| MRD-5 | Hapus murid dengan konfirmasi; riwayat kuis murid tersebut ikut terhapus bila guru memilih opsi "hapus juga riwayat". |
| MRD-6 | Filter kelas, pencarian nama/NISN, pagination. |
| MRD-7 | **Impor CSV** (`nisn,nama,kelas,email` — kolom email opsional): pratinjau, tandai baris bermasalah, simpan baris valid dengan `writeBatch`. |
| MRD-8 | **Ekspor CSV** sesuai filter. |
| MRD-9 | **Pindah kelas massal**. |
| MRD-10 | Nama kelas pada tabel diambil dengan menggabungkan data murid dan kelas di client. |

### 5.6 Materi Pembelajaran

| ID | Kebutuhan |
|---|---|
| MAT-1 | `/guru/materi`: daftar materi (judul, topik, tingkat, status Draft/Terbit, jumlah kuis, terakhir diubah). |
| MAT-2 | Buat materi: judul, topik, deskripsi, tujuan pembelajaran (daftar), tingkat sasaran (VII/VIII/IX, boleh lebih dari satu), urutan tampil, dan satu atau lebih **bagian**. |
| MAT-3 | Tiap bagian: judul, jenis (`pengantar`, `struktur`, `kebahasaan`, `contoh`, `latihan`, `rangkuman`), urutan, isi **Markdown** (tabel, daftar, tebal/miring, kutipan). |
| MAT-4 | Editor Markdown dengan tab **Tulis / Pratinjau**. |
| MAT-5 | Urutkan ulang dan hapus bagian. |
| MAT-6 | Status Draft (hanya guru) / Terbit (publik). |
| MAT-7 | Duplikat materi. |
| MAT-8 | Tombol **"Buat dari template Teks Rekon"** untuk membuat tiga materi awal sekaligus (Lampiran A). |
| MAT-9 | `slug` unik untuk URL publik. |

### 5.7 Kuis per Materi (Guru)

| ID | Kebutuhan |
|---|---|
| KUI-1 | `/guru/kuis`: daftar kuis (judul, materi, jumlah soal, status, jumlah percobaan). |
| KUI-2 | Buat/ubah kuis: **materi** (dropdown), judul, deskripsi, **nilai lulus** (default 70), **acak urutan soal**, **acak urutan opsi**, **maksimal percobaan** (kosong = tidak terbatas), status Draft/Terbit. Tingkat sasaran otomatis mengikuti materi. |
| KUI-3 | Editor soal dengan tiga tipe: **Pilihan ganda** (2–5 opsi, satu kunci), **Benar/Salah**, **Isian singkat** (satu atau lebih jawaban yang diterima). |
| KUI-4 | Tiap soal punya: pertanyaan (Markdown ringkas, boleh berisi kutipan teks bacaan), opsi/kunci, dan **pembahasan** (ditampilkan ke murid setelah kuis selesai). |
| KUI-5 | Urutkan ulang, duplikat, dan hapus soal. |
| KUI-6 | Validasi: pilihan ganda harus punya tepat satu kunci; isian minimal satu jawaban; kuis terbit minimal satu soal. |
| KUI-7 | **Pratinjau sebagai murid** tanpa menyimpan percobaan. |
| KUI-8 | Tombol **"Buat dari template Teks Rekon"** untuk tiga kuis awal (Lampiran B). |
| KUI-9 | Mengubah soal pada kuis yang sudah punya percobaan menampilkan peringatan; percobaan lama tidak dihitung ulang. |
| KUI-10 | Duplikat kuis. |

### 5.8 Portal Murid

| ID | Kebutuhan |
|---|---|
| PRT-1 | `/murid` (dashboard): nama, NISN, kelas; daftar materi sesuai tingkat kelas dengan penanda *selesai dibaca*; daftar kuis terbit dengan status (Belum dikerjakan / skor terbaik / Lulus). |
| PRT-2 | Halaman materi menampilkan tombol **"Tandai selesai dibaca"** dan daftar kuis untuk materi tersebut. Pengunjung non-login melihat ajakan "Masuk untuk mengerjakan kuis". |
| PRT-3 | **Mengerjakan kuis** (`/murid/kuis/:id`): satu soal per layar, penanda kemajuan, bisa kembali ke soal sebelumnya, peringatan jika ada soal belum dijawab, konfirmasi sebelum kirim, dan peringatan sebelum meninggalkan halaman. |
| PRT-4 | **Hasil** (`/murid/hasil/:percobaanId`): skor, jumlah benar/total, status Lulus/Belum lulus, dan tinjauan setiap soal (jawabanmu, kunci, pembahasan). |
| PRT-5 | **Riwayat** percobaan per kuis; skor terbaik ditandai. |
| PRT-6 | Murid dapat mengulang kuis selama belum melewati batas percobaan (dicek di client). |
| PRT-7 | Mobile-first. |
| PRT-8 | Murid hanya melihat data miliknya sendiri. |

### 5.9 Hasil & Progres (Guru)

| ID | Kebutuhan |
|---|---|
| HSL-1 | `/guru/kuis/:id/hasil`: tabel murid (nama, NISN, kelas, jumlah percobaan, skor terbaik, skor terakhir, waktu), filter kelas, dan daftar **murid yang belum mengerjakan**. |
| HSL-2 | Ringkasan: rata-rata, tertinggi, terendah, persentase lulus. |
| HSL-3 | **Analisis soal:** persentase murid yang menjawab benar tiap soal, soal tersulit ditandai, dan sebaran pilihan jawaban untuk pilihan ganda. |
| HSL-4 | Ekspor hasil ke CSV. |
| HSL-5 | Guru dapat menghapus percobaan murid (reset). |
| HSL-6 | `/guru/progres`: matriks kelas × materi (jumlah murid yang sudah menandai selesai dibaca). |

### 5.10 Halaman Publik

| ID | Kebutuhan |
|---|---|
| PUB-1 | Beranda `/`: nama sekolah, nama guru, mata pelajaran, daftar materi terbit, filter tingkat, dan tombol **Masuk Murid**. |
| PUB-2 | `/materi/:slug`: deskripsi, tujuan pembelajaran, bagian-bagian materi dengan daftar isi. |
| PUB-3 | Materi draft tidak dapat dibuka. |
| PUB-4 | Halaman publik tidak memuat data murid, kelas, maupun soal kuis. |

### 5.11 Dashboard Guru

| ID | Kebutuhan |
|---|---|
| DSB-1 | Ringkasan: jumlah kelas, murid, materi (terbit/draft), kuis. |
| DSB-2 | Lencana **permintaan aktivasi menunggu**. |
| DSB-3 | Aktivitas kuis terbaru (siapa mengerjakan apa, skor). |
| DSB-4 | Pintasan: tambah kelas, tambah murid, buat materi, buat kuis. |

## 6. Kebutuhan Non-Fungsional

- **Responsif:** nyaman di ponsel; portal murid mobile-first.
- **Bahasa UI:** Bahasa Indonesia; isi materi memadukan penjelasan Indonesia dan contoh Inggris.
- **Keamanan:** akses data dijaga Firestore Security Rules; murid hanya mengakses datanya sendiri; guru ditentukan oleh dokumen `guru/{uid}`.
- **Performa:** code splitting per rute; kuis dimuat dengan satu pembacaan dokumen; pagination pada tabel.
- **Kuota:** dirancang muat di paket gratis Firebase untuk satu sekolah.
- **Aksesibilitas:** kontras cukup, label jelas, navigasi keyboard (komponen Radix/shadcn).
- **Kode:** JavaScript + JSX, tanpa TypeScript.

## 7. Arsitektur & Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | React (JSX) dengan Vite |
| Routing | react-router-dom |
| UI | shadcn/ui (Button, Card, Input, Textarea, Select, RadioGroup, Checkbox, Switch, Dialog, AlertDialog, Table, Tabs, Badge, Progress, Sheet, Skeleton, Sonner/Toast, DropdownMenu, Form) + lucide-react |
| Styling | **Tailwind CSS via CDN** |
| Form & validasi | react-hook-form + zod |
| Markdown | react-markdown + remark-gfm |
| CSV | papaparse |
| Grafik sederhana (opsional) | recharts (analisis soal) |
| Backend | Firebase: Authentication (Email/Password untuk guru, **Google** untuk murid), Cloud Firestore |
| Hosting | Firebase Hosting (SPA rewrite) |

### 7.1 Catatan: shadcn/ui + Tailwind CDN

- Komponen shadcn **disalin manual** ke `src/components/ui/` bersama `cn()` (`clsx` + `tailwind-merge`), `class-variance-authority`, dan paket `@radix-ui/*`.
- **Tema** (CSS variables `--background`, `--primary`, dll.) didefinisikan di `index.html` dan dipetakan ke konfigurasi Tailwind CDN.
- **Animasi** bawaan shadcn (plugin `tailwindcss-animate`) tidak tersedia lewat CDN; tulis `@keyframes` sederhana secara manual.
- Tailwind CDN cocok untuk prototipe dan trafik kecil; jika perlu, beralih ke Tailwind terpasang lewat Vite tidak mengubah kode komponen.
- Kunci versi Tailwind CDN sejak awal agar konfigurasi tema konsisten.

### 7.2 Konfigurasi Firebase yang diperlukan

1. Aktifkan provider **Email/Password** (guru) dan **Google** (murid) di Authentication.
2. Tambahkan domain hosting ke **Authorized domains**.
3. Isi email dukungan proyek (diminta oleh provider Google).
4. Buat dokumen `guru/{uid}` dan `sekolah/utama` secara manual (atau lewat skrip seed sekali jalan).
5. Deploy `firestore.rules` dan `firestore.indexes.json`.
6. Uji login Google di ponsel (Android/iOS) dan di *in-app browser* yang umum dipakai murid.

### 7.3 Struktur Folder (usulan)

```
/
├─ index.html                      # Tailwind CDN + CSS variables tema + keyframes
├─ vite.config.js
├─ firebase.json
├─ firestore.rules
├─ firestore.indexes.json
├─ .env                            # VITE_FIREBASE_*
└─ src/
   ├─ main.jsx
   ├─ App.jsx
   ├─ lib/
   │  ├─ firebase.js               # init app, auth, db, googleProvider
   │  ├─ utils.js                  # cn()
   │  ├─ grading.js                # normalisasi jawaban + hitung skor
   │  └─ csv.js
   ├─ context/
   │  ├─ AuthContext.jsx           # user, peran (guru/murid/none), akunMurid
   │  └─ ...
   ├─ services/
   │  ├─ guru.js  kelas.js  murid.js  materi.js
   │  ├─ akunMurid.js  klaim.js
   │  ├─ kuis.js  percobaan.js  progres.js
   ├─ components/
   │  ├─ ui/                       # komponen shadcn
   │  ├─ layout/ (GuruLayout, MuridLayout, PublicLayout)
   │  ├─ guru/ (KelasForm, MuridForm, ImportCsvDialog, MateriForm, BagianEditor,
   │  │         KuisForm, SoalEditor, HasilTable, AnalisisSoal)
   │  ├─ murid/ (KuisRunner, SoalView, HasilReview, RiwayatList)
   │  └─ public/ (MateriCard, DaftarIsi, MarkdownView)
   ├─ pages/
   │  ├─ Beranda.jsx  MateriDetail.jsx  Masuk.jsx  Aktivasi.jsx
   │  ├─ murid/ (Dashboard, KuisKerjakan, Hasil, Riwayat)
   │  └─ guru/ (Login, Dashboard, Profil, Kelas, KelasDetail, Murid, Permintaan,
   │            MateriList, MateriEdit, KuisList, KuisEdit, KuisHasil, Progres)
   └─ data/
      ├─ templateMateriTeksRekon.js   # Lampiran A
      └─ templateKuisTeksRekon.js     # Lampiran B
```

### 7.4 Rute

| Rute | Akses | Halaman |
|---|---|---|
| `/` | Publik | Beranda + materi terbit |
| `/materi/:slug` | Publik | Detail materi (murid login melihat kuis & tombol selesai) |
| `/masuk` | Publik | Login murid (Google) |
| `/aktivasi` | Login Google | Status & permintaan aktivasi |
| `/murid` | Murid | Dashboard murid |
| `/murid/kuis/:id` | Murid | Mengerjakan kuis |
| `/murid/hasil/:percobaanId` | Murid | Hasil & pembahasan |
| `/murid/riwayat` | Murid | Riwayat percobaan |
| `/guru/login` | Publik | Login guru |
| `/guru` | Guru | Dashboard |
| `/guru/profil` | Guru | Profil |
| `/guru/kelas`, `/guru/kelas/:id` | Guru | Kelas |
| `/guru/murid` | Guru | Data murid |
| `/guru/permintaan` | Guru | Permintaan aktivasi |
| `/guru/materi`, `/baru`, `/:id/edit` | Guru | Materi |
| `/guru/kuis`, `/baru`, `/:id/edit` | Guru | Kuis |
| `/guru/kuis/:id/hasil` | Guru | Hasil & analisis soal |
| `/guru/progres` | Guru | Progres baca |

## 8. Model Data (Cloud Firestore)

| Koleksi / Dokumen | Field |
|---|---|
| `sekolah/utama` | `nama` ("SMPN 3 Ketapang"), `alamat` |
| `guru/{uid}` | `nama` ("Ernawaty"), `nip`, `mapel` ("Bahasa Inggris"), `noHp`, `bio`, `fotoUrl`, `email`, `updatedAt` |
| `kelas/{kelasId}` | `nama`, `tingkat` (7/8/9), `tahunAjaran`, `keterangan`, `createdAt`, `updatedAt` |
| `murid/{nisn}` | `nisn` (string 10 digit = ID dokumen), `nama`, `kelasId`, `email` (opsional, huruf kecil), `createdAt`, `updatedAt` |
| `akunMurid/{uid}` | `nisn`, `email`, `aktivasiVia` (`"email"` \| `"persetujuan"`), `createdAt` |
| `klaim/{uid}` | `nisn`, `nama`, `email`, `status` (`"menunggu"` \| `"ditolak"`), `catatan`, `createdAt` |
| `materi/{materiId}` | `judul`, `slug`, `topik`, `mapel`, `fase` ("D"), `deskripsi`, `tujuan[]`, `tingkat[]`, `urutan`, `status`, `bagian[]`, `createdAt`, `updatedAt` |
| `kuis/{kuisId}` | `materiId`, `judul`, `deskripsi`, `tingkat[]`, `nilaiLulus`, `acakSoal`, `acakOpsi`, `maksPercobaan` (angka atau `null`), `status`, `jumlahSoal`, `soal[]`, `createdAt`, `updatedAt` |
| `percobaan/{id}` | `kuisId`, `materiId`, `uid`, `nisn`, `kelasId` (snapshot), `skor` (0–100), `benar`, `total`, `lulus`, `jawaban[]`, `mulaiAt`, `selesaiAt`, `durasiDetik` |
| `progres/{uid}_{materiId}` | `uid`, `nisn`, `materiId`, `selesai`, `updatedAt` |

**Objek `materi.bagian[]`:**

```js
{ id: "b1", judul: "Struktur Teks Rekon", jenis: "struktur", urutan: 2, konten: "## ... (Markdown)" }
```

**Objek `kuis.soal[]`:**

```js
// pilihan ganda
{ id: "s1", tipe: "pilihan_ganda", pertanyaan: "...", opsi: [{ id: "a", teks: "..." }, ...], kunci: "b", pembahasan: "..." }
// benar/salah
{ id: "s2", tipe: "benar_salah", pertanyaan: "...", kunci: true, pembahasan: "..." }
// isian singkat
{ id: "s3", tipe: "isian", pertanyaan: "...", kunci: ["went"], pembahasan: "..." }
```

**Objek `percobaan.jawaban[]`:**

```js
{ soalId: "s1", jawaban: "b", benar: true }
```

**Catatan model:**
- NISN disimpan sebagai **string** agar angka nol di depan tidak hilang.
- Soal disimpan sebagai array di dokumen kuis (satu pembacaan per kuis; batas dokumen 1 MB lebih dari cukup).
- `percobaan.kelasId` adalah *snapshot* saat mengerjakan agar rekap per kelas tetap konsisten bila murid pindah kelas.
- `kuis.tingkat` disalin dari materi saat disimpan, agar murid dapat menyaring kuis tanpa membaca dokumen materi.
- **Composite index** yang dibutuhkan (didaftarkan di `firestore.indexes.json`): `murid` (`kelasId` + `nama`), `percobaan` (`kuisId` + `selesaiAt` desc), `percobaan` (`uid` + `kuisId`), `kuis` (`status` + `tingkat` array-contains), `materi` (`status` + `tingkat` array-contains + `urutan`).

## 9. Firestore Security Rules (usulan)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() { return request.auth != null; }

    function isGuru() {
      return signedIn() &&
        exists(/databases/$(database)/documents/guru/$(request.auth.uid));
    }

    function isGoogle() {
      return signedIn() && request.auth.token.firebase.sign_in_provider == 'google.com';
    }

    function isMurid() {
      return isGoogle() &&
        exists(/databases/$(database)/documents/akunMurid/$(request.auth.uid));
    }

    function akun() {
      return get(/databases/$(database)/documents/akunMurid/$(request.auth.uid)).data;
    }

    match /guru/{uid} {
      allow read, update: if signedIn() && request.auth.uid == uid;
      allow create, delete: if false;            // dibuat manual lewat Console
    }

    match /sekolah/{id} {
      allow read: if true;
      allow write: if isGuru();
    }

    match /kelas/{id} {
      allow read, write: if isGuru();
      allow get: if isMurid() &&
        get(/databases/$(database)/documents/murid/$(akun().nisn)).data.kelasId == id;
    }

    match /murid/{nisn} {
      allow read, write: if isGuru();
      allow get: if isMurid() && akun().nisn == nisn;
      // pencarian data sendiri berdasarkan email (untuk aktivasi otomatis)
      allow get, list: if isGoogle() &&
        request.auth.token.email_verified == true &&
        resource.data.email == request.auth.token.email;
    }

    match /akunMurid/{uid} {
      allow read: if isGuru() || (signedIn() && request.auth.uid == uid);
      allow create: if isGuru() ||
        (isGoogle() && request.auth.uid == uid &&
         request.auth.token.email_verified == true &&
         get(/databases/$(database)/documents/murid/$(request.resource.data.nisn))
           .data.email == request.auth.token.email);
      allow update, delete: if isGuru();
    }

    match /klaim/{uid} {
      allow create: if isGoogle() && request.auth.uid == uid &&
        request.resource.data.keys().hasOnly(['nisn','nama','email','status','createdAt']) &&
        request.resource.data.status == 'menunggu' &&
        request.resource.data.nisn.matches('^[0-9]{10}$');
      allow read: if isGuru() || (signedIn() && request.auth.uid == uid);
      allow update, delete: if isGuru();
    }

    match /materi/{id} {
      allow read: if resource.data.status == 'terbit' || isGuru();
      allow write: if isGuru();
    }

    match /kuis/{id} {
      allow read: if isGuru() || (isMurid() && resource.data.status == 'terbit');
      allow write: if isGuru();
    }

    match /percobaan/{id} {
      allow create: if isMurid() &&
        request.resource.data.uid == request.auth.uid &&
        request.resource.data.nisn == akun().nisn &&
        request.resource.data.skor is number &&
        request.resource.data.skor >= 0 && request.resource.data.skor <= 100;
      allow read: if isGuru() || (isMurid() && resource.data.uid == request.auth.uid);
      allow update, delete: if isGuru();
    }

    match /progres/{id} {
      allow read: if isGuru() || (isMurid() && resource.data.uid == request.auth.uid);
      allow create, update: if isMurid() &&
        request.resource.data.uid == request.auth.uid &&
        request.resource.data.nisn == akun().nisn &&
        id == request.auth.uid + '_' + request.resource.data.materiId;
      allow delete: if isGuru();
    }
  }
}
```

**Catatan penting:**
- Security Rules bukan filter. Query murid harus memuat kondisi yang sama dengan rules: `where("uid","==",uid)` untuk `percobaan`/`progres`, `where("status","==","terbit")` untuk `materi` dan `kuis`, dan `where("email","==",emailSendiri)` untuk pencarian data murid.
- Pengecekan `sign_in_provider == 'google.com'` mencegah akun email/password sembarang (yang bisa dibuat siapa pun) memakai jalur murid.
- Aturan di atas adalah titik awal; uji dengan **Rules Playground/emulator** sebelum rilis.

## 10. Alur Utama

**Aktivasi murid (jalur A, otomatis)**
1. Guru mengisi email Google murid di Data Murid (manual atau impor CSV).
2. Murid membuka `/masuk` → Masuk dengan Google.
3. Aplikasi mencari data murid dengan email yang sama → membuat `akunMurid` → murid masuk ke `/murid`.

**Aktivasi murid (jalur B, permintaan)**
1. Murid login Google; email belum terdaftar → diarahkan ke `/aktivasi`.
2. Murid mengisi NISN dan nama → permintaan *menunggu*.
3. Guru membuka `/guru/permintaan`, memeriksa kecocokan, lalu **Setujui** → murid otomatis masuk ke portalnya pada kunjungan berikutnya.

**Belajar dan berlatih**
1. Murid membuka materi sesuai tingkatnya, membaca bagian Struktur dan Kebahasaan, lalu menekan **Tandai selesai dibaca**.
2. Murid membuka kuis materi tersebut, menjawab, lalu mengirim.
3. Murid melihat skor dan pembahasan; bila belum lulus dapat mengulang (sesuai batas percobaan).

**Guru menyiapkan konten**
1. Guru menekan **Buat dari template Teks Rekon** pada Materi dan Kuis; menyunting seperlunya.
2. Mengatur tingkat sasaran, status **Terbit**, nilai lulus, dan batas percobaan.
3. Membagikan link aplikasi ke murid (mis. lewat grup kelas).

**Guru memantau**
1. Buka hasil kuis → lihat rata-rata, murid yang belum mengerjakan, dan soal tersulit.
2. Gunakan analisis soal untuk memutuskan bagian materi yang perlu diulang di kelas.

## 11. Keterbatasan Penilaian Kuis (Penting)

Karena tidak ada server, **penilaian dilakukan di browser murid** dan kunci jawaban ikut terkirim bersama dokumen kuis. Konsekuensinya:

- Murid yang paham teknis dapat melihat kunci jawaban atau memanipulasi skor yang tersimpan.
- Karena itu kuis di MVP diposisikan sebagai **latihan formatif** (umpan balik cepat + pembahasan), **bukan nilai resmi/rapor**. Tampilkan label "Kuis latihan" pada UI murid dan catatan yang sama pada halaman hasil guru.
- Batas percobaan dan validasi skor hanya berlaku di sisi client (rules hanya membatasi rentang skor 0–100).
- Jika nanti skor perlu dipakai sebagai nilai resmi, penilaian harus dipindah ke server (Cloud Functions yang menyimpan kunci di koleksi yang hanya bisa dibaca guru). Fitur ini masuk roadmap dan membutuhkan paket Firebase yang mendukung Cloud Functions.

**Aturan penilaian (`lib/grading.js`):**
- Pilihan ganda dan benar/salah: benar jika jawaban sama dengan `kunci`.
- Isian singkat: jawaban dinormalisasi (*trim*, huruf kecil, spasi ganda dirapikan, titik di akhir dibuang) lalu dibandingkan dengan setiap jawaban yang diterima.
- `skor = round(benar / total × 100)`; `lulus = skor >= nilaiLulus`.

## 12. Acceptance Criteria (MVP)

- [ ] Guru dapat login/logout; `/guru/*` tidak dapat diakses tanpa dokumen `guru/{uid}`.
- [ ] Murid dapat login dengan Google; akun tanpa tautan murid tidak dapat membaca kuis, percobaan, maupun data murid lain.
- [ ] Aktivasi otomatis (email cocok) dan aktivasi lewat permintaan + persetujuan guru keduanya berfungsi.
- [ ] Akun email/password non-guru tidak dapat membuat permintaan aktivasi maupun tautan murid.
- [ ] Guru dapat mengelola profil, kelas, dan murid (NISN 10 digit unik; impor/ekspor CSV).
- [ ] Guru dapat membuat materi Markdown dan menerbitkannya; template Teks Rekon (3 materi) tersedia.
- [ ] Guru dapat membuat kuis dengan soal pilihan ganda, benar/salah, dan isian singkat, lengkap dengan pembahasan; template 3 kuis tersedia.
- [ ] Murid melihat hanya materi dan kuis terbit sesuai tingkat kelasnya.
- [ ] Murid dapat mengerjakan kuis, melihat skor, status lulus, dan pembahasan; percobaan tersimpan.
- [ ] Batas percobaan (jika diatur) dan pengacakan soal/opsi berfungsi.
- [ ] Murid hanya dapat membaca percobaan dan progres miliknya sendiri.
- [ ] Guru melihat hasil per kuis (tabel, ringkasan, murid belum mengerjakan, analisis soal) dan dapat mengekspor CSV.
- [ ] Guru melihat progres baca per kelas.
- [ ] Label "Kuis latihan" tampil dan keterbatasan penilaian didokumentasikan.
- [ ] Tampilan nyaman di ponsel; login Google diuji di Android dan iOS.
- [ ] Aplikasi ter-deploy di Firebase Hosting dan rute SPA berfungsi saat di-refresh.

## 13. Environment Variables

```bash
# .env (konfigurasi web Firebase bersifat publik; keamanan dijaga oleh Security Rules)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
```

## 14. Roadmap Setelah MVP

1. **Penilaian server-side** (Cloud Functions) agar kunci jawaban tersembunyi dan skor dapat dipakai sebagai nilai resmi.
2. Tipe soal tambahan: **urutkan kalimat/paragraf** (sangat cocok untuk teks rekon), mencocokkan, dan esai pendek dengan rubrik.
3. Timer kuis dan jadwal buka/tutup kuis.
4. Bank soal dan pengacakan soal dari bank.
5. Tugas menulis teks rekon (kirim teks, guru memberi skor rubrik dan komentar).
6. Materi lain Fase D (*narrative*, *procedure*, *descriptive*, *invitation*, dll.).
7. Upload gambar/PDF (Firebase Storage; periksa ketentuan paket yang berlaku).
8. Notifikasi pengingat dan rekap nilai ke CSV/rapor.

## 15. Pertanyaan Terbuka

1. **"Tek rekon" diasumsikan *Recount Text* (Bahasa Inggris).** Apakah benar? (Jika yang dimaksud Bahasa Indonesia, Lampiran A dan B perlu diganti.)
2. Murid akan memakai **akun Google pribadi atau akun belajar.id/domain sekolah**? Ini memengaruhi apakah guru dapat mengisi email di muka (jalur A) atau lebih banyak memakai persetujuan manual (jalur B).
3. Apakah **skor kuis akan dijadikan nilai resmi**? Jika ya, penilaian server-side perlu masuk MVP.
4. Kelas/tingkat apa yang diampu (VII, VIII, IX) dan buku ajar apa yang dipakai? Materi dapat disesuaikan dengan Alur Tujuan Pembelajaran (ATP) sekolah.
5. Nilai lulus (KKM) dan batas percobaan default yang diinginkan.
6. Apakah materi tetap boleh dibaca publik (tanpa login) seperti di MVP, atau wajib login?

---

## Lampiran A — Template Materi Teks Rekon

Teks di bawah ini adalah **konten asli yang ditulis untuk LMS ini** (bukan salinan dari buku/situs) dan disimpan di `src/data/templateMateriTeksRekon.js`. Isinya dapat disunting guru. Tombol "Buat dari template" membuat tiga materi berstatus **Draft**.

### Materi 1 — Teks Rekon: Pengertian, Jenis, dan Struktur

| Field | Isi |
|---|---|
| Slug | `teks-rekon-struktur` |
| Topik / Mapel / Fase | *Recount Text* / Bahasa Inggris / D |
| Tingkat sasaran | VII, VIII, IX (dapat disesuaikan) |
| Deskripsi | Mengenal tujuan, jenis, dan struktur teks rekon untuk menceritakan kembali pengalaman di masa lampau. |
| Tujuan pembelajaran | (1) Menjelaskan tujuan komunikasi teks rekon. (2) Membedakan *personal*, *factual*, dan *imaginative recount*. (3) Mengidentifikasi *orientation*, *events*, dan *re-orientation* pada sebuah teks. (4) Menyusun peristiwa secara kronologis. |

**Bagian 1 — Pengantar** (`pengantar`)

```markdown
## Apa itu Teks Rekon?

Teks rekon (*recount text*) adalah teks yang **menceritakan kembali** kejadian atau
pengalaman di masa lampau. Peristiwanya sudah terjadi, dan diceritakan **berurutan
sesuai waktu kejadiannya**.

**Tujuan komunikasi:** *to inform* (memberi tahu pembaca) dan/atau *to entertain*
(menghibur pembaca).

Contoh situasi: menceritakan liburan akhir pekan, upacara 17 Agustus di sekolah,
atau kegiatan kerja bakti di lingkungan rumah.

## Jenis Teks Rekon

| Jenis | Ciri | Contoh |
|---|---|---|
| *Personal recount* | Pengalaman pribadi penulis; memakai kata ganti **I / we**. | Liburan keluarga, hari pertama sekolah |
| *Factual recount* | Melaporkan peristiwa nyata secara faktual; biasanya memakai **he / she / they**. | Laporan kegiatan sekolah, berita, catatan sejarah |
| *Imaginative recount* | Peristiwa rekaan; penulis berperan sebagai tokoh lain. | Sehari menjadi astronaut |

## Beda dengan Teks Naratif

| | Teks rekon | Teks naratif |
|---|---|---|
| Isi | Mengisahkan kejadian sesuai urutan waktu | Mengisahkan cerita dengan konflik |
| Bagian khas | *Orientation – Events – Re-orientation* | *Orientation – Complication – Resolution* |
| Tujuan | Memberi tahu / menghibur | Menghibur |
```

**Bagian 2 — Struktur Teks Rekon** (`struktur`)

```markdown
## Tiga Bagian Teks Rekon

| Bagian | Fungsi | Pertanyaan pemandu |
|---|---|---|
| **Orientation** (orientasi) | Memperkenalkan latar: tokoh, tempat, dan waktu. | *Who? Where? When? What?* |
| **Events** (rangkaian peristiwa) | Menceritakan kejadian **secara kronologis**. | *What happened first? Then? After that?* |
| **Re-orientation** (penutup) | Menutup cerita dengan kesimpulan atau kesan penulis. **Bersifat opsional.** | *How did it end? How did you feel?* |

**Ingat:** *orientation* dan *events* sebaiknya selalu ada, sedangkan *re-orientation*
boleh tidak ada. Sebagian buku menyebut bagian penutup sebagai *personal comment*
atau *conclusion*.

## Tips Mengenali Bagian-Bagiannya

1. Kalimat pembuka yang memuat **siapa, kapan, dan di mana** → *orientation*.
2. Kalimat yang diawali kata urutan seperti *first, then, after that* → *events*.
3. Kalimat penutup yang berisi **perasaan atau kesan** → *re-orientation*.
```

**Bagian 3 — Contoh Teks 1: Personal Recount** (`contoh`)

```markdown
> **Our 17th of August at School**
>
> *(Orientation)* On 17 August, my friends and I joined the Independence Day ceremony
> at our school in Ketapang. We arrived at the field at half past six in the morning.
>
> *(Events)* First, the ceremony began with the flag raising. I stood in the third row
> and sang the national anthem proudly. After that, our headmaster gave a short speech
> about the heroes of our country. When the ceremony finished, we played traditional
> games such as sack races and tug of war. My team won the tug of war, so we got a
> small trophy. Finally, we cleaned the field together.
>
> *(Re-orientation)* We went home at noon. I was tired, but I was very proud. It was a
> meaningful day for all of us.

### Analisis Struktur

| Bagian | Isi pada teks |
|---|---|
| Orientation | Siapa: *my friends and I*; kapan: *On 17 August*, *half past six*; di mana: *our school in Ketapang* |
| Events | Upacara → pidato → permainan tradisional → membersihkan lapangan |
| Re-orientation | Kesan: *I was tired, but I was very proud.* |

**Jenis teks:** *personal recount* (memakai **I** dan **we**).
```

**Bagian 4 — Contoh Teks 2: Akhir Pekan di Pantai** (`contoh`)

```markdown
> **A Weekend at Pulau Datok Beach**
>
> *(Orientation)* Last Sunday, my family and I went to Pulau Datok Beach in Ketapang.
> We left home at seven o'clock in the morning.
>
> *(Events)* First, we went there by car. When we arrived, we took some pictures at
> the entrance. Then, my brother and I played football on the sand while my parents
> sat under a tree. After that, we ate fried rice and drank coconut water. Finally,
> we collected small shells near the shore.
>
> *(Re-orientation)* We went home at four o'clock in the afternoon. I was tired, but
> I was very happy. It was a wonderful weekend.

### Coba Sendiri

1. Tuliskan siapa, kapan, dan di mana kegiatan itu terjadi (*orientation*).
2. Sebutkan urutan kegiatan dengan kata *first, then, after that, finally* (*events*).
3. Apa kesan penulis di akhir cerita? (*re-orientation*)
```

**Bagian 5 — Rangkuman** (`rangkuman`)

```markdown
## Rangkuman

- Teks rekon menceritakan kembali **pengalaman masa lampau** secara **berurutan**.
- Jenisnya: **personal**, **factual**, dan **imaginative** recount.
- Struktur: **Orientation → Events → Re-orientation (opsional)**.
- Kunci mengenali bagian teks: *siapa-kapan-di mana* (orientation), *kata urutan*
  (events), *kesan/perasaan* (re-orientation).

Siap menguji pemahamanmu? Kerjakan **Kuis 1: Struktur Teks Rekon**.
```

### Materi 2 — Unsur Kebahasaan Teks Rekon

| Field | Isi |
|---|---|
| Slug | `teks-rekon-kebahasaan` |
| Topik / Mapel / Fase | *Recount Text* / Bahasa Inggris / D |
| Deskripsi | Mempelajari *simple past tense*, kata penghubung waktu, kata kerja aksi, serta keterangan waktu dan tempat dalam teks rekon. |
| Tujuan pembelajaran | (1) Membentuk kalimat *simple past* (positif, negatif, tanya). (2) Memakai kata penghubung waktu untuk menyusun peristiwa. (3) Mengenali kata kerja aksi serta keterangan waktu, tempat, dan cara. (4) Memilih kata ganti yang tepat sesuai jenis teks rekon. |

**Bagian 1 — Simple Past Tense** (`kebahasaan`)

```markdown
## Mengapa Simple Past Tense?

Teks rekon menceritakan kejadian yang **sudah selesai**, jadi kata kerjanya memakai
**simple past tense**.

## Rumus

| Jenis kalimat | Pola | Contoh |
|---|---|---|
| Positif (kata kerja) | Subject + **V2** | We **visited** the museum. |
| Positif (to be) | Subject + **was / were** | I **was** tired. They **were** happy. |
| Negatif (kata kerja) | Subject + **did not** + V1 | We **did not visit** the museum. |
| Negatif (to be) | Subject + **was/were not** | She **was not** at home. |
| Tanya (kata kerja) | **Did** + Subject + V1? | **Did** you **visit** the museum? |
| Tanya (to be) | **Was/Were** + Subject? | **Were** they happy? |

**To be:** *I / he / she / it* → **was**; *you / we / they* → **were**.

> Setelah **did / did not**, kata kerja kembali ke bentuk dasar (V1):
> *I did not **go*** (bukan ~~went~~).

## Kata Kerja Beraturan (Regular Verbs)

Tambahkan **-ed**, dengan aturan ejaan berikut:

| Aturan | Contoh |
|---|---|
| Umumnya + **-ed** | play → played, visit → visited, walk → walked |
| Berakhiran **-e** → + **-d** | arrive → arrived, like → liked |
| Konsonan + **y** → **-ied** | study → studied, carry → carried |
| Satu suku kata, pola konsonan–vokal–konsonan → gandakan konsonan akhir | stop → stopped, plan → planned |

*Tahukah kamu?* Akhiran **-ed** dibaca **/t/** (walked), **/d/** (played), atau
**/ɪd/** (visited, needed).

## Kata Kerja Tidak Beraturan (Irregular Verbs)

| V1 | V2 | V1 | V2 |
|---|---|---|---|
| go | went | eat | ate |
| take | took | drink | drank |
| see | saw | sit | sat |
| come | came | leave | left |
| buy | bought | make | made |
| meet | met | win | won |
| have | had | write | wrote |
| give | gave | swim | swam |
```

**Bagian 2 — Kata Penghubung Waktu** (`kebahasaan`)

```markdown
## Time Connectives (Kata Penghubung Waktu)

Kata penghubung waktu membuat urutan peristiwa **jelas dan runtut**.

| Fungsi | Kata | Contoh |
|---|---|---|
| Memulai | first, firstly, at first | **First**, we went there by car. |
| Melanjutkan | then, next, after that, afterwards, later | **After that**, we ate fried rice. |
| Mengakhiri | finally, at last, in the end | **Finally**, we went home. |
| Menghubungkan dua kejadian | when, while, before, after, until | We took pictures **when** we arrived. |

## Cara Memakainya

- Di awal kalimat, tambahkan **koma**: *First, we …*, *Then, we …*, *After that, we …*
- **when / before / after** boleh di depan atau di tengah kalimat:
  - **When** we arrived, we took some pictures.
  - We took some pictures **when** we arrived.
- **while** dipakai untuk dua kegiatan yang berlangsung bersamaan:
  *My brother played football **while** my parents sat under a tree.*
```

**Bagian 3 — Kata Kerja Aksi, Keterangan, dan Kata Ganti** (`kebahasaan`)

```markdown
## Kata Kerja Aksi (Action Verbs)

Menyatakan kegiatan yang dilakukan: *played, visited, collected, cleaned, arrived*.

## Keterangan Waktu, Tempat, dan Cara

| Jenis | Fungsi | Contoh |
|---|---|---|
| Waktu (*time*) | Kapan? | last Sunday, yesterday, at seven o'clock, in the afternoon |
| Tempat (*place*) | Di mana? | in Ketapang, at the entrance, on the sand, near the shore |
| Cara (*manner*) | Bagaimana? | proudly, happily, quickly, carefully |

## Kata Ganti Orang

| Jenis teks | Kata ganti umum |
|---|---|
| *Personal recount* | **I, we, my** |
| *Factual recount* | **he, she, they, the students** |

## Kata Sambung Lain

*and* (dan), *but* (tetapi), *so* (jadi), *because* (karena):
*I was tired, **but** I was very happy.*
```

**Bagian 4 — Contoh Teks dengan Kebahasaan Ditandai** (`contoh`)

```markdown
**Petunjuk:** kata kerja *simple past* dicetak **tebal**; kata penghubung waktu
dicetak _miring_.

> Last Sunday, my family and I **went** to Pulau Datok Beach in Ketapang. We **left**
> home at seven o'clock in the morning. _First_, we **went** there by car. _When_ we
> **arrived**, we **took** some pictures at the entrance. _Then_, my brother and I
> **played** football on the sand _while_ my parents **sat** under a tree. _After that_,
> we **ate** fried rice and **drank** coconut water. _Finally_, we **collected** small
> shells near the shore. We **went** home at four o'clock in the afternoon. I **was**
> tired, but I **was** very happy.

| Unsur | Temuan |
|---|---|
| Waktu | *Last Sunday, at seven o'clock in the morning, at four o'clock in the afternoon* |
| Tempat | *in Ketapang, at the entrance, on the sand, under a tree, near the shore* |
| Kata penghubung waktu | *First, When, Then, while, After that, Finally* |
| Kata ganti | *my family and I, we, my brother and I, my parents* |
```

**Bagian 5 — Rangkuman** (`rangkuman`)

```markdown
## Rangkuman

- Kata kerja memakai **simple past** (V2, **was/were**, **did not + V1**, **Did + V1**).
- **Time connectives** (*first, then, after that, finally, when, while …*) menyusun urutan.
- Gunakan **kata kerja aksi** serta **keterangan waktu, tempat, dan cara**.
- *Personal recount* memakai **I/we**; *factual recount* memakai **he/she/they**.

Kerjakan **Kuis 2: Kebahasaan Teks Rekon** untuk berlatih.
```

### Materi 3 — Menulis Teks Rekon (Pengayaan)

| Field | Isi |
|---|---|
| Slug | `teks-rekon-menulis` |
| Deskripsi | Langkah menulis teks rekon pribadi dan mengenal *factual recount*. |
| Tujuan pembelajaran | (1) Merencanakan teks rekon dengan peta kejadian. (2) Menulis teks rekon pribadi sederhana dengan struktur dan kebahasaan yang tepat. (3) Memeriksa dan memperbaiki tulisan dengan daftar periksa. (4) Mengenali ciri *factual recount*. |

**Bagian 1 — Langkah Menulis** (`pengantar`)

```markdown
## Lima Langkah Menulis Teks Rekon

1. **Pilih pengalaman.** Contoh: kegiatan 17 Agustus, liburan, atau kerja bakti.
2. **Buat peta kejadian.** Jawab *who, when, where, what happened*, lalu urutkan
   kejadiannya.
3. **Tulis draf.** Orientation → Events → Re-orientation.
4. **Periksa dan perbaiki** memakai daftar periksa di bawah.
5. **Tulis versi akhir** dan bagikan.

## Contoh Peta Kejadian

| Urutan | Kegiatan | Kata penghubung |
|---|---|---|
| 1 | Berangkat ke pantai | First |
| 2 | Bermain bola | Then |
| 3 | Makan siang | After that |
| 4 | Mengumpulkan kerang | Finally |
```

**Bagian 2 — Daftar Periksa** (`latihan`)

```markdown
## Daftar Periksa

- [ ] Orientation memuat siapa, kapan, dan di mana.
- [ ] Peristiwa tersusun sesuai urutan waktu.
- [ ] Memakai kata penghubung waktu (*first, then, after that, finally*).
- [ ] Kata kerja memakai *simple past* (V2 / *was–were*).
- [ ] Ada keterangan waktu dan tempat.
- [ ] Re-orientation berisi kesan atau perasaan (jika dipakai).
- [ ] Ejaan dan tanda baca sudah diperiksa.
```

**Bagian 3 — Mengenal Factual Recount** (`contoh`)

```markdown
## Factual Recount

*Factual recount* melaporkan peristiwa nyata secara **objektif**. Penulis biasanya
tidak memakai "I", melainkan **he / she / they** atau nama pelaku.

> *(Contoh fiktif untuk latihan)*
>
> **A Clean-Up Activity at School**
>
> On Saturday morning, the students of Class 8B held a clean-up activity at their
> school in Ketapang. First, they gathered in the school yard at seven o'clock. Then,
> they collected plastic waste and put it into separate bins. After that, they swept
> the classrooms and planted flowers near the fence. Finally, the teacher thanked the
> students, and the activity ended at noon.

| | Personal recount | Factual recount |
|---|---|---|
| Kata ganti | I, we | he, she, they, nama pelaku |
| Isi | Pengalaman dan perasaan pribadi | Fakta kejadian |
| Contoh | Cerita liburanku | Laporan kegiatan sekolah |
```

**Bagian 4 — Tugas Menulis dan Rubrik** (`latihan`)

```markdown
## Tugas

Tulis teks rekon pribadi sepanjang **80–100 kata** tentang *akhir pekan terakhirmu*
atau *kegiatan 17 Agustus di sekolahmu*. Gunakan struktur dan kebahasaan yang sudah
kamu pelajari.

## Rubrik (untuk penilaian guru atau teman)

| Aspek | 4 (Sangat baik) | 3 (Baik) | 2 (Cukup) | 1 (Perlu bimbingan) |
|---|---|---|---|---|
| Struktur | Orientation, events, dan re-orientation lengkap | Lengkap, sedikit kurang jelas | Salah satu bagian hilang | Tidak terstruktur |
| Urutan | Kronologis dan jelas | Hampir seluruhnya runtut | Beberapa urutan tertukar | Tidak runtut |
| Kebahasaan | Past tense dan penghubung waktu tepat | Sedikit kesalahan | Banyak kesalahan | Hampir tidak sesuai |
| Ejaan & tanda baca | Hampir tanpa kesalahan | Sedikit kesalahan | Cukup banyak kesalahan | Mengganggu pemahaman |
```

**Bagian 5 — Rangkuman** (`rangkuman`)

```markdown
## Rangkuman

- Rencanakan dulu dengan **peta kejadian**, baru tulis draf.
- Pastikan struktur **Orientation → Events → Re-orientation** dan urutan **kronologis**.
- Periksa **simple past**, **time connectives**, serta keterangan waktu dan tempat.
- *Factual recount* melaporkan fakta dengan **he/she/they**.

Kerjakan **Kuis 3: Menulis dan Jenis Teks Rekon**.
```

---

## Lampiran B — Template Kuis Teks Rekon

Soal berikut **ditulis asli untuk LMS ini** dan disimpan di `src/data/templateKuisTeksRekon.js`. Pengaturan bawaan: nilai lulus **70**, acak soal **aktif**, acak opsi **aktif**, batas percobaan **tidak terbatas**, status **Draft**. Tombol "Buat dari template" membuat tiga kuis yang terhubung ke tiga materi pada Lampiran A.

### Kuis 1 — Struktur Teks Rekon (terhubung ke Materi 1, 10 soal)

**1. (Pilihan ganda)** What is the main purpose of a recount text?
A. To persuade readers to do something
B. To retell past events or experiences
C. To explain how to make something
D. To describe how something works
**Kunci: B.** Teks rekon menceritakan kembali kejadian di masa lampau untuk memberi tahu atau menghibur.

**2. (Pilihan ganda)** What is the correct order of the generic structure of a recount text?
A. Events – Orientation – Re-orientation
B. Orientation – Events – Re-orientation
C. Re-orientation – Orientation – Events
D. Orientation – Re-orientation – Events
**Kunci: B.** Urutannya: orientation (latar), events (peristiwa), lalu re-orientation (penutup).

**3. (Benar/Salah)** The re-orientation is an optional part of a recount text.
**Kunci: Benar.** Re-orientation boleh tidak ada, tetapi orientation dan events sebaiknya selalu ada.

**4. (Pilihan ganda)** What information is usually given in the orientation?
A. Who, where, and when the event happened
B. The most exciting event only
C. The steps of a process
D. The writer's request to the reader
**Kunci: A.** Orientation memperkenalkan tokoh, tempat, dan waktu.

**5. (Pilihan ganda)** Read the sentences: *"Last Saturday, my cousins and I went to the river near our village. We went there at nine o'clock."* This part is the ___.
A. orientation
B. events
C. re-orientation
D. title
**Kunci: A.** Kalimat tersebut memuat siapa, kapan, dan di mana, sehingga termasuk orientation.

**6. (Pilihan ganda)** *"After that, we cooked noodles and ate them together."* This sentence belongs to the ___.
A. orientation
B. events
C. re-orientation
D. title
**Kunci: B.** Kata urutan *After that* dan kegiatan yang dilakukan menandakan bagian events.

**7. (Pilihan ganda)** *"It was a tiring day, but I enjoyed every minute of it."* This sentence is most likely the ___.
A. orientation
B. events
C. re-orientation
D. opening title
**Kunci: C.** Kalimat berisi kesan penulis di akhir cerita, yaitu re-orientation.

**8. (Pilihan ganda)** A text tells about the writer's own holiday and uses "I" and "we". What kind of recount is it?
A. personal recount
B. factual recount
C. imaginative recount
D. procedure text
**Kunci: A.** Pengalaman pribadi dengan sudut pandang orang pertama adalah personal recount.

**9. (Pilihan ganda)** Which one is an example of a factual recount?
A. A story about being an astronaut for a day
B. A report about a school clean-up activity that really happened
C. My own holiday story told with "I"
D. The steps to make a cup of tea
**Kunci: B.** Factual recount melaporkan peristiwa nyata secara objektif.

**10. (Isian singkat)** The events in a recount text are arranged in ______ order (based on time). *(satu kata Inggris)*
**Jawaban diterima:** `chronological`. Peristiwa disusun kronologis, yaitu sesuai urutan waktu.

### Kuis 2 — Kebahasaan Teks Rekon (terhubung ke Materi 2, 10 soal)

**1. (Pilihan ganda)** Which tense is mostly used in a recount text?
A. Simple present
B. Simple past
C. Simple future
D. Present continuous
**Kunci: B.** Kejadian sudah selesai, sehingga memakai simple past tense.

**2. (Pilihan ganda)** Choose the correct sentence.
A. We visit the museum yesterday.
B. We visited the museum yesterday.
C. We visiting the museum yesterday.
D. We will visited the museum yesterday.
**Kunci: B.** Kejadian *yesterday* memakai V2 (*visited*).

**3. (Isian singkat)** Write the past form of the verb "go": ______
**Jawaban diterima:** `went`. *Go* adalah kata kerja tidak beraturan: go → went.

**4. (Isian singkat)** Write the past form of the verb "study": ______
**Jawaban diterima:** `studied`. Konsonan + y berubah menjadi -ied.

**5. (Pilihan ganda)** My brother and I ___ football on the field last Sunday.
A. play
B. plays
C. played
D. playing
**Kunci: C.** *Last Sunday* menunjukkan masa lampau, sehingga dipakai V2 (*played*).

**6. (Pilihan ganda)** Which words are time connectives?
A. happy, tired, hungry
B. first, then, finally
C. teacher, doctor, driver
D. under, behind, between
**Kunci: B.** *First, then, finally* menandai urutan waktu.

**7. (Pilihan ganda)** ___ we arrived at the beach, we took some photos.
A. Because
B. Although
C. When
D. Unless
**Kunci: C.** *When* menghubungkan dua kejadian yang berurutan: tiba, lalu berfoto.

**8. (Pilihan ganda)** Which negative sentence is correct?
A. I did not went to school.
B. I did not go to school.
C. I not went to school.
D. I was not go to school.
**Kunci: B.** Setelah *did not*, kata kerja memakai bentuk dasar (V1): *did not go*.

**9. (Benar/Salah)** The sentence "We was very happy at the party" is correct.
**Kunci: Salah.** Subjek *we* memakai *were*: "We were very happy at the party."

**10. (Pilihan ganda)** In the sentence "Yesterday, we played badminton at the park," which phrases show time and place?
A. Yesterday – at the park
B. we – played
C. played – yesterday
D. at the park – we
**Kunci: A.** *Yesterday* adalah keterangan waktu; *at the park* adalah keterangan tempat.

### Kuis 3 — Menulis dan Jenis Teks Rekon (terhubung ke Materi 3, 8 soal)

**1. (Pilihan ganda)** Which questions help you write the orientation?
A. What did you eat?
B. Who was there, when did it happen, and where?
C. How do you make it?
D. Why is it important?
**Kunci: B.** Orientation memuat siapa, kapan, dan di mana.

**2. (Pilihan ganda)** Which sequence is in the correct chronological order?
A. Finally, we went home. → First, we arrived at the zoo. → Then, we saw the elephants.
B. First, we arrived at the zoo. → Then, we saw the elephants. → Finally, we went home.
C. Then, we saw the elephants. → Finally, we went home. → First, we arrived at the zoo.
D. First, we arrived at the zoo. → Finally, we went home. → Then, we saw the elephants.
**Kunci: B.** *First* membuka, *then* melanjutkan, dan *finally* menutup.

**3. (Pilihan ganda)** Which sentence is the best re-orientation?
A. Last Sunday, I visited my grandmother.
B. First, we cooked dinner together.
C. It was a lovely visit, and I felt very happy.
D. Who visited my grandmother?
**Kunci: C.** Re-orientation berisi kesan atau perasaan penulis di akhir cerita.

**4. (Pilihan ganda)** The text is about last week. Which sentence needs to be corrected?
A. We went to the market.
B. I buy some fruit there.
C. My mother bought vegetables.
D. We came home at noon.
**Kunci: B.** *Buy* harus menjadi *bought* karena kejadian di masa lampau.

**5. (Benar/Salah)** A factual recount usually reports an event objectively and often uses "he", "she", or "they".
**Kunci: Benar.** Factual recount berfokus pada fakta dan biasanya memakai sudut pandang orang ketiga.

**6. (Benar/Salah)** In a personal recount, the writer must not write any personal feelings.
**Kunci: Salah.** Perasaan atau kesan penulis boleh dituliskan, terutama pada re-orientation.

**7. (Pilihan ganda)** Read: *"On Saturday morning, the students of Class 8B cleaned their school yard. They collected plastic waste and planted flowers. The activity ended at noon."* What kind of text is it?
A. personal recount
B. factual recount
C. imaginative recount
D. procedure text
**Kunci: B.** Teks melaporkan kejadian nyata dengan kata ganti *they*, sehingga merupakan factual recount.

**8. (Isian singkat)** First, I did my homework. ______, I watched TV. Finally, I went to bed. *(isi dengan kata penghubung waktu)*
**Jawaban diterima:** `then`, `next`, `after that`, `afterwards`. Kata penghubung di bagian tengah menandai kegiatan kedua.

---

## Lampiran C — Keselarasan dengan Kurikulum dan Catatan Sumber

**Posisi materi pada kurikulum.** Dari program tahunan/semester Kurikulum Merdeka Bahasa Inggris Fase D yang beredar, *recount text* muncul antara lain pada kelas VIII: *personal recount* pada Bab 1 *"Celebrating Independence Day"* (menganalisis struktur *orientation–events–re-orientation* dan menulis recount sederhana), serta *factual recount* pada semester genap (Bab 4 *"No Littering"*). Materi pada lampiran ini mengikuti pola tersebut: Materi 1 (struktur), Materi 2 (kebahasaan), dan Materi 3 (menulis + pengenalan *factual recount*). Contoh teks bertema 17 Agustus sengaja dipilih agar selaras dengan bab itu.

**Capaian Pembelajaran.** Materi mendukung elemen *Menyimak–Berbicara*, *Membaca–Memirsa*, dan *Menulis–Mempresentasikan* pada CP Bahasa Inggris Fase D. Rumusan tujuan pembelajaran di lampiran adalah **contoh** dan sebaiknya disesuaikan dengan **Alur Tujuan Pembelajaran (ATP)** serta buku ajar yang dipakai Ibu Ernawaty.

**Konsistensi istilah.** Struktur *orientation – events (series of events) – re-orientation (opsional)* dan unsur kebahasaan (*simple past tense*, kata penghubung waktu, kata kerja aksi, keterangan waktu/tempat/cara, kata ganti) sejalan dengan penjelasan umum teks rekon pada materi ajar dan literatur pengajaran bahasa Inggris. Istilah bagian penutup dapat berbeda antarbuku (*re-orientation*, *conclusion*, *personal comment*); template mengikuti istilah yang paling umum.

**Sumber rujukan awal (untuk dicocokkan guru):**
- Rangkuman materi Bahasa Inggris kelas 8 Kurikulum Merdeka (*English for Nusantara*): https://tirto.id/materi-bahasa-inggris-kelas-8-kurikulum-merdeka-semester-1-gNj3
- Analisis teks recount siswa SMP pada Kurikulum Merdeka (jurnal *Retain*, UNESA): https://ejournal.unesa.ac.id/index.php/retain/article/view/62939
- Program tahunan/semester Bahasa Inggris Fase D (dokumen perangkat ajar yang beredar; gunakan ATP sekolah sebagai acuan utama).

Seluruh teks contoh dan soal pada Lampiran A dan B ditulis ulang secara orisinal untuk LMS ini dan **tidak disalin** dari sumber di atas.
