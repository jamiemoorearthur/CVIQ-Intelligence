function recruiterBand(score) {
  if (score >= 8) return { label: 'Strong Application', color: '#1d9e75', verdict: 'A recruiter would likely shortlist this CV.' }
  if (score >= 5) return { label: 'Competitive but requires improvement', color: '#f59e0b', verdict: 'A recruiter may shortlist this CV, but it could be stronger.' }
  return { label: 'Significant optimisation required', color: '#ef4444', verdict: 'A recruiter is unlikely to shortlist this CV without changes.' }
}

// Finer-grained banding for 0-100 category scores so the amber zone doesn't
// swallow everything from 55-79. Six steps instead of three.
function categoryBand(score) {
  if (score >= 90) return '#16a34a'
  if (score >= 80) return '#1d9e75'
  if (score >= 65) return '#84cc16'
  if (score >= 50) return '#f59e0b'
  if (score >= 35) return '#f97316'
  return '#ef4444'
}

function ScoreCards({ overallScore, atsScore, recruiterScore, categoryScores }) {
  const band = recruiterBand(recruiterScore)

  const categories = [
    { label: 'Technical Skills Match', value: categoryScores?.skills_match },
    { label: 'Experience Relevance', value: categoryScores?.experience_relevance },
    { label: 'Formatting & Readability', value: categoryScores?.structure_readability },
    { label: 'Keyword Alignment', value: categoryScores?.ats_keyword_match },
    { label: 'Bullet Point Quality', value: categoryScores?.bullet_point_quality },
    { label: 'Role Alignment', value: categoryScores?.role_alignment },
  ].filter(c => c.value !== undefined)

  return (
    <div className="score-cards-stack">
      {/* Recruiter-centric hero card — leads the section, most prominent */}
      <div className="recruiter-hero-card" style={{ borderColor: `${band.color}40` }}>
        <div className="recruiter-hero-top">
          <div>
            <div className="recruiter-hero-label">Recruiter Feedback Score</div>
            <div className="recruiter-hero-num" style={{ color: band.color }}>{recruiterScore}<span className="recruiter-hero-denom">/10</span></div>
          </div>
          <span
            className="recruiter-hero-badge"
            style={{ color: band.color, background: `${band.color}1a`, border: `1px solid ${band.color}40` }}
          >
            {band.label}
          </span>
        </div>
        <div className="score-item-bar" style={{ height: '6px', marginTop: '14px' }}>
          <div className="score-item-fill" style={{ width: `${recruiterScore * 10}%`, background: band.color }} />
        </div>
        <p className="recruiter-hero-verdict">{band.verdict}</p>
      </div>

      {/* Two-column grid: Overall Score + ATS Score only */}
      <div className="score-breakdown score-breakdown-2col">
        <div className="score-item">
          <div className="score-item-label">Overall Score</div>
          <div className="score-item-num">{overallScore}%</div>
          <div className="score-item-bar"><div className="score-item-fill" style={{ width: `${overallScore}%` }} /></div>
        </div>
        <div className="score-item">
          <div className="score-item-label">ATS Score</div>
          <div className="score-item-num" style={{ color: '#5dcaa5' }}>{atsScore}%</div>
          <div className="score-item-bar"><div className="score-item-fill" style={{ width: `${atsScore}%`, background: '#5dcaa5' }} /></div>
        </div>
      </div>

      {categories.length > 0 && (
        <div className="result-card">
          <div className="result-card-header">
            <div className="result-card-icon">📊</div>
            <span className="result-card-title">Category breakdown</span>
          </div>
          <div className="result-card-body">
            <div className="score-breakdown score-breakdown-3col">
              {categories.map(c => {
                const color = categoryBand(c.value)
                return (
                  <div className="score-item" key={c.label}>
                    <div className="score-item-label">{c.label}</div>
                    <div className="score-item-num" style={{ fontSize: '22px', color }}>{c.value}%</div>
                    <div className="score-item-bar"><div className="score-item-fill" style={{ width: `${c.value}%`, background: color }} /></div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScoreCards