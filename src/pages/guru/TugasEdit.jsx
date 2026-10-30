import React, { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { useToast } from "@/context/ToastContext"
import { getTugasById, createTugas, updateTugas } from "@/services/tugas"
import { getMateriList } from "@/services/materi"
import { getKelasList } from "@/services/kelas"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RichTextEditor } from "@/components/materi/RichTextEditor"
import { Badge } from "@/components/ui/badge"
import { FormEditSkeleton } from "@/components/ui/loading-skeletons"
import {
  ArrowLeft,
  Save,
  AlertCircle,
  ClipboardList,
  Clock,
  Sparkles,
  School,
  Check,
} from "lucide-react"

export function TugasEdit() {
  const { id } = useParams()
  const isNew = !id || id === "baru"
  const navigate = useNavigate()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    judul: "",
    deskripsi: "",
    materiId: "",
    tingkat: ["VIII"],
    kelasIds: [],
    deadline: "",
    status: "terbit",
    petunjukLink:
      "Unggah tugasmu ke Google Drive atau buat di Google Docs/Canva, lalu salin tautannya ke sini. Pastikan akses tautan diatur ke 'Siapa saja yang memiliki link' (Anyone with link) agar Ibu Guru dapat membukanya.",
  })

  const [materiList, setMateriList] = useState([])
  const [kelasList, setKelasList] = useState([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })

    async function load() {
      try {
        const [mat, kList] = await Promise.all([
          getMateriList(true),
          getKelasList(),
        ])
        setMateriList(mat)
        setKelasList(kList)

        if (!isNew) {
          const t = await getTugasById(id)
          if (t) {
            // Format deadline untuk input datetime-local jika ada
            let dlString = ""
            if (t.deadline) {
              const d = new Date(t.deadline)
              if (!isNaN(d.getTime())) {
                const pad = (n) => String(n).padStart(2, "0")
                dlString = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
              }
            }

            setFormData({
              judul: t.judul || "",
              deskripsi: t.deskripsi || "",
              materiId: t.materiId || "",
              tingkat: t.tingkat || ["VIII"],
              kelasIds: t.kelasIds || [],
              deadline: dlString,
              status: t.status || "terbit",
              petunjukLink:
                t.petunjukLink ||
                "Unggah tugasmu ke Google Drive, lalu salin link ke sini dengan izin akses terbuka.",
            })
          } else {
            setError("Tugas tidak ditemukan.")
          }
        }
      } catch (err) {
        setError(err.message || "Gagal memuat tugas.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, isNew])

  function toggleTingkat(ting) {
    let next = [...(formData.tingkat || [])]
    if (next.includes(ting)) {
      next = next.filter((t) => t !== ting)
    } else {
      next.push(ting)
    }
    setFormData({ ...formData, tingkat: next })
  }

  function toggleKelas(kelasId) {
    let next = [...(formData.kelasIds || [])]
    if (next.includes(kelasId)) {
      next = next.filter((k) => k !== kelasId)
    } else {
      next.push(kelasId)
    }

    // Perbarui juga auto tingkat berdasarkan kelas yang terpilih jika ada kelas
    let nextTingkat = [...(formData.tingkat || [])]
    const targetKelas = kelasList.find((k) => k.id === kelasId)
    if (targetKelas) {
      const romawi =
        targetKelas.tingkat === 7 ? "VII" : targetKelas.tingkat === 8 ? "VIII" : targetKelas.tingkat === 9 ? "IX" : null
      if (romawi && !nextTingkat.includes(romawi) && next.includes(kelasId)) {
        nextTingkat.push(romawi)
      }
    }

    setFormData({ ...formData, kelasIds: next, tingkat: nextTingkat })
  }

  function toggleSelectAllTingkat(tingkatNum, romawi) {
    const kelasDiTingkat = kelasList.filter((k) => Number(k.tingkat) === Number(tingkatNum))
    const idsDiTingkat = kelasDiTingkat.map((k) => k.id)
    const currentSelected = formData.kelasIds || []

    const allSelected = idsDiTingkat.every((id) => currentSelected.includes(id))
    let newSelected
    let newTingkat = [...(formData.tingkat || [])]

    if (allSelected) {
      // Uncheck all in this grade
      newSelected = currentSelected.filter((id) => !idsDiTingkat.includes(id))
      newTingkat = newTingkat.filter((t) => t !== romawi)
    } else {
      // Check all in this grade
      newSelected = Array.from(new Set([...currentSelected, ...idsDiTingkat]))
      if (!newTingkat.includes(romawi)) {
        newTingkat.push(romawi)
      }
    }

    setFormData({
      ...formData,
      kelasIds: newSelected,
      tingkat: newTingkat,
    })
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError("")

    if (!formData.judul.trim()) {
      setError("Judul tugas wajib diisi.")
      setSaving(false)
      return
    }

    if (!formData.deskripsi.trim()) {
      setError("Instruksi penugasan wajib diisi.")
      setSaving(false)
      return
    }

    // Format ISO string untuk deadline jika diisi
    let isoDeadline = null
    if (formData.deadline) {
      const d = new Date(formData.deadline)
      if (!isNaN(d.getTime())) {
        isoDeadline = d.toISOString()
      }
    }

    // Cari nama-nama kelas yang terpilih untuk disimpan sebagai label praktis
    const selectedKelasNames = kelasList
      .filter((k) => (formData.kelasIds || []).includes(k.id))
      .map((k) => k.nama)

    // Tentukan tingkat berdasarkan kelas yang terpilih bila ada
    let finalTingkat = formData.tingkat || []
    if (formData.kelasIds && formData.kelasIds.length > 0) {
      const derivedTingkat = new Set()
      kelasList.forEach((k) => {
        if (formData.kelasIds.includes(k.id)) {
          if (k.tingkat === 7 || String(k.tingkat).includes("7")) derivedTingkat.add("VII")
          if (k.tingkat === 8 || String(k.tingkat).includes("8")) derivedTingkat.add("VIII")
          if (k.tingkat === 9 || String(k.tingkat).includes("9")) derivedTingkat.add("IX")
        }
      })
      if (derivedTingkat.size > 0) {
        finalTingkat = Array.from(derivedTingkat)
      }
    }

    const payload = {
      judul: formData.judul.trim(),
      deskripsi: formData.deskripsi.trim(),
      materiId: formData.materiId || null,
      tingkat: finalTingkat.length > 0 ? finalTingkat : ["VIII"],
      kelasIds: formData.kelasIds || [],
      kelasNamaList: selectedKelasNames,
      deadline: isoDeadline,
      status: formData.status || "terbit",
      petunjukLink: formData.petunjukLink.trim(),
    }

    try {
      if (isNew) {
        await createTugas(payload)
        toast.success("Tugas Dibuat", `Tugas "${formData.judul}" berhasil dipublikasikan.`)
      } else {
        await updateTugas(id, payload)
        toast.success("Tugas Diperbarui", `Perubahan tugas "${formData.judul}" berhasil disimpan.`)
      }
      navigate("/guru/tugas")
    } catch (err) {
      setError(err.message || "Gagal menyimpan tugas.")
      toast.error("Gagal Menyimpan", err.message || "Terjadi kendala saat menyimpan tugas.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <FormEditSkeleton icon={ClipboardList} />
  }

  return (
    <div className="space-y-6 pb-16 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="shrink-0 rounded-xl">
            <Link to="/guru/tugas">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              {isNew ? "Buat Penugasan Baru" : "Edit Penugasan"}
            </h1>
            <p className="text-xs text-slate-500">
              Tentukan instruksi penugasan, batas waktu, dan target kelas spesifik.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild className="rounded-xl text-xs font-bold">
            <Link to="/guru/tugas">Batal</Link>
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Menyimpan..." : "Simpan Tugas"}</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Card */}
      <Card className="rounded-3xl border border-slate-200/90 shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-100 p-5 pb-3">
          <CardTitle className="text-sm font-extrabold text-slate-900">
            Rincian Penugasan
          </CardTitle>
        </CardHeader>

        <CardContent className="p-5 space-y-4 text-xs">
          {/* Judul Tugas */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">Judul Penugasan</label>
            <Input
              placeholder="Contoh: Menulis Teks Rekon Pribadi (Kisah Inspiratif Liburan)"
              value={formData.judul}
              onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
              className="h-10 rounded-xl text-xs sm:text-sm font-semibold"
              required
            />
          </div>

          {/* Pemilihan Target Kelas (Tingkat & Breakdown Kelas Spesifik) */}
          <div className="space-y-3 p-4 bg-slate-50/70 border border-slate-200 rounded-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <School className="w-4 h-4 text-blue-600" />
                  Target Kelas & Tingkatan
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Pilih kelas spesifik yang dapat mengakses dan mengerjakan tugas ini (misal 7A, 8B).
                </p>
              </div>
              <div className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 shrink-0 self-start sm:self-auto">
                {formData.kelasIds?.length > 0
                  ? `${formData.kelasIds.length} Kelas Terpilih`
                  : "Semua Kelas (Umum)"}
              </div>
            </div>

            {/* Kelompok Kelas per Tingkat (7, 8, 9) */}
            <div className="space-y-3 pt-1">
              {[
                { num: 7, romawi: "VII", label: "Tingkat 7 (Fase D)" },
                { num: 8, romawi: "VIII", label: "Tingkat 8 (Fase D)" },
                { num: 9, romawi: "IX", label: "Tingkat 9 (Fase D)" },
              ].map(({ num, romawi, label }) => {
                const kelasDiTingkat = kelasList.filter((k) => Number(k.tingkat) === num)
                const isAllInGrade =
                  kelasDiTingkat.length > 0 &&
                  kelasDiTingkat.every((k) => formData.kelasIds?.includes(k.id))

                return (
                  <div
                    key={num}
                    className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-700 text-xs">{label}</span>
                        <span className="text-[10px] text-slate-400">
                          ({kelasDiTingkat.length} kelas)
                        </span>
                      </div>
                      {kelasDiTingkat.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleSelectAllTingkat(num, romawi)}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          {isAllInGrade ? "Batal Pilih Semua" : "Pilih Semua"}
                        </button>
                      )}
                    </div>

                    {kelasDiTingkat.length === 0 ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleTingkat(romawi)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                            formData.tingkat?.includes(romawi)
                              ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          Semua Kelas {romawi}
                        </button>
                        <span className="text-[11px] text-slate-400 italic">
                          (Belum ada data sub-kelas di database)
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {kelasDiTingkat.map((k) => {
                          const isSelected = formData.kelasIds?.includes(k.id)
                          return (
                            <button
                              key={k.id}
                              type="button"
                              onClick={() => toggleKelas(k.id)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                                isSelected
                                  ? "bg-blue-600 text-white border-blue-600 shadow-2xs scale-[1.02]"
                                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                              }`}
                            >
                              <span
                                className={`w-3.5 h-3.5 rounded-md flex items-center justify-center text-[10px] border ${
                                  isSelected
                                    ? "bg-white text-blue-600 border-white"
                                    : "border-slate-300 bg-white"
                                }`}
                              >
                                {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </span>
                              <span>Kelas {k.nama}</span>
                              {k.jumlahMurid > 0 && (
                                <span
                                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                    isSelected
                                      ? "bg-blue-500 text-white"
                                      : "bg-slate-200/80 text-slate-600"
                                  }`}
                                >
                                  {k.jumlahMurid} murid
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Grid: Status, Relasi Materi, Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Status Publikasi */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Status Tugas</label>
              <select
                className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="terbit">Terbit (Dapat Dikerjakan Siswa)</option>
                <option value="draft">Draf (Hanya Guru)</option>
              </select>
            </div>

            {/* Materi Terkait (Opsional) */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">Modul Referensi (Opsional)</label>
              <select
                className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={formData.materiId}
                onChange={(e) => setFormData({ ...formData, materiId: e.target.value })}
              >
                <option value="">-- Tidak Terikat Materi Tertentu --</option>
                {materiList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.judul} (Kelas {m.tingkat?.join(", ")})
                  </option>
                ))}
              </select>
            </div>

            {/* Batas Waktu / Deadline */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Batas Waktu Pengumpulan</span>
              </label>
              <Input
                type="datetime-local"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="h-10 rounded-xl text-xs font-semibold"
              />
            </div>
          </div>

          {/* Instruksi Lengkap Penugasan dengan Rich Text Editor */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700">Instruksi & Kriteria Penugasan</label>
              <span className="text-[11px] text-slate-400">
                Mendukung teks tebal, miring, daftar poin/nomor, dan tabel kriteria
              </span>
            </div>
            <RichTextEditor
              value={formData.deskripsi}
              onChange={(val) => setFormData({ ...formData, deskripsi: val })}
              placeholder="Tuliskan instruksi penugasan secara detail untuk siswa (langkah pengerjaan, format berkas, struktur teks)..."
              minHeight="220px"
            />
          </div>

          {/* Panduan Input Link Bagi Siswa */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">
              Petunjuk Pengumpulan Tautan (Dilihat oleh Siswa)
            </label>
            <Textarea
              rows={3}
              value={formData.petunjukLink}
              onChange={(e) => setFormData({ ...formData, petunjukLink: e.target.value })}
              className="rounded-2xl text-xs leading-relaxed p-3 bg-slate-50/50 focus:bg-white text-slate-600"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


