import React, { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { getKuisList, deleteKuis, seedKuisTemplate, createKuis } from "@/services/kuis"
import { getMateriList } from "@/services/materi"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TableRowsLoading } from "@/components/ui/loading-skeletons"
import { AiKuisGeneratorModal } from "@/components/kuis/AiKuisGeneratorModal"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { Plus, FileQuestion, Sparkles, Edit, Trash2, BarChart2, Wand2 } from "lucide-react"

export function KuisList() {
  const navigate = useNavigate()
  const [kuisList, setKuisList] = useState([])
  const [materiList, setMateriList] = useState([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)

  async function loadData() {
    try {
      const [kuis, materi] = await Promise.all([
        getKuisList(true),
        getMateriList(true),
      ])
      setKuisList(kuis)
      setMateriList(materi)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const materiMap = new Map()
  materiList.forEach((m) => materiMap.set(m.id, m.judul))

  async function handleSeedTemplate() {
    if (confirm("Buat kuis latihan Teks Rekon dari template bawaan?")) {
      setSeeding(true)
      try {
        const count = await seedKuisTemplate()
        await loadData()
        alert(`Berhasil menambahkan ${count} kuis Teks Rekon baru dari template!`)
      } catch (err) {
        alert(err.message || "Gagal membuat kuis dari template.")
      } finally {
        setSeeding(false)
      }
    }
  }

  async function handleDelete(k) {
    if (confirm(`Hapus kuis "${k.judul}"? Riwayat pengerjaan murid pada kuis ini akan ikut terhapus.`)) {
      try {
        await deleteKuis(k.id)
        await loadData()
        alert(`Kuis "${k.judul}" berhasil dihapus.`)
      } catch (err) {
        console.error("Gagal menghapus:", err)
        alert(err.message || "Gagal menghapus kuis.")
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kuis Latihan Materi</h1>
          <p className="text-sm text-muted-foreground">
            Kelola soal pilihan ganda, benar/salah, dan isian singkat per materi teks rekon.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => setIsAiModalOpen(true)}
            className="gap-2 bg-gradient-to-r from-amber-600 via-orange-600 to-indigo-700 hover:from-amber-700 hover:to-orange-800 text-white font-bold shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-amber-200" />
            <span>Generate Kuis AI</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSeedTemplate}
            disabled={seeding}
            className="gap-2 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300 text-amber-800 hover:bg-amber-100"
          >
            <FileQuestion className="w-4 h-4 text-amber-600" />
            {seeding ? "Membuat..." : "Template Kuis Rekon"}
          </Button>

          <Button asChild size="sm" className="gap-2">
            <Link to="/guru/kuis/baru">
              <Plus className="w-4 h-4" />
              Buat Kuis Baru
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Judul Kuis</TableHead>
                <TableHead>Materi Terkait</TableHead>
                <TableHead>Jumlah Soal</TableHead>
                <TableHead>Nilai Lulus</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRowsLoading rows={4} cols={6} />
              ) : kuisList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-xs">
                    <FileQuestion className="w-8 h-8 opacity-40 mx-auto mb-2" />
                    Belum ada kuis latihan. Klik "Buat dari Template Kuis Rekon" untuk membuat 3 set kuis otomatis.
                  </TableCell>
                </TableRow>
              ) : (
                kuisList.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-semibold text-xs text-foreground">
                      <Link to={`/guru/kuis/${k.id}/edit`} className="hover:text-primary transition-colors">
                        {k.judul}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {materiMap.get(k.materiId) || (
                        <span className="text-amber-600 font-medium">Belum dihubungkan</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{k.jumlahSoal || k.soal?.length || 0} Soal</TableCell>
                    <TableCell className="text-xs font-semibold">{k.nilaiLulus || 70}</TableCell>
                    <TableCell>
                      {k.status === "terbit" ? (
                        <Badge variant="success" className="text-[10px]">
                          Terbit
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          Draf
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          title="Lihat Hasil & Analisis Siswa"
                        >
                          <Link to={`/guru/kuis/${k.id}/hasil`}>
                            <BarChart2 className="w-4 h-4 text-primary" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          title="Edit Kuis"
                        >
                          <Link to={`/guru/kuis/${k.id}/edit`}>
                            <Edit className="w-4 h-4 text-muted-foreground" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(k)}
                          className="hover:text-destructive"
                          title="Hapus Kuis"
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Generator Kuis AI */}
      <AiKuisGeneratorModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        materiList={materiList}
        onGenerated={async (aiData) => {
          try {
            setLoading(true)
            const docRef = await createKuis(aiData)
            const newId = docRef.id
            navigate(`/guru/kuis/${newId}/edit`)
          } catch (err) {
            console.error("Gagal simpan kuis AI:", err)
            alert(err.message || "Gagal menyimpan kuis yang digenerate AI.")
            await loadData()
          } finally {
            setLoading(false)
          }
        }}
      />
    </div>
  )
}
