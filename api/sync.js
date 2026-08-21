// Vercel Serverless Global Sync Engine for AutoRescue Pakistan
let globalRequests = [];
let globalMessages = [];

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
    return res.status(200).json({
      requests: globalRequests,
      messages: globalMessages
    });
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

    if (body.action === 'CLEAR_HISTORY') {
      globalRequests = globalRequests.filter(r => !['COMPLETED', 'CANCELLED'].includes(r.status?.toUpperCase()));
      return res.status(200).json({ requests: globalRequests, messages: globalMessages });
    }

    if (body.type === 'SYNC_REQUEST' && body.data) {
      const item = body.data;
      const idx = globalRequests.findIndex(r => String(r.id) === String(item.id));
      if (idx >= 0) {
        globalRequests[idx] = { ...globalRequests[idx], ...item };
      } else {
        globalRequests.unshift(item);
      }
    } else if (Array.isArray(body.requests)) {
      globalRequests = body.requests;
    }

    if (body.type === 'SYNC_MESSAGE' && body.data) {
      const msg = body.data;
      if (!globalMessages.some(m => m.id === msg.id)) {
        globalMessages.push(msg);
      }
    }

    return res.status(200).json({
      requests: globalRequests,
      messages: globalMessages
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
