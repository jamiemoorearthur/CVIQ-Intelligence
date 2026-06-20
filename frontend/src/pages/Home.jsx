import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/App.css'

function Home() {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-inner">
          <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <div className="logo-mark">IQ</div>
            <span className="logo-text">CV<span className="logo-accent">IQ</span></span>
          </div>
          <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
            <a href="#how-it-works">How it works</a>
            <a href="#features">Features</a>
          </div>
          <div className="nav-right">
            <button className="btn-dark" onClick={() => navigate('/upload')}>Get started free</button>
          </div>
          <button className="burger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-eyebrow">
            <span className="hero-eyebrow-dot" />
            Powered by GPT-4o & RAG
          </div>
          <h1>Your CV, reviewed by <span className="blue underline">AI</span> that gets hiring.</h1>
          <p className="hero-sub">Upload your CV and a job description. Get instant, structured feedback grounded in real hiring criteria — not generic advice.</p>
          <div className="hero-actions">
            <button className="btn-primary-lg" onClick={() => navigate('/upload')}>Analyse my CV →</button>
            <a href="#how-it-works" className="btn-outline-lg">See how it works</a>
          </div>
          <div className="hero-proof">
            <div className="proof-avatars">
              <div className="proof-avatar" style={{background:'#1d4ed8'}}>R</div>
              <div className="proof-avatar" style={{background:'#0f6e56'}}>J</div>
              <div className="proof-avatar" style={{background:'#6366f1'}}>A</div>
              <div className="proof-avatar" style={{background:'#f59e0b'}}>M</div>
            </div>
            <p className="proof-text">Trusted by <strong>2,400+</strong> job seekers this month</p>
          </div>
        </div>

        <div className="hero-visual">
          <div className="float-badge">
            <div className="float-dot" />
            Live analysis running
          </div>
          <div className="mock-window">
            <div className="mock-topbar">
              <div className="mock-dot" style={{background:'#ff5f57'}} />
              <div className="mock-dot" style={{background:'#ffbd2e'}} />
              <div className="mock-dot" style={{background:'#28ca41'}} />
              <div className="mock-url">cviq.ai/results</div>
            </div>
            <div className="mock-body">
              <div className="mock-scores">
                <div className="mock-score-card">
                  <div className="msc-label">Overall</div>
                  <div className="msc-num" style={{color:'#3b82f6'}}>75</div>
                  <div className="msc-bar"><div className="msc-fill" style={{width:'75%', background:'#3b82f6'}} /></div>
                </div>
                <div className="mock-score-card">
                  <div className="msc-label">ATS Score</div>
                  <div className="msc-num">70</div>
                  <div className="msc-bar"><div className="msc-fill" style={{width:'70%', background:'#1d9e75'}} /></div>
                </div>
                <div className="mock-score-card">
                  <div className="msc-label">Alignment</div>
                  <div className="msc-num" style={{fontSize:'13px', paddingTop:'3px'}}>Good ✓</div>
                  <div style={{marginTop:'6px'}}><span className="mk-tag">Solid match</span></div>
                </div>
              </div>
              <div>
                <div className="mk-label">Missing keywords</div>
                <div className="mk-tags">
                  <span className="mk-tag">Django</span>
                  <span className="mk-tag">PostgreSQL</span>
                  <span className="mk-tag">OAuth2</span>
                  <span className="mk-tag">Redis</span>
                </div>
              </div>
              <div className="mock-bullet">
                <div className="mk-label">Suggested rewrite</div>
                <div className="mb-before">Built AI chatbot using FastAPI</div>
                <div className="mb-arrow">↓ improved</div>
                <div className="mb-after">Built and deployed a FastAPI-based AI chatbot with Docker support, reducing customer queries by 22%.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logos */}
      <div className="logos-section">
        <span className="logos-label">Used by candidates at</span>
        <div className="logos-row">
          {['Google','Amazon','Meta','Deloitte','KPMG','Accenture'].map(l => (
            <span className="logo-item" key={l}>{l}</span>
          ))}
        </div>
      </div>

      {/* How it works */}
      <section className="how-it-works" id="how-it-works">
        <div className="section-label">The process</div>
        <h2 className="section-h2">From CV to offer, faster.</h2>
        <p className="section-sub">Three steps to feedback grounded in real hiring criteria and tailored to the exact role.</p>
        <div className="steps-grid">
          {[
            { num: 'Step 01', icon: '📄', title: 'Upload your CV', desc: 'Drag and drop your PDF. Our parser extracts and structures your content instantly.' },
            { num: 'Step 02', icon: '🎯', title: 'Paste the job description', desc: "Tell us exactly what role you're targeting. The more detail, the more precise your feedback." },
            { num: 'Step 03', icon: '⚡', title: 'Get your review', desc: 'Scores, keyword gaps, strengths, weaknesses, and AI-rewritten bullets — in seconds.' },
          ].map(s => (
            <div className="step-card" key={s.num}>
              <div className="step-num">{s.num}</div>
              <div className="step-icon">{s.icon}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="features" id="features">
        <div className="section-label">What you get</div>
        <h2 className="section-h2">Every metric that matters.</h2>
        <div className="features-grid">
          {[
            { icon: '📊', title: 'ATS & Overall Score', desc: 'Know exactly how your CV performs against automated screening before a human ever sees it.' },
            { icon: '🔑', title: 'Keyword Gap Analysis', desc: "See precisely which skills are missing from your CV for the role you're targeting." },
            { icon: '💪', title: 'Strengths & Weaknesses', desc: "A clear, honest breakdown of what's working and what's holding you back." },
            { icon: '✏️', title: 'AI Bullet Rewrites', desc: 'Before-and-after rewrites using the Action + Task + Result framework.' },
            { icon: '🎯', title: 'Role Alignment', desc: 'Understand how well your background genuinely matches the position.' },
            { icon: '⚡', title: 'Instant Results', desc: "Powered by GPT-4o and a RAG pipeline for feedback that's grounded and fast." },
          ].map(f => (
            <div className="feature-card" key={f.title}>
              <span className="feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-left">
          <h2>Stop guessing.<br />Start getting<br />interviews.</h2>
          <p>Join thousands of job seekers who've improved their CV with CVIQ. No sign up required.</p>
          <button className="btn-teal" onClick={() => navigate('/upload')}>Analyse my CV now →</button>
        </div>
        <div className="cta-right">
          {[
            { num: '2.4k', label: 'CVs reviewed this month across all experience levels' },
            { num: '94%', label: 'Of users improved their ATS score after implementing feedback' },
            { num: '30s', label: 'Average time to receive a full structured review' },
          ].map(s => (
            <div className="cta-stat" key={s.num}>
              <div className="cta-stat-num">{s.num}</div>
              <div className="cta-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

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

export default Home