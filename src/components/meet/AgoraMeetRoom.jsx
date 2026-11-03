import React, { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import AgoraRTC from "agora-rtc-sdk-ng"
import {
  fetchAgoraToken,
  subscribeMeetControls,
  setActiveScreenSharer,
  forceMuteUser,
  forceKickUser,
} from "@/services/meet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Monitor,
  MonitorOff,
  Users,
  ShieldAlert,
  UserX,
  VolumeX,
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
  const [micOn, setMicOn] = useState(isGuru)
  const [cameraOn, setCameraOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [remoteUsers, setRemoteUsers] = useState([])
  const [errorMsg, setErrorMsg] = useState("")

  // Realtime meet controls (Zoom-like features)
  const [activeSharer, setActiveSharer] = useState(null)
  const [showParticipantList, setShowParticipantList] = useState(false)

  const clientRef = useRef(null)
  const localTracksRef = useRef({ audioTrack: null, videoTrack: null })
  const screenTrackRef = useRef(null)
  const localVideoRef = useRef(null)
  const activeSharerVideoRef = useRef(null)

  // 1. Berlangganan kontrol realtime sesi meet (Host controls: mute, kick, sharescreen lock)
  useEffect(() => {
    if (!channelName) return
    const unsub = subscribeMeetControls(channelName, (controls) => {
      setActiveSharer(controls?.activeSharer || null)

      // Cek apakah saya kena force kick oleh guru
      if (!isGuru && controls?.kickedUsers?.includes(userNama)) {
        alert("Anda telah dikeluarkan dari sesi meet oleh guru pengajar.")
        leaveChannel()
        return
      }

      // Cek apakah saya kena force mute oleh guru
      if (!isGuru && controls?.mutedUsers?.includes(userNama)) {
        if (localTracksRef.current.audioTrack && micOn) {
          localTracksRef.current.audioTrack.setEnabled(false)
          setMicOn(false)
        }
      }
    })
    return () => unsub()
  }, [channelName, userNama, isGuru, micOn])

  // 2. Setup Agora Call
  useEffect(() => {
    let mounted = true
    document.body.style.overflow = "hidden"

    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" })
    clientRef.current = client

    // Peserta masuk
    client.on("user-joined", (user) => {
      setRemoteUsers((prev) => {
        if (!prev.find((u) => u.uid === user.uid)) {
          return [...prev, user]
        }
        return prev
      })
    })

    // Peserta publish track
    client.on("user-published", async (user, mediaType) => {
      try {
        await client.subscribe(user, mediaType)
      } catch (subErr) {
        console.warn("Gagal subscribe ke remote track:", subErr)
      }

      // Pastikan state selalu clone objek user agar React mendeteksi perubahan videoTrack
      setRemoteUsers((prev) => {
        const filtered = prev.filter((u) => u.uid !== user.uid)
        return [...filtered, user]
      })

      if (mediaType === "audio") {
        user.audioTrack?.play()
      }
    })

    client.on("user-unpublished", (user, mediaType) => {
      setRemoteUsers((prev) => {
        const filtered = prev.filter((u) => u.uid !== user.uid)
        return [...filtered, user]
      })
    })

    client.on("user-left", (user) => {
      setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid))
    })

    async function initCall() {
      try {
        setConnecting(true)
        const tokenData = await fetchAgoraToken(channelName, userNama)
        const appId = tokenData.appId || "5960c48ec498439798df7c0d1249ae4d"
        const token = tokenData.token

        await client.join(appId, channelName, token, userNama)

        let audioTrack = null
        let videoTrack = null

        // Mikrofon
        try {
          audioTrack = await AgoraRTC.createMicrophoneAudioTrack()
          localTracksRef.current.audioTrack = audioTrack
          if (!isGuru) {
            await audioTrack.setEnabled(false)
            setMicOn(false)
          } else {
            setMicOn(true)
          }
        } catch (mErr) {
          console.warn("Mikrofon tidak aktif:", mErr)
          setMicOn(false)
        }

        // Kamera Video
        try {
          videoTrack = await AgoraRTC.createCameraVideoTrack({ encoderConfig: "480p_1" })
          localTracksRef.current.videoTrack = videoTrack
          setCameraOn(true)
          if (localVideoRef.current && videoTrack) {
            localVideoRef.current.innerHTML = ""
            videoTrack.play(localVideoRef.current)
          }
        } catch (vErr) {
          console.warn("Kamera tidak aktif:", vErr)
          setCameraOn(false)
        }

        const tracksToPublish = [audioTrack, videoTrack].filter(Boolean)
        if (tracksToPublish.length > 0) {
          try {
            await client.publish(tracksToPublish)
          } catch (pubErr) {
            console.warn("Gagal publish local track:", pubErr)
          }
        }

        if (mounted) {
          setJoined(true)
          setConnecting(false)
        }
      } catch (err) {
        console.error("Gagal bergabung ke sesi Meet LSM:", err)
        if (mounted) {
          setErrorMsg(err.message || "Gagal menghubungkan ke ruang meet.")
          setConnecting(false)
        }
      }
    }

    initCall()

    return () => {
      mounted = false
      document.body.style.overflow = "auto"
      leaveChannel()
    }
  }, [channelName, userNama])

  // Pastikan video lokal selalu terputar di thumbnail lokal
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
  }, [cameraOn, isScreenSharing, joined, activeSharer])

  // Jika remote user sedang share screen, putar videonya di layar utama
  useEffect(() => {
    if (activeSharer && activeSharer !== userNama && activeSharerVideoRef.current) {
      const sharerUser = remoteUsers.find((u) => u.uid === activeSharer)
      if (sharerUser?.videoTrack) {
        activeSharerVideoRef.current.innerHTML = ""
        sharerUser.videoTrack.play(activeSharerVideoRef.current)
      }
    }
  }, [activeSharer, remoteUsers, userNama])

  async function leaveChannel() {
    try {
      if (isScreenSharing) {
        await setActiveScreenSharer(channelName, null)
      }
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
      document.body.style.overflow = "auto"
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

    // Jika sedang ada orang lain yang share screen, tolak
    if (activeSharer && activeSharer !== userNama) {
      alert(`Peserta "${activeSharer}" sedang berbagi layar. Mohon tunggu giliran.`)
      return
    }

    if (!isScreenSharing) {
      try {
        const screenTrack = await AgoraRTC.createScreenVideoTrack({}, "disable")
        screenTrackRef.current = screenTrack

        if (localTracksRef.current.videoTrack) {
          await client.unpublish(localTracksRef.current.videoTrack)
        }

        await client.publish(screenTrack)
        await setActiveScreenSharer(channelName, userNama)

        if (localVideoRef.current) {
          localVideoRef.current.innerHTML = ""
          screenTrack.play(localVideoRef.current)
        }

        screenTrack.on("track-ended", async () => {
          await stopScreenSharing()
        })

        setIsScreenSharing(true)
      } catch (err) {
        console.warn("Batal berbagi layar atau ditolak:", err)
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
      await setActiveScreenSharer(channelName, null)

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

  // Guru mematikan paksa sharescreen murid
  async function handleHentikanShareScreenMurid() {
    if (!isGuru || !activeSharer) return
    if (window.confirm(`Hentikan presentasi berbagi layar dari "${activeSharer}"?`)) {
      await setActiveScreenSharer(channelName, null)
    }
  }

  // Guru mute murid
  async function handleMuteMurid(nama) {
    if (!isGuru) return
    if (window.confirm(`Mute mikrofon peserta "${nama}"?`)) {
      await forceMuteUser(channelName, nama)
    }
  }

  // Guru kick murid
  async function handleKickMurid(nama) {
    if (!isGuru) return
    if (window.confirm(`Keluarkan peserta "${nama}" dari sesi meet?`)) {
      await forceKickUser(channelName, nama)
    }
  }

  // Cek apakah ada yang sedang share screen (baik saya sendiri atau remote user)
  const isSomeoneSharing = !!activeSharer

  return createPortal(
    <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 z-[999999] bg-slate-950 flex flex-col text-white w-screen h-screen overflow-hidden animate-in fade-in duration-200">
      {/* Top Bar Header ala Zoom */}
      <div className="p-3 sm:p-4 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-3 backdrop-blur-md shrink-0">
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
              <span className="font-bold text-emerald-400">Meet LSM</span>
              <span>&bull;</span>
              <span>{remoteUsers.length + 1} Peserta Terhubung</span>
            </div>
          </div>
        </div>

        {/* Info Host & Tombol Partisipan Zoom */}
        <div className="flex items-center gap-2 shrink-0">
          {activeSharer && (
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] font-bold px-2 py-0.5 flex items-center gap-1">
              <Monitor className="w-3 h-3" />
              <span>Presentasi: {activeSharer === userNama ? "Anda" : activeSharer}</span>
              {isGuru && activeSharer !== userNama && (
                <button
                  type="button"
                  onClick={handleHentikanShareScreenMurid}
                  className="ml-1 p-0.5 rounded hover:bg-rose-600/40 text-rose-300"
                  title="Hentikan Share Screen Murid"
                >
                  <MonitorOff className="w-3 h-3" />
                </button>
              )}
            </Badge>
          )}

          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px] font-bold px-2 py-0.5 hidden sm:inline-flex">
            {isGuru ? "Guru Pengajar (Host)" : `Siswa: ${userNama}`}
          </Badge>

          {/* Tombol Panel Peserta (Zoom Participants) */}
          <button
            type="button"
            onClick={() => setShowParticipantList(!showParticipantList)}
            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
              showParticipantList
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
            }`}
            title="Kelola Peserta"
          >
            <Users className="w-4 h-4" />
            <span className="text-[11px] hidden sm:inline">{remoteUsers.length + 1}</span>
          </button>
        </div>
      </div>

      {/* Main Body: Mode Normal vs Mode Presentasi / Share Screen ala Zoom */}
      <div className="relative flex-1 p-2 sm:p-4 overflow-hidden flex flex-col justify-between">
        {connecting ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-300">Menghubungkan ke ruang Meet LSM...</p>
          </div>
        ) : errorMsg ? (
          <div className="flex-1 flex items-center justify-center">
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
          </div>
        ) : isSomeoneSharing ? (
          /* =========================================================================
             ZOOM SCREEN SHARE MODE: Layar Presentasi Full di Atas, Kamera Kotak-Kotak Kecil di Bawah
             ========================================================================= */
          <div className="flex-1 flex flex-col h-full gap-3 overflow-hidden pb-20">
            {/* Layar Utama Presenter */}
            <div className="flex-1 relative rounded-2xl bg-black border border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center min-h-[300px]">
              {activeSharer === userNama ? (
                /* Saya yang sedang berbagi layar */
                <div ref={localVideoRef} className="w-full h-full object-contain" />
              ) : (
                /* Remote user yang sedang berbagi layar */
                <div ref={activeSharerVideoRef} className="w-full h-full object-contain" />
              )}
              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-400 flex items-center gap-2 border border-emerald-500/30">
                <Monitor className="w-3.5 h-3.5" />
                <span>Presentasi Layar: {activeSharer === userNama ? "Layar Anda" : activeSharer}</span>
              </div>
            </div>

            {/* Strip Kamera Kotak-Kotak Kecil di Bawah ala Zoom */}
            <div className="h-28 sm:h-32 flex items-center gap-2.5 overflow-x-auto pb-1 shrink-0 no-scrollbar">
              {/* Kotak Saya */}
              <div className="relative rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-md h-full aspect-video shrink-0 flex items-center justify-center">
                {!isScreenSharing && (
                  <div
                    ref={localVideoRef}
                    className="w-full h-full bg-black [&>div]:w-full [&>div]:h-full [&>div>video]:object-cover"
                  />
                )}
                {(!cameraOn || isScreenSharing) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-400">
                    <div className="w-8 h-8 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-xs ring-1 ring-blue-500/20">
                      {userNama.charAt(0).toUpperCase()}
                    </div>
                  </div>
                )}
                <div className="absolute bottom-1.5 left-1.5 bg-black/60 px-2 py-0.5 rounded-lg text-[10px] font-bold text-white flex items-center gap-1">
                  <span>{userNama}</span>
                  {!micOn && <MicOff className="w-2.5 h-2.5 text-rose-400" />}
                </div>
              </div>

              {/* Kotak Remote Users */}
              {remoteUsers.map((user) => (
                <div
                  key={user.uid}
                  className="relative rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-md h-full aspect-video shrink-0 flex items-center justify-center"
                >
                  <RemoteUserVideoCard user={user} compact={true} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* =========================================================================
             NORMAL GALLERY MODE: Kisi-kisi Kolom Proporsional ala Zoom
             - Total 1: 1 kolom centered (max-w-2xl)
             - Total genap (2, 4, 6...): grid-cols-2 (semua peserta col-span-1)
             - Total ganjil > 1 (3, 5...): grid-cols-2, peserta terakhir col-span-2 (full lebar bawah sesuai sketsa)
             Berlaku konsisten di mobile, tablet, dan desktop.
             ========================================================================= */
          (() => {
            const totalParticipants = 1 + remoteUsers.length
            const isOddGreaterThanOne = totalParticipants % 2 !== 0 && totalParticipants > 1

            // Buat array seragam: item pertama adalah local user (saya), berikutnya remote users
            const participants = [
              { isLocal: true, uid: userNama, name: userNama },
              ...remoteUsers.map((u) => ({ isLocal: false, user: u, uid: u.uid })),
            ]

            return (
              <div
                className={`w-full max-w-5xl mx-auto h-full pb-36 pt-1 px-1 grid gap-3 sm:gap-4 overflow-y-auto overscroll-contain touch-pan-y no-scrollbar ${
                  totalParticipants === 1
                    ? "grid-cols-1 max-w-2xl my-auto"
                    : "grid-cols-2 my-auto"
                }`}
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                {participants.map((p, idx) => {
                  const isLastOddItem = isOddGreaterThanOne && idx === totalParticipants - 1
                  const wrapperClass = isLastOddItem ? "col-span-2 w-full" : "col-span-1 w-full"

                  if (p.isLocal) {
                    return (
                      <div key="local-user" className={wrapperClass}>
                        <div className={`relative rounded-2xl sm:rounded-3xl bg-slate-900 border border-slate-800/80 overflow-hidden shadow-xl flex items-center justify-center w-full ${
                          isLastOddItem ? "aspect-[21/9] sm:aspect-[24/9] max-h-[38vh]" : "aspect-video"
                        }`}>
                          <div
                            ref={localVideoRef}
                            className="w-full h-full bg-black [&>div]:w-full [&>div]:h-full [&>div>video]:object-cover"
                          />
                          {!cameraOn && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-400 space-y-2">
                              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-black text-lg sm:text-xl ring-2 ring-blue-500/20">
                                {userNama.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs font-semibold">Kamera Dinonaktifkan</span>
                            </div>
                          )}
                          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-md">
                            <span>{userNama} (Saya)</span>
                            {!micOn && <MicOff className="w-3.5 h-3.5 text-rose-400" />}
                          </div>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div key={p.uid} className={wrapperClass}>
                      <RemoteUserVideoCard
                        user={p.user}
                        isGuruHost={isGuru}
                        isFullSpan={isLastOddItem}
                        onMute={() => handleMuteMurid(p.uid)}
                        onKick={() => handleKickMurid(p.uid)}
                      />
                    </div>
                  )
                })}
              </div>
            )
          })()
        )}

        {/* =========================================================================
            PANEL KELOLA PARTICIPANTS (ZOOM ROSTER & HOST CONTROLS)
            ========================================================================= */}
        {showParticipantList && (
          <div className="absolute top-16 right-3 sm:right-6 z-40 w-72 sm:w-80 bg-slate-900/95 border border-slate-700/80 rounded-3xl p-4 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-extrabold text-slate-200">
                Daftar Peserta ({remoteUsers.length + 1})
              </span>
              <button
                type="button"
                onClick={() => setShowParticipantList(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
              {/* Saya */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 text-xs">
                <span className="font-bold text-slate-100 truncate">
                  {userNama} (Anda) {isGuru ? "(Host)" : ""}
                </span>
                <span className="text-[10px] text-slate-400">{micOn ? "Mic On" : "Muted"}</span>
              </div>

              {/* Teman / Murid */}
              {remoteUsers.map((u) => {
                const nama = u.uid
                return (
                  <div
                    key={nama}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 text-xs gap-2"
                  >
                    <span className="font-semibold text-slate-200 truncate">{nama}</span>
                    {isGuru ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMuteMurid(nama)}
                          className="p-1 rounded bg-slate-700 hover:bg-amber-600 text-slate-300 hover:text-white"
                          title="Mute Peserta"
                        >
                          <VolumeX className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleKickMurid(nama)}
                          className="p-1 rounded bg-slate-700 hover:bg-rose-600 text-slate-300 hover:text-white"
                          title="Keluarkan dari Meet"
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400">
                        {u.hasAudio ? "Mic On" : "Muted"}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
            FLOATING OVERLAY CONTROLS PILL ALA ZOOM MEETING
            ========================================================================= */}
        {!connecting && !errorMsg && (
          <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-[9999999] pointer-events-auto max-w-[95vw]">
            <div className="flex items-center gap-2 sm:gap-3.5 p-1.5 sm:p-2.5 px-3 sm:px-5 rounded-full bg-slate-900/90 hover:bg-slate-900/98 border border-white/15 shadow-2xl backdrop-blur-2xl transition-all ring-1 ring-black/40">
              {/* Mic Toggle */}
              <button
                type="button"
                onClick={toggleMic}
                className={`p-3 sm:p-3.5 rounded-full transition-all active:scale-95 shadow-md ${
                  micOn
                    ? "bg-white/10 hover:bg-white/20 text-white"
                    : "bg-rose-600 hover:bg-rose-700 text-white ring-2 ring-rose-400/50"
                }`}
                title={micOn ? "Matikan Mikrofon" : "Nyalakan Mikrofon"}
              >
                {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>

              {/* Camera Toggle */}
              <button
                type="button"
                onClick={toggleCamera}
                className={`p-3 sm:p-3.5 rounded-full transition-all active:scale-95 shadow-md ${
                  cameraOn
                    ? "bg-white/10 hover:bg-white/20 text-white"
                    : "bg-rose-600 hover:bg-rose-700 text-white ring-2 ring-rose-400/50"
                }`}
                title={cameraOn ? "Matikan Kamera" : "Nyalakan Kamera"}
              >
                {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>

              {/* Screen Sharing Toggle (Kunci jika orang lain sedang berbagi) */}
              <button
                type="button"
                onClick={toggleScreenShare}
                disabled={activeSharer && activeSharer !== userNama}
                className={`p-3 sm:p-3.5 rounded-full transition-all active:scale-95 shadow-md ${
                  isScreenSharing
                    ? "bg-indigo-600 text-white ring-2 ring-indigo-400/60"
                    : activeSharer && activeSharer !== userNama
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50"
                    : "bg-white/10 hover:bg-white/20 text-white"
                }`}
                title={
                  activeSharer && activeSharer !== userNama
                    ? `${activeSharer} sedang berbagi layar`
                    : isScreenSharing
                    ? "Hentikan Berbagi Layar"
                    : "Bagikan Layar (Screen Share)"
                }
              >
                <Monitor className="w-5 h-5" />
              </button>

              <div className="w-[1px] h-6 bg-white/15 my-auto mx-0.5" />

              {/* Leave Call Button */}
              <button
                type="button"
                onClick={leaveChannel}
                className="p-3 sm:p-3.5 px-4 sm:px-5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all active:scale-95"
                title="Tinggalkan Sesi Meet"
              >
                <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

function RemoteUserVideoCard({ user, compact = false, isFullSpan = false, isGuruHost = false, onMute, onKick }) {
  const containerRef = useRef(null)
  const [hasVideoTrack, setHasVideoTrack] = useState(!!user.videoTrack)

  useEffect(() => {
    let checkInterval = null
    function mountTrack() {
      if (user.videoTrack && containerRef.current) {
        setHasVideoTrack(true)
        containerRef.current.innerHTML = ""
        user.videoTrack.play(containerRef.current)
      } else {
        setHasVideoTrack(false)
      }
    }

    mountTrack()
    // Polling kecil untuk memastikan track terpasang jika timing subscribe async
    checkInterval = setInterval(() => {
      if (user.videoTrack && containerRef.current && containerRef.current.childElementCount === 0) {
        mountTrack()
      }
    }, 1000)

    return () => {
      if (checkInterval) clearInterval(checkInterval)
    }
  }, [user.videoTrack])

  const displayName =
    typeof user.uid === "string" && isNaN(Number(user.uid))
      ? user.uid
      : `Peserta #${String(user.uid).slice(-4)}`

  return (
    <div
      className={`relative rounded-2xl bg-slate-900 border border-slate-800/80 overflow-hidden shadow-xl flex items-center justify-center w-full group shrink-0 ${
        compact
          ? "h-full aspect-video"
          : isFullSpan
          ? "aspect-[21/9] sm:aspect-[24/9] max-h-[38vh]"
          : "aspect-video"
      }`}
    >
      {/* Video Container (Selalu ada di DOM agar Agora SDK bisa memutarnya kapan saja) */}
      <div
        ref={containerRef}
        className={`w-full h-full bg-black [&>div]:w-full [&>div]:h-full [&>div>video]:object-cover ${
          hasVideoTrack ? "block" : "hidden"
        }`}
      />

      {/* Placeholder Avatar saat kamera mati */}
      {!hasVideoTrack && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-400 space-y-1">
          <div
            className={`rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-black ring-2 ring-indigo-500/20 ${
              compact ? "w-8 h-8 text-xs" : "w-14 h-14 text-lg"
            }`}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
          <span className="text-[11px] font-semibold text-slate-400 truncate max-w-[90%]">
            {displayName}
          </span>
        </div>
      )}

      {/* Label Nama Peserta */}
      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-xl text-[11px] font-bold text-white flex items-center gap-1.5 shadow-md">
        <span className="truncate max-w-[120px]">{displayName}</span>
        {!user.hasAudio && <MicOff className="w-3 h-3 text-rose-400" />}
      </div>

      {/* Host Action Hover Buttons (Khusus Guru Pengajar) */}
      {isGuruHost && !compact && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-black/70 backdrop-blur-md p-1 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={onMute}
            className="p-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px]"
            title="Mute Peserta"
          >
            <VolumeX className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onKick}
            className="p-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px]"
            title="Keluarkan Peserta"
          >
            <UserX className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
