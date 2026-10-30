import React, { useState, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/context/ToastContext"
import {
  getPengumumanList,
  subscribePengumumanList,
  createPengumuman,
  updatePengumuman,
  deletePengumuman,
} from "@/services/pengumuman"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { RichTextEditor } from "@/components/materi/RichTextEditor"
import { formatDate } from "@/lib/utils"
import {
  Megaphone,
  Plus,
  Trash2,
  Edit,
  Save,
  AlertCircle,
  Sparkles,
  Calendar,
  Eye,
  CheckCircle2,
} from "lucide-react"

export function Pengumuman() {
  const { profileData } = useAuth()
  const { toast, confirmAction } = useToast()
  const [list, setList] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const MAX_PENGUMUMAN = 5
  const isMaxReached = list.length >= MAX_PENGUMUMAN

  // Form State
  const [judul, setJudul] = useState("")
  const [isi, setIsi] = useState("")
  const [prioritas, setPrioritas] = useState("penting") // "penting" | "info"
  const [tingkat, setTingkat] = useState(["VII", "VIII", "IX"])
  const [status, setStatus] = useState("aktif")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })

    // Berlangganan data realtime dari Firebase Realtime Database
    const unsubscribe = subscribePengumumanList(
      (data) => {
        setList(data)
      },
      true,
      null
    )

    return () => unsubscribe()
  }, [])

  function resetForm() {
    setEditingId(null)
    setJudul("")
    setIsi("")
    setPrioritas("penting")
    setTingkat(["VII", "VIII", "IX"])
    setStatus("aktif")
    setShowForm(false)
  }

  function handleStartEdit(item) {
    setEditingId(item.id)
    setJudul(item.judul || "")
    setIsi(item.isi || "")
    setPrioritas(item.prioritas || "info")
    setTingkat(item.tingkat || ["VII", "VIII", "IX"])
    setStatus(item.status || "aktif")
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function toggleTingkat(ting) {
    if (tingkat.includes(ting)) {
      setTingkat(tingkat.filter((t) => t !== ting))
    } else {
      setTingkat([...tingkat, ting])
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!judul.trim() || !isi.trim()) {
      toast.warning("Data Belum Lengkap", "Harap isi judul dan pesan pengumuman terlebih dahulu.")
      return
    }

    if (!editingId && isMaxReached) {
      toast.warning(
        "Batas Maksimal Tercapai",
        `Maksimal ${MAX_PENGUMUMAN} pengumuman dapat ditayangkan. Hapus atau edit pengumuman yang ada sebelum menambah baru.`
      )
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        judul: judul.trim(),
        isi: isi.trim(),
        prioritas,
        tingkat: tingkat.length > 0 ? tingkat : ["VII", "VIII", "IX"],
        status,
        penulisNama: profileData?.nama || "Ibu Ernawaty",
      }

      if (editingId) {
        await updatePengumuman(editingId, payload)
        setList((prev) =>
          prev.map((item) => (item.id === editingId ? { ...item, ...payload } : item))
        )
        toast.success("Pengumuman Diperbarui", "Perubahan informasi pengumuman berhasil disimpan.")
      } else {
        const created = await createPengumuman(payload)
        setList((prev) => [created, ...prev.filter((p) => p.id !== created.id)])
        toast.success("Pengumuman Dipublikasikan", "Pesan baru telah disiarkan ke dashboard belajar siswa.")
      }

      resetForm()
    } catch (err) {
      toast.error("Gagal Menyimpan", err.message || "Terjadi kendala saat menyimpan pengumuman.")
    } finally {
      setSubmitting(false)
    }
  }

  function handleDelete(id, judulPengumuman) {
    confirmAction({
      title: "Hapus Pengumuman",
      message: `Apakah Anda yakin ingin menghapus "${judulPengumuman}"? Pengumuman ini tidak akan lagi tampil di dashboard murid.`,
      confirmText: "Ya, Hapus",
      cancelText: "Batal",
      variant: "danger",
      onConfirm: async () => {
        setList((prev) => prev.filter((item) => item.id !== id))
        try {
          await deletePengumuman(id)
          toast.success("Pengumuman Dihapus", `Pengumuman "${judulPengumuman}" telah berhasil dihapus.`)
        } catch (err) {
          toast.error("Gagal Menghapus", err.message || "Tidak dapat menghapus pengumuman.")
          const fresh = await getPengumumanList(true)
          setList(fresh)
        }
      },
    })
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white rounded-3xl p-5 sm:p-7 shadow-lg shadow-blue-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-white text-xs font-semibold">
            <Megaphone className="w-3.5 h-3.5 text-amber-300" />
            <span>Papan Informasi Sekolah & Pengajar</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Pusat Pengumuman Guru
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
            Sampaikan pengumuman penting seputar jadwal belajar, instruksi penugasan, maupun agenda kelas langsung ke dashboard siswa.
          </p>
        </div>

        {!showForm && (
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
            <span className="text-[11px] font-semibold text-blue-100/90 bg-white/10 px-3 py-1 rounded-full backdrop-blur">
              {list.length}/{MAX_PENGUMUMAN} Pengumuman
            </span>
            <Button
              onClick={() => {
                if (isMaxReached) {
                  toast.warning(
                    "Batas Maksimal Pengumuman",
                    `Pengumuman sudah mencapai batas maksimal (${MAX_PENGUMUMAN}). Hapus atau ubah pengumuman yang ada sebelum membuat baru.`
                  )
                  return
                }
                setShowForm(true)
              }}
              className="bg-white hover:bg-blue-50 text-blue-700 font-extrabold text-xs h-10 px-4 rounded-xl shadow-md shrink-0 gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Buat Pengumuman</span>
            </Button>
          </div>
        )}
      </div>

      {/* Form Buat / Edit Pengumuman */}
      {showForm && (
        <Card className="rounded-3xl border border-blue-200/90 shadow-md bg-white overflow-hidden animate-in fade-in duration-200">
          <CardHeader className="border-b border-slate-100 p-5 pb-3 bg-gradient-to-r from-blue-50/50 to-white flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-blue-600" />
              <span>{editingId ? "Edit Pengumuman" : "Tulis Pengumuman Baru"}</span>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetForm}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 h-8 rounded-xl"
            >
              Batal
            </Button>
          </CardHeader>

          <CardContent className="p-5 space-y-4 text-xs">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Judul Pengumuman</label>
                <Input
                  placeholder="Contoh: Jadwal Penilaian Harian & Batas Waktu Pengumpulan Tugas Teks Rekon"
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  className="h-10 rounded-xl text-xs sm:text-sm font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Prioritas */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Kategori Prioritas</label>
                  <select
                    className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
                    value={prioritas}
                    onChange={(e) => setPrioritas(e.target.value)}
                  >
                    <option value="penting">🚨 Penting / Mendesak (Banner Merah)</option>
                    <option value="info">📢 Informasi Umum (Banner Biru)</option>
                  </select>
                </div>

                {/* Status Aktif */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Status Penayangan</label>
                  <select
                    className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="aktif">Aktif (Tampil di Dashboard Murid)</option>
                    <option value="arsip">Arsip (Sembunyikan dari Murid)</option>
                  </select>
                </div>

                {/* Tingkat Sasaran */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Sasaran Tingkat Kelas</label>
                  <div className="flex gap-1.5 pt-0.5">
                    {["VII", "VIII", "IX"].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleTingkat(t)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border ${
                          tingkat.includes(t)
                            ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Isi Pesan Pengumuman dengan Rich Text Editor */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">Isi Pengumuman</label>
                  <span className="text-[11px] text-slate-400">
                    Mendukung cetak tebal, miring, daftar poin, dan format Word
                  </span>
                </div>
                <RichTextEditor
                  value={isi}
                  onChange={setIsi}
                  placeholder="Tuliskan isi pengumuman untuk siswa secara jelas dan lengkap..."
                  minHeight="180px"
                />
              </div>

              {/* Pratinjau Tampilan Siswa */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Pratinjau Banner Siswa:</span>
                </span>
                <div
                  className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-1.5 ${
                    prioritas === "penting"
                      ? "bg-rose-50/90 border-rose-200 text-rose-950"
                      : "bg-blue-50/90 border-blue-200 text-blue-950"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                        prioritas === "penting"
                          ? "bg-rose-600 text-white"
                          : "bg-blue-600 text-white"
                      }`}
                    >
                      {prioritas === "penting" ? "Penting" : "Pengumuman"}
                    </span>
                    <span className="font-extrabold text-xs sm:text-sm">
                      {judul || "Judul Pengumuman"}
                    </span>
                  </div>
                  <div className="prose prose-sm max-w-none text-xs leading-relaxed rich-editor-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {isi || "Isi teks pengumuman yang ditulis oleh Ibu Ernawaty."}
                    </ReactMarkdown>
                  </div>
                  <div className="text-[10px] opacity-75 pt-1 border-t border-slate-200/50">
                    Dipublikasikan oleh {profileData?.nama || "Ibu Ernawaty"} &bull; Untuk Kelas {tingkat.join(", ")}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={resetForm}
                  className="rounded-xl text-xs font-bold"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs px-4"
                >
                  {submitting ? "Menyimpan..." : editingId ? "Perbarui Pengumuman" : "Terbitkan Pengumuman"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Daftar Pengumuman */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-extrabold text-slate-800">
            Riwayat Pengumuman ({list.length}/{MAX_PENGUMUMAN})
          </h2>
          <span className="text-[11px] font-semibold text-slate-500">
            {isMaxReached ? (
              <span className="text-amber-600 font-bold">Slot penuh (Maks. 5)</span>
            ) : (
              <span>Tersedia {MAX_PENGUMUMAN - list.length} slot lagi</span>
            )}
          </span>
        </div>

        {list.length === 0 ? (
          <Card className="rounded-3xl border border-dashed border-slate-200 p-8 text-center bg-white space-y-2">
            <Megaphone className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-700 text-sm">Belum Ada Pengumuman</h3>
            <p className="text-xs text-slate-400">
              Buat pengumuman pertama Anda untuk mengabarkan informasi penting kepada siswa.
            </p>
          </Card>
        ) : (
          list.map((item) => (
            <Card
              key={item.id}
              className={`rounded-2xl border transition-all overflow-hidden ${
                item.status === "aktif"
                  ? item.prioritas === "penting"
                    ? "bg-rose-50/40 border-rose-200/90 shadow-2xs"
                    : "bg-blue-50/30 border-blue-200/80 shadow-2xs"
                  : "bg-slate-50/60 border-slate-200 opacity-60"
              }`}
            >
              <CardContent className="p-4 sm:p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                          item.prioritas === "penting"
                            ? "bg-rose-600 text-white"
                            : "bg-blue-600 text-white"
                        }`}
                      >
                        {item.prioritas === "penting" ? "Penting" : "Informasi"}
                      </span>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          item.status === "aktif"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-200 text-slate-600 border-slate-300"
                        }`}
                      >
                        {item.status === "aktif" ? "Tayang Aktif" : "Diarsipkan"}
                      </span>

                      <div className="flex gap-1">
                        {item.tingkat?.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] font-semibold bg-white border border-slate-200 px-1.5 py-0.2 rounded text-slate-600"
                          >
                            Kelas {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight pt-1">
                      {item.judul}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleStartEdit(item)}
                      className="rounded-xl h-8 w-8 text-slate-500 hover:text-blue-600"
                      title="Edit Pengumuman"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(item.id, item.judul)}
                      className="rounded-xl h-8 w-8 text-slate-400 hover:text-rose-600"
                      title="Hapus Pengumuman"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="prose prose-sm max-w-none text-xs sm:text-sm text-slate-700 leading-relaxed bg-white/70 p-3.5 rounded-xl border border-slate-100 rich-editor-content overflow-x-auto">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {item.isi}
                  </ReactMarkdown>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Oleh: <b>{item.penulisNama || "Guru"}</b></span>
                  <span>{formatDate(item.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

