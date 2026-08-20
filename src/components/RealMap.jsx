import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { getRoute } from '../services/routingService';

// Custom pin marker helper
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

/** Keeps the map's viewport fitted to whatever valid markers are currently shown. */
function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    const validPoints = (points || []).filter(
      (p) => p && Array.isArray(p) && p[0] != null && p[1] != null && !isNaN(p[0]) && !isNaN(p[1])
    );

    if (validPoints.length === 0) return;
    if (validPoints.length === 1) {
      map.setView(validPoints[0], 14);
    } else {
      try {
        map.fitBounds(validPoints, { padding: [40, 40] });
      } catch (e) {}
    }
  }, [points, map]);
  return null;
}

/**
 * Real interactive Leaflet map for live client/mechanic tracking and routing.
 */
export default function RealMap({ clientPosition, mechanicPosition, status }) {
  const [routeCoords, setRouteCoords] = useState(null);

  // Safe coordinate validation (Lahore fallback: 31.5204, 74.3587)
  const clientLat = Number(clientPosition?.latitude) || 31.5204;
  const clientLng = Number(clientPosition?.longitude) || 74.3587;

  const hasValidMechanic =
    mechanicPosition &&
    mechanicPosition.latitude != null &&
    mechanicPosition.longitude != null &&
    !isNaN(Number(mechanicPosition.latitude)) &&
    !isNaN(Number(mechanicPosition.longitude));

  const mechLat = hasValidMechanic ? Number(mechanicPosition.latitude) : null;
  const mechLng = hasValidMechanic ? Number(mechanicPosition.longitude) : null;

  const showMechanic = hasValidMechanic && status !== 'PENDING';
  const showRoute = showMechanic && status === 'EN_ROUTE';

  useEffect(() => {
    let cancelled = false;
    if (!showRoute || !hasValidMechanic) {
      setRouteCoords(null);
      return undefined;
    }

    getRoute({ latitude: mechLat, longitude: mechLng }, { latitude: clientLat, longitude: clientLng }).then(
      (route) => {
        if (cancelled) return;
        setRouteCoords(route ? route.coordinates : null);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [showRoute, hasValidMechanic, mechLat, mechLng, clientLat, clientLng]);

  const points = useMemo(() => {
    const pts = [[clientLat, clientLng]];
    if (showMechanic && mechLat != null && mechLng != null) {
      pts.push([mechLat, mechLng]);
    }
    return pts;
  }, [clientLat, clientLng, showMechanic, mechLat, mechLng]);

  return (
    <div className="map-canvas-container" style={{ minHeight: '340px', height: '100%' }}>
      <MapContainer
        center={[clientLat, clientLng]}
        zoom={14}
        scrollWheelZoom
        style={{ width: '100%', height: '100%', minHeight: '340px', borderRadius: 'var(--radius-md)' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={[clientLat, clientLng]} icon={clientIcon}>
          <Popup>Client breakdown location</Popup>
        </Marker>

        {showMechanic && mechLat != null && mechLng != null && (
          <Marker position={[mechLat, mechLng]} icon={mechanicIcon}>
            <Popup>Mechanic's current location</Popup>
          </Marker>
        )}

        {showRoute && mechLat != null && mechLng != null && (
          <Polyline
            positions={routeCoords || [[mechLat, mechLng], [clientLat, clientLng]]}
            pathOptions={{ color: '#1c69d4', weight: 4, opacity: 0.8, dashArray: routeCoords ? null : '6,8' }}
          />
        )}

        <FitBounds points={points} />
      </MapContainer>
    </div>
  );
}
