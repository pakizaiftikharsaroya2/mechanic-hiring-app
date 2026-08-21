// Universal Rock-Solid Live Cloud Database Relay Engine for AutoRescue Pakistan
const BIN_URL = 'https://extendsclass.com/api/json-storage/bin/abfdade';
const channel = typeof window !== 'undefined' && window.BroadcastChannel 
  ? new BroadcastChannel('autorescue_pk_cloud_relay_v7') 
  : null;

let lastCloudRequestsCache = [];

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
 * Fetch all shared requests from the cloud database
 */
export async function fetchAllCloudRequests() {
  try {
    const res = await fetch(BIN_URL);
    if (res.ok) {
      const json = await res.json();
      const requests = Array.isArray(json?.requests) ? json.requests.filter(isValidRequest) : [];
      lastCloudRequestsCache = requests;
      localStorage.setItem('mock_service_requests', JSON.stringify(requests));
      return requests;
    }
  } catch (err) {
    console.warn('Cloud fetch notice:', err);
  }

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
 * Persist request update to Live Cloud DB + Local Storage + BroadcastChannel
 */
export async function syncCloudRequest(req) {
  if (!isValidRequest(req)) return;

  // 1. Update local storage immediately for 0ms same-window speed
  let updatedLocal = [];
  try {
    const local = JSON.parse(localStorage.getItem('mock_service_requests') || '[]').filter(isValidRequest);
    const idx = local.findIndex((r) => String(r.id) === String(req.id));
    if (idx >= 0) {
      local[idx] = { ...local[idx], ...req };
    } else {
      local.unshift(req);
    }
    updatedLocal = local;
    localStorage.setItem('mock_service_requests', JSON.stringify(local));

    try {
      channel?.postMessage({ type: 'SYNC_REQUESTS', data: local });
    } catch (e) {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
    }
  } catch (e) {}

  // 2. Persist to Global Cloud Database (for separate Google profiles, incognito & cross-device)
  try {
    let cloudList = [...lastCloudRequestsCache];
    try {
      const res = await fetch(BIN_URL);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json?.requests)) {
          cloudList = json.requests.filter(isValidRequest);
        }
      }
    } catch (e) {}

    const cIdx = cloudList.findIndex((r) => String(r.id) === String(req.id));
    if (cIdx >= 0) {
      cloudList[cIdx] = { ...cloudList[cIdx], ...req };
    } else {
      cloudList.unshift(req);
    }
    lastCloudRequestsCache = cloudList;

    await fetch(BIN_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: cloudList }),
    });
  } catch (err) {
    console.warn('Cloud database write notice:', err);
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

  // 4. Regular 1.2s Cloud Polling Loop for cross-profile real-time sync
  const pollInterval = setInterval(async () => {
    try {
      const cloudReqs = await fetchAllCloudRequests();
      if (onEvent && Array.isArray(cloudReqs)) {
        onEvent({ type: 'SYNC_REQUEST', data: cloudReqs });
      }
    } catch (e) {}
  }, 1200);

  return () => {
    channel?.removeEventListener('message', handleBcMessage);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage);
    }
    clearInterval(pollInterval);
  };
}
