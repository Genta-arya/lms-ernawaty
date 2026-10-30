import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
} from "firebase/firestore"
import { db } from "@/lib/firebase"

const STORAGE_KEY_READ = "lsm_erna_read_notifications"
const STORAGE_KEY_DISMISSED = "lsm_erna_dismissed_notifications"

/**
 * Mengambil daftar ID notifikasi yang sudah dibaca
 */
export function getReadNotificationIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_READ)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/**
 * Menandai satu notifikasi sebagai sudah dibaca
 */
export function markNotificationAsRead(id) {
  try {
    const current = getReadNotificationIds()
    if (!current.includes(id)) {
      current.push(id)
      localStorage.setItem(STORAGE_KEY_READ, JSON.stringify(current))
    }
  } catch (e) {
    console.warn("Gagal menyimpan status baca notifikasi:", e)
  }
}

/**
 * Menandai semua notifikasi sebagai sudah dibaca
 */
export function markAllNotificationsAsRead(ids = []) {
  try {
    const current = getReadNotificationIds()
    const merged = Array.from(new Set([...current, ...ids]))
    localStorage.setItem(STORAGE_KEY_READ, JSON.stringify(merged))
  } catch (e) {
    console.warn("Gagal menandai semua sudah dibaca:", e)
  }
}

/**
 * Mengambil daftar ID notifikasi yang dihapus/dihilangkan (dismissed)
 */
export function getDismissedNotificationIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DISMISSED)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/**
 * Menghapus/menyembunyikan satu notifikasi
 */
export function dismissNotification(id) {
  try {
    const current = getDismissedNotificationIds()
    if (!current.includes(id)) {
      current.push(id)
      localStorage.setItem(STORAGE_KEY_DISMISSED, JSON.stringify(current))
    }
  } catch (e) {
    console.warn("Gagal menghapus notifikasi:", e)
  }
}

/**
 * Menghapus/menyembunyikan semua notifikasi saat ini
 */
export function dismissAllNotifications(ids = []) {
  try {
    const current = getDismissedNotificationIds()
    const merged = Array.from(new Set([...current, ...ids]))
    localStorage.setItem(STORAGE_KEY_DISMISSED, JSON.stringify(merged))
  } catch (e) {
    console.warn("Gagal menghapus semua notifikasi:", e)
  }
}

/**
 * Realtime listener untuk notifikasi komprehensif Guru:
 * 1. Tugas Siswa Masuk (status == "diserahkan" / belum dinilai) -> Langsung evaluasi nilai
 * 2. Siswa Selesai Mengerjakan Kuis (koleksi "percobaan" terbaru) -> Langsung monitoring hasil skor
 * 3. Permintaan Aktivasi Akun Siswa (status == "menunggu") -> Verifikasi akun
 * 4. Karya Mading Baru Siswa
 * 
 * @param {Function} callback - Mengirimkan list & metadata
 * @returns {Function} Unsubscribe all listeners
 */
