import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import '../styles/testimonials.css'

const BASE_URL = 'http://129.159.222.241'

function StarRating({ rating }) {
  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={i <= rating ? 'star filled' : 'star'}>★</span>
      ))}
    </div>
  )
}

function TestimonialCard({ testimonial, isActive }) {
  // Generate an avatar colour from the first letter of the name
  const colours = ['#1d4ed8', '#0f6e56', '#6366f1', '#f59e0b', '#ec4899', '#ef4444', '#10b981']
  const colourIndex = (testimonial.name?.charCodeAt(0) || 0) % colours.length

  return (
    <motion.div
      className={`testimonial-card ${isActive ? 'active' : ''}`}
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: isActive ? 1 : 0.45, scale: isActive ? 1 : 0.92, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <StarRating rating={5} />
      <p className="testimonial-message">"{testimonial.content}"</p>
      <div className="testimonial-author">
        <div className="testimonial-avatar" style={{ background: colours[colourIndex] }}>
          {testimonial.name?.charAt(0).toUpperCase()}
        </div>
        <div className="testimonial-author-info">
          <span className="testimonial-name">{testimonial.name}</span>
          {testimonial.role && <span className="testimonial-role">{testimonial.role}</span>}
        </div>
      </div>
    </motion.div>
  )
}

function SubmitForm({ onClose, onSubmitted }) {
  const [formData, setFormData] = useState({ name: '', role: '', content: '' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async () => {
    if (!formData.name.trim()) return setError('Please enter your name.')
    if (!formData.content.trim()) return setError('Please enter your testimonial.')

    try {
      setLoading(true)
      setError(null)

      // POST to the real testimonials endpoint
      const res = await fetch(`${BASE_URL}/testimonials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          role: formData.role,
          content: formData.content,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || 'Submission failed.')
      }

      setSubmitted(true)
      onSubmitted() // refresh the testimonials list after submitting
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <motion.div className="testimonial-form-success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <div className="success-icon">✓</div>
        <h3>Thank you!</h3>
        <p>Your testimonial has been submitted and will appear shortly.</p>
        <button className="btn-ghost-sm" onClick={onClose}>Close</button>
      </motion.div>
    )
  }

  return (
    <motion.div className="testimonial-form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <h3>Share your experience</h3>
      <p>Did CVIQ help you land a role? We'd love to hear about it.</p>
      <div className="testimonial-form-fields">
        <div className="testimonial-form-row">
          <div className="field">
            <label>Your name</label>
            <input name="name" type="text" placeholder="e.g. Alex Johnson" value={formData.name} onChange={handleChange} />
          </div>
          <div className="field">
            <label>Role <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>(optional)</span></label>
            <input name="role" type="text" placeholder="e.g. Software Engineer at Google" value={formData.role} onChange={handleChange} />
          </div>
        </div>
        <div className="field">
          <label>Your testimonial</label>
          <textarea name="content" rows={4} placeholder="Tell us how CVIQ helped you..." value={formData.content} onChange={handleChange} />
        </div>
      </div>

      {error && <p style={{ color: '#fca5a5', fontSize: '13px', marginTop: '8px' }}>{error}</p>}

      <div className="testimonial-form-actions">
        <button className="btn-ghost-sm" onClick={onClose}>Cancel</button>
        <button className="btn-dark" onClick={handleSubmit} disabled={loading || !formData.name.trim() || !formData.content.trim()}>
          {loading ? 'Submitting...' : 'Submit testimonial'}
        </button>
      </div>
    </motion.div>
  )
}

function Testimonials() {
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const intervalRef = useRef(null)

  const fetchTestimonials = async () => {
    try {
      const res = await fetch(`${BASE_URL}/testimonials`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setTestimonials(data)
    } catch {
      // If the API fails, show nothing — don't crash the homepage
      setTestimonials([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTestimonials() }, [])

  const total = testimonials.length

  const resetTimer = () => {
    clearInterval(intervalRef.current)
    if (!showForm && total > 1) {
      intervalRef.current = setInterval(() => {
        setActiveIndex(prev => (prev + 1) % total)
      }, 5000)
    }
  }

  useEffect(() => {
    if (showForm || total <= 1) { clearInterval(intervalRef.current); return }
    intervalRef.current = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % total)
    }, 5000)
    return () => clearInterval(intervalRef.current)
  }, [showForm, total])

  const goTo = (index) => { setActiveIndex(index); resetTimer() }
  const goPrev = () => { setActiveIndex(prev => (prev - 1 + total) % total); resetTimer() }
  const goNext = () => { setActiveIndex(prev => (prev + 1) % total); resetTimer() }

  return (
    <section className="testimonials-section" id="testimonials">
      <div className="section-label">Success stories</div>
      <h2 className="section-h2">Helping people land roles.</h2>
      <p className="section-sub">Real feedback from job seekers who improved their CV and got hired.</p>

      <AnimatePresence mode="wait">
        {showForm ? (
          <SubmitForm
            key="form"
            onClose={() => setShowForm(false)}
            onSubmitted={() => { fetchTestimonials(); setShowForm(false) }}
          />
        ) : (
          <motion.div key="carousel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

            {loading && (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>
                Loading testimonials...
              </div>
            )}

            {!loading && testimonials.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>
                No testimonials yet — be the first to share your experience!
              </div>
            )}

            {!loading && testimonials.length > 0 && (
              <>
                <div className="testimonials-carousel">
                  {testimonials.map((t, i) => (
                    <TestimonialCard key={t.id || i} testimonial={t} isActive={i === activeIndex} />
                  ))}
                </div>
                {total > 1 && (
                  <div className="testimonial-nav">
                    <button className="testimonial-arrow" onClick={goPrev} aria-label="Previous">←</button>
                    <div className="testimonial-dots">
                      {testimonials.map((_, i) => (
                        <button
                          key={i}
                          className={`testimonial-dot ${i === activeIndex ? 'active' : ''}`}
                          onClick={() => goTo(i)}
                          aria-label={`Go to testimonial ${i + 1}`}
                        />
                      ))}
                    </div>
                    <button className="testimonial-arrow" onClick={goNext} aria-label="Next">→</button>
                  </div>
                )}
              </>
            )}

            <div className="testimonial-cta">
              <button className="b-btn-primary" onClick={() => setShowForm(true)}>
                Share your experience →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

export default Testimonials