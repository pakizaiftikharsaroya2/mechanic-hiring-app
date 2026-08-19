// Uses OSRM's free public demo server — no API key needed.
// Rate-limited and "best effort" (per OSRM's usage policy), which is fine
// for an internship demo. To swap in a keyed provider later (e.g.
// OpenRouteService), only this file needs to change — everything else
// calls getRoute() and doesn't care how it's computed.
const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1/driving';

/**
 * Returns { coordinates: [[lat, lng], ...], distanceKm, durationMin }
 * for the driving route between two points, or null if the request fails
 * (callers should fall back to a straight line between the two markers).
 */
export async function getRoute(from, to) {
  try {
    const url = `${OSRM_BASE_URL}/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route) return null;

    return {
      // GeoJSON is [lng, lat]; Leaflet wants [lat, lng].
      coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60,
    };
  } catch {
    return null; // network hiccup — caller draws a straight line instead
  }
}

/** Reverse geocoding via Nominatim (OpenStreetMap), also free/no key. */
export async function reverseGeocode(latitude, longitude) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.display_name || null;
  } catch {
    return null;
  }
}
