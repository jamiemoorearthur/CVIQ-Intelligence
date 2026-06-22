import { useEffect, useState, useRef } from 'react'

// mammoth converts .docx files to HTML for the left preview panel
let mammoth = null
import('mammoth').then(m => { mammoth = m.default || m })

function CVModal({ fileBase64, fileType, fileName, onClose, missingKeywords = [], weakBullets = [] }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null)
  const [docxHtml, setDocxHtml] = useState(null)
  const [copiedIndex, setCopiedIndex] = useState(null)
  const blobUrlRef = useRef(null)

  // Stop the page behind from scrolling while the modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
      // Clean up the blob URL to free memory when the modal closes
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [])

  useEffect(() => {
    async function load() {
      try {
        // Convert base64 string back into raw binary bytes
        const binary = atob(fileBase64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

        if (fileType === 'application/pdf') {
          // Create a temporary URL the browser can load the PDF from
          const blob = new Blob([bytes], { type: 'application/pdf' })
          const url = URL.createObjectURL(blob)
          blobUrlRef.current = url
          setPdfBlobUrl(url)
        } else {
          // For .docx: convert to plain HTML
          if (!mammoth) await new Promise(r => setTimeout(r, 600))
          const arrayBuffer = bytes.buffer
          const result = await mammoth.convertToHtml({ arrayBuffer })
          setDocxHtml(result.value)
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

  const handleCopy = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(prev => prev === index ? null : prev), 1500)
    } catch {}
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  const isPdf = fileType === 'application/pdf'

  return (
    <div className="cv-modal-backdrop" onClick={handleBackdropClick}>
      <div className="cv-modal-wide">

        {/* Header */}
        <div className="cv-modal-header">
          <span className="cv-modal-title">📄 {fileName}</span>
          <button className="cv-modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Two-panel body */}
        <div className="cv-modal-split">

          {/* Left panel: clean CV preview */}
          <div className="cv-panel-left">
            {loading && (
              <div className="cv-modal-loading">
                <div className="loading-spinner" />
                <p>Loading preview...</p>
              </div>
            )}
            {error && <div className="cv-modal-error">{error}</div>}

            {/* PDF shown using the browser's own native viewer */}
            {!loading && !error && isPdf && pdfBlobUrl && (
              <iframe src={pdfBlobUrl} className="cv-modal-iframe" title="CV Preview" />
            )}

            {/* DOCX rendered as clean HTML */}
            {!loading && !error && !isPdf && docxHtml && (
              <div className="cv-modal-docx" dangerouslySetInnerHTML={{ __html: docxHtml }} />
            )}
          </div>

          {/* Right panel: feedback */}
          <div className="cv-panel-right">
            <div className="cv-panel-right-header">Feedback highlights</div>

            {missingKeywords.length > 0 && (
              <div className="cv-feedback-section">
                <div className="cv-feedback-section-label">Missing keywords</div>
                {missingKeywords.map((kw, i) => (
                  <div className="cv-feedback-item cv-feedback-keyword" key={i}>
                    <span className="cv-feedback-term">{kw}</span>
                    <span className="cv-feedback-hint">Add this to your CV</span>
                  </div>
                ))}
              </div>
            )}

            {weakBullets.length > 0 && (
              <div className="cv-feedback-section">
                <div className="cv-feedback-section-label">Weak bullets to rewrite</div>
                {weakBullets.map((bullet, i) => (
                  <div className="cv-feedback-item cv-feedback-bullet" key={i}>
                    {/* Original weak bullet */}
                    <span className="cv-feedback-original">{bullet.original}</span>

                    {/* Arrow pointing to the improved version */}
                    <div className="cv-bullet-arrow">
                      <div className="cv-bullet-arrow-line" />
                      <span className="cv-bullet-arrow-text">↓ improved</span>
                      <div className="cv-bullet-arrow-line" />
                    </div>

                    {/* Improved rewrite with copy button */}
                    <div className="cv-feedback-improved-wrap">
                      <span className="cv-feedback-improved">{bullet.improved}</span>
                      <button
                        className={`cv-copy-btn ${copiedIndex === i ? 'copied' : ''}`}
                        onClick={() => handleCopy(bullet.improved, i)}
                        type="button"
                      >
                        {copiedIndex === i ? '✓' : 'Copy'}
                      </button>
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