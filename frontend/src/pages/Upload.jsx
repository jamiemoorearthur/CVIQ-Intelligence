import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { reviewCV } from '../api/api'
import { useAuth } from '../utils/useAuth'
import { supabase } from '../utils/supabase'
import '../styles/Upload.css'

const STAGES = [
  { label: 'Parsing CV', weight: 0.15 },
  { label: 'Knowledge Base Matching', weight: 0.3 },
  { label: 'ATS Evaluation', weight: 0.25 },
  { label: 'Recruiter Feedback Generation', weight: 0.3 },
]
const ESTIMATED_TOTAL_MS = 60000

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function getErrorMessage(err) {
  if (!err.response) return { title: 'Connection problem', message: "We couldn't reach the server. Check your connection and try again." }
  const status = err.response.status
  const detail = err.response.data?.detail || ''
  const detailLower = detail.toLowerCase()
  if (status === 400) {
    if (detailLower.includes('unsupported file type')) return { title: 'Unsupported file type', message: 'Please upload your CV as a .pdf or .docx file.' }
    if (detailLower.includes('no text could be extracted')) return { title: "Couldn't read your CV", message: 'This looks like a scanned or image-based file. Please upload a text-based .pdf or .docx file instead.' }
    if (detailLower.includes('exceeds maximum length')) return { title: 'Content too long', message: detailLower.includes('cv') ? 'Your CV is too long. Please shorten it and try again.' : 'The job description is too long. Please shorten it and try again.' }
    if (detailLower.includes('disallowed content')) return { title: 'Content not allowed', message: "Your CV or job description contains content we can't process. Please review and try again." }
    return { title: 'Invalid submission', message: detail || 'Please check your CV and job description and try again.' }
  }
  if (status >= 500) return { title: 'Server error', message: 'Something went wrong on our end. Please try again in a moment.' }
  return { title: 'Something went wrong', message: detail || 'Please try again.' }
}

