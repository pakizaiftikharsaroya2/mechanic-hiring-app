import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAvailableRequests, useMechanicRequests } from '../hooks/useRequests';
import { acceptRequest, updateRequestStatus } from '../services/requestService';
import { fetchMechanicProfile, setMechanicStatus, haversineDistanceKm } from '../services/mechanicService';
import { getBrowserLocation, watchBrowserLocation, updateMechanicLocation } from '../services/locationService';
import { fetchProfile } from '../services/authService';
import RealMap from './RealMap';
import LiveChat from './LiveChat';

export default function MechanicDashboard() {
  const { user, addToast } = useAuth();
  const { requests: available, loading: loadingAvailable, reload: reloadAvailable } = useAvailableRequests();
  const { requests: myRequests, reload: reloadMine } = useMechanicRequests(user?.id);
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [mechProfile, setMechProfile] = useState(null);
  const [clientProfile, setClientProfile] = useState(null);
  const [myPosition, setMyPosition] = useState(null);
  const stopWatchRef = useRef(null);

  const activeRequest = myRequests.find(
    (r) => r.id === activeRequestId && !['COMPLETED', 'CANCELLED'].includes(r.status)
  );

  useEffect(() => {
    if (!user) return;
    fetchMechanicProfile(user.id).then(setMechProfile).catch(() => {});
  }, [user]);

  // Load the client's profile for the active job.
  useEffect(() => {
    if (activeRequest?.client_id) {
      fetchProfile(activeRequest.client_id).then(setClientProfile).catch(() => {});
    } else {
      setClientProfile(null);
    }
  }, [activeRequest?.client_id]);

  // While a job is active, continuously broadcast this mechanic's GPS
  // position to mechanic_profiles + mechanic_locations so the client's
  // map updates live.
  useEffect(() => {
    if (!activeRequest || !user) {
      stopWatchRef.current?.();
      stopWatchRef.current = null;
      return undefined;
    }

    stopWatchRef.current = watchBrowserLocation(
      (pos) => {
        setMyPosition(pos);
        updateMechanicLocation(user.id, { ...pos, requestId: activeRequest.id }).catch(() => {});
      },
      () => addToast('Could not read your live location. Enable GPS to share position with the client.', 'error')
    );

    return () => {
      stopWatchRef.current?.();
      stopWatchRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRequest?.id, user?.id]);

  const toggleOnline = async () => {
    if (!mechProfile) return;
    const nextStatus = mechProfile.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    try {
      if (nextStatus === 'ONLINE') {
        // Grab a starting position so we're not invisible on the map immediately after going online.
        try {
          const pos = await getBrowserLocation();
          await updateMechanicLocation(user.id, pos);
        } catch {
          /* location optional at this point — will be requested again once a job starts */
        }
      }
      const updated = await setMechanicStatus(user.id, nextStatus);
      setMechProfile((prev) => ({ ...prev, ...updated }));
      addToast(`You are now ${nextStatus}`, 'success');
      reloadAvailable();
    } catch (err) {
      addToast(err.message || 'Failed to update status', 'error');
    }
  };

  const handleAccept = async (reqId) => {
    try {
      const updated = await acceptRequest(reqId);
      addToast('Job accepted!', 'success');
      setActiveRequestId(updated.id);
      setMechProfile((prev) => (prev ? { ...prev, status: 'BUSY' } : prev));
      reloadMine();
      reloadAvailable();
    } catch (err) {
      addToast(err.message || 'Failed to accept request', 'error');
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await updateRequestStatus(activeRequest.id, newStatus);
      addToast(`Status updated to ${newStatus.replace('_', ' ')}`, 'success');
      reloadMine();
      if (newStatus === 'COMPLETED' || newStatus === 'CANCELLED') {
        setMechProfile((prev) => (prev ? { ...prev, status: 'ONLINE' } : prev));
      }
    } catch (err) {
      addToast(err.message || 'Failed to update status', 'error');
    }
  };

  const formatPKR = (amount) => `Rs. ${Number(amount).toLocaleString('en-PK')}`;

  const withDistance = mechProfile?.latitude
    ? available.map((r) => ({
        ...r,
        _distanceKm: haversineDistanceKm(mechProfile.latitude, mechProfile.longitude, r.latitude, r.longitude),
      })).sort((a, b) => a._distanceKm - b._distanceKm)
    : available;

  return (
    <div className="fade-in" style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem', width: '100%', flexGrow: 1 }}>
      <header style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Mechanic Dispatch Console</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Accept jobs near you across Pakistan. Go online to start receiving requests.
          </p>
        </div>
        {!activeRequest && mechProfile && (
          <button
            onClick={toggleOnline}
            className={mechProfile.status === 'ONLINE' ? 'btn' : 'btn btn-primary'}
            style={mechProfile.status === 'ONLINE' ? { background: 'rgba(239,68,68,0.08)', color: 'var(--error)', border: '1px solid var(--error)' } : {}}
          >
            {mechProfile.status === 'ONLINE' ? '⏻ Go Offline' : '⏻ Go Online'}
          </button>
        )}
      </header>

      {!activeRequest ? (
        <div>
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="pulse-indicator" style={{ background: 'var(--secondary)' }}></span>
            Incoming Assistance Requests
          </h3>

          {mechProfile?.status !== 'ONLINE' ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', background: '#ffffff' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#000000' }}>You're offline</h3>
              <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>Go online to see and accept nearby requests.</p>
            </div>
          ) : loadingAvailable ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', background: '#ffffff' }}>Loading...</div>
          ) : withDistance.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', background: '#ffffff' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#000000' }}>No active requests right now.</h3>
              <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>New requests will appear here automatically.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
              {withDistance.map((req) => (
                <div key={req.id} className="glass-panel" style={{ padding: '1.5rem', background: '#ffffff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--secondary)', fontWeight: 800, textTransform: 'uppercase' }}>
                          {req.breakdown_type} • {req.service_type}
                        </span>
                        <h4 style={{ fontSize: '1.1rem', marginTop: '0.15rem' }}>{req.vehicle_make} {req.vehicle_model}</h4>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>{formatPKR(req.budget)}</div>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Client Offer</span>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem', minHeight: '40px', lineHeight: '1.5' }}>
                      "{req.description}"
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginBottom: '1.25rem' }}>
                      <div>📍 <strong>Location:</strong> {req.location_text}</div>
                      {req._distanceKm != null && <div>🚗 <strong>Distance:</strong> {req._distanceKm.toFixed(1)} km away</div>}
                      <div>💳 <strong>Payment:</strong> {req.payment_method}</div>
                    </div>
                  </div>

                  <button onClick={() => handleAccept(req.id)} className="btn btn-primary" style={{ width: '100%', borderRadius: 'var(--radius-sm)' }}>
                    Accept Job
                  </button>
                </div>
              ))}
            </div>
          )}

          <h3 style={{ margin: '2rem 0 1.25rem', fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Job History
          </h3>
          {myRequests.filter((r) => ['COMPLETED', 'CANCELLED'].includes(r.status)).length === 0 ? (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', background: '#ffffff' }}>
              No completed jobs yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {myRequests
                .filter((r) => ['COMPLETED', 'CANCELLED'].includes(r.status))
                .map((r) => (
                  <div key={r.id} className="glass-panel" style={{ padding: '1rem 1.25rem', background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <div>
                      <strong>{r.vehicle_make} {r.vehicle_model}</strong> — {r.breakdown_type}
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.location_text}</div>
                    </div>
                    <span className={r.status === 'COMPLETED' ? 'badge-role badge-mechanic' : 'badge-role'} style={r.status === 'CANCELLED' ? { color: 'var(--error)' } : undefined}>
                      {r.status}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      ) : (
        <div className="dashboard-grid">
          <div className="glass-panel" style={{ padding: '1.5rem', background: '#ffffff', height: '100%', minHeight: '520px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Navigation & Routing</h3>
              {activeRequest.status === 'EN_ROUTE' && (
                <span style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="pulse-indicator"></span> Heading to Client!
                </span>
              )}
            </div>
            <div style={{ flexGrow: 1 }}>
              <RealMap
                clientPosition={{ latitude: activeRequest.latitude, longitude: activeRequest.longitude }}
                mechanicPosition={myPosition}
                status={activeRequest.status}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem', background: '#ffffff' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--secondary)', fontWeight: 800, textTransform: 'uppercase' }}>Active Job</span>
                <h3 style={{ fontSize: '1.2rem', marginTop: '0.15rem' }}>{activeRequest.vehicle_make} {activeRequest.vehicle_model}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>{activeRequest.location_text}</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {activeRequest.status === 'ACCEPTED' && (
                  <button onClick={() => handleStatusChange('EN_ROUTE')} className="btn btn-secondary" style={{ width: '100%', padding: '0.75rem' }}>
                    🚀 Start Driving (En Route)
                  </button>
                )}
                {activeRequest.status === 'EN_ROUTE' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'center' }}>
                    <span className="pulse-indicator" style={{ alignSelf: 'center' }}></span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Driving to client location...</span>
                    <button onClick={() => handleStatusChange('ARRIVED')} className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }}>
                      📍 Confirm Arrival
                    </button>
                  </div>
                )}
                {activeRequest.status === 'ARRIVED' && (
                  <button onClick={() => handleStatusChange('IN_PROGRESS')} className="btn btn-secondary" style={{ width: '100%', padding: '0.75rem' }}>
                    🔧 Start Repair
                  </button>
                )}
                {activeRequest.status === 'IN_PROGRESS' && (
                  <button onClick={() => handleStatusChange('COMPLETED')} className="btn btn-primary" style={{ width: '100%', background: 'var(--success)', padding: '0.75rem' }}>
                    🛠 Mark Job Completed
                  </button>
                )}
                {activeRequest.status === 'COMPLETED' && (
                  <button onClick={() => setActiveRequestId(null)} className="btn btn-outline" style={{ width: '100%', padding: '0.75rem' }}>
                    📁 Back to Job Board
                  </button>
                )}
                {['ACCEPTED', 'EN_ROUTE'].includes(activeRequest.status) && (
                  <button onClick={() => handleStatusChange('CANCELLED')} className="btn" style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--error)', border: '1px solid var(--error)', width: '100%', padding: '0.5rem' }}>
                    Cancel Job
                  </button>
                )}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem', background: '#ffffff', fontSize: '0.85rem' }}>
              <h4 style={{ textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
                Client Brief
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div><strong>Client:</strong> {clientProfile?.name || 'Loading...'}</div>
                <div><strong>Phone:</strong> {clientProfile?.phone || 'N/A'}</div>
                <div><strong>Vehicle:</strong> {activeRequest.vehicle_make} {activeRequest.vehicle_model} ({activeRequest.vehicle_color})</div>
                <div><strong>Payout:</strong> <span style={{ color: 'var(--success)', fontWeight: 800 }}>{formatPKR(activeRequest.budget)}</span></div>
                <div><strong>Payment Method:</strong> {activeRequest.payment_method}</div>

                <div style={{ background: '#f8f9fa', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.8rem', marginTop: '0.4rem' }}>
                  <strong>Client Notes:</strong>
                  <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.2rem' }}>"{activeRequest.description}"</div>
                </div>
              </div>
            </div>

            <div style={{ flexGrow: 1 }}>
              <LiveChat requestId={activeRequest.id} currentUserId={user.id} otherPartyName={clientProfile?.name} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
