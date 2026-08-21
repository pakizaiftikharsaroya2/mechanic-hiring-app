// Universal Live Cloud Real-Time Sync Engine for AutoRescue Pakistan
const CLOUD_ENDPOINT = 'https://crudcrud.com/api/3ef4a27e4c8b49a7a02b3973937d1e13/requests';
const channel = typeof window !== 'undefined' && window.BroadcastChannel ? new BroadcastChannel('autorescue_pk_sync_v6') : null;

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
 * Fetch all shared requests from the cloud backend
 */
export async function fetchAllCloudRequests() {
  try {
    const res = await fetch(CLOUD_ENDPOINT);
    if (res.ok) {
      const cloudList = await res.json();
      if (Array.isArray(cloudList)) {
        const validList = cloudList.filter(isValidRequest);
        localStorage.setItem('mock_service_requests', JSON.stringify(validList));
        return validList;
      }
    }
  } catch (err) {
    console.warn('Cloud fetch notice:', err);
  }

  // Fallback to local storage
  const local = JSON.parse(localStorage.getItem('mock_service_requests') || '[]').filter(isValidRequest);
  return local;
}

/**
 * Fetch all shared messages
 */
export async function fetchAllCloudMessages() {
  try {
    return JSON.parse(localStorage.getItem('mock_messages') || '[]');
  } catch (e) {
    return [];
  }
}

/**
 * Broadcast and persist request update to Cloud Backend + Local Storage + BroadcastChannel
 */
export async function syncCloudRequest(req) {
  if (!isValidRequest(req)) return;

  // 1. Update local storage immediately for 0ms responsiveness
  try {
    let local = JSON.parse(localStorage.getItem('mock_service_requests') || '[]').filter(isValidRequest);
    const idx = local.findIndex((r) => String(r.id) === String(req.id));
    if (idx >= 0) {
      local[idx] = { ...local[idx], ...req };
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

  // 2. Persist to Live Cloud Backend (so all other Google profiles, windows & devices sync)
  try {
    const res = await fetch(CLOUD_ENDPOINT);
    if (res.ok) {
      const cloudList = await res.json();
      const existingDoc = Array.isArray(cloudList) ? cloudList.find((r) => String(r.id) === String(req.id)) : null;

      if (existingDoc && existingDoc._id) {
        // Update existing cloud document
        const { _id, ...cleanExisting } = existingDoc;
        await fetch(`${CLOUD_ENDPOINT}/${existingDoc._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...cleanExisting, ...req }),
        });
      } else {
        // Create new cloud document
        await fetch(CLOUD_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req),
        });
      }
    }
  } catch (err) {
    console.warn('Cloud sync write error:', err);
  }
}

/**
 * Broadcast chat message to BroadcastChannel + LocalStorage
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
  } catch (err) {}
}

/**
 * Subscribe to real-time events across all open tabs, windows, and profiles
 */
export function subscribeCloudEvents(onEvent) {
  // 1. Initial fetch from Cloud Backend
  fetchAllCloudRequests().then((reqs) => {
    if (onEvent) onEvent({ type: 'SYNC_REQUEST', data: reqs });
  });

  // 2. BroadcastChannel listener (0ms same-machine sync)
  const handleBcMessage = (event) => {
    if (event.data && event.data.type === 'SYNC_REQUESTS' && onEvent) {
      onEvent({ type: 'SYNC_REQUEST', data: event.data.data });
    } else if (event.data && event.data.type === 'SYNC_MESSAGE' && onEvent) {
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

  // 4. Fast 800ms Cloud Polling Loop for cross-profile real-time sync
  const pollInterval = setInterval(async () => {
    try {
      const cloudReqs = await fetchAllCloudRequests();
      if (onEvent && Array.isArray(cloudReqs)) {
        onEvent({ type: 'SYNC_REQUEST', data: cloudReqs });
      }
    } catch (e) {}
  }, 800);

  return () => {
    channel?.removeEventListener('message', handleBcMessage);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage);
    }
    clearInterval(pollInterval);
  };
}
