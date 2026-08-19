# AutoRescue Pakistan — Deployment Guide

## 1. Create a Supabase project
1. Go to https://supabase.com → New Project.
2. Pick a region close to Pakistan (Singapore is usually the fastest).
3. Note down the project URL and anon key from **Project Settings → API** —
   you'll need them in step 6.

## 2–4. Create tables, run schema, configure auth
1. In the Supabase dashboard, open **SQL Editor → New query**.
2. Paste the entire contents of `supabase/schema.sql` and click **Run**.
   This creates every table, enum, trigger, RLS policy, and the realtime
   publication in one shot.
3. Go to **Authentication → Providers** and confirm **Email** is enabled
   (it is by default).
4. For the demo, go to **Authentication → Settings** and turn **off**
   "Confirm email" so newly registered accounts can log in immediately
   without needing to click a verification email. (Turn it back on if you
   ever put this in front of real users.)

## 5. Configure realtime
Already handled by `schema.sql` — it runs
`alter publication supabase_realtime add table ...` for
`service_requests`, `messages`, and `mechanic_locations`. Nothing extra to
click in the dashboard.

## 6. Add environment variables (local dev)
1. Copy `.env.example` to `.env.local`.
2. Fill in:
   ```
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
   The service-role key is under **Project Settings → API → service_role**
   — keep it secret, it's only used inside `/api`.

## 7. Run locally
```bash
npm install
npm run dev
```
Open the printed localhost URL, register a **Client** account and a
**Mechanic** account (two different browsers or an incognito window work
well for testing both sides at once).

## 8. Build
```bash
npm run build
```

## 9. Deploy to Vercel
1. Push this repo to GitHub.
2. In Vercel: **New Project → Import** your repo. Vercel auto-detects Vite;
   leave the default build command (`npm run build`) and output directory
   (`dist`).
3. The `api/` folder is picked up automatically as serverless functions —
   no extra configuration needed.

## 10. Configure Vercel environment variables
In **Project Settings → Environment Variables**, add:
| Name | Value | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | your Supabase URL | exposed to the frontend |
| `VITE_SUPABASE_ANON_KEY` | your anon key | exposed to the frontend |
| `SUPABASE_SERVICE_ROLE_KEY` | your service-role key | **server-only** — used by `/api` |

Redeploy after adding them (Vercel doesn't hot-reload env vars into an
existing deployment).

## 11. Test production
1. Open the deployed URL, register a client and a mechanic.
2. As the mechanic: go Online.
3. As the client: submit a request with "Use my location".
4. Confirm it shows up instantly on the mechanic's board (no refresh).
5. Accept it as the mechanic, walk through EN_ROUTE → ARRIVED →
   IN_PROGRESS → COMPLETED, and confirm the client's map/stepper/chat all
   update live.

## Known limitations
- Routing uses OSRM's free public demo server — it's rate-limited and not
  meant for production traffic; fine for a portfolio demo. Swap the URL in
  `src/services/routingService.js` for a keyed provider if you need higher
  limits later.
- Mechanic location is only broadcast while a job is active (browser tab
  must stay open) — there's no background/native tracking.
- Landing page redesign (premium marketing site, animations) is a separate
  phase and not included in this build yet.
