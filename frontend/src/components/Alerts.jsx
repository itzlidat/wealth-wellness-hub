export default function Alerts({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return <div className="alert success">No major red flags detected.</div>
  }
  return (
    <div>
      {alerts.map((a, i) => (
        <div key={i} className="alert warning">{a}</div>
      ))}
    </div>
  )
}
