import React, { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import {
  getKaryaList,
  createKarya,
  toggleLikeKarya,
  addKomentarKarya,
  toggleLikeKomentarKarya,
  deleteKomentarKarya,
  deleteKarya,
  KATEGORI_KARYA,
} from "@/services/karya"
import { getKelasList } from "@/services/kelas"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { MadingCardSkeleton } from "@/components/ui/loading-skeletons"
import { cn } from "@/lib/utils"
import {
  Sparkles,
  Heart,
  MessageSquare,
  Send,
  Trash2,
  Feather,
  Plus,
  X,
  Calendar,
  ArrowLeft,
  Reply,
  CornerDownRight,
  Copy,
  Check,
  Quote,
} from "lucide-react"

// Pemetaan Emoji Kategori Karya
const KATEGORI_EMOJI = {
  "SEMUA": "✨",
  "Pantun Melayu": "🪶",
  "Puisi Bebas": "📜",
  "Slogan & Poster Edukasi": "💡",
  "Cerpen Inspiratif": "📖",
  "Teks Deskripsi Budaya": "🏛️",
}

function getCategoryEmoji(kat) {
  return KATEGORI_EMOJI[kat] || "📝"
}

/**
 * Komponen Avatar Pengguna Bulat & Responsif
 */
function UserAvatar({ foto, nama, size = "md", className = "" }) {
  const initial = (nama || "U").trim().charAt(0).toUpperCase() || "U"

  const sizeClasses = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-11 h-11 text-base",
  }

  const gradients = [
    "from-blue-600 to-indigo-600",
    "from-indigo-600 to-purple-600",
    "from-sky-500 to-blue-600",
    "from-emerald-500 to-teal-600",
    "from-violet-600 to-fuchsia-600",
    "from-amber-500 to-orange-600",
  ]
  const charCode = (nama || "U").charCodeAt(0) || 0
  const gradient = gradients[charCode % gradients.length]

  return (
    <div
      className={cn(
        "rounded-full shrink-0 overflow-hidden flex items-center justify-center font-bold select-none border border-slate-200/80 shadow-2xs aspect-square",
        sizeClasses[size] || sizeClasses.md,
        className
      )}
    >
      {foto ? (
        <img
          src={foto}
          alt={nama || "User"}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = "none"
            e.currentTarget.parentElement.classList.add("bg-gradient-to-tr", gradient, "text-white")
            e.currentTarget.parentElement.innerText = initial
          }}
        />
      ) : (
        <div
          className={cn(
            "w-full h-full flex items-center justify-center text-white bg-gradient-to-tr",
            gradient
          )}
        >
          {initial}
        </div>
      )}
    </div>
  )
}

