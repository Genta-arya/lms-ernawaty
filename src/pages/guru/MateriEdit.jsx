import React, { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { getMateriById, createMateri, updateMateri } from "@/services/materi"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { FormEditSkeleton } from "@/components/ui/loading-skeletons"
import { AiMateriGeneratorModal } from "@/components/materi/AiMateriGeneratorModal"
import { RichTextEditor } from "@/components/materi/RichTextEditor"
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  Sparkles,
  BookOpen,
  Link as LinkIcon,
  ExternalLink,
} from "lucide-react"

export function MateriEdit() {
  const { id } = useParams()
  const isNew = !id || id === "baru"
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    judul: "",
    slug: "",
    topik: "Recount Text",
    mapel: "Bahasa Inggris",
    fase: "D",
    urutan: 1,
    status: "draft",
    deskripsi: "",
    tujuan: [""],
    tingkat: ["VIII"],
    linkMateri: [
      // { judul: "", url: "", jenis: "drive" }
    ],
    bagian: [
      {
        id: "b1",
        judul: "1. Pengantar Materi",
        jenis: "pengantar",
        urutan: 1,
        konten: "Tulis isi materi pengantar di sini seperti di Microsoft Word...",
      },
    ],
  })

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)

  useEffect(() => {
    // Otomatis scroll ke atas saat form editor materi dibuka
    window.scrollTo({ top: 0, behavior: "smooth" })

    async function load() {
      if (!isNew) {
        try {
          const data = await getMateriById(id)
          if (data) {
            setFormData(data)
          } else {
            setError("Materi tidak ditemukan.")
          }
        } catch (err) {
          setError(err.message || "Gagal memuat materi.")
        } finally {
          setLoading(false)
        }
      } else {
        // Jika buat baru, otomatis hitung urutan berikutnya dari materi yang sudah ada
        try {
          const { getMateriList } = await import("@/services/materi")
          const list = await getMateriList(true)
          const maxUrutan = list.reduce((max, m) => {
            const u = Number(m.urutan) || 0
            return u > max ? u : max
          }, 0)
          setFormData((prev) => ({ ...prev, urutan: maxUrutan + 1 }))
        } catch (_) {}
      }
    }
    load()
  }, [id, isNew])

  function handleAddTujuan() {
    setFormData({ ...formData, tujuan: [...formData.tujuan, ""] })
  }

  function handleUpdateTujuan(index, val) {
    const next = [...formData.tujuan]
    next[index] = val
    setFormData({ ...formData, tujuan: next })
  }

  function handleRemoveTujuan(index) {
    const next = formData.tujuan.filter((_, i) => i !== index)
    setFormData({ ...formData, tujuan: next })
  }

  // Pengelolaan Link Eksternal / Materi Pendukung
  function handleAddLinkMateri() {
    const current = formData.linkMateri || []
    setFormData({
      ...formData,
      linkMateri: [...current, { judul: "", url: "", jenis: "drive" }],
    })
  }

  function handleUpdateLinkMateri(index, field, val) {
    const next = [...(formData.linkMateri || [])]
    next[index] = { ...next[index], [field]: val }
    setFormData({ ...formData, linkMateri: next })
  }

  function handleRemoveLinkMateri(index) {
    const next = (formData.linkMateri || []).filter((_, i) => i !== index)
    setFormData({ ...formData, linkMateri: next })
  }

  function toggleTingkat(ting) {
    let next = [...(formData.tingkat || [])]
    if (next.includes(ting)) {
      next = next.filter((t) => t !== ting)
    } else {
      next.push(ting)
    }
    setFormData({ ...formData, tingkat: next })
  }

  function handleAddBagian() {
    const newBagian = {
      id: `b_${Date.now()}`,
      judul: `Bagian Baru ${formData.bagian.length + 1}`,
      jenis: "struktur",
      urutan: formData.bagian.length + 1,
      konten: "",
    }
    setFormData({ ...formData, bagian: [...formData.bagian, newBagian] })
  }

  function handleUpdateBagian(index, field, val) {
    const next = [...formData.bagian]
    next[index] = { ...next[index], [field]: val }
    setFormData({ ...formData, bagian: next })
  }

  function handleRemoveBagian(index) {
    const next = formData.bagian.filter((_, i) => i !== index)
    setFormData({ ...formData, bagian: next })
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError("")

    if (!formData.judul.trim()) {
      setError("Judul materi wajib diisi.")
      setSaving(false)
      return
    }

    const cleanSlug =
      formData.slug.trim() ||
      formData.judul
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "")

    // Bersihkan link materi yang kosong
    const cleanLinkMateri = (formData.linkMateri || [])
      .filter((l) => l.url && l.url.trim() !== "")
      .map((l) => ({
        judul: (l.judul || "").trim() || "Tautan Materi Pendukung",
        url: l.url.trim(),
        jenis: l.jenis || "drive",
      }))

    const cleanData = {
      ...formData,
      slug: cleanSlug,
      tujuan: formData.tujuan.filter((t) => t.trim() !== ""),
      linkMateri: cleanLinkMateri,
    }

    try {
      if (isNew) {
        await createMateri(cleanData)
      } else {
        await updateMateri(id, cleanData)
      }
      navigate("/guru/materi")
    } catch (err) {
      setError(err.message || "Gagal menyimpan materi.")
    } finally {
      setSaving(false)
    }
  }

  function handleAiGenerated(aiData) {
    if (!aiData) return
    setFormData((prev) => ({
      ...prev,
      judul: aiData.judul || prev.judul,
      slug: aiData.slug || prev.slug,
      topik: aiData.topik || prev.topik,
      mapel: aiData.mapel || prev.mapel,
      deskripsi: aiData.deskripsi || prev.deskripsi,
      tingkat: aiData.tingkat || prev.tingkat,
      urutan: prev.urutan || 1,
      tujuan: aiData.tujuan && aiData.tujuan.length > 0 ? aiData.tujuan : prev.tujuan,
      bagian: aiData.bagian && aiData.bagian.length > 0 ? aiData.bagian : prev.bagian,
    }))
  }

  if (loading) {
    return <FormEditSkeleton icon={BookOpen} />
  }

  return (
    <div className="space-y-6 pb-16 max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link to="/guru/materi">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {isNew ? "Buat Materi Baru" : "Edit Materi"}
            </h1>
            <p className="text-xs text-muted-foreground">
              Susun modul pembelajaran teks rekon dengan format Markdown.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAiModalOpen(true)}
            className="gap-1.5 sm:gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-700 hover:from-blue-100 hover:to-indigo-100 font-bold shrink-0 text-xs"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Generate Materi AI</span>
          </Button>
          <Button variant="outline" size="sm" asChild className="shrink-0 text-xs">
            <Link to="/guru/materi">Batal</Link>
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 sm:gap-2 shrink-0 text-xs">
            <Save className="w-4 h-4" />
            {saving ? "Menyimpan..." : "Simpan Materi"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs flex gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Informasi Umum Materi */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold">Informasi Utama</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Judul Materi</label>
              <Input
                placeholder="Contoh: Teks Rekon: Pengertian, Jenis, dan Struktur"
                value={formData.judul}
                onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Slug URL Publik</label>
              <Input
                placeholder="teks-rekon-struktur (otomatis jika dikosongkan)"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Topik</label>
              <Input
                value={formData.topik}
                onChange={(e) => setFormData({ ...formData, topik: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Status Publikasi</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="draft">Draf (Hanya Guru)</option>
                <option value="terbit">Terbit (Publik & Murid)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Urutan Tampil</label>
              <Input
                type="number"
                min={1}
                value={formData.urutan}
                onChange={(e) => setFormData({ ...formData, urutan: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground block">Tingkat Sasaran</label>
              <div className="flex gap-2 pt-1">
                {["VII", "VIII", "IX"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTingkat(t)}
                    className={`px-3 py-1.5 rounded-md border font-bold text-xs transition-colors ${
                      formData.tingkat?.includes(t)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-input"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Deskripsi Ringkas</label>
            <Textarea
              rows={2}
              placeholder="Deskripsi singkat isi materi untuk pratinjau kartu materi..."
              value={formData.deskripsi}
              onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tujuan Pembelajaran */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold">Tujuan Pembelajaran</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={handleAddTujuan} className="h-7 text-xs gap-1">
            <Plus className="w-3.5 h-3.5" />
            Tambah Tujuan
          </Button>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          {formData.tujuan?.map((tuj, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="font-bold text-muted-foreground w-6 text-center shrink-0">{idx + 1}.</span>
              <Input
                value={tuj}
                placeholder="Contoh: Menjelaskan tujuan komunikasi teks rekon..."
                onChange={(e) => handleUpdateTujuan(idx, e.target.value)}
                className="min-w-0"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveTujuan(idx)}
                className="hover:text-destructive shrink-0"
              >
                <Trash2 className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Tautan Materi Pendukung (Google Drive / Canva / PDF / YouTube / Web) */}
      <Card className="rounded-2xl border border-blue-200/80 bg-gradient-to-b from-blue-50/30 to-white shadow-2xs">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
              <LinkIcon className="w-4 h-4 text-blue-600" />
              <span>Tautan Materi Pembelajaran & Referensi (Opsional)</span>
            </CardTitle>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Sisipkan link Google Drive (modul/slide PPT/PDF), Canva, video YouTube, atau artikel referensi bagi siswa.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddLinkMateri}
            className="h-8 text-xs font-bold gap-1.5 border-blue-200 bg-white hover:bg-blue-50 text-blue-700 shrink-0 self-start sm:self-auto rounded-xl"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Tautan Materi</span>
          </Button>
        </CardHeader>

        <CardContent className="space-y-3 text-xs">
          {!formData.linkMateri || formData.linkMateri.length === 0 ? (
            <div className="py-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <LinkIcon className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
              <p className="text-xs font-medium text-slate-500">Belum ada tautan materi yang disisipkan.</p>
              <p className="text-[11px] text-slate-400">Klik tombol di atas untuk menambahkan link Google Drive, Canva, atau PDF.</p>
            </div>
          ) : (
            formData.linkMateri.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-white border border-slate-200/90 rounded-xl shadow-2xs space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="w-full sm:w-44 shrink-0">
                    <select
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700"
                      value={item.jenis || "drive"}
                      onChange={(e) => handleUpdateLinkMateri(idx, "jenis", e.target.value)}
                    >
                      <option value="drive">📁 Google Drive / Dokumen</option>
                      <option value="canva">🎨 Desain Canva</option>
                      <option value="pdf">📄 Modul PDF</option>
                      <option value="video">🎥 Video YouTube / Media</option>
                      <option value="web">🌐 Tautan Web / Artikel</option>
                    </select>
                  </div>

                  <div className="flex-1 min-w-0">
                    <Input
                      placeholder="Judul Tautan (contoh: Slide Presentasi Materi Teks Rekon)"
                      value={item.judul}
                      onChange={(e) => handleUpdateLinkMateri(idx, "judul", e.target.value)}
                      className="h-9 text-xs rounded-lg"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveLinkMateri(idx)}
                    className="hover:text-rose-600 hover:bg-rose-50 text-slate-400 shrink-0 h-9 w-9 self-end sm:self-auto rounded-lg"
                    title="Hapus tautan ini"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="url"
                    placeholder="https://drive.google.com/... atau https://canva.com/..."
                    value={item.url}
                    onChange={(e) => handleUpdateLinkMateri(idx, "url", e.target.value)}
                    className="h-9 text-xs rounded-lg font-mono flex-1 min-w-0 bg-slate-50/50"
                  />
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 flex items-center gap-1 shrink-0 text-[11px] transition-colors"
                    >
                      <span>Uji Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Bagian-Bagian Materi (BagianEditor) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Bagian-Bagian Materi</h2>
            <p className="text-xs text-muted-foreground">
              Susun bab atau sub-bagian materi secara bertahap dan terstruktur.
            </p>
          </div>
          <Button type="button" size="sm" onClick={handleAddBagian} className="gap-2">
            <Plus className="w-4 h-4" />
            Tambah Bagian Materi
          </Button>
        </div>

        {formData.bagian?.map((bag, idx) => (
          <Card key={bag.id || idx} className="border-l-4 border-l-primary overflow-hidden shadow-xs">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 bg-slate-50/50 border-b border-slate-100">
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <span className="bg-primary/10 text-primary font-bold px-2.5 py-0.5 rounded-lg text-xs shrink-0">
                  Bagian {idx + 1}
                </span>
                <Input
                  className="font-bold text-sm h-8 flex-1 sm:w-72 bg-white"
                  value={bag.judul}
                  placeholder="Judul Bagian..."
                  onChange={(e) => handleUpdateBagian(idx, "judul", e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                <select
                  className="h-8 rounded-md border border-input bg-white px-2.5 text-xs flex-1 sm:flex-initial font-medium text-slate-700"
                  value={bag.jenis}
                  onChange={(e) => handleUpdateBagian(idx, "jenis", e.target.value)}
                >
                  <option value="pengantar">Pengantar</option>
                  <option value="struktur">Struktur</option>
                  <option value="kebahasaan">Kebahasaan</option>
                  <option value="contoh">Contoh</option>
                  <option value="latihan">Latihan</option>
                  <option value="rangkuman">Rangkuman</option>
                </select>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={formData.bagian.length <= 1}
                  onClick={() => handleRemoveBagian(idx)}
                  className="hover:text-destructive shrink-0"
                  title="Hapus Bagian Ini"
                >
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-3 sm:p-4">
              <RichTextEditor
                value={bag.konten}
                onChange={(val) => handleUpdateBagian(idx, "konten", val)}
                placeholder="Tulis materi di sini seperti di Microsoft Word..."
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal Generator Materi AI */}
      <AiMateriGeneratorModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onGenerated={handleAiGenerated}
        initialMapel={formData.mapel || "Bahasa Inggris"}
      />
    </div>
  )
}

