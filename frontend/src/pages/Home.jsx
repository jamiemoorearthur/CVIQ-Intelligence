import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Testimonials from '../components/Testimonials'
import { useAuth } from '../utils/useAuth'
import { supabase } from '../utils/supabase'
import '../styles/App.css'


function useCountUp(from, to, duration, start) {
  const [value, setValue] = useState(from)
  useEffect(() => {
    if (!start) return
    const steps = 40
    const stepTime = duration / steps
    const inc = (to - from) / steps
    let cur = from, step = 0
    const t = setInterval(() => {
      step++; cur += inc; setValue(Math.round(cur))
      if (step >= steps) { setValue(to); clearInterval(t) }
    }, stepTime)
    return () => clearInterval(t)
  }, [start])
  return value
}

function useScrollReveal(selector = '.reveal') {
  useEffect(() => {
    const els = document.querySelectorAll(selector)
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )
    els.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

function ScoreDemo() {
  const [started, setStarted] = useState(false)
  const recruiter = useCountUp(2, 8, 1600, started)
  const ats = useCountUp(38, 84, 1600, started)
  const overall = useCountUp(35, 79, 1600, started)

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), 700)
    return () => clearTimeout(t)
  }, [])

  const col = (n, threshold) => n >= threshold ? '#16a34a' : '#d97706'

  return (
    <div className="b-demo">
      <div className="b-demo-bar">
        <div className="b-demo-dots"><span /><span /><span /></div>
        <div className="b-demo-url">cviq.app/results</div>
        <div className="b-demo-live">
          <span className="b-demo-live-dot" />
          Live analysis running
        </div>
      </div>
      <div className="b-demo-hero-band">
        <div>
          <div className="b-demo-hero-eyebrow">
            <span className="b-demo-hero-dot" /> Review complete
          </div>
          <div className="b-demo-hero-title">Your CV results</div>
          <div className="b-demo-hero-sub">Here's how your CV performed against the job description.</div>
        </div>
        <button className="b-demo-view-btn">View my CV</button>
      </div>
      <div className="b-demo-body">
        <div className="b-demo-scores-row">
          <div className="b-demo-score-hero">
            <div className="b-demo-score-label">Recruiter Feedback Score</div>
            <div className="b-demo-score-num" style={{ color: col(recruiter, 7) }}>
              {recruiter}<span className="b-demo-score-denom">/10</span>
            </div>
            <div className="b-demo-track">
              <div className="b-demo-fill" style={{ width: `${recruiter * 10}%`, background: col(recruiter, 7) }} />
            </div>
          </div>
          <div className="b-demo-score-cell">
            <div className="b-demo-score-label">ATS Score</div>
            <div className="b-demo-score-sm" style={{ color: col(ats, 70) }}>{ats}%</div>
          </div>
          <div className="b-demo-score-cell">
            <div className="b-demo-score-label">Overall Score</div>
            <div className="b-demo-score-sm" style={{ color: col(overall, 70) }}>{overall}%</div>
          </div>
        </div>
        <div className="b-demo-lower">
          <div className="b-demo-keywords">
            <div className="b-demo-kw-label">Missing Keywords</div>
            <div className="b-demo-tags">
              {['React', 'TypeScript', 'CI/CD', 'Agile', 'REST APIs', 'Docker'].map(k => (
                <span key={k} className="b-demo-tag">{k}</span>
              ))}
            </div>
          </div>
          <div className="b-demo-bullet-wrap">
            <div className="b-demo-bullet-label">Suggested Rewrite</div>
            <div className="b-demo-before">Worked on backend features and helped fix bugs in the system</div>
            <div className="b-demo-arrow">↓ improved</div>
            <div className="b-demo-after">Engineered 3 backend microservices in FastAPI, reducing API latency by 40% and eliminating a critical data bottleneck</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CVBeforeAfter() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 400)
    return () => clearTimeout(t)
  }, [])

  const beforeBullets = [
    'Worked on backend systems and fixed bugs.',
    'Helped build web applications for clients.',
    'Responsible for improving app performance.',
    'Worked with React and various APIs.',
  ]

  const afterBullets = [
    'Engineered scalable FastAPI microservices reducing API latency by 42%.',
    'Built React dashboards serving 12,000+ active users.',
    'Improved application performance by 37% through targeted optimisation.',
    'Led cross-team integrations using Agile workflows and REST APIs.',
  ]

  return (
    <section className="b-section b-cv-transform reveal" id="transformation">
      <div className="b-blob b-blob-left" />
      <div className="b-section-head">
        <div className="b-label">AI Transformation</div>
        <h2 className="b-h2">See what CVIQ<br />does to your CV.</h2>
        <p className="b-section-sub">A real before and after. Same candidate, a completely different impression.</p>
      </div>
      <div className="b-cv-compare">

        <div className={`b-cv-doc b-cv-before ${show ? 'show' : ''}`}>
          <div className="b-cv-doc-header b-cv-doc-header-bad">
            <span className="b-cv-doc-status">Before CVIQ</span>
            <span className="b-cv-score-bad">ATS: 41%</span>
          </div>
          <div className="b-cv-doc-body">
            <div className="b-cv-name">Alex Johnson</div>
            <div className="b-cv-role">Software Engineer</div>
            <div className="b-cv-divider" />
            <div className="b-cv-section-title">Experience</div>
            <div className="b-cv-company">TechCorp · 2023–Present</div>
            {beforeBullets.map((b, i) => (
              <div key={i} className="b-cv-bullet b-cv-bullet-bad">
                <span className="b-cv-bullet-dot b-cv-bullet-dot-bad">•</span>
                {b}
              </div>
            ))}
            <div className="b-cv-divider" />
            <div className="b-cv-section-title">Skills</div>
            <div className="b-cv-skills">
              {['JavaScript', 'React', 'Python', 'SQL'].map(s => (
                <span key={s} className="b-cv-skill b-cv-skill-plain">{s}</span>
              ))}
            </div>
            <div className="b-cv-missing">
              <span className="b-cv-missing-label">Missing: Docker, CI/CD, TypeScript, Agile, REST APIs, Kubernetes</span>
            </div>
          </div>
        </div>

        <div className="b-cv-arrow-wrap">
          <div className={`b-cv-arrow ${show ? 'active' : ''}`}>→</div>
          <div className="b-cv-arrow-label">AI rewrites</div>
        </div>

        <div className={`b-cv-doc b-cv-after ${show ? 'show' : ''}`}>
          <div className="b-cv-doc-header b-cv-doc-header-good">
            <span className="b-cv-doc-status">After CVIQ</span>
            <span className="b-cv-score-good">ATS: 84% ↑</span>
          </div>
          <div className="b-cv-doc-body">
            <div className="b-cv-name">Alex Johnson</div>
            <div className="b-cv-role">Software Engineer</div>
            <div className="b-cv-divider" />
            <div className="b-cv-section-title">Experience</div>
            <div className="b-cv-company">TechCorp · 2023–Present</div>
            {afterBullets.map((b, i) => (
              <div key={i} className={`b-cv-bullet b-cv-bullet-good ${show ? 'show' : ''}`}
                style={{ transitionDelay: `${600 + i * 180}ms` }}>
                <span className="b-cv-bullet-dot b-cv-bullet-dot-good">✓</span>
                {b}
              </div>
            ))}
            <div className="b-cv-divider" />
            <div className="b-cv-section-title">Skills</div>
            <div className="b-cv-skills">
              {['TypeScript', 'React', 'Docker', 'CI/CD', 'REST APIs', 'Agile'].map((s, i) => (
                <span key={s} className={`b-cv-skill b-cv-skill-good ${show ? 'show' : ''}`}
                  style={{ transitionDelay: `${1200 + i * 100}ms` }}>{s}</span>
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const { user } = useAuth()

  useScrollReveal('.reveal')

  // After email confirmation, Supabase redirects back here with the user logged in.
  // If they came from a "Start Pro" CTA, send them straight to /pricing.
  useEffect(() => {
    if (user) {
      try {
        const plan = localStorage.getItem('cviq:intended-plan')
        if (plan === 'pro') {
          localStorage.removeItem('cviq:intended-plan')
          navigate('/pricing')
        }
      } catch {}
    }
  }, [user, navigate])

  return (
    <div className="b-page">

      {/* ── Nav ── */}
      <nav className="b-nav">
        <div className="b-nav-inner">
          <div className="b-logo" onClick={() => navigate('/')}>
            <span className="b-logo-text">CV<span className="b-logo-accent">IQ</span></span>
          </div>
          <div className={`b-nav-links ${menuOpen ? 'open' : ''}`}>
            <a href="#how-it-works">How it works</a>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div className="b-nav-right">
            {user ? (
              <>
                <button className="b-btn-ghost" onClick={() => navigate('/settings')}>Settings</button>
                <button className="b-btn-ghost" onClick={async () => { await supabase.auth.signOut(); navigate('/') }}>Sign out</button>
                <button className="b-btn-nav-cta" onClick={() => navigate('/upload')}>Go to upload</button>
              </>
            ) : (
              <>
                <button className="b-btn-ghost" onClick={() => navigate('/login')}>Log in</button>
                <button className="b-btn-nav-cta" onClick={() => navigate('/signup')}>Get started free</button>
              </>
            )}
          </div>
          <button className="b-burger" onClick={() => setMenuOpen(m => !m)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="b-hero">
        <div className="b-blob b-blob-hero" />
        <div className="b-hero-text">
          <div className="b-eyebrow">
            <span className="b-eyebrow-dot" />
            CV Intelligence · AI-Powered CV Reviews
          </div>
          <h1 className="b-h1">
            Stop losing jobs<br />to a <em>broken</em> CV.
          </h1>
          <p className="b-hero-sub">
            75% of CVs never reach a human. CVIQ tells you exactly what's wrong and rewrites it for you in seconds.
          </p>
          <div className="b-hero-actions">
            <button className="b-btn-primary" onClick={() => navigate('/upload')}>
              Analyse my CV →
            </button>
            <button className="b-btn-secondary" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>
              See how it works
            </button>
          </div>
        </div>
        <div className="b-hero-ui">
          <ScoreDemo />
        </div>
      </section>

      {/* ── How it works (3-step process — moved to top per advisor feedback) ── */}
      <section className="b-section b-hiw reveal" id="how-it-works">
        <div className="b-blob b-blob-right" />
        <div className="b-section-head">
          <div className="b-label">Getting started</div>
          <h2 className="b-h2">Your first result is<br />60 seconds away.</h2>
          <p className="b-section-sub">No account required. Upload your CV, paste the job description, get feedback.</p>
        </div>
        <div className="b-hiw-cards">

          <div className="b-hiw-card reveal">
            <div className="b-hiw-visual b-hiw-visual-1">
              <div className="b-vis-upload">
                <div className="b-vis-upload-box">
                  <div className="b-vis-upload-icon">📄</div>
                  <div className="b-vis-upload-text">CV_2026_Final.pdf</div>
                  <div className="b-vis-upload-sub">.pdf · 284 KB</div>
                  <div className="b-vis-upload-bar">
                    <div className="b-vis-upload-progress" />
                  </div>
                </div>
                <div className="b-vis-upload-badge">Uploaded & parsed</div>
              </div>
            </div>
            <div className="b-hiw-text">
              <div className="b-hiw-step">Step 01</div>
              <h3 className="b-hiw-title">Upload your CV</h3>
              <p className="b-hiw-body">Drag and drop your PDF or .docx. Our parser extracts and structures your content instantly.</p>
            </div>
          </div>

          <div className="b-hiw-card reveal" style={{ transitionDelay: '0.1s' }}>
            <div className="b-hiw-visual b-hiw-visual-2">
              <div className="b-vis-paste">
                <div className="b-vis-paste-box">
                  <div className="b-vis-paste-label">Job Description</div>
                  <div className="b-vis-paste-role">Software Engineer · Google</div>
                  <div className="b-vis-paste-line" style={{ width: '100%' }} />
                  <div className="b-vis-paste-line" style={{ width: '88%' }} />
                  <div className="b-vis-paste-line" style={{ width: '75%' }} />
                  <div className="b-vis-paste-chips">
                    <span>Python</span><span>React</span><span>AWS</span>
                  </div>
                </div>
                <div className="b-vis-paste-badge">47 keywords extracted</div>
              </div>
            </div>
            <div className="b-hiw-text">
              <div className="b-hiw-step">Step 02</div>
              <h3 className="b-hiw-title">Paste the job description</h3>
              <p className="b-hiw-body">Tell us exactly what role you're targeting. The more detail, the more precise your feedback.</p>
            </div>
          </div>

          <div className="b-hiw-card reveal" style={{ transitionDelay: '0.2s' }}>
            <div className="b-hiw-visual b-hiw-visual-3">
              <div className="b-vis-results">
                <div className="b-vis-score-card">
                  <div>
                    <div className="b-vis-score-sublabel">Recruiter Score</div>
                    <div className="b-vis-score-num">8<span style={{ fontSize: 14, fontWeight: 500, color: '#a78bfa' }}>/10</span></div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="b-vis-score-sublabel">ATS</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a', letterSpacing: '-0.5px' }}>84%</div>
                  </div>
                </div>
                <div className="b-vis-result-row">
                  <span className="b-vis-result-label">Strong experience section</span>
                </div>
                <div className="b-vis-result-row b-vis-result-warn">
                  <span className="b-vis-result-label">Add: Docker, Kubernetes</span>
                </div>
              </div>
            </div>
            <div className="b-hiw-text">
              <div className="b-hiw-step">Step 03</div>
              <h3 className="b-hiw-title">Get your review</h3>
              <p className="b-hiw-body">Scores, keyword gaps, strengths, weaknesses, and AI-rewritten bullets in seconds.</p>
            </div>
          </div>

        </div>
      </section>

      {/* ── CV Before/After ── */}
      <CVBeforeAfter />

      {/* ── Features ── */}
      <section className="b-section b-features reveal" id="features">
        <div className="b-section-head">
          <div className="b-label">What you get</div>
          <h2 className="b-h2">From upload to<br />offer ready.</h2>
          <p className="b-section-sub">Every tool you need to compete for the role.</p>
        </div>
        <div className="b-features-grid">
          {[
            { title: 'Recruiter Feedback Score', body: 'A 0 to 10 score based on how a real recruiter would evaluate your CV, with colour-coded feedback bands.' },
            { title: 'ATS Compatibility Check', body: 'See your ATS score and exactly which keywords are missing based on the job description.' },
            { title: 'AI Bullet Rewrites', body: 'Every weak bullet gets rewritten in the Action plus Impact format that recruiters look for.' },
            { title: 'Download Your Improved CV', body: 'Get your tailored CV as a PDF or .docx, ready to send with all improvements applied.' },
            { title: 'CV Preview with Feedback', body: 'View your CV side by side with the feedback so you know exactly which lines need changing.' },
            { title: 'Category Breakdown', body: 'Scores across six categories: impact, relevance, structure, clarity, ATS, and keywords.' },
          ].map((f, i) => (
            <div key={i} className="b-feature-card reveal" style={{ transitionDelay: `${i * 0.07}s` }}>
              <h3 className="b-feature-title">{f.title}</h3>
              <p className="b-feature-body">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

{/* ── Pricing ── */}
<section className="b-section b-pricing reveal" id="pricing">
  <div className="b-section-head">
    <div className="b-label">Pricing</div>
    <h2 className="b-h2">Start free.<br />Upgrade when you're ready.</h2>
    <p className="b-section-sub">No credit card required to get started.</p>
  </div>

  <div className="b-pricing-cards">
    <div className="b-pricing-card reveal">
      <div className="b-pricing-tier">Free</div>
      <div className="b-pricing-price">£0<span>/mo</span></div>
      <div className="b-pricing-desc">For job seekers getting started</div>
      <ul className="b-pricing-list">
        <li className="b-pricing-yes">CV score & ATS check</li>
        <li className="b-pricing-yes">Recruiter assessment</li>
        <li className="b-pricing-yes">Missing keyword detection</li>
        <li className="b-pricing-yes">Action plan & recommendations</li>
        <li className="b-pricing-no">AI bullet rewrites</li>
        <li className="b-pricing-no">CV editor & download</li>
      </ul>
      <button className="b-btn-outline-full" onClick={() => user ? navigate('/upload') : navigate('/signup')}>
        Get started free
      </button>
    </div>

    <div className="b-pricing-card b-pricing-pro reveal" style={{ transitionDelay: '0.1s' }}>
      <div className="b-pricing-badge">Most popular</div>
      <div className="b-pricing-tier">Pro</div>
      <div className="b-pricing-price">£15<span>/mo</span></div>
      <div className="b-pricing-desc">For long-term users</div>
      <ul className="b-pricing-list">
        <li className="b-pricing-yes">Everything in Free</li>
        <li className="b-pricing-yes">AI bullet point rewrites</li>
        <li className="b-pricing-yes">Line-by-line feedback</li>
        <li className="b-pricing-yes">AI profile summary rewrite</li>
        <li className="b-pricing-yes">CV editor with suggestions</li>
        <li className="b-pricing-yes">Unlimited Ask CVIQ chat</li>
      </ul>
      <button className="b-btn-primary-full" onClick={() => {
        if (user) { navigate('/pricing') }
        else { try { localStorage.setItem('cviq:intended-plan', 'pro') } catch {}; navigate('/signup') }
      }}>
        Start Pro - £15/mo →
      </button>
    </div>
  </div>
</section>

      {/* ── Testimonials ── */}
      <Testimonials />

      {/* ── Final CTA ── */}
      <section className="b-cta reveal">
        <div className="b-blob b-blob-centre" />
        <h2 className="b-cta-h2">Stop guessing.<br /><em>Start getting interviews.</em></h2>
        <p className="b-cta-sub">Upload your CV and get a full AI-powered review in under 60 seconds.</p>
        <button className="b-btn-primary" onClick={() => navigate('/upload')}>
          Analyse my CV for free →
        </button>
      </section>

      {/* ── Footer ── */}
      <footer className="b-footer">
        <div className="b-footer-inner">
          <div className="b-logo" onClick={() => navigate('/')}>
            <span className="b-logo-text">CV<span className="b-logo-accent">IQ</span></span>
          </div>
          <div className="b-footer-links">
            <a href="#how-it-works">How it works</a>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
          </div>
          <p className="b-footer-copy">© 2026 CVIQ Inc. · CV Intelligence ·</p>
        </div>
      </footer>
    </div>
  )
}