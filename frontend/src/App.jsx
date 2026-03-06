import { useState, useEffect, useCallback } from 'react'
import { uploadCSV, loadSample, getAssetClasses, analyze, refreshPrices } from './api/portfolioApi'
import AssetModal from './components/AssetModal'
import MetricCard from './components/MetricCard'
import ScoreCard from './components/ScoreCard'
import AllocationChart from './components/AllocationChart'
import PortfolioTable from './components/PortfolioTable'
import ScenarioImpact from './components/ScenarioImpact'
import HealthSummary from './components/HealthSummary'
import Alerts from './components/Alerts'
import Recommendations from './components/Recommendations'

function fmtTime(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function App() {
  const [assets, setAssets] = useState(null)
  const [assetClasses, setAssetClasses] = useState([])

  // Flexible scenario state
  const [scenarioClass, setScenarioClass] = useState('Crypto')
  const [scenarioPct, setScenarioPct] = useState(-30)
  const [scenarioActive, setScenarioActive] = useState(false)

  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [selectedAsset, setSelectedAsset] = useState(null)

  useEffect(() => {
    getAssetClasses().then(setAssetClasses).catch(console.error)
    handleSample('balanced')
  }, [])

  const activeScenario = scenarioActive
    ? { assetClass: scenarioClass, changePercent: scenarioPct }
    : null

  const runAnalysis = useCallback(async (a, scenario) => {
    setLoading(true)
    setError(null)
    try {
      const r = await analyze(a, scenario)
      setResult(r)
    } catch (e) {
      setError(e.response?.data?.error || e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (assets) runAnalysis(assets, activeScenario)
  }, [assets, scenarioActive, scenarioClass, scenarioPct, runAnalysis])

  const handleSample = async (name) => {
    if (name === '(none)') { setAssets(null); setResult(null); return }
    setLoading(true); setError(null)
    try {
      const data = await loadSample(name)
      setAssets(data)
    } catch (e) {
      setError(e.response?.data?.error || e.message)
      setLoading(false)
    }
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setLoading(true); setError(null)
    try {
      const data = await uploadCSV(file)
      setAssets(data)
    } catch (e) {
      setError(e.response?.data?.error || e.message)
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    if (!assets) return
    setRefreshing(true); setError(null)
    try {
      const { assets: updated } = await refreshPrices(assets)
      setAssets(updated)
    } catch (e) {
      setError(e.response?.data?.error || e.message)
    } finally {
      setRefreshing(false)
    }
  }

  const liveCount = result?.assets?.filter(a => a.priceSource === 'live').length ?? 0
  const fmtSgd = (v) => 'S$ ' + Number(v).toLocaleString('en-SG', { maximumFractionDigits: 0 })

  const scenarioLabel = scenarioActive
    ? `${scenarioClass} ${scenarioPct > 0 ? '+' : ''}${scenarioPct}%`
    : null

  return (
    <div className="app">
      {/* ---- Sidebar ---- */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>Wealth Wellness Hub</h1>
          <p className="caption">Demo / Education only — not financial advice.</p>
        </div>

        <section>
          <h2>Import Portfolio</h2>
          <label>Upload CSV</label>
          <input type="file" accept=".csv" onChange={handleUpload} />
          <label>Or load a sample</label>
          <select defaultValue="balanced" onChange={(e) => handleSample(e.target.value)}>
            <option value="(none)">(none)</option>
            <option value="balanced">Balanced</option>
            <option value="crypto_heavy">Crypto Heavy</option>
            <option value="property_heavy">Property Heavy</option>
          </select>
        </section>

        <section>
          <h2>Live Prices</h2>
          {liveCount > 0 ? (
            <div className="live-status">
              <span className="live-dot" /> {liveCount} asset{liveCount > 1 ? 's' : ''} live
              {result?.pricesUpdatedAt && (
                <div className="live-time">Updated {fmtTime(result.pricesUpdatedAt)}</div>
              )}
            </div>
          ) : (
            <p className="live-note">Add <code>ticker</code> + <code>quantity</code> columns to your CSV.</p>
          )}
          <button className="btn-reset" onClick={handleRefresh} disabled={refreshing || !assets}>
            {refreshing ? 'Refreshing...' : 'Refresh Prices'}
          </button>
        </section>

        {/* ---- Flexible Scenario Lab ---- */}
        <section>
          <h2>Scenario Lab</h2>

          <label>Asset Class</label>
          <select value={scenarioClass} onChange={e => setScenarioClass(e.target.value)}>
            {assetClasses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <label>
            Change: <strong style={{ color: scenarioPct < 0 ? '#e74c3c' : '#27ae60' }}>
              {scenarioPct > 0 ? '+' : ''}{scenarioPct}%
            </strong>
          </label>
          <input
            type="range"
            min="-90" max="50" step="1"
            value={scenarioPct}
            onChange={e => setScenarioPct(Number(e.target.value))}
            className="scenario-slider"
          />
          <div className="slider-labels">
            <span>-90%</span><span>0%</span><span>+50%</span>
          </div>

          <div className="scenario-btns">
            <button
              className={`btn-apply ${scenarioActive ? 'active' : ''}`}
              onClick={() => setScenarioActive(true)}
            >
              Apply
            </button>
            <button
              className="btn-reset"
              onClick={() => { setScenarioActive(false); setScenarioPct(-30); setScenarioClass('Crypto') }}
            >
              Reset
            </button>
          </div>

          {scenarioActive && (
            <div className="scenario-badge">
              Scenario: {scenarioLabel}
            </div>
          )}
        </section>
      </aside>

      {/* ---- Main ---- */}
      <main className="main">
        <h1 className="main-title">Dashboard</h1>
        <p className="main-subtitle">Your complete financial health overview</p>

        {error && <div className="alert danger mb-20">{error}</div>}

        {loading && (
          <div className="loading-state">
            <div className="spinner" />
            <div>Loading...</div>
          </div>
        )}

        {!loading && !result && !error && (
          <div className="empty-state">Upload a CSV or select a sample portfolio to begin.</div>
        )}

        {result && !loading && (
          <>
            <div className="metrics-row">
              <MetricCard
                label="Total Net Worth"
                value={fmtSgd(result.netWorth)}
                delta={scenarioActive ? result.delta : null}
                fmtSgd={fmtSgd}
              />
            </div>

            <div className="row mb-20">
              <div className="card">
                <h2>Allocation by Asset Class</h2>
                <AllocationChart data={result.allocation} />
              </div>
              <div className="card">
                <h2>Portfolio Holdings <span style={{ fontSize: 11, color: '#aaa', fontWeight: 400, textTransform: 'none' }}>· click a row to view chart</span></h2>
                <PortfolioTable assets={result.assets} fmtSgd={fmtSgd} onSelectAsset={setSelectedAsset} />
              </div>
            </div>

            {scenarioActive && result.scenarioImpact?.length > 0 && (
              <div className="card mb-20">
                <h2>Scenario Impact — Top Drivers</h2>
                <p style={{ fontSize: 12, color: '#aaa', marginBottom: 12 }}>
                  Applied: <strong>{scenarioLabel}</strong>
                </p>
                <ScenarioImpact items={result.scenarioImpact} fmtSgd={fmtSgd} />
              </div>
            )}

            <div className="scores-row">
              <ScoreCard label="Diversification" score={result.diversificationScore} />
              <ScoreCard label="Liquidity" score={result.liquidityScore} />
              <ScoreCard label="Resilience" score={result.resilienceScore}
                subtitle={`Worst scenario drop: ${result.worstDropPct.toFixed(1)}%`} />
            </div>

            <HealthSummary issues={result.healthIssues} />

            <div className="row">
              <div className="card">
                <h2>Alerts</h2>
                <Alerts alerts={result.alerts} />
              </div>
              <div className="card">
                <h2>Recommendations</h2>
                <Recommendations recs={result.recommendations} />
              </div>
            </div>
          </>
        )}
      </main>

      <AssetModal asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
    </div>
  )
}
