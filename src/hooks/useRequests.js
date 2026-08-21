import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
  fetchClientRequests,
  fetchMechanicRequests,
  fetchAvailableRequests,
} from '../services/requestService';
import { subscribeCloudEvents } from '../lib/cloudSync';

/** Client's own requests, kept live via realtime INSERT/UPDATE on service_requests. */
export function useClientRequests(clientId) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!clientId) return;
    try {
      const data = await fetchClientRequests(clientId);
      setRequests(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    reload();
    // Cross-tab & multi-window instant sync
    const handleStorage = (e) => {
      if (!e.key || e.key.includes('service_requests')) reload();
    };
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(reload, 400);

    // Cross-profile & cross-device cloud sync
    const unsubCloud = subscribeCloudEvents((event) => {
      if (event.type === 'SYNC_REQUEST') {
        if (Array.isArray(event.data)) {
          const filtered = clientId ? event.data.filter(r => String(r.client_id) === String(clientId) || !r.client_id) : event.data;
          setRequests(filtered);
        }
        reload();
      }
    });

    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
      unsubCloud();
    };
  }, [reload]);

  useEffect(() => {
    if (!clientId) return undefined;
    const channel = supabase
      .channel(`client-requests-${clientId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_requests', filter: `client_id=eq.${clientId}` },
        (payload) => {
          setRequests((prev) => {
            if (payload.eventType === 'INSERT') return [payload.new, ...prev];
            if (payload.eventType === 'UPDATE')
              return prev.map((r) => (r.id === payload.new.id ? payload.new : r));
            if (payload.eventType === 'DELETE') return prev.filter((r) => r.id !== payload.old.id);
            return prev;
          });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [clientId]);

  return { requests, loading, error, reload };
}

/** PENDING requests any online mechanic can see + pick up, live via realtime. */
export function useAvailableRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    try {
      const data = await fetchAvailableRequests();
      setRequests(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    // Cross-tab & multi-window instant sync for incoming requests
    const handleStorage = (e) => {
      if (!e.key || e.key.includes('service_requests')) reload();
    };
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(reload, 400);

    // Cross-profile & cross-device cloud sync
    const unsubCloud = subscribeCloudEvents((event) => {
      if (event.type === 'SYNC_REQUEST') {
        if (Array.isArray(event.data)) {
          setRequests(event.data.filter(r => String(r.status || 'PENDING').toUpperCase() === 'PENDING' && !r.mechanic_id));
        }
        reload();
      }
    });

    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
      unsubCloud();
    };
  }, [reload]);

  useEffect(() => {
    const channel = supabase
      .channel('available-requests-board')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_requests' }, (payload) => {
        setRequests((prev) => {
          const newRow = payload.new;
          const oldRow = payload.old;
          if (payload.eventType === 'INSERT' && newRow.status === 'PENDING') return [...prev, newRow];
          if (payload.eventType === 'UPDATE') {
            // No longer pending (someone accepted it, or it was cancelled) -> drop from the board.
            if (newRow.status !== 'PENDING') return prev.filter((r) => r.id !== newRow.id);
            return prev.map((r) => (r.id === newRow.id ? newRow : r));
          }
          if (payload.eventType === 'DELETE') return prev.filter((r) => r.id !== oldRow.id);
          return prev;
        });
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  return { requests, loading, error, reload };
}

/** A mechanic's assigned requests (active + history), live via realtime. */
export function useMechanicRequests(mechanicId) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!mechanicId) return;
    try {
      const data = await fetchMechanicRequests(mechanicId);
      setRequests(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [mechanicId]);

  useEffect(() => {
    reload();
    // Cross-tab & multi-window instant sync
    const handleStorage = (e) => {
      if (!e.key || e.key.includes('service_requests')) reload();
    };
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(reload, 400);

    // Cross-profile & cross-device cloud sync
    const unsubCloud = subscribeCloudEvents((event) => {
      if (event.type === 'SYNC_REQUEST') {
        if (Array.isArray(event.data)) {
          const filtered = mechanicId ? event.data.filter(r => String(r.mechanic_id) === String(mechanicId)) : [];
          setRequests(filtered);
        }
        reload();
      }
    });

    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
      unsubCloud();
    };
  }, [reload]);

  useEffect(() => {
    if (!mechanicId) return undefined;
    const channel = supabase
      .channel(`mechanic-requests-${mechanicId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_requests', filter: `mechanic_id=eq.${mechanicId}` },
        (payload) => {
          setRequests((prev) => {
            if (payload.eventType === 'INSERT') return [payload.new, ...prev];
            if (payload.eventType === 'UPDATE')
              return prev.map((r) => (r.id === payload.new.id ? payload.new : r));
            return prev;
          });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [mechanicId]);

  return { requests, loading, error, reload };
}
