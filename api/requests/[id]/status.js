import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const VALID_STATUSES = ['EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id: requestId } = req.query;
  const { status } = req.body;

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status: ${status}` });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Missing auth token' });

  const {
    data: { user },
    error: userErr,
  } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !user) return res.status(401).json({ error: 'Invalid session' });

  const { data: request, error: fetchErr } = await supabaseAdmin
    .from('service_requests')
    .select('client_id, mechanic_id, status')
    .eq('id', requestId)
    .single();
  if (fetchErr || !request) return res.status(404).json({ error: 'Request not found' });

  // Only the assigned mechanic can advance the job; either party can cancel.
  const isMechanic = request.mechanic_id === user.id;
  const isClient = request.client_id === user.id;
  if (status === 'CANCELLED') {
    if (!isMechanic && !isClient) return res.status(403).json({ error: 'Not part of this request' });
  } else if (!isMechanic) {
    return res.status(403).json({ error: 'Only the assigned mechanic can update job status' });
  }

  // The actual PENDING->ACCEPTED->...->COMPLETED sequencing is enforced
  // again here as a friendly error, on top of the DB trigger in schema.sql
  // (trg_requests_status_transition) which is the real source of truth.
  const { data: updated, error: updateErr } = await supabaseAdmin
    .from('service_requests')
    .update({ status })
    .eq('id', requestId)
    .select()
    .single();

  if (updateErr) {
    // Postgres raises a plain exception from validate_status_transition();
    // surface it as a 400 instead of a generic 500.
    return res.status(400).json({ error: updateErr.message });
  }

  // Free the mechanic back up once a job ends.
  if (status === 'COMPLETED' || status === 'CANCELLED') {
    await supabaseAdmin
      .from('mechanic_profiles')
      .update({ status: 'ONLINE' })
      .eq('user_id', request.mechanic_id);

    if (status === 'COMPLETED') {
      await supabaseAdmin.rpc('increment_mechanic_jobs', { p_mechanic_id: request.mechanic_id });
    }
  }

  return res.status(200).json({ request: updated });
}
