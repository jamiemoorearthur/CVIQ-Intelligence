import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { reviewCV } from '../api/api'
import Loading from '../components/Loading'
import '../styles/Upload.css'

// Converts a File object into a base64 string so we can store it in
// sessionStorage and show a preview on the results page
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1]) // strip the "data:...;base64," prefix
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function getErrorMessage(err) {
  if (!err.response) {
    return {
      title: 'Connection problem',
      message: "We couldn't reach the server. Check your connection and try again.",
    }
  }
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
  if (status >= 500) return { title: 'Server error', message: 'Something went wrong on our end while analysing your CV. Please try again in a moment.' }
  return { title: 'Something went wrong', message: detail || 'Please try again.' }
}

function Upload() {
  const [file, setFile] = useState(null)
  const [jobDescription, setJobDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
      setError(null)
    }
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

      // Run the API call and the base64 conversion at the same time so we
      // don't add any extra waiting time for the user
      const [result, fileBase64] = await Promise.all([
        reviewCV(file, jobDescription),
        fileToBase64(file),
      ])

      // Pass both the results AND the file data to the results page
      navigate('/results', {
        state: {
          result,
          cvFile: { base64: fileBase64, type: file.type, name: file.name },
        },
      })
    } catch (err) {
      setError(getErrorMessage(err))
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="upload-page">
        <nav className="navbar">
          <div className="nav-inner">
            <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
              <div className="logo-mark">IQ</div>
              <span className="logo-text">CV<span className="logo-accent">IQ</span></span>
            </div>
          </div>
        </nav>
        <Loading />
      </div>
    )
  }

  return (
    <div className="upload-page">
      <nav className="navbar">
        <div className="nav-inner">
          <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <div className="logo-mark">IQ</div>
            <span className="logo-text">CV<span className="logo-accent">IQ</span></span>
          </div>
          <button className="back-btn" onClick={() => navigate('/')}>← Back to home</button>
        </div>
      </nav>

      <div className="upload-container">
        <div className="upload-header">
          <div className="hero-badge">✦ AI-Powered Review</div>
          <h1>Review your CV</h1>
          <p>Upload your CV and paste the job description. We'll analyse it and return structured feedback in seconds.</p>
        </div>

        <div className="upload-form">
          <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}>
            <input {...getInputProps()} />
            <div className="dropzone-icon"><span>📄</span></div>
            <p className="dropzone-title">{isDragActive ? 'Drop it here!' : 'Drag & drop your CV here'}</p>
            <p className="dropzone-sub">or click to browse — .pdf or .docx</p>
            <button className="btn-choose" type="button">Choose file</button>
          </div>

          {file && (
            <div className="file-attached">
              <span className="file-icon">📎</span>
              <div className="file-info">
                <span className="file-name">{file.name}</span>
                <span className="file-size">{(file.size / 1024).toFixed(0)} KB — ready to review</span>
              </div>
              <button className="file-remove" onClick={() => setFile(null)}>✕</button>
            </div>
          )}

          <div className="field">
            <label htmlFor="job-desc">Job description</label>
            <textarea
              id="job-desc"
              placeholder="Paste the full job description here — the more detail the better..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={8}
            />
            <p className="field-hint">Tip: include the full job description for the most accurate feedback & We recommend removing personal information such as your home address, phone number, and date of birth before uploading your CV. This helps protect your privacy while allowing our AI to provide accurate feedback. .</p>
          </div>
          
          {error && (
            <div className="error-msg">
              <strong className="error-msg-title">{error.title}</strong>
              <span className="error-msg-text">{error.message}</span>
            </div>
          )}

          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            Analyse my CV →
          </button>
        </div>
      </div>

      <footer className="footer">
        <div className="footer-inner">
          <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <div className="logo-mark">IQ</div>
            <span className="logo-text">CV<span className="logo-accent">IQ</span></span>
          </div>
          <p className="footer-text">Built with FastAPI, React & GPT-4o · © 2026 CVIQ</p>
        </div>
      </footer>
    </div>
  )
}

export default Upload