export function subscribeGuruNotifications(callback) {
  let aktivasiList = []
  let tugasBelumDinilaiList = []
  let kuisSelesaiList = []
  let karyaTerbaruList = []

  const notify = () => {
    const readIds = new Set(getReadNotificationIds())
    const dismissedIds = new Set(getDismissedNotificationIds())

    const filterActive = (list) => list.filter((item) => !dismissedIds.has(item.id))

    const activeAktivasi = filterActive(aktivasiList).map((item) => ({
      ...item,
      isRead: readIds.has(item.id),
    }))

    const activeTugas = filterActive(tugasBelumDinilaiList).map((item) => ({
      ...item,
      isRead: readIds.has(item.id),
    }))

    const activeKuis = filterActive(kuisSelesaiList).map((item) => ({
      ...item,
      isRead: readIds.has(item.id),
    }))

    const activeKarya = filterActive(karyaTerbaruList).map((item) => ({
      ...item,
      isRead: readIds.has(item.id),
    }))

    const allActive = [...activeTugas, ...activeKuis, ...activeAktivasi, ...activeKarya]
    const unreadCount = allActive.filter((n) => !n.isRead).length

    callback({
      unreadCount,
      totalAktivasi: activeAktivasi.length,
      totalTugasBelumDinilai: activeTugas.length,
      totalKuisSelesai: activeKuis.length,
      aktivasiList: activeAktivasi,
      tugasBelumDinilaiList: activeTugas,
      kuisSelesaiList: activeKuis,
      karyaTerbaruList: activeKarya,
      allNotifications: allActive,
    })
  }

  // 1. Tugas Murid Diserahkan & Perlu Dinilai
  const qTugas = query(
    collection(db, "pengumpulanTugas"),
    where("status", "==", "diserahkan")
  )
  const unsubTugas = onSnapshot(
    qTugas,
    (snap) => {
      tugasBelumDinilaiList = snap.docs.map((d) => {
        const data = d.data()
        return {
          id: `tugas_${d.id}`,
          rawId: d.id,
          type: "tugas",
          title: "Tugas Masuk Perlu Nilai",
          nama: data.namaMurid || "Siswa",
          nisn: data.nisn || "",
          kelasNama: data.kelasNama || "",
          tugasId: data.tugasId,
          createdAt: data.submittedAt?.toDate() || new Date(),
          link: `/guru/tugas/${data.tugasId}/nilai`,
        }
      })
      notify()
    },
    (err) => console.warn("Notif Tugas error:", err)
  )

  // 2. Kuis yang Dikerjakan Siswa (Monitoring Skor & Hasil)
  const qKuis = query(
    collection(db, "percobaan"),
    orderBy("selesaiAt", "desc"),
    limit(15)
  )
  const unsubKuis = onSnapshot(
    qKuis,
    (snap) => {
      kuisSelesaiList = snap.docs.map((d) => {
        const data = d.data()
        return {
          id: `kuis_${d.id}`,
          rawId: d.id,
          type: "kuis",
          title: "Kuis Selesai Dikerjakan",
          nama: data.namaMurid || "Siswa",
          nisn: data.nisn || "",
          kelasNama: data.kelasNama || "",
          skor: data.skor !== undefined ? data.skor : 0,
          lulus: data.lulus,
          kuisId: data.kuisId,
          createdAt: data.selesaiAt?.toDate() || new Date(),
          link: `/guru/kuis/${data.kuisId}/hasil`,
        }
      })
      notify()
    },
    (err) => console.warn("Notif Percobaan Kuis error:", err)
  )

  // 3. Permintaan Aktivasi Akun Siswa Menunggu
  const qKlaim = query(collection(db, "klaim"), where("status", "==", "menunggu"))
  const unsubKlaim = onSnapshot(
    qKlaim,
    (snap) => {
      aktivasiList = snap.docs.map((d) => {
        const data = d.data()
        return {
          id: `klaim_${d.id}`,
          rawId: d.id,
          type: "aktivasi",
          title: "Permintaan Aktivasi Siswa",
          nama: data.nama,
          nisn: data.nisn,
          email: data.email,
          createdAt: data.createdAt?.toDate() || new Date(),
          link: "/guru/permintaan",
        }
      })
      notify()
    },
    (err) => console.warn("Notif Klaim error:", err)
  )

  // 4. Karya Mading Baru dari Siswa (5 karya terbaru)
  const qKarya = query(
    collection(db, "karya"),
    orderBy("createdAt", "desc"),
    limit(5)
  )
  const unsubKarya = onSnapshot(
    qKarya,
    (snap) => {
      karyaTerbaruList = snap.docs
        .filter((d) => d.data().penulisRole === "murid")
        .map((d) => {
          const data = d.data()
          return {
            id: `karya_${d.id}`,
            rawId: d.id,
            type: "karya",
            title: "Karya Mading Baru",
            nama: data.penulisNama || "Siswa",
            judulKarya: data.judul,
            kategori: data.kategori,
            createdAt: data.createdAt?.toDate() || new Date(),
            link: "/guru/mading",
          }
        })
      notify()
    },
    (err) => console.warn("Notif Karya error:", err)
  )

  return () => {
    unsubTugas()
    unsubKuis()
    unsubKlaim()
    unsubKarya()
  }
}
