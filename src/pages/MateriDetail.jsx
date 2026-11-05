import React, { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { getMateriBySlug } from "@/services/materi"
import { getKuisByMateriId } from "@/services/kuis"
import { markMateriSelesai, getProgresMurid } from "@/services/progres"
import { useAuth } from "@/context/AuthContext"
import { normalizeTingkatRomawi, isMateriCocokTingkat } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DetailPageSkeleton } from "@/components/ui/loading-skeletons"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { LeaderboardHarian } from "@/components/kuis/LeaderboardHarian"
import { ForumDiskusi } from "@/components/materi/ForumDiskusi"
import { MateriAudioPlayer } from "@/components/materi/MateriAudioPlayer"
import {
  BookOpen,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  FileQuestion,
  Sparkles,
  Check,
  ListChecks,
  ArrowUp,
  Lock,
  Link as LinkIcon,
  ExternalLink,
  FileText,
  Video,
  Globe,
  FolderOpen,
} from "lucide-react"

export function MateriDetail() {
  const { slug } = useParams()
  const { currentUser, role, profileData } = useAuth()
  const [materi, setMateri] = useState(null)
  const [kuisList, setKuisList] = useState([])
  const [isSelesai, setIsSelesai] = useState(false)
  const [loading, setLoading] = useState(true)
  const [savingProgress, setSavingProgress] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [currentBagianIndex, setCurrentBagianIndex] = useState(0)
  const [maxUnlockedIndex, setMaxUnlockedIndex] = useState(0)

  // Tujuan tombol kembali: jika murid/login ke /murid, jika guru ke /guru/materi, lainnya ke /murid
  const backTarget = role === "guru" ? "/guru/materi" : role === "murid" ? "/murid/materi" : "/"

  useEffect(() => {
    // Otomatis scroll ke paling atas saat halaman pertama kali dirender
    window.scrollTo({ top: 0, behavior: "smooth" })

    // Listener tombol scroll on top jika pengguna menggulir lebih dari 300px
    function handleScroll() {
      if (window.scrollY > 300) {
        setShowScrollTop(true)
      } else {
        setShowScrollTop(false)
      }
    }
    window.addEventListener("scroll", handleScroll)

    async function load() {
      try {
        const mat = await getMateriBySlug(slug, role === "guru")
        if (mat) {
          setMateri(mat)
          if (mat.judul) {
            document.title = `${mat.judul} - LMS SMPN 3 Ketapang`
          }
          // Load kuis terkait
          const kuis = await getKuisByMateriId(mat.id, role === "guru")
          setKuisList(kuis)

          // Cek progres murid jika login
          if (role === "murid" && currentUser) {
            const prog = await getProgresMurid(currentUser.uid)
            const done = !!prog[mat.id]
            setIsSelesai(done)
            if (done && mat.bagian?.length) {
              setMaxUnlockedIndex(mat.bagian.length - 1)
            }
          }
        }
      } catch (err) {
        console.error("Gagal memuat detail materi:", err)
      } finally {
        setLoading(false)
      }
    }
    load()

    return () => window.removeEventListener("scroll", handleScroll)
  }, [slug, currentUser, role])

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function handleSelesaiMateri() {
    if (!currentUser || role !== "murid" || !materi || isSelesai) return
    setSavingProgress(true)
    try {
      await markMateriSelesai(currentUser.uid, profileData?.nisn || "", materi.id, true)
      setIsSelesai(true)
      if (materi.bagian?.length) {
        setMaxUnlockedIndex(materi.bagian.length - 1)
      }
    } catch (err) {
      console.error("Gagal menandai progres:", err)
    } finally {
      setSavingProgress(false)
    }
  }

  if (loading) {
    return <DetailPageSkeleton icon={BookOpen} label="Menyiapkan modul pembelajaran..." />
  }

  if (!materi) {
    return (
      <div className="container max-w-md py-20 text-center">
        <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
        <h2 className="text-xl font-bold">Materi Tidak Ditemukan</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-6">
          Materi mungkin belum diterbitkan atau tautan yang Anda buka tidak valid.
        </p>
        <Button asChild>
          <Link to={backTarget}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Link>
        </Button>
      </div>
    )
  }

  // Pengecekan Hak Akses Tingkat Kelas untuk Siswa
  const studentTingkat =
    role === "murid"
      ? normalizeTingkatRomawi(profileData?.tingkat || profileData?.kelasNama)
      : null
  const isAccessible = !studentTingkat || isMateriCocokTingkat(materi.tingkat, studentTingkat)

  if (!isAccessible) {
    return (
      <div className="container max-w-lg py-20 text-center space-y-5 animate-in fade-in duration-300">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto border border-rose-200 shadow-xs">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
            Akses Materi Terbatas
          </span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Materi Khusus Kelas {materi.tingkat?.join(", ")}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
            Materi pembelajaran <b>"{materi.judul}"</b> hanya diperuntukkan bagi siswa <b>Kelas {materi.tingkat?.join(", ")}</b>.
            <br />
            Sebagai siswa <b>{profileData?.kelasNama || `Kelas ${studentTingkat}`}</b>, Anda hanya dapat mengakses materi pembelajaran kurikulum kelas Anda.
          </p>
        </div>
        <div className="pt-2">
          <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl h-11 px-6 shadow-md shadow-blue-500/20">
            <Link to={backTarget}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-5xl py-6 md:py-8 overflow-hidden">
      {/* Tombol Kembali ke Beranda Murid */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="gap-2 text-slate-600 hover:text-slate-900">
          <Link to={backTarget}>
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Kolom Konten Utama */}
        <div className="lg:col-span-3 min-w-0 space-y-8">
          {/* Header Materi */}
          <div className="border-b pb-6 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{materi.topik || "Bahasa Inggris"}</Badge>
              <Badge variant="outline">Fase D</Badge>
              {materi.tingkat?.map((t) => (
                <Badge key={t} variant="outline" className="bg-primary/5 text-primary border-primary/20">
                  Kelas {t}
                </Badge>
              ))}
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground break-words">
              {materi.judul}
            </h1>

            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed break-words">
              {materi.deskripsi}
            </p>
          </div>

          {/* Tujuan Pembelajaran */}
          {materi.tujuan && materi.tujuan.length > 0 && (
            <Card className="bg-blue-50/50 border-blue-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-900">
                  <ListChecks className="w-4 h-4 text-blue-600 shrink-0" />
                  Tujuan Pembelajaran:
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="list-disc list-inside text-xs sm:text-sm text-blue-950 space-y-1.5 leading-relaxed break-words">
                  {materi.tujuan.map((tuj, idx) => (
                    <li key={idx} className="break-words">{tuj}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Tautan Materi Pembelajaran & Referensi Eksternal */}
          {materi.linkMateri && materi.linkMateri.length > 0 && (
            <Card className="border border-blue-200/90 bg-gradient-to-br from-blue-50/60 via-white to-indigo-50/30 rounded-2xl overflow-hidden shadow-2xs">
              <CardHeader className="pb-3 border-b border-blue-100/80">
                <CardTitle className="text-sm font-extrabold flex items-center gap-2 text-blue-950">
                  <LinkIcon className="w-4 h-4 text-blue-600" />
                  <span>Berkas & Tautan Materi Pendukung:</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {materi.linkMateri.map((item, idx) => {
                    const isDrive = item.jenis === "drive"
                    const isCanva = item.jenis === "canva"
                    const isPdf = item.jenis === "pdf"
                    const isVideo = item.jenis === "video"

                    return (
                      <a
                        key={idx}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group p-3 rounded-xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            {isDrive ? (
                              <FolderOpen className="w-4 h-4" />
                            ) : isPdf ? (
                              <FileText className="w-4 h-4" />
                            ) : isVideo ? (
                              <Video className="w-4 h-4" />
                            ) : (
                              <Globe className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-slate-800 group-hover:text-blue-700 transition-colors truncate">
                              {item.judul || "Buka Berkas Materi"}
                            </div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                              {isDrive
                                ? "Google Drive / Dokumen"
                                : isCanva
                                  ? "Desain Canva"
                                  : isPdf
                                    ? "Dokumen PDF"
                                    : isVideo
                                      ? "Video Pembelajaran"
                                      : "Tautan Eksternal"}
                            </div>
                          </div>
                        </div>

                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0 transition-colors" />
                      </a>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Breakdown Interaktif Mode LMS Per Bab */}
          {(!materi.bagian || materi.bagian.length === 0) ? (
            <div className="p-8 text-center border rounded-2xl bg-slate-50/60 text-muted-foreground text-sm">
              Materi ini belum memiliki rincian Bab pembelajaran.
            </div>
          ) : (
            <div className="space-y-6 min-w-0">
              {/* Stepper Progres Interaktif */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white border border-blue-100/90 shadow-2xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-extrabold text-blue-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Bab {currentBagianIndex + 1} dari {materi.bagian.length}
                  </span>
                  <span className="font-bold text-slate-500 text-[11px]">
                    {Math.round(((currentBagianIndex + 1) / materi.bagian.length) * 100)}% selesai dibaca
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentBagianIndex + 1) / materi.bagian.length) * 100}%` }}
                  />
                </div>

                {/* Pill Navigasi Cepat Antar Bab */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
                  {materi.bagian.map((b, idx) => {
                    const isCurrent = idx === currentBagianIndex
                    const isPassed = idx < currentBagianIndex
                    const isLocked = role === "murid" && !isSelesai && idx > maxUnlockedIndex

                    return (
                      <button
                        key={b.id || idx}
                        type="button"
                        disabled={isLocked}
                        onClick={() => {
                          if (isLocked) return
                          setCurrentBagianIndex(idx)
                          scrollToTop()
                        }}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${isCurrent
                            ? "bg-blue-600 text-white shadow-xs"
                            : isLocked
                              ? "bg-slate-100/70 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60"
                              : isPassed
                                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 cursor-pointer"
                                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                          }`}
                        title={isLocked ? "Selesaikan Bab sebelumnya terlebih dahulu" : b.judul}
                      >
                        {isLocked ? (
                          <Lock className="w-3 h-3 text-slate-400" />
                        ) : isPassed ? (
                          <Check className="w-3 h-3 text-emerald-700" />
                        ) : null}
                        <span>Bab {idx + 1}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Konten Bab yang Sedang Aktif */}
              {(() => {
                const bag = materi.bagian[currentBagianIndex] || materi.bagian[0]
                const isLastBagian = currentBagianIndex === materi.bagian.length - 1
                const isFirstBagian = currentBagianIndex === 0

                return (
                  <section id="konten-materi-aktif" className="space-y-6 min-w-0 bg-white p-5 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <span className="text-xs font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-xl shrink-0 border border-blue-200/60">
                        Bab {currentBagianIndex + 1} dari {materi.bagian.length}
                      </span>
                      <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 break-words">
                        {bag.judul}
                      </h2>
                    </div>

                    {/* Fitur Canggih: Text to Speech (Audio Narasi Materi) */}
                    <MateriAudioPlayer
                      judulBab={bag.judul}
                      kontenMarkdown={bag.konten}
                    />

                    <div className="prose prose-slate rich-editor-content max-w-none text-sm sm:text-base leading-relaxed break-words overflow-x-auto">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          table: ({ node, ...props }) => (
                            <div className="w-full overflow-x-auto my-4 rounded-xl border border-slate-200 shadow-xs">
                              <table className="w-full text-left text-xs sm:text-sm divide-y divide-slate-200" {...props} />
                            </div>
                          ),
                          pre: ({ node, ...props }) => (
                            <pre className="overflow-x-auto p-4 rounded-xl bg-slate-900 text-slate-100 text-xs sm:text-sm leading-relaxed" {...props} />
                          ),
                        }}
                      >
                        {bag.konten}
                      </ReactMarkdown>
                    </div>

                    {/* Navigasi Interaktif Bab Sebelumnya / Selanjutnya */}
                    <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isFirstBagian}
                        onClick={() => {
                          setCurrentBagianIndex((prev) => Math.max(0, prev - 1))
                          scrollToTop()
                        }}
                        className="text-xs rounded-xl font-bold gap-1.5 h-10 order-2 sm:order-1"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Bab Sebelumnya</span>
                      </Button>

                      <div className="flex items-center gap-2 order-1 sm:order-2">
                        {!isLastBagian ? (
                          <Button
                            type="button"
                            onClick={() => {
                              const nextIdx = Math.min(materi.bagian.length - 1, currentBagianIndex + 1)
                              setCurrentBagianIndex(nextIdx)
                              setMaxUnlockedIndex((prev) => Math.max(prev, nextIdx))
                              scrollToTop()
                            }}
                            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-xl font-bold gap-1.5 h-10 shadow-xs"
                          >
                            <span>Lanjut ke Bab {currentBagianIndex + 2}</span>
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        ) : (
                          role === "murid" && (
                            isSelesai ? (
                              <div className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                                <Check className="w-4 h-4 text-emerald-600" />
                                <span>Materi Telah Tuntas Dipelajari</span>
                              </div>
                            ) : (
                              <Button
                                type="button"
                                onClick={handleSelesaiMateri}
                                disabled={savingProgress}
                                className="w-full sm:w-auto text-xs rounded-xl font-bold gap-1.5 h-10 shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                <CheckCircle className="w-4 h-4" />
                                <span>{savingProgress ? "Menyimpan Progres..." : "Selesaikan & Buka Kuis"}</span>
                              </Button>
                            )
                          )
                        )}
                      </div>
                    </div>
                  </section>
                )
              })()}
            </div>
          )}

          {/* Forum Diskusi & Tanya Jawab Materi */}
          <div className="pt-2">
            <ForumDiskusi materi={materi} />
          </div>

          {/* Papan Peringkat Harian Nilai Kuis Materi Ini */}
          <div className="pt-2">
            <LeaderboardHarian
              materiId={materi.id}
              title={`Papan Peringkat Kuis: ${materi.judul}`}
            />
          </div>
        </div>

        {/* Kolom Sidebar (Daftar Isi & Kuis Latihan) */}
        <div className="space-y-6">
          {/* Navigasi Daftar Isi */}
          <div className="p-4 bg-card border rounded-2xl space-y-3 sticky top-20 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Daftar Isi
            </span>
            <nav className="space-y-1 text-xs">
              {materi.bagian?.map((bag, idx) => {
                const isActive = idx === currentBagianIndex
                const isLocked = role === "murid" && !isSelesai && idx > maxUnlockedIndex

                return (
                  <button
                    key={bag.id || idx}
                    type="button"
                    disabled={isLocked}
                    onClick={() => {
                      if (isLocked) return
                      setCurrentBagianIndex(idx)
                      scrollToTop()
                    }}
                    className={`w-full text-left transition-colors py-1.5 px-2 rounded-lg text-xs truncate flex items-center justify-between gap-1.5 ${isActive
                        ? "bg-blue-50 text-blue-700 font-extrabold"
                        : isLocked
                          ? "text-slate-400 opacity-60 cursor-not-allowed hover:bg-transparent"
                          : "text-muted-foreground hover:text-foreground hover:bg-slate-50 cursor-pointer"
                      }`}
                    title={isLocked ? "Selesaikan Bab sebelumnya terlebih dahulu" : bag.judul}
                  >
                    <span className="truncate">{idx + 1}. {bag.judul}</span>
                    {isActive ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                    ) : isLocked ? (
                      <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                    ) : null}
                  </button>
                )
              })}
            </nav>

            <hr className="my-3 border-slate-100" />

            {/* Kuis Latihan Terkait */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-3">
                Kuis Latihan Materi
              </span>

              {kuisList.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Belum ada kuis untuk materi ini.</p>
              ) : (
                <div className="space-y-3">
                  {kuisList.map((k) => (
                    <div key={k.id} className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 text-xs space-y-2">
                      <div className="font-bold text-foreground leading-snug">{k.judul}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {k.jumlahSoal || k.soal?.length || 0} Soal &bull; Nilai Lulus {k.nilaiLulus || 70}
                      </div>
                      {role === "murid" ? (
                        isSelesai ? (
                          <Button size="sm" asChild className="w-full text-xs h-8 rounded-lg font-semibold shadow-xs bg-blue-600 hover:bg-blue-700 text-white">
                            <Link to={`/murid/kuis/${k.id}`}>
                              <FileQuestion className="w-3.5 h-3.5 mr-1.5" />
                              Kerjakan Kuis
                            </Link>
                          </Button>
                        ) : (
                          <div className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-slate-100/80 border border-slate-200/80 text-[11px] font-bold text-slate-500 cursor-not-allowed">
                            <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Selesaikan materi untuk membuka</span>
                          </div>
                        )
                      ) : (
                        <Button variant="outline" size="sm" asChild className="w-full text-xs h-8 rounded-lg">
                          <Link to="/masuk">Masuk untuk Mengerjakan</Link>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Button Scroll To Top */}
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Kembali ke atas"
          className="fixed bottom-24 md:bottom-14 right-5 z-40 p-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full shadow-xl shadow-blue-500/30 transition-all duration-300 flex items-center justify-center animate-in fade-in zoom-in"
        >
          <ArrowUp className="w-5 h-5 stroke-[2.5]" />
        </button>
      )}
    </div>
  )
}
