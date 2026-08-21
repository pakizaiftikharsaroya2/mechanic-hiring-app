// Universal Real-Time Multi-Profile & Multi-Device Cloud Sync Engine
const STORE_ID = 'ff8081819ff5b11001a022a3eb4d6778';
const STORE_URL = `https://api.restful-api.dev/objects/${STORE_ID}`;

// Local BroadcastChannel for 0ms same-machine sync
const channel = typeof window !== 'undefined' && window.BroadcastChannel ? new BroadcastChannel('autorescue_global_sync') : null;

// Keep memory cache of state to avoid unnecessary writes
let lastRequestsCache = [];
let lastMessagesCache = [];

/**
 * Fetch all shared requests from the cloud store and merge with local storage
 */
export async function fetchAllCloudRequests() {
  try {
    const res = await fetch(STORE_URL);
    if (res.ok) {
      const json = await res.json();
      const cloudRequests = json?.data?.requests || [];
      lastRequestsCache = cloudRequests;
      localStorage.setItem('mock_service_requests', JSON.stringify(cloudRequests));
      return cloudRequests;
    }
  } catch (err) {
    console.warn('Cloud fetch error:', err);
  }
  return JSON.parse(localStorage.getItem('mock_service_requests') || '[]');
}

/**
 * Fetch all shared messages from the cloud store
 */
export async function fetchAllCloudMessages() {
  try {
    const res = await fetch(STORE_URL);
    if (res.ok) {
      const json = await res.json();
      const cloudMessages = json?.data?.messages || [];
      lastMessagesCache = cloudMessages;
      localStorage.setItem('mock_messages', JSON.stringify(cloudMessages));
      return cloudMessages;
    }
  } catch (err) {}
  return JSON.parse(localStorage.getItem('mock_messages') || '[]');
}

/**
 * Broadcast request update to Cloud Store + BroadcastChannel + LocalStorage
 */
export async function syncCloudRequest(req) {
  if (!req || !req.id) return;

  // 1. Update local storage
  let updatedList = [];
  try {
    const local = JSON.parse(localStorage.getItem('mock_service_requests') || '[]');
    const idx = local.findIndex((r) => r.id === req.id);
    if (idx >= 0) {
      local[idx] = { ...local[idx], ...req };
    } else {
      local.unshift(req);
    }
    localStorage.setItem('mock_service_requests', JSON.stringify(local));
    updatedList = local;
  } catch (e) {}

  // 2. Broadcast to local tabs immediately
  try {
    channel?.postMessage({ type: 'SYNC_REQUEST', data: req });
  } catch (e) {}

  // 3. Push to Global Cloud Store
  try {
    const res = await fetch(STORE_URL);
    let cloudList = [];
    let cloudMessages = [];
    if (res.ok) {
      const json = await res.json();
      cloudList = json?.data?.requests || [];
      cloudMessages = json?.data?.messages || [];
    }

    const idx = cloudList.findIndex((r) => r.id === req.id);
    if (idx >= 0) {
      cloudList[idx] = { ...cloudList[idx], ...req };
    } else {
      cloudList.unshift(req);
    }
    lastRequestsCache = cloudList;

    await fetch(STORE_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'AutoRescue_Requests_Store',
        data: { requests: cloudList, messages: cloudMessages }
      }),
    });
  } catch (err) {
    console.warn('Cloud sync error:', err);
  }
}

/**
 * Broadcast chat message to Cloud Store + BroadcastChannel + LocalStorage
 */
export async function syncCloudMessage(msg) {
  if (!msg || !msg.id) return;

  // 1. Update local storage
  try {
    const local = JSON.parse(localStorage.getItem('mock_messages') || '[]');
    if (!local.some((m) => m.id === msg.id)) {
      local.push(msg);
      localStorage.setItem('mock_messages', JSON.stringify(local));
    }
  } catch (e) {}

  // 2. Broadcast to local tabs immediately
  try {
    channel?.postMessage({ type: 'SYNC_MESSAGE', data: msg });
  } catch (e) {}

  // 3. Push to Global Cloud Store
  try {
    const res = await fetch(STORE_URL);
    let cloudList = [];
    let cloudMessages = [];
    if (res.ok) {
      const json = await res.json();
      cloudList = json?.data?.requests || [];
      cloudMessages = json?.data?.messages || [];
    }

    if (!cloudMessages.some((m) => m.id === msg.id)) {
      cloudMessages.push(msg);
    }
    lastMessagesCache = cloudMessages;

    await fetch(STORE_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'AutoRescue_Requests_Store',
        data: { requests: cloudList, messages: cloudMessages }
      }),
    });
  } catch (err) {}
}

/**
 * Subscribe to real-time events across different Google profiles, browsers, and devices
 */
export function subscribeCloudEvents(onEvent) {
  // 1. Initial fetch from Cloud Store
  fetchAllCloudRequests().then((reqs) => {
    if (onEvent) onEvent({ type: 'SYNC_REQUEST', data: reqs });
  });

  // 2. Listen to BroadcastChannel for 0ms local tab sync
  const handleBcMessage = (event) => {
    if (event.data && onEvent) {
      onEvent(event.data);
    }
  };
  channel?.addEventListener('message', handleBcMessage);

  // 3. Fast 1.5s background polling of Cloud Store for cross-profile instant sync
  const pollInterval = setInterval(async () => {
    try {
      const res = await fetch(STORE_URL);
      if (res.ok) {
        const json = await res.json();
        const cloudRequests = json?.data?.requests || [];
        const cloudMessages = json?.data?.messages || [];

        // Check if requests changed
        const reqsStr = JSON.stringify(cloudRequests);
        const lastReqsStr = JSON.stringify(lastRequestsCache);
        if (reqsStr !== lastReqsStr) {
          lastRequestsCache = cloudRequests;
          localStorage.setItem('mock_service_requests', reqsStr);
          if (onEvent) onEvent({ type: 'SYNC_REQUEST', data: cloudRequests });
        }

        // Check if messages changed
        const msgsStr = JSON.stringify(cloudMessages);
        const lastMsgsStr = JSON.stringify(lastMessagesCache);
        if (msgsStr !== lastMsgsStr) {
          lastMessagesCache = cloudMessages;
          localStorage.setItem('mock_messages', msgsStr);
          if (onEvent) onEvent({ type: 'SYNC_MESSAGE_LIST', data: cloudMessages });
        }
      }
    } catch (e) {}
  }, 1500);

  return () => {
    channel?.removeEventListener('message', handleBcMessage);
    clearInterval(pollInterval);
  };
}
