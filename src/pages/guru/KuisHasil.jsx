import React, { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { getKuisById } from "@/services/kuis"
import { getPercobaanByKuis, deletePercobaan } from "@/services/percobaan"
import { getMuridList } from "@/services/murid"
import { getKelasList } from "@/services/kelas"
import { exportToCsv } from "@/lib/csv"
import { formatDate } from "@/lib/utils"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DetailPageSkeleton } from "@/components/ui/loading-skeletons"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import {
  ArrowLeft,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  BarChart3,
  Users,
  Award,
  Sparkles,
  Clock,
} from "lucide-react"

export function KuisHasil() {
  const { id } = useParams()
  const [kuis, setKuis] = useState(null)
  const [percobaanList, setPercobaanList] = useState([])
  const [muridList, setMuridList] = useState([])
  const [kelasList, setKelasList] = useState([])
  const [selectedKelas, setSelectedKelas] = useState("SEMUA")
  const [loading, setLoading] = useState(true)

  async function loadData() {
    try {
      const [k, p, m, kl] = await Promise.all([
        getKuisById(id),
        getPercobaanByKuis(id),
        getMuridList(),
        getKelasList(),
      ])
      setKuis(k)
      setPercobaanList(p)
      setMuridList(m)
      setKelasList(kl)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  const kelasMap = new Map()
  kelasList.forEach((k) => kelasMap.set(k.id, k.nama))

  // Kelompokkan percobaan per NISN
  const muridMap = new Map()
  muridList.forEach((m) => muridMap.set(m.nisn, m))

  // Filter percobaan berdasarkan kelas yang dipilih
  const filteredPercobaan = percobaanList.filter((p) => {
    if (selectedKelas === "SEMUA") return true
    return p.kelasId === selectedKelas
  })

  // Agregasi hasil per murid (skor terbaik & riwayat)
  const muridResultMap = new Map()
  filteredPercobaan.forEach((p) => {
    const studentKey = p.nisn || p.uid || p.id
    const existing = muridResultMap.get(studentKey)
    const mInfo = (p.nisn && muridMap.get(p.nisn)) || muridList.find((m) => m.akunMurid?.uid === p.uid)
    const namaSiswa = p.namaMurid || mInfo?.nama || "Murid"
    const kId = p.kelasId || mInfo?.kelasId || null

    if (!existing) {
      muridResultMap.set(studentKey, {
        nisn: p.nisn || mInfo?.nisn || "-",
        nama: namaSiswa,
        kelasId: kId,
        skorTerbaik: p.skor || 0,
        skorTerakhir: p.skor || 0,
        jumlahPercobaan: 1,
        terakhirMengerjakan: p.selesaiAt,
        terakhirId: p.id,
      })
    } else {
      existing.jumlahPercobaan += 1
      if ((p.skor || 0) > existing.skorTerbaik) {
        existing.skorTerbaik = p.skor || 0
      }
    }
  })

  const hasilMuridArray = Array.from(muridResultMap.values()).sort(
    (a, b) => b.skorTerbaik - a.skorTerbaik
  )

  // Murid yang belum mengerjakan
  const muridBelumMengerjakan = muridList.filter((m) => {
    const matchKelas = selectedKelas === "SEMUA" || m.kelasId === selectedKelas
    return matchKelas && !muridResultMap.has(m.nisn) && !muridResultMap.has(m.akunMurid?.uid)
  })

  // Statistik Ringkasan
  const totalMengerjakan = hasilMuridArray.length
  const totalSkor = hasilMuridArray.reduce((acc, curr) => acc + curr.skorTerbaik, 0)
  const rataRata = totalMengerjakan > 0 ? Math.round(totalSkor / totalMengerjakan) : 0
  const tertinggi = totalMengerjakan > 0 ? Math.max(...hasilMuridArray.map((m) => m.skorTerbaik)) : 0
  const terendah = totalMengerjakan > 0 ? Math.min(...hasilMuridArray.map((m) => m.skorTerbaik)) : 0
  const passingScore = kuis?.nilaiLulus || 70
  const jumlahLulus = hasilMuridArray.filter((m) => m.skorTerbaik >= passingScore).length
  const persenLulus = totalMengerjakan > 0 ? Math.round((jumlahLulus / totalMengerjakan) * 100) : 0

  // Analisis Butir Soal
  const soalAnalisis = (kuis?.soal || []).map((soal, idx) => {
    let benarCount = 0
    let totalJawab = 0
    const opsiDistribusi = {}

    filteredPercobaan.forEach((p) => {
      const jwb = p.jawaban?.find((j) => j.soalId === soal.id)
      if (jwb) {
        totalJawab += 1
        if (jwb.benar) benarCount += 1

        if (soal.tipe === "pilihan_ganda" && jwb.jawaban) {
          const val = String(jwb.jawaban).toLowerCase()
          opsiDistribusi[val] = (opsiDistribusi[val] || 0) + 1
        }
      }
    })

    const persenBenar = totalJawab > 0 ? Math.round((benarCount / totalJawab) * 100) : 0
    return {
      index: idx + 1,
      soal,
      totalJawab,
      benarCount,
      persenBenar,
      opsiDistribusi,
    }
  })

  async function handleDeletePercobaan(pId) {
    if (confirm("Reset percobaan ini? Murid akan dapat mengulang kuis dari awal.")) {
      try {
        await deletePercobaan(pId)
        await loadData()
      } catch (err) {
        alert("Gagal menghapus percobaan.")
      }
    }
  }

  function handleExportHasil() {
    const data = hasilMuridArray.map((h) => ({
      NISN: h.nisn,
      Nama: h.nama,
      Kelas: kelasMap.get(h.kelasId) || "-",
      SkorTerbaik: h.skorTerbaik,
      Status: h.skorTerbaik >= passingScore ? "Lulus" : "Belum Lulus",
      JumlahPercobaan: h.jumlahPercobaan,
      TerakhirMengerjakan: formatDate(h.terakhirMengerjakan),
    }))
    const safeJudul = (kuis?.judul || "Kuis").replace(/[^a-zA-Z0-9]/g, "_")
    exportToCsv(`Hasil_Kuis_${safeJudul}`, data)
  }

  if (loading) {
    return <DetailPageSkeleton icon={Award} label="Memuat hasil & analisis kuis..." />
  }

  if (!kuis) {
    return (
      <div className="container max-w-md py-20 text-center space-y-4">
        <p className="font-semibold text-slate-800 text-sm">Kuis tidak ditemukan atau telah dihapus.</p>
        <Button asChild className="rounded-xl text-xs font-bold">
          <Link to="/guru/kuis">Kembali ke Daftar Kuis</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/guru/kuis">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Hasil & Analisis Soal</h1>
              <Badge variant="outline">{kuis?.judul}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Nilai kelulusan: <b>{passingScore}</b> &bull; Latihan formatif Teks Rekon SMPN 3 Ketapang.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportHasil} className="gap-2">
            <Download className="w-4 h-4" />
            Ekspor Hasil CSV
          </Button>
        </div>
      </div>

      {/* Filter Kelas */}
      <Card>
        <CardContent className="p-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">Saring Menurut Kelas:</span>
          <select
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
            value={selectedKelas}
            onChange={(e) => setSelectedKelas(e.target.value)}
          >
            <option value="SEMUA">Semua Kelas</option>
            {kelasList.map((k) => (
              <option key={k.id} value={k.id}>
                Kelas {k.nama}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* Ringkasan Angka (KPI) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Rata-rata Skor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{rataRata} / 100</div>
            <p className="text-[11px] text-muted-foreground mt-1">{totalMengerjakan} murid sudah mengerjakan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Kelulusan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{persenLulus}%</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {jumlahLulus} dari {totalMengerjakan} murid lulus
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Tertinggi & Terendah
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{tertinggi} / {terendah}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Rentang nilai siswa</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Belum Mengerjakan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{muridBelumMengerjakan.length}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Perlu diingatkan</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Rekap Nilai vs Analisis Soal */}
      <Tabs defaultValue="rekap" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="rekap" className="text-xs gap-1.5">
            <Users className="w-4 h-4" />
            Rekap Siswa ({hasilMuridArray.length})
          </TabsTrigger>
          <TabsTrigger value="belum" className="text-xs gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Belum Mengerjakan ({muridBelumMengerjakan.length})
          </TabsTrigger>
          <TabsTrigger value="analisis" className="text-xs gap-1.5">
            <BarChart3 className="w-4 h-4 text-purple-600" />
            Analisis Butir Soal
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Rekap Nilai */}
        <TabsContent value="rekap">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Siswa</TableHead>
                    <TableHead>NISN</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead>Skor Terbaik</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Percobaan</TableHead>
                    <TableHead>Waktu Selesai</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hasilMuridArray.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-xs">
                        Belum ada data pengerjaan kuis dari siswa.
                      </TableCell>
                    </TableRow>
                  ) : (
                    hasilMuridArray.map((m) => {
                      const isLulus = m.skorTerbaik >= passingScore
                      return (
                        <TableRow key={m.nisn}>
                          <TableCell className="font-semibold text-xs text-foreground">{m.nama}</TableCell>
                          <TableCell className="font-mono text-xs">{m.nisn}</TableCell>
                          <TableCell className="text-xs">{kelasMap.get(m.kelasId) || "-"}</TableCell>
                          <TableCell className="font-bold text-sm text-foreground">
                            {m.skorTerbaik}
                          </TableCell>
                          <TableCell>
                            {isLulus ? (
                              <Badge variant="success" className="text-[10px]">
                                Lulus
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[10px]">
                                Belum Lulus
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">{m.jumlahPercobaan}x</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDate(m.terakhirMengerjakan)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Reset percobaan siswa"
                              onClick={() => handleDeletePercobaan(m.terakhirId)}
                              className="hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Belum Mengerjakan */}
        <TabsContent value="belum">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Siswa</TableHead>
                    <TableHead>NISN</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead>Email Google</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {muridBelumMengerjakan.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-emerald-600 font-semibold text-xs">
                        Luar biasa! Semua siswa sudah mengerjakan kuis ini.
                      </TableCell>
                    </TableRow>
                  ) : (
                    muridBelumMengerjakan.map((m) => (
                      <TableRow key={m.nisn}>
                        <TableCell className="font-medium text-xs text-foreground">{m.nama}</TableCell>
                        <TableCell className="font-mono text-xs">{m.nisn}</TableCell>
                        <TableCell className="text-xs">{kelasMap.get(m.kelasId) || "-"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{m.email || "Belum aktivasi"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Analisis Butir Soal */}
        <TabsContent value="analisis">
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Soal dengan persentase benar di bawah 50% ditandai sebagai soal sulit yang perlu diulang pembahasannya di ruang kelas.
            </p>

            <div className="grid grid-cols-1 gap-4">
              {soalAnalisis.map((item) => {
                const isSulit = item.totalJawab > 0 && item.persenBenar < 50
                return (
                  <Card key={item.index} className={isSulit ? "border-amber-300 bg-amber-50/20" : ""}>
                    <CardHeader className="py-3 flex flex-row items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs bg-muted px-2 py-0.5 rounded">
                          Soal #{item.index}
                        </span>
                        {isSulit && (
                          <Badge variant="warning" className="text-[10px] gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Soal Tersulit ({item.persenBenar}% Benar)
                          </Badge>
                        )}
                        {!isSulit && item.totalJawab > 0 && (
                          <Badge variant="outline" className="text-[10px]">
                            {item.persenBenar}% Siswa Benar
                          </Badge>
                        )}
                      </div>

                      <span className="text-xs text-muted-foreground">
                        {item.benarCount} dari {item.totalJawab} percobaan benar
                      </span>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs pt-0">
                      <p className="font-medium text-foreground">{item.soal.pertanyaan}</p>

                      {item.soal.pembahasan && (
                        <div className="p-2.5 bg-blue-50/50 border border-blue-100 rounded text-[11px] text-blue-900 mt-2">
                          <b>Pembahasan:</b> {item.soal.pembahasan}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

