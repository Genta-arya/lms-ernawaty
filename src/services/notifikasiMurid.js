import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { normalizeTingkatRomawi, isMateriCocokTingkat } from "@/lib/utils"

const STORAGE_KEY_MURID_READ = "lsm_erna_murid_read_notifications_v3"

export function getMuridReadNotificationIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MURID_READ)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function markMuridNotificationAsRead(id) {
  try {
    const current = getMuridReadNotificationIds()
    if (!current.includes(id)) {
      current.push(id)
      localStorage.setItem(STORAGE_KEY_MURID_READ, JSON.stringify(current))
    }
  } catch (e) {
    console.warn("Gagal menyimpan status baca notifikasi murid:", e)
  }
}

export function markAllMuridNotificationsAsRead(ids = []) {
  try {
    const current = getMuridReadNotificationIds()
    const merged = Array.from(new Set([...current, ...ids]))
    localStorage.setItem(STORAGE_KEY_MURID_READ, JSON.stringify(merged))
  } catch (e) {
    console.warn("Gagal menandai semua notifikasi murid dibaca:", e)
  }
}

/**
 * Realtime Listener Notifikasi untuk Murid:
 * - Materi baru berstatus "terbit"
 * - Kuis baru berstatus "terbit"
 * - Tugas baru berstatus "terbit"
 * - Nilai tugas yang sudah dinilai oleh guru
 */
