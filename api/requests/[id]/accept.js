import { createClient } from '@supabase/supabase-js';

// Service-role client — server-only, bypasses RLS. Never import this file
// from the frontend.
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id: requestId } = req.query;
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Missing auth token' });

  // Verify the caller's identity from their JWT.
  const {
    data: { user },
    error: userErr,
  } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !user) return res.status(401).json({ error: 'Invalid session' });

  // Confirm they're actually a mechanic, and are ONLINE with no active job.
  const { data: mechProfile, error: mechErr } = await supabaseAdmin
    .from('mechanic_profiles')
    .select('status')
    .eq('user_id', user.id)
    .single();
  if (mechErr || !mechProfile) return res.status(403).json({ error: 'Not a mechanic account' });
  if (mechProfile.status !== 'ONLINE') {
    return res.status(400).json({ error: 'You must be ONLINE to accept a request' });
  }

  const { data: activeJob } = await supabaseAdmin
    .from('service_requests')
    .select('id')
    .eq('mechanic_id', user.id)
    .in('status', ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'])
    .maybeSingle();
  if (activeJob) return res.status(400).json({ error: 'You already have an active job' });

  // Atomic claim: only succeeds if the request is still PENDING and
  // unassigned. The .eq('status', 'PENDING') in the WHERE clause is what
  // makes this race-safe — a second concurrent request from another
  // mechanic will match zero rows and come back empty.
  const { data: updated, error: updateErr } = await supabaseAdmin
    .from('service_requests')
    .update({ mechanic_id: user.id, status: 'ACCEPTED' })
    .eq('id', requestId)
    .eq('status', 'PENDING')
    .is('mechanic_id', null)
    .select()
    .maybeSingle();

  if (updateErr) return res.status(500).json({ error: updateErr.message });
  if (!updated) return res.status(409).json({ error: 'This request was already accepted by someone else' });

  // Bump the mechanic to BUSY so they stop showing up as available.
  await supabaseAdmin.from('mechanic_profiles').update({ status: 'BUSY' }).eq('user_id', user.id);

  return res.status(200).json({ request: updated });
}
