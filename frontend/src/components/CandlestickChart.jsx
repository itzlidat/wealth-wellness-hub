import { useEffect, useRef } from 'react'
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts'

export default function CandlestickChart({ bars, currency }) {
  const containerRef = useRef()

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0d1117' },
        textColor: '#8b949e',
        fontSize: 12,
      },
      width: containerRef.current.clientWidth,
      height: 320,
      grid: {
        vertLines: { color: '#161b22' },
        horzLines: { color: '#161b22' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#444c56', labelBackgroundColor: '#21262d' },
        horzLine: { color: '#444c56', labelBackgroundColor: '#21262d' },
      },
      rightPriceScale: { borderColor: '#21262d' },
      timeScale:       { borderColor: '#21262d', timeVisible: false },
    })

    const series = chart.addCandlestickSeries({
      upColor:         '#3fb950',
      downColor:       '#f85149',
      borderUpColor:   '#3fb950',
      borderDownColor: '#f85149',
      wickUpColor:     '#3fb950',
      wickDownColor:   '#f85149',
    })

    if (bars?.length) {
      series.setData(bars)
      chart.timeScale().fitContent()
    }

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth })
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [bars])

  if (!bars || bars.length === 0) {
    return (
      <div style={{
        height: 320, display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#0d1117',
        borderRadius: 8, color: '#555', fontSize: 14
      }}>
        No chart data available for this asset.
      </div>
    )
  }

  return (
    <div style={{ borderRadius: 8, overflow: 'hidden' }}>
      <div ref={containerRef} />
      <div style={{
        background: '#0d1117', padding: '6px 12px',
        fontSize: 11, color: '#444c56', textAlign: 'right'
      }}>
        Prices in {currency} · Daily candles
      </div>
    </div>
  )
}
