import React from "react"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  GraduationCap,
  BookOpen,
  Mail,
  Phone,
  Building2,
  Sparkles,
  Award,
  CheckCircle2,
  X,
} from "lucide-react"

export function ModalDetailGuru({ isOpen, onClose, guruData }) {
  if (!isOpen) return null

  const nama = guruData?.nama || "Ibu Ernawaty"
  const mapel = guruData?.mapel || "Bahasa Inggris"
  const nip = guruData?.nip || "-"
  const bio = guruData?.bio || "Guru Mata Pelajaran Bahasa Inggris di SMP Negeri 3 Ketapang."
  const email = guruData?.email || "-"
  const noHp = guruData?.noHp || "-"
  const fotoUrl = guruData?.fotoUrl || null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-0 shadow-2xl bg-white">
        {/* Banner Profil */}
        <div className="relative bg-gradient-to-tr from-blue-700 via-indigo-600 to-indigo-800 text-white p-6 pt-7 text-center overflow-hidden">
          {/* Ornamen Latar Belakang */}
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-6 -mb-6 w-32 h-32 rounded-full bg-indigo-500/20 blur-xl pointer-events-none" />

          {/* Avatar Guru */}
          <div className="relative mx-auto w-24 h-24 rounded-full ring-4 ring-white/30 shadow-xl overflow-hidden bg-white/20 flex items-center justify-center mb-3.5 backdrop-blur-sm">
            {fotoUrl ? (
              <img
                src={fotoUrl}
                alt={nama}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-3xl">
                {nama.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute bottom-1 right-1 p-1 bg-emerald-500 rounded-full ring-2 ring-white text-white shadow-xs" title="Guru Pengampu Aktif">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Info Utama */}
          <h2 className="text-xl font-black tracking-tight text-white">{nama}</h2>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-bold text-blue-100 mt-2 shadow-2xs">
            <GraduationCap className="w-3.5 h-3.5 text-amber-300" />
            <span>Guru Pengampu &bull; {mapel}</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
          {/* Bio Guru */}
          {bio && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-700 italic text-xs leading-relaxed text-center">
              "{bio}"
            </div>
          )}

          {/* Rincian Guru */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 border border-slate-200/70">
              <div className="flex items-center gap-2.5 text-slate-500">
                <Award className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="font-semibold text-xs">NIP</span>
              </div>
              <span className="font-bold text-slate-800 text-xs">{nip}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 border border-slate-200/70">
              <div className="flex items-center gap-2.5 text-slate-500">
                <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-semibold text-xs">Mata Pelajaran</span>
              </div>
              <Badge variant="secondary" className="font-bold text-xs bg-blue-50 text-blue-700 border-blue-200">
                {mapel}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 border border-slate-200/70">
              <div className="flex items-center gap-2.5 text-slate-500">
                <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-xs">Sekolah</span>
              </div>
              <span className="font-bold text-slate-800 text-xs">SMP Negeri 3 Ketapang</span>
            </div>

            {email && email !== "-" && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 border border-slate-200/70">
                <div className="flex items-center gap-2.5 text-slate-500">
                  <Mail className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-semibold text-xs">Email</span>
                </div>
                <span className="font-semibold text-slate-700 text-xs truncate max-w-[190px]">
                  {email}
                </span>
              </div>
            )}

            {noHp && noHp !== "-" && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 border border-slate-200/70">
                <div className="flex items-center gap-2.5 text-slate-500">
                  <Phone className="w-4 h-4 text-green-600 shrink-0" />
                  <span className="font-semibold text-xs">Kontak / WhatsApp</span>
                </div>
                <span className="font-bold text-slate-800 text-xs">{noHp}</span>
              </div>
            )}
          </div>

          <div className="pt-2">
            <Button
              type="button"
              onClick={onClose}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold h-10 text-xs shadow-md"
            >
              Tutup
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

