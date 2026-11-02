import React, { useState, useEffect } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { getDetailKelasDanTeman } from "@/services/kelas"
import { ChatKelasRealtime } from "@/components/kelas/ChatKelasRealtime"
import { subscribeAllPresences } from "@/services/presence"
import { subscribeUnreadPribadiCounts } from "@/services/chatPribadi"
import { ModalChatPribadi } from "@/components/kelas/ModalChatPribadi"
import { UserAvatar } from "@/components/common/UserAvatar"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DashboardMuridSkeleton } from "@/components/ui/loading-skeletons"
import {
  Users,
  GraduationCap,
  Trophy,
  ClipboardList,
  Sparkles,
  Search,
  ArrowLeft,
  ChevronRight,
  Medal,
  Award,
  BookOpen,
  MessageSquare,
  MessageCircle,
} from "lucide-react"

export function MuridKelas() {
  const { currentUser, profileData } = useAuth()
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get("tab") === "chat" ? "chat" : "semua"

  const [kelasData, setKelasData] = useState(null)
  const [temanList, setTemanList] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState(initialTab) // "semua" | "skor-kuis" | "nilai-tugas" | "chat"
  const [selectedMurid, setSelectedMurid] = useState(null)
  const [chatTargetMurid, setChatTargetMurid] = useState(null)
  const [presencesMap, setPresencesMap] = useState({})
  const [unreadMap, setUnreadMap] = useState({})

  // Buka chat dan hilangkan badge unread secara instan
  const openChatWithTarget = (target) => {
    setChatTargetMurid(target)
    if (target?.nisn || target?.uid) {
      setUnreadMap((prev) => {
        const next = { ...prev }
        if (target.nisn) delete next[String(target.nisn)]
        if (target.uid) delete next[String(target.uid)]
        return next
      })
    }
  }

  // Berlangganan presence semua siswa dan unread badge pesan pribadi
  useEffect(() => {
    const unsubPresence = subscribeAllPresences((pMap) => {
      setPresencesMap(pMap)
    })

    const myIdentifiers = [
      currentUser?.uid ? String(currentUser.uid) : null,
      profileData?.nisn ? String(profileData.nisn) : null,
    ].filter(Boolean)

    const unsubUnread = subscribeUnreadPribadiCounts(myIdentifiers, (uMap) => {
      setUnreadMap(uMap)
    })

    return () => {
      unsubPresence()
      unsubUnread()
    }
  }, [currentUser?.uid, profileData?.nisn])

  // Sinkronkan tab aktif jika parameter query berubah (misal diklik dari menu notifikasi)
  useEffect(() => {
    const tabParam = searchParams.get("tab")
    if (tabParam === "chat") {
      setActiveTab("chat")
    }

    const chatWith = searchParams.get("chatWith")
    const chatName = searchParams.get("chatName")
    if (chatWith) {
      // Cari teman di list atau buat target dari parameter
      const matched = temanList.find(
        (t) => String(t.nisn) === String(chatWith) || String(t.uid) === String(chatWith)
      )
      if (matched) {
        openChatWithTarget(matched)
      } else {
        openChatWithTarget({
          nisn: chatWith.length <= 15 ? chatWith : null,
          uid: chatWith,
          nama: chatName ? decodeURIComponent(chatName) : "Teman",
        })
      }
    }
  }, [searchParams, temanList])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })

    async function load() {
      if (!profileData) {
        setLoading(false)
        return
      }
      try {
        const { kelas, teman } = await getDetailKelasDanTeman(profileData.kelasId, profileData)
        setKelasData(kelas)
        setTemanList(teman)
      } catch (err) {
        console.error("Gagal memuat detail kelas murid:", err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [profileData])

  if (loading) {
    return <DashboardMuridSkeleton />
  }

  // Filter pencarian nama siswa
  const filteredTeman = temanList.filter((t) => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    return t.nama?.toLowerCase().includes(q) || t.nisn?.includes(q)
  })

  // Urutan berdasarkan filter tab
  let sortedTeman = [...filteredTeman]
  if (activeTab === "skor-kuis") {
    sortedTeman.sort((a, b) => b.avgKuis - a.avgKuis || b.maxKuis - a.maxKuis)
  } else if (activeTab === "nilai-tugas") {
    sortedTeman.sort((a, b) => b.avgTugas - a.avgTugas || b.tugasCount - a.tugasCount)
  }

  // Rata-rata kelas
  const totalSiswa = temanList.length
  const totalAvgKuisKelas = totalSiswa > 0
    ? Math.round(temanList.reduce((acc, curr) => acc + curr.avgKuis, 0) / totalSiswa)
    : 0
  const totalAvgTugasKelas = totalSiswa > 0
    ? Math.round(temanList.reduce((acc, curr) => acc + curr.avgTugas, 0) / totalSiswa)
    : 0

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Tombol Kembali ke Beranda Siswa */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild className="gap-2 text-slate-600 hover:text-slate-900 rounded-xl">
          <Link to="/murid">
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Beranda
          </Link>
        </Button>
      </div>

      {/* Header Banner Kelas Siswa */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white rounded-3xl p-5 sm:p-7 shadow-lg shadow-blue-500/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-white text-xs font-semibold w-fit">
            <GraduationCap className="w-4 h-4 text-amber-300" />
            <span>Ruang Belajar Kelas</span>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-white/20 text-white border-white/20 text-xs font-bold px-3 py-1">
              Tahun Ajaran {kelasData?.tahunAjaran || "2024/2025"}
            </Badge>
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Kelas {kelasData?.nama || profileData?.kelasNama || "Saya"}
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 mt-1 max-w-2xl leading-relaxed">
            {kelasData?.keterangan || "Tempat kebersamaan belajar Bahasa Indonesia bersama teman sekelas."}
          </p>
        </div>

        {/* Statistik Cepat Kelas */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4 pt-2">
          <div className="bg-white/10 rounded-2xl p-3 border border-white/10 backdrop-blur text-center">
            <div className="text-[10px] sm:text-xs text-blue-100 font-medium">Total Teman</div>
            <div className="text-lg sm:text-2xl font-black text-white mt-0.5">{totalSiswa}</div>
            <div className="text-[9px] sm:text-[10px] text-blue-200 mt-0.5">Siswa Terdaftar</div>
          </div>

          <div className="bg-white/10 rounded-2xl p-3 border border-white/10 backdrop-blur text-center">
            <div className="text-[10px] sm:text-xs text-blue-100 font-medium">Rata-rata Kuis</div>
            <div className="text-lg sm:text-2xl font-black text-amber-300 mt-0.5">{totalAvgKuisKelas}</div>
            <div className="text-[9px] sm:text-[10px] text-blue-200 mt-0.5">Skor Formatif</div>
          </div>

          <div className="bg-white/10 rounded-2xl p-3 border border-white/10 backdrop-blur text-center">
            <div className="text-[10px] sm:text-xs text-blue-100 font-medium">Rata-rata Tugas</div>
            <div className="text-lg sm:text-2xl font-black text-emerald-300 mt-0.5">{totalAvgTugasKelas}</div>
            <div className="text-[9px] sm:text-[10px] text-blue-200 mt-0.5">Penilaian Guru</div>
          </div>
        </div>
      </div>

      {/* Filter Tab & Pencarian Teman */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Input Cari */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari teman sekelas berdasarkan nama atau NISN..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs"
          />
        </div>

        {/* Tab Urutan */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl shrink-0 overflow-x-auto no-scrollbar">
          {[
            { id: "semua", label: "Daftar Teman", icon: Users },
            { id: "skor-kuis", label: "Peringkat Kuis", icon: Trophy },
            { id: "nilai-tugas", label: "Nilai Tugas", icon: ClipboardList },
            { id: "chat", label: "Obrolan Kelas", icon: MessageSquare },
          ].map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
                  active
                    ? "bg-white text-blue-600 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tampilan Obrolan Realtime Kelas */}
      {activeTab === "chat" ? (
        <ChatKelasRealtime
          kelasId={kelasData?.id || profileData?.kelasId}
          kelasNama={kelasData?.nama || profileData?.kelasNama}
        />
      ) : sortedTeman.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-3xl bg-slate-50/60 p-6">
          <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto mb-3 shadow-xs text-slate-400">
            <Users className="w-7 h-7 stroke-[1.6]" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">Tidak ada siswa ditemukan</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `Tidak ada teman sekelas yang cocok dengan kata kunci "${searchQuery}".`
              : "Belum ada siswa yang terdaftar di kelas ini."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {sortedTeman.map((murid, index) => {
            const isMe = murid.nisn === profileData?.nisn || (currentUser && murid.uid === currentUser.uid)
            const rank = index + 1

            // Hitung status presence
            const pData = (murid.uid && presencesMap[String(murid.uid)]) || (murid.nisn && presencesMap[String(murid.nisn)]) || null
            const isUserOnline = isMe ? true : (pData?.isOnline === true)
            const statusText = isMe ? "Online" : (pData?.lastSeenText || "Offline")

            // Hitung counter unread
            const unreadCount = !isMe
              ? ((murid.nisn && unreadMap[String(murid.nisn)]) || (murid.uid && unreadMap[String(murid.uid)]) || 0)
              : 0

            return (
              <Card
                key={murid.nisn}
                onClick={() => setSelectedMurid(murid)}
                className={`cursor-pointer transition-all rounded-3xl border overflow-hidden hover:shadow-md relative ${
                  isMe
                    ? "border-blue-400 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 ring-2 ring-blue-500/20"
                    : "border-slate-200/90 bg-white hover:border-blue-300"
                }`}
              >
                <CardContent className="p-4 sm:p-5 space-y-3.5">
                  <div className="flex items-center gap-3">
                    {/* Rank Badge jika sedang mode peringkat */}
                    {activeTab !== "semua" && (
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                        rank === 1
                          ? "bg-amber-100 text-amber-700 ring-2 ring-amber-300"
                          : rank === 2
                          ? "bg-slate-200 text-slate-700"
                          : rank === 3
                          ? "bg-orange-100 text-orange-800"
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        {rank}
                      </div>
                    )}

                    <div className="relative shrink-0">
                      <UserAvatar
                        fotoUrl={murid.fotoUrl}
                        nama={murid.nama}
                        size="sm"
                        className="w-11 h-11 rounded-2xl ring-2 ring-slate-100"
                      />
                      {/* Indikator Titik Online pada Avatar */}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                          isUserOnline
                            ? "bg-emerald-500 ring-1 ring-emerald-300 animate-pulse"
                            : "bg-slate-300"
                        }`}
                        title={isUserOnline ? "Online" : "Offline"}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                            {murid.nama}
                          </h4>
                          {isMe && (
                            <Badge className="bg-blue-600 text-white text-[9px] font-black px-1.5 py-0 rounded shrink-0">
                              Saya
                            </Badge>
                          )}
                        </div>

                        {/* Badge Unread Chat jika ada pesan belum terbaca dari teman ini */}
                        {unreadCount > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              openChatWithTarget(murid)
                            }}
                            className="min-w-5 h-5 px-1.5 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center shrink-0 shadow-xs animate-bounce hover:scale-110 active:scale-95 transition-transform"
                            title={`${unreadCount} pesan baru belum dibaca - klik untuk buka chat`}
                          >
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </button>
                        )}
                      </div>

                      {/* Baris Badge Online / Offline / Terakhir Dilihat */}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {isUserOnline ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-700 font-extrabold text-[10px] border border-emerald-200/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Online
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium truncate">
                            {statusText}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Nilai Skor Kuis & Tugas */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-center">
                    <div className="bg-amber-50/70 p-2 rounded-xl border border-amber-100/80">
                      <div className="text-[10px] font-bold text-amber-800 flex items-center justify-center gap-1">
                        <Trophy className="w-3 h-3 text-amber-600" />
                        <span>Skor Kuis</span>
                      </div>
                      <div className="text-base font-black text-amber-900 mt-0.5">
                        {murid.avgKuis || 0}
                      </div>
                      <div className="text-[9px] text-amber-700/80">
                        {murid.kuisCount || 0} kuis diikuti
                      </div>
                    </div>

                    <div className="bg-emerald-50/70 p-2 rounded-xl border border-emerald-100/80">
                      <div className="text-[10px] font-bold text-emerald-800 flex items-center justify-center gap-1">
                        <ClipboardList className="w-3 h-3 text-emerald-600" />
                        <span>Nilai Tugas</span>
                      </div>
                      <div className="text-base font-black text-emerald-900 mt-0.5">
                        {murid.avgTugas || 0}
                      </div>
                      <div className="text-[9px] text-emerald-700/80">
                        {murid.tugasCount || 0} tugas dinilai
                      </div>
                    </div>
                  </div>

                  {!isMe && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        setChatTargetMurid(murid)
                      }}
                      className="w-full text-xs font-bold rounded-xl h-8 gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50 mt-1"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-blue-600" />
                      <span>Chat Pribadi</span>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal Obrolan Pribadi Antar Siswa */}
      {chatTargetMurid && (
        <ModalChatPribadi
          targetMurid={chatTargetMurid}
          onClose={() => setChatTargetMurid(null)}
        />
      )}

      {/* Modal Popup Detail Nilai & Riwayat Siswa yang Dipilih */}
      {selectedMurid && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setSelectedMurid(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full max-h-[85vh] overflow-y-auto p-5 sm:p-6 space-y-5 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Profil Teman */}
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <UserAvatar
                fotoUrl={selectedMurid.fotoUrl}
                nama={selectedMurid.nama}
                size="md"
                className="w-12 h-12 rounded-2xl ring-2 ring-blue-500/20 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base truncate">
                    {selectedMurid.nama}
                  </h3>
                  {selectedMurid.nisn === profileData?.nisn && (
                    <Badge className="bg-blue-600 text-white text-[9px] font-black px-1.5 py-0">Saya</Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  NISN: {selectedMurid.nisn} &bull; Kelas {kelasData?.nama || profileData?.kelasNama}
                </p>
              </div>
            </div>

            {/* Rangkuman Nilai */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/80">
                <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-600" />
                  <span>Rata-Rata Kuis</span>
                </div>
                <div className="text-2xl font-black text-amber-950 mt-1">
                  {selectedMurid.avgKuis || 0}
                </div>
                <div className="text-[10px] text-amber-700 mt-0.5">
                  Tertinggi: {selectedMurid.maxKuis || 0} ({selectedMurid.kuisCount || 0} kuis)
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200/80">
                <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <ClipboardList className="w-4 h-4 text-emerald-600" />
                  <span>Rata-Rata Tugas</span>
                </div>
                <div className="text-2xl font-black text-emerald-950 mt-1">
                  {selectedMurid.avgTugas || 0}
                </div>
                <div className="text-[10px] text-emerald-700 mt-0.5">
                  {selectedMurid.tugasCount || 0} tugas telah dinilai
                </div>
              </div>
            </div>

            {/* Rincian Pengerjaan Kuis */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span>Riwayat Kuis ({selectedMurid.kuisList?.length || 0})</span>
              </h4>
              {(!selectedMurid.kuisList || selectedMurid.kuisList.length === 0) ? (
                <p className="text-xs text-slate-400 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  Belum ada catatan pengerjaan kuis.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {selectedMurid.kuisList.map((k, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <span className="truncate font-medium text-slate-700">{k.kuisJudul}</span>
                      <span className="font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg shrink-0">
                        {k.skor}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rincian Penilaian Tugas */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5 text-emerald-500" />
                <span>Riwayat Nilai Tugas ({selectedMurid.tugasList?.length || 0})</span>
              </h4>
              {(!selectedMurid.tugasList || selectedMurid.tugasList.length === 0) ? (
                <p className="text-xs text-slate-400 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  Belum ada tugas yang dinilai guru.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {selectedMurid.tugasList.map((t, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <span className="truncate font-medium text-slate-700">{t.tugasJudul}</span>
                      <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg shrink-0">
                        {t.nilai}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              {selectedMurid.nisn !== profileData?.nisn && (
                <Button
                  type="button"
                  onClick={() => {
                    const target = selectedMurid
                    setSelectedMurid(null)
                    openChatWithTarget(target)
                  }}
                  className="flex-1 text-xs font-bold rounded-xl h-10 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Kirim Pesan Pribadi</span>
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedMurid(null)}
                className="flex-1 text-xs font-bold rounded-xl h-10"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

