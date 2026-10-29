import React, { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { getMateriList, deleteMateri, seedMateriTemplate, createMateri } from "@/services/materi"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TableRowsLoading } from "@/components/ui/loading-skeletons"
import { AiMateriGeneratorModal } from "@/components/materi/AiMateriGeneratorModal"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { Plus, BookOpen, Sparkles, Edit, Trash2, ExternalLink, Wand2 } from "lucide-react"

export function MateriList() {
  const navigate = useNavigate()
  const [materiList, setMateriList] = useState([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)

  async function loadData() {
    try {
      const data = await getMateriList(true)
      setMateriList(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Otomatis scroll ke atas saat pertama kali halaman kelola materi dibuka
    window.scrollTo({ top: 0, behavior: "smooth" })
    loadData()
  }, [])

  async function handleSeedTemplate() {
    if (confirm("Buat materi pembelajaran Teks Rekon (Recount Text) dari template bawaan?")) {
      setSeeding(true)
      try {
        const count = await seedMateriTemplate()
        await loadData()
        alert(`Berhasil menambahkan ${count} materi Teks Rekon baru dari template!`)
      } catch (err) {
        alert(err.message || "Gagal membuat materi dari template.")
      } finally {
        setSeeding(false)
      }
    }
  }

  async function handleDelete(m) {
    if (confirm(`Apakah Anda yakin ingin menghapus materi "${m.judul}"?`)) {
      try {
        await deleteMateri(m.id)
        await loadData()
        alert(`Materi "${m.judul}" berhasil dihapus.`)
      } catch (err) {
        console.error("Gagal menghapus:", err)
        alert(err.message || "Gagal menghapus materi. Pastikan izin database aktif.")
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Materi Pembelajaran</h1>
          <p className="text-sm text-muted-foreground">
            Kelola teks bahan ajar, modul Kurikulum Merdeka Fase D, dan bagian-bagian materi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => setIsAiModalOpen(true)}
            className="gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Generate Materi AI</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSeedTemplate}
            disabled={seeding}
            className="gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-primary/30 text-primary hover:bg-primary/10"
          >
            <BookOpen className="w-4 h-4 text-primary" />
            {seeding ? "Membuat..." : "Template Teks Rekon"}
          </Button>

          <Button asChild size="sm" className="gap-2">
            <Link to="/guru/materi/baru">
              <Plus className="w-4 h-4" />
              Buat Materi Baru
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Urutan</TableHead>
                <TableHead>Judul Materi</TableHead>
                <TableHead>Topik / Mapel</TableHead>
                <TableHead>Tingkat Sasaran</TableHead>
                <TableHead>Bagian</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRowsLoading rows={4} cols={7} />
              ) : materiList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-xs">
                    <BookOpen className="w-8 h-8 opacity-40 mx-auto mb-2" />
                    Belum ada materi pembelajaran. Klik "Buat dari Template Teks Rekon" untuk memasukkan 3 modul awal sekaligus.
                  </TableCell>
                </TableRow>
              ) : (
                materiList.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-bold text-xs text-muted-foreground">#{m.urutan || 1}</TableCell>
                    <TableCell className="font-semibold text-xs text-foreground">
                      <Link to={`/guru/materi/${m.id}/edit`} className="hover:text-primary transition-colors">
                        {m.judul}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{m.topik || "Bahasa Inggris"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {m.tingkat?.map((t) => (
                          <Badge key={t} variant="outline" className="text-[10px]">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {m.bagian?.length || 0} Bagian
                    </TableCell>
                    <TableCell>
                      {m.status === "terbit" ? (
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
                        {m.status === "terbit" && (
                          <Button variant="ghost" size="icon" asChild title="Buka Halaman Publik">
                            <Link to={`/materi/${m.slug}`} target="_blank">
                              <ExternalLink className="w-4 h-4 text-muted-foreground" />
                            </Link>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          title="Edit Materi"
                        >
                          <Link to={`/guru/materi/${m.id}/edit`}>
                            <Edit className="w-4 h-4 text-muted-foreground" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(m)}
                          className="hover:text-destructive"
                          title="Hapus Materi"
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

      {/* Modal Generator Materi AI */}
      <AiMateriGeneratorModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onGenerated={async (aiData) => {
          try {
            setLoading(true)
            // Hitung urutan berikutnya agar berlanjut dari materi terakhir yang ada
            const maxUrutan = materiList.reduce((max, m) => {
              const u = Number(m.urutan) || 0
              return u > max ? u : max
            }, 0)
            const nextUrutan = maxUrutan + 1

            const materiPayload = {
              ...aiData,
              urutan: nextUrutan,
            }

            const docRef = await createMateri(materiPayload)
            const newId = docRef.id
            navigate(`/guru/materi/${newId}/edit`)
          } catch (err) {
            console.error("Gagal simpan materi AI:", err)
            alert(err.message || "Gagal menyimpan materi yang digenerate AI.")
            await loadData()
          } finally {
            setLoading(false)
          }
        }}
        initialMapel="Bahasa Inggris"
      />
    </div>
  )
}
