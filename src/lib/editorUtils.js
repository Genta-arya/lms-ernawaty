/**
 * Utilitas konversi dua arah HTML <-> Markdown untuk Visual Rich Text Editor
 */

export function markdownToHtml(md) {
  if (!md) return "<p><br></p>"

  let html = md.replace(/\r\n/g, "\n")

  // 1. Tables (Markdown Table to HTML Table)
  html = html.replace(/((?:\|(?:[^\r\n|]+\|)+[\r\n]+)(?:\|(?:[\s-:]+\|)+[\r\n]+)(?:\|(?:[^\r\n|]+\|)+[\r\n]*)+)/g, (match) => {
    const lines = match.trim().split("\n").map(l => l.trim()).filter(Boolean)
    if (lines.length < 2) return match

    const headerCols = lines[0].split("|").slice(1, -1).map(c => c.trim())
    // line 1 is separator |---|---|
    const bodyRows = lines.slice(2).map(line => line.split("|").slice(1, -1).map(c => c.trim()))

    let t = '<table class="w-full border-collapse my-3 border border-slate-300">'
    t += '<thead><tr class="bg-slate-100">'
    headerCols.forEach(col => {
      t += `<th class="border border-slate-300 px-3 py-2 text-left text-xs font-bold text-slate-800">${col}</th>`
    })
    t += '</tr></thead><tbody>'
    bodyRows.forEach((row, idx) => {
      const bg = idx % 2 === 0 ? "bg-white" : "bg-slate-50"
      t += `<tr class="${bg}">`
      row.forEach(cell => {
        t += `<td class="border border-slate-300 px-3 py-2 text-xs text-slate-700">${cell}</td>`
      })
      t += '</tr>'
    })
    t += '</tbody></table>'
    return t
  })

  // 2. Blockquotes
  html = html.replace(/^>\s*(.+)$/gm, '<blockquote class="border-l-4 border-blue-500 bg-blue-50/60 pl-3 py-1.5 my-2 italic text-slate-700 rounded-r">$1</blockquote>')

  // 3. Headings
  html = html.replace(/^###[ \t]+(.*)$/gim, '<h3 class="text-base font-bold text-slate-800 mt-3 mb-1">$1</h3>')
  html = html.replace(/^##[ \t]+(.*)$/gim, '<h2 class="text-lg font-bold text-slate-900 mt-4 mb-2 pb-1 border-b border-slate-200">$1</h2>')
  html = html.replace(/^#[ \t]+(.*)$/gim, '<h1 class="text-xl font-black text-slate-900 mt-5 mb-2">$1</h1>')

  // 4. Bold & Italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>')
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')
  html = html.replace(/_(.*?)_/g, '<em>$1</em>')

  // 5. Unordered List (- or *)
  html = html.replace(/^\s*[-*]\s+(.*)$/gm, '<li class="ml-4 list-disc">$1</li>')
  // Group adjacent <li> into <ul>
  html = html.replace(/((?:<li class="ml-4 list-disc">.*?<\/li>\s*)+)/g, '<ul class="my-2 space-y-1">$1</ul>')

  // 6. Ordered List (1. )
  html = html.replace(/^\s*(\d+)\.\s+(.*)$/gm, '<li class="ml-4 list-decimal" value="$1">$2</li>')
  // Group adjacent <li> into <ol>
  html = html.replace(/((?:<li class="ml-4 list-decimal".*?<\/li>\s*)+)/g, '<ol class="my-2 space-y-1">$1</ol>')

  // 7. Paragraphs: split by double newlines if not already inside block tag
  const blocks = html.split(/\n\s*\n/)
  html = blocks.map(block => {
    const trimmed = block.trim()
    if (!trimmed) return ""
    if (trimmed.startsWith("<h") || trimmed.startsWith("<table") || trimmed.startsWith("<blockquote") || trimmed.startsWith("<ul") || trimmed.startsWith("<ol")) {
      return trimmed
    }
    return `<p class="mb-2 leading-relaxed">${trimmed.replace(/\n/g, "<br>")}</p>`
  }).join("\n")

  return html
}

export function htmlToMarkdown(html) {
  if (!html) return ""

  const temp = document.createElement("div")
  temp.innerHTML = html

  function parseNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return ""
    }

    const tag = node.tagName.toLowerCase()
    let inner = ""
    for (const child of node.childNodes) {
      inner += parseNode(child)
    }

    switch (tag) {
      case "h1":
        return `\n\n# ${inner.trim()}\n\n`
      case "h2":
        return `\n\n## ${inner.trim()}\n\n`
      case "h3":
        return `\n\n### ${inner.trim()}\n\n`
      case "strong":
      case "b":
        return `**${inner}**`
      case "em":
      case "i":
        return `*${inner}*`
      case "u":
        return `<u>${inner}</u>`
      case "blockquote":
        return `\n\n> ${inner.trim()}\n\n`
      case "ul":
        return `\n\n${inner.trim()}\n\n`
      case "ol":
        return `\n\n${inner.trim()}\n\n`
      case "li": {
        const isOrdered = node.parentElement && node.parentElement.tagName.toLowerCase() === "ol"
        if (isOrdered) {
          const index = Array.from(node.parentElement.children).indexOf(node) + 1
          return `${index}. ${inner.trim()}\n`
        }
        return `- ${inner.trim()}\n`
      }
      case "table": {
        const rows = Array.from(node.querySelectorAll("tr"))
        if (rows.length === 0) return ""

        let mdTable = "\n\n"
        const headerRow = rows[0]
        const headerCols = Array.from(headerRow.querySelectorAll("th, td")).map(c => c.textContent.trim().replace(/\|/g, "\\|"))
        mdTable += `| ${headerCols.join(" | ")} |\n`
        mdTable += `| ${headerCols.map(() => "---").join(" | ")} |\n`

        for (let r = 1; r < rows.length; r++) {
          const cols = Array.from(rows[r].querySelectorAll("td, th")).map(c => c.textContent.trim().replace(/\|/g, "\\|"))
          mdTable += `| ${cols.join(" | ")} |\n`
        }
        mdTable += "\n"
        return mdTable
      }
      case "p":
        return `\n\n${inner.trim()}\n\n`
      case "div":
        return `\n${inner}\n`
      case "br":
        return "\n"
      default:
        return inner
    }
  }

  let result = parseNode(temp)
  // Clean multiple blank lines
  result = result.replace(/\n{3,}/g, "\n\n").trim()
  return result
}

