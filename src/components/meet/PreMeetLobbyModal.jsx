import React, { useState, useEffect, useRef } from "react"
import AgoraRTC from "agora-rtc-sdk-ng"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  Settings2,
  Sparkles,
  ArrowRight,
  RefreshCw,
  AlertCircle,
} from "lucide-react"

export function PreMeetLobbyModal({
  judulSesi = "Sesi Tatap Muka",
  userNama = "Peserta",
  isGuru = false,
  onJoin,
  onCancel,
}) {
  const [cameras, setCameras] = useState([])
  const [microphones, setMicrophones] = useState([])
  const [speakers, setSpeakers] = useState([])

  const [selectedCamId, setSelectedCamId] = useState("")
  const [selectedMicId, setSelectedMicId] = useState("")
  const [selectedSpeakerId, setSelectedSpeakerId] = useState("")

  const [micOn, setMicOn] = useState(isGuru) // Murid default mic mati
  const [camOn, setCamOn] = useState(true)

  const [micVolume, setMicVolume] = useState(0)
  const [audioTestPlaying, setAudioTestPlaying] = useState(false)
  const [loadingDevices, setLoadingDevices] = useState(true)

  const previewVideoRef = useRef(null)
  const localCamTrackRef = useRef(null)
  const localMicTrackRef = useRef(null)
  const volumeIntervalRef = useRef(null)

  // 1. Muat perangkat dan inisialisasi track preview
  useEffect(() => {
    let mounted = true

    async function setupPreview() {
      setLoadingDevices(true)
      try {
        // Minta izin kamera & mic
        let vTrack = null
        let aTrack = null

        try {
          vTrack = await AgoraRTC.createCameraVideoTrack({ encoderConfig: "480p_1" })
          localCamTrackRef.current = vTrack
          if (mounted && previewVideoRef.current && vTrack) {
            previewVideoRef.current.innerHTML = ""
            vTrack.play(previewVideoRef.current)
          }
        } catch (vErr) {
          console.warn("Gagal init kamera preview:", vErr)
          if (mounted) setCamOn(false)
        }

        try {
          aTrack = await AgoraRTC.createMicrophoneAudioTrack()
          localMicTrackRef.current = aTrack
          if (!isGuru) {
            await aTrack.setMuted(true)
          }
        } catch (aErr) {
          console.warn("Gagal init mic preview:", aErr)
          if (mounted) setMicOn(false)
        }

        // Ambil daftar perangkat dari browser
        const devices = await AgoraRTC.getDevices()
        if (mounted) {
          const cams = devices.filter((d) => d.kind === "videoinput")
          const mics = devices.filter((d) => d.kind === "audioinput")
          const spks = devices.filter((d) => d.kind === "audiooutput")

          setCameras(cams)
          setMicrophones(mics)
          setSpeakers(spks)

          if (cams.length > 0) setSelectedCamId(cams[0].deviceId)
          if (mics.length > 0) setSelectedMicId(mics[0].deviceId)
          if (spks.length > 0) setSelectedSpeakerId(spks[0].deviceId)
        }
      } catch (err) {
        console.warn("Lobby device access error:", err)
      } finally {
        if (mounted) setLoadingDevices(false)
      }
    }

    setupPreview()

    // Interval pembacaan level mic
    volumeIntervalRef.current = setInterval(() => {
      if (localMicTrackRef.current && micOn) {
        try {
          const level = localMicTrackRef.current.getVolumeLevel()
          setMicVolume(Math.round(level * 100))
        } catch (_) {}
      } else {
        setMicVolume(0)
      }
    }, 150)

    return () => {
      mounted = false
      if (volumeIntervalRef.current) clearInterval(volumeIntervalRef.current)
      if (localCamTrackRef.current) {
        localCamTrackRef.current.stop()
        localCamTrackRef.current.close()
      }
      if (localMicTrackRef.current) {
        localMicTrackRef.current.stop()
        localMicTrackRef.current.close()
      }
    }
  }, [isGuru])

  // Ganti Device Kamera
  async function handleChangeCamera(deviceId) {
    setSelectedCamId(deviceId)
    if (localCamTrackRef.current) {
      try {
        await localCamTrackRef.current.setDevice(deviceId)
      } catch (e) {
        console.warn("Gagal set camera device:", e)
      }
    }
  }

  // Ganti Device Mikrofon
  async function handleChangeMic(deviceId) {
    setSelectedMicId(deviceId)
    if (localMicTrackRef.current) {
      try {
        await localMicTrackRef.current.setDevice(deviceId)
      } catch (e) {
        console.warn("Gagal set mic device:", e)
      }
    }
  }

  // Toggle Mic
  async function handleToggleMic() {
    if (localMicTrackRef.current) {
      const nextState = !micOn
      await localMicTrackRef.current.setMuted(!nextState)
      setMicOn(nextState)
      if (!nextState) setMicVolume(0)
    }
  }

  // Toggle Cam
  async function handleToggleCam() {
    if (localCamTrackRef.current) {
      const nextState = !camOn
      await localCamTrackRef.current.setEnabled(nextState)
      setCamOn(nextState)
      if (nextState && previewVideoRef.current) {
        previewVideoRef.current.innerHTML = ""
        localCamTrackRef.current.play(previewVideoRef.current)
      }
    }
  }

  // Uji Suara Speaker
  function handleTestSpeaker() {
    if (audioTestPlaying) return
    setAudioTestPlaying(true)
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = "sine"
    osc.frequency.setValueAtTime(587.33, ctx.currentTime) // Nada D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15) // Nada A5

    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.5)

    setTimeout(() => {
      setAudioTestPlaying(false)
      ctx.close()
    }, 600)
  }

  // Bergabung ke Room Meet
  function handleConfirmJoin() {
    // Tutup track lokal lobby agar Room Meet dapat mengambil alih hardware bersih
    if (localCamTrackRef.current) {
      localCamTrackRef.current.stop()
      localCamTrackRef.current.close()
    }
    if (localMicTrackRef.current) {
      localMicTrackRef.current.stop()
      localMicTrackRef.current.close()
    }
    onJoin({
      initialMicOn: micOn,
      initialCamOn: camOn,
      selectedCamId,
      selectedMicId,
      selectedSpeakerId,
    })
  }

  return (
    <div className="fixed inset-0 z-[999999] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[92vh]">
        {/* Kolom Kiri: Layar Preview Kamera & Indikator Mic */}
        <div className="flex-1 bg-black p-4 sm:p-6 flex flex-col justify-between relative min-h-[300px] md:min-h-[460px]">
          {/* Badge Status */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
            <Badge className="bg-slate-900/80 text-white border-white/10 text-xs px-2.5 py-1 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1.5" />
              Layar Preview Pra-Meet
            </Badge>
          </div>

          {/* Kotak Video */}
          <div className="relative flex-1 rounded-2xl bg-slate-950 overflow-hidden flex items-center justify-center border border-slate-800/80 my-2">
            <div
              ref={previewVideoRef}
              className={`w-full h-full [&>div]:w-full [&>div]:h-full [&>div>video]:object-cover ${
                camOn ? "block" : "hidden"
              }`}
            />

            {!camOn && (
              <div className="flex flex-col items-center justify-center space-y-3 text-slate-400">
                <div className="w-20 h-20 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-black text-2xl ring-2 ring-blue-500/30">
                  {userNama.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-slate-400">Kamera Dimatikan</span>
              </div>
            )}

            {/* Indikator Level Suara Mikrofon di atas Video */}
            <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2 text-xs">
              {micOn ? (
                <>
                  <Mic className={`w-3.5 h-3.5 ${micVolume > 5 ? "text-emerald-400" : "text-slate-400"}`} />
                  <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden flex items-center">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-100 rounded-full"
                      style={{ width: `${Math.min(100, micVolume * 2)}%` }}
                    />
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-1.5 text-rose-400 font-medium text-[11px]">
                  <MicOff className="w-3.5 h-3.5" />
                  <span>Mikrofon Mati</span>
                </div>
              )}
            </div>
          </div>

          {/* Tombol Cepat Mic & Cam di Bawah Preview */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleToggleMic}
              className={`p-3 rounded-full font-bold text-xs flex items-center gap-2 transition-all active:scale-95 ${
                micOn
                  ? "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                  : "bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30"
              }`}
            >
              {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              <span>{micOn ? "Mic Aktif" : "Mic Mati"}</span>
            </button>

            <button
              type="button"
              onClick={handleToggleCam}
              className={`p-3 rounded-full font-bold text-xs flex items-center gap-2 transition-all active:scale-95 ${
                camOn
                  ? "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                  : "bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30"
              }`}
            >
              {camOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              <span>{camOn ? "Kamera Aktif" : "Kamera Mati"}</span>
            </button>
          </div>
        </div>

        {/* Kolom Kanan: Pengaturan Perangkat & Tombol Masuk */}
        <div className="w-full md:w-80 lg:w-96 p-5 sm:p-6 flex flex-col justify-between bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 space-y-5 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-black tracking-widest text-blue-400 uppercase">
                Persiapan Ruang Meet
              </span>
              <h3 className="text-base sm:text-lg font-black text-white mt-0.5 truncate">
                {judulSesi}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Bergabung sebagai: <b className="text-slate-200">{userNama}</b> ({isGuru ? "Guru / Host" : "Siswa"})
              </p>
            </div>

            {/* Pilihan Perangkat */}
            <div className="space-y-3 pt-2">
              {/* Kamera */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-blue-400" />
                  <span>Kamera Video</span>
                </label>
                <select
                  value={selectedCamId}
                  onChange={(e) => handleChangeCamera(e.target.value)}
                  disabled={loadingDevices || cameras.length === 0}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 truncate"
                >
                  {cameras.length === 0 ? (
                    <option value="">Tidak ada kamera terdeteksi</option>
                  ) : (
                    cameras.map((c) => (
                      <option key={c.deviceId} value={c.deviceId}>
                        {c.label || `Kamera ${c.deviceId.slice(0, 5)}`}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Mikrofon */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Mikrofon Audio</span>
                </label>
                <select
                  value={selectedMicId}
                  onChange={(e) => handleChangeMic(e.target.value)}
                  disabled={loadingDevices || microphones.length === 0}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 truncate"
                >
                  {microphones.length === 0 ? (
                    <option value="">Tidak ada mikrofon terdeteksi</option>
                  ) : (
                    microphones.map((m) => (
                      <option key={m.deviceId} value={m.deviceId}>
                        {m.label || `Mikrofon ${m.deviceId.slice(0, 5)}`}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Speaker & Tombol Uji Suara */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Speaker / Output Suara</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleTestSpeaker}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                  >
                    <span>{audioTestPlaying ? "Memutar nada..." : "Uji Suara"}</span>
                  </button>
                </label>
                <select
                  value={selectedSpeakerId}
                  onChange={(e) => setSelectedSpeakerId(e.target.value)}
                  disabled={loadingDevices || speakers.length === 0}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 truncate"
                >
                  {speakers.length === 0 ? (
                    <option value="">Speaker default browser</option>
                  ) : (
                    speakers.map((s) => (
                      <option key={s.deviceId} value={s.deviceId}>
                        {s.label || `Speaker ${s.deviceId.slice(0, 5)}`}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {!isGuru && (
              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
                <span>
                  Siswa akan otomatis masuk dalam kondisi <b>mikrofon mati</b> agar ruang kelas kondusif. Anda dapat menyalakan mic setelah diizinkan guru.
                </span>
              </div>
            )}
          </div>

          {/* Tombol Aksi Bawah */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <Button
              type="button"
              onClick={handleConfirmJoin}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs h-11 rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 active:scale-98 transition-all"
            >
              <span>Masuk Ruang Pertemuan</span>
              <ArrowRight className="w-4 h-4" />
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="w-full border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 font-bold text-xs h-10 rounded-2xl"
            >
              Batal
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

