import { supabase, isMock } from '../lib/supabaseClient';

/**
 * Creates a new service request for the logged-in client.
 * RLS (`clients can create their own requests`) enforces client_id = auth.uid().
 */
export async function createRequest(clientId, requestData) {
  const payload = {
    client_id: clientId,
    status: 'PENDING',
    vehicle_make: requestData.vehicleMake,
    vehicle_model: requestData.vehicleModel,
    vehicle_color: requestData.vehicleColor,
    breakdown_type: requestData.breakdownType,
    service_type: requestData.serviceType,
    description: requestData.description,
    latitude: requestData.latitude || 31.5204, // Default Lahore fallback if GPS unavailable
    longitude: requestData.longitude || 74.3587,
    location_text: requestData.locationText,
    budget: requestData.budget || null,
    payment_method: requestData.paymentMethod,
  };

  const { data, error } = await supabase
    .from('service_requests')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** All requests belonging to the logged-in client, most recent first. */
export async function fetchClientRequests(clientId) {
  const { data, error } = await supabase
    .from('service_requests')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/** Requests still open for any online mechanic to see (RLS filters to PENDING only). */
export async function fetchAvailableRequests() {
  const { data, error } = await supabase
    .from('service_requests')
    .select('*')
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).filter(r => !r.status || String(r.status).toUpperCase() === 'PENDING');
}

/** Requests currently assigned to the logged-in mechanic (active + history). */
export async function fetchMechanicRequests(mechanicId) {
  const { data, error } = await supabase
    .from('service_requests')
    .select('*')
    .eq('mechanic_id', mechanicId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchRequestById(requestId) {
  const { data, error } = await supabase
    .from('service_requests')
    .select('*')
    .eq('id', requestId)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Accepting a request is NOT done here directly — it goes through
 * /api/requests/[id]/accept so it can be done atomically with the
 * service-role key (see api/requests/[id]/accept.js). This avoids a race
 * where two mechanics both accept the same PENDING request.
 */
export async function acceptRequest(requestId) {
  if (isMock) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const { data, error } = await supabase
      .from('service_requests')
      .update({ mechanic_id: session?.user?.id, status: 'ACCEPTED' })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;

    // Bump the mechanic to BUSY so they stop showing up as available.
    await supabase
      .from('mechanic_profiles')
      .update({ status: 'BUSY' })
      .eq('user_id', session?.user?.id);

    return data;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const res = await fetch(`/api/requests/${requestId}/accept`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
    },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to accept request');
  return body.request;
}

/**
 * Status transitions also go through the API route so the same
 * authorization + state-machine check is enforced server-side, not just
 * relying on the DB trigger (defense in depth + a nicer error message).
 */
export async function updateRequestStatus(requestId, newStatus) {
  if (isMock) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const { data, error } = await supabase
      .from('service_requests')
      .update({ status: newStatus })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;

    // If completed, set mechanic profile status back to ONLINE
    if (newStatus === 'COMPLETED') {
      await supabase
        .from('mechanic_profiles')
        .update({ status: 'ONLINE' })
        .eq('user_id', session?.user?.id);
    }

    return data;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const res = await fetch(`/api/requests/${requestId}/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify({ status: newStatus }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to update status');
  return body.request;
}

/** Client cancelling their own PENDING/ACCEPTED/EN_ROUTE request — plain RLS update is fine here. */
export async function cancelRequest(requestId, reason = '') {
  // First, fetch request to see if it has an assigned mechanic and get original description
  const { data: request, error: fetchErr } = await supabase
    .from('service_requests')
    .select('mechanic_id, description')
    .eq('id', requestId)
    .single();

  if (fetchErr) throw fetchErr;

  const updatedDescription = reason 
    ? `${request.description}\n[Cancellation Reason: ${reason}]`
    : request.description;

  const { data, error } = await supabase
    .from('service_requests')
    .update({ status: 'CANCELLED', description: updatedDescription })
    .eq('id', requestId)
    .select()
    .single();
  if (error) throw error;

  // If there was an assigned mechanic, set their profile status back to ONLINE
  if (request?.mechanic_id) {
    await supabase
      .from('mechanic_profiles')
      .update({ status: 'ONLINE' })
      .eq('user_id', request.mechanic_id);
  }

  return data;
}

/** Subscribe to realtime changes on a single request row. Returns an unsubscribe function. */
export function subscribeToRequest(requestId, onChange) {
  const channel = supabase
    .channel(`request-${requestId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'service_requests', filter: `id=eq.${requestId}` },
      (payload) => onChange(payload.new)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

/** Subscribe to new PENDING requests appearing (for the mechanic board). */
export function subscribeToAvailableRequests(onInsert) {
  const channel = supabase
    .channel('available-requests')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'service_requests' },
      (payload) => onInsert(payload)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
