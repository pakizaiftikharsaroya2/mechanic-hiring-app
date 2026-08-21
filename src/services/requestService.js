import { supabase, isMock } from '../lib/supabaseClient';
import { syncCloudRequest, fetchAllCloudRequests } from '../lib/cloudSync';

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
    client_name: requestData.clientName || 'Customer / Client',
    client_phone: requestData.clientPhone || '0300-1234567',
  };

  const { data, error } = await supabase
    .from('service_requests')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  if (data) {
    syncCloudRequest(data).catch(() => {});
  }
  return data;
}

/** All requests belonging to the logged-in client, most recent first. */
export async function fetchClientRequests(clientId) {
  if (isMock) {
    try {
      await fetchAllCloudRequests();
    } catch (e) {}
  }
  const { data, error } = await supabase
    .from('service_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!clientId) return data || [];
  return (data || []).filter(r => r.client_id === clientId || !r.client_id);
}

/** Requests still open for any online mechanic to see (RLS filters to PENDING only). */
export async function fetchAvailableRequests() {
  if (isMock) {
    try {
      await fetchAllCloudRequests();
    } catch (e) {}
  }
  const { data, error } = await supabase
    .from('service_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).filter(r => {
    const s = String(r.status || 'PENDING').toUpperCase();
    return s === 'PENDING' && !r.mechanic_id;
  });
}

/** Requests currently assigned to the logged-in mechanic (active + history). */
export async function fetchMechanicRequests(mechanicId) {
  if (isMock) {
    try {
      await fetchAllCloudRequests();
    } catch (e) {}
  }
  const { data, error } = await supabase
    .from('service_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!mechanicId) return [];
  return (data || []).filter(r => r.mechanic_id === mechanicId);
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

    const mechId = session?.user?.id || 'mechanic_muhammad';

    const { data, error } = await supabase
      .from('service_requests')
      .update({ mechanic_id: mechId, status: 'ACCEPTED' })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;

    // Bump the mechanic to BUSY so they stop showing up as available.
    await supabase
      .from('mechanic_profiles')
      .update({ status: 'BUSY' })
      .eq('user_id', mechId);

    const finalData = data || { id: requestId, mechanic_id: mechId, status: 'ACCEPTED' };
    await syncCloudRequest(finalData);
    return finalData;
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
  if (body.request) syncCloudRequest(body.request).catch(() => {});
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

    // If completed or cancelled, set mechanic profile status back to ONLINE
    if (newStatus === 'COMPLETED' || newStatus === 'CANCELLED') {
      await supabase
        .from('mechanic_profiles')
        .update({ status: 'ONLINE' })
        .eq('user_id', session?.user?.id || 'mechanic_muhammad');
    }

    // Read full merged request row from local storage to preserve all attributes
    const local = JSON.parse(localStorage.getItem('mock_service_requests') || '[]');
    const fullRow = local.find(r => String(r.id) === String(requestId)) || data || { id: requestId, status: newStatus };
    const finalData = { ...fullRow, status: newStatus, updated_at: new Date().toISOString() };
    await syncCloudRequest(finalData);
    return finalData;
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
  if (body.request) syncCloudRequest(body.request).catch(() => {});
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

  if (data) syncCloudRequest(data).catch(() => {});
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

/** Clear all completed and cancelled requests from local storage and cloud store */
export async function clearRequestHistory() {
  const local = JSON.parse(localStorage.getItem('mock_service_requests') || '[]');
  const filtered = local.filter((r) => !['COMPLETED', 'CANCELLED'].includes(r.status?.toUpperCase()));
  localStorage.setItem('mock_service_requests', JSON.stringify(filtered));

  try {
    const STORE_URL = 'https://api.restful-api.dev/objects/ff8081819ff5b11001a022a3eb4d6778';
    const res = await fetch(STORE_URL);
    let cloudMessages = [];
    if (res.ok) {
      const json = await res.json();
      cloudMessages = json?.data?.messages || [];
    }
    await fetch(STORE_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'AutoRescue_Requests_Store',
        data: { requests: filtered, messages: cloudMessages }
      }),
    });
  } catch (e) {}

  return filtered;
}

/** Submit a custom counter-offer / bid from a mechanic for an open request */
export async function submitMechanicOffer(requestId, offerData) {
  const local = JSON.parse(localStorage.getItem('mock_service_requests') || '[]');
  const idx = local.findIndex((r) => String(r.id) === String(requestId));
  if (idx < 0) throw new Error('Request not found');

  const currentReq = local[idx];
  const offers = Array.isArray(currentReq.offers) ? [...currentReq.offers] : [];
  
  const existingOfferIdx = offers.findIndex((o) => o.mechanic_id === offerData.mechanic_id);
  const newOffer = {
    id: `offer_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    created_at: new Date().toISOString(),
    ...offerData
  };

  if (existingOfferIdx >= 0) {
    offers[existingOfferIdx] = newOffer;
  } else {
    offers.push(newOffer);
  }

  const updatedReq = {
    ...currentReq,
    offers,
    updated_at: new Date().toISOString()
  };

  local[idx] = updatedReq;
  localStorage.setItem('mock_service_requests', JSON.stringify(local));
  await syncCloudRequest(updatedReq);
  return updatedReq;
}

/** Client accepts an InDrive-style mechanic offer */
export async function acceptMechanicOffer(requestId, offer) {
  const local = JSON.parse(localStorage.getItem('mock_service_requests') || '[]');
  const idx = local.findIndex((r) => String(r.id) === String(requestId));
  if (idx < 0) throw new Error('Request not found');

  const currentReq = local[idx];
  const updatedReq = {
    ...currentReq,
    mechanic_id: offer.mechanic_id,
    mechanic_name: offer.mechanic_name || 'Mechanic',
    budget: Number(offer.price) || currentReq.budget,
    status: 'ACCEPTED',
    accepted_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  local[idx] = updatedReq;
  localStorage.setItem('mock_service_requests', JSON.stringify(local));

  // Set mechanic profile status to BUSY
  try {
    const mechProfiles = JSON.parse(localStorage.getItem('mock_mechanic_profiles') || '[]');
    const mIdx = mechProfiles.findIndex(m => m.user_id === offer.mechanic_id);
    if (mIdx >= 0) {
      mechProfiles[mIdx].status = 'BUSY';
      localStorage.setItem('mock_mechanic_profiles', JSON.stringify(mechProfiles));
    }
  } catch (e) {}

  await syncCloudRequest(updatedReq);
  return updatedReq;
}
