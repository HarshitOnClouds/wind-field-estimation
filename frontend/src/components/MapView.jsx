'use client'

import { useState } from 'react'
import { MapContainer, TileLayer, useMapEvents, Rectangle, Polyline, FeatureGroup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

function BoundingBoxSelector({ bounds, setBounds }) {
  const [startPoint, setStartPoint] = useState(null)
  const [currentPoint, setCurrentPoint] = useState(null)

  useMapEvents({
    click(e) {
      if (!startPoint) {
        setStartPoint(e.latlng)
        setCurrentPoint(e.latlng)
        setBounds(null)
      } else {
        const newBounds = {
          min_lat: Math.min(startPoint.lat, e.latlng.lat),
          max_lat: Math.max(startPoint.lat, e.latlng.lat),
          min_lon: Math.min(startPoint.lng, e.latlng.lng),
          max_lon: Math.max(startPoint.lng, e.latlng.lng),
        }
        setBounds(newBounds)
        setStartPoint(null)
        setCurrentPoint(null)
      }
    },
    mousemove(e) {
      if (startPoint) setCurrentPoint(e.latlng)
    }
  })

  if (bounds) {
    return (
      <Rectangle
        bounds={[[bounds.min_lat, bounds.min_lon], [bounds.max_lat, bounds.max_lon]]}
        pathOptions={{
          color: '#2e7dcc',
          weight: 1.5,
          fillColor: '#2e7dcc',
          fillOpacity: 0.07,
          dashArray: undefined,
        }}
      />
    )
  }

  if (startPoint && currentPoint) {
    return (
      <Rectangle
        bounds={[[startPoint.lat, startPoint.lng], [currentPoint.lat, currentPoint.lng]]}
        pathOptions={{
          color: '#2e7dcc',
          weight: 1,
          fillColor: '#2e7dcc',
          fillOpacity: 0.05,
          dashArray: '5 5',
        }}
      />
    )
  }

  return null
}

function WindVectorLayer({ vectors }) {
  if (!vectors || vectors.length === 0) return null

  const scale = 0.05
  const headLength = 0.015
  const headAngle = Math.PI / 6

  return (
    <FeatureGroup>
      {vectors.map((vec, i) => {
        const startLat = vec.lat
        const startLon = vec.lon
        const endLat = startLat + vec.v * scale
        const endLon = startLon + vec.u * scale
        const angle = Math.atan2(vec.v, vec.u)

        const leftLat = endLat - headLength * Math.sin(angle - headAngle)
        const leftLon = endLon - headLength * Math.cos(angle - headAngle)
        const rightLat = endLat - headLength * Math.sin(angle + headAngle)
        const rightLon = endLon - headLength * Math.cos(angle + headAngle)

        return (
          <Polyline
            key={`arrow-${i}`}
            positions={[
              [startLat, startLon],
              [endLat, endLon],
              [leftLat, leftLon],
              [endLat, endLon],
              [rightLat, rightLon]
            ]}
            pathOptions={{
              color: '#00d4ff',
              weight: 1.5,
              opacity: 0.8,
            }}
            smoothFactor={1}
          />
        )
      })}
    </FeatureGroup>
  )
}

export default function MapView({ bounds, setBounds, windVectors }) {
  return (
    <>
      <style>{`
        .leaflet-container {
          height: 100vh;
          width: 100%;
          background: #080c10;
          cursor: crosshair;
        }

        /* Attribution minimal */
        .leaflet-control-attribution {
          background: rgba(8,12,16,0.75) !important;
          color: #2e3e50 !important;
          font-size: 9px !important;
          border-top: 1px solid #1e2a38 !important;
        }
        .leaflet-control-attribution a {
          color: #2e3e50 !important;
        }

        /* Zoom controls */
        .leaflet-control-zoom {
          border: 1px solid #1e2a38 !important;
          border-radius: 4px !important;
          overflow: hidden;
          box-shadow: none !important;
        }
        .leaflet-control-zoom a {
          background: #0d1117 !important;
          color: #4a5d70 !important;
          border-color: #1e2a38 !important;
          font-family: monospace;
          transition: background 0.15s, color 0.15s;
        }
        .leaflet-control-zoom a:hover {
          background: #111820 !important;
          color: #7eb8f7 !important;
        }
      `}</style>

      <MapContainer
        center={[22.0, 69.0]}
        zoom={6}
        style={{ height: '100vh', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <BoundingBoxSelector bounds={bounds} setBounds={setBounds} />
        <WindVectorLayer vectors={windVectors} />
      </MapContainer>
    </>
  )
}