export function subscribeMuridNotifications({ uid, studentTingkat, studentKelasId }, callback) {
  if (!uid) return () => {}

  let materiList = []
  let kuisList = []
  let tugasList = []
  let mySubmissionsList = []
  let myProgresMap = {}
  let myPercobaanList = []

  const normStudentTingkat = normalizeTingkatRomawi(studentTingkat)

  function computeNotifications() {
    const readIds = getMuridReadNotificationIds()

    // 1. Notifikasi Materi
    const materiNotifs = materiList
      .filter((m) => {
        // Cek kecocokan tingkat kelas
        return isMateriCocokTingkat(m.tingkat, normStudentTingkat)
      })
      .map((m) => {
        const notifId = `materi_${m.id}`
        const isReadProgress = !!myProgresMap[m.id]
        const isRead = readIds.includes(notifId)

        return {
          id: notifId,
          rawId: m.id,
          type: "materi",
          title: m.judul,
          desc: isReadProgress
            ? "Materi telah selesai kamu pelajari."
            : `Materi baru diterbitkan untuk kelasmu. Pelajari sekarang!`,
          time: m.createdAt?.seconds ? m.createdAt.seconds * 1000 : (m.createdAt || Date.now()),
          link: `/materi/${m.slug || m.id}`,
          badge: isReadProgress ? "Selesai" : "Materi Baru",
          badgeColor: isReadProgress
            ? "bg-blue-50 text-blue-700 border-blue-200"
            : "bg-indigo-50 text-indigo-700 border-indigo-200",
          isUnread: !isRead && !isReadProgress,
        }
      })

    // 2. Notifikasi Kuis
    const kuisDoneMap = new Map()
    myPercobaanList.forEach((p) => {
      const ex = kuisDoneMap.get(p.kuisId)
      if (!ex || p.skor > ex.skor) {
        kuisDoneMap.set(p.kuisId, p)
      }
    })

    const kuisNotifs = kuisList
      .filter((k) => {
        return isMateriCocokTingkat(k.tingkat, normStudentTingkat)
      })
      .map((k) => {
        const notifId = `kuis_${k.id}`
        const best = kuisDoneMap.get(k.id)
        const isDone = !!best
        const isRead = readIds.includes(notifId)

        return {
          id: notifId,
          rawId: k.id,
          type: "kuis",
          title: k.judul,
          desc: isDone
            ? `Telah kamu kerjakan dengan skor: ${best.skor} (Nilai lulus: ${k.nilaiLulus || 70}).`
            : `Kuis latihan baru (${k.jumlahSoal || k.soal?.length || 0} soal). Uji pemahamanmu sekarang!`,
          time: k.createdAt?.seconds ? k.createdAt.seconds * 1000 : (k.createdAt || Date.now()),
          link: `/murid/kuis/${k.id}`,
          badge: isDone ? `Selesai (${best.skor})` : "Kuis Baru",
          badgeColor: isDone
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-purple-50 text-purple-700 border-purple-200",
          isUnread: !isRead && !isDone,
        }
      })

    // 3. Notifikasi Tugas & Nilai
    const subMap = new Map()
    mySubmissionsList.forEach((s) => subMap.set(s.tugasId, s))

    const tugasNotifs = tugasList
      .filter((t) => {
        if (t.kelasIds && Array.isArray(t.kelasIds) && t.kelasIds.length > 0) {
          if (studentKelasId) return t.kelasIds.includes(studentKelasId)
          return isMateriCocokTingkat(t.tingkat, normStudentTingkat)
        }
        return isMateriCocokTingkat(t.tingkat, normStudentTingkat)
      })
      .map((t) => {
        const notifId = `tugas_${t.id}`
        const sub = subMap.get(t.id)
        const isSubmitted = !!sub
        const isGraded = sub?.status === "dinilai" && sub?.nilai !== undefined
        const isDeadlinePassed = t.deadline ? new Date(t.deadline) < new Date() : false
        const isRead = readIds.includes(notifId)

        return {
          id: notifId,
          rawId: t.id,
          type: "tugas",
          title: t.judul,
          desc: isGraded
            ? `Tugas telah dinilai Guru: ${sub.nilai}/100. Klik untuk lihat catatan.`
            : isSubmitted
            ? "Tugas sudah kamu kumpulkan. Menunggu penilaian guru."
            : isDeadlinePassed
            ? "Tenggat waktu pengumpulan tugas telah lewat."
            : `Tugas baru! Batas pengumpulan: ${t.deadline ? new Date(t.deadline).toLocaleDateString("id-ID") : "Fleksibel"}`,
          time: t.createdAt?.seconds ? t.createdAt.seconds * 1000 : (t.createdAt || Date.now()),
          link: `/murid/tugas/${t.id}`,
          badge: isGraded
            ? `Nilai: ${sub.nilai}`
            : isSubmitted
            ? "Terkumpul"
            : isDeadlinePassed
            ? "Lewat"
            : "Tugas Baru",
          badgeColor: isGraded
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : isSubmitted
            ? "bg-blue-50 text-blue-700 border-blue-200"
            : isDeadlinePassed
            ? "bg-rose-50 text-rose-700 border-rose-200"
            : "bg-amber-50 text-amber-800 border-amber-200",
          isUnread: !isRead && (!isSubmitted || isGraded),
        }
      })

    const allNotifs = [...materiNotifs, ...tugasNotifs, ...kuisNotifs]
    allNotifs.sort((a, b) => b.time - a.time)

    const unreadCount = allNotifs.filter((n) => n.isUnread).length

    callback({
      all: allNotifs,
      materi: materiNotifs,
      kuis: kuisNotifs,
      tugas: tugasNotifs,
      unreadCount,
    })
  }

  // Listener 1: Materi Terbit
  const qMateri = query(collection(db, "materi"), where("status", "==", "terbit"))
  const unsubMateri = onSnapshot(
    qMateri,
    (snap) => {
      materiList = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      computeNotifications()
    },
    (err) => console.warn("Live notif materi error:", err)
  )

  // Listener 2: Kuis Terbit
  const qKuis = query(collection(db, "kuis"), where("status", "==", "terbit"))
  const unsubKuis = onSnapshot(
    qKuis,
    (snap) => {
      kuisList = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      computeNotifications()
    },
    (err) => console.warn("Live notif kuis error:", err)
  )

  // Listener 3: Tugas Terbit
  const qTugas = query(collection(db, "tugas"), where("status", "==", "terbit"))
  const unsubTugas = onSnapshot(
    qTugas,
    (snap) => {
      tugasList = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      computeNotifications()
    },
    (err) => console.warn("Live notif tugas error:", err)
  )

  // Listener 4: Pengumpulan Tugas Murid (Deteksi Nilai Masuk)
  const qSub = query(collection(db, "pengumpulanTugas"), where("uid", "==", uid))
  const unsubSub = onSnapshot(
    qSub,
    (snap) => {
      mySubmissionsList = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      computeNotifications()
    },
    (err) => console.warn("Live notif submission error:", err)
  )

  // Listener 5: Progres Baca Materi Murid
  const qProg = query(collection(db, "progresMateri"), where("uid", "==", uid))
  const unsubProg = onSnapshot(
    qProg,
    (snap) => {
      const pMap = {}
      snap.docs.forEach((d) => {
        pMap[d.data().materiId] = true
      })
      myProgresMap = pMap
      computeNotifications()
    },
    (err) => console.warn("Live notif progres error:", err)
  )

  // Listener 6: Percobaan Kuis Murid
  const qPerc = query(collection(db, "percobaan"), where("uid", "==", uid))
  const unsubPerc = onSnapshot(
    qPerc,
    (snap) => {
      myPercobaanList = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      computeNotifications()
    },
    (err) => console.warn("Live notif percobaan error:", err)
  )

  return () => {
    unsubMateri()
    unsubKuis()
    unsubTugas()
    unsubSub()
    unsubProg()
    unsubPerc()
  }
}

