import { useState } from 'react'
import { motion } from 'framer-motion'
import { fade } from '../utils/animations'
import { atsPreview } from '../api/api'
import Loading from './Loading'

export function ActionPlan({ result, filteredKeywords, onScrollTo }) {
  const actions = []
  if (filteredKeywords?.length) actions.push({ priority: 'high', title: `Add ${filteredKeywords.length} missing keyword${filteredKeywords.length > 1 ? 's' : ''}`, detail: 'These terms appear in the job description but not your CV.', impact: `Estimated ATS improvement: +${Math.min(filteredKeywords.length * 2, 20)}%`, cta: 'View Keywords', section: 'keywords' })
  if (result.suggested_bullets?.length) actions.push({ priority: 'medium', title: `Rewrite ${result.suggested_bullets.length} weak bullet point${result.suggested_bullets.length > 1 ? 's' : ''}`, detail: 'Your bullets lack measurable impact and strong action verbs.', impact: 'Improves recruiter score significantly.', cta: 'Start Rewriting', section: 'bullets' })
  if (result.summary_improvement) actions.push({ priority: 'low', title: 'Replace your professional summary', detail: 'Your current summary is too generic for this role.', impact: 'Makes a stronger first impression.', cta: 'View Rewrite', section: 'summary' })
  if (!actions.length) return null
  const colorMap = { high: '#ef4444', medium: '#d97706', low: '#f59e0b' }
  const bgMap = { high: '#fef2f2', medium: '#fffbeb', low: '#fefce8' }
  const borderMap = { high: '#fecaca', medium: '#fde68a', low: '#fef08a' }
  return (
    <motion.section className="section" variants={fade}>
      <div className="section-label">Priority Actions</div>
      <h2 className="section-h2">What to do first</h2>
      <p className="section-sub">Complete these in order for the biggest improvement to your score.</p>
      <div className="action-plan">
        {actions.map((a, i) => (
          <div key={i} className="action-item" style={{ background: bgMap[a.priority], borderColor: borderMap[a.priority] }}>
            <div className="action-item-left">
              <div className="action-num" style={{ color: colorMap[a.priority] }}>0{i + 1}</div>
              <div>
                <div className="action-title">{a.title}</div>
                <div className="action-detail">{a.detail}</div>
                <div className="action-impact">{a.impact}</div>
              </div>
            </div>
            <button className="action-cta" onClick={() => onScrollTo(a.section)}>{a.cta} →</button>
          </div>
        ))}
      </div>
    </motion.section>
  )
}

export function RecruiterView({ reasoning, commentary }) {
  if (!reasoning && !commentary) return null
  return (
    <motion.section className="section" variants={fade}>
      <div className="section-label">Human Perspective</div>
      <h2 className="section-h2">Recruiter's assessment</h2>
      {commentary && (
        <blockquote className="recruiter-quote">
          <div className="recruiter-avatar">R</div>
          <div>
            <p className="recruiter-quote-text">"{commentary}"</p>
            <div className="recruiter-quote-attr">Recruiter's first impression</div>
          </div>
        </blockquote>
      )}
      {reasoning && <p className="recruiter-reasoning">{reasoning}</p>}
    </motion.section>
  )
}

export function SW({ strengths, weaknesses }) {
  if (!strengths?.length && !weaknesses?.length) return null
  return (
    <motion.section className="section" variants={fade}>
      <div className="section-label">Overview</div>
      <h2 className="section-h2">Strengths & weaknesses</h2>
      <div className="sw-row">
        <div className="sw-col">
          <div className="sw-col-head sw-col-head-green">Strengths</div>
          {strengths?.map((s, i) => <div key={i} className="sw-item"><span className="sw-mark sw-mark-green">✓</span><span>{s}</span></div>)}
        </div>
        <div className="sw-divider" />
        <div className="sw-col">
          <div className="sw-col-head sw-col-head-amber">Areas to improve</div>
          {weaknesses?.map((w, i) => <div key={i} className="sw-item"><span className="sw-mark sw-mark-amber">⚠</span><span>{w}</span></div>)}
        </div>
      </div>
    </motion.section>
  )
}

