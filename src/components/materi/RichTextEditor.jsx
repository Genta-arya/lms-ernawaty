import React, { useRef, useEffect, useState, useCallback } from "react"
import {
  Bold,
  Italic,
  Underline,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Table,
  Minus,
  RemoveFormatting,
  Undo,
  Redo,
  Code,
  Eye,
  FileText,
} from "lucide-react"
import { markdownToHtml, htmlToMarkdown } from "@/lib/editorUtils"

export function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Tulis isi materi di sini seperti di Microsoft Word...",
  minHeight = "240px",
  className = "",
}) {
  const editorRef = useRef(null)
  const [mode, setMode] = useState("visual") // 'visual' | 'markdown'
  const [internalMarkdown, setInternalMarkdown] = useState(value)
  const [activeTag, setActiveTag] = useState("p") // 'p' | 'h2' | 'h3' | 'blockquote'
  const isUpdatingRef = useRef(false)

  // Sync prop value ke editor visual saat pertama load atau berubah dari luar (misal: AI generator)
  useEffect(() => {
    if (value !== internalMarkdown) {
      setInternalMarkdown(value)
      if (editorRef.current && !isUpdatingRef.current) {
        editorRef.current.innerHTML = markdownToHtml(value)
      }
    }
  }, [value])

  // Inisialisasi awal editor visual
  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = markdownToHtml(value)
    }
  }, [])

  // Deteksi blok elemen aktif (P, H2, H3) saat kursor berpindah
  const detectActiveBlock = useCallback(() => {
    if (mode !== "visual" || !editorRef.current) return
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return

    let node = sel.anchorNode
    if (node && node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode
    }

    while (node && node !== editorRef.current) {
      const tag = node.tagName ? node.tagName.toLowerCase() : ""
      if (["h1", "h2", "h3", "p", "blockquote"].includes(tag)) {
        setActiveTag(tag === "h1" ? "h2" : tag)
        return
      }
      node = node.parentNode
    }
    setActiveTag("p")
  }, [mode])

  // Handler perubahan konten dari editor visual
  const handleVisualInput = useCallback(() => {
    if (!editorRef.current) return
    isUpdatingRef.current = true
    const html = editorRef.current.innerHTML
    const md = htmlToMarkdown(html)
    setInternalMarkdown(md)
    if (onChange) onChange(md)
    detectActiveBlock()
    setTimeout(() => {
      isUpdatingRef.current = false
    }, 50)
  }, [onChange, detectActiveBlock])

  // Handler perubahan langsung dari textarea Markdown
  const handleMarkdownChange = (e) => {
    const nextMd = e.target.value
    setInternalMarkdown(nextMd)
    if (onChange) onChange(nextMd)
  }

  // Toggle antara Mode Visual dan Mode Markdown dengan mempertahankan isi teks 100%
  const handleToggleMode = (newMode) => {
    if (newMode === mode) return

    if (newMode === "markdown") {
      // Saat beralih ke Markdown: konversi HTML visual terkini ke Markdown
      if (editorRef.current) {
        const md = htmlToMarkdown(editorRef.current.innerHTML)
        setInternalMarkdown(md)
        if (onChange) onChange(md)
      }
      setMode("markdown")
    } else {
      // Saat kembali ke Visual: render markdown terkini ke HTML
      if (editorRef.current) {
        editorRef.current.innerHTML = markdownToHtml(internalMarkdown)
      }
      setMode("visual")
    }
  }

  // Fungsi eksekusi perintah format teks (Word-style)
  const executeCommand = (command, val = null) => {
    if (mode !== "visual" || !editorRef.current) return
    editorRef.current.focus()
    document.execCommand(command, false, val)
    handleVisualInput()
  }

  // Sisipkan / Ubah Heading (H2, H3, atau Normal P)
  const handleFormatHeading = (tag) => {
    if (mode !== "visual" || !editorRef.current) return
    editorRef.current.focus()

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    let node = range.commonAncestorContainer
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode
    }

    // Cari elemen pembungkus paragraf saat ini di dalam editor
    let blockElement = null
    let curr = node
    while (curr && curr !== editorRef.current) {
      const t = curr.tagName ? curr.tagName.toUpperCase() : ""
      if (["P", "H1", "H2", "H3", "H4", "DIV", "BLOCKQUOTE", "LI"].includes(t)) {
        blockElement = curr
        break
      }
      curr = curr.parentNode
    }

    // Coba formatBlock bawaan browser terlebih dahulu
    let success = false
    try {
      success = document.execCommand("formatBlock", false, `<${tag}>`)
    } catch (_) {}

    if (!success) {
      try {
        success = document.execCommand("formatBlock", false, tag)
      } catch (_) {}
    }

    // Fallback transformasi DOM jika execCommand tidak merubah tag:
    if (blockElement && blockElement !== editorRef.current && blockElement.tagName.toLowerCase() !== tag.toLowerCase()) {
      if (blockElement.tagName.toUpperCase() !== "LI") {
        const replacement = document.createElement(tag)
        replacement.innerHTML = blockElement.innerHTML || "<br>"
        blockElement.parentNode.replaceChild(replacement, blockElement)

        // Pindahkan kursor ke dalam elemen yang baru diubah
        const newRange = document.createRange()
        newRange.selectNodeContents(replacement)
        newRange.collapse(false)
        selection.removeAllRanges()
        selection.addRange(newRange)
      }
    } else if (!blockElement) {
      if (!range.collapsed) {
        const newEl = document.createElement(tag)
        newEl.appendChild(range.extractContents())
        range.insertNode(newEl)
      } else {
        const newEl = document.createElement(tag)
        newEl.innerHTML = "<br>"
        range.insertNode(newEl)
        const newRange = document.createRange()
        newRange.setStart(newEl, 0)
        newRange.collapse(true)
        selection.removeAllRanges()
        selection.addRange(newRange)
      }
    }

    setActiveTag(tag)
    handleVisualInput()
  }

  // Sisipkan Kutipan / Box Teks Cerita Recount
  const handleInsertQuote = () => {
    if (mode !== "visual" || !editorRef.current) return
    editorRef.current.focus()
    const quoteHtml = `<blockquote class="border-l-4 border-blue-500 bg-blue-50/60 pl-3 py-1.5 my-2 italic text-slate-700 rounded-r">Kutipan atau contoh teks bacaan di sini...</blockquote><p><br></p>`
    document.execCommand("insertHTML", false, quoteHtml)
    handleVisualInput()
  }

  // Sisipkan Tabel Visual 2 Kolom x 3 Baris
  const handleInsertTable = () => {
    if (mode !== "visual" || !editorRef.current) return
    editorRef.current.focus()
    const tableHtml = `
      <table class="w-full border-collapse my-3 border border-slate-300">
        <thead>
          <tr class="bg-slate-100">
            <th class="border border-slate-300 px-3 py-2 text-left text-xs font-bold text-slate-800">Unsur / Kolom 1</th>
            <th class="border border-slate-300 px-3 py-2 text-left text-xs font-bold text-slate-800">Penjelasan / Kolom 2</th>
          </tr>
        </thead>
        <tbody>
          <tr class="bg-white">
            <td class="border border-slate-300 px-3 py-2 text-xs text-slate-700">Contoh 1</td>
            <td class="border border-slate-300 px-3 py-2 text-xs text-slate-700">Keterangan 1</td>
          </tr>
          <tr class="bg-slate-50">
            <td class="border border-slate-300 px-3 py-2 text-xs text-slate-700">Contoh 2</td>
            <td class="border border-slate-300 px-3 py-2 text-xs text-slate-700">Keterangan 2</td>
          </tr>
        </tbody>
      </table>
      <p><br></p>
    `
    document.execCommand("insertHTML", false, tableHtml)
    handleVisualInput()
  }

  return (
    <div className={`border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-xs focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all ${className}`}>
      {/* Toolbar Visual Word-Style */}
      <div className="bg-slate-50/90 border-b border-slate-200 p-2 flex flex-wrap items-center justify-between gap-1.5 text-slate-700">
        {/* Grup Tombol Formatting Teks */}
        <div className="flex flex-wrap items-center gap-1">
          {/* Format Paragraf / Heading */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-xs mr-1">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleFormatHeading("p")}
              disabled={mode !== "visual"}
              title="Teks Normal (Paragraf)"
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors disabled:opacity-40 ${
                activeTag === "p"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Normal
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleFormatHeading("h2")}
              disabled={mode !== "visual"}
              title="Judul Bab (Heading 2)"
              className={`px-2.5 py-1 text-xs font-black rounded-lg transition-colors disabled:opacity-40 flex items-center gap-1 ${
                activeTag === "h2"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-800 hover:bg-slate-100"
              }`}
            >
              <Heading2 className="w-3.5 h-3.5" />
              <span>H2</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleFormatHeading("h3")}
              disabled={mode !== "visual"}
              title="Subjudul (Heading 3)"
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors disabled:opacity-40 flex items-center gap-1 ${
                activeTag === "h3"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-800 hover:bg-slate-100"
              }`}
            >
              <Heading3 className="w-3.5 h-3.5" />
              <span>H3</span>
            </button>
          </div>

          {/* Gaya Huruf (B, I, U) */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-xs">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => executeCommand("bold")}
              disabled={mode !== "visual"}
              title="Tebal (Ctrl+B)"
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-40"
            >
              <Bold className="w-3.5 h-3.5 font-bold" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => executeCommand("italic")}
              disabled={mode !== "visual"}
              title="Miring (Ctrl+I)"
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-40"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => executeCommand("underline")}
              disabled={mode !== "visual"}
              title="Garis Bawah (Ctrl+U)"
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-40"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Daftar / List */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-xs">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => executeCommand("insertUnorderedList")}
              disabled={mode !== "visual"}
              title="Daftar Poin (Bullet List)"
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-40"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => executeCommand("insertOrderedList")}
              disabled={mode !== "visual"}
              title="Daftar Nomor (1, 2, 3)"
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-40"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Sisipkan Tabel & Kutipan */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-xs">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleInsertQuote}
              disabled={mode !== "visual"}
              title="Kotak Kutipan Teks Bacaan"
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-blue-600 disabled:opacity-40"
            >
              <Quote className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleInsertTable}
              disabled={mode !== "visual"}
              title="Sisipkan Tabel Otomatis"
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-emerald-600 disabled:opacity-40 flex items-center gap-1"
            >
              <Table className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold hidden sm:inline">Tabel</span>
            </button>
          </div>

          {/* Undo, Redo, Clear */}
          <div className="hidden sm:flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-xs">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => executeCommand("undo")}
              disabled={mode !== "visual"}
              title="Urungkan (Undo)"
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-40"
            >
              <Undo className="w-3.5 h-3.5 text-slate-500" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => executeCommand("redo")}
              disabled={mode !== "visual"}
              title="Ulangi (Redo)"
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-40"
            >
              <Redo className="w-3.5 h-3.5 text-slate-500" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => executeCommand("removeFormat")}
              disabled={mode !== "visual"}
              title="Hapus Format Teks"
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-rose-500 disabled:opacity-40"
            >
              <RemoveFormatting className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher: Mode Visual (Word) vs Mode Markdown */}
        <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl text-xs font-bold">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleToggleMode("visual")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
              mode === "visual"
                ? "bg-white text-primary shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Editor Visual (Word)</span>
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleToggleMode("markdown")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
              mode === "markdown"
                ? "bg-white text-primary shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Kode Markdown</span>
          </button>
        </div>
      </div>

      {/* Editor Content Area: Kedua mode tetap ada di DOM agar referensi dan teks tidak ter-reset */}
      <div
        className={mode === "visual" ? "p-4 sm:p-5 bg-white cursor-text" : "hidden"}
        style={{ minHeight }}
      >
        <div
          ref={editorRef}
          contentEditable
          onInput={handleVisualInput}
          onKeyUp={detectActiveBlock}
          onMouseUp={detectActiveBlock}
          onBlur={handleVisualInput}
          suppressContentEditableWarning
          className="rich-editor-content focus:outline-none text-sm leading-relaxed"
          style={{ minHeight: `calc(${minHeight} - 20px)` }}
        />
      </div>

      <div className={mode === "markdown" ? "p-3 bg-slate-900" : "hidden"}>
        <textarea
          rows={8}
          value={internalMarkdown}
          onChange={handleMarkdownChange}
          placeholder={placeholder}
          style={{ minHeight }}
          className="w-full bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed p-3 focus:outline-none resize-y rounded-xl"
        />
      </div>

      {/* Info Bar Bawah */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-blue-500" />
          <span>Mode {mode === "visual" ? "Visual WYSIWYG (Mudah & Cepat)" : "Raw Markdown Editor"}</span>
        </span>
        <span>Mendukung tabel, judul bab, dan kutipan teks cerita</span>
      </div>
    </div>
  )
}
