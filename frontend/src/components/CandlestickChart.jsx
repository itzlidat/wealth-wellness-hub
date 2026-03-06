import { useEffect, useRef } from 'react'
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts'

export default function CandlestickChart({ bars, currency }) {
  const containerRef = useRef()

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#111318' },
        textColor: '#8b92a5',
        fontSize: 12,
      },
      width: containerRef.current.clientWidth,
      height: 320,
      grid: {
        vertLines: { color: '#1a1d26' },
        horzLines: { color: '#1a1d26' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#555b6e', labelBackgroundColor: '#23262f' },
        horzLine: { color: '#555b6e', labelBackgroundColor: '#23262f' },
      },
      rightPriceScale: { borderColor: '#23262f' },
      timeScale:       { borderColor: '#23262f', timeVisible: false },
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
        justifyContent: 'center', background: '#111318',
        borderRadius: 8, color: '#555b6e', fontSize: 14
      }}>
        No chart data available for this asset.
      </div>
    )
  }

  return (
    <div style={{ borderRadius: 8, overflow: 'hidden' }}>
      <div ref={containerRef} />
      <div style={{
        background: '#111318', padding: '6px 12px',
        fontSize: 11, color: '#555b6e', textAlign: 'right'
      }}>
        Prices in {currency} · Daily candles
      </div>
    </div>
  )
}
