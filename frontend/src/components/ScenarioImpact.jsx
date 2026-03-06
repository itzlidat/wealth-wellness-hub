export default function ScenarioImpact({ items, fmtSgd }) {
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} className="impact-item">
          <span className="impact-name">{item.assetName}</span>
          <span className="impact-class">({item.assetClass})</span>
          <span className={`impact-change ${item.changeSgd < 0 ? 'neg' : 'pos'}`}>
            {item.changeSgd >= 0 ? '+' : ''}{fmtSgd(item.changeSgd)}
          </span>
        </div>
      ))}
    </div>
  )
}
