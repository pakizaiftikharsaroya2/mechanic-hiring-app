// Native Vercel Serverless Sync Engine with Monotonic State Lock for AutoRescue Pakistan
const API_URL = typeof window !== 'undefined' ? `${window.location.origin}/api/sync` : '/api/sync';
const channel = typeof window !== 'undefined' && window.BroadcastChannel 
  ? new BroadcastChannel('autorescue_native_sync_v9') 
  : null;

const STATUS_RANK = {
  PENDING: 0,
  ACCEPTED: 1,
  EN_ROUTE: 2,
  ARRIVED: 3,
  IN_PROGRESS: 4,
  COMPLETED: 5,
  CANCELLED: 6,
};

export function mergeRequest(existingReq, newReq) {
  if (!existingReq) return newReq;
  if (!newReq) return existingReq;

  const existStat = String(existingReq.status || 'PENDING').toUpperCase();
  const incStat = String(newReq.status || 'PENDING').toUpperCase();

  // 1. TERMINAL STATE LOCK: Once CANCELLED or COMPLETED, it is permanent and can never re-open
  if (existStat === 'CANCELLED' && incStat !== 'CANCELLED') {
    return existingReq;
  }
  if (existStat === 'COMPLETED' && incStat !== 'COMPLETED' && incStat !== 'CANCELLED') {
    return existingReq;
  }

  const curRank = STATUS_RANK[existStat] || 0;
  const newRank = STATUS_RANK[incStat] || 0;

  // Monotonic: Never downgrade status
  const effectiveStatus = (newRank >= curRank || incStat === 'CANCELLED' || incStat === 'COMPLETED')
    ? newReq.status
    : existingReq.status;

  return {
    ...existingReq,
    ...newReq,
    status: effectiveStatus,
    mechanic_id: newReq.mechanic_id || existingReq.mechanic_id,
    mechanic_name: newReq.mechanic_name || existingReq.mechanic_name,
    budget: newReq.budget || existingReq.budget,
  };
}

function isValidRequest(req) {
  return Boolean(
    req &&
    req.id &&
    req.id !== 'req_demo1' &&
    req.status &&
    req.vehicle_make
  );
}

/**
 * Fetch all shared requests from the native /api/sync endpoint
 */
export async function fetchAllCloudRequests() {
  const lastClearedAt = Number(localStorage.getItem('autorescue_last_cleared_at') || 0);
  const tombstones = new Set(JSON.parse(localStorage.getItem('autorescue_tombstoned_ids') || '[]'));

  const isAlive = (r) =>
    isValidRequest(r) &&
    !tombstones.has(String(r.id)) &&
    new Date(r.created_at || 0).getTime() >= lastClearedAt;

  try {
    const res = await fetch(API_URL);
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json?.requests)) {
        const validList = json.requests.filter(isAlive);
        let local = JSON.parse(localStorage.getItem('mock_service_requests') || '[]').filter(isAlive);
        
        validList.forEach((req) => {
          const idx = local.findIndex((r) => String(r.id) === String(req.id));
          if (idx >= 0) {
            local[idx] = mergeRequest(local[idx], req);
          } else {
            local.unshift(req);
          }
        });

        localStorage.setItem('mock_service_requests', JSON.stringify(local));
        return local;
      }
    }
  } catch (err) {}

  return JSON.parse(localStorage.getItem('mock_service_requests') || '[]').filter(isAlive);
}

/**
 * Fetch all shared messages
 */
export async function fetchAllCloudMessages() {
  try {
    const res = await fetch(API_URL);
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json?.messages)) {
        let local = JSON.parse(localStorage.getItem('mock_messages') || '[]');
        json.messages.forEach((m) => {
          if (!local.some((loc) => loc.id === m.id)) {
            local.push(m);
          }
        });
        localStorage.setItem('mock_messages', JSON.stringify(local));
        return local;
      }
    }
  } catch (e) {}

  return JSON.parse(localStorage.getItem('mock_messages') || '[]');
}

