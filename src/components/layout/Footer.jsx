import React from "react"
import { MapPin, ExternalLink, School } from "lucide-react"

export function Footer() {
  const logoUrl =
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSkMwdy4_7y48uzPnbFyQIzELTIrQTUGMHfofMTkNenIM_ExEml_YBWl275&s=10"
  const mapsLink = "https://www.google.com/maps?q=-1.8295,109.9672"
  const mapsEmbedUrl = "https://maps.google.com/maps?q=-1.8295,109.9672&hl=id&z=15&output=embed"

  return (
    <footer className="border-t border-slate-200/80 bg-white text-slate-600 mt-auto pt-12 pb-10 shadow-xs">
      <div className="container max-w-6xl space-y-8">
        {/* Baris Atas: Informasi Sekolah & Identitas */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white p-2.5 shadow-sm shrink-0 border border-slate-200/90 flex items-center justify-center">
              <img
                src={logoUrl}
                alt="Logo SMPN 3 Ketapang"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-black text-xl text-slate-900 tracking-tight">
                  SMP Negeri 3 Ketapang
                </h3>
                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/80">
                  Kurikulum Merdeka &bull; Fase D
                </span>
              </div>
              <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
                Platform Pembelajaran Mandiri untuk siswa SMPN 3 Ketapang. Belajar materi Bahasa Indonesia dan latihan kuis interaktif kapan saja.
              </p>
            </div>
          </div>

          <a
            href={mapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-blue-50 text-xs font-bold text-slate-700 hover:text-blue-700 rounded-xl border border-slate-200 hover:border-blue-200 transition-all shadow-2xs shrink-0 self-start md:self-auto"
          >
            <MapPin className="w-4 h-4 text-rose-500" />
            <span>Buka di Google Maps</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-60" />
          </a>
        </div>

        {/* Baris Tengah: Peta Lokasi Sekolah Modern (Light Theme) */}
        <div className="space-y-2">
          <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50 group">
            <iframe
              title="Lokasi SMPN 3 Ketapang"
              src={mapsEmbedUrl}
              width="100%"
              height="260"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full contrast-105 group-hover:contrast-100 transition-all duration-300"
            />
            <div className="p-3.5 bg-white/95 backdrop-blur border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-700 font-semibold flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                Jl. SMPN 3, Ketapang, Kalimantan Barat &bull; Indonesia
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                Pusat Pembelajaran Digital Pelajar
              </span>
            </div>
          </div>
        </div>

        {/* Baris Bawah: Copyright & Pengelola */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 font-medium">
          <p>
            &copy; {new Date().getFullYear()} LMS SMPN 3 Ketapang. Hak Cipta Dilindungi.
          </p>
          <p className="flex items-center gap-1 text-[11px] text-slate-500">
            <span>Dikelola dengan dedikasi oleh</span>
            <strong className="text-slate-800 font-bold">Ibu Ernawaty</strong>
          </p>
        </div>
      </div>
    </footer>
  )
}
