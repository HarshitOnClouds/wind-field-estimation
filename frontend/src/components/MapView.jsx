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
        // First click sets the start point and starts drawing
        setStartPoint(e.latlng)
        setCurrentPoint(e.latlng)
        setBounds(null)
      } else {
        // Second click finalizes the bounds
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
      if (startPoint) {
        setCurrentPoint(e.latlng)
      }
    }
  })

  if (bounds) {
    const displayBounds = [
      [bounds.min_lat, bounds.min_lon],
      [bounds.max_lat, bounds.max_lon]
    ]
    return <Rectangle bounds={displayBounds} color="blue" weight={2} fillOpacity={0.1} />
  }

  if (startPoint && currentPoint) {
    const previewBounds = [
      [startPoint.lat, startPoint.lng],
      [currentPoint.lat, currentPoint.lng]
    ]
    return <Rectangle bounds={previewBounds} color="blue" weight={2} fillOpacity={0.2} dashArray="5, 5" />
  }

  return null
}

function WindVectorLayer({ vectors }) {
  if (!vectors || vectors.length === 0) return null

  // Scaling factor for displaying the main vector components
  const scale = 0.05
  // Length of the arrowhead wings in degrees (map units)
  const headLength = 0.015
  // Angle of the arrowhead wings (approx 30 degrees)
  const headAngle = Math.PI / 6

  return (
    <FeatureGroup>
      {vectors.map((vec, i) => {
        const startLat = vec.lat
        const startLon = vec.lon
        
        // Compute endpoint
        const endLat = startLat + vec.v * scale
        const endLon = startLon + vec.u * scale

        // Calculate direction angle of the vector
        const angle = Math.atan2(vec.v, vec.u)

        // Compute arrow head points
        const leftLat = endLat - headLength * Math.sin(angle - headAngle)
        const leftLon = endLon - headLength * Math.cos(angle - headAngle)

        const rightLat = endLat - headLength * Math.sin(angle + headAngle)
        const rightLon = endLon - headLength * Math.cos(angle + headAngle)

        // Path representing the line and the two arrow head wings
        const arrowPositions = [
          [startLat, startLon],
          [endLat, endLon],
          [leftLat, leftLon],
          [endLat, endLon],
          [rightLat, rightLon]
        ]

        return (
          <Polyline 
            key={`arrow-${i}`} 
            positions={arrowPositions} 
            color="#00FFFF" // Cyan / light blue
            weight={1.5}    // Thin lines
            opacity={0.85}
            smoothFactor={1}
          />
        )
      })}
    </FeatureGroup>
  )
}

export default function MapView({ bounds, setBounds, windVectors }) {
  return (
    <MapContainer
      center={[22.0, 69.0]}
      zoom={6}
      style={{
        height: '100vh',
        width: '100%'
      }}
      className="z-0 bg-gray-900" // Adding a dark background helps cyan lines pop if tiles haven't loaded
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url='https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' // Switched to a dark tile layer for better cyan arrow visibility
      />
      <BoundingBoxSelector bounds={bounds} setBounds={setBounds} />
      <WindVectorLayer vectors={windVectors} />
    </MapContainer>
  )
}