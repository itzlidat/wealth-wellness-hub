import { useState, useEffect } from 'react'
import { fetchOhlc } from '../api/portfolioApi'
import CandlestickChart from './CandlestickChart'

const RANGES = [
  { label: '1M', value: '1mo' },
  { label: '3M', value: '3mo' },
  { label: '6M', value: '6mo' },
  { label: '1Y', value: '1y' },
]

export default function AssetModal({ asset, onClose }) {
  const [range, setRange] = useState('3mo')
  const [ohlc, setOhlc] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!asset?.ticker) return
    setLoading(true)
    setError(null)
    fetchOhlc(asset.ticker, range)
      .then(setOhlc)
      .catch(e => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false))
  }, [asset, range])

  if (!asset) return null

  const fmtSgd = (v) =>
    'S$ ' + Number(v).toLocaleString('en-SG', { maximumFractionDigits: 2 })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-title">
              {asset.priceSource === 'live' && <span className="live-badge">LIVE</span>}
              {asset.assetName}
            </div>
            <div className="modal-meta">
              {asset.assetClass}
              {asset.ticker && <> · <code>{asset.ticker}</code></>}
              {asset.quantity && <> · {asset.quantity} units</>}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Stats row */}
        <div className="modal-stats">
          <div className="modal-stat">
            <div className="modal-stat-label">Current Value</div>
            <div className="modal-stat-value">{fmtSgd(asset.valueSgd)}</div>
          </div>
          {asset.livePrice != null && (
            <div className="modal-stat">
              <div className="modal-stat-label">Price / Unit</div>
              <div className="modal-stat-value">{fmtSgd(asset.livePrice)}</div>
            </div>
          )}
          <div className="modal-stat">
            <div className="modal-stat-label">Liquidity</div>
            <div className="modal-stat-value">{asset.liquidityDays}d</div>
          </div>
          <div className="modal-stat">
            <div className="modal-stat-label">Risk</div>
            <div className="modal-stat-value">{asset.riskTag}</div>
          </div>
          <div className="modal-stat">
            <div className="modal-stat-label">Source</div>
            <div className="modal-stat-value">{asset.source}</div>
          </div>
        </div>

        {/* Chart — only for assets with a ticker */}
        {asset.ticker ? (
          <>
            <div className="modal-range-bar">
              {RANGES.map(r => (
                <button
                  key={r.value}
                  className={`range-btn ${range === r.value ? 'active' : ''}`}
                  onClick={() => setRange(r.value)}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {loading && (
              <div style={{ height: 320, display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#aaa' }}>
                <div className="spinner" style={{ marginRight: 10 }} /> Loading chart...
              </div>
            )}
            {error && <div className="alert danger">{error}</div>}
            {!loading && !error && ohlc && (
              <CandlestickChart bars={ohlc.bars} currency={ohlc.currency} />
            )}
          </>
        ) : (
          <div style={{ padding: '24px 0', color: '#aaa', fontSize: 13, textAlign: 'center' }}>
            No market ticker — candlestick chart unavailable for manually-valued assets.
          </div>
        )}

      </div>
    </div>
  )
}
