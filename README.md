# AutoRescue Pakistan — Roadside Assistance Platform

A full-stack roadside-assistance / mechanic-hiring platform for **Pakistan**.
Clients broadcast a breakdown request with their live location; nearby
mechanics accept it, track each other on a real interactive map, chat in
real time, and move the job through a validated status pipeline to
completion.

## Architecture

```
React 19 + Vite (frontend)
      |
      | HTTPS
      v
   Vercel
   ├── Static frontend build
   └── /api serverless functions   ← atomic accept + validated status transitions
          |
          v
      Supabase
      ├── PostgreSQL   (profiles, mechanic_profiles, service_requests, messages, mechanic_locations)
      ├── Auth         (email/password)
      └── Realtime     (postgres_changes on requests / messages / locations)
```

Most reads/writes (creating a request, chat history, mechanic listings) go
straight from the frontend to Supabase, protected by Row Level Security.
Only the two operations that need atomicity + a trusted server —
**accepting a job** (so two mechanics can't both claim it) and
**advancing job status** — go through `/api` using the Supabase
service-role key.

## Tech stack

- **Frontend**: React 19, Vite, React Router
- **Map**: Leaflet + OpenStreetMap tiles, OSRM for routing (all free, no API key)
- **Backend**: Vercel serverless functions (`/api`)
- **Database / Auth / Realtime**: Supabase (Postgres, Auth, Realtime)

## Features

**Client**
- Register/login, create a roadside request (vehicle, breakdown type,
  service type, budget, payment method, GPS or manually entered location)
- See requests persist across refresh, tracked live via Supabase Realtime
- Watch the assigned mechanic move on a real map with a routed path
- Chat with the mechanic in real time
- Follow job status through a visual stepper: PENDING → ACCEPTED →
  EN_ROUTE → ARRIVED → IN_PROGRESS → COMPLETED

**Mechanic**
- Register/login, toggle ONLINE / OFFLINE / BUSY
- See nearby pending requests sorted by distance (Haversine)
- Accept a job atomically (server-enforced — no double-accepts)
- Broadcast live GPS position while a job is active
- Advance job status through validated transitions
- View completed job history

## Database

See `supabase/schema.sql` for the full schema: tables, enums, foreign
keys, indexes, a trigger that enforces valid status transitions at the
database level, and Row Level Security policies (clients only see their
own requests; mechanics only see PENDING requests plus their own; chat is
scoped to request participants).

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project values
npm run dev
```

Full Supabase project setup + Vercel deployment steps are in
[`DEPLOYMENT.md`](./DEPLOYMENT.md).

```bash
npm run build     # production build
npm run preview   # preview the production build locally
```

## Known limitations

- Routing uses OSRM's free public demo server — fine for a portfolio demo,
  rate-limited for production traffic. Swap the URL in
  `src/services/routingService.js` for a keyed provider if needed.
- Mechanic location only broadcasts while a job is active and the browser
  tab stays open — no background/native tracking.
- No payment gateway integration — payment method is recorded, not processed.
