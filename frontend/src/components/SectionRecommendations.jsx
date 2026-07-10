import { motion } from 'framer-motion'
import { fade } from '../utils/animations'

export default function SectionRecommendations({ recommendations }) {
  if (!recommendations?.length) return null
  return (
    <motion.section className="section" variants={fade}>
      <div className="section-label">Structure</div>
      <h2 className="section-h2">Section recommendations</h2>
      <div className="recs-wrap">
        {recommendations.map((r, i) => (
          <div key={i} className="rec-card"><span className="rec-arrow">→</span><p className="rec-text">{r}</p></div>
        ))}
      </div>
    </motion.section>
  )
}