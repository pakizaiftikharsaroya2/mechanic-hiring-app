import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useClientRequests } from '../hooks/useRequests';
import { createRequest, cancelRequest } from '../services/requestService';
import { getBrowserLocation, subscribeToMechanicLocation } from '../services/locationService';
import { reverseGeocode } from '../services/routingService';
import { fetchProfile } from '../services/authService';
import { fetchMechanicProfile } from '../services/mechanicService';
import RealMap from './RealMap';
import LiveChat from './LiveChat';

export default function ClientDashboard() {
  const { user, addToast } = useAuth();
  const { requests, loading, reload } = useClientRequests(user?.id);
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [mechanicProfile, setMechanicProfile] = useState(null);
  const [mechanicPosition, setMechanicPosition] = useState(null);

  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [breakdownType, setBreakdownType] = useState('Flat Tire');
  const [serviceType, setServiceType] = useState('On-site Repair');
  const [locationText, setLocationText] = useState('');
  const [coords, setCoords] = useState(null); // { latitude, longitude }
  const [locating, setLocating] = useState(false);
  const [budget, setBudget] = useState('4000');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const activeRequest = requests.find((r) => r.id === activeRequestId);

  // Load the assigned mechanic's profile + last known position once one is
  // attached to the active request, then keep the position live via realtime.
  React.useEffect(() => {
    if (!activeRequest?.mechanic_id) {
      setMechanicProfile(null);
      setMechanicPosition(null);
      return undefined;
    }

    let cancelled = false;
    fetchProfile(activeRequest.mechanic_id).then((p) => !cancelled && setMechanicProfile(p)).catch(() => {});
    fetchMechanicProfile(activeRequest.mechanic_id)
      .then((mp) => {
        if (!cancelled && mp.latitude && mp.longitude) {
          setMechanicPosition({ latitude: mp.latitude, longitude: mp.longitude });
        }
      })
      .catch(() => {});

    const unsubscribe = subscribeToMechanicLocation(activeRequest.mechanic_id, (pos) => {
      if (!cancelled) setMechanicPosition(pos);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [activeRequest?.mechanic_id]);

  const handleUseMyLocation = async () => {
    setLocating(true);
    try {
      const pos = await getBrowserLocation();
      setCoords(pos);
      const address = await reverseGeocode(pos.latitude, pos.longitude);
      setLocationText(address || `${pos.latitude.toFixed(5)}, ${pos.longitude.toFixed(5)}`);
      addToast('Location captured', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLocating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vehicleMake || !vehicleModel || !locationText || !budget) {
      addToast('Please fill out all required fields', 'error');
      return;
    }
    if (!coords) {
      addToast('Please set your location using "Use my location" before submitting', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const created = await createRequest(user.id, {
        vehicleMake,
        vehicleModel,
        vehicleColor: vehicleColor || 'Not specified',
        breakdownType,
        serviceType,
        description: description || 'No additional details provided.',
        latitude: coords.latitude,
        longitude: coords.longitude,
        locationText,
        budget,
        paymentMethod,
      });
      addToast('Request broadcast successfully! Waiting for a mechanic...', 'success');
      setActiveRequestId(created.id);
      reload();
    } catch (err) {
      addToast(err.message || 'Failed to create request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    try {
      await cancelRequest(activeRequest.id);
      addToast('Request cancelled', 'info');
      setActiveRequestId(null);
    } catch (err) {
      addToast(err.message || 'Failed to cancel', 'error');
    }
  };

  const getStepProgressWidth = (status) => {
    switch (status) {
      case 'PENDING': return '0%';
      case 'ACCEPTED': return '25%';
      case 'EN_ROUTE': return '50%';
      case 'ARRIVED': return '75%';
      case 'IN_PROGRESS': return '90%';
      case 'COMPLETED': return '100%';
      default: return '0%';
    }
  };

  const formatPKR = (amount) => `Rs. ${Number(amount).toLocaleString('en-PK')}`;

  return (
    <div className="fade-in" style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem', width: '100%', flexGrow: 1 }}>
      <header style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Client Assistance Console</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Request roadside help anywhere in Pakistan. Pay with Cash, JazzCash or EasyPaisa.
        </p>
      </header>

      {!activeRequest ? (
        <div className="dashboard-grid">
          <div className="glass-panel" style={{ padding: '2rem', background: '#ffffff' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.15rem', fontWeight: 800, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Request Emergency Assistance
            </h3>

            <form onSubmit={handleSubmit} style={{ fontSize: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Vehicle Make *</label>
                  <select className="form-control" value={vehicleMake} onChange={(e) => setVehicleMake(e.target.value)} required>
                    <option value="">Select Make</option>
                    <option value="Toyota">Toyota</option>
                    <option value="Honda">Honda</option>
                    <option value="Suzuki">Suzuki</option>
                    <option value="Hyundai">Hyundai</option>
                    <option value="Kia">Kia</option>
                    <option value="MG">MG</option>
                    <option value="Changan">Changan</option>
                    <option value="Proton">Proton</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Vehicle Model *</label>
                  <input type="text" className="form-control" placeholder="e.g. Corolla, Civic, Alto, Cultus" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Vehicle Color</label>
                  <input type="text" className="form-control" placeholder="e.g. White, Black, Silver" value={vehicleColor} onChange={(e) => setVehicleColor(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Breakdown Type *</label>
                  <select className="form-control" value={breakdownType} onChange={(e) => setBreakdownType(e.target.value)}>
                    <option value="Flat Tire">Flat Tire</option>
                    <option value="Dead Battery">Dead Battery</option>
                    <option value="Engine Overheat">Engine Overheat</option>
                    <option value="Key Lockout">Key Lockout</option>
                    <option value="Out of Fuel">Out of Fuel</option>
                    <option value="Brake Problem">Brake Problem</option>
                    <option value="Other Mechanical">Other Mechanical</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Service Type *</label>
                <select className="form-control" value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
                  <option value="On-site Repair">On-site Repair</option>
                  <option value="Battery Jump">Battery Jump Start</option>
                  <option value="Tire Change">Tire Change</option>
                  <option value="Fuel Delivery">Fuel Delivery</option>
                  <option value="Towing">Towing Service</option>
                </select>
              </div>

              <div className="form-group">
                <label>Breakdown Location *</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Shahrah-e-Faisal, Karachi or GT Road, Lahore"
                    value={locationText}
                    onChange={(e) => setLocationText(e.target.value)}
                    required
                    style={{ flexGrow: 1 }}
                  />
                  <button type="button" onClick={handleUseMyLocation} className="btn btn-outline" disabled={locating} style={{ whiteSpace: 'nowrap' }}>
                    {locating ? 'Locating...' : '📍 Use my location'}
                  </button>
                </div>
                {coords && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--success)', display: 'block', marginTop: '0.25rem', fontWeight: 600 }}>
                    ✔ GPS coordinates captured
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Your Budget (PKR) *</label>
                  <input type="number" className="form-control" placeholder="e.g. 4000" value={budget} onChange={(e) => setBudget(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Payment Method *</label>
                  <select className="form-control" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    <option value="Cash">Cash on Completion</option>
                    <option value="JazzCash">JazzCash</option>
                    <option value="EasyPaisa">EasyPaisa</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Details / Notes for Mechanic</label>
                <textarea className="form-control" rows="3" placeholder="Describe warning lights, noises, exact location landmarks..." value={description} onChange={(e) => setDescription(e.target.value)}></textarea>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', borderRadius: 'var(--radius-sm)', marginTop: '0.5rem', padding: '0.8rem' }} disabled={submitting}>
                {submitting ? 'Broadcasting...' : 'Broadcast Assistance Request'}
              </button>
            </form>
          </div>

          <div>
            <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Your Requests
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {loading ? (
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Loading...
                </div>
              ) : requests.length === 0 ? (
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No requests yet. Submit a request to start.
                </div>
              ) : (
                requests.map((req) => (
                  <div
                    key={req.id}
                    className="glass-panel"
                    style={{
                      padding: '1.25rem',
                      cursor: 'pointer',
                      background: '#ffffff',
                      borderColor: req.id === activeRequestId ? 'var(--secondary)' : 'var(--border-color)',
                      borderWidth: req.id === activeRequestId ? '2px' : '1px',
                    }}
                    onClick={() => setActiveRequestId(req.id)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--secondary)', fontWeight: 800, textTransform: 'uppercase' }}>
                          {req.breakdown_type} • {req.service_type}
                        </span>
                        <h4 style={{ fontSize: '1.05rem', marginTop: '0.15rem' }}>
                          {req.vehicle_make} {req.vehicle_model} ({req.vehicle_color})
                        </h4>
                      </div>
                      <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>{formatPKR(req.budget)}</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      "{req.description}"
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                      <span>📍 {req.location_text}</span>
                      <span className="badge-role badge-client">{req.status}</span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                      Pay via: <strong>{req.payment_method}</strong>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="dashboard-grid">
          <div className="glass-panel" style={{ padding: '1.5rem', background: '#ffffff', height: '100%', minHeight: '520px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Tracking Map</h3>
              {activeRequest.status === 'EN_ROUTE' && (
                <span style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="pulse-indicator"></span> Heading to your location...
                </span>
              )}
            </div>
            <div style={{ flexGrow: 1 }}>
              <RealMap
                clientPosition={{ latitude: activeRequest.latitude, longitude: activeRequest.longitude }}
                mechanicPosition={mechanicPosition}
                status={activeRequest.status}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '1.25rem 1rem', background: '#ffffff' }}>
              <div className="timeline-stepper">
                <div className="timeline-progress-line" style={{ width: getStepProgressWidth(activeRequest.status) }}></div>
                <div className="timeline-step completed">
                  <div className="timeline-bubble">✓</div>
                  <div className="timeline-label">Sent</div>
                </div>
                <div className={`timeline-step ${['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'].includes(activeRequest.status) ? 'completed' : 'active'}`}>
                  <div className="timeline-bubble">2</div>
                  <div className="timeline-label">Claimed</div>
                </div>
                <div className={`timeline-step ${['EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'].includes(activeRequest.status) ? 'completed' : activeRequest.status === 'ACCEPTED' ? 'active' : ''}`}>
                  <div className="timeline-bubble">3</div>
                  <div className="timeline-label">En Route</div>
                </div>
                <div className={`timeline-step ${['ARRIVED', 'IN_PROGRESS', 'COMPLETED'].includes(activeRequest.status) ? 'completed' : activeRequest.status === 'EN_ROUTE' ? 'active' : ''}`}>
                  <div className="timeline-bubble">4</div>
                  <div className="timeline-label">Arrived</div>
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem', background: '#ffffff', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
                <strong style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Request Summary</strong>
                <strong style={{ color: 'var(--secondary)' }}>#{activeRequest.id.slice(-5)}</strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div><strong>Vehicle:</strong> {activeRequest.vehicle_make} {activeRequest.vehicle_model} ({activeRequest.vehicle_color})</div>
                <div><strong>Location:</strong> {activeRequest.location_text}</div>
                <div><strong>Service:</strong> {activeRequest.service_type} • {activeRequest.breakdown_type}</div>
                <div><strong>Budget:</strong> <span style={{ color: 'var(--success)', fontWeight: 800 }}>{formatPKR(activeRequest.budget)}</span></div>
                <div><strong>Payment:</strong> {activeRequest.payment_method}</div>

                <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
                  <strong>Assigned Mechanic:</strong>
                  {mechanicProfile ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                      <img src={mechanicProfile.avatar || '/mechanic_male.png'} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} alt="" />
                      <div>
                        <span style={{ fontWeight: 700, display: 'block' }}>{mechanicProfile.name}</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{mechanicProfile.phone} • AutoRescue Verified</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      Waiting for nearest mechanic to accept...
                    </div>
                  )}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '1rem', paddingTop: '1rem' }}>
                {activeRequest.status === 'PENDING' && (
                  <button onClick={handleCancel} className="btn" style={{ background: 'rgba(239, 68, 68, 0.08)', color: 'var(--error)', border: '1px solid var(--error)', width: '100%', padding: '0.5rem' }}>
                    Cancel Request
                  </button>
                )}
                {activeRequest.status === 'COMPLETED' && (
                  <button onClick={() => setActiveRequestId(null)} className="btn btn-primary" style={{ width: '100%', padding: '0.5rem' }}>
                    Back to Dashboard
                  </button>
                )}
                {activeRequest.status !== 'PENDING' && activeRequest.status !== 'COMPLETED' && (
                  <button disabled className="btn btn-outline" style={{ width: '100%', padding: '0.5rem', opacity: 0.6, cursor: 'not-allowed', borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
                    Mechanic is on the way...
                  </button>
                )}
              </div>
            </div>

            <div style={{ flexGrow: 1 }}>
              <LiveChat requestId={activeRequest.id} currentUserId={user.id} otherPartyName={mechanicProfile?.name} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
