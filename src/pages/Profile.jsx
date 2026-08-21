import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export default function Profile() {
  const { user, profile, updateLocalProfile, addToast, role, logout } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile) {
      setProfileName(profile.name || '');
      setProfilePhone(profile.phone || '');
      const emailVal = profile.email || user?.email || '';
      // Hide auto-generated dummy email from the client profile page
      if (emailVal.endsWith('@autorescue.pk')) {
        setProfileEmail('');
      } else {
        setProfileEmail(emailVal);
      }
    }
  }, [profile, user]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!profileName || !profilePhone) {
      addToast('Please fill in Name and Phone fields.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const emailToSend = profileEmail.trim() === ''
        ? (profile.email || user?.email)
        : profileEmail;

      await updateLocalProfile({
        name: profileName,
        phone: profilePhone,
        email: emailToSend,
        password: newPassword || undefined
      });
      setNewPassword(''); // Clear password field
      addToast('Profile updated successfully!', 'success');
    } catch (err) {
      addToast('Failed to save settings.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoToDashboard = () => {
    navigate(role === 'MECHANIC' ? '/mechanic' : '/client');
  };

  return (
    <div className="fade-in" style={{ maxWidth: '640px', margin: '3.5rem auto', padding: '0 1.5rem', width: '100%', flexGrow: 1 }}>
      <div className="glass-panel" style={{ padding: '2.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)' }}>
        
        {/* Header with proper RTL alignment and spacing */}
        <header style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '220px', textAlign: 'start' }}>
              <span className="section-eyebrow" style={{ display: 'block', marginBottom: '0.25rem' }}>
                {t('account_management')}
              </span>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.25rem 0', color: 'var(--text-main)' }}>
                {t('personal_details')}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.35rem', lineHeight: '1.5' }}>
                {t('profile_sub')}
              </p>
            </div>
            
            <button
              type="button"
              onClick={logout}
              style={{
                background: 'transparent',
                border: '1.5px solid var(--error)',
                color: 'var(--error)',
                padding: '0.5rem 1.2rem',
                fontWeight: 700,
                fontSize: '0.82rem',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'var(--transition)'
              }}
              onMouseOver={e => { e.currentTarget.style.background = 'var(--error)'; e.currentTarget.style.color = '#fff'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--error)'; }}
            >
              {t('logout')}
            </button>
          </div>
        </header>

        <form onSubmit={handleSave} style={{ fontSize: '0.9rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label style={{ display: 'block', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textAlign: 'start', fontSize: '0.82rem' }}>
                {t('account_type')}
              </label>
              <input 
                type="text" 
                disabled 
                value={role === 'MECHANIC' ? (language === 'ur' ? 'تصدیق شدہ مکینک (MECHANIC)' : 'Certified Mechanic') : (language === 'ur' ? 'کسٹمر / کلائنٹ (CLIENT)' : 'Standard Client')} 
                style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-main)', color: 'var(--text-muted)', cursor: 'not-allowed', textAlign: 'start', fontSize: '0.85rem' }} 
              />
            </div>
            <div className="form-group">
              <label style={{ display: 'block', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textAlign: 'start', fontSize: '0.82rem' }}>
                {t('email_label')}
              </label>
              <input 
                type="email" 
                value={profileEmail} 
                onChange={(e) => setProfileEmail(e.target.value)} 
                placeholder="name@example.com"
                style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: '6px', outline: 'none', background: 'var(--bg-main)', color: 'var(--text-main)', textAlign: 'start', fontSize: '0.85rem' }} 
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label style={{ display: 'block', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textAlign: 'start', fontSize: '0.82rem' }}>
                {t('full_name')}
              </label>
              <input 
                type="text" 
                required 
                value={profileName} 
                onChange={(e) => setProfileName(e.target.value)} 
                style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: '6px', outline: 'none', background: 'var(--bg-main)', color: 'var(--text-main)', textAlign: 'start', fontSize: '0.85rem' }} 
              />
            </div>
            <div className="form-group">
              <label style={{ display: 'block', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textAlign: 'start', fontSize: '0.82rem' }}>
                {t('phone_label')}
              </label>
              <input 
                type="text" 
                required 
                value={profilePhone} 
                onChange={(e) => setProfilePhone(e.target.value)} 
                style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: '6px', outline: 'none', background: 'var(--bg-main)', color: 'var(--text-main)', textAlign: 'start', fontSize: '0.85rem' }} 
              />
            </div>
          </div>

          {/* Change Password Block with proper logical padding for eye toggle */}
          <div style={{ borderTop: '1px dashed var(--border-color)', marginTop: '1.75rem', paddingTop: '1.25rem' }}>
            <h4 style={{ fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.85rem', fontSize: '0.82rem', letterSpacing: '0.04em', textAlign: 'start' }}>
              {t('change_password_block')}
            </h4>
            <div className="form-group">
              <label style={{ display: 'block', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textAlign: 'start', fontSize: '0.82rem' }}>
                {t('new_password')}
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder={t('new_password_placeholder')} 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  style={{ 
                    width: '100%', 
                    padding: '0.65rem 0.85rem', 
                    paddingInlineEnd: '2.5rem', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '6px', 
                    outline: 'none', 
                    background: 'var(--bg-main)', 
                    color: 'var(--text-main)',
                    textAlign: 'start',
                    fontSize: '0.85rem'
                  }} 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    insetInlineEnd: '0.65rem',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    color: 'var(--text-soft)',
                    outline: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.2rem'
                  }}
                  title={showPassword ? 'Hide Password' : 'Show Password'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  ) : (
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88L3 3m11.12 11.12L21 21M21 12a9 9 0 01-4.5 7.5M21 12c-1.274-4.057-5.064-7-9.542-7-1.274 0-2.484.225-3.6.63"/></svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {role === 'MECHANIC' && (() => {
            const storedProfiles = JSON.parse(localStorage.getItem('mock_mechanic_profiles') || '[]');
            const mech = storedProfiles.find(p => p.user_id === user?.id) || { rating: '5.0', review_count: 1, reviews: [] };
            const currentRating = mech.rating || '5.0';
            const reviewCount = mech.review_count || (mech.reviews?.length || 1);
            const reviewList = mech.reviews || [];

            return (
              <div style={{ borderTop: '1px dashed var(--border-color)', marginTop: '1.75rem', paddingTop: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.88rem', letterSpacing: '0.04em', margin: 0 }}>
                    ⭐ Mechanic Rating & Client Reviews
                  </h4>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '0.25rem 0.65rem', borderRadius: '12px' }}>
                    ★ {currentRating} / 5.0 ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
                  </span>
                </div>

                {reviewList.length === 0 ? (
                  <div style={{ padding: '0.85rem', background: 'var(--bg-main)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    No client reviews yet. Completed jobs with 5-star ratings will appear here.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                    {reviewList.map((rev, idx) => (
                      <div key={idx} style={{ background: 'var(--bg-main)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <strong style={{ color: 'var(--text-main)' }}>{rev.client_name || 'Verified Client'}</strong>
                          <span style={{ color: '#f59e0b', fontWeight: 700 }}>{'★'.repeat(rev.rating)}</span>
                        </div>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontStyle: 'italic' }}>"{rev.comment}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2.25rem' }}>
            <button type="button" onClick={handleGoToDashboard} className="btn btn-outline" style={{ flex: 1, padding: '0.75rem' }}>
              {t('cancel')}
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2, padding: '0.75rem', fontWeight: 700 }} disabled={submitting}>
              {submitting ? t('saving') : t('save_profile_details')}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
