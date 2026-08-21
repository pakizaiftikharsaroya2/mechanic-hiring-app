import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

let devRequests = [];
let devMessages = [];

const localApiPlugin = () => ({
  name: 'local-api-sync-middleware',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url && req.url.startsWith('/api/sync')) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');

        if (req.method === 'GET') {
          res.statusCode = 200;
          return res.end(JSON.stringify({ requests: devRequests, messages: devMessages }));
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body || '{}');
              if (parsed.action === 'CLEAR_ALL' || parsed.action === 'CLEAR_HISTORY') {
                devRequests = [];
                devMessages = [];
                res.statusCode = 200;
                return res.end(JSON.stringify({ requests: [], messages: [] }));
              }
              if (parsed.type === 'SYNC_REQUEST' && parsed.data) {
                const idx = devRequests.findIndex(r => String(r.id) === String(parsed.data.id));
                if (idx >= 0) {
                  const existing = devRequests[idx];
                  const existStat = String(existing?.status || 'PENDING').toUpperCase();
                  const incStat = String(parsed.data?.status || 'PENDING').toUpperCase();

                  if (existStat === 'CANCELLED' && incStat !== 'CANCELLED') {
                    // preserve CANCELLED
                  } else if (existStat === 'COMPLETED' && incStat !== 'COMPLETED' && incStat !== 'CANCELLED') {
                    // preserve COMPLETED
                  } else {
                    devRequests[idx] = { ...existing, ...parsed.data };
                  }
                } else {
                  devRequests.unshift(parsed.data);
                }
              } else if (Array.isArray(parsed.requests)) {
                devRequests = parsed.requests;
              }
              if (parsed.type === 'SYNC_MESSAGE' && parsed.data) {
                if (!devMessages.some(m => m.id === parsed.data.id)) {
                  devMessages.push(parsed.data);
                }
              }
              res.statusCode = 200;
              return res.end(JSON.stringify({ requests: devRequests, messages: devMessages }));
            } catch (e) {
              res.statusCode = 200;
              return res.end(JSON.stringify({ requests: devRequests, messages: devMessages }));
            }
          });
          return;
        }

        res.statusCode = 200;
        return res.end(JSON.stringify({ ok: true }));
      }
      next();
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localApiPlugin()],
});