/**
 * Broadcast and persist request update to /api/sync + Local Storage + BroadcastChannel
 */
export async function syncCloudRequest(req) {
  if (!isValidRequest(req)) return;

  // 1. Update local storage with monotonic merge
  let local = [];
  try {
    local = JSON.parse(localStorage.getItem('mock_service_requests') || '[]').filter(isValidRequest);
    const idx = local.findIndex((r) => String(r.id) === String(req.id));
    if (idx >= 0) {
      local[idx] = mergeRequest(local[idx], req);
    } else {
      local.unshift(req);
    }
    localStorage.setItem('mock_service_requests', JSON.stringify(local));

    try {
      channel?.postMessage({ type: 'SYNC_REQUESTS', data: local });
    } catch (e) {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
    }
  } catch (e) {}

  // 2. Persist to Native Serverless API
  try {
    await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'SYNC_REQUEST', data: req, requests: local }),
    });
  } catch (err) {
    console.warn('Sync post error:', err);
  }
}

/**
 * Broadcast chat message to Serverless API + Local Storage + BroadcastChannel
 */
export async function syncCloudMessage(msg) {
  if (!msg || !msg.id) return;

  try {
    const local = JSON.parse(localStorage.getItem('mock_messages') || '[]');
    if (!local.some((m) => m.id === msg.id)) {
      local.push(msg);
      localStorage.setItem('mock_messages', JSON.stringify(local));
    }

    try {
      channel?.postMessage({ type: 'SYNC_MESSAGE', data: msg });
    } catch (e) {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
    }

    await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'SYNC_MESSAGE', data: msg }),
    });
  } catch (err) {}
}

/**
 * Subscribe to real-time events across all open tabs, windows, and profiles
 */
export function subscribeCloudEvents(onEvent) {
  // 1. Initial fetch from /api/sync
  fetchAllCloudRequests().then((reqs) => {
    if (onEvent) onEvent({ type: 'SYNC_REQUEST', data: reqs });
  });

  // 2. BroadcastChannel listener (0ms same-machine sync)
  const handleBcMessage = (event) => {
    if (!event.data) return;
    if (event.data.type === 'CLEAR_ALL') {
      // Another tab cleared history — wipe local state immediately
      localStorage.setItem('mock_service_requests', JSON.stringify([]));
      localStorage.setItem('mock_messages', JSON.stringify([]));
      if (event.data.cleared_at) {
        localStorage.setItem('autorescue_last_cleared_at', String(event.data.cleared_at));
      }
      if (onEvent) onEvent({ type: 'SYNC_REQUEST', data: [] });
    } else if (event.data.type === 'SYNC_REQUESTS' && onEvent) {
      onEvent({ type: 'SYNC_REQUEST', data: event.data.data });
    } else if (event.data.type === 'SYNC_MESSAGE' && onEvent) {
      onEvent(event.data);
    }
  };
  channel?.addEventListener('message', handleBcMessage);

  // 3. Storage event listener (multi-window sync)
  const handleStorage = () => {
    try {
      const local = JSON.parse(localStorage.getItem('mock_service_requests') || '[]').filter(isValidRequest);
      if (onEvent) onEvent({ type: 'SYNC_REQUEST', data: local });
    } catch (e) {}
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage);
  }

  // 4. Fast 250ms Serverless Polling Loop for instantaneous cross-device reactions
  const pollInterval = setInterval(async () => {
    try {
      const cloudReqs = await fetchAllCloudRequests();
      if (onEvent && Array.isArray(cloudReqs)) {
        onEvent({ type: 'SYNC_REQUEST', data: cloudReqs });
      }
    } catch (e) {}
  }, 250);

  return () => {
    channel?.removeEventListener('message', handleBcMessage);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage);
    }
    clearInterval(pollInterval);
  };
}
