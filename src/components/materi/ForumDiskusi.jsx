import React, { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import {
  subscribeForumByMateri,
  kirimDiskusi,
  hapusDiskusi,
} from "@/services/forumDiskusi"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  MessageSquare,
  Send,
  Reply,
  Trash2,
  CornerDownRight,
  Sparkles,
  GraduationCap,
  UserCheck,
  Clock,
} from "lucide-react"

function formatWaktu(timestamp) {
  if (!timestamp) return "Baru saja"
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  const now = new Date()
  const diffInMinutes = Math.floor((now - date) / (1000 * 60))

  if (diffInMinutes < 1) return "Baru saja"
  if (diffInMinutes < 60) return `${diffInMinutes} mnt yang lalu`
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours} jam yang lalu`
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function ForumDiskusi({ materi }) {
  const { currentUser, role, profileData } = useAuth()
  const [diskusiList, setDiskusiList] = useState([])
  const [loading, setLoading] = useState(true)
  const [komentarUtama, setKomentarUtama] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [replyingTo, setReplyingTo] = useState(null) // ID parent komentar
  const [balasanText, setBalasanText] = useState("")

  useEffect(() => {
    if (!materi?.id) return
    const unsub = subscribeForumByMateri(materi.id, (data) => {
      setDiskusiList(data)
      setLoading(false)
    })
    return () => unsub()
  }, [materi?.id])

  const userNama =
    role === "guru"
      ? profileData?.nama || "Guru Pengajar"
      : profileData?.nama || currentUser?.displayName || "Siswa"
  const userFoto = profileData?.fotoUrl || currentUser?.photoURL || null
  const userKelas = role === "murid" ? profileData?.kelasNama || "Siswa" : null

  async function handleKirimUtama(e) {
    e.preventDefault()
    if (!komentarUtama.trim() || submitting || !currentUser) return

    setSubmitting(true)
    try {
      await kirimDiskusi({
        materiId: materi.id,
        materiJudul: materi.judul,
        materiSlug: materi.slug || "",
        pengirimId: currentUser.uid,
        pengirimNama: userNama,
        pengirimFotoUrl: userFoto,
        pengirimRole: role || "murid",
        pengirimKelas: userKelas,
        isi: komentarUtama,
        parentId: null,
      })
      setKomentarUtama("")
    } catch (err) {
      console.error("Gagal mengirim diskusi:", err)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleKirimBalasan(parentId) {
    if (!balasanText.trim() || submitting || !currentUser) return

    setSubmitting(true)
    try {
      await kirimDiskusi({
        materiId: materi.id,
        materiJudul: materi.judul,
        materiSlug: materi.slug || "",
        pengirimId: currentUser.uid,
        pengirimNama: userNama,
        pengirimFotoUrl: userFoto,
        pengirimRole: role || "murid",
        pengirimKelas: userKelas,
        isi: balasanText,
        parentId: parentId,
      })
      setBalasanText("")
      setReplyingTo(null)
    } catch (err) {
      console.error("Gagal membalas diskusi:", err)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleHapus(id) {
    if (window.confirm("Apakah Anda yakin ingin menghapus pesan diskusi ini?")) {
      try {
        await hapusDiskusi(id)
      } catch (err) {
        console.error("Gagal menghapus pesan:", err)
      }
    }
  }

  // Pisahkan topik utama (parentId === null) dan balasan (parentId !== null)
  const topikUtama = diskusiList.filter((d) => !d.parentId)
  const getBalasan = (parentId) =>
    diskusiList.filter((d) => d.parentId === parentId)

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-7 space-y-6">
      {/* Header Forum */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Ruang Diskusi & Tanya Jawab</span>
              <Badge variant="secondary" className="text-[11px] font-bold px-2 py-0.5 rounded-full">
                {diskusiList.length} Pesan
              </Badge>
            </h3>
            <p className="text-xs text-slate-500">
              Diskusikan pertanyaan, pemahaman, atau gagasan seputar materi ini bersama teman dan guru.
            </p>
          </div>
        </div>
      </div>

      {/* Form Kirim Topik Diskusi Baru */}
      {currentUser ? (
        <form onSubmit={handleKirimUtama} className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-1">
              {userFoto ? (
                <img
                  src={userFoto}
                  alt={userNama}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                userNama?.charAt(0)?.toUpperCase() || "U"
              )}
            </div>
            <div className="flex-1 space-y-2">
              <Textarea
                placeholder="Ada yang ingin ditanyakan atau diskusikan mengenai materi ini? Tulis di sini..."
                value={komentarUtama}
                onChange={(e) => setKomentarUtama(e.target.value)}
                rows={2}
                className="resize-none text-xs sm:text-sm rounded-2xl border-slate-200 focus-visible:ring-indigo-500 bg-slate-50/50"
              />
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-slate-400">
                  Gunakan bahasa yang sopan dan santun
                </span>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!komentarUtama.trim() || submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold gap-1.5 h-8 px-4 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? "Mengirim..." : "Kirim Diskusi"}</span>
                </Button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
          Silakan masuk terlebih dahulu untuk ikut berdiskusi.
        </div>
      )}

      {/* Daftar Topik & Balasan */}
      <div className="space-y-4 pt-2">
        {loading ? (
          <div className="text-center py-8 text-xs text-slate-400">
            Memuat percakapan diskusi...
          </div>
        ) : topikUtama.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-slate-200 text-slate-400 space-y-2">
            <MessageSquare className="w-8 h-8 mx-auto text-slate-300 opacity-60" />
            <div className="text-xs font-semibold text-slate-600">
              Belum ada diskusi untuk materi ini
            </div>
            <p className="text-[11px] max-w-sm mx-auto">
              Jadilah yang pertama memulai pertanyaan atau pembahasan seru tentang materi ini!
            </p>
          </div>
        ) : (
          topikUtama.map((topik) => {
            const listBalasan = getBalasan(topik.id)
            const isGuru = topik.pengirimRole === "guru"
            const canDelete =
              role === "guru" || currentUser?.uid === topik.pengirimId

            return (
              <div
                key={topik.id}
                className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3 transition-all"
              >
                {/* Header Topik */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-xs ${
                        isGuru ? "bg-indigo-600 ring-2 ring-indigo-200" : "bg-blue-600"
                      }`}
                    >
                      {topik.pengirimFotoUrl ? (
                        <img
                          src={topik.pengirimFotoUrl}
                          alt={topik.pengirimNama}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        topik.pengirimNama?.charAt(0)?.toUpperCase() || "U"
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-slate-900">
                          {topik.pengirimNama}
                        </span>
                        {isGuru ? (
                          <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 text-[10px] font-black px-1.5 py-0 border-none">
                            <GraduationCap className="w-3 h-3 mr-1 inline" /> Guru
                          </Badge>
                        ) : topik.pengirimKelas ? (
                          <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-200 px-1.5 py-0">
                            {topik.pengirimKelas}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{formatWaktu(topik.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleHapus(topik.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors"
                      title="Hapus pesan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Isi Komentar */}
                <div className="text-xs sm:text-sm text-slate-700 leading-relaxed pl-1 whitespace-pre-line">
                  {topik.isi}
                </div>

                {/* Aksi Topik: Balas */}
                <div className="flex items-center gap-3 pt-1 border-t border-slate-200/60 text-[11px]">
                  {currentUser && (
                    <button
                      type="button"
                      onClick={() =>
                        setReplyingTo(replyingTo === topik.id ? null : topik.id)
                      }
                      className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-indigo-50 transition-colors"
                    >
                      <Reply className="w-3 h-3" />
                      <span>{replyingTo === topik.id ? "Batal Balas" : "Balas"}</span>
                    </button>
                  )}
                  {listBalasan.length > 0 && (
                    <span className="text-slate-400 font-semibold text-[10px]">
                      {listBalasan.length} Balasan
                    </span>
                  )}
                </div>

                {/* Form Balasan */}
                {replyingTo === topik.id && (
                  <div className="pl-4 sm:pl-6 pt-2 space-y-2 border-l-2 border-indigo-200 mt-2">
                    <Textarea
                      placeholder={`Balas pesan dari ${topik.pengirimNama}...`}
                      value={balasanText}
                      onChange={(e) => setBalasanText(e.target.value)}
                      rows={2}
                      className="resize-none text-xs rounded-xl border-slate-200 focus-visible:ring-indigo-500 bg-white"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setReplyingTo(null)
                          setBalasanText("")
                        }}
                        className="text-xs h-7 px-3 rounded-lg text-slate-500"
                      >
                        Batal
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={!balasanText.trim() || submitting}
                        onClick={() => handleKirimBalasan(topik.id)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold h-7 px-3 gap-1"
                      >
                        <Send className="w-3 h-3" />
                        <span>Kirim Balasan</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Daftar Balasan (Nested) */}
                {listBalasan.length > 0 && (
                  <div className="pl-3 sm:pl-6 space-y-2.5 pt-2 border-l-2 border-slate-200 mt-2">
                    {listBalasan.map((balasan) => {
                      const isBalasanGuru = balasan.pengirimRole === "guru"
                      const canDeleteBalasan =
                        role === "guru" ||
                        currentUser?.uid === balasan.pengirimId

                      return (
                        <div
                          key={balasan.id}
                          className="p-3 rounded-xl bg-white border border-slate-200/90 space-y-1.5 shadow-2xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${
                                  isBalasanGuru
                                    ? "bg-indigo-600 ring-2 ring-indigo-200"
                                    : "bg-blue-600"
                                }`}
                              >
                                {balasan.pengirimFotoUrl ? (
                                  <img
                                    src={balasan.pengirimFotoUrl}
                                    alt={balasan.pengirimNama}
                                    className="w-full h-full object-cover rounded-full"
                                  />
                                ) : (
                                  balasan.pengirimNama?.charAt(0)?.toUpperCase() || "U"
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-xs text-slate-900">
                                  {balasan.pengirimNama}
                                </span>
                                {isBalasanGuru ? (
                                  <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 text-[9px] font-black px-1.5 py-0 border-none">
                                    Guru
                                  </Badge>
                                ) : balasan.pengirimKelas ? (
                                  <Badge variant="outline" className="text-[9px] text-slate-500 border-slate-200 px-1 py-0">
                                    {balasan.pengirimKelas}
                                  </Badge>
                                ) : null}
                                <span className="text-[10px] text-slate-400">
                                  &bull; {formatWaktu(balasan.createdAt)}
                                </span>
                              </div>
                            </div>

                            {canDeleteBalasan && (
                              <button
                                type="button"
                                onClick={() => handleHapus(balasan.id)}
                                className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors"
                                title="Hapus balasan"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          <div className="text-xs text-slate-700 leading-relaxed pl-8 whitespace-pre-line">
                            {balasan.isi}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

