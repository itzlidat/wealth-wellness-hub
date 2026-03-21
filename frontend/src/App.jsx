import { useState, useEffect, useCallback, useRef } from 'react'
import { uploadCSV, loadSample, getAssetClasses, analyze, refreshPrices,
         listPortfolios, savePortfolio, deletePortfolio } from './api/portfolioApi'
import { useAuth } from './context/AuthContext'
import AuthModal from './components/AuthModal'
import AssetModal from './components/AssetModal'
import AddEntryModal from './components/AddEntryModal'
import PortfolioManager from './components/PortfolioManager'
import WealthSummary from './components/WealthSummary'
import CsvGuide from './components/CsvGuide'
import ScoreBarList from './components/ScoreBarList'
import BankConnectModal from './components/BankConnectModal'
import FinancialCharts from './components/FinancialCharts'
import NetWorthChart from './components/NetWorthChart'
import { getSampleHistory, recordSnapshot, getPortfolioHistory } from './utils/historyStore'
import UserProfilePanel from './components/UserProfilePanel'
import AllocationChart from './components/AllocationChart'
import PortfolioTable from './components/PortfolioTable'
import ScenarioImpact from './components/ScenarioImpact'
import HealthSummary from './components/HealthSummary'
import Alerts from './components/Alerts'
import Recommendations from './components/Recommendations'
import PlatformBreakdown from './components/PlatformBreakdown'
import ChatBot from './components/ChatBot'

// ---- localStorage helpers ----
const STORAGE_KEY = 'wwh_portfolios'

function loadStore() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"portfolios":{}}') }
  catch { return { portfolios: {} } }
}

function persistStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function fmtTime(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// ---- App ----
export default function App() {
  const { user, loading: authLoading, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [assets, setAssets]           = useState(null)
  const [assetClasses, setAssetClasses] = useState([])

  // Scenario
  const [scenarioClass,  setScenarioClass]  = useState('Crypto')
  const [scenarioPct,    setScenarioPct]    = useState(-30)
  const [scenarioActive, setScenarioActive] = useState(false)

  const activeScenario = scenarioActive
    ? { assetClass: scenarioClass, changePercent: scenarioPct }
    : null

  // Analysis
  const [result,     setResult]     = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error,      setError]      = useState(null)

  // Modals
  const [selectedAsset,    setSelectedAsset]    = useState(null)
  const [showAddEntry,     setShowAddEntry]      = useState(false)
  const [showBankConnect,  setShowBankConnect]   = useState(false)

  // User profile (for personalized recommendations)
  const [userProfile, setUserProfile] = useState({
    age: 35,
    riskAppetite: 'balanced',
    primaryGoal: 'wealth_building',
    monthlyIncome: 0,
  })

  // Net worth history
  const [netWorthHistory,  setNetWorthHistory]  = useState([])
  const [currentSampleName, setCurrentSampleName] = useState('balanced')

  // ---- Portfolio persistence ----
  const [portfolioName,    setPortfolioName]    = useState(null)
  const [savedPortfolios,  setSavedPortfolios]  = useState(() => loadStore().portfolios || {})
  const [saveStatus,       setSaveStatus]       = useState('idle') // idle|unsaved|saving|saved
  const [lastSaved,        setLastSaved]        = useState(null)

  // Refs so callbacks never close over stale state
  const assetsRef       = useRef(null)
  const portfolioNameRef = useRef(null)
  const autoSaveTimer   = useRef(null)
  const skipAutoSave    = useRef(true) // true on first mount to suppress the initial load

  useEffect(() => { assetsRef.current = assets }, [assets])
  useEffect(() => { portfolioNameRef.current = portfolioName }, [portfolioName])

  // ---- Mount: restore from localStorage or fall back to sample ----
  useEffect(() => {
    getAssetClasses().then(setAssetClasses).catch(console.error)

    const store = loadStore()
    if (store.active && store.portfolios?.[store.active]) {
      const p = store.portfolios[store.active]
      setPortfolioName(store.active)
      setAssets(p.assets)
      setLastSaved(p.savedAt)
      setSaveStatus('saved')
      setCurrentSampleName(null) // saved portfolio — not a sample
    } else {
      setCurrentSampleName('balanced')
      _loadSample('balanced')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Analysis re-run whenever assets, scenario, or profile change ----
  const runAnalysis = useCallback(async (a, scenario, profile) => {
    setLoading(true)
    setError(null)
    try {
      const r = await analyze(a, scenario, profile)
      setResult(r)
    } catch (e) {
      setError(e.response?.data?.error || e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (assets) runAnalysis(assets, activeScenario, userProfile)
  }, [assets, scenarioActive, scenarioClass, scenarioPct, userProfile, runAnalysis]) // eslint-disable-line

  // Update net worth history after each analysis (skip scenario mode)
  useEffect(() => {
    if (!result || scenarioActive) return
    const nw  = result.netWorth        ?? 0
    const inv = result.investableAssets ?? 0
    if (currentSampleName) {
      setNetWorthHistory(getSampleHistory(currentSampleName, nw, inv))
    } else if (portfolioNameRef.current) {
      recordSnapshot(portfolioNameRef.current, nw, inv)
      setNetWorthHistory(getPortfolioHistory(portfolioNameRef.current))
    }
  }, [result, scenarioActive, currentSampleName]) // eslint-disable-line

  // ---- Auto-save: fires 3 s after any assets change, only if a name is set ----
  useEffect(() => {
    if (skipAutoSave.current) {
      skipAutoSave.current = false
      return
    }
    if (!assets) return

    const name = portfolioNameRef.current
    if (!name) { setSaveStatus('unsaved'); return }

    setSaveStatus('unsaved')
    clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => doSave(name), 3000)

    return () => clearTimeout(autoSaveTimer.current)
  }, [assets]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Load portfolios from backend on login ----
  useEffect(() => {
    if (!user) return
    listPortfolios().then(portfolios => {
      const map = {}
      portfolios.forEach(p => { map[p.name] = { assets: p.assets, savedAt: p.savedAt } })
      setSavedPortfolios(map)
    }).catch(console.error)
  }, [user])

  // ---- Core save (backend when logged in, localStorage fallback) ----
  const doSave = useCallback((name) => {
    const current = assetsRef.current
    if (!name || !current) return

    setSaveStatus('saving')
    const now = new Date().toISOString()

    savePortfolio(name, current).catch(console.error)

    setSavedPortfolios(prev => {
      const updated = { ...prev, [name]: { assets: current, savedAt: now } }
      const store = loadStore()
      store.active = name
      store.portfolios = updated
      persistStore(store)
      return updated
    })

    setPortfolioName(name)
    setLastSaved(now)
    setTimeout(() => setSaveStatus('saved'), 400)
  }, [])

  // ---- Manual save (clears pending auto-save first) ----
  const handleSavePortfolio = useCallback((name) => {
    clearTimeout(autoSaveTimer.current)
    doSave(name)
  }, [doSave])

  // ---- Load a saved portfolio ----
  const handleLoadPortfolio = useCallback((name) => {
    const store = loadStore()
    const p = store.portfolios?.[name]
    if (!p) return

    skipAutoSave.current = true
    setPortfolioName(name)
    setAssets(p.assets)
    setLastSaved(p.savedAt)
    setSaveStatus('saved')
    store.active = name
    persistStore(store)
  }, [])

  // ---- Delete a saved portfolio ----
  const handleDeletePortfolio = useCallback((name) => {
    deletePortfolio(name).catch(console.error)
    setSavedPortfolios(prev => {
      const { [name]: _, ...rest } = prev
      const store = loadStore()
      store.portfolios = rest
      if (store.active === name) delete store.active
      persistStore(store)
      return rest
    })
    if (portfolioNameRef.current === name) {
      setPortfolioName(null)
      setSaveStatus('idle')
    }
  }, [])

  // ---- Sample load: clears portfolio context (samples are not user data) ----
  const _loadSample = async (name) => {
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

  const handleSample = async (name) => {
    skipAutoSave.current = true
    setPortfolioName(null)
    setSaveStatus('idle')
    setCurrentSampleName(name === '(none)' ? null : name)
    await _loadSample(name)
  }

  // ---- CSV upload: keeps portfolio context so user can re-save ----
  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setCurrentSampleName(null)
    setLoading(true); setError(null)
    try {
      const data = await uploadCSV(file)
      setAssets(data)
    } catch (e) {
      setError(e.response?.data?.error || e.message)
      setLoading(false)
    }
  }

  // ---- Manual entry ----
  const handleAddEntry = (entry) => setAssets(prev => [...(prev || []), entry])

  // ---- Bank import (mock SGFinDex) ----
  const handleBankImport = (newAssets) => setAssets(prev => [...(prev || []), ...newAssets])

  // ---- Export CSV ----
  const exportCSV = () => {
    if (!assets?.length) return
    const header = 'asset_name,asset_class,entry_type,value_sgd,liquidity_days,risk_tag,source,ticker,quantity,currency,original_value,platform'
    const rows = assets.map(a => [
      a.assetName, a.assetClass, a.entryType ?? 'asset',
      a.valueSgd.toFixed(2), a.liquidityDays, a.riskTag, a.source,
      a.ticker ?? '', a.quantity ?? '',
      a.currency ?? 'SGD', (a.originalValue ?? a.valueSgd).toFixed(2),
      a.platform ?? '',
    ].join(','))
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `portfolio_export_${new Date().toISOString().split('T')[0]}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  // ---- Export PDF (print-friendly popup) ----
  const exportPDF = () => {
    if (!result) return
    const fmtN = (v) => 'S$ ' + Number(v).toLocaleString('en-SG', { maximumFractionDigits: 0 })
    const scoreRow = (label, score) => {
      const color = score >= 70 ? '#2ecc71' : score >= 40 ? '#f39c12' : '#e74c3c'
      return `<tr><td>${label}</td><td style="color:${color};font-weight:700">${score.toFixed(0)}/100</td></tr>`
    }
    const html = `<!DOCTYPE html><html><head><title>Wealth Wellness Report</title>
    <style>
      body{font-family:sans-serif;padding:32px;color:#111;max-width:860px;margin:0 auto}
      h1{font-size:22px;margin-bottom:4px}
      .sub{color:#555;font-size:13px;margin-bottom:24px}
      .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}
      .card{border:1px solid #ddd;border-radius:8px;padding:14px}
      .card-label{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.05em}
      .card-value{font-size:20px;font-weight:700;margin-top:4px}
      table{width:100%;border-collapse:collapse;margin-bottom:24px;font-size:13px}
      th{text-align:left;border-bottom:2px solid #ddd;padding:8px 4px;font-size:11px;text-transform:uppercase;color:#888}
      td{padding:8px 4px;border-bottom:1px solid #f0f0f0}
      h2{font-size:15px;margin:20px 0 8px}
      @media print{body{padding:16px}}
    </style></head><body>
    <h1>Wealth Wellness Report</h1>
    <div class="sub">Generated ${new Date().toLocaleDateString('en-SG', { dateStyle: 'long' })}${portfolioName ? ' · ' + portfolioName : ''}</div>
    <div class="grid">
      <div class="card"><div class="card-label">Net Worth</div><div class="card-value">${fmtN(result.netWorth)}</div></div>
      <div class="card"><div class="card-label">Total Assets</div><div class="card-value">${fmtN(result.totalAssets)}</div></div>
      <div class="card"><div class="card-label">Total Debts</div><div class="card-value" style="color:#e74c3c">${fmtN(result.totalDebts)}</div></div>
      <div class="card"><div class="card-label">Cash on Hand</div><div class="card-value">${fmtN(result.cashOnHand)}</div></div>
      <div class="card"><div class="card-label">Investable</div><div class="card-value">${fmtN(result.investableAssets)}</div></div>
    </div>
    <h2>Health Scores</h2>
    <table><thead><tr><th>Metric</th><th>Score</th></tr></thead><tbody>
      ${scoreRow('Diversification', result.diversificationScore)}
      ${scoreRow('Liquidity',       result.liquidityScore)}
      ${scoreRow('Resilience',      result.resilienceScore)}
      ${scoreRow('Debt Health',     result.debtHealthScore ?? 100)}
      ${scoreRow('Concentration',   result.concentrationScore ?? 100)}
      ${scoreRow('Emergency Fund',  result.emergencyFundScore ?? 0)}
    </tbody></table>
    <h2>Asset Allocation</h2>
    <table><thead><tr><th>Asset Class</th><th>Value (SGD)</th><th>Weight</th></tr></thead><tbody>
      ${(result.allocation || []).map(a => `<tr><td>${a.assetClass}</td><td>${fmtN(a.valueSgd)}</td><td>${(a.weight*100).toFixed(1)}%</td></tr>`).join('')}
    </tbody></table>
    <h2>Holdings</h2>
    <table><thead><tr><th>Name</th><th>Class</th><th>Value</th><th>Liquidity</th><th>Risk</th></tr></thead><tbody>
      ${(assets || []).map(a => `<tr><td>${a.assetName}</td><td>${a.assetClass}</td><td>${fmtN(a.valueSgd)}</td><td>${a.liquidityDays}d</td><td>${a.riskTag}</td></tr>`).join('')}
    </tbody></table>
    ${result.recommendations?.length ? `<h2>Recommendations</h2><ul>${result.recommendations.map(r => `<li><strong>${r.title}</strong> — ${r.detail}</li>`).join('')}</ul>` : ''}
    <script>window.onload=()=>window.print()</script>
    </body></html>`
    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
  }

  // ---- Template download ----
  const downloadTemplate = () => {
    const csv = [
      // Header
      'asset_name,asset_class,entry_type,value_sgd,liquidity_days,risk_tag,source,ticker,quantity,platform',
      // Inline reference guide (lines starting with # are ignored by the parser)
      '# --- FIELD REFERENCE (these lines are ignored when uploading) ---',
      '# asset_name      : Any label e.g. "OCBC Savings", "Bitcoin", "HDB Flat"',
      '# asset_class     : Cash | Equity | Crypto | Bonds | Property | CPF | Commodities | PrivateEquity | Collectibles | Mortgage | CarLoan | OtherDebt',
      '# entry_type      : asset  OR  debt',
      '# value_sgd       : Current value in SGD (number, no commas)',
      '# liquidity_days  : Days to convert to cash. e.g. 0=instant, 2=stocks, 180=property',
      '# risk_tag        : Low | Med | High',
      '# source          : Where held — e.g. Bank | Broker | Crypto | CPF | Manual',
      '# ticker          : (optional) Exchange ticker for live price + chart. e.g. AAPL, BTC, XAU, SPY, D05.SI, LSE:HSBA',
      '# quantity        : (optional) Number of units — needed for live price calculation',
      '# platform        : (optional) Brokerage/platform name e.g. Tiger Broker, Moomoo, Bybit, OCBC',
      '# --- EXAMPLES (delete before uploading, or leave — they will be ignored) ---',
      '# OCBC Savings,Cash,asset,15000,0,Low,Bank,,,OCBC Bank',
      '# Apple Inc,Equity,asset,8500,2,Med,Broker,AAPL,20,Tiger Broker',
      '# Bitcoin,Crypto,asset,5000,1,High,Crypto,BTC,0.05,Bybit',
      '# Gold,Commodities,asset,3200,1,Med,Broker,XAU,1.5,Tiger Broker',
      '# S&P 500 ETF,Equity,asset,20000,2,Med,Broker,SPY,14,Tiger Broker',
      '# Gov Bond Fund,Bonds,asset,8000,7,Low,Broker,AGG,80,Tiger Broker',
      '# HDB Flat,Property,asset,400000,180,Med,Manual,,,',
      '# CPF Ordinary Account,CPF,asset,30000,180,Low,CPF,,,CPF Board',
      '# HDB Mortgage,Mortgage,debt,250000,180,Low,Bank,,,OCBC Bank',
      '# --- YOUR PORTFOLIO BELOW ---',
      // 15 blank data rows
      ...Array(15).fill(',,,,,,,,,'),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'portfolio_template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  // ---- Scroll-reveal: observe .scroll-reveal elements after result loads ----
  useEffect(() => {
    if (!result) return
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('revealed')
        } else {
          e.target.classList.remove('revealed')
        }
      }),
      { threshold: 0.08 }
    )
    const els = document.querySelectorAll('.scroll-reveal')
    els.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [result])

  // ---- Refresh live prices ----
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

  const liveCount    = result?.assets?.filter(a => a.priceSource === 'live').length ?? 0
  const fmtSgd       = (v) => 'S$ ' + Number(v).toLocaleString('en-SG', { maximumFractionDigits: 0 })
  const scenarioLabel = scenarioActive
    ? `${scenarioClass} ${scenarioPct > 0 ? '+' : ''}${scenarioPct}%`
    : null

  if (authLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'#8b92a5', fontFamily:"'Cinzel',serif", letterSpacing:'0.15em' }}>
      VENTURA
    </div>
  )

  if (!user) return <AuthModal />

  return (
    <div className="ventura-wrapper">
    <header className="ventura-topbar">
      <button className="ventura-sidebar-toggle" onClick={() => setSidebarOpen(o => !o)} aria-label="Toggle sidebar">
        <span /><span /><span />
      </button>
      <div className="ventura-topbar-center">
        <h1 className="ventura-name">VENTURA</h1>
        <p className="ventura-motto">Your wealth, engineered for tomorrow.</p>
      </div>
      <div className="ventura-user">
        <span className="ventura-user-name">{user.name || user.email}</span>
        <button className="ventura-logout" onClick={logout}>Sign out</button>
      </div>
    </header>
    <div className={`app${sidebarOpen ? '' : ' app--sidebar-collapsed'}`}>
      {/* ---- Sidebar ---- */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <p className="caption">Demo / Education only — not financial advice.</p>
        </div>

        {/* ---- My Portfolio ---- */}
        <section>
          <h2>My Portfolio</h2>
          <PortfolioManager
            portfolioName={portfolioName}
            savedPortfolios={savedPortfolios}
            saveStatus={saveStatus}
            lastSaved={lastSaved}
            onSave={handleSavePortfolio}
            onLoad={handleLoadPortfolio}
            onDelete={handleDeletePortfolio}
          />
        </section>

        {/* ---- User Profile ---- */}
        <section>
          <UserProfilePanel profile={userProfile} onChange={setUserProfile} />
        </section>

        {/* ---- Connect Accounts ---- */}
        <section>
          <h2>Open Finance</h2>
          <button className="btn-connect-accounts" onClick={() => setShowBankConnect(true)}>
            🔗 Connect Accounts
          </button>
          <p className="live-note" style={{ marginTop: 6 }}>Simulate SGFinDex bank / CPF data pull.</p>
        </section>

        {/* ---- Import ---- */}
        <section>
          <h2>Import Portfolio</h2>
          <label>Upload CSV</label>
          <input type="file" accept=".csv" onChange={handleUpload} />

          <div className="import-actions">
            <button className="btn-apply" onClick={downloadTemplate}>
              Template CSV
            </button>
            <button className="btn-apply" onClick={() => setShowAddEntry(true)}>+ Add Entry</button>
          </div>

          <CsvGuide />

          <label style={{ marginTop: 14 }}>Or load a sample</label>
          <select value={currentSampleName || '(none)'} onChange={(e) => handleSample(e.target.value)}>
            <option value="(none)">(none)</option>
            <option value="balanced">Balanced</option>
            <option value="crypto_heavy">Crypto Heavy</option>
            <option value="property_heavy">Property Heavy</option>
          </select>
        </section>

        {/* ---- Live Prices ---- */}
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

        {/* ---- Scenario Lab ---- */}
        <section>
          <h2>Scenario Lab</h2>

          <label>Asset Class</label>
          <select value={scenarioClass} onChange={e => setScenarioClass(e.target.value)}>
            {assetClasses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <label>
            Change: <strong style={{ color: scenarioPct < 0 ? '#e74c3c' : '#2ecc71' }}>
              {scenarioPct > 0 ? '+' : ''}{scenarioPct}%
            </strong>
          </label>
          <input
            type="range" min="-100" max="100" step="1"
            value={scenarioPct}
            onChange={e => setScenarioPct(Number(e.target.value))}
            className="scenario-slider"
          />
          <div className="slider-labels">
            <span>-100%</span><span>0%</span><span>+100%</span>
          </div>

          <div className="scenario-btns">
            <button
              className={`btn-apply ${scenarioActive ? 'active' : ''}`}
              onClick={() => setScenarioActive(true)}
            >Apply</button>
            <button
              className="btn-reset"
              onClick={() => { setScenarioActive(false); setScenarioPct(-30); setScenarioClass('Crypto') }}
            >Reset</button>
          </div>

          {scenarioActive && (
            <div className="scenario-badge">Scenario: {scenarioLabel}</div>
          )}
        </section>
      </aside>

      {/* ---- Main ---- */}
      <main className="main">
        <div className="main-header-row">
          <div>
            <h1 className="main-title">Dashboard</h1>
            <p className="main-subtitle">Your complete financial health overview</p>
          </div>
          {result && (
            <div className="export-btns">
              <button className="btn-reset" onClick={exportCSV}>⬇ Export CSV</button>
              <button className="btn-reset" onClick={exportPDF}>⬇ Export PDF</button>
            </div>
          )}
        </div>

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
            <div className="scroll-reveal"><WealthSummary result={result} fmtSgd={fmtSgd} scenarioActive={scenarioActive} /></div>

            <div className="card mb-20 scroll-reveal">
              <h2>Net Worth History</h2>
              <NetWorthChart history={netWorthHistory} />
            </div>

            <div className="row mb-20 scroll-reveal">
              <div className="card">
                <h2>Allocation by Asset Class</h2>
                <AllocationChart data={result.allocation} />
              </div>
              <div className="card">
                <h2>Portfolio Holdings <span style={{ fontSize: 11, color: '#8b92a5', fontWeight: 400, textTransform: 'none' }}>· click a row to view chart</span></h2>
                <PortfolioTable assets={result.assets} fmtSgd={fmtSgd} onSelectAsset={setSelectedAsset} />
              </div>
            </div>

            {scenarioActive && result.scenarioImpact?.length > 0 && (
              <div className="card mb-20 scroll-reveal">
                <h2>Scenario Impact — Top Drivers</h2>
                <p style={{ fontSize: 12, color: '#aaa', marginBottom: 12 }}>
                  Applied: <strong>{scenarioLabel}</strong>
                </p>
                <ScenarioImpact items={result.scenarioImpact} fmtSgd={fmtSgd} />
              </div>
            )}

            <div className="charts-scores-section scroll-reveal">
              <FinancialCharts result={result} fmtSgd={fmtSgd} />

              <div className="scores-panel">
                <ScoreBarList scores={[
                  { label: 'Diversification', score: result.diversificationScore,
                    tooltip: 'Measures spread across asset classes using the Herfindahl index. Higher = less concentrated in any single class.' },
                  { label: 'Liquidity', score: result.liquidityScore,
                    tooltip: '% of your assets accessible within 7 days. Higher = more cash buffer for emergencies.' },
                  { label: 'Resilience', score: result.resilienceScore,
                    subtitle: `Worst scenario drop: ${result.worstDropPct.toFixed(1)}%`,
                    tooltip: 'Simulates 4 market shocks (Equity −15%, Crypto −30%, Bonds −5%, Private −10%) and scores based on the worst outcome.' },
                  { label: 'Debt Health', score: result.debtHealthScore ?? 100,
                    subtitle: result.totalDebts > 0 ? `Debt ratio: ${((result.totalDebts / result.totalAssets) * 100).toFixed(1)}%` : 'No liabilities',
                    tooltip: 'Measures leverage. 100 = zero debt. Drops to 0 when debts reach 50% of total assets. Based on your total debts vs total assets.' },
                  { label: 'Concentration', score: result.concentrationScore ?? 100,
                    tooltip: 'Looks at your single largest individual holding as a % of the portfolio — separate from Diversification which measures asset classes. Higher = no single holding dominates.' },
                  { label: 'Emergency Fund', score: result.emergencyFundScore ?? 0,
                    subtitle: `Cash: ${fmtSgd(result.cashOnHand ?? 0)}`,
                    tooltip: 'Rewards cash on hand as a buffer. Reaches 100/100 when cash ≥ 20% of total assets — the commonly recommended minimum emergency reserve.' },
                ]} />
              </div>
            </div>

            <div className="scroll-reveal"><PlatformBreakdown breakdown={result.platformBreakdown} totalAssets={result.totalAssets} fmtSgd={fmtSgd} /></div>

            <div className="scroll-reveal"><HealthSummary issues={result.healthIssues} /></div>

            <div className="row scroll-reveal">
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

      <ChatBot assets={assets} userProfile={userProfile} analysisResult={result} />

      <AssetModal asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
      {showAddEntry && (
        <AddEntryModal onClose={() => setShowAddEntry(false)} onAdd={handleAddEntry} />
      )}
      {showBankConnect && (
        <BankConnectModal onClose={() => setShowBankConnect(false)} onImport={handleBankImport} />
      )}
    </div>

    <footer className="ventura-footer">
      <div className="ventura-footer-grid">
        <div className="ventura-footer-col">
          <h4>Company</h4>
          <button className="ventura-footer-link">About Ventura</button>
          <button className="ventura-footer-link">Our Mission</button>
          <button className="ventura-footer-link">Security & Trust</button>
          <button className="ventura-footer-link">Terms of Use</button>
          <button className="ventura-footer-link">Privacy Policy</button>
        </div>
        <div className="ventura-footer-col">
          <h4>Product</h4>
          <button className="ventura-footer-link">How It Works</button>
          <button className="ventura-footer-link">Watch Demo</button>
          <button className="ventura-footer-link">Get on iOS</button>
          <button className="ventura-footer-link">Get on Android</button>
          <button className="ventura-footer-link">Refer a Friend</button>
        </div>
        <div className="ventura-footer-col">
          <h4>Community</h4>
          <button className="ventura-footer-link">Customer Stories</button>
          <button className="ventura-footer-link">Ventura Blog</button>
          <button className="ventura-footer-link">Help Center</button>
          <button className="ventura-footer-link">X / Twitter</button>
          <button className="ventura-footer-link">LinkedIn</button>
        </div>
      </div>
      <div className="ventura-footer-bottom">
        <span className="ventura-footer-brand">VENTURA</span>
        <span className="ventura-footer-copy">© {new Date().getFullYear()} Ventura · Demo use only · Not financial advice</span>
      </div>
    </footer>
    </div>
  )
}
