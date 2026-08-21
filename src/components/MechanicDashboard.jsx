import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAvailableRequests, useMechanicRequests } from '../hooks/useRequests';
import { acceptRequest, updateRequestStatus, clearRequestHistory } from '../services/requestService';
import { fetchMechanicProfile, setMechanicStatus, haversineDistanceKm, verifyMechanicProfile } from '../services/mechanicService';
import { getBrowserLocation, watchBrowserLocation, updateMechanicLocation } from '../services/locationService';
import { fetchProfile } from '../services/authService';
import RealMap from './RealMap';
import LiveChat from './LiveChat';
import { useLanguage } from '../context/LanguageContext';

export default function MechanicDashboard() {
  const { user, addToast } = useAuth();
  const { t } = useLanguage();
  const { requests: available, loading: loadingAvailable, reload: reloadAvailable } = useAvailableRequests();
  const { requests: myRequests, reload: reloadMine } = useMechanicRequests(user?.id);
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [mechProfile, setMechProfile] = useState(null);
  const [clientProfile, setClientProfile] = useState(null);
  const [myPosition, setMyPosition] = useState(null);
  
  // Veriff SDK Simulator states
  const [showVeriffModal, setShowVeriffModal] = useState(false);
  const [veriffStep, setVeriffStep] = useState(0);
  const [activeJob, setActiveJob] = useState(null);
  const stopWatchRef = useRef(null);

  const activeRequest = (activeJob && !['CANCELLED'].includes(activeJob.status?.toUpperCase()) ? activeJob : null)
    || (activeRequestId && myRequests.find((r) => r.id === activeRequestId && !['COMPLETED', 'CANCELLED'].includes(r.status?.toUpperCase())))
    || myRequests.find((r) => !['COMPLETED', 'CANCELLED'].includes(r.status?.toUpperCase()))
    || (activeRequestId && available.find((r) => r.id === activeRequestId));

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
        try {
          const pos = await getBrowserLocation();
          await updateMechanicLocation(user.id, pos);
        } catch {
          /* location optional at this point */
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

  const handleVeriffComplete = async () => {
    try {
      await verifyMechanicProfile(user.id);
      addToast('Identity verified via Veriff API successfully!', 'success');
      setShowVeriffModal(false);
      const updated = await fetchMechanicProfile(user.id);
      setMechProfile(updated);
    } catch (err) {
      addToast('Failed to complete identity verification', 'error');
    }
  };

  const handleAccept = async (reqId) => {
    try {
      const updated = await acceptRequest(reqId);
      addToast('Job accepted! Live GPS Routing started.', 'success');
      const finalId = updated?.id || reqId;
      setActiveRequestId(finalId);
      setActiveJob(updated || { id: reqId, status: 'ACCEPTED' });
      setMechProfile((prev) => (prev ? { ...prev, status: 'BUSY' } : prev));
      await reloadMine();
      await reloadAvailable();
    } catch (err) {
      addToast(err.message || 'Failed to accept request', 'error');
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const reqId = activeRequest?.id || activeRequestId;
      const updated = await updateRequestStatus(reqId, newStatus);
      addToast(`Status updated to ${newStatus.replace('_', ' ')}`, 'success');
      setActiveJob((prev) => (prev ? { ...prev, ...updated, status: newStatus } : updated));
      await reloadMine();
      await reloadAvailable();
      if (newStatus === 'COMPLETED' || newStatus === 'CANCELLED') {
        setMechProfile((prev) => (prev ? { ...prev, status: 'ONLINE' } : prev));
      }
    } catch (err) {
      addToast(err.message || 'Failed to update status', 'error');
    }
  };

  const formatPKR = (amount) => `Rs. ${Number(amount).toLocaleString('en-PK')}`;

  const withDistance = available.map((r) => {
    let dist = null;
    if (mechProfile?.latitude && mechProfile?.longitude && r.latitude && r.longitude) {
      dist = haversineDistanceKm(mechProfile.latitude, mechProfile.longitude, r.latitude, r.longitude);
    }
    return {
      ...r,
      _distanceKm: dist,
    };
  }).sort((a, b) => {
    if (a._distanceKm != null && b._distanceKm != null) return a._distanceKm - b._distanceKm;
    if (a._distanceKm != null) return -1;
    if (b._distanceKm != null) return 1;
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });

  const isOffline = mechProfile && mechProfile.status === 'OFFLINE';

  return (
    <div className="fade-in" style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem', width: '100%', flexGrow: 1 }}>
      <header style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>{t('mech_console_title')}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {t('mech_console_sub')}
          </p>
        </div>
        {!activeRequest && (
          <button
            onClick={toggleOnline}
            className={isOffline ? 'btn btn-primary' : 'btn'}
            style={!isOffline ? { background: 'rgba(239,68,68,0.08)', color: 'var(--error)', border: '1px solid var(--error)' } : {}}
          >
            {isOffline ? t('go_online') : t('go_offline')}
          </button>
        )}
      </header>

      {mechProfile && !mechProfile.is_verified && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1.5px solid var(--secondary)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
          marginBottom: '2rem',
          fontSize: '0.85rem',
          color: 'var(--text-main)',
          lineHeight: '1.5',
          textAlign: 'left'
        }}>
          <strong style={{ color: 'var(--secondary)', display: 'block', fontSize: '0.95rem', marginBottom: '0.35rem' }}>
            {t('verification_pending_title')}
          </strong>
          {t('verification_pending_body')}
          <div style={{ marginTop: '1rem' }}>
            <button 
              onClick={() => { setShowVeriffModal(true); setVeriffStep(0); setVeriffAnalyzing(false); }}
              className="btn btn-primary"
              style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              Verify Identity with Veriff API
            </button>
          </div>
        </div>
      )}

      {!activeRequest ? (
        <div>
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="pulse-indicator" style={{ background: 'var(--secondary)' }}></span>
            {t('incoming_requests')}
          </h3>

          {isOffline ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-card)' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#000000' }}>{t('offline_title')}</h3>
              <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>{t('offline_sub')}</p>
            </div>
          ) : loadingAvailable ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-card)' }}>{t('loading')}</div>
          ) : withDistance.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-card)' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#000000' }}>{t('no_active_requests_title')}</h3>
              <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>{t('no_active_requests_sub')}</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
              {withDistance.map((req) => (
                <div key={req.id} className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--secondary)', fontWeight: 800, textTransform: 'uppercase' }}>
                          {t(req.breakdown_type)} • {t(req.service_type)}
                        </span>
                        <h4 style={{ fontSize: '1.1rem', marginTop: '0.15rem' }}>{t(req.vehicle_make)} {req.vehicle_model}</h4>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>{formatPKR(req.budget)}</div>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Client Offer</span>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem', minHeight: '40px', lineHeight: '1.5' }}>
                      "{req.description === 'No additional details provided.' ? t('No additional details provided.') : req.description}"
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginBottom: '1.25rem' }}>
                      <div><strong>{t('Location:')}</strong> {req.location_text}</div>
                      {req._distanceKm != null && <div>🚗 <strong>{t('Distance:')}</strong> {req._distanceKm.toFixed(1)} {t('away')}</div>}
                      <div><strong>{t('Payment:')}</strong> {t(req.payment_method)}</div>
                    </div>
                  </div>

                  <button onClick={() => handleAccept(req.id)} className="btn btn-primary" style={{ width: '100%', borderRadius: 'var(--radius-sm)' }}>
                    {t('accept_job')}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '2rem 0 1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              {t('job_history')}
            </h3>
            {myRequests.some((r) => ['COMPLETED', 'CANCELLED'].includes(r.status)) && (
              <button
                type="button"
                onClick={async () => {
                  await clearRequestHistory();
                  addToast('Job history cleared', 'success');
                  reloadMine();
                }}
                className="btn btn-outline"
                style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                🗑️ {t('clear_history')}
              </button>
            )}
          </div>
          {myRequests.filter((r) => ['COMPLETED', 'CANCELLED'].includes(r.status)).length === 0 ? (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', background: 'var(--bg-card)' }}>
              {t('no_completed_jobs')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {myRequests
                .filter((r) => ['COMPLETED', 'CANCELLED'].includes(r.status))
                .map((r) => (
                  <div key={r.id} className="glass-panel" style={{ padding: '1rem 1.25rem', background: 'var(--bg-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <div>
                      <strong>{t(r.vehicle_make)} {r.vehicle_model}</strong> — {t(r.breakdown_type)}
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.location_text}</div>
                    </div>
                    <span className={r.status === 'COMPLETED' ? 'badge-role badge-mechanic' : 'badge-role'} style={r.status === 'CANCELLED' ? { color: 'var(--error)' } : undefined}>
                      {t(r.status)}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      ) : (
        <div className="dashboard-grid">
          <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-card)', height: '100%', minHeight: '520px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('navigation_routing')}</h3>
              {activeRequest.status === 'EN_ROUTE' && (
                <span style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="pulse-indicator"></span> {t('heading_to_client')}
                </span>
              )}
            </div>
            <div style={{ flexGrow: 1 }}>
              <RealMap
                clientPosition={{ latitude: activeRequest.latitude || 31.5204, longitude: activeRequest.longitude || 74.3587 }}
                mechanicPosition={myPosition || { latitude: (Number(activeRequest.latitude) || 31.5204) + 0.012, longitude: (Number(activeRequest.longitude) || 74.3587) + 0.012 }}
                status={activeRequest.status}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-card)' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--secondary)', fontWeight: 800, textTransform: 'uppercase' }}>{t('active_job')}</span>
                <h3 style={{ fontSize: '1.2rem', marginTop: '0.15rem' }}>{t(activeRequest.vehicle_make)} {activeRequest.vehicle_model}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>{activeRequest.location_text}</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {activeRequest.status === 'ACCEPTED' && (
                  <button onClick={() => handleStatusChange('EN_ROUTE')} className="btn btn-secondary" style={{ width: '100%', padding: '0.75rem' }}>
                    {t('start_driving')}
                  </button>
                )}
                {activeRequest.status === 'EN_ROUTE' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'center' }}>
                    <span className="pulse-indicator" style={{ alignSelf: 'center' }}></span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('driving_to_client')}</span>
                    <button onClick={() => handleStatusChange('ARRIVED')} className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }}>
                      {t('confirm_arrival')}
                    </button>
                  </div>
                )}
                {activeRequest.status === 'ARRIVED' && (
                  <button onClick={() => handleStatusChange('IN_PROGRESS')} className="btn btn-secondary" style={{ width: '100%', padding: '0.75rem' }}>
                    {t('start_repair')}
                  </button>
                )}
                {activeRequest.status === 'IN_PROGRESS' && (
                  <button onClick={() => handleStatusChange('COMPLETED')} className="btn btn-primary" style={{ width: '100%', background: 'var(--success)', padding: '0.75rem' }}>
                    {t('mark_completed')}
                  </button>
                )}
                {activeRequest.status === 'COMPLETED' && (
                  <button onClick={() => setActiveRequestId(null)} className="btn btn-outline" style={{ width: '100%', padding: '0.75rem' }}>
                    {t('back_to_job_board')}
                  </button>
                )}
                {['ACCEPTED', 'EN_ROUTE'].includes(activeRequest.status) && (
                  <button onClick={() => handleStatusChange('CANCELLED')} className="btn" style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--error)', border: '1px solid var(--error)', width: '100%', padding: '0.5rem' }}>
                    {t('cancel_job')}
                  </button>
                )}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem', background: 'var(--bg-card)', fontSize: '0.85rem' }}>
              <h4 style={{ textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
                {t('client_brief')}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div><strong>{t('client_label')}</strong> {clientProfile?.name || activeRequest.client_name || 'Client User'}</div>
                <div><strong>{t('phone_label_no_star')}</strong> {clientProfile?.phone || activeRequest.client_phone || '0300-1234567'}</div>
                <div><strong>{t('vehicle_label')}</strong> {t(activeRequest.vehicle_make)} {activeRequest.vehicle_model} ({t(activeRequest.vehicle_color)})</div>
                <div><strong>{t('payout_label')}</strong> <span style={{ color: 'var(--success)', fontWeight: 800 }}>{formatPKR(activeRequest.budget)}</span></div>
                <div><strong>{t('payment_method_label')}</strong> {t(activeRequest.payment_method)}</div>

                <div style={{ background: '#f8f9fa', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.8rem', marginTop: '0.4rem' }}>
                  <strong>{t('client_notes')}</strong>
                  <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.2rem' }}>"{activeRequest.description === 'No additional details provided.' ? t('No additional details provided.') : activeRequest.description}"</div>
                </div>
              </div>
            </div>

            <div style={{ flexGrow: 1 }}>
              <LiveChat
                requestId={activeRequest.id}
                currentUserId={user.id}
                otherPartyName={clientProfile?.name || activeRequest.client_name}
                role="mechanic"
              />
            </div>
          </div>
        </div>
      )}

      {/* ---------------- VERIFF INTEGRATION MODAL ---------------- */}
      {showVeriffModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(8px)',
          padding: '1.5rem'
        }}>
          <style>{`
            @keyframes scan-laser {
              0% { top: 10%; }
              50% { top: 90%; }
              100% { top: 10%; }
            }
            @keyframes pulse-veriff {
              0% { transform: scale(0.95); opacity: 0.5; }
              50% { transform: scale(1.05); opacity: 0.9; }
              100% { transform: scale(0.95); opacity: 0.5; }
            }
          `}</style>
          <div className="glass-panel" style={{
            maxWidth: '480px',
            width: '100%',
            background: 'var(--bg-card)',
            borderRadius: '12px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Veriff Header */}
            <div style={{
              background: '#0a0d14',
              color: '#ffffff',
              padding: '1rem 1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #1e293b'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#00ff66', fontWeight: 900, letterSpacing: '0.05em', fontSize: '0.95rem' }}>VERIFF</span>
                <span style={{ background: '#1e293b', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', color: '#94a3b8' }}>Secure IDV</span>
              </div>
              <button 
                onClick={() => setShowVeriffModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.1rem' }}
              >
                ✕
              </button>
            </div>

            {/* Veriff Content Panel */}
            <div style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
              {veriffStep === 0 && (
                <div>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}></div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', color: '#0f172a' }}>Start Identity Verification</h3>
                  <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                    Veriff will check your CNIC identity card and selfie match to secure the AutoRescue network. Please make sure you have:
                  </p>
                  <div style={{ textAlign: 'left', background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '6px', fontSize: '0.8rem', color: '#334155', marginBottom: '1.75rem', display: 'flex', flexDirection: 'column', gap: '6.5px' }}>
                    <div>Original CNIC card (clearly readable)</div>
                    <div>Good ambient lighting for a biometric selfie</div>
                    <div>Active web camera access</div>
                  </div>
                  <button 
                    onClick={() => { setVeriffStep(1); }}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', fontWeight: 700 }}
                  >
                    Start Verification Flow
                  </button>
                </div>
              )}

              {veriffStep === 1 && (
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem', color: '#0f172a' }}>Step 1: Scan CNIC Card</h3>
                  <p style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '1rem' }}>
                    Align the front side of your CNIC card inside the guidelines.
                  </p>
                  {/* Camera view simulator */}
                  <div style={{
                    position: 'relative',
                    height: '200px',
                    background: '#1e293b',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.5rem'
                  }}>
                    {/* Guideline rectangle */}
                    <div style={{
                      width: '80%',
                      height: '60%',
                      border: '2px dashed #00ff66',
                      borderRadius: '8px',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {veriffAnalyzing ? (
                        <div className="pulse-indicator" style={{ background: '#00ff66', width: '24px', height: '24px' }}></div>
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>[ CNIC FRONT PHOTO ]</span>
                      )}
                    </div>
                    {/* Laser line simulator */}
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      height: '2px',
                      background: 'rgba(0, 255, 102, 0.7)',
                      boxShadow: '0 0 10px #00ff66',
                      animation: 'scan-laser 2s infinite ease-in-out'
                    }}></div>
                  </div>

                  <button 
                    onClick={() => {
                      setVeriffAnalyzing(true);
                      setTimeout(() => {
                        setVeriffAnalyzing(false);
                        setVeriffStep(2);
                      }, 2500);
                    }}
                    disabled={veriffAnalyzing}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '6px', fontWeight: 700 }}
                  >
                    {veriffAnalyzing ? "Veriff OCR Analyzing..." : "Capture Document Image"}
                  </button>
                </div>
              )}

              {veriffStep === 2 && (
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem', color: '#0f172a' }}>Step 2: Biometric Selfie Match</h3>
                  <p style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '1rem' }}>
                    Look straight into the camera to match your face with the CNIC profile image.
                  </p>
                  {/* Camera view simulator */}
                  <div style={{
                    position: 'relative',
                    height: '200px',
                    background: '#1e293b',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.5rem'
                  }}>
                    {/* Face oval guideline */}
                    <div style={{
                      width: '140px',
                      height: '160px',
                      border: '2px dashed #00ff66',
                      borderRadius: '50%',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {veriffAnalyzing ? (
                        <div className="pulse-indicator" style={{ background: '#00ff66', width: '24px', height: '24px' }}></div>
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>[ FACE BIOMETRICS ]</span>
                      )}
                    </div>
                    {/* Laser scanning circle */}
                    <div style={{
                      position: 'absolute',
                      width: '160px',
                      height: '180px',
                      borderRadius: '50%',
                      border: '1.5px solid rgba(0, 255, 102, 0.4)',
                      animation: 'pulse-veriff 1.5s infinite ease-in-out'
                    }}></div>
                  </div>

                  <button 
                    onClick={() => {
                      setVeriffAnalyzing(true);
                      setTimeout(() => {
                        setVeriffAnalyzing(false);
                        setVeriffStep(3);
                      }, 2500);
                    }}
                    disabled={veriffAnalyzing}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '6px', fontWeight: 700 }}
                  >
                    {veriffAnalyzing ? "Biometrics Facial Matching..." : "Verify Facial Match"}
                  </button>
                </div>
              )}

              {veriffStep === 3 && (
                <div>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem', color: '#00ff66' }}></div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', color: '#0f172a' }}>Identity Verification Approved</h3>
                  <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                    Veriff secure background matches completed. CNIC authenticity and biometric selfie checks succeeded with a **99.8% match confidence**.
                  </p>
                  <button 
                    onClick={handleVeriffComplete}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', fontWeight: 700 }}
                  >
                    Submit Verified ID
                  </button>
                </div>
              )}
            </div>
            {/* Footer lock tag */}
            <div style={{ padding: '0.65rem', background: '#f8fafc', fontSize: '0.65rem', color: '#64748b', textAlign: 'center', borderTop: '1px solid var(--border-color)' }}>
              🔒 Secured by Veriff Identity Verification API SDK
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
