import React, { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { getKuisById, createKuis, updateKuis } from "@/services/kuis"
import { getMateriList } from "@/services/materi"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { FormEditSkeleton } from "@/components/ui/loading-skeletons"
import { ArrowLeft, Plus, Trash2, Save, AlertCircle, Copy, HelpCircle } from "lucide-react"

export function KuisEdit() {
  const { id } = useParams()
  const isNew = !id || id === "baru"
  const navigate = useNavigate()

  const [materiList, setMateriList] = useState([])
  const [formData, setFormData] = useState({
    judul: "",
    materiId: "",
    deskripsi: "",
    nilaiLulus: 70,
    acakSoal: true,
    acakOpsi: true,
    maksPercobaan: null,
    status: "draft",
    soal: [
      {
        id: "s1",
        tipe: "pilihan_ganda",
        pertanyaan: "What is the main purpose of a recount text?",
        opsi: [
          { id: "a", teks: "To entertain or inform the reader about past events" },
          { id: "b", teks: "To describe how to make or do something step by step" },
          { id: "c", teks: "To persuade someone to buy or do something" },
          { id: "d", teks: "To provide news about current events" },
        ],
        kunci: "a",
        pembahasan: "Teks rekon menceritakan kembali peristiwa masa lampau untuk memberi tahu atau menghibur pembaca.",
      },
    ],
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    async function load() {
      try {
        const mat = await getMateriList(true)
        setMateriList(mat)

        if (!isNew) {
          const k = await getKuisById(id)
          if (k) setFormData(k)
        } else if (mat.length > 0) {
          setFormData((prev) => ({ ...prev, materiId: mat[0].id }))
        }
      } catch (err) {
        setError(err.message || "Gagal memuat data kuis.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, isNew])

  function handleAddSoal(tipe = "pilihan_ganda") {
    const newId = `s_${Date.now()}`
    let newSoal = {
      id: newId,
      tipe,
      pertanyaan: "",
      pembahasan: "",
    }

    if (tipe === "pilihan_ganda") {
      newSoal.opsi = [
        { id: "a", teks: "" },
        { id: "b", teks: "" },
        { id: "c", teks: "" },
        { id: "d", teks: "" },
      ]
      newSoal.kunci = "a"
    } else if (tipe === "benar_salah") {
      newSoal.kunci = true
    } else if (tipe === "isian") {
      newSoal.kunci = [""]
    }

    setFormData({ ...formData, soal: [...formData.soal, newSoal] })
  }

  function handleRemoveSoal(index) {
    const next = formData.soal.filter((_, i) => i !== index)
    setFormData({ ...formData, soal: next })
  }

  function handleDuplicateSoal(index) {
    const target = formData.soal[index]
    const cloned = {
      ...target,
      id: `s_${Date.now()}`,
    }
    const next = [...formData.soal]
    next.splice(index + 1, 0, cloned)
    setFormData({ ...formData, soal: next })
  }

  function handleUpdateSoal(index, field, val) {
    const next = [...formData.soal]
    next[index] = { ...next[index], [field]: val }
    setFormData({ ...formData, soal: next })
  }

  const HURUF_OPSI = ["a", "b", "c", "d", "e", "f", "g", "h"]

  function handleAddOpsi(soalIndex) {
    const s = formData.soal[soalIndex]
    const currentOpsi = s.opsi || []
    if (currentOpsi.length >= HURUF_OPSI.length) return

    const nextId = HURUF_OPSI[currentOpsi.length]
    const newOpsi = [...currentOpsi, { id: nextId, teks: "" }]
    handleUpdateSoal(soalIndex, "opsi", newOpsi)
  }

  function handleRemoveOpsi(soalIndex, opsiIndex) {
    const s = formData.soal[soalIndex]
    const currentOpsi = s.opsi || []
    if (currentOpsi.length <= 2) {
      alert("Soal pilihan ganda minimal harus memiliki 2 pilihan jawaban!")
      return
    }

    const removedId = currentOpsi[opsiIndex].id
    const remaining = currentOpsi.filter((_, i) => i !== opsiIndex)
    // Susun ulang ID opsi (a, b, c, d...) agar selalu berurutan
    const reindexed = remaining.map((op, i) => ({
      ...op,
      id: HURUF_OPSI[i],
    }))

    // Jika kunci jawaban yang terhapus, arahkan kunci ke opsi pertama
    let newKunci = s.kunci
    if (newKunci === removedId) {
      newKunci = reindexed[0]?.id || "a"
    } else {
      const oldIndex = remaining.findIndex((op) => op.id === s.kunci)
      if (oldIndex !== -1) {
        newKunci = reindexed[oldIndex].id
      }
    }

    const next = [...formData.soal]
    next[soalIndex] = {
      ...next[soalIndex],
      opsi: reindexed,
      kunci: newKunci,
    }
    setFormData({ ...formData, soal: next })
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError("")

    if (!formData.judul.trim()) {
      setError("Judul kuis wajib diisi.")
      setSaving(false)
      return
    }

    if (formData.status === "terbit" && (!formData.soal || formData.soal.length === 0)) {
      setError("Kuis terbit minimal harus memiliki 1 butir soal.")
      setSaving(false)
      return
    }

    // Ambil tingkat dari materi yang dipilih
    const selectedMateri = materiList.find((m) => m.id === formData.materiId)
    const tingkat = selectedMateri ? selectedMateri.tingkat : ["VII", "VIII", "IX"]

    const cleanData = {
      ...formData,
      tingkat,
      jumlahSoal: formData.soal.length,
    }

    try {
      if (isNew) {
        await createKuis(cleanData)
      } else {
        await updateKuis(id, cleanData)
      }
      navigate("/guru/kuis")
    } catch (err) {
      setError(err.message || "Gagal menyimpan kuis.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <FormEditSkeleton icon={FileQuestion} />
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/guru/kuis">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isNew ? "Buat Kuis Baru" : "Edit Kuis"}
            </h1>
            <p className="text-xs text-muted-foreground">
              Atur parameter latihan formatif dan butir-butir soal.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/guru/kuis">Batal</Link>
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? "Menyimpan..." : "Simpan Kuis"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs flex gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Pengaturan Kuis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold">Pengaturan Kuis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Judul Kuis</label>
              <Input
                placeholder="Contoh: Kuis 1: Struktur Teks Rekon"
                value={formData.judul}
                onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Terhubung ke Materi</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                value={formData.materiId}
                onChange={(e) => setFormData({ ...formData, materiId: e.target.value })}
              >
                <option value="">-- Pilih Materi --</option>
                {materiList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.judul}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Nilai Lulus (Passing Grade)</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={formData.nilaiLulus}
                onChange={(e) => setFormData({ ...formData, nilaiLulus: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Maksimal Percobaan</label>
              <Input
                type="number"
                placeholder="Kosongkan jika tak terbatas"
                value={formData.maksPercobaan || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maksPercobaan: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
              <p className="text-[10px] text-muted-foreground">Kosong = murid bebas mengulang</p>
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Status Kuis</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="draft">Draf (Hanya Guru)</option>
                <option value="terbit">Terbit (Dapat Dikerjakan Murid)</option>
              </select>
            </div>
            <div className="space-y-2 pt-1">
              <label className="font-semibold text-foreground block">Opsi Pengacakan</label>
              <div className="space-y-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.acakSoal}
                    onChange={(e) => setFormData({ ...formData, acakSoal: e.target.checked })}
                    className="rounded text-primary"
                  />
                  <span>Acak urutan soal</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.acakOpsi}
                    onChange={(e) => setFormData({ ...formData, acakOpsi: e.target.checked })}
                    className="rounded text-primary"
                  />
                  <span>Acak urutan opsi pilihan</span>
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Deskripsi / Petunjuk Singkat</label>
            <Textarea
              rows={2}
              value={formData.deskripsi || ""}
              onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
              placeholder="Petunjuk pengerjaan bagi murid..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Editor Soal-Soal */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight">Daftar Soal</h2>
            <Badge variant="outline">{formData.soal?.length || 0} Butir Soal</Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleAddSoal("pilihan_ganda")}
              className="text-xs gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              + Pilihan Ganda
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleAddSoal("benar_salah")}
              className="text-xs gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              + Benar / Salah
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleAddSoal("isian")}
              className="text-xs gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              + Isian Singkat
            </Button>
          </div>
        </div>

        {formData.soal?.map((s, idx) => (
          <Card key={s.id || idx} className="border-l-4 border-l-amber-500">
            <CardHeader className="py-3 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-bold">
                  Soal #{idx + 1}
                </Badge>
                <Badge variant="outline" className="text-[10px] uppercase">
                  {s.tipe.replace("_", " ")}
                </Badge>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDuplicateSoal(idx)}
                  title="Duplikat Soal"
                >
                  <Copy className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={formData.soal.length <= 1}
                  onClick={() => handleRemoveSoal(idx)}
                  className="hover:text-destructive"
                  title="Hapus Soal"
                >
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 text-xs">
              {/* Pertanyaan */}
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Pertanyaan</label>
                <Textarea
                  rows={2}
                  placeholder="Tuliskan teks pertanyaan atau kutipan teks..."
                  value={s.pertanyaan}
                  onChange={(e) => handleUpdateSoal(idx, "pertanyaan", e.target.value)}
                />
              </div>

              {/* Input Opsi / Kunci Berdasarkan Tipe Soal */}
              {s.tipe === "pilihan_ganda" && (
                <div className="space-y-3 bg-muted/20 p-3.5 rounded-xl border">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-foreground block">
                      Pilihan Jawaban (Pilih radio untuk menentukan Kunci Jawaban):
                    </label>
                    <Badge variant="outline" className="text-[10px] font-bold bg-white">
                      {s.opsi?.length || 0} Pilihan
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {s.opsi?.map((op, opIdx) => {
                      const isSelectedKunci = s.kunci === op.id

                      return (
                        <div
                          key={op.id || opIdx}
                          className={`flex items-center gap-2 p-1.5 px-2.5 rounded-xl border transition-all ${
                            isSelectedKunci
                              ? "bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-400/30"
                              : "bg-white border-slate-200"
                          }`}
                        >
                          <label className="flex items-center gap-2 cursor-pointer shrink-0">
                            <input
                              type="radio"
                              name={`kunci_${s.id}`}
                              checked={isSelectedKunci}
                              onChange={() => handleUpdateSoal(idx, "kunci", op.id)}
                              className="w-4 h-4 cursor-pointer accent-emerald-600"
                              title={`Jadikan opsi ${op.id.toUpperCase()} sebagai kunci jawaban`}
                            />
                            <span
                              className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center uppercase transition-colors ${
                                isSelectedKunci
                                  ? "bg-emerald-600 text-white"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {op.id}
                            </span>
                          </label>

                          <Input
                            value={op.teks}
                            onChange={(e) => {
                              const nextOpsi = [...s.opsi]
                              nextOpsi[opIdx].teks = e.target.value
                              handleUpdateSoal(idx, "opsi", nextOpsi)
                            }}
                            placeholder={`Teks opsi ${op.id.toUpperCase()}...`}
                            className="h-8 text-xs bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 flex-1 px-1"
                          />

                          {isSelectedKunci && (
                            <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px] font-bold px-2 py-0.5 shrink-0 hidden sm:inline-flex">
                              ✓ Kunci Jawaban
                            </Badge>
                          )}

                          {/* Tombol Hapus Opsi jika opsi lebih dari 2 */}
                          {s.opsi.length > 2 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveOpsi(idx, opIdx)}
                              className="w-7 h-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0"
                              title={`Hapus opsi ${op.id.toUpperCase()}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Tombol Tambah Pilihan Baru */}
                  {(!s.opsi || s.opsi.length < HURUF_OPSI.length) && (
                    <div className="pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddOpsi(idx)}
                        className="text-xs h-8 gap-1.5 border-dashed border-primary/50 text-primary hover:bg-primary/5 bg-white font-bold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Tambah Pilihan Jawaban ({HURUF_OPSI[s.opsi?.length || 0]?.toUpperCase()})
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {s.tipe === "benar_salah" && (
                <div className="bg-muted/20 p-3 rounded-lg border flex items-center gap-4">
                  <span className="font-semibold text-foreground">Kunci Jawaban:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-emerald-600">
                    <input
                      type="radio"
                      name={`kunci_bs_${s.id}`}
                      checked={s.kunci === true}
                      onChange={() => handleUpdateSoal(idx, "kunci", true)}
                    />
                    Benar (True)
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-destructive">
                    <input
                      type="radio"
                      name={`kunci_bs_${s.id}`}
                      checked={s.kunci === false}
                      onChange={() => handleUpdateSoal(idx, "kunci", false)}
                    />
                    Salah (False)
                  </label>
                </div>
              )}

              {s.tipe === "isian" && (
                <div className="space-y-2 bg-muted/20 p-3 rounded-lg border">
                  <label className="font-semibold text-foreground block">
                    Kunci Jawaban yang Diterima (Dipisahkan koma jika lebih dari satu variasi):
                  </label>
                  <Input
                    value={Array.isArray(s.kunci) ? s.kunci.join(", ") : s.kunci || ""}
                    onChange={(e) => {
                      const keys = e.target.value
                        .split(",")
                        .map((k) => k.trim())
                        .filter(Boolean)
                      handleUpdateSoal(idx, "kunci", keys)
                    }}
                    placeholder="Contoh: went, went to"
                    className="h-8 text-xs font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Sistem otomatis mengabaikan huruf kapital/kecil dan tanda baca pada jawaban murid.
                  </p>
                </div>
              )}

              {/* Pembahasan Soal */}
              <div className="space-y-1">
                <label className="font-semibold text-foreground flex items-center gap-1 text-primary">
                  <HelpCircle className="w-3.5 h-3.5" />
                  Pembahasan (Akan ditampilkan kepada murid setelah menyelesaikan kuis)
                </label>
                <Textarea
                  rows={2}
                  placeholder="Jelaskan alasan mengapa jawaban tersebut benar..."
                  value={s.pembahasan || ""}
                  onChange={(e) => handleUpdateSoal(idx, "pembahasan", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