export default function Upload() {
  const [file, setFile] = useState(null)
  const [jobDescription, setJobDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeStage, setActiveStage] = useState(0)
  const [stageComplete, setStageComplete] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const navigate = useNavigate()
  const timerRef = useRef(null)
  const startRef = useRef(null)
  const { user, loading: authLoading } = useAuth()

  // ── Auth gate ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { state: { from: '/upload' } })
    }
  }, [user, authLoading, navigate])

  // ── Payment success banner ────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('payment') === 'success') {
      setPaymentSuccess(true)
      window.history.replaceState({}, '', '/upload')
    }
  }, [])

  // ── Loading stages ────────────────────────────────────────────────────────
  const cumulative = STAGES.reduce((acc, s, i) => {
    acc.push((acc[i - 1] || 0) + s.weight)
    return acc
  }, [])

  useEffect(() => {
    if (!loading) return
    startRef.current = Date.now()
    setActiveStage(0)
    setStageComplete(false)
    timerRef.current = setInterval(() => {
      const elapsedFraction = (Date.now() - startRef.current) / ESTIMATED_TOTAL_MS
      const cappedFraction = Math.min(elapsedFraction, cumulative[cumulative.length - 2] ?? 0.99)
      const idx = cumulative.findIndex(c => cappedFraction <= c)
      setActiveStage(idx === -1 ? STAGES.length - 1 : idx)
    }, 200)
    return () => clearInterval(timerRef.current)
  }, [loading])

  const markComplete = () => {
    clearInterval(timerRef.current)
    setActiveStage(STAGES.length - 1)
    setStageComplete(true)
  }

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) { setFile(acceptedFiles[0]); setError(null) }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
  })

  const handleSubmit = async () => {
    if (!file) return setError({ title: 'CV required', message: 'Please upload your CV first.' })
    if (!jobDescription.trim()) return setError({ title: 'Job description required', message: 'Please paste a job description.' })
    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const [result, fileBase64] = await Promise.all([
        reviewCV(file, jobDescription, token),
        fileToBase64(file),
      ])
      markComplete()
      await new Promise(r => setTimeout(r, 500))
      navigate('/results', {
        state: { result, cvFile: { base64: fileBase64, type: file.type, name: file.name }, jobDescription },
      })
    } catch (err) {
      setError(getErrorMessage(err))
      setLoading(false)
    }
  }

  if (authLoading) return null

  if (loading) {
    return (
      <div className="up-page">
        <nav className="up-nav">
          <div className="up-nav-inner">
            <div className="up-logo" onClick={() => navigate('/')}>
              <span className="up-logo-text">CV<span className="up-logo-accent">IQ</span></span>
            </div>
          </div>
        </nav>
        <div className="up-loading-wrap">
          <div className="up-eyebrow">Analysing</div>
          <h2 className="up-loading-h2">Reading your CV</h2>
          <p className="up-loading-sub">This usually takes under a minute. Matching your experience against the role.</p>
          <div className="up-progress-track">
            <div className="up-progress-fill" style={{ width: `${((activeStage + (stageComplete ? 1 : 0.5)) / STAGES.length) * 100}%` }} />
          </div>
          <ol className="up-stage-list">
            {STAGES.map((stage, i) => {
              const done = i < activeStage || (i === activeStage && stageComplete)
              const active = i === activeStage && !done
              return (
                <li key={stage.label} className={`up-stage ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
                  <span className="up-stage-marker">
                    {done ? '✓' : active ? <span className="up-stage-spinner" /> : <span className="up-stage-dot" />}
                  </span>
                  {i < STAGES.length - 1 && <span className={`up-stage-line ${done ? 'done' : ''}`} />}
                  <span className="up-stage-label">{stage.label}</span>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    )
  }

  return (
    <div className="up-page">
      {paymentSuccess && (
        <div className="up-success-banner">
          <span>You're now on Pro. All features are unlocked.</span>
          <button onClick={() => setPaymentSuccess(false)}>✕</button>
        </div>
      )}

      <nav className="up-nav">
        <div className="up-nav-inner">
          <div className="up-logo" onClick={() => navigate('/')}>
            <span className="up-logo-text">CV<span className="up-logo-accent">IQ</span></span>
          </div>
          <div className="up-nav-right">
            <button className="up-back" onClick={() => navigate('/settings')}>Settings</button>
            <button className="up-back" onClick={() => navigate('/')}>← Back to home</button>
            <button className="up-nav-signout" onClick={async () => { await supabase.auth.signOut(); navigate('/') }}>Sign out</button>
          </div>
        </div>
      </nav>

      <div className="up-container">
        <div className="up-header">
          <div className="up-eyebrow">CV Intelligence</div>
          <h1 className="up-h1">Analyse your CV</h1>
          <p className="up-sub">Upload your CV and paste the job description. We'll return structured feedback in under 60 seconds.</p>
        </div>

        <div className="up-form">
          <div className="up-privacy-note">
            <div className="up-privacy-icon">ℹ</div>
            <p>We recommend removing personal details such as your home address before uploading.</p>
          </div>

          <div {...getRootProps()} className={`up-dropzone ${isDragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}>
            <input {...getInputProps()} />
            <div className="up-dropzone-icon">📄</div>
            <p className="up-dropzone-title">{isDragActive ? 'Drop it here' : 'Drag and drop your CV here'}</p>
            <p className="up-dropzone-sub">or click to browse — .pdf or .docx</p>
            <button className="up-btn-choose" type="button">Choose file</button>
          </div>

          {file && (
            <div className="up-file-attached">
              <div className="up-file-icon">📎</div>
              <div className="up-file-info">
                <span className="up-file-name">{file.name}</span>
                <span className="up-file-size">{(file.size / 1024).toFixed(0)} KB — ready to analyse</span>
              </div>
              <button className="up-file-remove" onClick={() => setFile(null)}>✕</button>
            </div>
          )}

          <div className="up-field">
            <label htmlFor="job-desc" className="up-label">Job description</label>
            <textarea
              id="job-desc"
              className="up-textarea"
              placeholder="Paste the full job description here — the more detail the better..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={9}
            />
            <p className="up-field-hint">Include the full job description for the most accurate keyword matching and feedback.</p>
          </div>

          {error && (
            <div className="up-error">
              <strong className="up-error-title">{error.title}</strong>
              <span className="up-error-text">{error.message}</span>
            </div>
          )}

          <button className="up-btn-submit" onClick={handleSubmit} disabled={loading}>
            Analyse my CV →
          </button>
        </div>
      </div>

      <footer className="up-footer">
        <div className="up-footer-inner">
          <div className="up-logo" onClick={() => navigate('/')}>
            <span className="up-logo-text">CV<span className="up-logo-accent">IQ</span></span>
          </div>
          <p className="up-footer-copy">© 2026 CVIQ Inc. · CV Intelligence Platform</p>
        </div>
      </footer>
    </div>
  )
}
