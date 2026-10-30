import React, { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { getKelasById } from "@/services/kelas"
import { getMuridList, createMurid } from "@/services/murid"
import { useToast } from "@/context/ToastContext"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DetailPageSkeleton } from "@/components/ui/loading-skeletons"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { ArrowLeft, Plus, CheckCircle2, Clock, Users, AlertCircle } from "lucide-react"

export function KelasDetail() {
  const { id } = useParams()
  const { toast } = useToast()
  const [kelas, setKelas] = useState(null)
  const [muridList, setMuridList] = useState([])
  const [loading, setLoading] = useState(true)

  // Quick Add Murid
  const [nisn, setNisn] = useState("")
  const [nama, setNama] = useState("")
  const [email, setEmail] = useState("")
  const [savingMurid, setSavingMurid] = useState(false)
  const [error, setError] = useState("")

  async function loadData() {
    try {
      const [k, allMurid] = await Promise.all([
        getKelasById(id),
        getMuridList(),
      ])
      setKelas(k)
      setMuridList(allMurid.filter((m) => m.kelasId === id))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  async function handleAddMurid(e) {
    e.preventDefault()
    setError("")
    setSavingMurid(true)

    try {
      await createMurid({
        nisn,
        nama,
        kelasId: id,
        email: email || null,
      })
      toast.success("Siswa Ditambahkan", `${nama} berhasil didaftarkan ke kelas ini.`)
      setNisn("")
      setNama("")
      setEmail("")
      await loadData()
    } catch (err) {
      setError(err.message || "Gagal menambahkan murid.")
      toast.error("Gagal Menambahkan", err.message || "Gagal menambahkan murid ke kelas.")
    } finally {
      setSavingMurid(false)
    }
  }

  if (loading) {
    return <DetailPageSkeleton icon={Users} label="Memuat data detail kelas..." />
  }

  if (!kelas) {
    return (
      <div className="text-center py-12">
        <p className="font-semibold">Kelas tidak ditemukan.</p>
        <Button variant="link" asChild className="mt-2">
          <Link to="/guru/kelas">Kembali ke Daftar Kelas</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/guru/kelas">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Kelas {kelas.nama}</h1>
            <Badge variant="outline">Tingkat {kelas.tingkat}</Badge>
            <Badge variant="secondary">{kelas.tahunAjaran}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Total {muridList.length} siswa terdaftar di kelas ini.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Tambah Cepat Murid */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              Tambah Siswa Cepat
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs flex gap-2 mb-4">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <form onSubmit={handleAddMurid} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">NISN (10 Digit)</label>
                <Input
                  placeholder="0081234567"
                  maxLength={10}
                  value={nisn}
                  onChange={(e) => setNisn(e.target.value.replace(/\D/g, ""))}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Nama Siswa</label>
                <Input
                  placeholder="Nama lengkap siswa"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Email Google (Opsional)</label>
                <Input
                  type="email"
                  placeholder="murid@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground">
                  Jika diisi, murid otomatis terhubung saat login Google.
                </p>
              </div>

              <Button type="submit" size="sm" className="w-full mt-2" disabled={savingMurid}>
                {savingMurid ? "Menyimpan..." : "Tambahkan ke Kelas"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Tabel Siswa di Kelas */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              Daftar Siswa di Kelas {kelas.nama}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NISN</TableHead>
                  <TableHead>Nama Siswa</TableHead>
                  <TableHead>Email Google</TableHead>
                  <TableHead>Status Akun</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {muridList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-xs">
                      Belum ada siswa di kelas ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  muridList.map((m) => (
                    <TableRow key={m.nisn}>
                      <TableCell className="font-mono text-xs font-semibold">{m.nisn}</TableCell>
                      <TableCell className="font-medium text-foreground text-xs">{m.nama}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{m.email || "-"}</TableCell>
                      <TableCell>
                        {m.isLinked ? (
                          <Badge variant="success" className="text-[10px] gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Terhubung
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] gap-1 text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            Belum Aktif
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

