function scoreColor(score) {
  if (score >= 70) return '#27ae60'
  if (score >= 40) return '#f39c12'
  return '#e74c3c'
}

export default function ScoreCard({ label, score, subtitle }) {
  const color = scoreColor(score)
  return (
    <div className="score-card">
      <div className="s-label">{label} Score</div>
      <div className="s-value" style={{ color }}>
        {score.toFixed(0)}<span className="s-denom">/100</span>
      </div>
      {subtitle && <div className="s-subtitle">{subtitle}</div>}
      <div className="score-bar">
        <div
          className="score-bar-fill"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
    </div>
  )
}
