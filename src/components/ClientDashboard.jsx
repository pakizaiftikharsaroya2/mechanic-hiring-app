import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useClientRequests } from '../hooks/useRequests';
import { createRequest, cancelRequest, clearRequestHistory, acceptMechanicOffer } from '../services/requestService';
import { getBrowserLocation, subscribeToMechanicLocation } from '../services/locationService';
import { reverseGeocode } from '../services/routingService';
import { fetchProfile } from '../services/authService';
import { fetchMechanicProfile, haversineDistanceKm } from '../services/mechanicService';
import RealMap from './RealMap';
import LiveChat from './LiveChat';
import { BRAND_DEALERSHIP_POLICIES } from '../data/dealershipData';
import { getEstimatedPriceRange } from '../data/pricingEstimator';
import { submitRequestReview, getMechanicRatingSummary } from '../services/reviewService';

export default function ClientDashboard() {
  const { user, profile, addToast } = useAuth();
  const { t, language } = useLanguage();
  const { requests, loading, reload } = useClientRequests(user?.id);
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [mechanicProfile, setMechanicProfile] = useState(null);
  const [mechanicPosition, setMechanicPosition] = useState(null);

  const [vehicleMake, setVehicleMake] = useState('');
  const [customVehicleMake, setCustomVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [breakdownType, setBreakdownType] = useState('Flat Tire');
  const [customBreakdownType, setCustomBreakdownType] = useState('');
  const [serviceType, setServiceType] = useState('On-site Repair');
  const [isAccident, setIsAccident] = useState(false);
  const [towDestinationType, setTowDestinationType] = useState('COMPANY_3S');
  const [customTowDestination, setCustomTowDestination] = useState('');
  const [locationText, setLocationText] = useState('');
  const [coords, setCoords] = useState(null); // { latitude, longitude }
  const [locating, setLocating] = useState(false);
  const [budget, setBudget] = useState('4000');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [otherReasonText, setOtherReasonText] = useState('');

  // Rating & Review State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedReviewReq, setSelectedReviewReq] = useState(null);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [selectedTip, setSelectedTip] = useState(0);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const activeRequest = requests.find((r) => r.id === activeRequestId && !['COMPLETED', 'CANCELLED'].includes(r.status?.toUpperCase()));
  const isClaimed = Boolean(activeRequest?.mechanic_id);
  const statusUpper = isClaimed && (!activeRequest?.status || activeRequest.status?.toUpperCase() === 'PENDING')
    ? 'ACCEPTED'
    : (activeRequest?.status ? activeRequest.status.toUpperCase() : 'PENDING');

  // Calculate dynamic fair market price range
  const priceEstimate = getEstimatedPriceRange(
    breakdownType,
    serviceType,
    vehicleMake === 'Other' ? customVehicleMake : vehicleMake,
    isAccident
  );

  // Automatically pre-populate budget with the suggested fair market price
  React.useEffect(() => {
    if (priceEstimate?.suggested) {
      setBudget(String(priceEstimate.suggested));
    }
  }, [breakdownType, serviceType, vehicleMake, customVehicleMake, isAccident]);

  const handleAcceptOffer = async (offer) => {
    if (!activeRequest?.id || !offer) return;
    try {
      await acceptMechanicOffer(activeRequest.id, offer);
      addToast(`Accepted offer from ${offer.mechanic_name || 'Mechanic'} for Rs. ${Number(offer.price).toLocaleString('en-PK')}!`, 'success');
      reload();
    } catch (err) {
      addToast(err.message || 'Failed to accept offer', 'error');
    }
  };

  // Automatically show rating & review modal when job completes
  React.useEffect(() => {
    if (statusUpper === 'COMPLETED' && !reviewSubmitted) {
      setShowReviewModal(true);
    }
  }, [statusUpper, reviewSubmitted]);

  const hasUserDismissedRef = React.useRef(false);

  // Automatically keep ongoing active request open on initial load unless dismissed
  React.useEffect(() => {
    if (hasUserDismissedRef.current || !requests || requests.length === 0 || activeRequestId) return;
    const latestActive = requests.find(r => !['COMPLETED', 'CANCELLED'].includes(r.status?.toUpperCase()));
    if (latestActive) {
      setActiveRequestId(latestActive.id);
    }
  }, [requests, activeRequestId]);

  const handleDismissActiveRequest = () => {
    hasUserDismissedRef.current = true;
    setActiveRequestId(null);
  };

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

  const handleReRequest = (req) => {
    if (!req) return;
    setVehicleMake(req.vehicle_make || 'Toyota');
    setVehicleModel(req.vehicle_model || '');
    setVehicleColor(req.vehicle_color || '');
    setBreakdownType(req.breakdown_type ? (req.breakdown_type.startsWith('Other:') ? 'Other Mechanical' : req.breakdown_type) : 'Engine');
    if (req.breakdown_type && req.breakdown_type.startsWith('Other:')) {
      setCustomBreakdownType(req.breakdown_type.replace('Other:', '').trim());
    }
    setServiceType(req.service_type || 'On-site Repair');
    setLocationText(req.location_text || '');
    setBudget(req.budget ? String(req.budget) : '');
    setPaymentMethod(req.payment_method || 'Cash');
    setDescription(req.description && req.description !== 'No additional details provided.' ? req.description : '');
    if (req.latitude && req.longitude) {
      setCoords({ latitude: Number(req.latitude), longitude: Number(req.longitude) });
    }
    setActiveRequestId(null);
    addToast('Previous request details loaded. Review & broadcast your new request.', 'success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vehicleMake || !vehicleModel || !locationText || !budget) {
      addToast('Please fill out all required fields', 'error');
      return;
    }
    if (vehicleMake === 'Other' && !customVehicleMake.trim()) {
      addToast('Please specify your vehicle make', 'error');
      return;
    }
    if (breakdownType === 'Other Mechanical' && !customBreakdownType.trim()) {
      addToast('Please describe the mechanical issue', 'error');
      return;
    }
    if ((isAccident || serviceType === 'Towing') && towDestinationType === 'CUSTOM' && !customTowDestination.trim()) {
      addToast('Please enter the workshop destination address', 'error');
      return;
    }
    if (!coords) {
      addToast('Please set your location using "Use my location" before submitting', 'error');
      return;
    }

    const effectiveMake = vehicleMake === 'Other' ? customVehicleMake.trim() : vehicleMake;
    const effectiveBreakdown = breakdownType === 'Other Mechanical' ? `Other: ${customBreakdownType.trim()}` : (isAccident ? `Accident / Collision (${breakdownType})` : breakdownType);
    
    let destinationNote = '';
    if (isAccident || serviceType === 'Towing') {
      if (towDestinationType === 'COMPANY_3S') {
        destinationNote = `[TOW DESTINATION: Authorized ${effectiveMake} Official 3S Dealership Workshop (Preserves Warranty & Insurance Claims)]`;
      } else if (towDestinationType === 'LOCAL_WORKSHOP') {
        destinationNote = `[TOW DESTINATION: Local Independent Workshop]`;
      } else if (towDestinationType === 'CUSTOM') {
        destinationNote = `[TOW DESTINATION: Custom Workshop - ${customTowDestination.trim()}]`;
      }
    }

    const finalDescription = [
      isAccident ? '[ACCIDENT / COLLISION CASE - Flatbed / Heavy Recovery Required]' : '',
      destinationNote,
      description.trim()
    ].filter(Boolean).join('\n') || 'No additional details provided.';

    setSubmitting(true);
    try {
      const created = await createRequest(user.id, {
        vehicleMake: effectiveMake,
        vehicleModel,
        vehicleColor: vehicleColor || 'Not specified',
        breakdownType: effectiveBreakdown,
        serviceType: isAccident ? 'Towing' : serviceType,
        description: finalDescription,
        latitude: coords.latitude,
        longitude: coords.longitude,
        locationText,
        budget,
        paymentMethod,
        clientName: profile?.name || user?.name || user?.email?.split('@')[0] || 'Client User',
        clientPhone: profile?.phone || user?.phone || '0300-1234567',
      });
      setVehicleModel('');
      setDescription('');
      setIsAccident(false);
      setCustomVehicleMake('');
      setCustomBreakdown('');
      setDestinationNote('');
      addToast('Request broadcast successfully! Waiting for a mechanic...', 'success');
      setActiveRequestId(created.id);
      await reload();
    } catch (err) {
      addToast(err.message || 'Failed to create request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (reason = '') => {
    const targetId = activeRequest?.id || activeRequestId || requests.find((r) => !['CANCELLED'].includes(r.status?.toUpperCase()))?.id;
    if (!targetId) {
      setShowCancelModal(false);
      return;
    }
    try {
      await cancelRequest(targetId, reason);
      addToast('Request cancelled', 'info');
      setActiveRequestId(null);
      setShowCancelModal(false);
      setCancelReason('');
      setOtherReasonText('');
      await reload();
    } catch (err) {
      addToast(err.message || 'Failed to cancel', 'error');
    }
  };

  const getStepProgressWidth = (status) => {
    const s = status ? status.toUpperCase() : 'PENDING';
    switch (s) {
      case 'PENDING': return '0%';
      case 'ACCEPTED': return '25%';
      case 'EN_ROUTE': return '50%';
      case 'ARRIVED':
      case 'IN_PROGRESS':
      case 'COMPLETED':
        return '75%';
      default: return '0%';
    }
  };

  const formatPKR = (amount) => {
    const num = Number(amount);
    return isNaN(num) || num <= 0 ? 'Rs. 2,500' : `Rs. ${num.toLocaleString('en-PK')}`;
  };

  return (
    <div className="fade-in" style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem', width: '100%', flexGrow: 1 }}>
      <header style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>{t('client_console_title')}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {t('client_console_sub')}
          </p>
        </div>
      </header>

      {!activeRequest ? (
        <div className="dashboard-grid">
          <div className="glass-panel" style={{ padding: '2rem', background: 'var(--bg-card)' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.15rem', fontWeight: 800, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('req_emergency_assistance')}
            </h3>

            <form onSubmit={handleSubmit} style={{ fontSize: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>{t('vehicle_make')}</label>
                  <select className="form-control" value={vehicleMake} onChange={(e) => setVehicleMake(e.target.value)} required>
                    <option value="">{t('select_make')}</option>
                    <option value="Toyota">{t('Toyota')}</option>
                    <option value="Honda">{t('Honda')}</option>
                    <option value="Suzuki">{t('Suzuki')}</option>
                    <option value="Hyundai">{t('Hyundai')}</option>
                    <option value="Kia">{t('Kia')}</option>
                    <option value="MG">{t('MG')}</option>
                    <option value="Changan">{t('Changan')}</option>
                    <option value="Proton">{t('Proton')}</option>
                    <option value="Other">{t('Other')}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{t('vehicle_model')}</label>
                  <input type="text" className="form-control" placeholder={t('model_placeholder')} value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} required />
                </div>
              </div>

              {/* Conditional text input when Make is "Other" */}
              {vehicleMake === 'Other' && (
                <div className="form-group" style={{ marginTop: '-0.25rem', marginBottom: '1rem' }}>
                  <label>{t('custom_make_label')}</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder={t('custom_make_placeholder')}
                    value={customVehicleMake}
                    onChange={(e) => setCustomVehicleMake(e.target.value)}
                    required
                  />
                </div>
              )}

              {/* Accident Case Checkbox Toggle & Company 3S Workshop Routing */}
              <div style={{
                margin: '1.25rem 0',
                padding: '1rem 1.25rem',
                background: isAccident ? 'rgba(217, 83, 79, 0.08)' : 'var(--bg-main)',
                border: isAccident ? '1.5px solid var(--danger)' : '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                transition: 'var(--transition)'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontWeight: 700, margin: 0, textTransform: 'none', color: isAccident ? 'var(--danger)' : 'var(--text-main)' }}>
                  <input
                    type="checkbox"
                    checked={isAccident}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsAccident(checked);
                      if (checked) {
                        setServiceType('Towing');
                        if (breakdownType === 'Flat Tire') setBreakdownType('Other Mechanical');
                      }
                    }}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--danger)', cursor: 'pointer' }}
                  />
                  <span>🚨 {t('accident_toggle_label')}</span>
                </label>
                <p style={{ margin: '0.4rem 0 0 1.8rem', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  {t('accident_note')}
                </p>

                {/* Company 3S Workshop Routing Destination Selector */}
                {isAccident && (
                  <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px dashed var(--border-color)' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                      🏢 {t('tow_destination_heading')}
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.82rem' }}>
                        <input
                          type="radio"
                          name="towDestination"
                          value="COMPANY_3S"
                          checked={towDestinationType === 'COMPANY_3S'}
                          onChange={() => setTowDestinationType('COMPANY_3S')}
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        <span>{t('tow_dest_company')} {vehicleMake && vehicleMake !== 'Other' ? `(${vehicleMake} 3S Network)` : ''}</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.82rem' }}>
                        <input
                          type="radio"
                          name="towDestination"
                          value="LOCAL_WORKSHOP"
                          checked={towDestinationType === 'LOCAL_WORKSHOP'}
                          onChange={() => setTowDestinationType('LOCAL_WORKSHOP')}
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        <span>{t('tow_dest_local')}</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.82rem' }}>
                        <input
                          type="radio"
                          name="towDestination"
                          value="CUSTOM"
                          checked={towDestinationType === 'CUSTOM'}
                          onChange={() => setTowDestinationType('CUSTOM')}
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        <span>{t('tow_dest_custom')}</span>
                      </label>
                    </div>

                    {towDestinationType === 'CUSTOM' && (
                      <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                        <input
                          type="text"
                          className="form-control"
                          placeholder={t('custom_dest_placeholder')}
                          value={customTowDestination}
                          onChange={(e) => setCustomTowDestination(e.target.value)}
                          required
                          style={{ background: 'var(--bg-card)' }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {BRAND_DEALERSHIP_POLICIES[vehicleMake] && !isAccident && (
                <div style={{
                  margin: '1rem 0',
                  padding: '1.1rem',
                  background: 'rgba(217, 83, 79, 0.08)',
                  border: '1.5px solid var(--danger)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8rem',
                  color: 'var(--text-main)',
                  lineHeight: '1.5'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '1rem' }}>🛡️</span>
                    <strong style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>
                      {vehicleMake} 3S Dealership Warranty Advisory ({BRAND_DEALERSHIP_POLICIES[vehicleMake].warrantyYears} Warranty):
                    </strong>
                  </div>
                  <p style={{ margin: '0 0 0.75rem 0', color: 'var(--text-soft)', fontSize: '0.8rem' }}>
                    {language === 'ur' ? BRAND_DEALERSHIP_POLICIES[vehicleMake].advisoryUrdu : BRAND_DEALERSHIP_POLICIES[vehicleMake].advisory}
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button 
                      type="button" 
                      onClick={() => {
                        setServiceType('Towing');
                        setTowDestinationType('COMPANY_3S');
                        setDescription(prev => prev + (prev.includes(`${vehicleMake} 3S`) ? '' : `\n[TOWING ROUTING: Direct to nearest authorized ${BRAND_DEALERSHIP_POLICIES[vehicleMake].network} to safeguard ${BRAND_DEALERSHIP_POLICIES[vehicleMake].warrantyYears} manufacturer warranty.]`));
                        addToast(`Service set to Towing. Routing directly to Authorized ${vehicleMake} 3S Dealership.`, 'info');
                      }}
                      className="btn btn-outline" 
                      style={{
                        padding: '0.45rem 1rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        borderColor: 'var(--danger)',
                        color: 'var(--danger)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <span>🚛</span> {language === 'ur' ? BRAND_DEALERSHIP_POLICIES[vehicleMake].buttonTextUrdu : BRAND_DEALERSHIP_POLICIES[vehicleMake].buttonText}
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>{t('vehicle_color')}</label>
                  <input type="text" className="form-control" placeholder={t('color_placeholder')} value={vehicleColor} onChange={(e) => setVehicleColor(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>{t('breakdown_type')}</label>
                  <select className="form-control" value={breakdownType} onChange={(e) => setBreakdownType(e.target.value)}>
                    <option value="Flat Tire">{t('Flat Tire')}</option>
                    <option value="Dead Battery">{t('Dead Battery')}</option>
                    <option value="Engine Overheat">{t('Engine Overheat')}</option>
                    <option value="Key Lockout">{t('Key Lockout')}</option>
                    <option value="Out of Fuel">{t('Out of Fuel')}</option>
                    <option value="Brake Problem">{t('Brake Problem')}</option>
                    <option value="Other Mechanical">{t('Other Mechanical')}</option>
                  </select>
                </div>
              </div>

              {/* Conditional text input when Breakdown Type is "Other Mechanical" */}
              {breakdownType === 'Other Mechanical' && (
                <div className="form-group" style={{ marginTop: '-0.25rem', marginBottom: '1rem' }}>
                  <label>{t('custom_issue_label')}</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder={t('custom_issue_placeholder')}
                    value={customBreakdownType}
                    onChange={(e) => setCustomBreakdownType(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label>{t('service_type')}</label>
                <select className="form-control" value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
                  <option value="On-site Repair">{t('On-site Repair')}</option>
                  <option value="Battery Jump">{t('Battery Jump Start')}</option>
                  <option value="Tire Change">{t('Tire Change')}</option>
                  <option value="Fuel Delivery">{t('Fuel Delivery')}</option>
                  <option value="Towing">{t('Towing Service')}</option>
                </select>
              </div>

              <div className="form-group">
                <label>{t('breakdown_location')}</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder={t('location_placeholder')}
                    value={locationText}
                    onChange={(e) => setLocationText(e.target.value)}
                    required
                    style={{ flexGrow: 1 }}
                  />
                  <button type="button" onClick={handleUseMyLocation} className="btn btn-outline" disabled={locating} style={{ whiteSpace: 'nowrap' }}>
                    {locating ? t('locating') : t('use_my_location')}
                  </button>
                </div>
                {coords && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--success)', display: 'block', marginTop: '0.25rem', fontWeight: 600 }}>
                    {t('gps_captured')}
                  </span>
                )}
              </div>

              {/* Dynamic Fair Market Price Estimator Banner */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(59, 130, 246, 0.08))',
                border: '1.5px solid rgba(16, 185, 129, 0.35)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    💡 {t('market_estimate_badge')}
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.2rem' }}>
                    {language === 'ur' ? priceEstimate.titleUr : priceEstimate.titleEn}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    {t('fair_price_recommendation')}: <strong style={{ color: 'var(--text-main)' }}>{formatPKR(priceEstimate.min)} – {formatPKR(priceEstimate.max)}</strong>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>{t('suggested_price')}</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--success)' }}>{formatPKR(priceEstimate.suggested)}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>{t('your_budget')}</label>
                  <input type="number" className="form-control" placeholder={t('budget_placeholder')} value={budget} onChange={(e) => setBudget(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>{t('payment_method')}</label>
                  <select className="form-control" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    <option value="Cash">{t('Cash on Completion')}</option>
                    <option value="JazzCash">{t('JazzCash')}</option>
                    <option value="EasyPaisa">{t('EasyPaisa')}</option>
                    <option value="Bank Transfer">{t('Bank Transfer')}</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>{t('details_notes')}</label>
                <textarea className="form-control" rows="3" placeholder={t('placeholder_landmarks')} value={description} onChange={(e) => setDescription(e.target.value)}></textarea>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', borderRadius: 'var(--radius-sm)', marginTop: '0.5rem', padding: '0.8rem' }} disabled={submitting}>
                {submitting ? t('broadcasting') : t('broadcast_request')}
              </button>
            </form>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                {t('your_requests')}
              </h3>
              {requests.length > 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    await clearRequestHistory();
                    addToast('All request history cleared from server & device', 'success');
                    reload();
                  }}
                  className="btn btn-outline"
                  style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  🗑️ {t('clear_history')}
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {loading ? (
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {t('loading')}
                </div>
              ) : requests.length === 0 ? (
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {t('no_requests_yet')}
                </div>
              ) : (
                requests.map((req) => {
                  const isCancelled = req.status?.toUpperCase() === 'CANCELLED';
                  return (
                    <div
                      key={req.id}
                      className="glass-panel"
                      style={{
                        padding: '1.25rem',
                        cursor: isCancelled ? 'default' : 'pointer',
                        background: 'var(--bg-card)',
                        borderColor: req.id === activeRequestId ? 'var(--secondary)' : 'var(--border-color)',
                        borderWidth: req.id === activeRequestId ? '2px' : '1px',
                        transition: 'all 0.2s ease',
                      }}
                      onClick={() => {
                        if (!isCancelled) {
                          setActiveRequestId(req.id);
                        }
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--secondary)', fontWeight: 800, textTransform: 'uppercase' }}>
                            {t(req.breakdown_type)} • {t(req.service_type)}
                          </span>
                          <h4 style={{ fontSize: '1.05rem', marginTop: '0.15rem' }}>
                            {t(req.vehicle_make)} {req.vehicle_model} ({t(req.vehicle_color)})
                          </h4>
                        </div>
                        <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>{formatPKR(req.budget)}</span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        "{req.description === 'No additional details provided.' ? t('No additional details provided.') : req.description}"
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                        <span>{req.location_text}</span>
                        <span className={isCancelled ? 'badge-role' : 'badge-role badge-client'} style={isCancelled ? { color: 'var(--error)', borderColor: 'var(--error)', background: 'rgba(239, 68, 68, 0.08)' } : undefined}>
                          {t(req.status)}
                        </span>
                      </div>

                      {isCancelled && (
                        <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t('Request Cancelled')}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReRequest(req);
                            }}
                            className="btn btn-primary"
                            style={{ padding: '0.35rem 0.85rem', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            🔄 {t('request_again')}
                          </button>
                        </div>
                      )}

                      {req.status === 'COMPLETED' && (
                        <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 700 }}>
                            {req.client_rating ? `⭐ Rated ${req.client_rating} Stars` : '✅ Service Complete'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedReviewReq(req);
                              if (req.client_rating) setRating(Number(req.client_rating));
                              if (req.client_review) setReviewComment(req.client_review);
                              setShowReviewModal(true);
                            }}
                            className="btn btn-primary"
                            style={{ padding: '0.35rem 0.85rem', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            ⭐ {req.client_rating ? 'Update Review' : 'Rate & Review Mechanic'}
                          </button>
                        </div>
                      )}

                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                        {t('pay_via')} <strong>{t(req.payment_method)}</strong>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="dashboard-grid">
          <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-card)', height: '100%', minHeight: '520px', display: 'flex', flexDirection: 'column' }}>
            {statusUpper === 'CANCELLED' && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1.5px solid var(--error)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1rem',
                marginBottom: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}>
                <div>
                  <strong style={{ color: 'var(--error)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>⚠️</span> {t('Request Cancelled')}
                  </strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    {t('This request was cancelled. You can request again with the same vehicle & location details.')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setActiveRequestId(null)}
                    className="btn btn-outline"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
                  >
                    {t('back_to_dashboard')}
                  </button>
                  <button
                    onClick={() => handleReRequest(activeRequest)}
                    className="btn btn-primary"
                    style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem', fontWeight: 700 }}
                  >
                    🔄 {t('request_again')}
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('live_tracking_map')}</h3>
              {statusUpper === 'EN_ROUTE' && (
                <span style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="pulse-indicator"></span> {t('heading_to_location')}
                </span>
              )}
            </div>
            <div style={{ flexGrow: 1 }}>
              <RealMap
                clientPosition={{ latitude: Number(activeRequest.latitude) || 31.5204, longitude: Number(activeRequest.longitude) || 74.3587 }}
                mechanicPosition={statusUpper === 'PENDING' ? null : (
                  (activeRequest.mechanic_latitude && activeRequest.mechanic_longitude)
                    ? { latitude: Number(activeRequest.mechanic_latitude), longitude: Number(activeRequest.mechanic_longitude) }
                    : (mechanicPosition || { latitude: (Number(activeRequest.latitude) || 31.5204) + 0.012, longitude: (Number(activeRequest.longitude) || 74.3587) + 0.012 })
                )}
                status={statusUpper}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '1.25rem 1rem', background: 'var(--bg-card)' }}>
              <div className="timeline-stepper">
                <div className="timeline-progress-line" style={{ width: getStepProgressWidth(statusUpper) }}></div>
                <div className="timeline-step completed">
                  <div className="timeline-bubble">✓</div>
                  <div className="timeline-label">{t('Sent')}</div>
                </div>
                <div className={`timeline-step ${['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'].includes(statusUpper) ? 'completed' : ''}`}>
                  <div className="timeline-bubble">
                    {['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'].includes(statusUpper) ? '✓' : '2'}
                  </div>
                  <div className="timeline-label">{t('Claimed')}</div>
                </div>
                <div className={`timeline-step ${['EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'].includes(statusUpper) ? 'completed' : statusUpper === 'ACCEPTED' ? 'active' : ''}`}>
                  <div className="timeline-bubble">
                    {['EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'].includes(statusUpper) ? '✓' : '3'}
                  </div>
                  <div className="timeline-label">{t('En Route')}</div>
                </div>
                <div className={`timeline-step ${['ARRIVED', 'IN_PROGRESS', 'COMPLETED'].includes(statusUpper) ? 'completed' : statusUpper === 'EN_ROUTE' ? 'active' : ''}`}>
                  <div className="timeline-bubble">
                    {['ARRIVED', 'IN_PROGRESS', 'COMPLETED'].includes(statusUpper) ? '✓' : '4'}
                  </div>
                  <div className="timeline-label">{t('Arrived')}</div>
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem', background: 'var(--bg-card)', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
                <strong style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('request_summary')}</strong>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ color: 'var(--secondary)' }}>#{activeRequest.id.slice(-5)}</strong>
                  <button 
                    type="button"
                    onClick={handleDismissActiveRequest} 
                    className="btn"
                    style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }}
                    title="Return to Request Form"
                  >
                    + New Request
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div><strong>{t('vehicle_label')}</strong> {t(activeRequest.vehicle_make)} {activeRequest.vehicle_model} ({t(activeRequest.vehicle_color)})</div>
                <div><strong>{t('Location:')}</strong> {activeRequest.location_text}</div>
                <div><strong>{t('Service:')}</strong> {t(activeRequest.service_type)} • {t(activeRequest.breakdown_type)}</div>
                <div><strong>{t('Budget:')}</strong> <span style={{ color: 'var(--success)', fontWeight: 800 }}>{formatPKR(activeRequest.budget)}</span></div>
                <div><strong>{t('Payment:')}</strong> {t(activeRequest.payment_method)}</div>

                <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
                  <strong>{t('assigned_mechanic')}</strong>
                  {(mechanicProfile || activeRequest.mechanic_name || activeRequest.mechanic_id) ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                      <img src={mechanicProfile?.avatar || '/mechanic_male.png'} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} alt="" />
                      <div>
                        <span style={{ fontWeight: 800, display: 'block', color: 'var(--text-main)' }}>
                          {mechanicProfile?.name || activeRequest.mechanic_name || 'Ustad Muhammad (AutoRescue Verified)'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {activeRequest.mechanic_phone || mechanicProfile?.phone || '0300-1234567'} • AutoRescue Verified ⭐ 4.9
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      {t('waiting_mechanic_accept')}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '1rem', paddingTop: '1rem' }}>
                {statusUpper === 'ACCEPTED' && (
                  <div style={{ textAlign: 'center', color: 'var(--secondary)', fontSize: '0.85rem', marginBottom: '0.75rem', fontWeight: 700 }}>
                    {t('mechanic_matched_coordinating')}
                  </div>
                )}
                {statusUpper === 'EN_ROUTE' && (
                  <div style={{ textAlign: 'center', color: 'var(--secondary)', fontSize: '0.85rem', marginBottom: '0.75rem', fontWeight: 700 }}>
                    🚚 {t('mechanic_on_way')}
                  </div>
                )}
                {statusUpper === 'ARRIVED' && (
                  <div style={{ textAlign: 'center', color: 'var(--success)', fontSize: '0.9rem', marginBottom: '0.75rem', fontWeight: 800 }}>
                    📍 {t('mechanic_arrived')}
                  </div>
                )}
                {statusUpper === 'IN_PROGRESS' && (
                  <div style={{
                    background: 'rgba(234, 88, 12, 0.1)',
                    border: '1.5px solid #ea580c',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.75rem 1rem',
                    color: '#ea580c',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    textAlign: 'center',
                    marginBottom: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}>
                    <span className="pulse-indicator" style={{ background: '#ea580c' }}></span>
                    🔧 Mechanic is actively working on your vehicle at your location!
                  </div>
                )}
                {statusUpper === 'COMPLETED' && (
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1.5px solid #10b981',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.85rem 1rem',
                    color: '#047857',
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    textAlign: 'center',
                    marginBottom: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}>
                    🎉 {t('job_completed_success') || 'Job Completed! Thank you for using AutoRescue.'}
                  </div>
                )}

                {['PENDING', 'ACCEPTED', 'EN_ROUTE'].includes(statusUpper) && (
                  (() => {
                    const currentDist = (mechanicPosition?.latitude && mechanicPosition?.longitude && activeRequest?.latitude && activeRequest?.longitude)
                      ? haversineDistanceKm(mechanicPosition.latitude, mechanicPosition.longitude, activeRequest.latitude, activeRequest.longitude)
                      : null;
                    const isTooCloseToCancel = statusUpper === 'EN_ROUTE' && currentDist != null && currentDist < 2.5;

                    if (isTooCloseToCancel) {
                      return (
                        <div style={{
                          background: 'rgba(245, 158, 11, 0.08)',
                          border: '1px dashed #f59e0b',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.5rem',
                          textAlign: 'center',
                          fontSize: '0.72rem',
                          color: '#b45309',
                          fontWeight: 600
                        }}>
                          🔒 {t('cannot_cancel_enroute_half')}
                        </div>
                      );
                    }

                    return (
                      <button
                        onClick={() => setShowCancelModal(true)}
                        className="btn"
                        style={{ background: 'rgba(239, 68, 68, 0.08)', color: 'var(--error)', border: '1px solid var(--error)', width: '100%', padding: '0.5rem', cursor: 'pointer' }}
                      >
                        {t('cancel_request')}
                      </button>
                    );
                  })()
                )}
                {statusUpper === 'COMPLETED' && (
                  <button onClick={() => setActiveRequestId(null)} className="btn btn-primary" style={{ width: '100%', padding: '0.5rem' }}>
                    {t('back_to_dashboard')}
                  </button>
                )}
              </div>
            </div>

            <div style={{ flexGrow: 1 }}>
              {statusUpper === 'PENDING' ? (
                <div className="glass-panel" style={{
                  padding: '1.5rem',
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  minHeight: '300px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="pulse-indicator" style={{ background: 'var(--secondary)' }}></span>
                      <strong style={{ fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {t('incoming_offers_title')}
                      </strong>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {(activeRequest.offers || []).length} {t('offers') || 'offers'}
                    </span>
                  </div>

                  {(!activeRequest.offers || activeRequest.offers.length === 0) ? (
                    <div style={{ padding: '2rem 1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📡</div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.35rem', color: 'var(--text-main)' }}>
                        Broadcasting to Nearby Mechanics...
                      </h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '340px', lineHeight: '1.5', margin: 0 }}>
                        {t('no_offers_yet')}
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {activeRequest.offers.map((offer) => (
                        <div
                          key={offer.id}
                          className="glass-panel"
                          style={{
                            padding: '1rem 1.25rem',
                            background: 'var(--bg-main)',
                            border: '1.5px solid var(--border-color)',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '0.75rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--secondary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem' }}>
                              {offer.mechanic_name ? offer.mechanic_name[0].toUpperCase() : 'M'}
                            </div>
                            <div>
                              <strong style={{ fontSize: '0.95rem', display: 'block', color: 'var(--text-main)' }}>
                                {offer.mechanic_name || 'Mechanic'}
                              </strong>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                ⭐ {offer.rating || '4.9'} • {offer.distance_km ? `${offer.distance_km.toFixed(1)} km away` : 'Nearby verified mechanic'}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--success)' }}>
                                {formatPKR(offer.price)}
                              </div>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Offered Fare</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAcceptOffer(offer)}
                              className="btn btn-primary"
                              style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              ✅ {t('accept_offer_btn')}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <LiveChat
                  requestId={activeRequest.id}
                  currentUserId={user.id}
                  otherPartyName={mechanicProfile?.name || 'Mechanic Muhammad'}
                  role="client"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {showCancelModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{
            background: 'var(--bg-card)',
            padding: '1.75rem',
            width: '100%',
            maxWidth: '450px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            borderRadius: 'var(--radius-lg)'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
              {t('cancel_modal_title')}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              {t('cancel_modal_sub')}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {[
                { key: 'reason_another_solution', val: 'Found another solution' },
                { key: 'reason_too_long', val: 'Mechanic is taking too long' },
                { key: 'reason_changed_mind', val: 'Changed my mind' },
                { key: 'reason_wrong_details', val: 'Wrong vehicle/location details' },
                { key: 'reason_other', val: 'Other' }
              ].map((reasonObj) => (
                <label 
                  key={reasonObj.val} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    fontSize: '0.85rem', 
                    cursor: 'pointer', 
                    padding: '0.5rem', 
                    borderRadius: 'var(--radius-sm)', 
                    border: '1px solid var(--border-color)',
                    background: cancelReason === reasonObj.val ? 'rgba(239, 68, 68, 0.04)' : 'transparent',
                    borderColor: cancelReason === reasonObj.val ? 'var(--error)' : 'var(--border-color)',
                  }}
                >
                  <input 
                    type="radio" 
                    name="cancel_reason" 
                    value={reasonObj.val} 
                    checked={cancelReason === reasonObj.val} 
                    onChange={(e) => setCancelReason(e.target.value)} 
                  />
                  <span>{t(reasonObj.key)}</span>
                </label>
              ))}
            </div>

            {cancelReason === 'Other' && (
              <textarea 
                className="form-control" 
                placeholder={t('other_reason_placeholder')}
                value={otherReasonText} 
                onChange={(e) => setOtherReasonText(e.target.value)} 
                rows={3} 
                style={{ width: '100%', marginBottom: '1.25rem', fontSize: '0.85rem' }}
                required
              />
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                onClick={() => { setShowCancelModal(false); setCancelReason(''); setOtherReasonText(''); }} 
                className="btn btn-outline" 
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                {t('cancel')}
              </button>
              <button 
                type="button" 
                onClick={() => handleCancel(cancelReason === 'Other' ? otherReasonText : cancelReason)} 
                className="btn" 
                disabled={!cancelReason || (cancelReason === 'Other' && !otherReasonText.trim())}
                style={{ 
                  padding: '0.5rem 1.25rem', 
                  fontSize: '0.85rem',
                  background: 'var(--error)',
                  color: '#ffffff',
                  opacity: (!cancelReason || (cancelReason === 'Other' && !otherReasonText.trim())) ? 0.6 : 1,
                  cursor: (!cancelReason || (cancelReason === 'Other' && !otherReasonText.trim())) ? 'not-allowed' : 'pointer'
                }}
              >
                {t('confirm_cancellation_btn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- RATING & REVIEW MODAL ----------------- */}
      {showReviewModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 99999,
          padding: '1rem',
          backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-panel" style={{
            background: 'var(--bg-card)',
            padding: '2rem',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            borderRadius: 'var(--radius-lg)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.35rem', color: 'var(--text-main)' }}>
              Service Completed!
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              How was your experience with <strong>{mechanicProfile?.name || 'Mechanic Muhammad'}</strong>?
            </p>

            {/* 5-Star Rating Selector */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '2rem',
                    cursor: 'pointer',
                    color: star <= rating ? '#fbbf24' : '#cbd5e1',
                    transform: star <= rating ? 'scale(1.1)' : 'scale(1)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  ★
                </button>
              ))}
            </div>

            {/* Optional Tip Selector */}
            <div style={{ marginBottom: '1.25rem', textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
                Add a Tip for Good Service (Optional):
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                {[0, 200, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setSelectedTip(amt)}
                    className="btn"
                    style={{
                      padding: '0.4rem 0.2rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: selectedTip === amt ? 'var(--primary)' : 'var(--bg-main)',
                      color: selectedTip === amt ? '#ffffff' : 'var(--text-main)',
                      border: selectedTip === amt ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                      borderRadius: '6px'
                    }}
                  >
                    {amt === 0 ? 'No Tip' : `Rs. ${amt}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Review Comment Area */}
            <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-main)' }}>
                Write your Review & Comments:
              </label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Share details about the speed, behavior, and repair quality..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                style={{ width: '100%', fontSize: '0.85rem' }}
              />
            </div>

            <button
              type="button"
              onClick={async () => {
                const targetReq = selectedReviewReq || activeRequest || requests.find(r => r.status === 'COMPLETED');
                const targetMechId = targetReq?.mechanic_id || mechanicProfile?.user_id;
                try {
                  await submitRequestReview({
                    requestId: targetReq?.id,
                    mechanicId: targetMechId,
                    rating,
                    comment: reviewComment,
                    tip: selectedTip,
                    clientName: profile?.name || user?.name || 'Verified Client'
                  });
                  setReviewSubmitted(true);
                  setShowReviewModal(false);
                  addToast(`Review submitted with ${rating} Stars! Thank you for rating your mechanic.`, 'success');
                  await reload();
                } catch (e) {
                  addToast('Review submitted locally.', 'info');
                  setShowReviewModal(false);
                }
              }}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}
            >
              Submit Review & Rating ⭐
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
