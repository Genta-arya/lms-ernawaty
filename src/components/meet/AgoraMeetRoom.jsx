import React, { useState, useEffect, useRef } from "react"
import AgoraRTC from "agora-rtc-sdk-ng"
import { fetchAgoraToken } from "@/services/meet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Monitor,
  Users,
  Settings,
  Maximize2,
  Minimize2,
  Sparkles,
} from "lucide-react"

export function AgoraMeetRoom({
  channelName,
  userNama = "Peserta",
  isGuru = false,
  judulSesi = "Sesi Tatap Muka",
  onLeave,
}) {
  const [joined, setJoined] = useState(false)
  const [connecting, setConnecting] = useState(true)
  const [micOn, setMicOn] = useState(true)
  const [cameraOn, setCameraOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [remoteUsers, setRemoteUsers] = useState([])
  const [errorMsg, setErrorMsg] = useState("")

  const clientRef = useRef(null)
  const localTracksRef = useRef({ audioTrack: null, videoTrack: null })
  const screenTrackRef = useRef(null)
  const localVideoRef = useRef(null)

  useEffect(() => {
    let mounted = true

    // Buat client Agora RTC
    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" })
    clientRef.current = client

    // Listener remote user join & publish
    client.on("user-published", async (user, mediaType) => {
      await client.subscribe(user, mediaType)
      if (mediaType === "video") {
        setRemoteUsers((prev) => {
          if (!prev.find((u) => u.uid === user.uid)) {
            return [...prev, user]
          }
          return prev
        })
      }
      if (mediaType === "audio") {
        user.audioTrack?.play()
      }
    })

    client.on("user-unpublished", (user, mediaType) => {
      if (mediaType === "video") {
        setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid))
      }
    })

    client.on("user-left", (user) => {
      setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid))
    })

    async function initCall() {
      try {
        setConnecting(true)
        // Dapatkan token dinamis dari backend serverless
        const tokenData = await fetchAgoraToken(channelName)
        const appId = tokenData.appId || "5960c48ec498439798df7c0d1249ae4d"
        const token = tokenData.token || null

        // Gabung channel
        const uid = await client.join(appId, channelName, token, null)

        // Buat local audio & video track
        try {
          const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
            {},
            { encoderConfig: "480p_1" }
          )

          localTracksRef.current = { audioTrack, videoTrack }

          // Putar video lokal
          if (localVideoRef.current && videoTrack) {
            localVideoRef.current.innerHTML = ""
            videoTrack.play(localVideoRef.current)
          }

          // Publikasikan track ke channel
          await client.publish([audioTrack, videoTrack])
        } catch (deviceErr) {
          console.warn("Gagal akses kamera/mic, mencoba audio saja:", deviceErr)
          // Fallback coba audio saja jika kamera tidak tersedia / ditolak
          try {
            const audioTrack = await AgoraRTC.createMicrophoneAudioTrack()
            localTracksRef.current.audioTrack = audioTrack
            setCameraOn(false)
            await client.publish([audioTrack])
          } catch (micErr) {
            console.error("Gagal akses mikrofon:", micErr)
            setErrorMsg("Izin mikrofon/kamera tidak diberikan atau perangkat sedang digunakan aplikasi lain.")
          }
        }

        if (mounted) {
          setJoined(true)
          setConnecting(false)
        }
      } catch (err) {
        console.error("Gagal bergabung ke sesi Agora Meet:", err)
        if (mounted) {
          setErrorMsg(err.message || "Gagal menghubungkan ke ruang meet.")
          setConnecting(false)
        }
      }
    }

    initCall()

    return () => {
      mounted = false
      leaveChannel()
    }
  }, [channelName])

  // Pastikan video lokal selalu terputar di elemen container saat track siap
  useEffect(() => {
    const vTrack = localTracksRef.current?.videoTrack
    if (vTrack && localVideoRef.current && cameraOn && !isScreenSharing) {
      try {
        localVideoRef.current.innerHTML = ""
        vTrack.play(localVideoRef.current)
      } catch (e) {
        console.warn("Video play error:", e)
      }
    }
  }, [cameraOn, isScreenSharing, joined])

  async function leaveChannel() {
    try {
      const { audioTrack, videoTrack } = localTracksRef.current
      if (audioTrack) {
        audioTrack.stop()
        audioTrack.close()
      }
      if (videoTrack) {
        videoTrack.stop()
        videoTrack.close()
      }
      if (screenTrackRef.current) {
        screenTrackRef.current.stop()
        screenTrackRef.current.close()
      }
      if (clientRef.current) {
        await clientRef.current.leave()
      }
    } catch (e) {
      console.warn("Error leaving Agora channel:", e)
    } finally {
      setJoined(false)
      if (onLeave) onLeave()
    }
  }

  // Toggle Mute Mikrofon
  async function toggleMic() {
    const { audioTrack } = localTracksRef.current
    if (audioTrack) {
      if (micOn) {
        await audioTrack.setEnabled(false)
        setMicOn(false)
      } else {
        await audioTrack.setEnabled(true)
        setMicOn(true)
      }
    }
  }

  // Toggle Kamera Video
  async function toggleCamera() {
    const { videoTrack } = localTracksRef.current
    if (videoTrack) {
      if (cameraOn) {
        await videoTrack.setEnabled(false)
        setCameraOn(false)
      } else {
        await videoTrack.setEnabled(true)
        setCameraOn(true)
        if (localVideoRef.current) {
          localVideoRef.current.innerHTML = ""
          videoTrack.play(localVideoRef.current)
        }
      }
    }
  }

  // Toggle Berbagi Layar (Screen Sharing)
  async function toggleScreenShare() {
    const client = clientRef.current
    if (!client) return

    if (!isScreenSharing) {
      try {
        const screenTrack = await AgoraRTC.createScreenVideoTrack({}, "disable")
        screenTrackRef.current = screenTrack

        // Unpublish video kamera lokal jika ada
        if (localTracksRef.current.videoTrack) {
          await client.unpublish(localTracksRef.current.videoTrack)
        }

        // Publish screen track
        await client.publish(screenTrack)
        if (localVideoRef.current) {
          screenTrack.play(localVideoRef.current)
        }

        screenTrack.on("track-ended", async () => {
          await stopScreenSharing()
        })

        setIsScreenSharing(true)
      } catch (err) {
        console.warn("Batal berbagi layar atau error:", err)
      }
    } else {
      await stopScreenSharing()
    }
  }

  async function stopScreenSharing() {
    const client = clientRef.current
    if (screenTrackRef.current && client) {
      await client.unpublish(screenTrackRef.current)
      screenTrackRef.current.stop()
      screenTrackRef.current.close()
      screenTrackRef.current = null

      // Publish kembali kamera lokal
      if (localTracksRef.current.videoTrack) {
        await client.publish(localTracksRef.current.videoTrack)
        if (localVideoRef.current) {
          localVideoRef.current.innerHTML = ""
          localTracksRef.current.videoTrack.play(localVideoRef.current)
        }
      }
      setIsScreenSharing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col text-white animate-in fade-in duration-200 w-screen h-screen overflow-hidden">
      {/* Top Bar Header */}
      <div className="p-3.5 sm:p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3 backdrop-blur-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-md">
            <Video className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="font-extrabold text-xs sm:text-sm text-slate-100 truncate">
              {judulSesi}
            </h2>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Meet LSM</span>
              <span>&bull;</span>
              <span>{remoteUsers.length + 1} Peserta Terhubung</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px] font-bold px-2 py-0.5 hidden sm:inline-flex">
            {isGuru ? "Guru Pengajar (Host)" : `Siswa: ${userNama}`}
          </Badge>
        </div>
      </div>

      {/* Main Video Grid */}
      <div className="flex-1 p-3 sm:p-5 overflow-y-auto flex items-center justify-center">
        {connecting ? (
          <div className="text-center space-y-3">
            <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-300">
              Menghubungkan ke ruang meet Agora...
            </p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Mohon izinkan akses mikrofon dan kamera di browser Anda jika diminta.
            </p>
          </div>
        ) : errorMsg ? (
          <div className="p-6 rounded-3xl bg-slate-900 border border-rose-500/30 text-center max-w-md space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <VideoOff className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-rose-300">Gagal Membuka Ruang Meet</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{errorMsg}</p>
            <Button onClick={leaveChannel} variant="outline" className="text-xs font-bold mt-2">
              Kembali
            </Button>
          </div>
        ) : (
          <div
            className={`w-full max-w-6xl h-full grid gap-3 sm:gap-4 ${
              remoteUsers.length === 0
                ? "grid-cols-1"
                : remoteUsers.length === 1
                ? "grid-cols-1 sm:grid-cols-2"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {/* Video Lokal (Saya) */}
            <div className="relative rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl flex items-center justify-center min-h-[220px]">
              <div ref={localVideoRef} className="w-full h-full min-h-[220px] bg-black [&>div]:w-full [&>div]:h-full [&>div>video]:object-cover" />
              {!cameraOn && !isScreenSharing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-400 space-y-2">
                  <div className="w-16 h-16 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-black text-xl ring-2 ring-blue-500/20">
                    {userNama.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold">Kamera Dinonaktifkan</span>
                </div>
              )}
              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-xl text-[11px] font-bold text-white flex items-center gap-1.5">
                <span>{userNama} (Saya)</span>
                {!micOn && <MicOff className="w-3 h-3 text-rose-400" />}
              </div>
            </div>

            {/* Video Remote Users */}
            {remoteUsers.map((user) => (
              <RemoteUserVideoCard key={user.uid} user={user} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Control Bar */}
      <div className="p-4 bg-slate-900/95 border-t border-slate-800 flex items-center justify-center gap-3 sm:gap-4 shrink-0 backdrop-blur-lg">
        {/* Mic Toggle */}
        <button
          type="button"
          onClick={toggleMic}
          className={`p-3.5 rounded-2xl transition-all shadow-md ${
            micOn
              ? "bg-slate-800 hover:bg-slate-700 text-white"
              : "bg-rose-600 hover:bg-rose-700 text-white ring-2 ring-rose-400"
          }`}
          title={micOn ? "Matikan Mikrofon" : "Nyalakan Mikrofon"}
        >
          {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        {/* Camera Toggle */}
        <button
          type="button"
          onClick={toggleCamera}
          className={`p-3.5 rounded-2xl transition-all shadow-md ${
            cameraOn
              ? "bg-slate-800 hover:bg-slate-700 text-white"
              : "bg-rose-600 hover:bg-rose-700 text-white ring-2 ring-rose-400"
          }`}
          title={cameraOn ? "Matikan Kamera" : "Nyalakan Kamera"}
        >
          {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        {/* Screen Sharing Toggle */}
        <button
          type="button"
          onClick={toggleScreenShare}
          className={`p-3.5 rounded-2xl transition-all shadow-md ${
            isScreenSharing
              ? "bg-indigo-600 text-white ring-2 ring-indigo-400"
              : "bg-slate-800 hover:bg-slate-700 text-white"
          }`}
          title={isScreenSharing ? "Berhenti Berbagi Layar" : "Bagikan Layar"}
        >
          <Monitor className="w-5 h-5" />
        </button>

        {/* Leave Call Button */}
        <button
          type="button"
          onClick={leaveChannel}
          className="p-3.5 px-6 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all active:scale-95 ml-2"
        >
          <PhoneOff className="w-5 h-5" />
          <span className="hidden sm:inline">Tinggalkan Sesi</span>
        </button>
      </div>
    </div>
  )
}

function RemoteUserVideoCard({ user }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (user.videoTrack && containerRef.current) {
      user.videoTrack.play(containerRef.current)
    }
  }, [user.videoTrack])

  return (
    <div className="relative rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl flex items-center justify-center min-h-[220px]">
      <div ref={containerRef} className="w-full h-full object-cover" />
      <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-xl text-[11px] font-bold text-white flex items-center gap-1.5">
        <span>Peserta #{String(user.uid).slice(-4)}</span>
        {!user.hasAudio && <MicOff className="w-3 h-3 text-rose-400" />}
      </div>
    </div>
  )
}

