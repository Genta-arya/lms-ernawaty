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
  setSpotlightUser,
  updateScreenSharePermission,
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
  Volume2,
  VolumeX,
  MessageSquare,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Pin,
  Sparkles,
  Signal,
  Settings,
  ChevronUp,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
  UserCheck,
  Columns2,
  Rows3,
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
  const [allowStudentScreenShare, setAllowStudentScreenShare] = useState(false)
  const [spotlightUser, setSpotlightUserState] = useState(null)
  const [showParticipantList, setShowParticipantList] = useState(false)
  const [showChat, setShowChat] = useState(false)

  // View Mode: 'gallery' vs 'speaker'
  const [viewMode, setViewMode] = useState("gallery")
  const [pinnedUser, setPinnedUser] = useState(null)

  // Device switching state (Terpisah Audio Input & Audio Output)
  const [availableMics, setAvailableMics] = useState([])
  const [availableSpeakers, setAvailableSpeakers] = useState([])
  const [selectedMicId, setSelectedMicId] = useState(initialSettings?.selectedMicId || "")
  const [selectedSpeakerId, setSelectedSpeakerId] = useState(initialSettings?.selectedSpeakerId || "")
  const [showDeviceMenu, setShowDeviceMenu] = useState(false)
  const [testingSpeaker, setTestingSpeaker] = useState(false)

  const clientRef = useRef(null)
  const localTracksRef = useRef({ audioTrack: null, videoTrack: null })
  const screenTrackRef = useRef(null)
  const localVideoRef = useRef(null)
  const speakerViewVideoRef = useRef(null)
  const micOnRef = useRef(micOn)
  const activeSharerRef = useRef(activeSharer)
  const isScreenSharingRef = useRef(isScreenSharing)
  const lastProcessedMuteRef = useRef(Date.now() - 1000)
  const lastProcessedUnmuteAskRef = useRef(Date.now() - 1000)

  useEffect(() => {
    activeSharerRef.current = activeSharer
  }, [activeSharer])

  useEffect(() => {
    isScreenSharingRef.current = isScreenSharing
  }, [isScreenSharing])

  useEffect(() => {
    function handleBeforeUnload() {
      if (isScreenSharingRef.current || activeSharerRef.current === userNama) {
        setActiveScreenSharer(channelName, null).catch(() => { })
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [channelName, userNama])

  const presentationContainerRef = useRef(null)
  const [isFullscreenShare, setIsFullscreenShare] = useState(false)
  const [dismissRotateTip, setDismissRotateTip] = useState(false)
  const [shareScreenLayout, setShareScreenLayout] = useState("side-by-side") // 'side-by-side' | 'standard'

  // Zoom & Pan state untuk Berbagi Layar (Share Screen)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const touchDistanceRef = useRef(null)

  // Pop-up Notifikasi Peserta Bergabung & Alert Toast Share Screen
  const [joinedToast, setJoinedToast] = useState(null)
  const [screenShareToast, setScreenShareToast] = useState(null)
  const [showEndMeetModal, setShowEndMeetModal] = useState(false)
  const toastTimeoutRef = useRef(null)
  const screenShareToastTimeoutRef = useRef(null)
  const hasInitialJoinFinishedRef = useRef(false)

  // Suara lonceng lembut saat peserta bergabung
  function playJoinChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const now = ctx.currentTime

      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = "sine"
      osc1.frequency.setValueAtTime(523.25, now) // C5
      gain1.gain.setValueAtTime(0.08, now)
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.start(now)
      osc1.stop(now + 0.3)

      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = "sine"
      osc2.frequency.setValueAtTime(659.25, now + 0.12) // E5
      gain2.gain.setValueAtTime(0.08, now + 0.12)
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45)
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.start(now + 0.12)
      osc2.stop(now + 0.45)

      setTimeout(() => {
        try {
          ctx.close()
        } catch (_) { }
      }, 600)
    } catch (_) { }
  }

  function showJoinNotification(name) {
    playJoinChime()
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current)
    }
    setJoinedToast({ id: Date.now(), name })
    toastTimeoutRef.current = setTimeout(() => {
      setJoinedToast(null)
    }, 4500)
  }

  function handleZoomIn() {
    setZoomLevel((prev) => Math.min(3.5, Number((prev + 0.25).toFixed(2))))
  }

  function handleZoomOut() {
    setZoomLevel((prev) => {
      const next = Math.max(1, Number((prev - 0.25).toFixed(2)))
      if (next === 1) {
        setPanOffset({ x: 0, y: 0 })
      }
      return next
    })
  }

  function handleResetZoom() {
    setZoomLevel(1)
    setPanOffset({ x: 0, y: 0 })
  }

  function handleWheel(e) {
    if (e.ctrlKey || isFullscreenShare) {
      e.preventDefault()
      if (e.deltaY < 0) {
        handleZoomIn()
      } else if (e.deltaY > 0) {
        handleZoomOut()
      }
    }
  }

  function handleMouseDown(e) {
    if (zoomLevel > 1) {
      setIsDragging(true)
      isDraggingRef.current = true
      dragStartRef.current = {
        x: e.clientX - panOffset.x,
        y: e.clientY - panOffset.y,
      }
    }
  }

  function handleMouseMove(e) {
    if (isDraggingRef.current && zoomLevel > 1) {
      setPanOffset({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      })
    }
  }

  function handleMouseUp() {
    setIsDragging(false)
    isDraggingRef.current = false
  }

  function handleTouchStart(e) {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      touchDistanceRef.current = dist
    } else if (e.touches.length === 1 && zoomLevel > 1) {
      isDraggingRef.current = true
      dragStartRef.current = {
        x: e.touches[0].clientX - panOffset.x,
        y: e.touches[0].clientY - panOffset.y,
      }
    }
  }

  function handleTouchMove(e) {
    if (e.touches.length === 2 && touchDistanceRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      const factor = dist / touchDistanceRef.current
      touchDistanceRef.current = dist
      setZoomLevel((prev) => {
        const next = Math.max(1, Math.min(3.5, Number((prev * factor).toFixed(2))))
        if (next === 1) setPanOffset({ x: 0, y: 0 })
        return next
      })
    } else if (e.touches.length === 1 && isDraggingRef.current && zoomLevel > 1) {
      setPanOffset({
        x: e.touches[0].clientX - dragStartRef.current.x,
        y: e.touches[0].clientY - dragStartRef.current.y,
      })
    }
  }

  function handleTouchEnd(e) {
    if (e.touches.length < 2) {
      touchDistanceRef.current = null
    }
    if (e.touches.length === 0) {
      isDraggingRef.current = false
    }
  }

  // Reset zoom saat presentasi berhenti
  useEffect(() => {
    if (!activeSharer) {
      handleResetZoom()
    }
  }, [activeSharer])

  function toggleFullscreenShare() {
    if (!presentationContainerRef.current) return
    if (!document.fullscreenElement) {
      presentationContainerRef.current.requestFullscreen?.().catch(() => { })
      setIsFullscreenShare(true)
    } else {
      document.exitFullscreen?.().catch(() => { })
      setIsFullscreenShare(false)
    }
  }

  useEffect(() => {
    function onFsChange() {
      setIsFullscreenShare(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", onFsChange)
    return () => document.removeEventListener("fullscreenchange", onFsChange)
  }, [])

  useEffect(() => {
    micOnRef.current = micOn
  }, [micOn])

  // 1. Berlangganan kontrol realtime sesi meet
  useEffect(() => {
    if (!channelName) return
    const unsub = subscribeMeetControls(channelName, (controls) => {
      const currentActiveSharer = controls?.activeSharer || null
      setActiveSharer(currentActiveSharer)
      setAllowStudentScreenShare(!!controls?.allowStudentScreenShare)
      setSpotlightUserState(controls?.spotlightUser || null)

      // Deteksi jika Firestore mencatat diri saya sedang sharing padahal tidak
      if (isGuru && currentActiveSharer === userNama && !isScreenSharingRef.current) {
        console.log("Mereset activeSharer orphan di Firestore...")
        setActiveScreenSharer(channelName, null).catch(() => { })
        setActiveSharer(null)
      }

      // Cek apakah saya kena force kick
      const kickUntil = controls?.kickedUsers?.[userNama]
      if (!isGuru && kickUntil && Date.now() < kickUntil) {
        alert("Anda dikeluarkan dari sesi meet oleh guru pengajar. Anda dapat bergabung kembali setelah beberapa saat.")
        leaveChannel()
        return
      }

      // Cek force mute satu orang
      if (!isGuru && controls?.lastMutedUser?.user === userNama) {
        const muteTs = controls.lastMutedUser.at || 0
        if (muteTs > lastProcessedMuteRef.current) {
          lastProcessedMuteRef.current = muteTs
          if (localTracksRef.current.audioTrack && micOnRef.current) {
            localTracksRef.current.audioTrack.setMuted(true)
            setMicOn(false)
          }
        }
      }

      // Cek force mute all trigger
      if (!isGuru && controls?.muteAllTrigger) {
        if (controls.muteAllTrigger > lastProcessedMuteRef.current) {
          lastProcessedMuteRef.current = controls.muteAllTrigger
          if (localTracksRef.current.audioTrack && micOnRef.current) {
            localTracksRef.current.audioTrack.setMuted(true)
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
              localTracksRef.current.audioTrack.setMuted(false)
              setMicOn(true)
            }
          }
        }
      }
    })
    return () => unsub()
  }, [channelName, userNama, isGuru])

  // 2. Setup Agora Call
  useEffect(() => {
    let mounted = true
    document.body.style.overflow = "hidden"

    AgoraRTC.onAudioAutoplayFailed = () => {
      console.warn("Audio autoplay blocked by browser.")
    }

    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" })
    clientRef.current = client

    // Deteksi perangkat audio input dan audio output
    AgoraRTC.getDevices().then((devs) => {
      if (mounted) {
        const mics = devs.filter((d) => d.kind === "audioinput")
        const spks = devs.filter((d) => d.kind === "audiooutput")
        setAvailableMics(mics)
        setAvailableSpeakers(spks)
        if (!selectedMicId && mics.length > 0) setSelectedMicId(mics[0].deviceId)
        if (!selectedSpeakerId && spks.length > 0) setSelectedSpeakerId(spks[0].deviceId)
      }
    })

    client.on("user-joined", (user) => {
      if (hasInitialJoinFinishedRef.current) {
        const nama =
          typeof user.uid === "string" && isNaN(Number(user.uid))
            ? user.uid
            : `Peserta #${String(user.uid).slice(-4)}`
        showJoinNotification(nama)
      }
      setRemoteUsers((prev) => {
        if (!prev.find((u) => u.uid === user.uid)) {
          return [
            ...prev,
            {
              uid: user.uid,
              rawUser: user,
              videoTrack: user.videoTrack,
              audioTrack: user.audioTrack,
              hasAudio: user.hasAudio,
              hasVideo: user.hasVideo,
              version: Date.now(),
            },
          ]
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

      if (mediaType === "audio") {
        try {
          if (selectedSpeakerId && user.audioTrack?.setPlaybackDevice) {
            user.audioTrack.setPlaybackDevice(selectedSpeakerId).catch(() => { })
          }
          user.audioTrack?.play()
        } catch (aErr) {
          console.warn("Gagal memutar remote audio track:", aErr)
        }
      }

      setRemoteUsers((prev) => {
        const filtered = prev.filter((u) => u.uid !== user.uid)
        return [
          ...filtered,
          {
            uid: user.uid,
            rawUser: user,
            videoTrack: user.videoTrack,
            audioTrack: user.audioTrack,
            hasAudio: user.hasAudio,
            hasVideo: user.hasVideo,
            version: Date.now(),
          },
        ]
      })
    })

    client.on("user-unpublished", (user, mediaType) => {
      if (mediaType === "video" && user.uid === activeSharerRef.current) {
        console.log("Sharer menghentikan publish video:", user.uid)
        setActiveSharer(null)
        handleResetZoom()
        if (isGuru || user.uid === userNama) {
          setActiveScreenSharer(channelName, null).catch(() => { })
        }
      }
      setRemoteUsers((prev) => {
        const filtered = prev.filter((u) => u.uid !== user.uid)
        return [
          ...filtered,
          {
            uid: user.uid,
            rawUser: user,
            videoTrack: user.videoTrack,
            audioTrack: user.audioTrack,
            hasAudio: user.hasAudio,
            hasVideo: user.hasVideo,
            version: Date.now(),
          },
        ]
      })
    })

    client.on("volume-indicator", (volumes) => {
      const activeMap = {}
      volumes.forEach((v) => {
        if (v.level > 5) {
          const uid = v.uid === 0 || v.uid === "0" ? userNama : v.uid
          activeMap[uid] = true
        }
      })
      setSpeakingUsers(activeMap)
    })

    // Network quality
    client.on("network-quality", (stats) => {
      setNetworkQuality(stats.downlinkNetworkQuality || stats.uplinkNetworkQuality || 1)
    })

    client.on("user-left", (user) => {
      if (user.uid === activeSharerRef.current) {
        console.log("Sharer keluar dari Agora channel:", user.uid)
        setActiveSharer(null)
        handleResetZoom()
        setActiveScreenSharer(channelName, null).catch(() => { })
      }
      setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid))
    })

    async function initCall() {
      try {
        setConnecting(true)
        try {
          client.enableAudioVolumeIndicator()
        } catch (_) { }

        const tokenData = await fetchAgoraToken(channelName, userNama)
        const appId = tokenData.appId || "5960c48ec498439798df7c0d1249ae4d"
        const token = tokenData.token

        await client.join(appId, channelName, token, userNama)

        let audioTrack = null
        let videoTrack = null

        // Mikrofon
        try {
          audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
            microphoneId: initialSettings?.selectedMicId || undefined,
          })
          localTracksRef.current.audioTrack = audioTrack
        } catch (mErr) {
          console.warn("Mikrofon tidak aktif:", mErr)
          setMicOn(false)
        }

        // Kamera Video - Terkunci ke kamera depan (facingMode: "user")
        try {
          videoTrack = await AgoraRTC.createCameraVideoTrack({
            encoderConfig: "480p_1",
            facingMode: "user",
            cameraId: initialSettings?.selectedCamId || undefined,
          })
          localTracksRef.current.videoTrack = videoTrack
          if (localVideoRef.current && cameraOn) {
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

        // Mute setelah dipublish agar WebRTC transceiver aktif terpasang
        if (audioTrack && !micOn) {
          try {
            await audioTrack.setMuted(true)
          } catch (e) {
            console.warn("Gagal set initial audio mute:", e)
          }
        }
        if (videoTrack && !cameraOn) {
          try {
            await videoTrack.setMuted(true)
          } catch (e) {
            console.warn("Gagal set initial video mute:", e)
          }
        }

        if (mounted) {
          setJoined(true)
          setConnecting(false)
          // Beri jeda 2.5 detik agar peserta yang sudah ada di room tidak memicu notifikasi beruntun saat baru masuk
          setTimeout(() => {
            if (mounted) {
              hasInitialJoinFinishedRef.current = true
            }
          }, 2500)
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

  // Pastikan video lokal selalu terputar di thumbnail & gallery
  useEffect(() => {
    const vTrack = localTracksRef.current?.videoTrack
    if (vTrack && localVideoRef.current && cameraOn && !isScreenSharing) {
      try {
        localVideoRef.current.innerHTML = ""
        vTrack.play(localVideoRef.current)
      } catch (e) {
        console.warn("Local video play error:", e)
      }
    }
  }, [cameraOn, isScreenSharing, joined, activeSharer, viewMode])

  // Play video di Speaker View jika aktif (fit cover proporsional)
  useEffect(() => {
    if (viewMode === "speaker" && speakerViewVideoRef.current) {
      const activeSpeakerUid = spotlightUser || pinnedUser || Object.keys(speakingUsers)[0] || userNama
      if (activeSpeakerUid === userNama) {
        const vTrack = localTracksRef.current?.videoTrack
        if (vTrack && cameraOn) {
          try {
            speakerViewVideoRef.current.innerHTML = ""
            vTrack.play(speakerViewVideoRef.current, { fit: "cover" })
          } catch (e) {
            console.warn("Speaker view local play error:", e)
          }
        }
      } else if (activeSpeakerUid) {
        const sUser = remoteUsers.find((u) => u.uid === activeSpeakerUid)
        if (sUser?.videoTrack) {
          try {
            speakerViewVideoRef.current.innerHTML = ""
            sUser.videoTrack.play(speakerViewVideoRef.current, { fit: "cover" })
          } catch (e) {
            console.warn("Speaker view remote play error:", e)
          }
        }
      }
    }
  }, [viewMode, spotlightUser, pinnedUser, speakingUsers, remoteUsers, userNama, cameraOn])

  async function leaveChannel(endOption = null) {
    try {
      if (isScreenSharingRef.current || activeSharerRef.current === userNama) {
        await setActiveScreenSharer(channelName, null).catch(() => { })
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
      setShowEndMeetModal(false)
      if (onLeave) onLeave(endOption)
    }
  }

  function handleLeaveClick() {
    if (isGuru) {
      setShowEndMeetModal(true)
    } else {
      leaveChannel()
    }
  }

  // Toggle Mute Mikrofon
  async function toggleMic() {
    const { audioTrack } = localTracksRef.current
    if (audioTrack) {
      try {
        if (micOn) {
          await audioTrack.setMuted(true)
          setMicOn(false)
        } else {
          await audioTrack.setMuted(false)
          setMicOn(true)
        }
      } catch (err) {
        console.warn("Gagal toggle mic:", err)
      }
    }
  }

  // Toggle Kamera Video
  async function toggleCamera() {
    const { videoTrack } = localTracksRef.current
    if (videoTrack) {
      try {
        if (cameraOn) {
          await videoTrack.setMuted(true)
          setCameraOn(false)
        } else {
          await videoTrack.setMuted(false)
          setCameraOn(true)
          if (localVideoRef.current) {
            localVideoRef.current.innerHTML = ""
            videoTrack.play(localVideoRef.current)
          }
        }
      } catch (err) {
        console.warn("Gagal toggle camera:", err)
      }
    }
  }

  // Switch Perangkat Mic (Audio Input)
  async function handleSwitchMic(deviceId) {
    setSelectedMicId(deviceId)
    if (localTracksRef.current?.audioTrack) {
      try {
        await localTracksRef.current.audioTrack.setDevice(deviceId)
      } catch (err) {
        console.warn("Gagal switch mic device:", err)
      }
    }
  }

  // Switch Perangkat Speaker (Audio Output)
  async function handleSwitchSpeaker(deviceId) {
    setSelectedSpeakerId(deviceId)
    remoteUsers.forEach((u) => {
      try {
        u.audioTrack?.setPlaybackDevice?.(deviceId)
      } catch (err) {
        console.warn("Gagal set playback device speaker:", err)
      }
    })
  }

  // Uji Suara Speaker di dalam Meet Room
  function handleTestSpeaker() {
    if (testingSpeaker) return
    setTestingSpeaker(true)
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = "sine"
    osc.frequency.setValueAtTime(587.33, ctx.currentTime)
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15)

    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.5)

    setTimeout(() => {
      setTestingSpeaker(false)
      ctx.close()
    }, 600)
  }

  // Toggle Berbagi Layar (Screen Sharing - Kompatibel Browser HP & Desktop)
  async function toggleScreenShare() {
    if (!isGuru && !allowStudentScreenShare) {
      alert("Berbagi layar oleh murid belum diizinkan oleh guru pengajar.")
      return
    }
    const client = clientRef.current
    if (!client) return

    if (activeSharer && activeSharer !== userNama) {
      alert(`Peserta "${activeSharer}" sedang berbagi layar. Mohon tunggu giliran.`)
      return
    }

    if (!isScreenSharing) {
      // 1. Pengecekan kapabilitas browser (termasuk deteksi browser mobile / in-app)
      const hasGetDisplayMedia =
        (typeof navigator !== "undefined" && navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === "function") ||
        (typeof navigator !== "undefined" && typeof navigator.getDisplayMedia === "function")

      function triggerScreenShareNotice(title, desc) {
        if (screenShareToastTimeoutRef.current) {
          clearTimeout(screenShareToastTimeoutRef.current)
        }
        setScreenShareToast({ id: Date.now(), title, desc })
        screenShareToastTimeoutRef.current = setTimeout(() => {
          setScreenShareToast(null)
        }, 9000)
      }

      if (!hasGetDisplayMedia) {
        triggerScreenShareNotice(
          "Berbagi Layar di HP Dibatasi Browser",
          "Google Chrome di Android & Safari di iOS tidak mengizinkan rekaman layar website demi keamanan sistem. Silakan buka dari Laptop/Komputer untuk melakukan presentasi."
        )
        return
      }

      try {
        let screenTrack = null

        // Coba lewat AgoraRTC SDK terlebih dahulu
        try {
          screenTrack = await AgoraRTC.createScreenVideoTrack(
            {
              encoderConfig: "720p_2",
              optimizationMode: "detail",
            },
            "disable"
          )
        } catch (agoraErr) {
          console.warn("AgoraRTC.createScreenVideoTrack gagal, mencoba fallback standar WebRTC:", agoraErr)
          // Fallback langsung menggunakan native mediaDevices.getDisplayMedia jika Agora wrapper menolak di mobile
          if (navigator.mediaDevices?.getDisplayMedia) {
            const mediaStream = await navigator.mediaDevices.getDisplayMedia({
              video: {
                cursor: "always",
                frameRate: { max: 15, ideal: 10 },
              },
              audio: false,
            })
            const videoTrack = mediaStream.getVideoTracks()[0]
            if (videoTrack) {
              screenTrack = AgoraRTC.createCustomVideoTrack({
                mediaStreamTrack: videoTrack,
              })
            } else {
              throw agoraErr
            }
          } else {
            throw agoraErr
          }
        }

        if (!screenTrack) {
          throw new Error("Track layar tidak dapat diinisialisasi.")
        }

        screenTrackRef.current = screenTrack

        // Unpublish sementara video kamera agar bandwidth fokus ke presentasi
        if (localTracksRef.current.videoTrack) {
          try {
            await client.unpublish(localTracksRef.current.videoTrack)
          } catch (_) { }
        }

        await client.publish(screenTrack)
        await setActiveScreenSharer(channelName, userNama)

        // Tangani saat pengguna menekan tombol bawaan "Stop sharing" di notifikasi sistem HP/PC
        const handleTrackEnded = async () => {
          await stopScreenSharing()
        }

        if (screenTrack.on) {
          screenTrack.on("track-ended", handleTrackEnded)
        }
        if (screenTrack.getMediaStreamTrack) {
          const rawTrack = screenTrack.getMediaStreamTrack()
          if (rawTrack) {
            rawTrack.onended = handleTrackEnded
          }
        }

        setIsScreenSharing(true)
      } catch (err) {
        console.warn("Batal berbagi layar atau ditolak:", err)
        if (err.name === "NotAllowedError" || err.message?.includes("Permission denied")) {
          // Pengguna sengaja membatalkan dialog izin
          return
        }
        triggerScreenShareNotice(
          "Peramban Tidak Mendukung Screen Share",
          "Browser di perangkat ini membatasi tangkapan layar. Buka LMS di Laptop/PC dengan Chrome untuk berbagi layar."
        )
      }
    } else {
      await stopScreenSharing()
    }
  }

  async function stopScreenSharing() {
    const client = clientRef.current
    if (screenTrackRef.current && client) {
      try {
        await client.unpublish(screenTrackRef.current)
      } catch (_) { }
      screenTrackRef.current.stop()
      screenTrackRef.current.close()
      screenTrackRef.current = null
      await setActiveScreenSharer(channelName, null)

      if (localTracksRef.current.videoTrack) {
        try {
          await client.publish(localTracksRef.current.videoTrack)
          if (!cameraOn) {
            await localTracksRef.current.videoTrack.setMuted(true)
          }
        } catch (_) { }
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

  // Guru set spotlight
  async function handleSetSpotlight(nama) {
    if (!isGuru) return
    await setSpotlightUser(channelName, spotlightUser === nama ? null : nama)
  }

  // Cek apakah ada yang sedang share screen:
  // Aktif jika diri sendiri sedang sharing, ATAU Firestore mencatat activeSharer, ATAU ada remote user yang publish video track
  const isSomeoneSharing =
    (activeSharer === userNama && isScreenSharing) ||
    (!!activeSharer && (remoteUsers.length === 0 || remoteUsers.some((u) => String(u.uid) === String(activeSharer) || u.hasVideo)))

  // Siapa pembicara aktif di Speaker View
  const currentSpeakerUid =
    spotlightUser ||
    pinnedUser ||
    Object.keys(speakingUsers)[0] ||
    userNama

  return createPortal(
    <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 z-[999999] bg-slate-950 flex flex-col text-white w-full h-[100dvh] max-h-[100dvh] overflow-hidden animate-in fade-in duration-200 select-none">
      {/* Pop-up Notifikasi Peserta Baru Bergabung */}
      {joinedToast && (
        <div className="fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 z-[9999999] pointer-events-auto animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-slate-900/95 border border-emerald-500/40 text-white px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-3 ring-1 ring-emerald-500/20 max-w-[90vw]">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <div className="min-w-0 pr-1">
              <div className="text-[11px] sm:text-xs font-extrabold text-slate-100 flex items-center gap-1.5">
                <span className="truncate max-w-[170px] sm:max-w-xs">{joinedToast.name}</span>
                <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-400">bergabung</span>
              </div>
              <p className="text-[9px] sm:text-[10px] text-slate-400">Peserta baru telah masuk ke ruang meet</p>
            </div>
            <button
              type="button"
              onClick={() => setJoinedToast(null)}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="Tutup"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Pop-up Edukasi/Toast Share Screen Mobile */}
      {screenShareToast && (
        <div className="fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 z-[9999999] pointer-events-auto animate-in fade-in slide-in-from-top-4 duration-300 w-[92vw] max-w-md">
          <div className="bg-slate-900/98 border border-amber-500/40 text-white p-3.5 sm:p-4 rounded-2xl shadow-2xl backdrop-blur-xl flex items-start gap-3 ring-1 ring-amber-500/20">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <Monitor className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="text-xs font-extrabold text-amber-300 flex items-center gap-1.5">
                <span>{screenShareToast.title}</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {screenShareToast.desc}
              </p>
              <div className="pt-1 flex items-center gap-2">
                <span className="text-[10px] font-bold text-sky-400 bg-sky-950/40 px-2 py-0.5 rounded-md border border-sky-600/30">
                  💡 Tips: Gunakan Laptop/PC
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setScreenShareToast(null)}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors shrink-0"
              title="Tutup"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
      {/* Modal Dialog Konfirmasi Akhiri / Keluar Sesi Meet (Ala Zoom) */}
      {showEndMeetModal && (
        <div className="fixed inset-0 z-[99999999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700/80 p-5 sm:p-6 shadow-2xl text-white space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <PhoneOff className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-100 tracking-tight">
                  {isGuru ? "Akhiri Sesi Tatap Muka?" : "Keluar Dari Sesi Meet?"}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isGuru
                    ? "Sebagai guru host, Anda dapat mengakhiri sesi untuk semua murid atau keluar sementara."
                    : "Apakah Anda ingin meninggalkan ruang tatap muka ini sekarang?"}
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              {isGuru ? (
                <>
                  {/* Opsi 1: Akhiri Sesi untuk Semua (Status Selesai) */}
                  <Button
                    type="button"
                    onClick={() => leaveChannel("selesai")}
                    className="w-full h-10 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-900/30 flex items-center justify-center gap-2"
                  >
                    <span>Ya, Akhiri Sesi untuk Semua</span>
                  </Button>

                  {/* Opsi 2: Hanya Tinggalkan Sesi Sementara */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => leaveChannel("tinggalkan")}
                    className="w-full h-10 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 flex items-center justify-center gap-2"
                  >
                    <span>Hanya Tinggalkan (Sesi Tetap Aktif)</span>
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  onClick={() => leaveChannel("tinggalkan")}
                  className="w-full h-10 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-900/30 flex items-center justify-center gap-2"
                >
                  <span>Ya, Keluar dari Meet</span>
                </Button>
              )}

              {/* Opsi 3: Batal / Jangan */}
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowEndMeetModal(false)}
                className="w-full h-9 text-xs font-semibold rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60"
              >
                <span>Jangan (Kembali ke Meet)</span>
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Top Bar Header Responsif ala Zoom */}
      <div className="h-14 sm:h-16 px-2.5 sm:px-4 py-2 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-2 sm:gap-3 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-md shrink-0">
            <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="font-extrabold text-xs sm:text-sm text-slate-100 truncate max-w-[130px] sm:max-w-xs md:max-w-md">
              {judulSesi}
            </h2>
            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-400">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="font-bold text-emerald-400 hidden sm:inline">Meet LSM</span>
              <span className="hidden sm:inline">&bull;</span>
              <span>{remoteUsers.length + 1} Peserta</span>
            </div>
          </div>
        </div>

        {/* Info & Action Zoom Bar Atas */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Sinyal Jaringan */}
          <div
            className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-xl bg-slate-800 border border-slate-700 text-[10px] font-bold"
            title={`Kualitas Jaringan: ${networkQuality <= 2 ? "Bagus" : networkQuality === 3 ? "Sedang" : "Buruk"}`}
          >
            <Signal
              className={`w-3.5 h-3.5 ${networkQuality <= 2
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

          {/* Switcher Mode Tampilan: (Standar vs Side-by-Side jika Share Screen, atau Gallery vs Speaker jika Meet biasa) */}
          {isSomeoneSharing ? (
            <div className="flex items-center bg-slate-800/90 rounded-xl p-0.5 border border-slate-700 shadow-sm shrink-0">
              <button
                type="button"
                onClick={() => setShareScreenLayout("standard")}
                className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${shareScreenLayout === "standard"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                  }`}
                title="Tampilan Standar (Presentasi di atas, peserta di bawah)"
              >
                <Rows3 className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[11px] hidden sm:inline">Standar</span>
              </button>
              <button
                type="button"
                onClick={() => setShareScreenLayout("side-by-side")}
                className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${shareScreenLayout === "side-by-side"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                  }`}
                title="Tampilan Side-by-Side (Presentasi di kiri, peserta di kanan)"
              >
                <Columns2 className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[11px] hidden sm:inline">Side-by-Side</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center bg-slate-800/90 rounded-xl p-0.5 border border-slate-700 shadow-sm shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("gallery")}
                className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${viewMode === "gallery"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                  }`}
                title="Tampilan Kisi (Gallery View)"
              >
                <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[11px] hidden sm:inline">Gallery</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("speaker")}
                className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${viewMode === "speaker"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                  }`}
                title="Tampilan Pembicara (Speaker View)"
              >
                <Maximize2 className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[11px] hidden sm:inline">Speaker</span>
              </button>
            </div>
          )}

          {/* Tombol Chat */}
          <button
            type="button"
            onClick={() => {
              setShowChat(!showChat)
              if (showParticipantList) setShowParticipantList(false)
            }}
            className={`w-8 h-8 sm:w-auto p-1 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${showChat
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
              }`}
            title="Chat Kelas"
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span className="text-[11px] hidden sm:inline">Chat</span>
          </button>

          {/* Tombol Panel Peserta */}
          <button
            type="button"
            onClick={() => {
              setShowParticipantList(!showParticipantList)
              if (showChat) setShowChat(false)
            }}
            className={`w-8 h-8 sm:w-auto p-1 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all relative ${showParticipantList
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
              }`}
            title="Kelola Peserta"
          >
            <Users className="w-4 h-4 shrink-0" />
            <span className="text-[11px] hidden sm:inline">{remoteUsers.length + 1}</span>
          </button>
        </div>
      </div>

      {/* Main Video Stage Area */}
      <div className="relative flex-1 min-h-0 w-full overflow-hidden flex flex-col">
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
             ZOOM SCREEN SHARE MODE (STANDAR vs SIDE-BY-SIDE ALA ZOOM)
             ========================================================================= */
          (() => {
            const renderPresentationCard = (extraClass = "") => (
              <div
                ref={presentationContainerRef}
                className={`relative rounded-xl sm:rounded-2xl bg-black border border-slate-800/80 overflow-hidden shadow-2xl flex items-center justify-center min-h-0 ${extraClass}`}
              >
                {/* Zoom & Pan Wrapper */}
                <div
                  className="w-full h-full overflow-hidden relative flex items-center justify-center select-none"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onWheel={handleWheel}
                >
                  <div
                    className={`w-full h-full flex items-center justify-center ${zoomLevel > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : ""
                      }`}
                    style={{
                      transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
                      transformOrigin: "center center",
                      transition: isDragging || touchDistanceRef.current ? "none" : "transform 0.15s ease-out",
                    }}
                  >
                    {activeSharer === userNama ? (
                      <LocalScreenShareView screenTrack={screenTrackRef.current} />
                    ) : (
                      <RemoteScreenShareView
                        sharerUser={remoteUsers.find((u) => u.uid === activeSharer)}
                      />
                    )}
                  </div>
                </div>

                {/* Badge info presenter */}
                <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 bg-black/75 backdrop-blur-md px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold text-emerald-400 flex items-center gap-1.5 sm:gap-2 border border-emerald-500/30 z-10">
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Presentasi: {activeSharer === userNama ? "Layar Anda" : activeSharer}</span>
                </div>

                {/* Indikator Mode Zoom Aktif */}
                {zoomLevel > 1 && (
                  <div className="absolute top-11 sm:top-12 left-2.5 sm:left-3 bg-black/80 backdrop-blur-md px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[9px] sm:text-[10px] text-emerald-300 font-bold border border-emerald-500/30 shadow-lg z-10 animate-in fade-in">
                    Mode Zoom Aktif • Geser layar untuk menjelajah
                  </div>
                )}

                {/* Action Buttons: Fullscreen & Toggle Layout & Stop Share */}
                <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 flex items-center gap-1.5 z-10">
                  {/* Tombol Toggle Layout Samping vs Bawah */}
                  <button
                    type="button"
                    onClick={() => setShareScreenLayout(shareScreenLayout === "standard" ? "side-by-side" : "standard")}
                    className="bg-black/75 hover:bg-black/90 text-white px-2 py-1.5 rounded-xl text-xs font-bold border border-white/20 backdrop-blur-md shadow-md active:scale-95 transition-all flex items-center gap-1.5"
                    title={shareScreenLayout === "standard" ? "Ganti ke Tampilan Samping (Side-by-Side)" : "Ganti ke Tampilan Standar (Bawah)"}
                  >
                    {shareScreenLayout === "standard" ? (
                      <>
                        <Columns2 className="w-3.5 h-3.5 text-blue-400" />
                        <span className="hidden lg:inline text-[10px]">Side-by-Side</span>
                      </>
                    ) : (
                      <>
                        <Rows3 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="hidden lg:inline text-[10px]">Standar</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={toggleFullscreenShare}
                    className="bg-black/70 hover:bg-black/90 text-white p-1.5 rounded-xl text-xs font-bold border border-white/20 backdrop-blur-md shadow-md active:scale-95 transition-all"
                    title={isFullscreenShare ? "Keluar Layar Penuh" : "Layar Penuh"}
                  >
                    {isFullscreenShare ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </button>
                  {isGuru && activeSharer !== userNama && (
                    <button
                      type="button"
                      onClick={handleHentikanShareScreenMurid}
                      className="bg-rose-600/90 hover:bg-rose-600 text-white px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-bold flex items-center gap-1 shadow-lg active:scale-95 transition-all"
                    >
                      <MonitorOff className="w-3.5 h-3.5" />
                      <span>Hentikan</span>
                    </button>
                  )}
                </div>

                {/* Kontrol Zoom In / Zoom Out saat Presentasi & Layar Penuh */}
                <div className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 flex items-center gap-1 bg-black/80 backdrop-blur-md p-1 sm:p-1.5 rounded-xl border border-white/20 shadow-2xl z-20">
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    disabled={zoomLevel <= 1}
                    className="p-1 sm:p-1.5 rounded-lg text-white hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent transition-all active:scale-95"
                    title="Zoom Out (-)"
                  >
                    <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleResetZoom}
                    className={`px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-mono font-bold transition-all ${zoomLevel > 1 ? "bg-emerald-500/25 text-emerald-400 hover:bg-emerald-500/35" : "text-slate-300"
                      }`}
                    title="Klik untuk reset zoom (100%)"
                  >
                    {Math.round(zoomLevel * 100)}%
                  </button>
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    disabled={zoomLevel >= 3.5}
                    className="p-1 sm:p-1.5 rounded-lg text-white hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent transition-all active:scale-95"
                    title="Zoom In (+)"
                  >
                    <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>

                {/* Petunjuk Rotasi Mobile (Bisa di-close siswa) */}
                {!dismissRotateTip && zoomLevel <= 1 && (
                  <div className="flex sm:hidden absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/85 backdrop-blur-md pl-2.5 pr-1.5 py-1 rounded-full border border-white/15 text-[10px] text-slate-200 items-center gap-1.5 shadow-xl z-20 animate-in fade-in slide-in-from-bottom-2">
                    <RotateCcw className="w-3 h-3 text-blue-400 shrink-0" />
                    <span className="truncate max-w-[200px]">Bisa putar HP untuk layar penuh</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDismissRotateTip(true)
                      }}
                      className="p-0.5 hover:bg-white/20 rounded-full text-slate-400 hover:text-white transition-all ml-0.5 active:scale-95"
                      title="Tutup petunjuk"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )

            if (shareScreenLayout === "side-by-side") {
              return (
                /* --- MODE 2: SIDE-BY-SIDE ALA ZOOM (Presentasi di Kiri, Peserta Grid Col 1 di Kanan) --- */
                <div className="flex-1 w-full h-full overflow-hidden p-2 sm:p-3 flex flex-col md:flex-row gap-2.5 sm:gap-3.5 min-h-0">
                  {/* Sisi Kiri: Layar Presentasi Utama */}
                  <div className="flex-1 min-w-0 h-full flex flex-col justify-center items-center">
                    {renderPresentationCard("w-full h-full aspect-video md:aspect-auto max-h-[50vh] md:max-h-full")}
                  </div>

                  {/* Sisi Kanan: Kotak Peserta Grid Col 1 ke Bawah (Scrollable ala Zoom) */}
                  <div className="w-full md:w-64 lg:w-72 xl:w-80 shrink-0 flex flex-col min-h-0 md:h-full md:border-l md:border-slate-800/80 md:pl-3">
                    <div className="flex items-center justify-between pb-2 px-1 shrink-0">
                      <span className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-400" />
                        <span>Peserta ({remoteUsers.length + 1})</span>
                      </span>
                      <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 rounded-md">
                        Side-by-Side
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y pr-1 space-y-2.5 custom-scrollbar min-h-0 max-h-[42vh] md:max-h-none">
                      <div className="grid grid-cols-1 gap-2.5">
                        {/* Thumbnail Saya */}
                        <LocalUserVideoCard
                          localTrack={localTracksRef.current?.videoTrack}
                          cameraOn={cameraOn}
                          micOn={micOn}
                          userNama={userNama}
                          isScreenSharing={isScreenSharing}
                          isGuru={isGuru}
                          isSpotlight={spotlightUser === userNama}
                          onSpotlight={() => handleSetSpotlight(userNama)}
                          compact={false}
                          aspectClass="aspect-video"
                        />

                        {/* Thumbnail Peserta Lain - Berjajar ke bawah col 1 & scrollable */}
                        {remoteUsers.map((u) => {
                          const isSharer = u.uid === activeSharer
                          if (isSharer) {
                            return (
                              <div
                                key={u.uid}
                                className="relative rounded-xl sm:rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-md w-full aspect-video shrink-0 flex items-center justify-center"
                              >
                                <div className="flex flex-col items-center justify-center p-2 text-center text-slate-400 space-y-1">
                                  <Monitor className="w-5 h-5 text-emerald-400 animate-pulse" />
                                  <span className="text-[10px] font-bold text-slate-300 truncate max-w-[140px]">
                                    {u.uid}
                                  </span>
                                  <span className="text-[8px] text-emerald-400 font-semibold">Berbagi Layar</span>
                                </div>
                              </div>
                            )
                          }

                          return (
                            <RemoteUserVideoCard
                              key={u.uid}
                              user={u}
                              compact={false}
                              aspectClass="aspect-video"
                              isSpeaking={speakingUsers[u.uid]}
                              isSpotlight={spotlightUser === u.uid}
                              isGuruHost={isGuru}
                              onMute={() => handleMuteMurid(u.uid)}
                              onAskUnmute={() => handleAskUnmuteMurid(u.uid)}
                              onSpotlight={() => handleSetSpotlight(u.uid)}
                              onKick={() => handleKickMurid(u.uid)}
                            />
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )
            }

            return (
              /* --- MODE 1: STANDAR (Presentasi di Atas, Strip Peserta di Bawah) --- */
              <div className="flex-1 w-full overflow-y-auto overscroll-contain touch-pan-y no-scrollbar p-2 sm:p-4 flex flex-col gap-2 sm:gap-3 min-h-0">
                {/* Layar Utama Presentasi */}
                {renderPresentationCard("w-full max-w-5xl mx-auto aspect-video max-h-[60vh] sm:max-h-none sm:aspect-auto sm:flex-1")}

                {/* Strip Thumbnail Bawah (Peserta Kelas) */}
                <div className="w-full max-w-5xl mx-auto shrink-0 flex flex-col space-y-1.5 pb-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400">
                      Peserta Kelas ({remoteUsers.length + 1})
                    </span>
                  </div>
                  <div className="h-20 sm:h-28 flex items-center gap-2 overflow-x-auto pb-1 shrink-0 no-scrollbar touch-pan-x">
                    {/* Thumbnail Saya */}
                    <div className="h-full aspect-video shrink-0">
                      <LocalUserVideoCard
                        localTrack={localTracksRef.current?.videoTrack}
                        cameraOn={cameraOn}
                        micOn={micOn}
                        userNama={userNama}
                        isScreenSharing={isScreenSharing}
                        isGuru={isGuru}
                        isSpotlight={spotlightUser === userNama}
                        onSpotlight={() => handleSetSpotlight(userNama)}
                        compact={true}
                      />
                    </div>

                    {/* Thumbnail Peserta Lain */}
                    {remoteUsers.map((u) => {
                      const isSharer = u.uid === activeSharer
                      if (isSharer) {
                        return (
                          <div
                            key={u.uid}
                            className="relative rounded-xl sm:rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-md h-full aspect-video shrink-0 flex items-center justify-center"
                          >
                            <div className="flex flex-col items-center justify-center p-2 text-center text-slate-400 space-y-1">
                              <Monitor className="w-5 h-5 text-emerald-400 animate-pulse" />
                              <span className="text-[10px] font-bold text-slate-300 truncate max-w-[90px]">
                                {u.uid}
                              </span>
                              <span className="text-[8px] text-emerald-400 font-semibold">Berbagi Layar</span>
                            </div>
                          </div>
                        )
                      }
                      return (
                        <div key={u.uid} className="h-full aspect-video shrink-0">
                          <RemoteUserVideoCard
                            user={u}
                            compact={true}
                            aspectClass="aspect-video"
                            isSpeaking={speakingUsers[u.uid]}
                            isSpotlight={spotlightUser === u.uid}
                            isGuruHost={isGuru}
                            onSpotlight={() => handleSetSpotlight(u.uid)}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })()
        ) : viewMode === "speaker" ? (
          /* =========================================================================
             SPEAKER VIEW MODE ALA ZOOM (RESPONSIF MOBILE & DESKTOP - PROPORSIONAL)
             ========================================================================= */
          <div className="flex-1 w-full overflow-y-auto overscroll-contain touch-pan-y no-scrollbar p-2 sm:p-4 flex flex-col gap-2 sm:gap-3.5 min-h-0">
            {/* Layar Utama Speaker (Proporsional 16:9, tidak melar di desktop) */}
            <div className="w-full max-w-4xl lg:max-w-5xl mx-auto aspect-video max-h-[46vh] sm:max-h-[58vh] relative rounded-xl sm:rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center shrink-0">
              <div
                ref={speakerViewVideoRef}
                className="w-full h-full bg-black [&_video]:!object-cover [&_video]:!object-center [&_video]:!w-full [&_video]:!h-full [&_div]:!bg-transparent"
              />
              <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold text-white flex items-center gap-1.5 sm:gap-2 border border-white/10 z-10">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Fokus: {currentSpeakerUid === userNama ? `${userNama} (Anda)` : currentSpeakerUid}</span>
                {spotlightUser === currentSpeakerUid && (
                  <Badge className="bg-amber-500/20 text-amber-300 border-none text-[8px] sm:text-[9px] px-1.5 py-0 font-black">
                    Spotlight
                  </Badge>
                )}
              </div>

              {/* Tombol Kontrol Spotlight oleh Guru Host di Layar Utama */}
              {isGuru && (
                <button
                  type="button"
                  onClick={() => handleSetSpotlight(currentSpeakerUid)}
                  className={`absolute top-2.5 right-2.5 sm:top-3 sm:right-3 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg z-20 transition-all active:scale-95 border ${spotlightUser === currentSpeakerUid
                      ? "bg-amber-500 border-amber-400 text-black shadow-amber-500/30 font-black"
                      : "bg-black/75 hover:bg-black/90 border-white/20 text-white"
                    }`}
                  title={
                    spotlightUser === currentSpeakerUid
                      ? "Lepas Spotlight (Bebaskan layar ke pembicara aktif)"
                      : `Kunci ${currentSpeakerUid} sebagai Spotlight untuk semua peserta`
                  }
                >
                  <Pin className={`w-3.5 h-3.5 ${spotlightUser === currentSpeakerUid ? "fill-black" : "text-amber-400"}`} />
                  <span>
                    {spotlightUser === currentSpeakerUid ? "Lepas Spotlight" : "Jadikan Spotlight"}
                  </span>
                </button>
              )}
            </div>

            {/* Area Peserta Lain */}
            <div className="w-full max-w-4xl lg:max-w-5xl mx-auto flex-1 min-h-0 flex flex-col space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Peserta Lainnya ({remoteUsers.length})
                </span>
              </div>

              {/* Strip Peserta Bawah (Scrollable horizontal & responsive) */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 shrink-0 no-scrollbar touch-pan-x">
                {/* Thumbnail Saya */}
                <div
                  onClick={() => setPinnedUser(userNama)}
                  className={`relative rounded-xl sm:rounded-2xl bg-slate-900 border overflow-hidden shadow-md h-20 sm:h-28 aspect-video shrink-0 flex items-center justify-center cursor-pointer transition-all group ${currentSpeakerUid === userNama ? "ring-2 ring-blue-500" : "border-slate-800"
                    }`}
                >
                  <div
                    ref={localVideoRef}
                    className={`w-full h-full bg-black -scale-x-100 pointer-events-none [&_video]:!object-cover [&_video]:!object-center [&_video]:!w-full [&_video]:!h-full [&_div]:!bg-transparent ${cameraOn && !isScreenSharing ? "opacity-100" : "opacity-0"
                      }`}
                  />
                  {(!cameraOn || isScreenSharing) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-400">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-xs ring-1 ring-blue-500/20">
                        {userNama.charAt(0).toUpperCase()}
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[9px] font-bold text-white flex items-center gap-1">
                    <span>{userNama} (Saya)</span>
                    {!micOn && <MicOff className="w-2.5 h-2.5 text-rose-400" />}
                  </div>

                  {/* Tombol Spotlight Saya untuk Guru */}
                  {isGuru && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSetSpotlight(userNama)
                      }}
                      className={`absolute top-1 right-1 p-1 rounded-lg text-xs z-10 transition-all ${spotlightUser === userNama
                          ? "bg-amber-500 text-black font-bold shadow-md opacity-100"
                          : "bg-black/75 hover:bg-amber-600 text-white border border-white/20 opacity-0 group-hover:opacity-100 focus:opacity-100"
                        }`}
                      title={spotlightUser === userNama ? "Lepas Spotlight Saya" : "Spotlight Saya"}
                    >
                      <Pin className={`w-3 h-3 ${spotlightUser === userNama ? "fill-black" : ""}`} />
                    </button>
                  )}
                </div>

                {/* Thumbnail Peserta Lain */}
                {remoteUsers.map((u) => {
                  const isActiveOnStage = currentSpeakerUid === u.uid
                  return (
                    <div
                      key={u.uid}
                      onClick={() => setPinnedUser(u.uid)}
                      className={`relative rounded-xl sm:rounded-2xl bg-slate-900 border overflow-hidden shadow-md h-20 sm:h-28 aspect-video shrink-0 flex items-center justify-center cursor-pointer transition-all ${isActiveOnStage ? "ring-2 ring-blue-500" : "border-slate-800"
                        }`}
                    >
                      {isActiveOnStage ? (
                        <div className="flex flex-col items-center justify-center p-2 text-center text-slate-400 space-y-1">
                          <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" />
                          <span className="text-[10px] font-bold text-slate-300 truncate max-w-[90px]">{u.uid}</span>
                          <span className="text-[8px] text-blue-400 font-semibold">Di Layar Utama</span>
                        </div>
                      ) : (
                        <RemoteUserVideoCard
                          user={u}
                          compact={true}
                          isSpeaking={speakingUsers[u.uid]}
                          isSpotlight={spotlightUser === u.uid}
                          isGuruHost={isGuru}
                          onSpotlight={() => handleSetSpotlight(u.uid)}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          /* =========================================================================
             GALLERY VIEW MODE (RESPONSIF MOBILE / TABLET / DESKTOP)
             ========================================================================= */
          (() => {
            const totalParticipants = 1 + remoteUsers.length
            const isOdd = totalParticipants % 2 !== 0 && totalParticipants > 1

            const participants = [
              { isLocal: true, uid: userNama, name: userNama },
              ...remoteUsers.map((u) => ({ isLocal: false, user: u, uid: u.uid })),
            ]

            let gridLayoutClass = "grid-cols-2 md:grid-cols-2 max-w-4xl mx-auto"
            if (totalParticipants === 1) {
              gridLayoutClass = "grid-cols-1 max-w-2xl mx-auto"
            } else if (totalParticipants === 3) {
              // Di Mobile: 2 kolom (2 di atas, 1 di bawah sesuai sketsa)
              // Di Desktop (layar md/lg): 3 kolom sejajar (md:grid-cols-3) dengan aspek 16:9 simetris & rapi!
              gridLayoutClass = "grid-cols-2 md:grid-cols-3 max-w-5xl lg:max-w-6xl mx-auto"
            } else if (totalParticipants === 4) {
              gridLayoutClass = "grid-cols-2 md:grid-cols-2 max-w-4xl lg:max-w-5xl mx-auto"
            } else if (totalParticipants === 5 || totalParticipants === 6) {
              gridLayoutClass = "grid-cols-2 md:grid-cols-3 max-w-5xl lg:max-w-6xl mx-auto"
            } else if (totalParticipants >= 7) {
              gridLayoutClass = "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 max-w-6xl lg:max-w-7xl mx-auto"
            }

            return (
              <div
                className="flex-1 w-full overflow-y-auto overscroll-contain touch-pan-y no-scrollbar py-2 sm:py-3 px-1.5 sm:px-3 min-h-0 flex flex-col"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                <div className={`w-full my-auto pb-4 sm:pb-6 grid gap-2 sm:gap-3.5 ${gridLayoutClass}`}>
                  {participants.map((p, idx) => {
                    const isLastOddOnMobile = totalParticipants % 2 !== 0 && totalParticipants > 1 && idx === totalParticipants - 1

                    // Di Desktop (layar md dan lg): SEMUA kartu selalu col-span-1 dan aspect-video 16:9!
                    // TIDAK ADA kartu yang memanjang atau melar di layar desktop/lg!
                    // Di Mobile: jika peserta ganjil (misal 3), kartu terakhir col-span-2 max-w-md mx-auto
                    let wrapperClass = "col-span-1 md:col-span-1 w-full"
                    let aspectClass = "aspect-[4/3] md:aspect-video"

                    if (totalParticipants === 1) {
                      wrapperClass = "col-span-1 w-full"
                      aspectClass = "aspect-[4/3] md:aspect-video max-h-[68vh]"
                    } else if (isLastOddOnMobile) {
                      wrapperClass = "col-span-2 md:col-span-1 w-full max-w-md md:max-w-none mx-auto"
                      aspectClass = "aspect-[16/9] md:aspect-video"
                    }

                    if (p.isLocal) {
                      const isSpeaking = speakingUsers[userNama]

                      return (
                        <div key="local-user" className={wrapperClass}>
                          <div
                            className={`relative rounded-xl sm:rounded-2xl bg-slate-900 border overflow-hidden shadow-xl flex items-center justify-center w-full group transition-all duration-200 ${isSpeaking
                                ? "ring-2 ring-emerald-400 border-emerald-400"
                                : spotlightUser === userNama
                                  ? "ring-2 ring-amber-400 border-amber-400"
                                  : "border-slate-800/80"
                              } ${aspectClass}`}
                          >
                            <div
                              ref={localVideoRef}
                              className={`w-full h-full bg-black -scale-x-100 pointer-events-none [&_video]:!object-cover [&_video]:!object-center [&_video]:!w-full [&_video]:!h-full [&_div]:!bg-transparent ${cameraOn && !isScreenSharing ? "opacity-100" : "opacity-0"
                                }`}
                            />
                            {(!cameraOn || isScreenSharing) && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-400 space-y-1 sm:space-y-2">
                                <div className="w-11 h-11 sm:w-16 sm:h-16 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-black text-sm sm:text-xl ring-2 ring-blue-500/20">
                                  {userNama.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-[10px] sm:text-xs font-semibold text-slate-400">
                                  {isScreenSharing ? "Berbagi Layar" : "Kamera Dinonaktifkan"}
                                </span>
                              </div>
                            )}

                            {/* Tombol Spotlight Guru untuk Local User */}
                            {isGuru && (
                              <button
                                type="button"
                                onClick={() => handleSetSpotlight(userNama)}
                                className={`absolute top-2 right-2 p-1.5 rounded-xl text-xs z-20 transition-all ${spotlightUser === userNama
                                    ? "bg-amber-500 text-black font-bold shadow-md opacity-100"
                                    : "bg-black/75 hover:bg-amber-600 text-white border border-white/20 opacity-0 group-hover:opacity-100 focus:opacity-100"
                                  }`}
                                title={spotlightUser === userNama ? "Lepas Spotlight Saya" : "Spotlight Saya"}
                              >
                                <Pin className={`w-3.5 h-3.5 ${spotlightUser === userNama ? "fill-black" : ""}`} />
                              </button>
                            )}

                            <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-xl text-[10px] sm:text-xs font-bold text-white flex items-center gap-1.5 shadow-md">
                              <span>{userNama} (Saya)</span>
                              {isSpeaking ? (
                                <span className="flex items-center gap-1 text-emerald-400 font-extrabold text-[10px]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                  <Mic className="w-3 h-3" />
                                </span>
                              ) : !micOn ? (
                                <MicOff className="w-3 h-3 text-rose-400" />
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
                          isSpotlight={spotlightUser === p.uid}
                          isGuruHost={isGuru}
                          aspectClass={aspectClass}
                          onMute={() => handleMuteMurid(p.uid)}
                          onAskUnmute={() => handleAskUnmuteMurid(p.uid)}
                          onSpotlight={() => handleSetSpotlight(p.uid)}
                          onKick={() => handleKickMurid(p.uid)}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()
        )}

        {/* =========================================================================
            PANEL KELOLA PARTICIPANTS (RESPONSIF MOBILE / DESKTOP)
            ========================================================================= */}
        {showParticipantList && (
          <div className="fixed inset-x-2 sm:inset-auto top-14 sm:top-16 bottom-16 sm:bottom-20 sm:right-6 z-50 sm:w-88 bg-slate-900/98 sm:bg-slate-900/95 border border-slate-700/80 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-2xl backdrop-blur-2xl flex flex-col justify-between animate-in fade-in zoom-in-95 space-y-3">
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
              <div className="border-b border-slate-800 pb-2 space-y-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleMuteAllMurid}
                  className="w-full text-[11px] font-bold h-8 border-slate-700 bg-slate-800 text-rose-300 hover:bg-rose-950/40"
                >
                  <VolumeX className="w-3.5 h-3.5 mr-1.5" />
                  Mute Semua Murid
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const nextVal = !allowStudentScreenShare
                    await updateScreenSharePermission(channelName, nextVal)
                  }}
                  className={`w-full text-[11px] font-bold h-8 border-slate-700 ${
                    allowStudentScreenShare
                      ? "bg-emerald-950/40 text-emerald-300 border-emerald-600/50 hover:bg-emerald-900/50"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5 mr-1.5" />
                  <span>
                    {allowStudentScreenShare
                      ? "Izin Share Screen Murid: Aktif"
                      : "Izinkan Murid Berbagi Layar"}
                  </span>
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
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">
                  {micOn ? "Mic On" : "Muted"}
                </span>
              </div>

              {/* Teman / Murid */}
              {remoteUsers.map((u) => {
                const nama = u.uid
                return (
                  <div
                    key={nama}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 text-xs gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-200 truncate">{nama}</div>
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
                          className={`p-1 rounded ${spotlightUser === nama
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

        {/* Drawer Chat (Responsif Mobile & Desktop) */}
        {showChat && (
          <MeetChatDrawer
            channelName={channelName}
            userNama={userNama}
            isGuru={isGuru}
            onClose={() => setShowChat(false)}
          />
        )}
      </div>

      {/* =========================================================================
          DOCKED BOTTOM CONTROLS BAR (SOLID FIXED FOOTER ALA ZOOM - BUKAN MELAYANG)
          ========================================================================= */}
      {!connecting && !errorMsg && (
        <div className="shrink-0 w-full bg-slate-900/98 sm:bg-slate-900 border-t border-slate-800/90 py-2 sm:py-2.5 px-2 sm:px-6 relative z-40 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-1.5 sm:gap-4 relative">
            {/* Device Selector Popover Menu (opens UPWARDS above bottom bar) */}
            {showDeviceMenu && (
              <div className="absolute bottom-full mb-3 left-0 sm:left-2 bg-slate-900 border border-slate-700/90 rounded-2xl p-3 sm:p-4 shadow-2xl backdrop-blur-xl w-72 sm:w-80 max-w-[94vw] text-xs space-y-3 z-50 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-extrabold text-xs text-slate-200 flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5 text-blue-400" />
                    <span>Pengaturan Audio</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowDeviceMenu(false)}
                    className="text-slate-400 hover:text-white text-xs p-1 rounded-md hover:bg-slate-800"
                  >
                    ✕
                  </button>
                </div>

                {/* 1. TERPISAH: AUDIO INPUT (MIKROFON) */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <Mic className="w-3 h-3" />
                    <span>Audio Input (Mikrofon)</span>
                  </span>
                  <select
                    value={selectedMicId}
                    onChange={(e) => handleSwitchMic(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-[11px] text-slate-200 truncate focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {availableMics.length === 0 ? (
                      <option value="">Tidak ada mikrofon terdeteksi</option>
                    ) : (
                      availableMics.map((m) => (
                        <option key={m.deviceId} value={m.deviceId}>
                          {m.label || `Mikrofon ${m.deviceId.slice(0, 5)}`}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* 2. TERPISAH: AUDIO OUTPUT (SPEAKER) */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                      <Volume2 className="w-3 h-3" />
                      <span>Audio Output (Speaker)</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleTestSpeaker}
                      className="text-[9px] text-amber-400 hover:text-amber-300 font-extrabold flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded-md active:scale-95 transition-all"
                    >
                      <span>{testingSpeaker ? "Memutar..." : "Uji Suara"}</span>
                    </button>
                  </div>
                  <select
                    value={selectedSpeakerId}
                    onChange={(e) => handleSwitchSpeaker(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-[11px] text-slate-200 truncate focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    {availableSpeakers.length === 0 ? (
                      <option value="">Speaker default sistem</option>
                    ) : (
                      availableSpeakers.map((s) => (
                        <option key={s.deviceId} value={s.deviceId}>
                          {s.label || `Speaker ${s.deviceId.slice(0, 5)}`}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>
            )}

            {/* Action Buttons: Left / Center group */}
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              {/* Mic Toggle + Switch Device */}
              <div className="flex items-center bg-slate-800/90 rounded-xl sm:rounded-2xl p-0.5 border border-slate-700/60 shadow-sm">
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`h-8 sm:h-9 px-2 sm:px-3 rounded-lg sm:rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 ${micOn
                      ? "bg-slate-700/60 hover:bg-slate-700 text-white"
                      : "bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
                    }`}
                  title={micOn ? "Matikan Mikrofon" : "Nyalakan Mikrofon"}
                >
                  {micOn ? <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" /> : <MicOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                  <span className="text-[11px] font-semibold hidden md:inline">
                    {micOn ? "Mute" : "Unmute"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeviceMenu(!showDeviceMenu)}
                  className="h-8 sm:h-9 px-1.5 rounded-r-lg sm:rounded-r-xl hover:bg-slate-700/50 text-slate-400 hover:text-white flex items-center justify-center"
                  title="Pengaturan Audio"
                >
                  <ChevronUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              </div>

              {/* Camera Toggle */}
              <button
                type="button"
                onClick={toggleCamera}
                className={`h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl sm:rounded-2xl flex items-center justify-center gap-1.5 transition-all active:scale-95 border ${cameraOn
                    ? "bg-slate-800/90 hover:bg-slate-700/90 border-slate-700/60 text-white"
                    : "bg-rose-600 hover:bg-rose-700 border-rose-500 text-white shadow-sm"
                  }`}
                title={cameraOn ? "Matikan Kamera" : "Nyalakan Kamera"}
              >
                {cameraOn ? <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" /> : <VideoOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                <span className="text-[11px] font-semibold hidden md:inline">
                  {cameraOn ? "Stop Video" : "Start Video"}
                </span>
              </button>

              {/* Screen Sharing Toggle (Guru & Murid jika diizinkan) */}
              {(isGuru || allowStudentScreenShare) && (
                <button
                  type="button"
                  onClick={toggleScreenShare}
                  disabled={activeSharer && activeSharer !== userNama}
                  className={`h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl sm:rounded-2xl flex items-center justify-center gap-1.5 transition-all active:scale-95 border ${isScreenSharing
                      ? "bg-indigo-600 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-400/50"
                      : activeSharer && activeSharer !== userNama
                        ? "bg-slate-800/50 border-slate-800 text-slate-500 cursor-not-allowed opacity-50"
                        : "bg-slate-800/90 hover:bg-slate-700/90 border-slate-700/60 text-white"
                    }`}
                  title={
                    activeSharer && activeSharer !== userNama
                      ? `${activeSharer} sedang berbagi layar`
                      : isScreenSharing
                        ? "Hentikan Berbagi Layar"
                        : "Bagikan Layar"
                  }
                >
                  <Monitor className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400" />
                  <span className="text-[11px] font-semibold hidden md:inline">
                    {isScreenSharing ? "Stop Share" : "Share Screen"}
                  </span>
                </button>
              )}
            </div>

            {/* Right Action: Leave Call Button */}
            <div className="shrink-0">
              <button
                type="button"
                onClick={handleLeaveClick}
                className="h-8 sm:h-9 px-3 sm:px-4 rounded-xl sm:rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-900/30 transition-all active:scale-95"
                title="Tinggalkan Sesi Meet"
              >
                <PhoneOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  )
}

function RemoteScreenShareView({ sharerUser, fit = "contain" }) {
  const containerRef = useRef(null)
  const track = sharerUser?.videoTrack

  useEffect(() => {
    let timer1 = null
    let timer2 = null

    const playTrack = () => {
      if (track && containerRef.current) {
        try {
          containerRef.current.innerHTML = ""
          track.play(containerRef.current, { fit })
        } catch (e) {
          console.warn("Remote screen share play error:", e)
        }
      }
    }

    playTrack()
    timer1 = setTimeout(playTrack, 200)
    timer2 = setTimeout(playTrack, 600)

    return () => {
      if (timer1) clearTimeout(timer1)
      if (timer2) clearTimeout(timer2)
      if (track && containerRef.current) {
        try {
          track.stop()
        } catch (_) { }
      }
    }
  }, [track, sharerUser?.version, fit])

  return (
    <div className="w-full h-full relative flex items-center justify-center bg-black">
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center bg-black [&_video]:!object-contain [&_video]:!object-center [&_video]:!w-full [&_video]:!h-full [&_video]:!max-h-full [&_video]:!max-w-full [&_div]:!bg-transparent pointer-events-none"
      />
      {!track && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 text-slate-400 space-y-2 z-10">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-300">
            Menghubungkan ke presentasi {sharerUser?.uid || ""}...
          </span>
        </div>
      )}
    </div>
  )
}

function LocalScreenShareView({ screenTrack, fit = "contain" }) {
  const containerRef = useRef(null)

  useEffect(() => {
    let timer = null
    const play = () => {
      if (screenTrack && containerRef.current) {
        try {
          containerRef.current.innerHTML = ""
          screenTrack.play(containerRef.current, { fit })
        } catch (e) {
          console.warn("Local screen share play error:", e)
        }
      }
    }

    playTrack: play()
    timer = setTimeout(play, 200)

    return () => {
      if (timer) clearTimeout(timer)
      if (screenTrack && containerRef.current) {
        try {
          screenTrack.stop()
        } catch (_) { }
      }
    }
  }, [screenTrack, fit])

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center bg-black [&_video]:!object-contain [&_video]:!object-center [&_video]:!w-full [&_video]:!h-full [&_video]:!max-h-full [&_video]:!max-w-full [&_div]:!bg-transparent pointer-events-none"
    />
  )
}

function RemoteUserVideoCard({
  user,
  compact = false,
  aspectClass = "aspect-[4/3] sm:aspect-video",
  isSpeaking = false,
  isSpotlight = false,
  isGuruHost = false,
  onMute,
  onAskUnmute,
  onSpotlight,
  onKick,
}) {
  const containerRef = useRef(null)
  const track = user.videoTrack

  useEffect(() => {
    if (track && containerRef.current) {
      try {
        containerRef.current.innerHTML = ""
        track.play(containerRef.current, { fit: "cover" })
      } catch (err) {
        console.warn("Remote video track play error:", err)
      }
    }
  }, [track, user.version, user.hasVideo])

  const displayName =
    typeof user.uid === "string" && isNaN(Number(user.uid))
      ? user.uid
      : `Peserta #${String(user.uid).slice(-4)}`

  return (
    <div
      className={`relative rounded-xl sm:rounded-2xl bg-slate-900 border overflow-hidden shadow-xl flex items-center justify-center w-full group shrink-0 transition-all duration-200 ${isSpeaking
          ? "ring-2 ring-emerald-400 border-emerald-400"
          : isSpotlight
            ? "ring-2 ring-amber-400 border-amber-400"
            : "border-slate-800/80"
        } ${compact ? "h-full aspect-video" : aspectClass}`}
    >
      {/* Video element container is always present in DOM to allow seamless Agora playback */}
      <div
        ref={containerRef}
        className={`w-full h-full bg-black pointer-events-none [&_video]:!object-cover [&_video]:!object-center [&_video]:!w-full [&_video]:!h-full [&_div]:!bg-transparent ${user.hasVideo && track ? "opacity-100" : "opacity-0"
          }`}
      />

      {(!user.hasVideo || !track) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-400 space-y-1">
          <div
            className={`rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-black ring-2 ring-indigo-500/20 ${compact ? "w-7 h-7 sm:w-8 sm:h-8 text-[11px]" : "w-11 h-11 sm:w-16 sm:h-16 text-sm sm:text-xl"
              }`}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
          <span className="text-[10px] sm:text-xs font-semibold text-slate-300 truncate max-w-[85%] text-center">
            {displayName}
          </span>
        </div>
      )}

      {/* Badge Spotlight */}
      {isSpotlight && (
        <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 bg-amber-500 text-black px-1.5 py-0.5 rounded-lg font-black text-[9px] sm:text-[10px] flex items-center gap-1 shadow-md z-10">
          <Pin className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-black" />
          <span>Spotlight</span>
        </div>
      )}

      {/* Label Nama Peserta & Indikator Suara */}
      <div className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl text-[10px] sm:text-[11px] font-bold text-white flex items-center gap-1.5 shadow-md max-w-[85%] z-10">
        <span className="truncate">{displayName}</span>
        {isSpeaking ? (
          <span className="flex items-center gap-1 text-emerald-400 font-extrabold text-[9px] sm:text-[10px] shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <Mic className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          </span>
        ) : !user.hasAudio ? (
          <MicOff className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-rose-400 shrink-0" />
        ) : null}
      </div>

      {/* Tombol Kontrol Spotlight untuk Guru saat Mode Compact / Thumbnail Strip di Speaker View */}
      {isGuruHost && compact && onSpotlight && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onSpotlight()
          }}
          className={`absolute top-1 right-1 p-1 rounded-lg text-xs z-20 pointer-events-auto transition-all ${isSpotlight
              ? "bg-amber-500 text-black font-bold shadow-md opacity-100"
              : "bg-black/75 hover:bg-amber-600 text-white border border-white/20 opacity-0 group-hover:opacity-100 focus:opacity-100"
            }`}
          title={isSpotlight ? "Lepas Spotlight" : "Spotlight Peserta"}
        >
          <Pin className={`w-3 h-3 ${isSpotlight ? "fill-black" : ""}`} />
        </button>
      )}

      {/* Host Action Hover Buttons (Full Mode) */}
      {isGuruHost && !compact && (
        <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-black/70 backdrop-blur-md p-1 rounded-xl border border-white/10 z-10 pointer-events-auto">
          <button
            type="button"
            onClick={onMute}
            className="p-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px]"
            title="Mute Peserta"
          >
            <VolumeX className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
          <button
            type="button"
            onClick={onAskUnmute}
            className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px]"
            title="Minta Unmute"
          >
            <Mic className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
          <button
            type="button"
            onClick={onSpotlight}
            className={`p-1 rounded-lg text-white text-[10px] ${isSpotlight ? "bg-amber-600" : "bg-slate-700 hover:bg-amber-600"
              }`}
            title="Spotlight Peserta"
          >
            <Pin className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
          <button
            type="button"
            onClick={onKick}
            className="p-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px]"
            title="Keluarkan Peserta"
          >
            <UserX className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

function LocalUserVideoCard({
  localTrack,
  cameraOn,
  micOn,
  userNama,
  isScreenSharing = false,
  isGuru = false,
  isSpotlight = false,
  onSpotlight,
  aspectClass = "aspect-video",
  compact = false,
}) {
  const containerRef = useRef(null)

  useEffect(() => {
    let timer = null
    const play = () => {
      if (localTrack && containerRef.current && cameraOn && !isScreenSharing) {
        try {
          containerRef.current.innerHTML = ""
          localTrack.play(containerRef.current)
        } catch (err) {
          console.warn("Local video track play error:", err)
        }
      }
    }

    play()
    timer = setTimeout(play, 150)

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [localTrack, cameraOn, isScreenSharing])

  return (
    <div
      className={`relative rounded-xl sm:rounded-2xl bg-slate-900 border overflow-hidden shadow-md flex items-center justify-center w-full group shrink-0 transition-all duration-200 ${
        isSpotlight ? "ring-2 ring-amber-400 border-amber-400" : "border-slate-800/80"
      } ${compact ? "h-full aspect-video" : aspectClass}`}
    >
      {isScreenSharing ? (
        <div className="flex flex-col items-center justify-center p-2 text-center text-slate-400 space-y-1">
          <Monitor className="w-5 h-5 text-emerald-400" />
          <span className="text-[10px] font-bold text-slate-300">Layar Anda</span>
        </div>
      ) : (
        <>
          <div
            ref={containerRef}
            className={`w-full h-full bg-black -scale-x-100 pointer-events-none [&_video]:!object-cover [&_video]:!object-center [&_video]:!w-full [&_video]:!h-full [&_div]:!bg-transparent ${
              cameraOn && localTrack ? "opacity-100" : "opacity-0"
            }`}
          />
          {(!cameraOn || !localTrack) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-400 space-y-1">
              <div
                className={`rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-black ring-2 ring-blue-500/20 ${
                  compact ? "w-7 h-7 sm:w-8 sm:h-8 text-[11px]" : "w-11 h-11 sm:w-14 sm:h-14 text-sm sm:text-lg"
                }`}
              >
                {userNama.charAt(0).toUpperCase()}
              </div>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-300 truncate max-w-[85%] text-center">
                {userNama}
              </span>
            </div>
          )}
        </>
      )}

      {/* Badge Spotlight */}
      {isSpotlight && (
        <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 bg-amber-500 text-black px-1.5 py-0.5 rounded-lg font-black text-[9px] sm:text-[10px] flex items-center gap-1 shadow-md z-10">
          <Pin className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-black" />
          <span>Spotlight</span>
        </div>
      )}

      {/* Label Nama Peserta & Indikator Suara */}
      <div className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl text-[10px] sm:text-[11px] font-bold text-white flex items-center gap-1.5 shadow-md max-w-[85%] z-10">
        <span className="truncate">{userNama} (Saya)</span>
        {!micOn && <MicOff className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-rose-400 shrink-0" />}
      </div>

      {/* Tombol Spotlight Saya untuk Guru */}
      {isGuru && onSpotlight && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onSpotlight()
          }}
          className={`absolute top-1 right-1 p-1 rounded-lg text-xs z-20 pointer-events-auto transition-all ${
            isSpotlight
              ? "bg-amber-500 text-black font-bold shadow-md opacity-100"
              : "bg-black/75 hover:bg-amber-600 text-white border border-white/20 opacity-0 group-hover:opacity-100 focus:opacity-100"
          }`}
          title={isSpotlight ? "Lepas Spotlight Saya" : "Spotlight Saya"}
        >
          <Pin className={`w-3 h-3 ${isSpotlight ? "fill-black" : ""}`} />
        </button>
      )}
    </div>
  )
}
