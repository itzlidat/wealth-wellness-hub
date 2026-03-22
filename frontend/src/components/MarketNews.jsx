import { useEffect, useRef, useState } from 'react'

function Widget() {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.innerHTML = '<div class="tradingview-widget-container__widget"></div>'

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-timeline.js'
    script.async = true
    script.type = 'text/javascript'
    script.innerHTML = JSON.stringify({
      feedMode: 'all_symbols',
      isTransparent: true,
      displayMode: 'compact',
      width: '100%',
      height: '100%',
      autosize: true,
      colorTheme: 'dark',
      locale: 'en',
    })

    container.appendChild(script)

    return () => { container.innerHTML = '' }
  }, [])

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ width: '100%', height: '100%', flex: 1 }}
    />
  )
}

export default function MarketNews() {
  const [key, setKey] = useState(0)
  const [spinning, setSpinning] = useState(false)

  const handleRefresh = () => {
    setSpinning(true)
    setKey(k => k + 1)
    setTimeout(() => setSpinning(false), 1200)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <Widget key={key} />
      <div className="news-refresh-bar">
        <button className="news-refresh-btn" onClick={handleRefresh} disabled={spinning}>
          <span className={spinning ? 'news-refresh-icon spinning' : 'news-refresh-icon'}>↻</span>
          {spinning ? 'Refreshing...' : 'Refresh News'}
        </button>
      </div>
    </div>
  )
}
