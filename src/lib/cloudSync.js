import { getFirestore, collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { app } from './firebaseClient';

let firestore = null;
try {
  firestore = getFirestore(app);
} catch (e) {
  console.warn('Firestore initialization notice:', e);
}

const RELAY_CHANNEL = 'autorescue_pk_sync_dispatch_74c40';

/**
 * Broadcast request update across different Google profiles, browsers, and devices
 */
export async function syncCloudRequest(req) {
  if (!req || !req.id) return;

  // 1. Sync to local storage
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

  // 2. Broadcast to Firebase Firestore if activated
  if (firestore) {
    try {
      await setDoc(doc(firestore, 'service_requests', req.id), req, { merge: true });
    } catch (err) {
      // ignore firestore permissions if rules pending
    }
  }

  // 3. Broadcast to Real-Time SSE Cloud Relay for cross-profile / cross-device delivery
  try {
    await fetch(`https://ntfy.sh/${RELAY_CHANNEL}`, {
      method: 'POST',
      body: JSON.stringify({ type: 'SYNC_REQUEST', data: req }),
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.warn('Cloud relay dispatch error:', err);
  }
}

/**
 * Broadcast chat message across different Google profiles, browsers, and devices
 */
export async function syncCloudMessage(msg) {
  if (!msg || !msg.id) return;

  // 1. Sync to local storage
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

  // 2. Broadcast to Real-Time SSE Cloud Relay
  try {
    await fetch(`https://ntfy.sh/${RELAY_CHANNEL}`, {
      method: 'POST',
      body: JSON.stringify({ type: 'SYNC_MESSAGE', data: msg }),
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {}
}

/**
 * Broadcast mechanic location across different Google profiles, browsers, and devices
 */
export async function syncCloudLocation(loc) {
  if (!loc) return;

  try {
    await fetch(`https://ntfy.sh/${RELAY_CHANNEL}`, {
      method: 'POST',
      body: JSON.stringify({ type: 'SYNC_LOCATION', data: loc }),
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {}
}

/**
 * Fetch recent cloud events to immediately populate requests when opening the page
 */
export async function fetchRecentCloudEvents(onEvent) {
  try {
    const res = await fetch(`https://ntfy.sh/${RELAY_CHANNEL}/json?poll=1&since=24h`);
    const text = await res.text();
    const lines = text.trim().split('\n').filter(Boolean);
    
    lines.forEach((line) => {
      try {
        const payload = JSON.parse(line);
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
      } catch (e) {}
    });
  } catch (err) {
    console.warn('Recent cloud events fetch notice:', err);
  }
}

/**
 * Subscribe to real-time events across different Google profiles, browsers, and devices
 */
export function subscribeCloudEvents(onEvent) {
  // 1. Immediately hydrate past 24h events
  fetchRecentCloudEvents(onEvent);

  let eventSource = null;
  try {
    eventSource = new EventSource(`https://ntfy.sh/${RELAY_CHANNEL}/sse`);
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload && payload.message) {
          const parsed = JSON.parse(payload.message);
          if (parsed && parsed.type && parsed.data) {
            
            // Auto update local storage
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
  } catch (err) {
    console.warn('SSE subscription notice:', err);
  }

  // Firestore realtime snapshot listener
  let unsubFirestore = null;
  if (firestore) {
    try {
      unsubFirestore = onSnapshot(
        collection(firestore, 'service_requests'),
        (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            const req = change.doc.data();
            if (req && req.id) {
              const local = JSON.parse(localStorage.getItem('mock_service_requests') || '[]');
              const idx = local.findIndex((r) => r.id === req.id);
              if (idx >= 0) {
                local[idx] = { ...local[idx], ...req };
              } else {
                local.unshift(req);
              }
              localStorage.setItem('mock_service_requests', JSON.stringify(local));
              if (onEvent) onEvent({ type: 'SYNC_REQUEST', data: req });
            }
          });
        },
        () => {}
      );
    } catch (e) {}
  }

  return () => {
    if (eventSource) eventSource.close();
    if (unsubFirestore) unsubFirestore();
  };
}
