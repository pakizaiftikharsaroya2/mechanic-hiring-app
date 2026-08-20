// Universal Cross-Device and Cross-Profile Live Cloud Sync Engine
// Connects any Google account, computer, or phone in real-time

const GLOBAL_STORE_ID = 'ff8081819ff5b11001a020569502607b';
const STORE_URL = `https://api.restful-api.dev/objects/${GLOBAL_STORE_ID}`;
const RELAY_CHANNEL = 'autorescue_pk_sync_dispatch_74c40';

/**
 * Fetch all shared requests from the global cloud store and merge with local
 */
export async function fetchAllCloudRequests() {
  try {
    const res = await fetch(STORE_URL);
    if (!res.ok) return [];
    const json = await res.json();
    const cloudRequests = (json?.data?.requests || []).filter(Boolean);

    // Merge into local storage
    const local = JSON.parse(localStorage.getItem('mock_service_requests') || '[]');
    const map = new Map();
    
    // Cloud takes precedence for recent updates
    cloudRequests.forEach((r) => map.set(r.id, r));
    local.forEach((r) => {
      if (!map.has(r.id)) map.set(r.id, r);
    });

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
    );

    localStorage.setItem('mock_service_requests', JSON.stringify(merged));
    return merged;
  } catch (err) {
    console.warn('Cloud store fetch error:', err);
    return JSON.parse(localStorage.getItem('mock_service_requests') || '[]');
  }
}

/**
 * Broadcast request update to global cloud store across all Google profiles & devices
 */
export async function syncCloudRequest(req) {
  if (!req || !req.id) return;

  // 1. Update local storage
  let merged = [];
  try {
    const local = JSON.parse(localStorage.getItem('mock_service_requests') || '[]');
    const idx = local.findIndex((r) => r.id === req.id);
    if (idx >= 0) {
      local[idx] = { ...local[idx], ...req };
    } else {
      local.unshift(req);
    }
    localStorage.setItem('mock_service_requests', JSON.stringify(local));
    merged = local;
  } catch (e) {}

  // 2. Push to global cloud store
  try {
    const res = await fetch(STORE_URL);
    let existingList = [];
    if (res.ok) {
      const json = await res.json();
      existingList = json?.data?.requests || [];
    }
    
    const idx = existingList.findIndex((r) => r.id === req.id);
    if (idx >= 0) {
      existingList[idx] = { ...existingList[idx], ...req };
    } else {
      existingList.unshift(req);
    }

    await fetch(STORE_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'AutoRescue_Requests_Global',
        data: { requests: existingList },
      }),
    });
  } catch (err) {
    console.warn('Failed to push to global cloud store:', err);
  }

  // 3. Trigger SSE broadcast relay
  try {
    fetch(`https://ntfy.sh/${RELAY_CHANNEL}`, {
      method: 'POST',
      body: JSON.stringify({ type: 'SYNC_REQUEST', data: req }),
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {});
  } catch (e) {}
}

/**
 * Broadcast chat message across different Google profiles, browsers, and devices
 */
export async function syncCloudMessage(msg) {
  if (!msg || !msg.id) return;

  try {
    const local = JSON.parse(localStorage.getItem('mock_messages') || '[]');
    const idx = local.findIndex((m) => m.id === msg.id);
    if (idx >= 0) {
      local[idx] = { ...local[idx], ...msg };
    } else {
      local.push(msg);
    }
    localStorage.setItem('mock_messages', JSON.stringify(local));
  } catch (e) {}

  try {
    fetch(`https://ntfy.sh/${RELAY_CHANNEL}`, {
      method: 'POST',
      body: JSON.stringify({ type: 'SYNC_MESSAGE', data: msg }),
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {});
  } catch (err) {}
}

/**
 * Subscribe to real-time events across different Google profiles, browsers, and devices
 */
export function subscribeCloudEvents(onEvent) {
  // 1. Initial fetch from cloud store
  fetchAllCloudRequests().then((reqs) => {
    if (onEvent) onEvent({ type: 'SYNC_REQUEST', data: reqs });
  });

  // 2. Poll cloud store every 2.5 seconds for instant multi-profile sync
  const pollInterval = setInterval(async () => {
    try {
      const reqs = await fetchAllCloudRequests();
      if (onEvent) onEvent({ type: 'SYNC_REQUEST', data: reqs });
    } catch (e) {}
  }, 2500);

  // 3. Realtime SSE listener
  let eventSource = null;
  try {
    eventSource = new EventSource(`https://ntfy.sh/${RELAY_CHANNEL}/sse`);
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload && payload.message) {
          const parsed = JSON.parse(payload.message);
          if (parsed && parsed.type && parsed.data) {
            if (parsed.type === 'SYNC_REQUEST') {
              const local = JSON.parse(localStorage.getItem('mock_service_requests') || '[]');
              const idx = local.findIndex((r) => r.id === parsed.data.id);
              if (idx >= 0) {
                local[idx] = { ...local[idx], ...parsed.data };
              } else {
                local.unshift(parsed.data);
              }
              localStorage.setItem('mock_service_requests', JSON.stringify(local));
            } else if (parsed.type === 'SYNC_MESSAGE') {
              const local = JSON.parse(localStorage.getItem('mock_messages') || '[]');
              if (!local.some((m) => m.id === parsed.data.id)) {
                local.push(parsed.data);
                localStorage.setItem('mock_messages', JSON.stringify(local));
              }
            }
            if (onEvent) onEvent(parsed);
          }
        }
      } catch (err) {}
    };
  } catch (err) {}

  return () => {
    clearInterval(pollInterval);
    if (eventSource) eventSource.close();
  };
}
