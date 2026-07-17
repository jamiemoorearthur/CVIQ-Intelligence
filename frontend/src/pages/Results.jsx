import { useEffect, useState, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import CVModal from '../components/CVModal'
import { Sidebar, Hero } from '../components/ScoreCards'
import KeywordList from '../components/KeywordList'
import BulletRewrites from '../components/BulletRewrites'
import SectionRecommendations from '../components/SectionRecommendations'
import { ActionPlan, RecruiterView, SW, LineFeedback, Summary, ATSDeep } from '../components/ExtraComponents'
import ResultPanel from '../components/ResultPanel'
import { stagger } from '../utils/animations'
import { extractCvText, filterTrulyMissing } from '../utils/filterKeywords'
import { useAuth } from '../utils/useAuth'
import { supabase } from '../utils/supabase'
import '../styles/Results.css'

const RESULT_KEY = 'cviq:last-result'
const FILE_KEY = 'cviq:last-cv-file'
const JD_KEY = 'cviq:last-jd'

function ProGate({ feature }) {
  const navigate = useNavigate()
  return (
    <div className="pro-gate">
      <div className="pro-gate-icon">🔒</div>
      <div className="pro-gate-title">{feature} is a Pro feature</div>
      <p className="pro-gate-sub">Upgrade to unlock this and all other Pro features.</p>
      <button className="pro-gate-btn" onClick={() => navigate('/pricing')}>
        Upgrade to Pro — £15/mo
      </button>
    </div>
  )
}

function Locked({ feature, children }) {
  return (
    <div className="locked-wrap">
      <div className="locked-blur">{children}</div>
      <div className="locked-overlay">
        <ProGate feature={feature} />
      </div>
    </div>
  )
}

export default function Results() {
  const location = useLocation()
  const navigate = useNavigate()
  const [showCV, setShowCV] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [openCat, setOpenCat] = useState(null)
  const { user, isPro, loading: authLoading } = useAuth()

  const [result] = useState(() => {
    const n = location.state?.result
    if (n) return n
    try { return JSON.parse(sessionStorage.getItem(RESULT_KEY) || 'null') } catch { return null }
  })
  const [cvFile] = useState(() => {
    const n = location.state?.cvFile
    if (n) return n
    try { return JSON.parse(sessionStorage.getItem(FILE_KEY) || 'null') } catch { return null }
  })
  const [jobDescription] = useState(() => {
    const n = location.state?.jobDescription
    if (n) return n
    try { return sessionStorage.getItem(JD_KEY) || '' } catch { return '' }
  })
  const [cvText, setCvText] = useState('')
  const [filteredKeywords, setFilteredKeywords] = useState(result?.missing_keywords || [])

  const keywordsRef = useRef(null)
  const bulletsRef = useRef(null)
  const summaryRef = useRef(null)

  useEffect(() => {
    async function run() {
      if (!cvFile) return
      try {
        const text = await extractCvText(cvFile.base64, cvFile.type)
        setCvText(text)
        if (result?.missing_keywords?.length) setFilteredKeywords(filterTrulyMissing(result.missing_keywords, text))
      } catch {}
    }
    run()
  }, [cvFile, result])

  useEffect(() => { if (result) { try { sessionStorage.setItem(RESULT_KEY, JSON.stringify(result)) } catch {} } }, [result])
  useEffect(() => { if (cvFile) { try { sessionStorage.setItem(FILE_KEY, JSON.stringify(cvFile)) } catch {} } }, [cvFile])
  useEffect(() => { if (!authLoading && !user) navigate('/login') }, [user, authLoading, navigate])
  useEffect(() => { if (!result) navigate('/') }, [result, navigate])

  if (!result || authLoading) return null

  const scrollTo = (section) => {
    const map = { keywords: keywordsRef, bullets: bulletsRef, summary: summaryRef }
    map[section]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const hasRecruiterView = !!(result.recruiter_reasoning || result.recruiter_commentary)
  const hasSW = !!(result.strengths?.length || result.weaknesses?.length)
  const hasKeywords = filteredKeywords?.length > 0
  const hasSummary = !!result.summary_improvement
  const hasSectionRecs = result.section_recommendations?.length > 0
  const hasATSDeep = true

  const halfOrFull = (thisOne, otherOne) => `dash-cell ${thisOne && otherOne ? 'dash-half' : thisOne ? 'dash-full' : ''}`

  const FreeBanner = () => !isPro ? (
    <div className="free-tier-banner">
      <span>You're on the free plan — some features are locked.</span>
      <button onClick={() => navigate('/pricing')}>Upgrade to Pro →</button>
    </div>
  ) : null

  return (
    <div className="rp">
      <FreeBanner />

      <nav className="rp-nav">
        <div className="rp-nav-inner">
          <div className="rp-logo" onClick={() => navigate('/')}>CV<span className="rp-logo-iq">IQ</span></div>
          <div className="rp-nav-right">
            {isPro && <span className="rp-pro-badge">Pro</span>}
            <button className="rp-nav-ghost" onClick={() => setChatOpen(true)}>Ask CVIQ</button>
            <button className="rp-nav-ghost" onClick={() => navigate('/upload')}>Review another CV</button>
            <button className="rp-nav-ghost" onClick={async () => { await supabase.auth.signOut(); navigate('/') }}>Sign out</button>
          </div>
        </div>
      </nav>

      <div className="rp-layout">
        <Sidebar result={result} cvFile={cvFile} onOpenCV={() => setShowCV(true)} onOpenChat={() => setChatOpen(true)} openCat={openCat} setOpenCat={setOpenCat} />

        <motion.main className="rp-main" initial="hidden" animate="show" variants={stagger}>
          <Hero result={result} />

          <div className="dashboard-grid">
            <div className="dash-cell dash-full">
              <ActionPlan result={result} filteredKeywords={filteredKeywords} onScrollTo={scrollTo} />
            </div>

            {hasRecruiterView && (
              <div className={halfOrFull(hasRecruiterView, hasSW)}>
                <RecruiterView reasoning={result.recruiter_reasoning} commentary={result.recruiter_commentary} />
              </div>
            )}
            {hasSW && (
              <div className={halfOrFull(hasSW, hasRecruiterView)}>
                <SW strengths={result.strengths} weaknesses={result.weaknesses} />
              </div>
            )}

            {hasKeywords && (
              <div className={halfOrFull(hasKeywords, hasSummary)} ref={keywordsRef}>
                <KeywordList keywords={filteredKeywords} />
              </div>
            )}

            {hasSummary && (
              <div className={halfOrFull(hasSummary, hasKeywords)} ref={summaryRef}>
                {isPro
                  ? <Summary summaryImprovement={result.summary_improvement} />
                  : <Locked feature="AI-rewritten profile summary"><Summary summaryImprovement={result.summary_improvement} /></Locked>
                }
              </div>
            )}

            <div className="dash-cell dash-full" ref={bulletsRef}>
              {isPro
                ? <BulletRewrites bullets={result.suggested_bullets} jobDescription={jobDescription} />
                : <Locked feature="Bullet point rewrites"><BulletRewrites bullets={result.suggested_bullets} jobDescription={jobDescription} /></Locked>
              }
            </div>

            <div className="dash-cell dash-full">
              {isPro
                ? <LineFeedback lineFeedback={result.line_feedback} />
                : <Locked feature="Line-by-line feedback"><LineFeedback lineFeedback={result.line_feedback} /></Locked>
              }
            </div>

            {hasSectionRecs && (
              <div className={halfOrFull(hasSectionRecs, hasATSDeep)}>
                <SectionRecommendations recommendations={result.section_recommendations} />
              </div>
            )}

            <div className={halfOrFull(hasATSDeep, hasSectionRecs)}>
              {isPro
                ? <ATSDeep cvFile={cvFile} jobDescription={jobDescription} />
                : <Locked feature="Detailed ATS analysis"><ATSDeep cvFile={cvFile} jobDescription={jobDescription} /></Locked>
              }
            </div>
          </div>

          <div className="rp-bottom">
            <p className="rp-bottom-text">Applied the changes? Upload your updated CV to track your improvement.</p>
            <button className="rp-bottom-btn" onClick={() => navigate('/upload')}>Review another CV</button>
          </div>
        </motion.main>
      </div>

      <footer className="rp-footer">
        <div className="rp-footer-inner">
          <div className="rp-logo" onClick={() => navigate('/')}>CV<span className="rp-logo-iq">IQ</span></div>
          <p className="rp-footer-copy">© 2026 CVIQ Inc. · CV Intelligence Platform</p>
        </div>
      </footer>

      {showCV && cvFile && isPro && (
        <CVModal fileBase64={cvFile.base64} fileType={cvFile.type} fileName={cvFile.name} onClose={() => setShowCV(false)} missingKeywords={filteredKeywords} weakBullets={result.suggested_bullets || []} />
      )}

      {isPro && (
        <ResultPanel cvText={cvText} jobDescription={jobDescription} open={chatOpen} onClose={() => setChatOpen(false)} />
      )}
      {chatOpen && !isPro && (
        <div className="chat-backdrop" onClick={() => setChatOpen(false)}>
          <div className="chat-panel" onClick={e => e.stopPropagation()}>
            <div className="chat-top">
              <div><div className="chat-title">Ask CVIQ</div></div>
              <button className="chat-x" onClick={() => setChatOpen(false)}>✕</button>
            </div>
            <div className="chat-gate">
              <ProGate feature="Ask CVIQ" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}