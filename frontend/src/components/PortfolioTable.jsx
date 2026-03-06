function riskClass(tag) {
  if (tag === 'High') return 'tag tag-high'
  if (tag === 'Med')  return 'tag tag-med'
  return 'tag tag-low'
}

export default function PortfolioTable({ assets, fmtSgd, onSelectAsset }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Asset</th>
            <th>Class</th>
            <th>Value (SGD)</th>
            <th>Price/Unit</th>
            <th>Liquidity</th>
            <th>Risk</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((a, i) => (
            <tr
              key={i}
              className={a.ticker ? 'row-clickable' : ''}
              onClick={() => a.ticker && onSelectAsset(a)}
              title={a.ticker ? 'Click to view chart' : ''}
            >
              <td>
                {a.priceSource === 'live' && <span className="live-badge">LIVE</span>}
                {a.assetName}
                {a.ticker && <span className="ticker-label">{a.ticker}</span>}
              </td>
              <td>{a.assetClass}</td>
              <td>{fmtSgd(a.valueSgd)}</td>
              <td style={{ color: '#888', fontSize: 12 }}>
                {a.livePrice != null
                  ? fmtSgd(a.livePrice)
                  : <span style={{ color: '#ccc' }}>—</span>}
              </td>
              <td>{a.liquidityDays}d</td>
              <td><span className={riskClass(a.riskTag)}>{a.riskTag}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
