import { cn } from "@/lib/utils"
import React, { useState, useEffect, useRef } from "react"
import { useAuth } from "@/context/AuthContext"
import {
  getPrivateChatId,
  sendPesanPribadi,
  subscribePesanPribadi,
  setTypingStatusPribadi,
  subscribeTypingPribadi,
  markPesanPribadiAsRead,
} from "@/services/chatPribadi"
import { subscribeSinglePresence } from "@/services/presence"
import { UserAvatar } from "@/components/common/UserAvatar"
import { Button } from "@/components/ui/button"
import {
  MessageCircle,
  Send,
  X,
} from "lucide-react"

export function ModalChatPribadi({ targetMurid, onClose }) {
  const { currentUser, profileData } = useAuth()
  const [messages, setMessages] = useState([])
  const [inputPesan, setInputPesan] = useState("")
  const [sending, setSending] = useState(false)
  const [typingPartnerName, setTypingPartnerName] = useState(null)
  const [partnerPresence, setPartnerPresence] = useState({ isOnline: false, lastSeenText: "Memeriksa status..." })
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  // Tentukan id unik saya dan teman
  const myId = profileData?.nisn || currentUser?.uid
  const myNisn = profileData?.nisn || null
  const myName = profileData?.nama || currentUser?.displayName || "Siswa"
  const targetId = targetMurid?.nisn || targetMurid?.uid
  const targetNisn = targetMurid?.nisn || null
  const chatId = getPrivateChatId(myId, targetId)

  // Realtime subscription ke pesan chat pribadi & tandai sudah dibaca
  useEffect(() => {
    if (!chatId) return
    const unsubscribe = subscribePesanPribadi(chatId, (msgs) => {
      setMessages(msgs)
      // Tandai semua pesan dari teman ini sebagai dibaca sehingga badge unread hilang
      if (targetMurid?.nisn) markPesanPribadiAsRead(targetMurid.nisn)
      if (targetMurid?.uid) markPesanPribadiAsRead(targetMurid.uid)
    })
    return () => unsubscribe()
  }, [chatId, targetMurid?.nisn, targetMurid?.uid])

  // Realtime subscription status lawan bicara mengetik
  useEffect(() => {
    if (!chatId || !myId) return
    const unsubscribe = subscribeTypingPribadi(chatId, myId, (otherName) => {
      setTypingPartnerName(otherName)
    })
    return () => unsubscribe()
  }, [chatId, myId])

  // Realtime subscription status kehadiran / online lawan bicara
  useEffect(() => {
    const targetPresenceKey = targetMurid?.uid || targetMurid?.nisn
    if (!targetPresenceKey) return
    const unsubscribe = subscribeSinglePresence(targetPresenceKey, (status) => {
      setPartnerPresence(status)
    })
    return () => unsubscribe()
  }, [targetMurid?.uid, targetMurid?.nisn])

  // Scroll otomatis ke bawah
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, typingPartnerName])

  function handleInputChange(e) {
    const val = e.target.value
    setInputPesan(val)

    if (!chatId || !myId) return

    setTypingStatusPribadi(chatId, myId, myName, true).catch(() => {})

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      setTypingStatusPribadi(chatId, myId, myName, false).catch(() => {})
    }, 2500)
  }

  async function handleKirim(e) {
    e.preventDefault()
    const clean = inputPesan.trim()
    if (!clean || sending || !chatId) return

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    setTypingStatusPribadi(chatId, myId, myName, false).catch(() => {})

    setSending(true)
    try {
      await sendPesanPribadi({
        chatId,
        pengirimId: myId,
        pengirimNisn: myNisn,
        penerimaId: targetId,
        penerimaNisn: targetNisn,
        pengirimNama: myName,
        pengirimFotoUrl: profileData?.fotoUrl || currentUser?.photoURL,
        pesan: clean,
      })
      setInputPesan("")
    } catch (err) {
      console.error("Gagal mengirim pesan chat pribadi:", err)
    } finally {
      setSending(false)
    }
  }

  function formatWaktu(createdAt) {
    if (!createdAt) return ""
    let d = null
    if (createdAt.toDate) d = createdAt.toDate()
    else if (createdAt.seconds) d = new Date(createdAt.seconds * 1000)
    else d = new Date(createdAt)

    if (isNaN(d.getTime())) return ""
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full h-[600px] max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal Chat Pribadi */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar
              fotoUrl={targetMurid?.fotoUrl}
              nama={targetMurid?.nama}
              size="sm"
              className="w-10 h-10 rounded-2xl ring-2 ring-blue-500/20 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base truncate">
                  {targetMurid?.nama}
                </h3>
                <span
                  className={cn(
                    "w-2 h-2 rounded-full shrink-0 transition-colors",
                    partnerPresence.isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                  )}
                  title={partnerPresence.isOnline ? "Online" : "Offline"}
                />
              </div>
              <p className="text-[11px] truncate flex items-center gap-1.5">
                <span
                  className={cn(
                    "font-medium",
                    partnerPresence.isOnline ? "text-emerald-600 font-bold" : "text-slate-500"
                  )}
                >
                  {typingPartnerName ? (
                    <span className="text-blue-600 font-bold animate-pulse">sedang mengetik...</span>
                  ) : (
                    partnerPresence.lastSeenText
                  )}
                </span>
                {targetMurid?.nisn && !targetMurid?.nisn.includes("-") && !targetMurid?.nisn.startsWith("http") && (
                  <span className="text-slate-400">• NISN: {targetMurid.nisn}</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full w-8 h-8 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Isi Pesan Chat */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-gradient-to-b from-slate-50/30 via-white to-slate-50/20">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mb-2 border border-indigo-100">
                <MessageCircle className="w-6 h-6" />
              </div>
              <p className="font-bold text-slate-700 text-xs sm:text-sm">
                Mulai Obrolan Pribadi dengan {targetMurid?.nama}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
                Pesan hanya dapat dilihat oleh kamu dan {targetMurid?.nama}.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = String(msg.pengirimId) === String(myId)

              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}
                >
                  {!isMe && (
                    <UserAvatar
                      fotoUrl={targetMurid?.fotoUrl}
                      nama={targetMurid?.nama}
                      size="xs"
                      className="w-7 h-7 rounded-xl ring-2 ring-slate-100 shrink-0 mb-0.5"
                    />
                  )}

                  <div className={`max-w-[75%] space-y-0.5 ${isMe ? "items-end" : "items-start"}`}>
                    <div
                      className={`p-3 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-2xs break-words ${
                        isMe
                          ? "bg-blue-600 text-white rounded-br-xs"
                          : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.pesan}</p>

                      <div
                        className={`text-[9px] mt-1 flex items-center justify-end ${
                          isMe ? "text-blue-100" : "text-slate-400"
                        }`}
                      >
                        <span>{formatWaktu(msg.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}

          {/* Indikator Animasi Lawan Bicara Sedang Mengetik... */}
          {typingPartnerName && (
            <div className="flex items-center gap-2 text-xs text-slate-500 italic py-1 animate-in fade-in">
              <span className="flex gap-1 items-center px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: "300ms" }} />
                <span className="ml-1 text-[11px]">
                  <b>{typingPartnerName}</b> sedang mengetik...
                </span>
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar Pesan */}
        <form onSubmit={handleKirim} className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0">
          <input
            type="text"
            value={inputPesan}
            onChange={handleInputChange}
            placeholder={`Tulis pesan pribadi untuk ${targetMurid?.nama || "teman"}...`}
            className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-100 border-0 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 placeholder:text-slate-400"
            maxLength={1000}
          />

          <Button
            type="submit"
            disabled={!inputPesan.trim() || sending}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-4 h-10 gap-1.5 font-bold text-xs shrink-0 shadow-sm shadow-blue-500/20"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kirim</span>
          </Button>
        </form>
      </div>
    </div>
  )
}
