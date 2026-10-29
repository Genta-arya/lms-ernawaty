import React, { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { getKelasList, createKelas, updateKelas, deleteKelas } from "@/services/kelas"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { TableRowsLoading } from "@/components/ui/loading-skeletons"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Plus, GraduationCap, Edit, Trash2, Users, AlertCircle, ArrowRight } from "lucide-react"

export function Kelas() {
  const [kelasList, setKelasList] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingKelas, setEditingKelas] = useState(null)
  const [formData, setFormData] = useState({
    nama: "",
    tingkat: 7,
    tahunAjaran: "2026/2027",
    keterangan: "",
  })
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  async function loadData() {
    try {
      const data = await getKelasList()
      setKelasList(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function handleOpenCreate() {
    setEditingKelas(null)
    setFormData({
      nama: "",
      tingkat: 7,
      tahunAjaran: "2026/2027",
      keterangan: "",
    })
    setError("")
    setDialogOpen(true)
  }

  function handleOpenEdit(kelas) {
    setEditingKelas(kelas)
    setFormData({
      nama: kelas.nama,
      tingkat: kelas.tingkat,
      tahunAjaran: kelas.tahunAjaran,
      keterangan: kelas.keterangan || "",
    })
    setError("")
    setDialogOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      if (editingKelas) {
        await updateKelas(editingKelas.id, formData)
      } else {
        await createKelas(formData)
      }
      setDialogOpen(false)
      await loadData()
    } catch (err) {
      setError(err.message || "Gagal menyimpan kelas.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(kelas) {
    if (confirm(`Apakah Anda yakin ingin menghapus kelas ${kelas.nama}?`)) {
      try {
        await deleteKelas(kelas.id)
        await loadData()
      } catch (err) {
        alert(err.message || "Gagal menghapus kelas.")
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kelola Kelas</h1>
          <p className="text-sm text-muted-foreground">
            Daftar kelas binaan Fase D (VII, VIII, IX) di SMPN 3 Ketapang.
          </p>
        </div>
        <Button onClick={handleOpenCreate} size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Tambah Kelas Baru
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Kelas</TableHead>
                <TableHead>Tingkat</TableHead>
                <TableHead>Tahun Ajaran</TableHead>
                <TableHead>Jumlah Siswa</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRowsLoading rows={4} cols={6} />
              ) : kelasList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    Belum ada data kelas. Klik tombol "Tambah Kelas Baru" untuk menambahkan.
                  </TableCell>
                </TableRow>
              ) : (
                kelasList.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-semibold text-foreground">
                      <Link to={`/guru/kelas/${k.id}`} className="hover:text-primary transition-colors flex items-center gap-2">
                        {k.nama}
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">Kelas {k.tingkat}</Badge>
                    </TableCell>
                    <TableCell>{k.tahunAjaran}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 font-medium">
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                        {k.jumlahMurid} Siswa
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{k.keterangan || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(k)}>
                          <Edit className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(k)}
                          className="hover:text-destructive"
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

      {/* Modal Tambah/Edit Kelas */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingKelas ? "Edit Kelas" : "Tambah Kelas Baru"}</DialogTitle>
          </DialogHeader>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Nama Kelas</label>
              <Input
                placeholder="Misal: VII A atau VIII B"
                value={formData.nama}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Tingkat</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                  value={formData.tingkat}
                  onChange={(e) => setFormData({ ...formData, tingkat: Number(e.target.value) })}
                >
                  <option value={7}>Kelas 7 (VII)</option>
                  <option value={8}>Kelas 8 (VIII)</option>
                  <option value={9}>Kelas 9 (IX)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Tahun Ajaran</label>
                <Input
                  placeholder="2026/2027"
                  value={formData.tahunAjaran}
                  onChange={(e) => setFormData({ ...formData, tahunAjaran: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Keterangan (Opsional)</label>
              <Input
                placeholder="Catatan kelas"
                value={formData.keterangan}
                onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan Kelas"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

