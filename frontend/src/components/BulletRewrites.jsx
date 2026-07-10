import { useState } from 'react'
import { motion } from 'framer-motion'
import { fade } from '../utils/animations'
import { rewriteBullet } from '../api/api'

export default function BulletRewrites({ bullets, jobDescription }) {
  const [active, setActive] = useState({})
  const [rewriting, setRewriting] = useState(null)
  const [extra, setExtra] = useState({})
  const [copied, setCopied] = useState(null)
  if (!bullets?.length) return null
  const getVersions = (b, i) => [...[b.improved], ...(b.alternatives||[]), ...(extra[i]||[])].filter(Boolean)
  const doRewrite = async (b, i) => {
    try { setRewriting(i); const res = await rewriteBullet({ bullet: b.original, jobDescription }); setExtra(p => ({ ...p, [i]: res.rewrites || [] })) } catch {} finally { setRewriting(null) }
  }
  const copy = async (text, key) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(p=>p===key?null:p), 1400) } catch {}
  }
  return (
    <motion.section className="section" variants={fade}>
      <div className="section-label">Rewrites</div>
      <h2 className="section-h2">Bullet point rewrites</h2>
      <p className="section-sub">Select your preferred version. Click "+ New version" to generate fresh alternatives.</p>
      <div className="bullets-wrap">
        {bullets.map((b, i) => {
          const versions = getVersions(b, i)
          const tab = active[i] ?? 0
          return (
            <div key={i} className="bullet-block">
              <div className="bullet-original-row">
                <span className="bullet-tag bullet-tag-grey">Original</span>
                <p className="bullet-original-text">{b.original}</p>
              </div>
              <div className="bullet-arrow-row">
                <div className="bullet-arrow-line" />
                <span className="bullet-arrow-text">AI rewrite</span>
                <div className="bullet-arrow-line" />
              </div>
              <div className="bullet-improved-block">
                <div className="bullet-version-tabs">
                  {versions.map((_, j) => (
                    <button key={j} className={`bvtab ${tab===j?'active':''}`} onClick={() => setActive(p=>({...p,[i]:j}))}>
                      {j===0 ? 'Best version' : `Option ${j+1}`}
                    </button>
                  ))}
                  <button className="bvtab bvtab-new" onClick={() => doRewrite(b,i)} disabled={rewriting===i}>
                    {rewriting===i ? 'Writing...' : '+ New version'}
                  </button>
                </div>
                <div className="bullet-improved-body">
                  <p className="bullet-improved-text">{versions[tab]}</p>
                  <button className={`bullet-copy ${copied===`${i}-${tab}`?'copied':''}`} onClick={() => copy(versions[tab],`${i}-${tab}`)}>
                    {copied===`${i}-${tab}` ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </motion.section>
  )
}