import React from "react"
import { MapPin, ExternalLink, School } from "lucide-react"

export function Footer() {
  const logoUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSkMwdy4_7y48uzPnbFyQIzELTIrQTUGMHfofMTkNenIM_ExEml_YBWl275&s=10"
  const mapsLink = "https://www.google.com/maps?q=-1.8295,109.9672"
  const mapsEmbedUrl = "https://maps.google.com/maps?q=-1.8295,109.9672&hl=id&z=15&output=embed"

  return (
    <footer className="border-t bg-slate-900 text-slate-200 mt-auto pt-12 pb-8">
      <div className="container max-w-6xl space-y-8">
        {/* Baris Atas: Informasi Sekolah */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <img
              src={logoUrl}
              alt="Logo SMPN 3 Ketapang"
              className="w-16 h-16 object-contain rounded-2xl bg-white p-2 shadow-lg shrink-0 border border-slate-700"
            />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-extrabold text-xl text-white tracking-tight">
                  SMP Negeri 3 Ketapang
                </h3>
                <span className="text-[11px] font-semibold text-blue-400 bg-blue-950/80 px-2.5 py-0.5 rounded-full border border-blue-800/60">
                  Kurikulum Merdeka &bull; Fase D
                </span>
              </div>
              <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                Platform Pembelajaran Mandiri untuk siswa SMPN 3 Ketapang. Belajar materi dan latihan kuis interaktif kapan saja.
              </p>
            </div>
          </div>

         
        </div>

        {/* Baris Tengah: Full Width Map */}
        <div className="space-y-2 flex justify-center flex-col items-center">
          <div className="flex items-center justify-between text-xs font-bold text-white uppercase tracking-wider">
           
            <a
            href={mapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-blue-300 rounded-xl border border-slate-700 transition-colors shadow-sm shrink-0"
          >
            <MapPin className="w-4 h-4 text-rose-400" />
            <span>Buka di Google Maps</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </a>
          </div>

          {/* Full Width Modern Iframe Container */}
          <div className="relative w-full rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-950 group">
            <iframe
              title="Lokasi SMPN 3 Ketapang"
              src={mapsEmbedUrl}
              width="100%"
              height="280"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full grayscale-[15%] contrast-105 group-hover:grayscale-0 transition-all duration-300"
            />
            <div className="p-3 bg-slate-800/95 backdrop-blur border-t border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                Jl. SMPN 3, Ketapang, Kalimantan Barat &bull; Indonesia
              </span>
           
            </div>
          </div>
        </div>

        {/* Baris Bawah: Copyright */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>
            &copy; {new Date().getFullYear()} LMS SMPN 3 Ketapang
          </p>
          <p className="text-[11px] text-slate-400">
            Dikelola oleh Ibu Ernawaty
          </p>
        </div>
      </div>
    </footer>
  )
}
