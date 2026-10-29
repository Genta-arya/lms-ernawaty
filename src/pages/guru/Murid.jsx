import React, { useState, useEffect, useRef } from "react"
import { getMuridList, createMurid, updateMurid, deleteMurid, batchImportMurid, unlinkAkunMurid } from "@/services/murid"
import { getKelasList } from "@/services/kelas"
import { parseMuridCsv, exportToCsv } from "@/lib/csv"
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
import {
  Plus,
  Upload,
  Download,
  Search,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  Unlink,
} from "lucide-react"

export function Murid() {
  const [muridList, setMuridList] = useState([])
  const [kelasList, setKelasList] = useState([])
  const [loading, setLoading] = useState(true)

  // Filter & Search
  const [search, setSearch] = useState("")
  const [selectedKelas, setSelectedKelas] = useState("SEMUA")

  // Modal Tambah/Edit
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMurid, setEditingMurid] = useState(null)
  const [formData, setFormData] = useState({
    nisn: "",
    nama: "",
    kelasId: "",
    email: "",
  })
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  // CSV Import State
  const fileInputRef = useRef(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importPreview, setImportPreview] = useState(null)
  const [importing, setImporting] = useState(false)

  async function loadData() {
    try {
      const [murids, kelas] = await Promise.all([
        getMuridList(),
        getKelasList(),
      ])
      setMuridList(murids)
      setKelasList(kelas)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const kelasMap = new Map()
  kelasList.forEach((k) => kelasMap.set(k.id, k.nama))

  // Filtered List
  const filteredList = muridList.filter((m) => {
    const matchKelas = selectedKelas === "SEMUA" || m.kelasId === selectedKelas
    const matchSearch =
      m.nama.toLowerCase().includes(search.toLowerCase()) ||
      m.nisn.includes(search)
    return matchKelas && matchSearch
  })

  function handleOpenCreate() {
    setEditingMurid(null)
    setFormData({
      nisn: "",
      nama: "",
      kelasId: kelasList[0]?.id || "",
      email: "",
    })
    setError("")
    setDialogOpen(true)
  }

  function handleOpenEdit(m) {
    setEditingMurid(m)
    setFormData({
      nisn: m.nisn,
      nama: m.nama,
      kelasId: m.kelasId || "",
      email: m.email || m.akunMurid?.email || "",
    })
    setError("")
    setDialogOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      if (editingMurid) {
        await updateMurid(editingMurid.nisn, {
          nisn: formData.nisn,
          nama: formData.nama,
          kelasId: formData.kelasId,
          email: formData.email,
        })
      } else {
        await createMurid(formData)
      }
      setDialogOpen(false)
      await loadData()
    } catch (err) {
      setError(err.message || "Gagal menyimpan data murid.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(m) {
    const deleteRiwayat = confirm(`Hapus murid ${m.nama}? Tekan OK untuk menghapus murid beserta seluruh riwayat pengerjaan kuisnya.`)
    if (deleteRiwayat) {
      try {
        await deleteMurid(m.nisn, true)
        await loadData()
      } catch (err) {
        alert(err.message || "Gagal menghapus murid.")
      }
    }
  }

  // Handle CSV Import
  async function handleCsvFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const parsed = await parseMuridCsv(file)
      // Cocokkan nama kelas di CSV dengan kelasId di sistem
      const kelasNameToId = new Map()
      kelasList.forEach((k) => kelasNameToId.set(k.nama.toLowerCase().trim(), k.id))

      const matchedValidRows = []
      const extraErrors = [...parsed.errorRows]

      parsed.validRows.forEach((row, idx) => {
        const matchedId = kelasNameToId.get(row.kelas.toLowerCase().trim())
        if (!matchedId) {
          extraErrors.push({
            rowNumber: idx + 2,
            row,
            errors: [`Kelas "${row.kelas}" tidak ditemukan di sistem. Buat kelas tersebut terlebih dahulu.`],
          })
        } else {
          matchedValidRows.push({
            ...row,
            kelasId: matchedId,
          })
        }
      })

      setImportPreview({
        validRows: matchedValidRows,
        errorRows: extraErrors,
      })
      setImportDialogOpen(true)
    } catch (err) {
      alert("Format file CSV tidak valid.")
    } finally {
      e.target.value = ""
    }
  }

  async function handleConfirmImport() {
    if (!importPreview?.validRows?.length) return
    setImporting(true)
    try {
      await batchImportMurid(importPreview.validRows)
      setImportDialogOpen(false)
      setImportPreview(null)
      await loadData()
      alert(`Berhasil mengimpor ${importPreview.validRows.length} data murid!`)
    } catch (err) {
      alert(err.message || "Gagal mengimpor murid.")
    } finally {
      setImporting(false)
    }
  }

  // Handle Export CSV
  function handleExportCsv() {
    const exportData = filteredList.map((m) => ({
      NISN: m.nisn,
      Nama: m.nama,
      Kelas: kelasMap.get(m.kelasId) || "-",
      Email: m.email || "-",
      StatusAkun: m.isLinked ? "Terhubung" : "Belum Aktif",
    }))
    exportToCsv(`Data_Murid_SMPN3_Ketapang_${new Date().toISOString().slice(0, 10)}`, exportData)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data Murid</h1>
          <p className="text-sm text-muted-foreground">
            Kelola data siswa, tautan akun Google murid, dan impor/ekspor CSV.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleCsvFileChange}
            accept=".csv"
            className="hidden"
          />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
            <Upload className="w-4 h-4" />
            Impor CSV
          </Button>

          <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-2">
            <Download className="w-4 h-4" />
            Ekspor CSV
          </Button>

          <Button onClick={handleOpenCreate} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Tambah Murid
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Cari nama atau NISN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Filter Kelas:</span>
            <select
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
            >
              <option value="SEMUA">Semua Kelas ({muridList.length})</option>
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tabel Data Siswa */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NISN</TableHead>
                <TableHead>Nama Siswa</TableHead>
                <TableHead>Kelas</TableHead>
                <TableHead>Email Google</TableHead>
                <TableHead>Status Akun</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRowsLoading rows={5} cols={6} />
              ) : filteredList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    Tidak ada data murid yang sesuai.
                  </TableCell>
                </TableRow>
              ) : (
                filteredList.map((m) => (
                  <TableRow key={m.nisn}>
                    <TableCell className="font-mono text-xs font-semibold">{m.nisn}</TableCell>
                    <TableCell className="font-medium text-foreground text-xs">{m.nama}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{kelasMap.get(m.kelasId) || "Belum ada kelas"}</Badge>
                    </TableCell>
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
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(m)}>
                          <Edit className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(m)}
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

      {/* Modal Tambah/Edit Murid */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMurid ? "Edit Data Siswa" : "Tambah Siswa Baru"}</DialogTitle>
          </DialogHeader>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground flex items-center justify-between">
                <span>NISN (10 Digit Angka)</span>
                {editingMurid && (
                  <span className="text-[10px] text-blue-600 font-normal">Dapat diedit guru</span>
                )}
              </label>
              <Input
                placeholder="0081234567"
                maxLength={10}
                value={formData.nisn}
                onChange={(e) => setFormData({ ...formData, nisn: e.target.value.replace(/\D/g, "") })}
                required
              />
              {editingMurid && editingMurid.nisn !== formData.nisn && (
                <p className="text-[10px] text-amber-600 font-medium">
                  ⚠️ Mengubah NISN dari <b>{editingMurid.nisn}</b> ke <b>{formData.nisn}</b> akan memperbarui NISN pada akun login dan riwayat siswa secara otomatis.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Nama Siswa</label>
              <Input
                placeholder="Nama lengkap siswa"
                value={formData.nama}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Kelas</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                value={formData.kelasId}
                onChange={(e) => setFormData({ ...formData, kelasId: e.target.value })}
                required
              >
                <option value="">-- Pilih Kelas --</option>
                {kelasList.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama} (Tingkat {k.tingkat})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground flex items-center justify-between">
                <span>Email Google Siswa (Akun Masuk)</span>
                {editingMurid?.isLinked && (
                  <Badge variant="success" className="text-[10px] font-bold">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Google Terhubung
                  </Badge>
                )}
              </label>
              <Input
                type="email"
                placeholder="siswa@gmail.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <p className="text-[10px] text-muted-foreground">
                Email ini digunakan siswa untuk masuk via tombol "Lanjutkan dengan Google".
              </p>

              {editingMurid?.isLinked && (
                <div className="pt-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (
                        confirm(
                          `Putuskan tautan akun Google untuk siswa "${editingMurid.nama}"?\n\nSiswa akan dapat masuk dengan akun Google baru atau email baru yang Anda tentukan.`
                        )
                      ) {
                        try {
                          await unlinkAkunMurid(editingMurid.nisn)
                          setEditingMurid({ ...editingMurid, isLinked: false, akunMurid: null })
                          alert("Tautan akun Google lama berhasil diputuskan. Siswa sekarang dapat masuk dengan akun Google baru.")
                          await loadData()
                        } catch (err) {
                          alert("Gagal memutuskan tautan: " + err.message)
                        }
                      }
                    }}
                    className="h-8 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 gap-1.5 w-full sm:w-auto"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>Putuskan Tautan Akun Google Lama</span>
                  </Button>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan Data Siswa"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Pratinjau Impor CSV */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              Pratinjau Impor CSV Siswa
            </DialogTitle>
          </DialogHeader>

          {importPreview && (
            <div className="space-y-4 text-xs">
              <div className="flex gap-4">
                <Badge variant="success">{importPreview.validRows.length} Data Siap Impor</Badge>
                {importPreview.errorRows.length > 0 && (
                  <Badge variant="destructive">{importPreview.errorRows.length} Data Bermasalah</Badge>
                )}
              </div>

              {importPreview.errorRows.length > 0 && (
                <div className="max-h-36 overflow-y-auto border border-destructive/30 rounded-lg p-3 bg-destructive/5 space-y-1 text-destructive">
                  <p className="font-bold">Baris bermasalah (tidak akan diimpor):</p>
                  {importPreview.errorRows.map((err, i) => (
                    <div key={i}>
                      Baris {err.rowNumber}: {err.errors.join(", ")}
                    </div>
                  ))}
                </div>
              )}

              <div className="max-h-60 overflow-y-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>NISN</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Kelas</TableHead>
                      <TableHead>Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importPreview.validRows.slice(0, 10).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono">{r.nisn}</TableCell>
                        <TableCell>{r.nama}</TableCell>
                        <TableCell>{r.kelas}</TableCell>
                        <TableCell>{r.email || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {importPreview.validRows.length > 10 && (
                <p className="text-[11px] text-muted-foreground text-center">
                  Dan {importPreview.validRows.length - 10} baris lainnya...
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={importing || !importPreview?.validRows?.length}
            >
              {importing ? "Mengimpor..." : `Simpan ${importPreview?.validRows?.length || 0} Siswa`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

