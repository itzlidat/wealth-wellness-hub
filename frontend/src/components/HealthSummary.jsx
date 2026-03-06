export default function HealthSummary({ issues }) {
  return (
    <div className="health-card">
      <h2>Health Summary</h2>
      {issues.length === 0 ? (
        <div className="alert success">
          Overall: healthy profile across diversification, liquidity, and stress resilience.
        </div>
      ) : (
        <div className="alert warning">
          Overall: {issues.join(', ')}.
        </div>
      )}
    </div>
  )
}
