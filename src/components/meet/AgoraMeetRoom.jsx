import React, { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import AgoraRTC from "agora-rtc-sdk-ng"
import {
  fetchAgoraToken,
  subscribeMeetControls,
  setActiveScreenSharer,
  forceMuteUser,
  forceMuteAllUsers,
  askUserToUnmute,
  forceKickUser,
  toggleRaiseHand,
  updateScreenSharePermission,
  setSpotlightUser,
} from "@/services/meet"
import { MeetChatDrawer } from "./MeetChatDrawer"
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
  Hand,
  MessageSquare,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Pin,
  Sparkles,
  Signal,
  Settings,
  ChevronUp,
} from "lucide-react"

export function AgoraMeetRoom({
  channelName,
  userNama = "Peserta",
  isGuru = false,
  judulSesi = "Sesi Tatap Muka",
  initialSettings = null,
  onLeave,
}) {
  const [joined, setJoined] = useState(false)
  const [connecting, setConnecting] = useState(true)
  const [micOn, setMicOn] = useState(initialSettings ? initialSettings.initialMicOn : isGuru)
  const [cameraOn, setCameraOn] = useState(initialSettings ? initialSettings.initialCamOn : true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [remoteUsers, setRemoteUsers] = useState([])
  const [speakingUsers, setSpeakingUsers] = useState({})
  const [networkQuality, setNetworkQuality] = useState(1) // 1-2 bagus, 3 sedang, 4-6 buruk
  const [errorMsg, setErrorMsg] = useState("")

  // Realtime meet controls
  const [activeSharer, setActiveSharer] = useState(null)
  const [spotlightUser, setSpotlightUserState] = useState(null)
  const [allowStudentScreenShare, setAllowStudentScreenShare] = useState(false)
  const [raisedHands, setRaisedHands] = useState({}) // { [userAccount]: timestamp }
  const [showParticipantList, setShowParticipantList] = useState(false)
  const [showChat, setShowChat] = useState(false)

  // View Mode: 'gallery' vs 'speaker'
  const [viewMode, setViewMode] = useState("gallery")
  const [pinnedUser, setPinnedUser] = useState(null)

  // Device switching state
  const [availableCams, setAvailableCams] = useState([])
  const [availableMics, setAvailableMics] = useState([])
  const [showDeviceMenu, setShowDeviceMenu] = useState(false)

  const clientRef = useRef(null)
  const localTracksRef = useRef({ audioTrack: null, videoTrack: null })
  const screenTrackRef = useRef(null)
  const localVideoRef = useRef(null)
  const activeSharerVideoRef = useRef(null)
  const speakerViewVideoRef = useRef(null)
  const lastProcessedMuteRef = useRef(0)
  const lastProcessedUnmuteAskRef = useRef(0)

  // Cek apakah saya sedang angkat tangan
  const isMyHandRaised = !!raisedHands[userNama]

  // 1. Berlangganan kontrol realtime sesi meet
  useEffect(() => {
    if (!channelName) return
    const unsub = subscribeMeetControls(channelName, (controls) => {
      setActiveSharer(controls?.activeSharer || null)
      setSpotlightUserState(controls?.spotlightUser || null)
      setAllowStudentScreenShare(!!controls?.allowStudentScreenShare)
      setRaisedHands(controls?.raisedHands || {})

      // Cek apakah saya kena force kick
      const kickUntil = controls?.kickedUsers?.[userNama]
      if (!isGuru && kickUntil && Date.now() < kickUntil) {
        alert("Anda dikeluarkan dari sesi meet oleh guru pengajar.")
        leaveChannel()
        return
      }

      // Cek force mute satu orang
      if (!isGuru && controls?.lastMutedUser?.user === userNama) {
        const muteTs = controls.lastMutedUser.at || 0
        if (muteTs > lastProcessedMuteRef.current) {
          lastProcessedMuteRef.current = muteTs
          if (localTracksRef.current.audioTrack && micOn) {
            localTracksRef.current.audioTrack.setEnabled(false)
            setMicOn(false)
          }
        }
      }

      // Cek force mute all trigger
      if (!isGuru && controls?.muteAllTrigger) {
        if (controls.muteAllTrigger > lastProcessedMuteRef.current) {
          lastProcessedMuteRef.current = controls.muteAllTrigger
          if (localTracksRef.current.audioTrack && micOn) {
            localTracksRef.current.audioTrack.setEnabled(false)
            setMicOn(false)
          }
        }
      }

      // Cek apakah guru meminta unmute
      if (!isGuru && controls?.askUnmuteUser?.user === userNama) {
        const askTs = controls.askUnmuteUser.at || 0
        if (askTs > lastProcessedUnmuteAskRef.current) {
          lastProcessedUnmuteAskRef.current = askTs
          if (window.confirm("Guru pengajar meminta Anda menyalakan mikrofon. Nyalakan sekarang?")) {
            if (localTracksRef.current.audioTrack) {
              localTracksRef.current.audioTrack.setEnabled(true)
              setMicOn(true)
            }
          }
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

    // Deteksi perangkat yang tersedia
    AgoraRTC.getDevices().then((devs) => {
      if (mounted) {
        setAvailableCams(devs.filter((d) => d.kind === "videoinput"))
        setAvailableMics(devs.filter((d) => d.kind === "audioinput"))
      }
    })

    client.on("user-joined", (user) => {
      setRemoteUsers((prev) => {
        if (!prev.find((u) => u.uid === user.uid)) {
          return [...prev, user]
        }
        return prev
      })
    })

    client.on("user-published", async (user, mediaType) => {
      try {
        await client.subscribe(user, mediaType)
      } catch (subErr) {
        console.warn("Gagal subscribe ke remote track:", subErr)
      }

      setRemoteUsers((prev) => {
        const filtered = prev.filter((u) => u.uid !== user.uid)
        return [...filtered, { ...user, hasAudio: user.hasAudio, hasVideo: user.hasVideo }]
      })

      if (mediaType === "audio") {
        user.audioTrack?.play()
      }
    })

    client.on("user-unpublished", (user, mediaType) => {
      setRemoteUsers((prev) => {
        const filtered = prev.filter((u) => u.uid !== user.uid)
        return [...filtered, { ...user, hasAudio: user.hasAudio, hasVideo: user.hasVideo }]
      })
    })

    client.on("volume-indicator", (volumes) => {
      const activeMap = {}
      volumes.forEach((v) => {
        if (v.level > 5) {
          activeMap[v.uid] = true
        }
      })
      setSpeakingUsers(activeMap)
    })

    // Network quality
    client.on("network-quality", (stats) => {
      setNetworkQuality(stats.downlinkNetworkQuality || stats.uplinkNetworkQuality || 1)
    })

    client.on("user-left", (user) => {
      setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid))
    })

    async function initCall() {
      try {
        setConnecting(true)
        try {
          client.enableAudioVolumeIndicator()
        } catch (_) {}

        const tokenData = await fetchAgoraToken(channelName, userNama)
        const appId = tokenData.appId || "5960c48ec498439798df7c0d1249ae4d"
        const token = tokenData.token

        await client.join(appId, channelName, token, userNama)

        let audioTrack = null
        let videoTrack = null

        // Mikrofon
        try {
          audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
            cameraId: initialSettings?.selectedMicId || undefined,
          })
          localTracksRef.current.audioTrack = audioTrack
          if (!micOn) {
            await audioTrack.setEnabled(false)
          }
        } catch (mErr) {
          console.warn("Mikrofon tidak aktif:", mErr)
          setMicOn(false)
        }

        // Kamera Video
        try {
          videoTrack = await AgoraRTC.createCameraVideoTrack({
            encoderConfig: "480p_1",
            cameraId: initialSettings?.selectedCamId || undefined,
          })
          localTracksRef.current.videoTrack = videoTrack
          if (!cameraOn) {
            await videoTrack.setEnabled(false)
          }
          if (localVideoRef.current && videoTrack && cameraOn) {
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

  // Pastikan video lokal selalu terputar di thumbnail
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
  }, [cameraOn, isScreenSharing, joined, activeSharer, viewMode])

  // Play video di Speaker View jika aktif
  useEffect(() => {
    if (viewMode === "speaker" && speakerViewVideoRef.current) {
      const activeSpeakerUid = spotlightUser || pinnedUser || Object.keys(speakingUsers)[0]
      if (activeSpeakerUid === userNama) {
        const vTrack = localTracksRef.current?.videoTrack
        if (vTrack && cameraOn) {
          speakerViewVideoRef.current.innerHTML = ""
          vTrack.play(speakerViewVideoRef.current)
        }
      } else if (activeSpeakerUid) {
        const sUser = remoteUsers.find((u) => u.uid === activeSpeakerUid)
        if (sUser?.videoTrack) {
          speakerViewVideoRef.current.innerHTML = ""
          sUser.videoTrack.play(speakerViewVideoRef.current)
        }
      }
    }
  }, [viewMode, spotlightUser, pinnedUser, speakingUsers, remoteUsers, userNama, cameraOn])

  // Share screen viewer
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
      if (isMyHandRaised) {
        await toggleRaiseHand(channelName, userNama, false)
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

  // Switch Perangkat Kamera
  async function handleSwitchCamera(deviceId) {
    if (localTracksRef.current?.videoTrack) {
      try {
        await localTracksRef.current.videoTrack.setDevice(deviceId)
      } catch (err) {
        console.warn("Gagal switch camera device:", err)
      }
    }
  }

  // Switch Perangkat Mic
  async function handleSwitchMic(deviceId) {
    if (localTracksRef.current?.audioTrack) {
      try {
        await localTracksRef.current.audioTrack.setDevice(deviceId)
      } catch (err) {
        console.warn("Gagal switch mic device:", err)
      }
    }
  }

  // Toggle Angkat Tangan (Raise Hand)
  async function handleToggleRaiseHand() {
    await toggleRaiseHand(channelName, userNama, !isMyHandRaised)
  }

  // Toggle Berbagi Layar (Screen Sharing)
  async function toggleScreenShare() {
    const client = clientRef.current
    if (!client) return

    // Cek izin murid untuk share screen
    if (!isGuru && !allowStudentScreenShare) {
      alert("Izin berbagi layar dinonaktifkan oleh guru pengajar.")
      return
    }

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
        if (localVideoRef.current && cameraOn) {
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

  // Guru mute satu murid
  async function handleMuteMurid(nama) {
    if (!isGuru) return
    if (window.confirm(`Mute mikrofon peserta "${nama}"?`)) {
      await forceMuteUser(channelName, nama)
    }
  }

  // Guru mute semua murid
  async function handleMuteAllMurid() {
    if (!isGuru) return
    if (window.confirm("Mute mikrofon semua peserta murid sekaligus?")) {
      await forceMuteAllUsers(channelName)
    }
  }

  // Guru minta murid unmute
  async function handleAskUnmuteMurid(nama) {
    if (!isGuru) return
    await askUserToUnmute(channelName, nama)
    alert(`Permintaan unmute telah dikirim ke "${nama}".`)
  }

  // Guru kick murid
  async function handleKickMurid(nama) {
    if (!isGuru) return
    if (window.confirm(`Keluarkan peserta "${nama}" dari sesi meet?`)) {
      await forceKickUser(channelName, nama)
    }
  }

  // Guru toggle izin share screen murid
  async function handleToggleScreenSharePermission() {
    if (!isGuru) return
    await updateScreenSharePermission(channelName, !allowStudentScreenShare)
  }

  // Guru set spotlight
  async function handleSetSpotlight(nama) {
    if (!isGuru) return
    await setSpotlightUser(channelName, spotlightUser === nama ? null : nama)
  }

  // Cek apakah ada yang sedang share screen
  const isSomeoneSharing = !!activeSharer

  // Siapa pembicara aktif di Speaker View
  const currentSpeakerUid =
    spotlightUser ||
    pinnedUser ||
    Object.keys(speakingUsers)[0] ||
    userNama

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

        {/* Info & Action Zoom Bar Atas */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Sinyal Jaringan */}
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-800 border border-slate-700 text-[10px] font-bold"
            title={`Kualitas Jaringan: ${networkQuality <= 2 ? "Bagus" : networkQuality === 3 ? "Sedang" : "Buruk"}`}
          >
            <Signal
              className={`w-3.5 h-3.5 ${
                networkQuality <= 2
                  ? "text-emerald-400"
                  : networkQuality === 3
                  ? "text-amber-400"
                  : "text-rose-400"
              }`}
            />
            <span className="hidden sm:inline">
              {networkQuality <= 2 ? "Stabil" : networkQuality === 3 ? "Sedang" : "Lemah"}
            </span>
          </div>

          {/* Toggle View Mode: Gallery vs Speaker */}
          <button
            type="button"
            onClick={() => setViewMode(viewMode === "gallery" ? "speaker" : "gallery")}
            className="p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 bg-slate-800 text-slate-300 hover:text-white transition-all"
            title={`Ganti ke ${viewMode === "gallery" ? "Speaker View" : "Gallery View"}`}
          >
            <LayoutGrid className="w-4 h-4 text-blue-400" />
            <span className="text-[11px] hidden sm:inline">
              {viewMode === "gallery" ? "Gallery" : "Speaker"}
            </span>
          </button>

          {/* Tombol Chat */}
          <button
            type="button"
            onClick={() => {
              setShowChat(!showChat)
              if (showParticipantList) setShowParticipantList(false)
            }}
            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
              showChat
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
            }`}
            title="Chat Kelas"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-[11px] hidden sm:inline">Chat</span>
          </button>

          {/* Tombol Panel Peserta */}
          <button
            type="button"
            onClick={() => {
              setShowParticipantList(!showParticipantList)
              if (showChat) setShowChat(false)
            }}
            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all relative ${
              showParticipantList
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
            }`}
            title="Kelola Peserta"
          >
            <Users className="w-4 h-4" />
            <span className="text-[11px] hidden sm:inline">{remoteUsers.length + 1}</span>
            {Object.keys(raisedHands).length > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 text-black text-[9px] font-black rounded-full flex items-center justify-center animate-bounce">
                {Object.keys(raisedHands).length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Body */}
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
             ZOOM SCREEN SHARE MODE
             ========================================================================= */
          <div className="flex-1 flex flex-col h-full gap-3 overflow-hidden pb-20">
            <div className="flex-1 relative rounded-2xl bg-black border border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center min-h-[300px]">
              {activeSharer === userNama ? (
                <div ref={localVideoRef} className="w-full h-full object-contain" />
              ) : (
                <div ref={activeSharerVideoRef} className="w-full h-full object-contain" />
              )}
              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-400 flex items-center gap-2 border border-emerald-500/30">
                <Monitor className="w-3.5 h-3.5" />
                <span>Presentasi Layar: {activeSharer === userNama ? "Layar Anda" : activeSharer}</span>
              </div>
            </div>

            {/* Strip Thumbnail Bawah */}
            <div className="h-28 sm:h-32 flex items-center gap-2.5 overflow-x-auto pb-1 shrink-0 no-scrollbar">
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

              {remoteUsers.map((user) => (
                <div
                  key={user.uid}
                  className="relative rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-md h-full aspect-video shrink-0 flex items-center justify-center"
                >
                  <RemoteUserVideoCard
                    user={user}
                    compact={true}
                    isSpeaking={speakingUsers[user.uid]}
                    isHandRaised={!!raisedHands[user.uid]}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : viewMode === "speaker" ? (
          /* =========================================================================
             SPEAKER VIEW MODE ALA ZOOM
             ========================================================================= */
          <div className="flex-1 flex flex-col h-full gap-3 overflow-hidden pb-20">
            {/* Layar Utama Speaker */}
            <div className="flex-1 relative rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center min-h-[300px]">
              <div
                ref={speakerViewVideoRef}
                className="w-full h-full bg-black [&>div]:w-full [&>div]:h-full [&>div>video]:object-cover"
              />
              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 border border-white/10">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Fokus Pembicara: {currentSpeakerUid === userNama ? `${userNama} (Anda)` : currentSpeakerUid}</span>
                {spotlightUser === currentSpeakerUid && (
                  <Badge className="bg-amber-500/20 text-amber-300 border-none text-[9px] px-1.5 py-0 font-black">
                    Spotlight
                  </Badge>
                )}
              </div>
            </div>

            {/* Filmstrip Strip Bawah */}
            <div className="h-24 sm:h-28 flex items-center gap-2.5 overflow-x-auto pb-1 shrink-0 no-scrollbar">
              <div
                onClick={() => setPinnedUser(userNama)}
                className={`relative rounded-2xl bg-slate-900 border overflow-hidden shadow-md h-full aspect-video shrink-0 flex items-center justify-center cursor-pointer ${
                  currentSpeakerUid === userNama ? "ring-2 ring-blue-500" : "border-slate-800"
                }`}
              >
                <div
                  ref={localVideoRef}
                  className="w-full h-full bg-black [&>div]:w-full [&>div]:h-full [&>div>video]:object-cover"
                />
                {!cameraOn && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-400">
                    <div className="w-7 h-7 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-xs">
                      {userNama.charAt(0).toUpperCase()}
                    </div>
                  </div>
                )}
                <div className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[9px] font-bold text-white">
                  {userNama} (Saya)
                </div>
              </div>

              {remoteUsers.map((u) => (
                <div
                  key={u.uid}
                  onClick={() => setPinnedUser(u.uid)}
                  className={`relative rounded-2xl bg-slate-900 border overflow-hidden shadow-md h-full aspect-video shrink-0 flex items-center justify-center cursor-pointer ${
                    currentSpeakerUid === u.uid ? "ring-2 ring-blue-500" : "border-slate-800"
                  }`}
                >
                  <RemoteUserVideoCard
                    user={u}
                    compact={true}
                    isSpeaking={speakingUsers[u.uid]}
                    isHandRaised={!!raisedHands[u.uid]}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* =========================================================================
             GALLERY VIEW MODE (Sesuai Sketsa Ganjil/Genap)
             ========================================================================= */
          (() => {
            const totalParticipants = 1 + remoteUsers.length
            const isOddGreaterThanOne = totalParticipants % 2 !== 0 && totalParticipants > 1

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
                    const isSpeaking = speakingUsers[userNama]
                    const handRaised = isMyHandRaised

                    return (
                      <div key="local-user" className={wrapperClass}>
                        <div
                          className={`relative rounded-2xl sm:rounded-3xl bg-slate-900 border overflow-hidden shadow-xl flex items-center justify-center w-full transition-all duration-200 ${
                            isSpeaking
                              ? "ring-2 ring-emerald-400 border-emerald-400"
                              : "border-slate-800/80"
                          } ${
                            isLastOddItem ? "aspect-[21/9] sm:aspect-[24/9] max-h-[38vh]" : "aspect-video"
                          }`}
                        >
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

                          {/* Ikon Angkat Tangan */}
                          {handRaised && (
                            <div className="absolute top-3 left-3 bg-amber-500 text-black px-2 py-1 rounded-xl font-black text-[11px] flex items-center gap-1 shadow-lg animate-bounce">
                              <Hand className="w-3.5 h-3.5 fill-black" />
                              <span>Angkat Tangan</span>
                            </div>
                          )}

                          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-md">
                            <span>{userNama} (Saya)</span>
                            {isSpeaking ? (
                              <span className="flex items-center gap-1 text-emerald-400 font-extrabold text-[11px]">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                <Mic className="w-3.5 h-3.5" />
                              </span>
                            ) : !micOn ? (
                              <MicOff className="w-3.5 h-3.5 text-rose-400" />
                            ) : null}
                          </div>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div key={p.uid} className={wrapperClass}>
                      <RemoteUserVideoCard
                        user={p.user}
                        isSpeaking={speakingUsers[p.uid]}
                        isHandRaised={!!raisedHands[p.uid]}
                        isSpotlight={spotlightUser === p.uid}
                        isGuruHost={isGuru}
                        isFullSpan={isLastOddItem}
                        onMute={() => handleMuteMurid(p.uid)}
                        onAskUnmute={() => handleAskUnmuteMurid(p.uid)}
                        onSpotlight={() => handleSetSpotlight(p.uid)}
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
          <div className="absolute top-16 right-3 sm:right-6 bottom-24 z-40 w-72 sm:w-88 bg-slate-900/95 border border-slate-700/80 rounded-3xl p-4 shadow-2xl backdrop-blur-2xl flex flex-col justify-between animate-in fade-in zoom-in-95 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <span className="text-xs font-extrabold text-slate-200">
                  Daftar Peserta ({remoteUsers.length + 1})
                </span>
                {isGuru && (
                  <p className="text-[10px] text-slate-400">Kontrol penuh guru pengajar</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowParticipantList(false)}
                className="text-xs text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {/* Action Cepat Guru */}
            {isGuru && (
              <div className="grid grid-cols-2 gap-2 border-b border-slate-800 pb-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleMuteAllMurid}
                  className="text-[10px] font-bold h-8 border-slate-700 bg-slate-800 text-rose-300 hover:bg-rose-950/40"
                >
                  <VolumeX className="w-3 h-3 mr-1" />
                  Mute Semua
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleToggleScreenSharePermission}
                  className={`text-[10px] font-bold h-8 border-slate-700 ${
                    allowStudentScreenShare
                      ? "bg-indigo-600/30 text-indigo-300 border-indigo-500/40"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  <Monitor className="w-3 h-3 mr-1" />
                  {allowStudentScreenShare ? "Share: Murid ON" : "Share: Guru Saja"}
                </Button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
              {/* Saya */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 text-xs">
                <div className="min-w-0 pr-2">
                  <div className="font-bold text-slate-100 truncate">
                    {userNama} (Anda) {isGuru ? "(Host)" : ""}
                  </div>
                  {isMyHandRaised && (
                    <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                      <Hand className="w-3 h-3" /> Angkat tangan
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">
                  {micOn ? "Mic On" : "Muted"}
                </span>
              </div>

              {/* Teman / Murid */}
              {remoteUsers.map((u) => {
                const nama = u.uid
                const handRaised = !!raisedHands[nama]
                return (
                  <div
                    key={nama}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 text-xs gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-200 truncate">{nama}</div>
                      {handRaised && (
                        <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                          <Hand className="w-3 h-3" /> Angkat tangan
                        </span>
                      )}
                    </div>

                    {isGuru ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMuteMurid(nama)}
                          className="p-1 rounded bg-slate-700 hover:bg-amber-600 text-slate-300 hover:text-white"
                          title="Mute Peserta"
                        >
                          <VolumeX className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAskUnmuteMurid(nama)}
                          className="p-1 rounded bg-slate-700 hover:bg-emerald-600 text-slate-300 hover:text-white"
                          title="Minta Unmute"
                        >
                          <Mic className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetSpotlight(nama)}
                          className={`p-1 rounded ${
                            spotlightUser === nama
                              ? "bg-amber-600 text-white"
                              : "bg-slate-700 text-slate-300 hover:bg-amber-600 hover:text-white"
                          }`}
                          title="Spotlight Peserta"
                        >
                          <Pin className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleKickMurid(nama)}
                          className="p-1 rounded bg-slate-700 hover:bg-rose-600 text-slate-300 hover:text-white"
                          title="Keluarkan dari Meet"
                        >
                          <UserX className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {u.hasAudio ? "Mic On" : "Muted"}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Drawer Chat */}
        {showChat && (
          <MeetChatDrawer
            channelName={channelName}
            userNama={userNama}
            isGuru={isGuru}
            onClose={() => setShowChat(false)}
          />
        )}

        {/* =========================================================================
            FLOATING OVERLAY CONTROLS PILL ALA ZOOM MEETING
            ========================================================================= */}
        {!connecting && !errorMsg && (
          <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-[9999999] pointer-events-auto max-w-[95vw]">
            <div className="flex items-center gap-1.5 sm:gap-3 p-1.5 sm:p-2.5 px-3 sm:px-5 rounded-full bg-slate-900/90 hover:bg-slate-900/98 border border-white/15 shadow-2xl backdrop-blur-2xl transition-all ring-1 ring-black/40 relative">
              {/* Device Selector Popover Menu */}
              {showDeviceMenu && (
                <div className="absolute bottom-16 left-2 bg-slate-900 border border-slate-700 rounded-2xl p-3 shadow-2xl backdrop-blur-xl w-64 text-xs space-y-2.5 z-50 animate-in fade-in zoom-in-95">
                  <span className="font-extrabold text-[11px] text-slate-300 block border-b border-slate-800 pb-1">
                    Pilih Perangkat Cepat
                  </span>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400">Kamera:</span>
                    <select
                      onChange={(e) => handleSwitchCamera(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-[11px] text-slate-200"
                    >
                      {availableCams.map((c) => (
                        <option key={c.deviceId} value={c.deviceId}>
                          {c.label || "Kamera"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400">Mikrofon:</span>
                    <select
                      onChange={(e) => handleSwitchMic(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-[11px] text-slate-200"
                    >
                      {availableMics.map((m) => (
                        <option key={m.deviceId} value={m.deviceId}>
                          {m.label || "Mikrofon"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Mic Toggle + Switch Device */}
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`p-2.5 sm:p-3 rounded-l-full transition-all active:scale-95 shadow-md ${
                    micOn
                      ? "bg-white/10 hover:bg-white/20 text-white"
                      : "bg-rose-600 hover:bg-rose-700 text-white ring-2 ring-rose-400/50"
                  }`}
                  title={micOn ? "Matikan Mikrofon" : "Nyalakan Mikrofon"}
                >
                  {micOn ? <Mic className="w-4 h-4 sm:w-5 sm:h-5" /> : <MicOff className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeviceMenu(!showDeviceMenu)}
                  className="p-2.5 sm:p-3 rounded-r-full bg-white/10 hover:bg-white/20 border-l border-white/10 text-slate-300"
                  title="Ganti Perangkat"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Camera Toggle */}
              <button
                type="button"
                onClick={toggleCamera}
                className={`p-2.5 sm:p-3 rounded-full transition-all active:scale-95 shadow-md ${
                  cameraOn
                    ? "bg-white/10 hover:bg-white/20 text-white"
                    : "bg-rose-600 hover:bg-rose-700 text-white ring-2 ring-rose-400/50"
                }`}
                title={cameraOn ? "Matikan Kamera" : "Nyalakan Kamera"}
              >
                {cameraOn ? <Video className="w-4 h-4 sm:w-5 sm:h-5" /> : <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>

              {/* Screen Sharing Toggle */}
              <button
                type="button"
                onClick={toggleScreenShare}
                disabled={activeSharer && activeSharer !== userNama}
                className={`p-2.5 sm:p-3 rounded-full transition-all active:scale-95 shadow-md ${
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
                <Monitor className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {/* Angkat Tangan (Raise Hand) */}
              <button
                type="button"
                onClick={handleToggleRaiseHand}
                className={`p-2.5 sm:p-3 rounded-full transition-all active:scale-95 shadow-md ${
                  isMyHandRaised
                    ? "bg-amber-500 text-black ring-2 ring-amber-300 font-black animate-pulse"
                    : "bg-white/10 hover:bg-white/20 text-white"
                }`}
                title={isMyHandRaised ? "Turunkan Tangan" : "Angkat Tangan"}
              >
                <Hand className={`w-4 h-4 sm:w-5 sm:h-5 ${isMyHandRaised ? "fill-black" : ""}`} />
              </button>

              <div className="w-[1px] h-6 bg-white/15 my-auto mx-0.5" />

              {/* Leave Call Button */}
              <button
                type="button"
                onClick={leaveChannel}
                className="p-2.5 sm:p-3 px-3.5 sm:px-5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-600/30 transition-all active:scale-95"
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

function RemoteUserVideoCard({
  user,
  compact = false,
  isFullSpan = false,
  isSpeaking = false,
  isHandRaised = false,
  isSpotlight = false,
  isGuruHost = false,
  onMute,
  onAskUnmute,
  onSpotlight,
  onKick,
}) {
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
      className={`relative rounded-2xl bg-slate-900 border overflow-hidden shadow-xl flex items-center justify-center w-full group shrink-0 transition-all duration-200 ${
        isSpeaking
          ? "ring-2 ring-emerald-400 border-emerald-400"
          : isSpotlight
          ? "ring-2 ring-amber-400 border-amber-400"
          : "border-slate-800/80"
      } ${
        compact
          ? "h-full aspect-video"
          : isFullSpan
          ? "aspect-[21/9] sm:aspect-[24/9] max-h-[38vh]"
          : "aspect-video"
      }`}
    >
      <div
        ref={containerRef}
        className={`w-full h-full bg-black [&>div]:w-full [&>div]:h-full [&>div>video]:object-cover ${
          hasVideoTrack ? "block" : "hidden"
        }`}
      />

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

      {/* Badge Angkat Tangan */}
      {isHandRaised && (
        <div className="absolute top-2 left-2 bg-amber-500 text-black px-2 py-0.5 rounded-lg font-black text-[10px] flex items-center gap-1 shadow-md animate-bounce">
          <Hand className="w-3 h-3 fill-black" />
          <span>Tangan Terangkat</span>
        </div>
      )}

      {/* Label Nama Peserta & Indikator Suara */}
      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-xl text-[11px] font-bold text-white flex items-center gap-1.5 shadow-md">
        <span className="truncate max-w-[120px]">{displayName}</span>
        {isSpeaking ? (
          <span className="flex items-center gap-1 text-emerald-400 font-extrabold text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <Mic className="w-3 h-3" />
          </span>
        ) : !user.hasAudio ? (
          <MicOff className="w-3 h-3 text-rose-400" />
        ) : null}
      </div>

      {/* Host Action Hover Buttons */}
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
            onClick={onAskUnmute}
            className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px]"
            title="Minta Unmute"
          >
            <Mic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onSpotlight}
            className={`p-1 rounded-lg text-white text-[10px] ${
              isSpotlight ? "bg-amber-600" : "bg-slate-700 hover:bg-amber-600"
            }`}
            title="Spotlight Peserta"
          >
            <Pin className="w-3.5 h-3.5" />
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
