import { supabase } from '../lib/supabaseClient';

export async function fetchMechanicProfile(userId) {
  const { data, error } = await supabase
    .from('mechanic_profiles')
    .select('*, profile:profiles(*)')
    .eq('user_id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function setMechanicStatus(userId, status) {
  const { data, error } = await supabase
    .from('mechanic_profiles')
    .update({ status })
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchOnlineMechanics() {
  const { data, error } = await supabase
    .from('mechanic_profiles')
    .select('*, profile:profiles(name, avatar)')
    .eq('status', 'ONLINE');
  if (error) throw error;
  return data;
}

export async function fetchMechanicJobHistory(mechanicId) {
  const { data, error } = await supabase
    .from('service_requests')
    .select('*')
    .eq('mechanic_id', mechanicId)
    .in('status', ['COMPLETED', 'CANCELLED'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Haversine distance in km between two lat/lng points.
 * Used client-side to sort/label available requests by proximity —
 * the server-side "closest mechanic" preference for matching lives in
 * api/requests/[id]/accept.js (kept simple on purpose, see brief §8).
 */
export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function verifyMechanicProfile(userId) {
  const { data, error } = await supabase
    .from('mechanic_profiles')
    .update({ is_verified: true })
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
