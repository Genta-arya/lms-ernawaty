import React, { useState, useEffect, useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { collection, query, where, limit, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { UserAvatar } from "@/components/common/UserAvatar"
import { ModalChatPribadi } from "@/components/kelas/ModalChatPribadi"
import { MessageCircle, X } from "lucide-react"

export function GlobalChatNotification() {
  const { currentUser, profileData } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [activeBanner, setActiveBanner] = useState(null)
  const [activeChatTarget, setActiveChatTarget] = useState(null)
  const hideTimeoutRef = useRef(null)
  const isFirstLoadRef = useRef(true)
  const initialLoadTimeRef = useRef(Date.now())

  // ID saya
  const myIdentifiers = [
    currentUser?.uid ? String(currentUser.uid) : null,
    profileData?.nisn ? String(profileData.nisn) : null,
  ].filter(Boolean)

  useEffect(() => {
    if (myIdentifiers.length === 0) return

    // Query 15 pesan terakhir yang ditujukan ke saya
    const q = query(
      collection(db, "chatPribadi"),
      where("penerimaId", "in", myIdentifiers),
      limit(15)
    )

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        // Skip snapshot pertama yang merupakan histori lama saat inisialisasi
        if (isFirstLoadRef.current) {
          isFirstLoadRef.current = false
          return
        }

        snap.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data()
            
            // Verifikasi bahwa pesan bukan dikirim oleh diri sendiri
            const pengirimId = String(data.pengirimId || data.pengirimUid || "")
            if (myIdentifiers.includes(pengirimId)) return

            // Verifikasi waktu pesan relatif baru (dalam rentang 20 detik terakhir)
            let timeMillis = 0
            if (data.createdAt?.toMillis) timeMillis = data.createdAt.toMillis()
            else if (data.createdAt?.seconds) timeMillis = data.createdAt.seconds * 1000
            else if (data.createdAt) timeMillis = new Date(data.createdAt).getTime()
            else timeMillis = Date.now()

            // Jika pesan dibuat sebelum halaman ini dibuka, abaikan (mencegah spam histori)
            if (timeMillis < initialLoadTimeRef.current - 5000) return

            // Tampilkan popup notifikasi WA style
            const bannerData = {
              id: change.doc.id,
              senderId: pengirimId,
              senderNisn: data.pengirimNisn || (pengirimId.length <= 12 ? pengirimId : ""),
              senderName: data.pengirimNama || "Teman Kelas",
              senderFoto: data.pengirimFoto || data.pengirimFotoUrl || null,
              pesan: data.pesan || "",
              chatId: data.chatId,
            }

            setActiveBanner(bannerData)

            // Play notification sound (subtle audio beep jika didukung)
            try {
              const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
              const osc = audioCtx.createOscillator()
              const gain = audioCtx.createGain()
              osc.type = "sine"
              osc.frequency.setValueAtTime(587.33, audioCtx.currentTime) // D5
              osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.08) // A5
              gain.gain.setValueAtTime(0.12, audioCtx.currentTime)
              gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35)
              osc.connect(gain)
              gain.connect(audioCtx.destination)
              osc.start()
              osc.stop(audioCtx.currentTime + 0.35)
            } catch (_) {}

            // Auto dismiss setelah 5.5 detik
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
            hideTimeoutRef.current = setTimeout(() => {
              setActiveBanner(null)
            }, 5500)
          }
        })
      },
      (err) => {
        // Fallback silent
        console.warn("Global chat notification listener error:", err)
      }
    )

    return () => {
      unsubscribe()
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    }
  }, [currentUser?.uid, profileData?.nisn])

  function handleBannerClick() {
    if (!activeBanner) return
    const target = {
      uid: activeBanner.senderId,
      nisn: activeBanner.senderNisn || null,
      nama: activeBanner.senderName,
      fotoUrl: activeBanner.senderFoto,
    }
    setActiveBanner(null)
    setActiveChatTarget(target)
  }

  function handleDismiss(e) {
    e.stopPropagation()
    setActiveBanner(null)
  }

  return (
    <>
      {/* Toast Notification WA Style di Atas Tengah Layar */}
      {activeBanner && (
        <div className="fixed top-4 inset-x-0 z-[9999] flex justify-center px-4 pointer-events-none animate-in slide-in-from-top-6 duration-300">
          <div
            onClick={handleBannerClick}
            className="pointer-events-auto cursor-pointer max-w-md w-full bg-slate-900/95 hover:bg-slate-900 backdrop-blur-md text-white rounded-2xl p-3.5 shadow-2xl border border-white/15 flex items-center gap-3.5 transition-all hover:scale-[1.01] active:scale-[0.99] group"
            style={{
              boxShadow: "0 20px 40px -15px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)",
            }}
          >
            {/* Foto Avatar Pengirim */}
            <div className="relative shrink-0">
              <UserAvatar
                name={activeBanner.senderName}
                avatarUrl={activeBanner.senderFoto}
                className="w-11 h-11 ring-2 ring-emerald-500/80"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center">
                <MessageCircle className="w-2.5 h-2.5 text-white" />
              </span>
            </div>

            {/* Isi Pesan */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className="text-xs font-black text-white group-hover:text-emerald-400 transition-colors truncate">
                  {activeBanner.senderName}
                </span>
                <span className="text-[10px] text-emerald-400 font-bold tracking-wider uppercase shrink-0">
                  Pesan Baru
                </span>
              </div>
              <p className="text-xs text-slate-200 truncate font-medium">
                {activeBanner.pesan}
              </p>
            </div>

            {/* Tombol Tutup Toast */}
            <button
              type="button"
              onClick={handleDismiss}
              className="w-7 h-7 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 shrink-0 transition-colors"
              title="Tutup notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal Langsung Terbuka saat Banner Notifikasi di-klik */}
      {activeChatTarget && (
        <ModalChatPribadi
          targetMurid={activeChatTarget}
          onClose={() => setActiveChatTarget(null)}
        />
      )}
    </>
  )
}

