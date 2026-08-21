// Vercel Serverless Global Sync Engine for AutoRescue Pakistan
let globalRequests = [];
let globalMessages = [];
let lastClearedTimestamp = 0;

export default async function handler(req, res) {
  // Universal CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const validRequests = globalRequests.filter(r => {
      const created = new Date(r.created_at || 0).getTime();
      return created >= lastClearedTimestamp;
    });
    return res.status(200).json({
      requests: validRequests,
      messages: globalMessages
    });
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

    if (body.action === 'CLEAR_ALL' || body.action === 'CLEAR_HISTORY') {
      lastClearedTimestamp = Number(body.cleared_at || Date.now());
      globalRequests = [];
      globalMessages = [];
      return res.status(200).json({ requests: [], messages: [] });
    }

    if (body.type === 'SYNC_REQUEST' && body.data) {
      const item = body.data;
      const created = new Date(item.created_at || 0).getTime();
      if (created >= lastClearedTimestamp) {
        const idx = globalRequests.findIndex(r => String(r.id) === String(item.id));
        if (idx >= 0) {
          const existing = globalRequests[idx];
          const existStat = String(existing?.status || 'PENDING').toUpperCase();
          const incStat = String(item?.status || 'PENDING').toUpperCase();

          // Terminal state lock: Never let a cancelled/completed job be revived by a stale packet
          if (existStat === 'CANCELLED' && incStat !== 'CANCELLED') {
            // preserve CANCELLED
          } else if (existStat === 'COMPLETED' && incStat !== 'COMPLETED' && incStat !== 'CANCELLED') {
            // preserve COMPLETED
          } else {
            globalRequests[idx] = { ...existing, ...item };
          }
        } else {
          globalRequests.unshift(item);
        }
      }
    }

    if (Array.isArray(body.requests) && body.requests.length > 0) {
      body.requests.forEach(reqItem => {
        const created = new Date(reqItem.created_at || 0).getTime();
        if (created >= lastClearedTimestamp) {
          const idx = globalRequests.findIndex(r => String(r.id) === String(reqItem.id));
          if (idx >= 0) {
            const existing = globalRequests[idx];
            const existStat = String(existing?.status || 'PENDING').toUpperCase();
            const incStat = String(reqItem?.status || 'PENDING').toUpperCase();
            if (existStat === 'CANCELLED' && incStat !== 'CANCELLED') {
              // preserve
            } else if (existStat === 'COMPLETED' && incStat !== 'COMPLETED' && incStat !== 'CANCELLED') {
              // preserve
            } else {
              globalRequests[idx] = { ...existing, ...reqItem };
            }
          } else {
            globalRequests.push(reqItem);
          }
        }
      });
    }

    if (body.type === 'SYNC_MESSAGE' && body.data) {
      const msg = body.data;
      if (!globalMessages.some(m => m.id === msg.id)) {
        globalMessages.push(msg);
      }
    }

    const validRequests = globalRequests.filter(r => {
      const created = new Date(r.created_at || 0).getTime();
      return created >= lastClearedTimestamp;
    });

    return res.status(200).json({
      requests: validRequests,
      messages: globalMessages
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
