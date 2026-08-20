// Universal Cross-Device and Cross-Profile Live Cloud Sync Engine
// Connects any Google account, computer, or phone in real-time

const RELAY_CHANNEL = 'autorescue_pk_sync_dispatch_74c40';
const RELAY_URL = `https://ntfy.sh/${RELAY_CHANNEL}`;

/**
 * Fetch all shared requests from the cloud relay and merge with local storage
 */
export async function fetchAllCloudRequests() {
  try {
    const res = await fetch(`${RELAY_URL}/json?poll=1&since=24h`);
    if (!res.ok) return JSON.parse(localStorage.getItem('mock_service_requests') || '[]');
    
    const text = await res.text();
    const lines = text.trim().split('\n').filter(Boolean);
    const local = JSON.parse(localStorage.getItem('mock_service_requests') || '[]');
    const map = new Map();

    // Seed local
    local.forEach((r) => map.set(r.id, r));

    // Seed from cloud events
    lines.forEach((line) => {
      try {
        const payload = JSON.parse(line);
        if (payload && payload.message) {
          const parsed = typeof payload.message === 'string' ? JSON.parse(payload.message) : payload.message;
          if (parsed && parsed.type === 'SYNC_REQUEST' && parsed.data) {
            map.set(parsed.data.id, { ...map.get(parsed.data.id), ...parsed.data });
          }
        }
      } catch (e) {}
    });

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
    );

    localStorage.setItem('mock_service_requests', JSON.stringify(merged));
    return merged;
  } catch (err) {
    return JSON.parse(localStorage.getItem('mock_service_requests') || '[]');
  }
}

/**
 * Broadcast request update across all Google profiles & devices
 */
export async function syncCloudRequest(req) {
  if (!req || !req.id) return;

  // 1. Update local storage
  try {
    const local = JSON.parse(localStorage.getItem('mock_service_requests') || '[]');
    const idx = local.findIndex((r) => r.id === req.id);
    if (idx >= 0) {
      local[idx] = { ...local[idx], ...req };
    } else {
      local.unshift(req);
    }
    localStorage.setItem('mock_service_requests', JSON.stringify(local));
  } catch (e) {}

  // 2. Broadcast via Cloud Relay
  try {
    await fetch(RELAY_URL, {
      method: 'POST',
      body: JSON.stringify({ type: 'SYNC_REQUEST', data: req }),
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.warn('Cloud broadcast error:', err);
  }
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
    await fetch(RELAY_URL, {
      method: 'POST',
      body: JSON.stringify({ type: 'SYNC_MESSAGE', data: msg }),
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {}
}

/**
 * Subscribe to real-time events across different Google profiles, browsers, and devices
 */
export function subscribeCloudEvents(onEvent) {
  // 1. Initial fetch from cloud relay
  fetchAllCloudRequests().then((reqs) => {
    if (onEvent) onEvent({ type: 'SYNC_REQUEST', data: reqs });
  });

  // 2. Poll cloud relay every 2.5 seconds for instant multi-profile sync
  const pollInterval = setInterval(async () => {
    try {
      const reqs = await fetchAllCloudRequests();
      if (onEvent) onEvent({ type: 'SYNC_REQUEST', data: reqs });
    } catch (e) {}
  }, 2500);

  // 3. Realtime SSE listener
  let eventSource = null;
  try {
    eventSource = new EventSource(`${RELAY_URL}/sse`);
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload && payload.message) {
          const parsed = typeof payload.message === 'string' ? JSON.parse(payload.message) : payload.message;
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
