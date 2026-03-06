export default function MetricCard({ label, value, delta, fmtSgd }) {
  return (
    <div className="metric-card">
      <div className="m-label">{label}</div>
      <div className="m-value">{value}</div>
      {delta !== null && delta !== undefined && (
        <div className={`m-delta ${delta >= 0 ? 'positive' : 'negative'}`}>
          {delta >= 0 ? '+' : ''}{fmtSgd(delta)} vs baseline
        </div>
      )}
    </div>
  )
}