export function LineFeedback({ lineFeedback }) {
  if (!lineFeedback?.length) return null
  return (
    <motion.section className="section" variants={fade}>
      <div className="section-label">Annotations</div>
      <h2 className="section-h2">Line-by-line fixes</h2>
      <p className="section-sub">The most impactful lines in your CV that need changing, and exactly how to fix them.</p>
      <div className="lines-wrap">
        {lineFeedback.map((item, i) => (
          <div key={i} className="line-block">
            <div className="line-original">
              <span className="line-tag line-tag-grey">From your CV</span>
              <p className="line-text-grey">"{item.cv_line}"</p>
            </div>
            <div className="line-issue">
              <span className="line-issue-icon">⚠</span>
              <span className="line-issue-text">{item.issue}</span>
            </div>
            <div className="line-improved">
              <span className="line-tag line-tag-green">Suggested rewrite</span>
              <p className="line-text-green">{item.suggestion}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  )
}

export function Summary({ summaryImprovement }) {
  const [copied, setCopied] = useState(false)
  if (!summaryImprovement) return null
  return (
    <motion.section className="section" variants={fade}>
      <div className="section-label">Profile</div>
      <h2 className="section-h2">AI-rewritten summary</h2>
      <p className="section-sub">Replace your current professional summary with this, targeted specifically to this role.</p>
      <div className="summary-doc">
        <div className="summary-doc-header">
          <span className="summary-doc-title">Professional Summary</span>
          <button className={`summary-copy ${copied?'copied':''}`} onClick={async()=>{ try { await navigator.clipboard.writeText(summaryImprovement); setCopied(true); setTimeout(()=>setCopied(false),1400) } catch {} }}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <div className="summary-doc-divider" />
        <p className="summary-doc-text">{summaryImprovement}</p>
        <div className="summary-doc-divider" />
      </div>
    </motion.section>
  )
}

export function ATSDeep({ cvFile, jobDescription }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('missing')
  const run = async () => {
    if (!cvFile) return
    try {
      setLoading(true); setError(null)
      const binary = atob(cvFile.base64); const bytes = new Uint8Array(binary.length)
      for (let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i)
      const blob = new Blob([bytes],{type:cvFile.type}); const file = new File([blob],cvFile.name,{type:cvFile.type})
      const res = await atsPreview(file, jobDescription); setData(res)
    } catch { setError('ATS scan failed. Please try again.') } finally { setLoading(false) }
  }
  return (
    <motion.section className="section" variants={fade}>
      <div className="section-label">Deep Scan</div>
      <h2 className="section-h2">Detailed ATS analysis</h2>
      <p className="section-sub">A full keyword-level breakdown of your CV against the job description.</p>
      {!data && !loading && <button className="run-btn" onClick={run}>Run ATS scan</button>}
      {loading && <Loading variant="text" label="Scanning your CV..." />}
      {error && <p className="ats-error">{error}</p>}
      {data && (
        <>
          <div className="ats-stats">
            <div className="ats-stat"><div className="ats-stat-num" style={{color:'#16a34a'}}>{data.matched_count}</div><div className="ats-stat-lbl">Found</div></div>
            <div className="ats-stat"><div className="ats-stat-num" style={{color:'#ef4444'}}>{data.missing_keywords?.length}</div><div className="ats-stat-lbl">Missing</div></div>
            <div className="ats-stat"><div className="ats-stat-num" style={{color:'#2563eb'}}>{Math.round(data.keyword_density*100)}%</div><div className="ats-stat-lbl">Coverage</div></div>
          </div>
          <div className="ats-tabs">
            <button className={`ats-tab ${tab==='missing'?'active':''}`} onClick={()=>setTab('missing')}>Missing ({data.missing_keywords?.length})</button>
            <button className={`ats-tab ${tab==='found'?'active':''}`} onClick={()=>setTab('found')}>Found ({data.found_keywords?.length})</button>
          </div>
          <div className="ats-kws">
            {tab==='missing' && data.missing_keywords?.map((kw,i)=><span key={i} className="ats-kw ats-kw-miss">{kw}</span>)}
            {tab==='found' && data.found_keywords?.map((item,i)=><span key={i} className="ats-kw ats-kw-found">{item.keyword}</span>)}
          </div>
          <button className="ats-rescan" onClick={()=>{setData(null);run()}}>Re-run scan</button>
        </>
      )}
    </motion.section>
  )
}