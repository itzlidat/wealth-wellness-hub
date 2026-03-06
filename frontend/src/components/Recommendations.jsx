export default function Recommendations({ recs }) {
  if (!recs || recs.length === 0) return null
  return (
    <div>
      {recs.map((r, i) => (
        <div key={i} className="rec-item">
          <div className="rec-action">Action: {r.action}</div>
          <div className="rec-why">Why: {r.why}</div>
        </div>
      ))}
    </div>
  )
}
