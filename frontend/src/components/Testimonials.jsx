import { useState, useEffect, useRef } from 'react'
import '../styles/testimonials.css'

const BASE_URL = 'https://cvreview-api.duckdns.org'
const COLOURS = ['#1d4ed8','#0f6e56','#6366f1','#f59e0b','#ec4899','#ef4444','#10b981']

function getColour(name) {
  return COLOURS[(name?.charCodeAt(0) || 0) % COLOURS.length]
}

function TestimonialCard({ t, position }) {
  // position: 'left' | 'center' | 'right'
  return (
    <div className={`t-card t-card-${position}`}>
      <div className="t-card-inner">
        <div className="t-card-stars">{'★★★★★'}</div>
        <p className="t-card-quote">"{t.content}"</p>
        <div className="t-card-author">
          <div className="t-avatar" style={{ background: getColour(t.name) }}>
            {t.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="t-name">{t.name}</div>
            {t.role && <div className="t-role">{t.role}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

function SubmitForm({ onClose, onDone }) {
  const [form, setForm] = useState({ name: '', role: '', content: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const submit = async () => {
    if (!form.name.trim() || !form.content.trim()) return setError('Please fill in your name and testimonial.')
    try {
      setLoading(true); setError(null)
      const res = await fetch(`${BASE_URL}/testimonials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Submission failed.')
      setDone(true); onDone()
    } catch (e) {
      setError(e.message)
    } finally { setLoading(false) }
  }

  if (done) return (
    <div className="t-success">
      <div className="t-success-icon">✓</div>
      <p className="t-success-title">Thank you!</p>
      <p className="t-success-sub">Your testimonial has been submitted.</p>
      <button className="t-btn-ghost" onClick={onClose}>Close</button>
    </div>
  )

  return (
    <div className="t-form-wrap">
      <div className="t-form">
        <div className="t-form-header">
          <div>
            <p className="t-form-title">Share your experience</p>
            <p className="t-form-sub">Did CVIQ help you land a role? We'd love to hear about it.</p>
          </div>
          <button className="t-form-close" onClick={onClose}>✕</button>
        </div>
        <div className="t-form-grid">
          <div className="t-field">
            <label>Name</label>
            <input placeholder="Alex Johnson" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div className="t-field">
            <label>Role <span className="t-optional">(optional)</span></label>
            <input placeholder="Software Engineer at Google" value={form.role} onChange={e => set('role', e.target.value)} />
          </div>
        </div>
        <div className="t-field">
          <label>Your testimonial</label>
          <textarea rows={3} placeholder="Tell us how CVIQ helped you..." value={form.content} onChange={e => set('content', e.target.value)} />
        </div>
        {error && <p className="t-form-error">{error}</p>}
        <div className="t-form-actions">
          <button className="t-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="t-btn-primary" onClick={submit} disabled={loading || !form.name.trim() || !form.content.trim()}>
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [animDir, setAnimDir] = useState(null) // 'left' | 'right'
  const timerRef = useRef(null)

  const fetch_ = async () => {
    try {
      const res = await fetch(`${BASE_URL}/testimonials`)
      if (res.ok) setTestimonials(await res.json())
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetch_() }, [])

  const total = testimonials.length

  const startTimer = () => {
    clearInterval(timerRef.current)
    if (total > 1 && !showForm) {
      timerRef.current = setInterval(() => navigate('right'), 4000)
    }
  }

  useEffect(() => { startTimer(); return () => clearInterval(timerRef.current) }, [total, showForm])

  const navigate = (dir) => {
    setAnimDir(dir)
    setActive(p => dir === 'right' ? (p + 1) % total : (p - 1 + total) % total)
    startTimer()
  }

  const goTo = (i) => {
    setAnimDir(i > active ? 'right' : 'left')
    setActive(i)
    startTimer()
  }

  // Get indices for left, center, right cards
  const getIdx = (offset) => (active + offset + total) % total
  const positions = total >= 3
    ? [{ t: testimonials[getIdx(-1)], pos: 'left' }, { t: testimonials[getIdx(0)], pos: 'center' }, { t: testimonials[getIdx(1)], pos: 'right' }]
    : total === 2
    ? [{ t: testimonials[0], pos: active === 0 ? 'center' : 'left' }, { t: testimonials[1], pos: active === 1 ? 'center' : 'right' }]
    : total === 1
    ? [{ t: testimonials[0], pos: 'center' }]
    : []

  return (
    <section className="t-section">
      {/* Background accent */}
      <div className="t-bg-accent" />

      <div className="t-header">
        <div className="t-eyebrow">Success stories</div>
        <h2 className="t-h2">Helping people land roles</h2>
        <p className="t-sub">Real feedback from job seekers who used CVIQ to get hired.</p>
      </div>

      {loading && <p className="t-status">Loading...</p>}
      {!loading && total === 0 && <p className="t-status">No testimonials yet — be the first!</p>}

      {!loading && total > 0 && !showForm && (
        <div className="t-stage">
          {total > 1 && (
            <button className="t-arrow t-arrow-left" onClick={() => navigate('left')} aria-label="Previous">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          )}

          <div className="t-cards-wrap">
            {positions.map(({ t, pos }, i) => (
              <TestimonialCard key={`${t.id || t.name}-${pos}`} t={t} position={pos} />
            ))}
          </div>

          {total > 1 && (
            <button className="t-arrow t-arrow-right" onClick={() => navigate('right')} aria-label="Next">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          )}
        </div>
      )}

      {!loading && total > 1 && !showForm && (
        <div className="t-dots">
          {testimonials.map((_, i) => (
            <button key={i} className={`t-dot ${i === active ? 'active' : ''}`} onClick={() => goTo(i)} aria-label={`Go to ${i + 1}`} />
          ))}
        </div>
      )}

      {showForm
        ? <SubmitForm onClose={() => setShowForm(false)} onDone={() => { fetch_(); setShowForm(false) }} />
        : (
          <div className="t-cta">
            <p className="t-cta-text">Did CVIQ help you land a role?</p>
            <button className="t-share-btn" onClick={() => setShowForm(true)}>Share your experience →</button>
          </div>
        )
      }
    </section>
  )
}