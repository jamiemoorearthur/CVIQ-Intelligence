import { useEffect, useState, useRef } from 'react'
import { exportEditedDocx, exportEditedPdf } from '../utils/exportEditedCV'

let mammoth = null
import('mammoth').then(m => { mammoth = m.default || m })

function CVModal({ fileBase64, fileType, fileName, onClose, missingKeywords = [], weakBullets = [] }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editableHtml, setEditableHtml] = useState(null)
  const [copiedIndex, setCopiedIndex] = useState(null)
  const [appliedKeywords, setAppliedKeywords] = useState(new Set())
  const [appliedBullets, setAppliedBullets] = useState(new Set())
  const [dirty, setDirty] = useState(false)
  const [exporting, setExporting] = useState(null) // 'docx' | 'pdf' | null
  const editorRef = useRef(null)
  const isPdf = fileType === 'application/pdf'
  const exportFormat = isPdf ? 'pdf' : 'docx'

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const base64ToBytes = (b64) => {
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  }

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  // Load source content, normalized to editable HTML either way.
  // PDFs can't be edited in place as a real PDF, so we extract text into
  // an editable rich-text surface; the PDF export re-renders that text.
  useEffect(() => {
    async function load() {
      try {
        const bytes = base64ToBytes(fileBase64)
        if (isPdf) {
          const pdfjsLib = await import('pdfjs-dist')
          pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
            'pdfjs-dist/build/pdf.worker.min.js', import.meta.url
          ).toString()
          const doc = await pdfjsLib.getDocument({ data: bytes }).promise
          let html = ''
          for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i)
            const content = await page.getTextContent()
            const text = content.items.map(item => item.str).join(' ')
            html += `<p>${escapeHtml(text)}</p>`
          }
          setEditableHtml(html)
        } else {
          if (!mammoth) await new Promise(r => setTimeout(r, 400))
          const result = await mammoth.convertToHtml({ arrayBuffer: bytes.buffer })
          setEditableHtml(result.value)
        }
      } catch (e) {
        console.error(e)
        setError("Couldn't load the CV preview.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [fileBase64, fileType])

  const handleEditorInput = () => {
    if (!editorRef.current) return
    setEditableHtml(editorRef.current.innerHTML)
    setDirty(true)
  }

  // Briefly highlight a node after a fix is applied so the change is visible.
  const flashNode = (node) => {
    node.classList.add('cv-flash')
    setTimeout(() => node.classList.remove('cv-flash'), 1600)
  }


  const findSkillsSectionNode = () => {
    if (!editorRef.current) return null
    const candidates = editorRef.current.querySelectorAll('p, h1, h2, h3, h4, strong, b, li')
    const skillsPattern = /^(technical\s+)?skills?( & tools)?|technologies|core competencies$/i
    for (const el of candidates) {
      const text = el.textContent.trim()
      if (skillsPattern.test(text)) {
        // Prefer inserting after the last <li> or <p> that follows this
        // heading and precedes the next heading-like block.
        let node = el.closest('p,h1,h2,h3,h4') || el
        let sibling = node.nextElementSibling
        let lastInSection = node
        while (sibling && !/^H[1-4]$/.test(sibling.tagName)) {
          lastInSection = sibling
          sibling = sibling.nextElementSibling
        }
        return lastInSection
      }
    }
    return null
  }

  // One-click apply: missing keyword -> inserted into a detected Skills
  // section if one exists, otherwise appended under a clearly-labeled
  // "Additional Skills" block at the end; weak bullet -> find-and-replace
  // the original bullet text in place.
  const applyKeyword = (kw, i) => {
    if (!editorRef.current) return
    const anchor = findSkillsSectionNode()
    const chip = document.createElement('span')
    chip.textContent = kw
    if (anchor) {
      // Append as ", keyword" onto the last line of the existing section
      // if it reads like a comma-separated skill list, otherwise as a
      // new bullet/line right after it.
      if (anchor.tagName === 'LI' || /,/.test(anchor.textContent)) {
        anchor.appendChild(document.createTextNode(', '))
        anchor.appendChild(chip)
        flashNode(anchor)
      } else {
        const li = document.createElement('p')
        li.appendChild(chip)
        anchor.insertAdjacentElement('afterend', li)
        flashNode(li)
      }
    } else {
      let addBlock = editorRef.current.querySelector('[data-added-skills]')
      if (!addBlock) {
        const heading = document.createElement('p')
        heading.innerHTML = '<strong>Additional Skills</strong>'
        addBlock = document.createElement('p')
        addBlock.setAttribute('data-added-skills', 'true')
        editorRef.current.appendChild(heading)
        editorRef.current.appendChild(addBlock)
      } else {
        addBlock.appendChild(document.createTextNode(', '))
      }
      addBlock.appendChild(chip)
      flashNode(addBlock)
    }
    setEditableHtml(editorRef.current.innerHTML)
    setAppliedKeywords(prev => new Set(prev).add(i))
    setDirty(true)
  }

  const normalize = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase()

  const applyBullet = (bullet, i) => {
    if (!editorRef.current) return
    const target = normalize(bullet.original)
    const blocks = Array.from(editorRef.current.querySelectorAll('p, li, div, h1, h2, h3, h4'))
      .filter(el => el.children.length === 0 || el.tagName === 'LI') // leaf-ish blocks only, avoid matching wrapper containers

    let match = blocks.find(el => normalize(el.textContent).includes(target))


    if (!match) {
      const prefix = target.split(' ').slice(0, 6).join(' ')
      if (prefix.length > 8) match = blocks.find(el => normalize(el.textContent).includes(prefix))
    }

    if (!match) {
      alert("Couldn't find that exact bullet in the document — it may have been edited already, or the wording doesn't match closely enough. You can copy the rewrite and paste it manually.")
      return
    }

  
    const escaped = bullet.original.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')
    const re = new RegExp(escaped, 'i')
    if (re.test(match.textContent)) {
      match.textContent = match.textContent.replace(re, bullet.improved)
    } else {
    
      match.textContent = bullet.improved
    }
    flashNode(match)
    setEditableHtml(editorRef.current.innerHTML)
    setAppliedBullets(prev => new Set(prev).add(i))
    setDirty(true)
  }

  const handleCopy = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(prev => prev === index ? null : prev), 1500)
    } catch {}
  }

  const handleExport = async () => {
    if (!editorRef.current) return
    setExporting(exportFormat)
    try {
      const html = editorRef.current.innerHTML
      if (exportFormat === 'docx') {
        await exportEditedDocx(html, fileName.replace(/\.[^.]+$/, '') + '_edited.docx')
      } else {
        exportEditedPdf(html, fileName.replace(/\.[^.]+$/, '') + '_edited.pdf')
      }
      setDirty(false)
    } catch (e) {
      console.error(e)
    } finally {
      setExporting(null)
    }
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="cv-modal-backdrop" onClick={handleBackdropClick}>
      <div className="cv-modal-wide">
        <div className="cv-modal-header">
          <span className="cv-modal-title">📄 {fileName}{dirty && <span className="cv-dirty-dot" title="Unsaved changes" />}</span>
          <div className="cv-modal-header-actions">
            <button className="cv-header-btn cv-header-btn-primary" onClick={handleExport} disabled={!!exporting}>
              {exporting ? 'Exporting…' : `Export .${exportFormat}`}
            </button>
            <button className="cv-modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="cv-modal-split">
          <div className="cv-panel-left">
            {loading && (
              <div className="cv-modal-loading">
                <div className="loading-spinner" />
                <p>Loading preview...</p>
              </div>
            )}
            {error && <div className="cv-modal-error">{error}</div>}

            {!loading && !error && editableHtml !== null && (
              <div
                ref={editorRef}
                className="cv-modal-docx cv-modal-editable"
                contentEditable
                suppressContentEditableWarning
                onInput={handleEditorInput}
                dangerouslySetInnerHTML={{ __html: editableHtml }}
              />
            )}
          </div>

          <div className="cv-panel-right">
            <div className="cv-panel-right-header">Feedback highlights</div>
            {isPdf && (
              <p className="cv-pdf-note">PDFs are edited as extracted text — formatting/layout from the original file isn't preserved in this view. Export re-flows the edited text into a new PDF.</p>
            )}

            {missingKeywords.length > 0 && (
              <div className="cv-feedback-section">
                <div className="cv-feedback-section-label">Missing keywords</div>
                {missingKeywords.map((kw, i) => (
                  <div className="cv-feedback-item cv-feedback-keyword" key={i}>
                    <span className="cv-feedback-term">{kw}</span>
                    <button
                      className={`cv-apply-btn ${appliedKeywords.has(i) ? 'applied' : ''}`}
                      onClick={() => applyKeyword(kw, i)}
                      disabled={appliedKeywords.has(i)}
                    >
                      {appliedKeywords.has(i) ? '✓ Applied' : 'Apply fix'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {weakBullets.length > 0 && (
              <div className="cv-feedback-section">
                <div className="cv-feedback-section-label">Weak bullets to rewrite</div>
                {weakBullets.map((bullet, i) => (
                  <div className="cv-feedback-item cv-feedback-bullet" key={i}>
                    <span className="cv-feedback-original">{bullet.original}</span>
                    <div className="cv-bullet-arrow">
                      <div className="cv-bullet-arrow-line" />
                      <span className="cv-bullet-arrow-text">↓ improved</span>
                      <div className="cv-bullet-arrow-line" />
                    </div>
                    <div className="cv-feedback-improved-wrap">
                      <span className="cv-feedback-improved">{bullet.improved}</span>
                      <div className="cv-feedback-btn-group">
                        <button
                          className={`cv-copy-btn ${copiedIndex === i ? 'copied' : ''}`}
                          onClick={() => handleCopy(bullet.improved, i)}
                          type="button"
                        >
                          {copiedIndex === i ? '✓' : 'Copy'}
                        </button>
                        <button
                          className={`cv-apply-btn ${appliedBullets.has(i) ? 'applied' : ''}`}
                          onClick={() => applyBullet(bullet, i)}
                          disabled={appliedBullets.has(i)}
                        >
                          {appliedBullets.has(i) ? '✓ Applied' : 'Apply fix'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && missingKeywords.length === 0 && weakBullets.length === 0 && (
              <p className="cv-panel-empty">No specific feedback to show.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CVModal