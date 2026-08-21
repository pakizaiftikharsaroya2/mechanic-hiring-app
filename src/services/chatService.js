import { supabase } from '../lib/supabaseClient';
import { syncCloudMessage, fetchAllCloudMessages, subscribeCloudEvents } from '../lib/cloudSync';

export async function fetchMessages(requestId) {
  try {
    await fetchAllCloudMessages();
  } catch (e) {}

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
  if (data) {
    syncCloudMessage(data).catch(() => {});
  }
  return data;
}

/** Realtime: fires for every new message inserted on this request across all devices/profiles. */
export function subscribeToMessages(requestId, onNewMessage) {
  const channel = supabase
    .channel(`messages-${requestId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `request_id=eq.${requestId}` },
      (payload) => onNewMessage(payload.new)
    )
    .subscribe();

  const unsubCloud = subscribeCloudEvents((event) => {
    if (event.type === 'SYNC_MESSAGE' && event.data && String(event.data.request_id) === String(requestId)) {
      onNewMessage(event.data);
    }
  });

  return () => {
    supabase.removeChannel(channel);
    unsubCloud();
  };
}
