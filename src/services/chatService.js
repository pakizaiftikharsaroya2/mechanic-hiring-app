import { supabase } from '../lib/supabaseClient';

export async function fetchMessages(requestId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function sendMessage(requestId, senderId, message) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ request_id: requestId, sender_id: senderId, message })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Realtime: fires for every new message inserted on this request. Returns an unsubscribe fn. */
export function subscribeToMessages(requestId, onNewMessage) {
  const channel = supabase
    .channel(`messages-${requestId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `request_id=eq.${requestId}` },
      (payload) => onNewMessage(payload.new)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