// Helper format tanggal postingan
function formatPostDate(timestamp) {
  if (!timestamp) return "Baru saja"
  let date
  if (timestamp.toDate) {
    date = timestamp.toDate()
  } else if (typeof timestamp === "string") {
    date = new Date(timestamp)
  } else if (timestamp.seconds) {
    date = new Date(timestamp.seconds * 1000)
  } else {
    date = new Date(timestamp)
  }

  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

// Helper resolve label kelas siswa secara konsisten
function resolveKelasBadge(rawKelas, kelasMap = {}, fallback = "") {
  let target = (rawKelas || fallback || "").trim()

  if (!target || target === "Pelajar" || target === "Murid SMPN 3" || target === "Siswa SMPN 3" || target === "Pelajar SMPN 3") {
    target = fallback || ""
  }

  if (target.startsWith("Kelas ") && target.length > 20) {
    const docId = target.replace("Kelas ", "").trim()
    if (kelasMap[docId]) return kelasMap[docId]
  }

  if (kelasMap[target]) {
    return kelasMap[target]
  }

  if (!target) {
    const firstKelas = Object.values(kelasMap)[0]
    return firstKelas || "Kelas VII"
  }

  return target.startsWith("Kelas ") ? target : `Kelas ${target}`
}

export function Mading() {
  const { currentUser, role, profileData } = useAuth()
  const [karyaList, setKaryaList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedKategori, setSelectedKategori] = useState("SEMUA")
  const [kelasMap, setKelasMap] = useState({})
  const formRef = useRef(null)

  // Salin State
  const [copiedKaryaId, setCopiedKaryaId] = useState(null)

  // Form State
  const [judul, setJudul] = useState("")
  const [kategori, setKategori] = useState(KATEGORI_KARYA[1]) // Default "Pantun Melayu"
  const [isi, setIsi] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Komentar State per card
  const [commentInputMap, setCommentInputMap] = useState({})
  const [expandedComments, setExpandedComments] = useState({})
  const [replyingToMap, setReplyingToMap] = useState({})

  // Data User Saat Ini (Aktif)
  const userFoto = profileData?.fotoUrl || currentUser?.photoURL || null
  const userNama = profileData?.nama || currentUser?.displayName || currentUser?.email || "Pengguna"
  const userKelasLabel =
    role === "guru"
      ? "Guru Pengampu"
      : resolveKelasBadge(
          profileData?.kelasNama,
          kelasMap,
          profileData?.kelasId ? kelasMap[profileData.kelasId] : ""
        )

  async function loadData() {
    try {
      const [karya, kelas] = await Promise.all([
        getKaryaList(),
        getKelasList(),
      ])
      const kMap = {}
      kelas.forEach((k) => {
        kMap[k.id] = `Kelas ${k.nama}`
      })
      setKelasMap(kMap)
      setKaryaList(karya)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
    loadData()
  }, [])

  function handleOpenForm() {
    setShowForm((prev) => {
      const next = !prev
      if (!prev) {
        setTimeout(() => {
          formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        }, 150)
      }
      return next
    })
  }

  function handleCopyKarya(karya) {
    const textToCopy = `"${karya.judul}"\n\n${karya.isi}\n\n— Karya: ${karya.penulisNama} (${karya.penulisKelas || "SMPN 3 Ketapang"})\nPojok Kreasi Literasi LSM Mandiri SMPN 3 Ketapang`
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedKaryaId(karya.id)
      setTimeout(() => setCopiedKaryaId(null), 2000)
    })
  }

  async function handleSubmitKarya(e) {
    e.preventDefault()
    if (!currentUser) {
      alert("Silakan masuk terlebih dahulu untuk menerbitkan karya!")
      return
    }
    if (!judul.trim() || !isi.trim()) {
      alert("Harap lengkapi judul dan isi karya Anda.")
      return
    }

    setSubmitting(true)
    try {
      await createKarya({
        judul,
        isi,
        kategori,
        penulisNama: userNama,
        penulisRole: role || "murid",
        penulisUid: currentUser.uid,
        penulisKelas: userKelasLabel,
        penulisFoto: userFoto,
      })

      setJudul("")
      setIsi("")
      setShowForm(false)
      await loadData()
      alert("Karya berhasil diterbitkan ke Pojok Kreasi!")
    } catch (err) {
      alert(err.message || "Gagal menerbitkan karya.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLike(karyaId) {
    if (!currentUser) {
      alert("Masuk terlebih dahulu untuk memberikan apresiasi suka!")
      return
    }

    // Optimistic Update
    setKaryaList((prev) =>
      prev.map((k) => {
        if (k.id === karyaId) {
          const likes = k.likes || []
          const hasLiked = likes.includes(currentUser.uid)
          const newLikes = hasLiked
            ? likes.filter((uid) => uid !== currentUser.uid)
            : [...likes, currentUser.uid]
          return {
            ...k,
            likes: newLikes,
            likeCount: (k.likeCount || 0) + (hasLiked ? -1 : 1),
          }
        }
        return k
      })
    )

    try {
      await toggleLikeKarya(karyaId, currentUser.uid)
    } catch (err) {
      console.error("Gagal like karya:", err)
      await loadData()
    }
  }

  async function handleSendComment(karyaId) {
    const text = commentInputMap[karyaId]
    if (!text || !text.trim()) return
    if (!currentUser) {
      alert("Masuk terlebih dahulu untuk memberi komentar!")
      return
    }

    const replying = replyingToMap[karyaId]

    try {
      await addKomentarKarya(karyaId, {
        penulisNama: userNama,
        penulisRole: role || "murid",
        penulisUid: currentUser.uid,
        penulisKelas: userKelasLabel,
        penulisFoto: userFoto,
        teks: text,
        replyToId: replying?.commentId || null,
        replyToNama: replying?.penulisNama || null,
      })

      setCommentInputMap({ ...commentInputMap, [karyaId]: "" })
      setReplyingToMap({ ...replyingToMap, [karyaId]: null })
      setExpandedComments({ ...expandedComments, [karyaId]: true })
      await loadData()
    } catch (err) {
      alert(err.message || "Gagal mengirim komentar.")
    }
  }

  async function handleLikeComment(karyaId, commentId) {
    if (!currentUser) {
      alert("Masuk terlebih dahulu untuk menyukai komentar!")
      return
    }

    setKaryaList((prev) =>
      prev.map((k) => {
        if (k.id === karyaId) {
          const updatedComments = (k.komentar || []).map((kom) => {
            if (kom.id === commentId) {
              const currentLikes = kom.likes || []
              const hasLiked = currentLikes.includes(currentUser.uid)
              const nextLikes = hasLiked
                ? currentLikes.filter((id) => id !== currentUser.uid)
                : [...currentLikes, currentUser.uid]
              return {
                ...kom,
                likes: nextLikes,
                likeCount: nextLikes.length,
              }
            }
            return kom
          })
          return { ...k, komentar: updatedComments }
        }
        return k
      })
    )

    try {
      await toggleLikeKomentarKarya(karyaId, commentId, currentUser.uid)
    } catch (err) {
      console.error("Gagal menyukai komentar:", err)
      await loadData()
    }
  }

  async function handleDeleteComment(karyaId, commentId) {
    if (!confirm("Hapus komentar ini?")) return
    try {
      await deleteKomentarKarya(karyaId, commentId)
      await loadData()
    } catch (err) {
      alert(err.message || "Gagal menghapus komentar.")
    }
  }

  async function handleDelete(karyaId) {
    if (!confirm("Hapus karya ini dari Pojok Kreasi?")) return
    try {
      await deleteKarya(karyaId)
      await loadData()
    } catch (err) {
      alert(err.message || "Gagal menghapus karya.")
    }
  }

  const filteredList = karyaList.filter((k) => {
    if (selectedKategori === "SEMUA") return true
    return k.kategori === selectedKategori
  })

  return (
    <div className="space-y-4 sm:space-y-5 max-w-3xl mx-auto pb-20">
      {/* Tombol Back / Kembali ke Dashboard */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="gap-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 -ml-2"
        >
          <Link to={role === "guru" ? "/guru" : role === "murid" ? "/murid" : "/"}>
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs sm:text-sm">
              Kembali ke {role === "guru" ? "Dashboard Guru" : role === "murid" ? "Materi" : "Beranda"}
            </span>
          </Link>
        </Button>
      </div>

      {/* ── 1. BANNER UTAMA (BERSIH, RAMPING & TIDAK KAKU) ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-md shadow-blue-500/10">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full text-white backdrop-blur">
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>Panggung Literasi Pelajar</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
            Pojok Kreasi Pantun & Sastra
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
            Ekspresikan karyamu melalui bait pantun adat Melayu Ketapang, puisi inspiratif,
            maupun sastra budaya lokal.
          </p>
        </div>
      </div>

      {/* ── 2. BAR TULIS KARYA BARU DENGAN FOTO PROFIL PENGGUNA (STYLE MEDIA SOSIAL MODERN) ── */}
      {!currentUser ? (
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold">
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-slate-800">
                Punya karya pantun atau sastra yang ingin dibagikan?
              </div>
              <div className="text-[11px] text-slate-500">
                Masuk dengan akun siswa untuk mempublikasikan karyamu ke mading sekolah.
              </div>
            </div>
          </div>
          <Button
            size="sm"
            asChild
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-4 rounded-xl shrink-0"
          >
            <Link to="/masuk" state={{ from: "/mading" }}>
              Masuk untuk Menerbitkan
            </Link>
          </Button>
        </div>
      ) : role !== "guru" ? (
        <div
          onClick={handleOpenForm}
          className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex items-center gap-3"
        >
          {/* Foto Profil User */}
          <UserAvatar
            foto={userFoto}
            nama={userNama}
            size="md"
            className="ring-2 ring-blue-500/20"
          />

          {/* Input Placeholder Prompt */}
          <div className="flex-1 min-w-0">
            <div className="text-xs sm:text-sm text-slate-500 font-medium truncate">
              Ada ide pantun atau puisi hari ini, <span className="font-bold text-slate-800">{userNama.split(" ")[0]}</span>?
            </div>
            <div className="text-[10px] text-slate-400 font-medium truncate">
              {userKelasLabel} • Ketuk untuk menulis karya
            </div>
          </div>

          {/* Tombol Tulis */}
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-3.5 rounded-xl shrink-0 gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Kirim Karya</span>
            <span className="sm:hidden">Tulis</span>
          </Button>
        </div>
      ) : (
        <div className="bg-indigo-50/70 border border-indigo-100 p-3 sm:p-3.5 rounded-2xl flex items-center gap-3">
          <UserAvatar foto={userFoto} nama={userNama} size="md" className="ring-2 ring-indigo-500/20" />
          <div className="flex-1 min-w-0">
            <div className="text-xs sm:text-sm font-bold text-indigo-900 truncate">
              {userNama} (Guru Pengampu)
            </div>
            <div className="text-[11px] text-indigo-700/80">
              Mode Kurator: Evaluasi, berikan apresiasi, dan masukan membangun untuk karya siswa.
            </div>
          </div>
        </div>
      )}

      {/* ── 3. FORMULIR PENGIRIMAN KARYA (SAAT DIKLIK) ── */}
      {showForm && (
        <Card
          ref={formRef}
          className="rounded-2xl sm:rounded-3xl border border-blue-200/90 shadow-lg shadow-blue-500/5 bg-white overflow-hidden animate-in fade-in duration-200"
        >
          <CardHeader className="border-b border-slate-100 p-4 sm:p-5 pb-3 bg-gradient-to-r from-blue-50/50 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <UserAvatar foto={userFoto} nama={userNama} size="sm" />
                <div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                    {userNama}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    {userKelasLabel} • Menerbitkan Karya Baru
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-5 space-y-4">
            <form onSubmit={handleSubmitKarya} className="space-y-4">
              {/* Pilihan Kategori */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Kategori Karya:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {KATEGORI_KARYA.map((kat) => {
                    const isSelected = kategori === kat
                    return (
                      <button
                        key={kat}
                        type="button"
                        onClick={() => setKategori(kat)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border",
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                        )}
                      >
                        <span>{getCategoryEmoji(kat)}</span>
                        <span>{kat}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Judul Karya */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Judul Karya:
                </label>
                <Input
                  placeholder="Contoh: Pantun Nasihat Nelayan Muara Pawan"
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  className="h-10 rounded-xl text-xs sm:text-sm font-semibold"
                  required
                />
              </div>

              {/* Tips Pantun */}
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/60 text-[11px] text-amber-900 leading-relaxed">
                <span className="font-bold">Tips Pantun Melayu:</span> Tekan Enter untuk membuat baris baru. Pantun biasanya terdiri dari 4 larik (baris 1 & 2 sampiran, baris 3 & 4 isi).
              </div>

              {/* Isi Karya */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Isi Bait Karya / Pantun:
                </label>
                <Textarea
                  rows={5}
                  placeholder={`Contoh:\nBerdayung sampan ke Muara Pawan,\nSinggah sebentar membeli ragi.\nBelajar tekun wahai kawan,\nKelak berguna di hari nanti.`}
                  value={isi}
                  onChange={(e) => setIsi(e.target.value)}
                  className="rounded-xl text-xs sm:text-sm font-serif leading-relaxed p-3 bg-slate-50/50 focus:bg-white"
                  required
                />
              </div>

              {/* Tombol Kirim */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 h-9 px-3"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? "Menerbitkan..." : "Terbitkan Karya"}</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── 4. FILTER KATEGORI (CHIPS RAMPING) ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {["SEMUA", ...KATEGORI_KARYA].map((kat) => {
          const isSelected = selectedKategori === kat
          const emoji = getCategoryEmoji(kat)
          return (
            <button
              key={kat}
              type="button"
              onClick={() => setSelectedKategori(kat)}
              className={cn(
                "px-3 py-1.5 text-xs rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 border",
                isSelected
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
              )}
            >
              <span>{emoji}</span>
              <span>{kat === "SEMUA" ? "Semua" : kat}</span>
            </button>
          )
        })}
      </div>

      {/* ── 5. DAFTAR KARYA MADING DIGITAL (FEED) ── */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-3 skeleton-stagger">
            {[0, 1, 2].map((i) => (
              <MadingCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-2">
            <Feather className="w-8 h-8 text-blue-400 mx-auto opacity-50" />
            <h3 className="font-bold text-slate-800 text-sm">Belum Ada Karya di Kategori Ini</h3>
            <p className="text-xs text-slate-400">
              Jadilah yang pertama mengirimkan karya pantun atau sastra inspiratifmu!
            </p>
          </div>
        ) : (
          filteredList.map((karya) => {
            const hasLiked = karya.likes?.includes(currentUser?.uid)
            const isOwner = currentUser && currentUser.uid === karya.penulisUid
            const canDelete = currentUser && (isOwner || role === "guru")
            const isCommentsOpen = !!expandedComments[karya.id]
            const commentCount = karya.komentar?.length || 0

            // Resolusi Foto Penulis
            const authorFoto = isOwner
              ? userFoto || karya.penulisFoto || null
              : karya.penulisFoto || null

            const isCopied = copiedKaryaId === karya.id

            return (
              <Card
                key={karya.id}
                className="rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all bg-white overflow-hidden"
              >
                {/* Header Postingan: Penulis dengan Foto Profil */}
                <CardHeader className="p-4 sm:p-5 pb-2.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserAvatar
                        foto={authorFoto}
                        nama={karya.penulisNama}
                        size="md"
                      />

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                            {karya.penulisNama}
                          </span>

                          {karya.penulisRole === "guru" ? (
                            <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200/60 text-[10px] font-bold px-1.5 py-0">
                              Guru
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-blue-700 font-semibold bg-blue-50/70 border-blue-200 px-1.5 py-0"
                            >
                              {resolveKelasBadge(karya.penulisKelas, kelasMap)}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                          <Calendar className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                          <span>{formatPostDate(karya.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Kategori Badge */}
                    <Badge className="bg-slate-100 hover:bg-slate-100 text-slate-700 border-none text-[10px] font-semibold shrink-0">
                      <span className="mr-1">{getCategoryEmoji(karya.kategori)}</span>
                      {karya.kategori}
                    </Badge>
                  </div>

                  {/* Judul Karya */}
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                    {karya.judul}
                  </h2>
                </CardHeader>

                {/* Isi Karya */}
                <CardContent className="px-4 sm:p-5 pt-0 pb-4 space-y-3">
                  <div className="relative p-3.5 sm:p-4 rounded-xl bg-slate-50/80 border border-slate-100 text-slate-800 font-serif text-xs sm:text-sm leading-relaxed whitespace-pre-line italic">
                    <Quote className="absolute right-2.5 top-2.5 w-7 h-7 text-blue-600/10 -scale-x-100 pointer-events-none" />
                    <div className="relative z-10 select-text">
                      "{karya.isi}"
                    </div>
                  </div>

                  {/* Baris Aksi: Suka, Komentar, Salin, Hapus */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      {/* Tombol Like */}
                      <button
                        type="button"
                        onClick={() => handleLike(karya.id)}
                        className={cn(
                          "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all active:scale-95",
                          hasLiked
                            ? "bg-rose-50 text-rose-600"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-600"
                        )}
                      >
                        <Heart
                          className={cn(
                            "w-3.5 h-3.5",
                            hasLiked ? "fill-rose-500 text-rose-500" : "text-slate-400"
                          )}
                        />
                        <span>{karya.likeCount || 0}</span>
                      </button>

                      {/* Tombol Komentar */}
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedComments({
                            ...expandedComments,
                            [karya.id]: !isCommentsOpen,
                          })
                        }
                        className={cn(
                          "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all",
                          isCommentsOpen
                            ? "bg-blue-50 text-blue-600"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-600"
                        )}
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                        <span>{commentCount}</span>
                      </button>

                      {/* Tombol Salin */}
                      <button
                        type="button"
                        onClick={() => handleCopyKarya(karya)}
                        title="Salin teks pantun"
                        className={cn(
                          "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all",
                          isCopied
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-500"
                        )}
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="font-bold text-[11px]">Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-[11px]">Salin</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Tombol Hapus (Pemilik / Guru) */}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(karya.id)}
                        title="Hapus karya ini"
                        className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* ── BAGIAN KOMENTAR ── */}
                  {isCommentsOpen && (
                    <div className="pt-2 space-y-2.5 animate-in fade-in duration-150 border-t border-slate-100">
                      {/* List Komentar */}
                      {commentCount > 0 ? (
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                          {karya.komentar.map((kom) => {
                            const hasLikedKom = kom.likes?.includes(currentUser?.uid)
                            const likeKomCount = kom.likeCount || kom.likes?.length || 0
                            const isMyKom = currentUser && currentUser.uid === kom.penulisUid
                            const canDeleteKom = isMyKom || role === "guru"

                            const komFoto = isMyKom
                              ? userFoto || kom.penulisFoto || null
                              : kom.penulisFoto || null

                            return (
                              <div
                                key={kom.id}
                                className="p-2.5 rounded-xl bg-slate-50 text-xs space-y-1.5"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <UserAvatar
                                      foto={komFoto}
                                      nama={kom.penulisNama}
                                      size="xs"
                                    />
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-bold text-slate-900">
                                        {kom.penulisNama}
                                      </span>
                                      {kom.penulisRole === "guru" ? (
                                        <Badge className="bg-indigo-100 text-indigo-800 border-none text-[9px] font-bold px-1 py-0">
                                          Guru
                                        </Badge>
                                      ) : (
                                        <Badge
                                          variant="outline"
                                          className="text-[9px] text-blue-700 font-semibold bg-blue-50/80 border-blue-200 px-1 py-0"
                                        >
                                          {resolveKelasBadge(kom.penulisKelas, kelasMap)}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>

                                  {canDeleteKom && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteComment(karya.id, kom.id)}
                                      className="text-slate-300 hover:text-rose-600 transition-colors p-0.5"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>

                                {kom.replyToNama && (
                                  <div className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                                    <CornerDownRight className="w-2.5 h-2.5 text-blue-500" />
                                    <span>Membalas @{kom.replyToNama}</span>
                                  </div>
                                )}

                                <p className="text-slate-700 leading-relaxed font-normal">
                                  {kom.teks}
                                </p>

                                <div className="flex items-center gap-3 pt-0.5 text-[10px]">
                                  <button
                                    type="button"
                                    onClick={() => handleLikeComment(karya.id, kom.id)}
                                    className={cn(
                                      "flex items-center gap-1 font-bold",
                                      hasLikedKom ? "text-rose-600" : "text-slate-400 hover:text-rose-600"
                                    )}
                                  >
                                    <Heart className={cn("w-3 h-3", hasLikedKom && "fill-rose-500")} />
                                    <span>{likeKomCount > 0 ? likeKomCount : "Suka"}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReplyingToMap({
                                        ...replyingToMap,
                                        [karya.id]: {
                                          commentId: kom.id,
                                          penulisNama: kom.penulisNama,
                                        },
                                      })
                                    }}
                                    className="flex items-center gap-1 font-semibold text-slate-400 hover:text-blue-600"
                                  >
                                    <Reply className="w-3 h-3" />
                                    <span>Balas</span>
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="p-3 text-center text-xs text-slate-400 bg-slate-50/60 rounded-xl">
                          Belum ada komentar. Berikan apresiasi pertamamu!
                        </div>
                      )}

                      {/* Notifikasi Sedang Membalas */}
                      {replyingToMap[karya.id] && (
                        <div className="flex items-center justify-between px-2.5 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
                          <span className="flex items-center gap-1 text-[11px]">
                            <CornerDownRight className="w-3 h-3 text-blue-600 shrink-0" />
                            <span>Membalas @{replyingToMap[karya.id].penulisNama}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setReplyingToMap({ ...replyingToMap, [karya.id]: null })
                            }
                            className="text-blue-500 hover:text-rose-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* Input Komentar dengan Foto Profil User */}
                      <div className="flex items-center gap-2 pt-1">
                        <UserAvatar foto={userFoto} nama={userNama} size="sm" />
                        <Input
                          placeholder={
                            replyingToMap[karya.id]
                              ? `Balas @${replyingToMap[karya.id].penulisNama}...`
                              : "Tulis apresiasi..."
                          }
                          value={commentInputMap[karya.id] || ""}
                          onChange={(e) =>
                            setCommentInputMap({
                              ...commentInputMap,
                              [karya.id]: e.target.value,
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              handleSendComment(karya.id)
                            }
                          }}
                          className="h-9 text-xs rounded-xl"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleSendComment(karya.id)}
                          className="h-9 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shrink-0"
                        >
                          <Send className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
