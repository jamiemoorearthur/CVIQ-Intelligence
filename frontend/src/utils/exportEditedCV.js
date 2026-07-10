import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import { jsPDF } from 'jspdf'


function htmlToBlocks(html) {
  const container = document.createElement('div')
  container.innerHTML = html
  const headingTags = { H1: 'h1', H2: 'h2', H3: 'h3', H4: 'h4' }
  const blocks = []

  function collectRuns(node, bold, italic) {
    const runs = []
    node.childNodes.forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        if (child.textContent) runs.push({ text: child.textContent, bold, italic })
        return
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return
      const tag = child.tagName
      const nextBold = bold || tag === 'STRONG' || tag === 'B'
      const nextItalic = italic || tag === 'EM' || tag === 'I'
      if (tag === 'BR') {
        runs.push({ text: '\n', bold, italic })
        return
      }
      runs.push(...collectRuns(child, nextBold, nextItalic))
    })
    return runs
  }

  function walkBlockLevel(node) {
    node.childNodes.forEach(child => {
      if (child.nodeType !== Node.ELEMENT_NODE) {
        if (child.nodeType === Node.TEXT_NODE && child.textContent.trim()) {
          blocks.push({ type: 'p', runs: [{ text: child.textContent, bold: false, italic: false }] })
        }
        return
      }
      const tag = child.tagName
      if (headingTags[tag]) {
        blocks.push({ type: headingTags[tag], runs: collectRuns(child, true, false) })
      } else if (tag === 'LI') {
        blocks.push({ type: 'li', runs: collectRuns(child, false, false) })
      } else if (tag === 'P' || tag === 'DIV') {
        const runs = collectRuns(child, false, false)
        const text = runs.map(r => r.text).join('').trim()
        if (!runs.some(r => r.text.trim())) return
      
        const allBold = runs.every(r => r.bold || !r.text.trim())
        const looksLikeHeading = allBold && text.length <= 45 && !/[.,;:]$/.test(text)
        blocks.push({ type: looksLikeHeading ? 'h3' : 'p', runs })
      } else if (tag === 'UL' || tag === 'OL') {
        walkBlockLevel(child)
      } else {
        walkBlockLevel(child)
      }
    })
  }
  walkBlockLevel(container)
  return blocks.filter(b => b.runs.some(r => r.text.trim()))
}

export async function exportEditedDocx(editedHtml, fileName = 'edited_cv.docx') {
  const blocks = htmlToBlocks(editedHtml)
  const headingLevelMap = { h1: HeadingLevel.HEADING_1, h2: HeadingLevel.HEADING_2, h3: HeadingLevel.HEADING_3, h4: HeadingLevel.HEADING_4 }

  const paragraphs = blocks.map(b => {
    const children = b.runs.map(r => new TextRun({ text: r.text, bold: r.bold, italics: r.italic }))
    if (headingLevelMap[b.type]) {
      return new Paragraph({ heading: headingLevelMap[b.type], children, spacing: { before: 200, after: 100 } })
    }
    if (b.type === 'li') {
      return new Paragraph({ bullet: { level: 0 }, children, spacing: { after: 60 } })
    }
    return new Paragraph({ children, spacing: { after: 100 } })
  })

  const doc = new Document({ sections: [{ children: paragraphs }] })
  const blob = await Packer.toBlob(doc)
  downloadBlob(blob, fileName)
}

export function exportEditedPdf(editedHtml, fileName = 'edited_cv.pdf') {
  const blocks = htmlToBlocks(editedHtml)
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const marginX = 48
  const maxWidth = doc.internal.pageSize.getWidth() - marginX * 2
  const pageHeight = doc.internal.pageSize.getHeight()
  let y = 56

  const sizeFor = { h1: 18, h2: 15, h3: 13, h4: 12, p: 11, li: 11 }
  const ensureRoom = (lineHeight) => { if (y > pageHeight - 48) { doc.addPage(); y = 56 } }

  blocks.forEach(b => {
    const text = b.runs.map(r => r.text).join('')
    const anyBold = b.runs.some(r => r.bold) || b.type.startsWith('h')
    const fontSize = sizeFor[b.type] || 11
    doc.setFont('helvetica', anyBold ? 'bold' : 'normal')
    doc.setFontSize(fontSize)
    const prefix = b.type === 'li' ? '•  ' : ''
    const indent = b.type === 'li' ? 14 : 0
    const lines = doc.splitTextToSize(prefix + text, maxWidth - indent)
    lines.forEach(line => {
      ensureRoom(fontSize + 6)
      doc.text(line, marginX + indent, y)
      y += fontSize + 6
    })
    y += b.type.startsWith('h') ? 6 : 4
  })
  doc.save(fileName)
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}