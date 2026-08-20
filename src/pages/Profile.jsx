import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export default function Profile() {
  const { user, profile, updateLocalProfile, addToast, role, logout } = useAuth();
  const { t } = useLanguage();
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
    <div className="fade-in" style={{ maxWidth: '600px', margin: '4rem auto', padding: '0 1.5rem', width: '100%', flexGrow: 1 }}>
      <div className="glass-panel" style={{ padding: '2.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
        <header style={{ marginBottom: '1.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ textAlign: 'left' }}>
              <span className="section-eyebrow" style={{ display: 'block' }}>{t('account_management')}</span>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0.25rem 0' }}>{t('personal_details')}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                {t('profile_sub')}
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              style={{
                background: 'transparent',
                border: '1px solid var(--error)',
                color: 'var(--error)',
                padding: '0.45rem 1.1rem',
                fontWeight: 600,
                fontSize: '0.8rem',
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label style={{ display: 'block', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('account_type')}</label>
              <input type="text" disabled value={role || ''} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', background: 'var(--bg-card)', color: 'var(--text-muted)', cursor: 'not-allowed' }} />
            </div>
            <div className="form-group">
              <label style={{ display: 'block', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('email_label')}</label>
              <input type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', outline: 'none', background: 'var(--bg-main)', color: 'var(--text-main)' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label style={{ display: 'block', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('full_name')}</label>
              <input type="text" required value={profileName} onChange={(e) => setProfileName(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', outline: 'none', background: 'var(--bg-main)', color: 'var(--text-main)' }} />
            </div>
            <div className="form-group">
              <label style={{ display: 'block', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('phone_label')}</label>
              <input type="text" required value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', outline: 'none', background: 'var(--bg-main)', color: 'var(--text-main)' }} />
            </div>
          </div>

          {/* Change Password Block */}
          <div style={{ borderTop: '1px dashed var(--border-color)', marginTop: '1.75rem', paddingTop: '1.25rem' }}>
            <h4 style={{ fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.75rem', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>{t('change_password_block')}</h4>
            <div className="form-group">
              <label style={{ display: 'block', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('new_password')}</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder={t('new_password_placeholder')} 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  style={{ width: '100%', padding: '0.5rem', paddingRight: '2.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', outline: 'none', background: 'var(--bg-main)', color: 'var(--text-main)' }} 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.5rem',
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

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" onClick={handleGoToDashboard} className="btn btn-outline" style={{ flex: 1, padding: '0.75rem' }}>
              {t('cancel')}
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2, padding: '0.75rem' }} disabled={submitting}>
              {submitting ? t('saving') : t('save_profile_details')}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
