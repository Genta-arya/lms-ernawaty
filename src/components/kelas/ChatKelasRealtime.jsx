import React, { useState, useEffect, useRef } from "react"
import { useAuth } from "@/context/AuthContext"
import { sendPesanKelas, subscribePesanKelas } from "@/services/chatKelas"
import { UserAvatar } from "@/components/common/UserAvatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  MessageSquare,
  Send,
  Sparkles,
  Smile,
  ShieldCheck,
  Clock,
} from "lucide-react"

export function ChatKelasRealtime({ kelasId, kelasNama }) {
  const { currentUser, profileData } = useAuth()
  const [messages, setMessages] = useState([])
  const [inputPesan, setInputPesan] = useState("")
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)

  // Realtime subscription ke Firestore chatKelas
  useEffect(() => {
    if (!kelasId) return
    const unsubscribe = subscribePesanKelas(kelasId, (msgs) => {
      setMessages(msgs)
    })
    return () => unsubscribe()
  }, [kelasId])

  // Scroll otomatis ke pesan terbawah saat pesan baru masuk
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function handleKirim(e) {
    e.preventDefault()
    const clean = inputPesan.trim()
    if (!clean || sending || !kelasId) return

    setSending(true)
    try {
      await sendPesanKelas({
        kelasId,
        pengirimUid: currentUser?.uid,
        pengirimNisn: profileData?.nisn,
        pengirimNama: profileData?.nama || currentUser?.displayName || "Siswa",
        pengirimFotoUrl: profileData?.fotoUrl || currentUser?.photoURL,
        pesan: clean,
      })
      setInputPesan("")
    } catch (err) {
      console.error("Gagal mengirim pesan chat:", err)
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
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm flex flex-col h-[560px] overflow-hidden">
      {/* Header Chat Ruang Kelas */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <MessageSquare className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                Obrolan Kelas {kelasNama || "Saya"}
              </h3>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Online" />
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Ruang diskusi dan komunikasi belajar bersama teman sekelas
            </p>
          </div>
        </div>

        <Badge variant="outline" className="hidden sm:inline-flex bg-white text-blue-700 border-blue-200 text-xs font-bold gap-1 px-2.5 py-1 rounded-xl">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Realtime Chat</span>
        </Badge>
      </div>

      {/* Body Area Pesan Chat */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-gradient-to-b from-slate-50/40 via-white to-slate-50/30">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mb-2 border border-blue-100">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="font-bold text-slate-700 text-xs sm:text-sm">Belum ada percakapan di kelas ini</p>
            <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
              Mulai obrolan ramah sekarang untuk menyapa dan berdiskusi tugas dengan teman sekelas!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe =
              msg.pengirimUid === currentUser?.uid ||
              (profileData?.nisn && msg.pengirimNisn === profileData.nisn)

            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2.5 ${isMe ? "justify-end" : "justify-start"}`}
              >
                {!isMe && (
                  <UserAvatar
                    fotoUrl={msg.pengirimFotoUrl}
                    nama={msg.pengirimNama}
                    size="xs"
                    className="w-8 h-8 rounded-xl ring-2 ring-slate-100 shrink-0 mb-0.5"
                  />
                )}

                <div className={`max-w-[80%] sm:max-w-[70%] space-y-1 ${isMe ? "items-end" : "items-start"}`}>
                  {!isMe && (
                    <div className="flex items-center gap-1.5 px-1">
                      <span className="text-[11px] font-black text-slate-700 truncate">
                        {msg.pengirimNama}
                      </span>
                    </div>
                  )}

                  <div
                    className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-2xs break-words ${
                      isMe
                        ? "bg-blue-600 text-white rounded-br-xs"
                        : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.pesan}</p>

                    <div
                      className={`text-[9px] mt-1.5 flex items-center justify-end gap-1 ${
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
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar Kirim Pesan */}
      <form onSubmit={handleKirim} className="p-3 sm:p-4 bg-white border-t border-slate-100 flex items-center gap-2">
        <input
          type="text"
          value={inputPesan}
          onChange={(e) => setInputPesan(e.target.value)}
          placeholder={`Kirim pesan ke teman Kelas ${kelasNama || "Saya"}...`}
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
  )
}
