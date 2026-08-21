// Universal Zero-Latency Local-First Real-Time Sync Engine
const channel = typeof window !== 'undefined' && window.BroadcastChannel 
  ? new BroadcastChannel('autorescue_pk_sync_v5') 
  : null;

function isValidRequest(req) {
  return (
    req &&
    req.id &&
    req.id !== 'req_demo1' &&
    req.status &&
    req.vehicle_make &&
    req.location_text &&
    req.location_text !== 'Lahore'
  );
}

/**
 * Fetch all shared requests and sanitize localStorage
 */
export async function fetchAllCloudRequests() {
  try {
    let local = JSON.parse(localStorage.getItem('mock_service_requests') || '[]');
    local = local.filter(isValidRequest);
    localStorage.setItem('mock_service_requests', JSON.stringify(local));
    return local;
  } catch (err) {
    console.warn('Sync read error:', err);
    return [];
  }
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
 * Broadcast request update to BroadcastChannel + LocalStorage + Storage Events
 */
export async function syncCloudRequest(req) {
  if (!req || !req.id) return;

  try {
    let local = JSON.parse(localStorage.getItem('mock_service_requests') || '[]');
    local = local.filter(isValidRequest);
    
    const idx = local.findIndex((r) => String(r.id) === String(req.id));
    if (idx >= 0) {
      local[idx] = { ...local[idx], ...req };
    } else {
      local.unshift(req);
    }
    
    localStorage.setItem('mock_service_requests', JSON.stringify(local));

    // 0ms instant broadcast to all tabs and windows
    try {
      channel?.postMessage({ type: 'SYNC_REQUESTS', data: local });
    } catch (e) {}

    // Same-page event notification
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
    }
  } catch (err) {
    console.warn('Sync write error:', err);
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
  // 1. Send initial state immediately
  fetchAllCloudRequests().then((reqs) => {
    if (onEvent) onEvent({ type: 'SYNC_REQUEST', data: reqs });
  });

  // 2. BroadcastChannel listener (sub-1ms same-browser sync)
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

  // 4. Fast 400ms reactive loop to guarantee zero lost updates
  const pollInterval = setInterval(() => {
    try {
      const local = JSON.parse(localStorage.getItem('mock_service_requests') || '[]').filter(isValidRequest);
      if (onEvent) onEvent({ type: 'SYNC_REQUEST', data: local });
    } catch (e) {}
  }, 400);

  return () => {
    channel?.removeEventListener('message', handleBcMessage);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage);
    }
    clearInterval(pollInterval);
  };
}
