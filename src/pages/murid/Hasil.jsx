import React, { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { getPercobaanById } from "@/services/percobaan"
import { getKuisById } from "@/services/kuis"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DetailPageSkeleton } from "@/components/ui/loading-skeletons"
import { LeaderboardHarian } from "@/components/kuis/LeaderboardHarian"
import {
  Trophy,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  BookOpen,
  HelpCircle,
  FileQuestion,
} from "lucide-react"

export function Hasil() {
  const { percobaanId } = useParams()
  const [percobaan, setPercobaan] = useState(null)
  const [kuis, setKuis] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Scroll otomatis ke paling atas saat halaman hasil dibuka
    window.scrollTo({ top: 0, behavior: "smooth" })

    async function load() {
      try {
        const p = await getPercobaanById(percobaanId)
        if (p) {
          setPercobaan(p)
          const k = await getKuisById(p.kuisId)
          setKuis(k)
        }
      } catch (err) {
        console.error("Gagal memuat hasil:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [percobaanId])

  if (loading) {
    return <DetailPageSkeleton icon={Trophy} label="Menghitung hasil dan menyiapkan lembar pembahasan..." />
  }

  if (!percobaan || !kuis) {
    return (
      <div className="container max-w-md py-20 text-center">
        <p className="font-semibold text-foreground">Data hasil percobaan tidak ditemukan.</p>
        <Button asChild className="mt-4">
          <Link to="/murid">Kembali ke Portal Murid</Link>
        </Button>
      </div>
    )
  }

  const isLulus = percobaan.lulus
  const passingScore = kuis.nilaiLulus || 70

  // Mapping soalId ke objek soal asli dari kuis
  const soalMap = new Map()
  kuis.soal?.forEach((s) => soalMap.set(s.id, s))

  return (
    <div className="  space-y-8">
      {/* Tombol Kembali ke Portal Murid */}
      <div>
        <Button variant="ghost" size="sm" asChild className="gap-2 text-slate-600 hover:text-slate-900">
          <Link to="/murid">
            <ArrowRight className="w-4 h-4 rotate-180" />
            Kembali ke Materi
          </Link>
        </Button>
      </div>

      {/* Banner Hasil Skor */}
      <Card
        className={`border-2 text-center p-8 rounded-2xl ${
          isLulus
            ? "border-emerald-200 bg-emerald-50/40"
            : "border-amber-200 bg-amber-50/40"
        }`}
      >
        <div className="flex flex-col items-center space-y-3">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center ${
              isLulus ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
            }`}
          >
            <Trophy className="w-8 h-8" />
          </div>

          <Badge variant={isLulus ? "success" : "warning"} className="text-xs px-3 py-1">
            {isLulus ? "Selamat, Kamu Lulus!" : "Belum Mencapai Nilai Lulus"}
          </Badge>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground">
            {percobaan.skor} <span className="text-lg text-muted-foreground font-normal">/ 100</span>
          </h1>

          <p className="text-xs sm:text-sm text-muted-foreground max-w-md">
            Kamu menjawab <b>{percobaan.benar}</b> benar dari <b>{percobaan.total}</b> butir soal. (Syarat kelulusan: nilai minimal <b>{passingScore}</b>).
          </p>

          <div className="flex flex-wrap gap-3 pt-3">
            <Button size="sm" asChild>
              <Link to={`/murid/kuis/${kuis.id}`}>
                <RotateCcw className="w-4 h-4 mr-1.5" />
                Ulangi Latihan
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/murid">
                Kembali ke Dashboard
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Link>
            </Button>
          </div>
        </div>
      </Card>

      {/* Papan Peringkat Harian Kuis Ini */}
      <LeaderboardHarian
        kuisId={kuis.id}
        title={`Papan Peringkat Hari Ini: ${kuis.judul}`}
      />

      {/* Review Butir Soal & Pembahasan Lengkap */}
      <div className="space-y-4">
        <div className="border-b pb-2 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            Tinjauan Soal & Pembahasan
          </h2>
          <span className="text-xs text-muted-foreground">
            Pelajari bagian yang masih keliru
          </span>
        </div>

        <div className="space-y-4">
          {percobaan.jawaban?.map((item, idx) => {
            const originalSoal = soalMap.get(item.soalId)
            const isCorrect = item.benar

            return (
              <Card
                key={item.soalId || idx}
                className={`border-l-4 ${
                  isCorrect ? "border-l-emerald-500" : "border-l-destructive"
                }`}
              >
                <CardHeader className="py-3 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs bg-muted px-2 py-0.5 rounded">
                      Nomor {idx + 1}
                    </span>
                    {isCorrect ? (
                      <Badge variant="success" className="text-[10px] gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Benar
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px] gap-1">
                        <XCircle className="w-3 h-3" />
                        Salah
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 text-xs pt-1">
                  {/* Pertanyaan */}
                  <p className="font-semibold text-foreground text-sm">
                    {originalSoal ? originalSoal.pertanyaan : "Pertanyaan"}
                  </p>

                  {/* Jawaban Murid vs Kunci */}
                  <div className="p-3 bg-muted/30 rounded-lg space-y-1.5 border">
                    <div className="flex items-start sm:items-center gap-2">
                      <span className="text-muted-foreground w-28 shrink-0">Jawabanmu:</span>
                      <span
                        className={`font-semibold ${
                          isCorrect ? "text-emerald-700" : "text-destructive"
                        }`}
                      >
                        {item.jawaban === null || item.jawaban === undefined
                          ? "(Tidak dijawab)"
                          : typeof item.jawaban === "boolean"
                          ? item.jawaban
                            ? "Benar (True)"
                            : "Salah (False)"
                          : item.jawabanTeks
                          ? `Opsi ${String(item.jawaban).toUpperCase()}: "${item.jawabanTeks}"`
                          : String(item.jawaban)}
                      </span>
                    </div>

                    {!isCorrect && originalSoal && (
                      <div className="flex items-start sm:items-center gap-2 pt-1 border-t">
                        <span className="text-muted-foreground w-28 shrink-0">Kunci Jawaban:</span>
                        <span className="font-bold text-emerald-700">
                          {typeof originalSoal.kunci === "boolean"
                            ? originalSoal.kunci
                              ? "Benar (True)"
                              : "Salah (False)"
                            : item.kunciTeks
                            ? `Opsi ${String(item.kunci || originalSoal.kunci).toUpperCase()}: "${item.kunciTeks}"`
                            : Array.isArray(originalSoal.kunci)
                            ? originalSoal.kunci.join(" / ")
                            : String(originalSoal.kunci)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Pembahasan Soal */}
                  {originalSoal?.pembahasan && (
                    <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-lg text-blue-950 text-xs leading-relaxed">
                      <span className="font-bold block text-blue-900 mb-1 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        Penjelasan / Pembahasan:
                      </span>
                      {originalSoal.pembahasan}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}

