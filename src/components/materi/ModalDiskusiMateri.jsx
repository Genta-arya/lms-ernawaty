import React, { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import {
  subscribeForumByMateri,
  kirimDiskusi,
  hapusDiskusi,
} from "@/services/forumDiskusi"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  MessageSquare,
  Send,
  Reply,
  Trash2,
  GraduationCap,
  Clock,
  BookOpen,
  ExternalLink,
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

export function ModalDiskusiMateri({ isOpen, onClose, materi }) {
  const { currentUser, role, profileData } = useAuth()
  const [diskusiList, setDiskusiList] = useState([])
  const [loading, setLoading] = useState(true)
  const [komentarUtama, setKomentarUtama] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [replyingTo, setReplyingTo] = useState(null)
  const [balasanText, setBalasanText] = useState("")

  useEffect(() => {
    if (!isOpen || !materi?.id) return
    setLoading(true)
    const unsub = subscribeForumByMateri(materi.id, (data) => {
      setDiskusiList(data)
      setLoading(false)
    })
    return () => unsub()
  }, [isOpen, materi?.id])

  if (!isOpen || !materi) return null

  const userNama = profileData?.nama || "Guru Pengajar"
  const userFoto = profileData?.fotoUrl || currentUser?.photoURL || null

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
        pengirimRole: role || "guru",
        pengirimKelas: null,
        isi: komentarUtama,
        parentId: null,
      })
      setKomentarUtama("")
    } catch (err) {
      console.error("Gagal mengirim tanggapan:", err)
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
        pengirimRole: role || "guru",
        pengirimKelas: null,
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
    if (window.confirm("Hapus pesan ini dari ruang diskusi materi?")) {
      try {
        await hapusDiskusi(id)
      } catch (err) {
        console.error("Gagal menghapus pesan:", err)
      }
    }
  }

  const topikUtama = diskusiList.filter((d) => !d.parentId)
  const getBalasan = (parentId) =>
    diskusiList.filter((d) => d.parentId === parentId)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[88vh] flex flex-col p-0 overflow-hidden rounded-3xl">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white shrink-0">
          <div className="flex items-center justify-between pr-8">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur">
                  Forum Diskusi Modul
                </span>
                <span className="text-xs text-indigo-100 font-semibold">
                  {diskusiList.length} Pesan
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold line-clamp-1">
                {materi.judul}
              </h2>
            </div>
          </div>
        </div>

        {/* Modal Body / Chat List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
          {loading ? (
            <div className="text-center py-12 text-xs text-slate-400">
              Memuat percakapan diskusi materi...
            </div>
          ) : topikUtama.length === 0 ? (
            <div className="text-center py-14 px-4 rounded-2xl border border-dashed border-slate-200 text-slate-400 space-y-2 bg-white">
              <MessageSquare className="w-10 h-10 mx-auto text-slate-300 opacity-60" />
              <div className="text-sm font-bold text-slate-700">
                Belum ada pertanyaan atau diskusi
              </div>
              <p className="text-xs max-w-sm mx-auto text-slate-500">
                Siswa belum mengajukan pertanyaan di modul materi ini. Anda juga dapat memulai memberikan arahan atau pemantik diskusi.
              </p>
            </div>
          ) : (
            topikUtama.map((topik) => {
              const listBalasan = getBalasan(topik.id)
              const isItemGuru = topik.pengirimRole === "guru"

              return (
                <div
                  key={topik.id}
                  className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3"
                >
                  {/* Header Topik */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                          isItemGuru
                            ? "bg-indigo-600 ring-2 ring-indigo-200"
                            : "bg-blue-600"
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
                          {isItemGuru ? (
                            <Badge className="bg-indigo-100 text-indigo-700 text-[9px] font-black px-1.5 py-0 border-none">
                              <GraduationCap className="w-3 h-3 mr-1 inline" /> Guru
                            </Badge>
                          ) : topik.pengirimKelas ? (
                            <Badge variant="outline" className="text-[9px] text-slate-500 border-slate-200 px-1.5 py-0">
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

                    <button
                      type="button"
                      onClick={() => handleHapus(topik.id)}
                      className="text-slate-300 hover:text-rose-600 p-1 rounded-lg transition-colors"
                      title="Hapus pesan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Isi Komentar */}
                  <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line pl-1">
                    {topik.isi}
                  </div>

                  {/* Aksi Guru: Balas */}
                  <div className="flex items-center gap-3 pt-1 border-t border-slate-100 text-[11px]">
                    <button
                      type="button"
                      onClick={() =>
                        setReplyingTo(replyingTo === topik.id ? null : topik.id)
                      }
                      className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 py-0.5 px-2 rounded-lg hover:bg-indigo-50 transition-colors"
                    >
                      <Reply className="w-3 h-3" />
                      <span>{replyingTo === topik.id ? "Batal" : "Tanggapi"}</span>
                    </button>
                    {listBalasan.length > 0 && (
                      <span className="text-slate-400 font-semibold text-[10px]">
                        {listBalasan.length} Balasan
                      </span>
                    )}
                  </div>

                  {/* Input Tanggapan Balasan Guru */}
                  {replyingTo === topik.id && (
                    <div className="pl-4 sm:pl-6 pt-2 space-y-2 border-l-2 border-indigo-200 mt-2">
                      <Textarea
                        placeholder={`Tulis arahan / jawaban guru untuk ${topik.pengirimNama}...`}
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
                          <span>Kirim Tanggapan</span>
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Sub-Balasan */}
                  {listBalasan.length > 0 && (
                    <div className="pl-3 sm:pl-6 space-y-2 pt-2 border-l-2 border-slate-200 mt-2">
                      {listBalasan.map((balasan) => {
                        const isSubGuru = balasan.pengirimRole === "guru"
                        return (
                          <div
                            key={balasan.id}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${
                                    isSubGuru
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
                                  {isSubGuru ? (
                                    <Badge className="bg-indigo-100 text-indigo-700 text-[9px] font-black px-1.5 py-0 border-none">
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

                              <button
                                type="button"
                                onClick={() => handleHapus(balasan.id)}
                                className="text-slate-300 hover:text-rose-600 p-0.5 rounded transition-colors"
                                title="Hapus balasan"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
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

        {/* Input Kirim Topik/Arahan Baru dari Guru */}
        <div className="p-4 bg-white border-t border-slate-200">
          <form onSubmit={handleKirimUtama} className="flex gap-2 items-center">
            <Textarea
              placeholder="Tulis instruksi, pertanyaan pemantik, atau tanggapan baru..."
              value={komentarUtama}
              onChange={(e) => setKomentarUtama(e.target.value)}
              rows={1}
              className="resize-none text-xs rounded-xl border-slate-200 focus-visible:ring-indigo-500 bg-slate-50 min-h-[40px] max-h-[90px]"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!komentarUtama.trim() || submitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold h-10 px-4 shrink-0 gap-1.5 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kirim</span>
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

