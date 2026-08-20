import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { getRoute } from '../services/routingService';

// Leaflet's default marker icons reference image files that Vite doesn't
// resolve automatically — build our own simple colored pin markers instead.
function pinIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 26px; height: 26px; border-radius: 50% 50% 50% 0;
      background: ${color}; transform: rotate(-45deg);
      border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -26],
  });
}

const clientIcon = pinIcon('#ef4444');
const mechanicIcon = pinIcon('#1c69d4');

/** Keeps the map's viewport fitted to whatever markers are currently shown. */
function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 14);
    } else {
      map.fitBounds(points, { padding: [40, 40] });
    }
  }, [points, map]);
  return null;
}

/**
 * Real interactive map replacing SimulatedMap.jsx.
 * Props:
 *  - clientPosition: { latitude, longitude }
 *  - mechanicPosition: { latitude, longitude } | null (not shown until PENDING is cleared)
 *  - status: request_status string, used to decide whether to draw a route
 */
export default function RealMap({ clientPosition, mechanicPosition, status }) {
  const [routeCoords, setRouteCoords] = useState(null);

  const showMechanic = !!mechanicPosition && status !== 'PENDING';
  const showRoute = showMechanic && status === 'EN_ROUTE';

  useEffect(() => {
    let cancelled = false;
    if (!showRoute || !clientPosition || !mechanicPosition) {
      setRouteCoords(null);
      return undefined;
    }
    getRoute(mechanicPosition, clientPosition).then((route) => {
      if (cancelled) return;
      setRouteCoords(route ? route.coordinates : null);
    });
    return () => {
      cancelled = true;
    };
  }, [showRoute, clientPosition?.latitude, clientPosition?.longitude, mechanicPosition?.latitude, mechanicPosition?.longitude]);

  const points = useMemo(() => {
    const pts = [];
    if (clientPosition) pts.push([clientPosition.latitude, clientPosition.longitude]);
    if (showMechanic) pts.push([mechanicPosition.latitude, mechanicPosition.longitude]);
    return pts;
  }, [clientPosition, mechanicPosition, showMechanic]);

  if (!clientPosition) {
    return (
      <div className="map-canvas-container" style={{ minHeight: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        No location set for this request yet.
      </div>
    );
  }

  return (
    <div className="map-canvas-container" style={{ minHeight: '340px', height: '100%' }}>
      <MapContainer
        center={[clientPosition.latitude, clientPosition.longitude]}
        zoom={14}
        scrollWheelZoom
        style={{ width: '100%', height: '100%', minHeight: '340px', borderRadius: 'var(--radius-md)' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={[clientPosition.latitude, clientPosition.longitude]} icon={clientIcon}>
          <Popup>Client breakdown location</Popup>
        </Marker>

        {showMechanic && (
          <Marker position={[mechanicPosition.latitude, mechanicPosition.longitude]} icon={mechanicIcon}>
            <Popup>Mechanic's current location</Popup>
          </Marker>
        )}

        {showRoute && (
          <Polyline
            positions={
              routeCoords || [
                [mechanicPosition.latitude, mechanicPosition.longitude],
                [clientPosition.latitude, clientPosition.longitude],
              ]
            }
            pathOptions={{ color: '#1c69d4', weight: 4, opacity: 0.8, dashArray: routeCoords ? null : '6,8' }}
          />
        )}

        <FitBounds points={points} />
      </MapContainer>
    </div>
  );
}
