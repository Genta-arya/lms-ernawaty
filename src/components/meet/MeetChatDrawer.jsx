import React, { useState, useEffect, useRef } from "react"
import {
  subscribeMeetMessages,
  sendMeetMessage,
} from "@/services/meet"
import { LinkifiedText } from "@/components/common/LinkifiedText"
import { Badge } from "@/components/ui/badge"
import { Send, X, MessageSquare, ShieldCheck } from "lucide-react"

export function MeetChatDrawer({
  channelName,
  userNama,
  isGuru,
  onClose,
}) {
  const [messages, setMessages] = useState([])
  const [inputVal, setInputVal] = useState("")
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!channelName) return
    const unsub = subscribeMeetMessages(channelName, (msgs) => {
      setMessages(msgs)
      setTimeout(() => {
        if (bottomRef.current) {
          bottomRef.current.scrollIntoView({ behavior: "smooth" })
        }
      }, 100)
    })
    return () => unsub()
  }, [channelName])

  async function handleSend(e) {
    e?.preventDefault()
    if (!inputVal.trim() || sending) return
    const textToSend = inputVal.trim()
    setInputVal("")
    setSending(true)
    try {
      await sendMeetMessage(channelName, {
        senderNama: userNama,
        senderRole: isGuru ? "guru" : "murid",
        text: textToSend,
      })
    } catch (err) {
      console.warn("Gagal kirim pesan meet:", err)
    } finally {
      setSending(false)
    }
  }

  function formatTime(timestamp) {
    if (!timestamp) return ""
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="fixed inset-x-2 sm:inset-auto top-14 sm:top-16 bottom-16 sm:bottom-20 sm:right-6 z-50 sm:w-96 bg-slate-900/98 sm:bg-slate-900/95 border border-slate-700/80 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-2xl backdrop-blur-2xl flex flex-col justify-between animate-in fade-in zoom-in-95">
      {/* Header Chat */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
            <MessageSquare className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-black text-white">Chat Sesi Meet</h3>
            <span className="text-[10px] text-slate-400">Pesan publik untuk semua peserta</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto space-y-3 py-3 pr-1 no-scrollbar my-1">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500 space-y-1">
            <MessageSquare className="w-8 h-8 opacity-30 mx-auto" />
            <p className="text-xs font-semibold">Belum ada obrolan</p>
            <p className="text-[10px] text-slate-600">
              Kirim pertanyaan atau tanggapan pertama Anda di sini.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.senderNama === userNama
            const isSenderGuru = m.senderRole === "guru"

            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[10px] font-bold text-slate-300">
                    {isMe ? "Anda" : m.senderNama}
                  </span>
                  {isSenderGuru && (
                    <Badge className="bg-blue-500/20 text-blue-300 border-none text-[8px] px-1.5 py-0 font-extrabold">
                      Guru
                    </Badge>
                  )}
                  <span className="text-[9px] text-slate-500">{formatTime(m.createdAt)}</span>
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-md ${
                    isMe
                      ? "bg-blue-600 text-white rounded-tr-none"
                      : "bg-slate-800 text-slate-200 border border-slate-700/80 rounded-tl-none"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">
                    <LinkifiedText
                      text={m.text}
                      linkClassName={isMe ? "text-sky-200 hover:text-white" : "text-sky-400 hover:text-sky-300"}
                    />
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={handleSend} className="pt-2 border-t border-slate-800 flex items-center gap-2">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Tulis pesan ke kelas..."
          className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!inputVal.trim() || sending}
          className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white transition-all shadow-md active:scale-95"
          title="Kirim Pesan"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  )
}

