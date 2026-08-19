import { supabase } from '../lib/supabaseClient';

/** Wraps navigator.geolocation in a Promise. Rejects with a readable message on denial. */
export function getBrowserLocation() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error('Location permission denied. Please enter your location manually.'));
        } else {
          reject(new Error('Could not get your location. Please enter it manually.'));
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

/** Watches position continuously; returns a function to stop watching. */
export function watchBrowserLocation(onUpdate, onError) {
  if (!('geolocation' in navigator)) {
    onError?.(new Error('Geolocation is not supported by this browser.'));
    return () => {};
  }
  const watchId = navigator.geolocation.watchPosition(
    (pos) => onUpdate({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
    (err) => onError?.(err),
    { enableHighAccuracy: true, maximumAge: 5000 }
  );
  return () => navigator.geolocation.clearWatch(watchId);
}

/** Persists a mechanic's current location — both the live pointer on mechanic_profiles
 *  and an append-only ping in mechanic_locations for history/tracking. */
export async function updateMechanicLocation(mechanicId, { latitude, longitude, requestId = null }) {
  const [{ error: profileErr }, { error: pingErr }] = await Promise.all([
    supabase.from('mechanic_profiles').update({ latitude, longitude }).eq('user_id', mechanicId),
    supabase.from('mechanic_locations').insert({ mechanic_id: mechanicId, request_id: requestId, latitude, longitude }),
  ]);
  if (profileErr) throw profileErr;
  if (pingErr) throw pingErr;
}

/** Realtime subscription to a mechanic's live position (client side, tracking their assigned job). */
export function subscribeToMechanicLocation(mechanicId, onUpdate) {
  const channel = supabase
    .channel(`mechanic-location-${mechanicId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'mechanic_locations', filter: `mechanic_id=eq.${mechanicId}` },
      (payload) => onUpdate({ latitude: payload.new.latitude, longitude: payload.new.longitude })
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
