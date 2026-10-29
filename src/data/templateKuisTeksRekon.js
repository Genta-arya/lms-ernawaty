/**
 * Template Kuis Teks Rekon (Lampiran B)
 * Lengkap dengan 3 kuis, kunci jawaban, dan pembahasan mendalam.
 */
export const templateKuisTeksRekon = [
  {
    targetSlug: "teks-rekon-struktur",
    judul: "Kuis 1: Struktur Teks Rekon",
    deskripsi: "Latihan pemahaman tujuan, jenis, dan struktur generic teks rekon.",
    nilaiLulus: 70,
    acakSoal: true,
    acakOpsi: true,
    maksPercobaan: null, // null = tidak terbatas
    status: "draft",
    soal: [
      {
        id: "s1_1",
        tipe: "pilihan_ganda",
        pertanyaan: "What is the main purpose of a recount text?",
        opsi: [
          { id: "a", teks: "To persuade readers to do something" },
          { id: "b", teks: "To retell past events or experiences" },
          { id: "c", teks: "To explain how to make something" },
          { id: "d", teks: "To describe how something works" }
        ],
        kunci: "b",
        pembahasan: "Teks rekon menceritakan kembali kejadian di masa lampau untuk memberi tahu (to inform) atau menghibur (to entertain)."
      },
      {
        id: "s1_2",
        tipe: "pilihan_ganda",
        pertanyaan: "What is the correct order of the generic structure of a recount text?",
        opsi: [
          { id: "a", teks: "Events – Orientation – Re-orientation" },
          { id: "b", teks: "Orientation – Events – Re-orientation" },
          { id: "c", teks: "Re-orientation – Orientation – Events" },
          { id: "d", teks: "Orientation – Re-orientation – Events" }
        ],
        kunci: "b",
        pembahasan: "Urutannya selalu dimulai dengan orientation (latar belakang), diikuti events (rangkaian peristiwa berurutan), lalu ditutup dengan re-orientation (kesan/penutup)."
      },
      {
        id: "s1_3",
        tipe: "benar_salah",
        pertanyaan: "The re-orientation is an optional part of a recount text.",
        kunci: true,
        pembahasan: "Benar. Re-orientation bersifat opsional (boleh tidak ada), sedangkan orientation dan events sebaiknya selalu ada."
      },
      {
        id: "s1_4",
        tipe: "pilihan_ganda",
        pertanyaan: "What information is usually given in the orientation?",
        opsi: [
          { id: "a", teks: "Who, where, and when the event happened" },
          { id: "b", teks: "The most exciting event only" },
          { id: "c", teks: "The steps of a process" },
          { id: "d", teks: "The writer's request to the reader" }
        ],
        kunci: "a",
        pembahasan: "Orientation memperkenalkan latar belakang teks: siapa tokohnya (who), di mana kejadiannya (where), dan kapan berlangsungnya (when)."
      },
      {
        id: "s1_5",
        tipe: "pilihan_ganda",
        pertanyaan: 'Read the sentences: *"Last Saturday, my cousins and I went to the river near our village. We went there at nine o\'clock."* This part is the ___.',
        opsi: [
          { id: "a", teks: "orientation" },
          { id: "b", teks: "events" },
          { id: "c", teks: "re-orientation" },
          { id: "d", teks: "title" }
        ],
        kunci: "a",
        pembahasan: "Kalimat tersebut memuat siapa (my cousins and I), kapan (last Saturday, nine o'clock), dan di mana (the river near our village), sehingga merupakan orientation."
      },
      {
        id: "s1_6",
        tipe: "pilihan_ganda",
        pertanyaan: '*"After that, we cooked noodles and ate them together."* This sentence belongs to the ___.',
        opsi: [
          { id: "a", teks: "orientation" },
          { id: "b", teks: "events" },
          { id: "c", teks: "re-orientation" },
          { id: "d", teks: "title" }
        ],
        kunci: "b",
        pembahasan: "Kata urutan penghubung 'After that' dan kegiatan yang dilakukan menandakan bagian events (rangkaian peristiwa)."
      },
      {
        id: "s1_7",
        tipe: "pilihan_ganda",
        pertanyaan: '*"It was a tiring day, but I enjoyed every minute of it."* This sentence is most likely the ___.',
        opsi: [
          { id: "a", teks: "orientation" },
          { id: "b", teks: "events" },
          { id: "c", teks: "re-orientation" },
          { id: "d", teks: "opening title" }
        ],
        kunci: "c",
        pembahasan: "Kalimat tersebut berisi kesan atau perasaan penulis di akhir cerita, yang merupakan ciri khas re-orientation."
      },
      {
        id: "s1_8",
        tipe: "pilihan_ganda",
        pertanyaan: 'A text tells about the writer\'s own holiday and uses "I" and "we". What kind of recount is it?',
        opsi: [
          { id: "a", teks: "personal recount" },
          { id: "b", teks: "factual recount" },
          { id: "c", teks: "imaginative recount" },
          { id: "d", teks: "procedure text" }
        ],
        kunci: "a",
        pembahasan: "Pengalaman pribadi dengan sudut pandang orang pertama (I dan we) adalah personal recount."
      },
      {
        id: "s1_9",
        tipe: "pilihan_ganda",
        pertanyaan: "Which one is an example of a factual recount?",
        opsi: [
          { id: "a", teks: "A story about being an astronaut for a day" },
          { id: "b", teks: "A report about a school clean-up activity that really happened" },
          { id: "c", teks: "My own holiday story told with \"I\"" },
          { id: "d", teks: "The steps to make a cup of tea" }
        ],
        kunci: "b",
        pembahasan: "Factual recount melaporkan peristiwa nyata secara objektif tanpa berfokus pada emosi/sudut pandang pribadi penulis."
      },
      {
        id: "s1_10",
        tipe: "isian",
        pertanyaan: "The events in a recount text are arranged in ______ order (based on time). (Jawab dengan 1 kata bahasa Inggris)",
        kunci: ["chronological"],
        pembahasan: "Peristiwa dalam teks rekon disusun secara kronologis (chronological), yaitu berurutan sesuai lini masa waktu kejadian."
      }
    ]
  },
  {
    targetSlug: "teks-rekon-kebahasaan",
    judul: "Kuis 2: Kebahasaan Teks Rekon",
    deskripsi: "Latihan simple past tense, kata penghubung waktu (time connectives), dan kata kerja aksi.",
    nilaiLulus: 70,
    acakSoal: true,
    acakOpsi: true,
    maksPercobaan: null,
    status: "draft",
    soal: [
      {
        id: "s2_1",
        tipe: "pilihan_ganda",
        pertanyaan: "Which tense is mostly used in a recount text?",
        opsi: [
          { id: "a", teks: "Simple present" },
          { id: "b", teks: "Simple past" },
          { id: "c", teks: "Simple future" },
          { id: "d", teks: "Present continuous" }
        ],
        kunci: "b",
        pembahasan: "Karena kejadian sudah berlangsung di masa lampau dan sudah selesai, maka menggunakan simple past tense."
      },
      {
        id: "s2_2",
        tipe: "pilihan_ganda",
        pertanyaan: "Choose the correct sentence.",
        opsi: [
          { id: "a", teks: "We visit the museum yesterday." },
          { id: "b", teks: "We visited the museum yesterday." },
          { id: "c", teks: "We visiting the museum yesterday." },
          { id: "d", teks: "We will visited the museum yesterday." }
        ],
        kunci: "b",
        pembahasan: "Keterangan waktu 'yesterday' menandakan masa lampau, sehingga kata kerja yang dipakai adalah V2 ('visited')."
      },
      {
        id: "s2_3",
        tipe: "isian",
        pertanyaan: 'Write the past form of the verb "go": ______',
        kunci: ["went"],
        pembahasan: "'Go' adalah kata kerja tidak beraturan (irregular verb): go → went → gone."
      },
      {
        id: "s2_4",
        tipe: "isian",
        pertanyaan: 'Write the past form of the verb "study": ______',
        kunci: ["studied"],
        pembahasan: "Kata kerja beraturan berakhiran konsonan + y berubah menjadi -ied (study → studied)."
      },
      {
        id: "s2_5",
        tipe: "pilihan_ganda",
        pertanyaan: "My brother and I ___ football on the field last Sunday.",
        opsi: [
          { id: "a", teks: "play" },
          { id: "b", teks: "plays" },
          { id: "c", teks: "played" },
          { id: "d", teks: "playing" }
        ],
        kunci: "c",
        pembahasan: "'Last Sunday' menunjukkan masa lampau, sehingga kata kerja yang digunakan adalah V2 ('played')."
      },
      {
        id: "s2_6",
        tipe: "pilihan_ganda",
        pertanyaan: "Which words are time connectives?",
        opsi: [
          { id: "a", teks: "happy, tired, hungry" },
          { id: "b", teks: "first, then, finally" },
          { id: "c", teks: "teacher, doctor, driver" },
          { id: "d", teks: "under, behind, between" }
        ],
        kunci: "b",
        pembahasan: "'First', 'then', dan 'finally' adalah time connectives yang berfungsi mengurutkan alur waktu kejadian."
      },
      {
        id: "s2_7",
        tipe: "pilihan_ganda",
        pertanyaan: "___ we arrived at the beach, we took some photos.",
        opsi: [
          { id: "a", teks: "Because" },
          { id: "b", teks: "Although" },
          { id: "c", teks: "When" },
          { id: "d", teks: "Unless" }
        ],
        kunci: "c",
        pembahasan: "'When' (ketika) digunakan untuk menghubungkan dua kegiatan yang berurutan secara waktu."
      },
      {
        id: "s2_8",
        tipe: "pilihan_ganda",
        pertanyaan: "Which negative sentence is correct?",
        opsi: [
          { id: "a", teks: "I did not went to school." },
          { id: "b", teks: "I did not go to school." },
          { id: "c", teks: "I not went to school." },
          { id: "d", teks: "I was not go to school." }
        ],
        kunci: "b",
        pembahasan: "Setelah kata kerja bantu lampau 'did not', kata kerja utama kembali ke bentuk dasar V1: 'did not go'."
      },
      {
        id: "s2_9",
        tipe: "benar_salah",
        pertanyaan: 'The sentence "We was very happy at the party" is correct.',
        kunci: false,
        pembahasan: "Salah. Subjek jamak 'We' menggunakan to be lampau 'were': 'We were very happy at the party'."
      },
      {
        id: "s2_10",
        tipe: "pilihan_ganda",
        pertanyaan: 'In the sentence "Yesterday, we played badminton at the park," which phrases show time and place?',
        opsi: [
          { id: "a", teks: "Yesterday – at the park" },
          { id: "b", teks: "we – played" },
          { id: "c", teks: "played – yesterday" },
          { id: "d", teks: "at the park – we" }
        ],
        kunci: "a",
        pembahasan: "'Yesterday' adalah adverb of time (keterangan waktu); 'at the park' adalah adverb of place (keterangan tempat)."
      }
    ]
  },
  {
    targetSlug: "teks-rekon-menulis",
    judul: "Kuis 3: Menulis dan Jenis Teks Rekon",
    deskripsi: "Evaluasi kemampuan merencanakan, menyusun, dan membedakan jenis teks rekon.",
    nilaiLulus: 70,
    acakSoal: true,
    acakOpsi: true,
    maksPercobaan: null,
    status: "draft",
    soal: [
      {
        id: "s3_1",
        tipe: "pilihan_ganda",
        pertanyaan: "Which questions help you write the orientation?",
        opsi: [
          { id: "a", teks: "What did you eat?" },
          { id: "b", teks: "Who was there, when did it happen, and where?" },
          { id: "c", teks: "How do you make it?" },
          { id: "d", teks: "Why is it important?" }
        ],
        kunci: "b",
        pembahasan: "Orientation memuat pertanyaan 5W: Siapa yang terlibat (who), kapan kejadiannya (when), dan di mana tempatnya (where)."
      },
      {
        id: "s3_2",
        tipe: "pilihan_ganda",
        pertanyaan: "Which sequence is in the correct chronological order?",
        opsi: [
          { id: "a", teks: "Finally, we went home. → First, we arrived at the zoo. → Then, we saw the elephants." },
          { id: "b", teks: "First, we arrived at the zoo. → Then, we saw the elephants. → Finally, we went home." },
          { id: "c", teks: "Then, we saw the elephants. → Finally, we went home. → First, we arrived at the zoo." },
          { id: "d", teks: "First, we arrived at the zoo. → Finally, we went home. → Then, we saw the elephants." }
        ],
        kunci: "b",
        pembahasan: "Urutan kronologis yang runtut diawali kata 'First', dilanjutkan 'Then', dan diakhiri 'Finally'."
      },
      {
        id: "s3_3",
        tipe: "pilihan_ganda",
        pertanyaan: "Which sentence is the best re-orientation?",
        opsi: [
          { id: "a", teks: "Last Sunday, I visited my grandmother." },
          { id: "b", teks: "First, we cooked dinner together." },
          { id: "c", teks: "It was a lovely visit, and I felt very happy." },
          { id: "d", teks: "Who visited my grandmother?" }
        ],
        kunci: "c",
        pembahasan: "Re-orientation berisi kesan emosional atau kesimpulan akhir penulis (misal: 'It was a lovely visit, and I felt very happy')."
      },
      {
        id: "s3_4",
        tipe: "pilihan_ganda",
        pertanyaan: "The text is about last week. Which sentence needs to be corrected?",
        opsi: [
          { id: "a", teks: "We went to the market." },
          { id: "b", teks: "I buy some fruit there." },
          { id: "c", teks: "My mother bought vegetables." },
          { id: "d", teks: "We came home at noon." }
        ],
        kunci: "b",
        pembahasan: "'I buy some fruit there' salah karena kata 'buy' berbentuk V1. Untuk teks masa lampau harus diganti menjadi 'bought' (V2)."
      },
      {
        id: "s3_5",
        tipe: "benar_salah",
        pertanyaan: "A factual recount usually reports an event objectively and often uses \"he\", \"she\", or \"they\".",
        kunci: true,
        pembahasan: "Benar. Factual recount berfokus pada laporan kejadian nyata secara objektif dan umum memakai kata ganti orang ketiga."
      },
      {
        id: "s3_6",
        tipe: "benar_salah",
        pertanyaan: "In a personal recount, the writer must not write any personal feelings.",
        kunci: false,
        pembahasan: "Salah. Dalam personal recount, penulis justru dianjurkan menuangkan perasaan atau kesan pribadinya, terutama di re-orientation."
      },
      {
        id: "s3_7",
        tipe: "pilihan_ganda",
        pertanyaan: 'Read: *"On Saturday morning, the students of Class 8B cleaned their school yard. They collected plastic waste and planted flowers. The activity ended at noon."* What kind of text is it?',
        opsi: [
          { id: "a", teks: "personal recount" },
          { id: "b", teks: "factual recount" },
          { id: "c", teks: "imaginative recount" },
          { id: "d", teks: "procedure text" }
        ],
        kunci: "b",
        pembahasan: "Teks melaporkan kegiatan nyata siswa tanpa ungkapan sudut pandang orang pertama (memakai kata ganti 'they'), sehingga merupakan factual recount."
      },
      {
        id: "s3_8",
        tipe: "isian",
        pertanyaan: "First, I did my homework. ______, I watched TV. Finally, I went to bed. (Isi dengan salah satu kata penghubung waktu yang tepat)",
        kunci: ["then", "next", "after that", "afterwards"],
        pembahasan: "Kata penghubung waktu pada bagian tengah urutan kejadian dapat berupa 'then', 'next', 'after that', atau 'afterwards'."
      }
    ]
  }
]

