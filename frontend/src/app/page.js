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
      setError('Please select an Area of Interest on the map.')
      return
    }
    if (!date) {
      setError('Please select a date.')
      return
    }

    setLoading(true)
    setError('')
    setResults(null)

    try {
      const response = await fetch('http://127.0.0.1:8000/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          min_lon: bounds.min_lon,
          min_lat: bounds.min_lat,
          max_lon: bounds.max_lon,
          max_lat: bounds.max_lat,
          date: date
        })
      })

      if (!response.ok) {
        throw new Error('Prediction request failed')
      }

      const data = await response.json()
      setResults(data)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex flex-row-reverse h-screen w-full bg-gray-100 text-gray-800">
      {/* Side Panel */}
      <div className="w-1/4 min-w-[300px] max-w-[400px] bg-white p-6 shadow-xl z-20 flex flex-col gap-6 overflow-y-auto">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wind Field Estimator</h1>
          <p className="text-sm text-gray-500 mt-1">Select an AOI directly on the map, pick a date, and estimate the wind field.</p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-semibold text-sm">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-semibold text-sm">Area of Interest (AOI)</label>
          {bounds ? (
            <div className="text-xs bg-gray-50 p-3 rounded-md border border-gray-200 grid grid-cols-2 gap-2">
              <div><span className="text-gray-500">Min Lat:</span> {bounds.min_lat.toFixed(4)}</div>
              <div><span className="text-gray-500">Max Lat:</span> {bounds.max_lat.toFixed(4)}</div>
              <div><span className="text-gray-500">Min Lon:</span> {bounds.min_lon.toFixed(4)}</div>
              <div><span className="text-gray-500">Max Lon:</span> {bounds.max_lon.toFixed(4)}</div>
            </div>
          ) : (
            <div className="text-sm text-green-700 italic bg-green-50 p-3 rounded-md border border-green-200">
              Click twice on the map to draw a bounding box.
            </div>
          )}
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <button
          onClick={handlePredict}
          disabled={loading}
          className={`py-2 px-4 rounded-md text-white font-medium transition-colors ${
            loading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {loading ? 'Estimating...' : 'Get Prediction'}
        </button>

        {results && (
          <div className="mt-4 flex flex-col gap-4 border-t pt-4 border-gray-200">
            <h2 className="text-lg font-bold">Results</h2>
            
            <div className="bg-blue-50 border border-blue-100 p-3 rounded-md">
              <div className="text-sm text-blue-800 font-semibold mb-1">Predicted Wind Speed</div>
              <div className="text-2xl font-bold text-blue-900">
                {results.predicted_wind_speed_mps?.toFixed(2)} <span className="text-base font-normal">m/s</span>
              </div>
            </div>

            {results.sar_features && (
              <div className="bg-gray-50 border border-gray-200 p-3 rounded-md">
                <div className="text-sm font-semibold mb-2">SAR Features</div>
                <div className="grid grid-cols-2 gap-y-2 text-xs">
                  <div><span className="text-gray-500">Mean:</span> {results.sar_features.sar_mean?.toFixed(2)}</div>
                  <div><span className="text-gray-500">Std:</span> {results.sar_features.sar_std?.toFixed(2)}</div>
                  <div><span className="text-gray-500">P25:</span> {results.sar_features.sar_p25?.toFixed(2)}</div>
                  <div><span className="text-gray-500">P50:</span> {results.sar_features.sar_p50?.toFixed(2)}</div>
                  <div><span className="text-gray-500">P75:</span> {results.sar_features.sar_p75?.toFixed(2)}</div>
                </div>
              </div>
            )}

            {results.generated_image && (
              <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
                <div className="text-sm font-semibold p-2 bg-gray-50 border-b border-gray-200">Wind Field Plot</div>
                <div className="flex justify-center p-2">
                  <img 
                    src={`http://127.0.0.1:8000/generated/${results.generated_image}`} 
                    alt="Wind Field Quiver Plot" 
                    className="max-h-40 w-auto object-contain"
                  />
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500 mt-2">
              Viewing {results.wind_vectors?.length || 0} wind vectors on the map.
            </div>
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="flex-1 w-3/4">
        <MapView bounds={bounds} setBounds={setBounds} windVectors={results?.wind_vectors} />
      </div>
    </main>
  )
}