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
import {
  BookOpen,
  CheckCircle,
  ArrowLeft,
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

  // Tujuan tombol kembali: jika murid/login ke /murid, jika guru ke /guru/materi, lainnya ke /murid
  const backTarget = role === "guru" ? "/guru/materi" : "/murid"

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
          // Load kuis terkait
          const kuis = await getKuisByMateriId(mat.id, role === "guru")
          setKuisList(kuis)

          // Cek progres murid jika login
          if (role === "murid" && currentUser) {
            const prog = await getProgresMurid(currentUser.uid)
            setIsSelesai(!!prog[mat.id])
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

  async function handleToggleSelesai() {
    if (!currentUser || role !== "murid" || !materi) return
    setSavingProgress(true)
    try {
      const nextStatus = !isSelesai
      await markMateriSelesai(currentUser.uid, profileData?.nisn || "", materi.id, nextStatus)
      setIsSelesai(nextStatus)
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

          {/* Bagian-Bagian Materi */}
          <div className="space-y-10 min-w-0">
            {materi.bagian?.map((bag, idx) => (
              <section key={bag.id || idx} id={`bagian-${idx}`} className="scroll-mt-24 space-y-4 min-w-0">
                <div className="flex items-center gap-2 border-b pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded shrink-0">
                    Bagian {idx + 1}
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground break-words">
                    {bag.judul}
                  </h2>
                </div>

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
              </section>
            ))}
          </div>

          {/* Tombol Aksi Murid: Tandai Selesai */}
          {role === "murid" && (
            <div className="p-6 bg-card border rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
              <div className="text-center sm:text-left">
                <p className="font-bold text-foreground text-sm sm:text-base">Sudah selesai membaca materi ini?</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tandai selesai untuk menyimpan progres belajarmu ke dashboard siswa.
                </p>
              </div>
              <Button
                onClick={handleToggleSelesai}
                disabled={savingProgress}
                variant={isSelesai ? "secondary" : "default"}
                className={isSelesai ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-semibold" : "font-semibold shadow-xs"}
              >
                {isSelesai ? (
                  <>
                    <Check className="w-4 h-4 mr-2 text-emerald-600" />
                    Selesai Dibaca
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Tandai Selesai Dibaca
                  </>
                )}
              </Button>
            </div>
          )}

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
            <nav className="space-y-1.5 text-xs">
              {materi.bagian?.map((bag, idx) => (
                <a
                  key={bag.id || idx}
                  href={`#bagian-${idx}`}
                  className="block text-muted-foreground hover:text-primary transition-colors py-1 truncate"
                  title={bag.judul}
                >
                  {idx + 1}. {bag.judul}
                </a>
              ))}
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
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleToggleSelesai}
                            className="w-full text-xs h-8 rounded-lg font-semibold border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 gap-1.5 shadow-none"
                            title="Tandai materi selesai dibaca untuk membuka kuis latihan"
                          >
                            <CheckCircle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Tandai Selesai untuk Kuis</span>
                          </Button>
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
          className="fixed bottom-20 md:bottom-8 right-5 z-40 p-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full shadow-xl shadow-blue-500/30 transition-all duration-300 flex items-center justify-center animate-in fade-in zoom-in"
        >
          <ArrowUp className="w-5 h-5 stroke-[2.5]" />
        </button>
      )}
    </div>
  )
}
