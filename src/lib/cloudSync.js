import { getFirestore, doc, setDoc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { app } from './firebaseClient';

let db = null;
try {
  db = getFirestore(app);
} catch (e) {
  console.warn('Firestore init notice:', e);
}

// Local BroadcastChannel for 0ms same-browser sync
const channel = typeof window !== 'undefined' && window.BroadcastChannel ? new BroadcastChannel('autorescue_global_sync') : null;

/**
 * Broadcast request update to Firestore + BroadcastChannel + LocalStorage
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

  // 2. Broadcast to local tabs
  try {
    channel?.postMessage({ type: 'SYNC_REQUEST', data: req });
  } catch (e) {}

  // 3. Sync to live Google Firestore for cross-profile / cross-device real-time sync
  if (db) {
    try {
      await setDoc(doc(db, 'service_requests', req.id), req, { merge: true });
    } catch (err) {
      console.warn('Firestore sync request notice:', err);
    }
  }
}

/**
 * Broadcast chat message to Firestore + BroadcastChannel + LocalStorage
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

  // 2. Broadcast to local tabs
  try {
    channel?.postMessage({ type: 'SYNC_MESSAGE', data: msg });
  } catch (e) {}

  // 3. Sync to live Google Firestore
  if (db) {
    try {
      await setDoc(doc(db, 'messages', msg.id), msg, { merge: true });
    } catch (err) {
      console.warn('Firestore sync message notice:', err);
    }
  }
}

/**
 * Broadcast mechanic location
 */
export async function syncCloudLocation(loc) {
  if (!loc) return;

  try {
    channel?.postMessage({ type: 'SYNC_LOCATION', data: loc });
  } catch (e) {}

  if (db && loc.mechanic_id) {
    try {
      await setDoc(doc(db, 'mechanic_locations', loc.mechanic_id), loc, { merge: true });
    } catch (e) {}
  }
}

/**
 * Fetch all cloud requests on load
 */
export async function fetchAllCloudRequests() {
  const local = JSON.parse(localStorage.getItem('mock_service_requests') || '[]');
  if (!db) return local;

  try {
    const querySnapshot = await getDocs(collection(db, 'service_requests'));
    const map = new Map();
    local.forEach((r) => map.set(r.id, r));

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && data.id) {
        map.set(data.id, { ...map.get(data.id), ...data });
      }
    });

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
    );

    localStorage.setItem('mock_service_requests', JSON.stringify(merged));
    return merged;
  } catch (err) {
    return local;
  }
}

/**
 * Subscribe to real-time events across different Google profiles, browsers, and devices
 */
export function subscribeCloudEvents(onEvent) {
  // 1. Initial local + cloud hydration
  fetchAllCloudRequests().then((reqs) => {
    if (onEvent) onEvent({ type: 'SYNC_REQUEST', data: reqs });
  });

  // 2. Listen to BroadcastChannel for 0ms same-machine sync
  const handleBcMessage = (event) => {
    if (event.data && onEvent) {
      onEvent(event.data);
    }
  };
  channel?.addEventListener('message', handleBcMessage);

  // 3. Realtime Firestore listener for cross-profile / cross-device instant sync
  let unsubFirestoreRequests = null;
  let unsubFirestoreMessages = null;

  if (db) {
    try {
      unsubFirestoreRequests = onSnapshot(collection(db, 'service_requests'), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const req = change.doc.data();
          if (req && req.id) {
            // Update local storage
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
      });

      unsubFirestoreMessages = onSnapshot(collection(db, 'messages'), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const msg = change.doc.data();
          if (msg && msg.id) {
            const local = JSON.parse(localStorage.getItem('mock_messages') || '[]');
            if (!local.some((m) => m.id === msg.id)) {
              local.push(msg);
              localStorage.setItem('mock_messages', JSON.stringify(local));
            }
            if (onEvent) onEvent({ type: 'SYNC_MESSAGE', data: msg });
          }
        });
      });
    } catch (err) {
      console.warn('Firestore subscription notice:', err);
    }
  }

  return () => {
    channel?.removeEventListener('message', handleBcMessage);
    if (unsubFirestoreRequests) unsubFirestoreRequests();
    if (unsubFirestoreMessages) unsubFirestoreMessages();
  };
}
