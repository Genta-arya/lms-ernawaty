import React, { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { getKuisById } from "@/services/kuis"
import { getMateriById } from "@/services/materi"
import { getProgresMurid } from "@/services/progres"
import { submitPercobaan, getPercobaanByMurid } from "@/services/percobaan"
import { gradeQuiz } from "@/lib/grading"
import { normalizeTingkatRomawi } from "@/lib/utils"
import { useAuth } from "@/context/AuthContext"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { DetailPageSkeleton } from "@/components/ui/loading-skeletons"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  ArrowRight,
  Send,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  BookOpen,
  Lock,
  FileQuestion,
} from "lucide-react"

// Helper acak array
function shuffleArray(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function KuisKerjakan() {
  const { id } = useParams()
  const { currentUser, profileData } = useAuth()
  const navigate = useNavigate()

  const [kuis, setKuis] = useState(null)
  const [soalList, setSoalList] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [jawabanMap, setJawabanMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [errorDetails, setErrorDetails] = useState(null)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [startTime] = useState(Date.now())

  useEffect(() => {
    // Scroll otomatis ke paling atas saat halaman pertama kali dibuka
    window.scrollTo({ top: 0, behavior: "smooth" })

    async function load() {
      try {
        const k = await getKuisById(id)
        if (!k) {
          setError("Kuis tidak ditemukan atau belum diterbitkan.")
          return
        }

        const studentTingkat = normalizeTingkatRomawi(profileData?.tingkat || profileData?.kelasNama)

        // 1. Cek hak akses tingkat kelas langsung dari kuis
        if (studentTingkat && k.tingkat && k.tingkat.length > 0 && !k.tingkat.includes(studentTingkat)) {
          setErrorDetails({
            title: `Kuis Khusus Kelas ${k.tingkat.join(", ")}`,
            message: `Kuis latihan ini dikhususkan untuk siswa Kelas ${k.tingkat.join(", ")}. Sebagai siswa Kelas ${studentTingkat}, Anda hanya dapat mengerjakan kuis yang sesuai dengan kelas Anda.`,
            link: "/murid",
            linkText: "Kembali ke Portal Murid",
            icon: "lock",
          })
          return
        }

        // 2. Cek materi referensi (tingkat kelas materi & prasyarat sudah membaca materi)
        if (k.materiId) {
          const refMateri = await getMateriById(k.materiId)
          if (refMateri) {
            // A. Cek apakah materi referensi sesuai tingkat kelas siswa
            if (studentTingkat && refMateri.tingkat && refMateri.tingkat.length > 0 && !refMateri.tingkat.includes(studentTingkat)) {
              setErrorDetails({
                title: `Materi Referensi Khusus Kelas ${refMateri.tingkat.join(", ")}`,
                message: `Kuis ini menguji materi "${refMateri.judul}" yang diperuntukkan bagi siswa Kelas ${refMateri.tingkat.join(", ")}. Sebagai siswa Kelas ${studentTingkat}, Anda tidak dapat mengakses materi dan kuis ini.`,
                link: "/murid",
                linkText: "Kembali ke Portal Murid",
                icon: "lock",
              })
              return
            }

            // B. Cek apakah siswa sudah membaca materi referensi (prasyarat wajib baca materi)
            if (currentUser) {
              const progresMap = await getProgresMurid(currentUser.uid)
              const sudahBaca = !!progresMap[k.materiId]

              if (!sudahBaca) {
                setErrorDetails({
                  title: "Wajib Membaca Materi Terlebih Dahulu",
                  message: `Anda belum membaca dan menyelesaikan materi "${refMateri.judul}". Pelajari materi tersebut dan tandai selesai sebelum dapat mengerjakan latihan kuis ini.`,
                  link: `/materi/${refMateri.slug || refMateri.id}`,
                  linkText: `Pelajari Materi: ${refMateri.judul}`,
                  icon: "book",
                })
                return
              }
            }
          }
        }

        // 3. Cek batas percobaan jika ada
        if (k.maksPercobaan && currentUser) {
          const pastPerc = await getPercobaanByMurid(currentUser.uid)
          const triedCount = pastPerc.filter((p) => p.kuisId === id).length
          if (triedCount >= k.maksPercobaan) {
            setErrorDetails({
              title: "Batas Percobaan Tercapai",
              message: `Anda telah mencapai batas maksimal pengerjaan (${k.maksPercobaan} kali) untuk kuis ini.`,
              link: "/murid/riwayat",
              linkText: "Lihat Riwayat & Pembahasan",
              icon: "lock",
            })
            return
          }
        }

        setKuis(k)

        // Siapkan dan acak soal jika k.acakSoal aktif
        let preparedSoal = [...(k.soal || [])]
        if (k.acakSoal) {
          preparedSoal = shuffleArray(preparedSoal)
        }

        // Acak opsi (hanya isi/value teksnya saja yang diacak, urutan huruf A, B, C, D tetap urut)
        if (k.acakOpsi) {
          const HURUF = ["a", "b", "c", "d", "e", "f", "g", "h"]
          preparedSoal = preparedSoal.map((s) => {
            if (s.tipe === "pilihan_ganda" && Array.isArray(s.opsi) && s.opsi.length > 1) {
              const shuffledOpsi = shuffleArray(s.opsi)
              let newKunci = s.kunci

              const reindexedOpsi = shuffledOpsi.map((op, idx) => {
                const fixedId = HURUF[idx] || op.id
                if (op.id === s.kunci) {
                  newKunci = fixedId
                }
                return {
                  id: fixedId,
                  teks: op.teks,
                }
              })

              return {
                ...s,
                opsi: reindexedOpsi,
                kunci: newKunci,
              }
            }
            return s
          })
        }

        setSoalList(preparedSoal)
      } catch (err) {
        setError(err.message || "Gagal memuat kuis.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, currentUser])

  // Peringatan saat mencoba keluar dari halaman saat mengerjakan kuis
  useEffect(() => {
    function handleBeforeUnload(e) {
      if (Object.keys(jawabanMap).length > 0 && !submitting) {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [jawabanMap, submitting])

  const totalSoal = soalList.length
  const currentSoal = soalList[currentIndex]
  const progressPercent = totalSoal > 0 ? Math.round(((currentIndex + 1) / totalSoal) * 100) : 0
  const answeredCount = Object.keys(jawabanMap).filter((k) => jawabanMap[k] !== "").length

  function handleSelectOption(opsiId) {
    if (!currentSoal) return
    setJawabanMap({ ...jawabanMap, [currentSoal.id]: opsiId })
  }

  function handleTextAnswer(val) {
    if (!currentSoal) return
    setJawabanMap({ ...jawabanMap, [currentSoal.id]: val })
  }

  async function handleFinalSubmit() {
    setSubmitting(true)
    try {
      const durationSeconds = Math.round((Date.now() - startTime) / 1000)
      const passingScore = kuis.nilaiLulus || 70
      const graded = gradeQuiz(soalList, jawabanMap, passingScore)

      const docRef = await submitPercobaan({
        kuisId: id,
        materiId: kuis.materiId || null,
        uid: currentUser.uid,
        nisn: profileData?.nisn || "",
        namaMurid: profileData?.nama || currentUser.displayName || "Pelajar",
        fotoMurid: profileData?.fotoUrl || currentUser.photoURL || null,
        kelasNama: profileData?.kelasNama || "Kelas VIII",
        kelasId: profileData?.kelasId || null,
        skor: graded.skor,
        benar: graded.benar,
        total: graded.total,
        lulus: graded.lulus,
        jawaban: graded.detailJawaban,
        durasiDetik: durationSeconds,
      })

      navigate(`/murid/hasil/${docRef.id}`, { replace: true })
    } catch (err) {
      alert(err.message || "Gagal menyimpan hasil kuis.")
      setSubmitting(false)
    }
  }

  if (loading) {
    return <DetailPageSkeleton icon={FileQuestion} label="Menyiapkan lembar latihan kuis..." />
  }

  if (errorDetails) {
    return (
      <div className="container max-w-lg py-20 text-center space-y-5 animate-in fade-in duration-300">
        <div
          className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto border shadow-xs ${
            errorDetails.icon === "book"
              ? "bg-amber-50 text-amber-600 border-amber-200"
              : "bg-rose-50 text-rose-600 border-rose-200"
          }`}
        >
          {errorDetails.icon === "book" ? (
            <BookOpen className="w-8 h-8" />
          ) : (
            <Lock className="w-8 h-8" />
          )}
        </div>
        <div className="space-y-2">
          <span
            className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
              errorDetails.icon === "book"
                ? "text-amber-800 bg-amber-50 border-amber-200"
                : "text-rose-700 bg-rose-50 border-rose-200"
            }`}
          >
            {errorDetails.icon === "book" ? "Prasyarat Belajar" : "Akses Terbatas"}
          </span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {errorDetails.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
            {errorDetails.message}
          </p>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
          <Button
            asChild
            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl h-11 px-6 shadow-md shadow-blue-500/20"
          >
            <Link to={errorDetails.link}>
              {errorDetails.icon === "book" ? (
                <>
                  <BookOpen className="w-4 h-4 mr-2" />
                  {errorDetails.linkText}
                </>
              ) : (
                <>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {errorDetails.linkText}
                </>
              )}
            </Link>
          </Button>
          {errorDetails.icon === "book" && (
            <Button
              variant="ghost"
              asChild
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              <Link to="/murid">Kembali ke Portal Murid</Link>
            </Button>
          )}
        </div>
      </div>
    )
  }

  if (error || !kuis || totalSoal === 0) {
    return (
      <div className="container max-w-md py-20 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
        <h2 className="text-lg font-bold">Tidak Dapat Membuka Kuis</h2>
        <p className="text-xs text-muted-foreground mt-1 mb-6">{error || "Kuis tidak memiliki butir soal."}</p>
        <Button asChild>
          <Link to="/murid">Kembali ke Portal Murid</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className=" space-y-6">
      {/* Tombol Kembali / Keluar Kuis */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild className="gap-2 text-slate-600 hover:text-slate-900">
          <Link to="/murid">
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Portal Murid
          </Link>
        </Button>
      </div>

      {/* Header Runner */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">{kuis.judul}</h1>
          <p className="text-xs text-muted-foreground">Kuis Latihan Formatif SMPN 3 Ketapang</p>
        </div>

        <Badge variant="outline" className="text-xs font-semibold">
          Soal {currentIndex + 1} dari {totalSoal}
        </Badge>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
          <span>Kemajuan Pengerjaan</span>
          <span>{answeredCount} dari {totalSoal} Soal Terjawab</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Lembar Soal Aktif */}
      <Card className="shadow-sm border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md uppercase">
              Nomor {currentIndex + 1}
            </span>
            <span className="text-[11px] text-muted-foreground capitalize">
              Tipe: {currentSoal.tipe.replace("_", " ")}
            </span>
          </div>

          <CardTitle className="text-base sm:text-lg font-semibold leading-relaxed pt-3 text-foreground">
            {currentSoal.pertanyaan}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3 pt-2">
          {/* Pilihan Ganda */}
          {currentSoal.tipe === "pilihan_ganda" && (
            <div className="space-y-2">
              {currentSoal.opsi?.map((op) => {
                const isSelected = jawabanMap[currentSoal.id] === op.id
                return (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => handleSelectOption(op.id)}
                    className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm transition-all flex items-center gap-3 ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-semibold shadow-sm"
                        : "border-input bg-card text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 uppercase ${
                        isSelected
                          ? "bg-primary text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {op.id}
                    </span>
                    <span className="flex-1">{op.teks}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Benar / Salah */}
          {currentSoal.tipe === "benar_salah" && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <button
                type="button"
                onClick={() => handleSelectOption(true)}
                className={`p-4 rounded-xl border text-center font-bold text-sm transition-all ${
                  jawabanMap[currentSoal.id] === true
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm"
                    : "border-input hover:bg-muted/50"
                }`}
              >
                BENAR (True)
              </button>
              <button
                type="button"
                onClick={() => handleSelectOption(false)}
                className={`p-4 rounded-xl border text-center font-bold text-sm transition-all ${
                  jawabanMap[currentSoal.id] === false
                    ? "border-destructive bg-destructive/10 text-destructive shadow-sm"
                    : "border-input hover:bg-muted/50"
                }`}
              >
                SALAH (False)
              </button>
            </div>
          )}

          {/* Isian Singkat */}
          {currentSoal.tipe === "isian" && (
            <div className="space-y-2 pt-2">
              <label className="text-xs font-semibold text-muted-foreground block">
                Ketikkan jawaban singkatmu:
              </label>
              <Input
                placeholder="Tulis jawaban di sini..."
                value={jawabanMap[currentSoal.id] || ""}
                onChange={(e) => handleTextAnswer(e.target.value)}
                className="h-11 text-sm font-medium"
                autoFocus
              />
            </div>
          )}
        </CardContent>

        {/* Navigasi Soal Bawah */}
        <CardFooter className="flex items-center justify-between border-t pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={currentIndex === 0}
            onClick={() => {
              setCurrentIndex((prev) => prev - 1)
              window.scrollTo({ top: 0, behavior: "smooth" })
            }}
            className="text-xs gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Sebelumnya
          </Button>

          {currentIndex < totalSoal - 1 ? (
            <Button
              size="sm"
              onClick={() => {
                setCurrentIndex((prev) => prev + 1)
                window.scrollTo({ top: 0, behavior: "smooth" })
              }}
              className="text-xs gap-1.5"
            >
              Selanjutnya
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => setConfirmDialogOpen(true)}
              className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Send className="w-3.5 h-3.5" />
              Kirim Jawaban
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Grid Lompat Nomor Soal */}
      <div className="bg-card border rounded-xl p-4 space-y-2">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase block">
          Navigasi Butir Soal
        </span>
        <div className="flex flex-wrap gap-2">
          {soalList.map((s, idx) => {
            const hasAnswer = jawabanMap[s.id] !== undefined && jawabanMap[s.id] !== ""
            const isCurrent = idx === currentIndex
            return (
              <button
                key={s.id}
                onClick={() => setCurrentIndex(idx)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                  isCurrent
                    ? "ring-2 ring-primary ring-offset-2 bg-primary text-white"
                    : hasAnswer
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {idx + 1}
              </button>
            )
          })}
        </div>
      </div>

      {/* Dialog Konfirmasi Kirim */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selesai Mengerjakan Kuis?</DialogTitle>
            <DialogDescription className="text-xs">
              {answeredCount < totalSoal ? (
                <span className="text-amber-600 font-semibold block pt-1">
                  Peringatan: Masih ada {totalSoal - answeredCount} butir soal yang belum kamu jawab.
                </span>
              ) : (
                <span>Semua soal telah kamu jawab dengan lengkap.</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <p className="text-xs text-muted-foreground">
            Setelah dikirim, sistem akan langsung menghitung skor dan menampilkan pembahasan setiap butir soal.
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Periksa Kembali
            </Button>
            <Button
              onClick={handleFinalSubmit}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting ? "Menilai..." : "Ya, Kirim Sekarang"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

