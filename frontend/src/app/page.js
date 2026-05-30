'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
})

export default function Home() {
  const [bounds, setBounds] = useState(null)
  const [date, setDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')

  const handlePredict = async () => {
    if (!bounds) {
      setError('Select an area of interest on the map first.')
      return
    }
    if (!date) {
      setError('A date is required.')
      return
    }

    setLoading(true)
    setError('')
    setResults(null)

    try {
      const response = await fetch('http://127.0.0.1:8000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          min_lon: bounds.min_lon,
          min_lat: bounds.min_lat,
          max_lon: bounds.max_lon,
          max_lat: bounds.max_lat,
          date: date
        })
      })

      if (!response.ok) throw new Error('Prediction request failed')

      const data = await response.json()
      setResults(data)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #080c10;
          font-family: 'DM Sans', sans-serif;
        }

        .layout {
          display: flex;
          height: 100vh;
          width: 100%;
          overflow: hidden;
        }

        /* ── Panel ── */
        .panel {
          width: 320px;
          flex-shrink: 0;
          background: #0d1117;
          border-right: 1px solid #1e2a38;
          display: flex;
          flex-direction: column;
          z-index: 20;
          overflow: hidden;
        }

        .panel-header {
          padding: 28px 24px 20px;
          border-bottom: 1px solid #1e2a38;
        }

        .panel-eyebrow {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #2e7dcc;
          margin-bottom: 8px;
        }

        .panel-title {
          font-family: 'Space Mono', monospace;
          font-size: 18px;
          font-weight: 700;
          color: #e8edf3;
          line-height: 1.2;
        }

        .panel-sub {
          font-size: 12px;
          color: #4a5d70;
          margin-top: 6px;
          line-height: 1.5;
        }

        .panel-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          scrollbar-width: thin;
          scrollbar-color: #1e2a38 transparent;
        }
        
        .panel-body > * {
          flex-shrink: 0;
        }

        /* ── Section label ── */
        .field-label {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #4a5d70;
          margin-bottom: 8px;
        }

        /* ── Date input ── */
        .date-input {
          width: 100%;
          background: #111820;
          border: 1px solid #1e2a38;
          border-radius: 4px;
          padding: 10px 12px;
          font-family: 'Space Mono', monospace;
          font-size: 13px;
          color: #c9d4de;
          outline: none;
          transition: border-color 0.15s;
          color-scheme: dark;
        }
        .date-input:focus {
          border-color: #2e7dcc;
        }

        /* ── AOI box ── */
        .aoi-empty {
          background: #111820;
          border: 1px dashed #1e2a38;
          border-radius: 4px;
          padding: 14px 12px;
          font-size: 12px;
          color: #4a5d70;
          line-height: 1.5;
        }
        .aoi-empty span {
          color: #2e7dcc;
        }

        .aoi-grid {
          background: #111820;
          border: 1px solid #1e2a38;
          border-radius: 4px;
          padding: 12px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .aoi-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .aoi-cell-label {
          font-family: 'Space Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #4a5d70;
        }
        .aoi-cell-value {
          font-family: 'Space Mono', monospace;
          font-size: 12px;
          color: #7eb8f7;
        }

        /* ── Error ── */
        .error-bar {
          background: #1a0d0d;
          border: 1px solid #5a1f1f;
          border-radius: 4px;
          padding: 10px 12px;
          font-size: 12px;
          color: #e07070;
        }

        /* ── Run button ── */
        .run-btn {
          width: 100%;
          padding: 12px;
          background: #2e7dcc;
          border: none;
          border-radius: 4px;
          font-family: 'Space Mono', monospace;
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #fff;
          cursor: pointer;
          transition: background 0.15s, opacity 0.15s;
          position: relative;
          overflow: hidden;
        }
        .run-btn:hover:not(:disabled) {
          background: #3a8de0;
        }
        .run-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .run-btn.loading::after {
          content: '';
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 2px;
          background: rgba(255,255,255,0.4);
          animation: progress 1.4s ease-in-out infinite;
        }
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        /* ── Results ── */
        .results-divider {
          border: none;
          border-top: 1px solid #1e2a38;
        }

        .wind-speed-card {
          background: #0a1626;
          border: 1px solid #1b3150;
          border-radius: 4px;
          padding: 16px;
        }
        .wind-speed-label {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #2e7dcc;
          margin-bottom: 8px;
        }
        .wind-speed-value {
          font-family: 'Space Mono', monospace;
          font-size: 34px;
          font-weight: 700;
          color: #7eb8f7;
          line-height: 1;
        }
        .wind-speed-unit {
          font-family: 'Space Mono', monospace;
          font-size: 13px;
          font-weight: 400;
          color: #4a5d70;
          margin-left: 4px;
        }

        .sar-card {
          background: #111820;
          border: 1px solid #1e2a38;
          border-radius: 4px;
          padding: 14px;
        }
        .sar-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 10px;
        }
        .sar-cell-label {
          font-family: 'Space Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #4a5d70;
          margin-bottom: 2px;
        }
        .sar-cell-value {
          font-family: 'Space Mono', monospace;
          font-size: 13px;
          color: #c9d4de;
        }

        .img-card {
          background: #111820;
          border: 1px solid #1e2a38;
          border-radius: 4px;
          overflow: hidden;
          min-height: 180px;
        }
        .img-card-header {
          padding: 8px 14px;
          border-bottom: 1px solid #1e2a38;
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #4a5d70;
        }
        .img-card img {
          display: block;
          width: 100%;
          min-height: 150px;
          max-height: 240px;
          object-fit: contain;
          background: #080c10;
        }

        .vectors-note {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          color: #2e3e50;
          text-align: center;
          padding-top: 4px;
        }

        /* ── Map ── */
        .map-wrapper {
          flex: 1;
          position: relative;
          overflow: hidden;
        }

        /* Scanline overlay on map for atmosphere */
        .map-wrapper::after {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 3px,
            rgba(0,0,0,0.03) 3px,
            rgba(0,0,0,0.03) 4px
          );
          pointer-events: none;
          z-index: 10;
        }

        /* Corner HUD labels */
        .hud-corner {
          position: absolute;
          z-index: 15;
          pointer-events: none;
        }
        .hud-tl {
          top: 20px;
          left: 20px;
        }
        .hud-br {
          bottom: 20px;
          right: 20px;
        }
        .hud-label {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(46,125,204,0.6);
          background: rgba(8,12,16,0.7);
          padding: 4px 8px;
          border: 1px solid rgba(30,42,56,0.8);
          border-radius: 2px;
          white-space: nowrap;
        }
      `}</style>

      <div className="layout">
        {/* ── Side Panel ── */}
        <aside className="panel">
          <div className="panel-header">
            <p className="panel-eyebrow">SAR Analysis</p>
            <h1 className="panel-title">Wind Field<br/>Estimator</h1>
            <p className="panel-sub">Select an AOI on the map, pick a date, and run the prediction model.</p>
          </div>

          <div className="panel-body">
            {/* Date */}
            <div>
              <p className="field-label">Acquisition date</p>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="date-input"
              />
            </div>

            {/* AOI */}
            <div>
              <p className="field-label">Area of interest</p>
              {bounds ? (
                <div className="aoi-grid">
                  {[
                    ['Min Lat', bounds.min_lat.toFixed(4)],
                    ['Max Lat', bounds.max_lat.toFixed(4)],
                    ['Min Lon', bounds.min_lon.toFixed(4)],
                    ['Max Lon', bounds.max_lon.toFixed(4)],
                  ].map(([label, val]) => (
                    <div className="aoi-cell" key={label}>
                      <span className="aoi-cell-label">{label}</span>
                      <span className="aoi-cell-value">{val}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="aoi-empty">
                  <span>Click twice on the map</span> to draw a bounding box.
                </div>
              )}
            </div>

            {/* Error */}
            {error && <div className="error-bar">{error}</div>}

            {/* Run */}
            <button
              onClick={handlePredict}
              disabled={loading}
              className={`run-btn${loading ? ' loading' : ''}`}
            >
              {loading ? 'Estimating…' : 'Run Prediction'}
            </button>

            {/* Results */}
            {results && (
              <>
                <hr className="results-divider" />

                <div className="wind-speed-card">
                  <p className="wind-speed-label">Predicted wind speed</p>
                  <div>
                    <span className="wind-speed-value">
                      {results.predicted_wind_speed_mps?.toFixed(2)}
                    </span>
                    <span className="wind-speed-unit">m/s</span>
                  </div>
                </div>

                {results.sar_features && (
                  <div className="sar-card">
                    <p className="field-label">SAR features</p>
                    <div className="sar-grid">
                      {[
                        ['Mean', results.sar_features.sar_mean],
                        ['Std', results.sar_features.sar_std],
                        ['P25', results.sar_features.sar_p25],
                        ['P50', results.sar_features.sar_p50],
                        ['P75', results.sar_features.sar_p75],
                      ].map(([label, val]) => (
                        <div key={label}>
                          <p className="sar-cell-label">{label}</p>
                          <p className="sar-cell-value">{val?.toFixed(3)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {results.generated_image && (
                  <div className="img-card">
                    <div className="img-card-header">Wind field plot</div>
                    <img
                      src={`http://127.0.0.1:8000/generated/${results.generated_image.split(/[\\/]/).pop()}`}
                      alt="Wind Field Quiver Plot"
                      onError={(e) => { e.target.style.outline = '1px solid red'; console.error('Image failed to load:', e.target.src); }}
                    />
                  </div>
                )}

                <p className="vectors-note">
                  {results.wind_vectors?.length || 0} vectors rendered on map
                </p>
              </>
            )}
          </div>
        </aside>

        {/* ── Map ── */}
        <div className="map-wrapper">
          {/* HUD labels */}
          <div className="hud-corner hud-tl">
            <span className="hud-label">SAR · Wind Field · v1.0</span>
          </div>
          {bounds && (
            <div className="hud-corner hud-br">
              <span className="hud-label">
                AOI {bounds.min_lat.toFixed(2)}°N {bounds.min_lon.toFixed(2)}°E
                {' → '}
                {bounds.max_lat.toFixed(2)}°N {bounds.max_lon.toFixed(2)}°E
              </span>
            </div>
          )}

          <MapView bounds={bounds} setBounds={setBounds} windVectors={results?.wind_vectors} />
        </div>
      </div>
    </>
  )
}