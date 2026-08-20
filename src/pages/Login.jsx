import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Login() {
  const { login, loginGoogle, loginPhone, addToast } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  // Toggle role mode: 'client' (Emergency Login) | 'mechanic' (Standard Credentials)
  const [roleMode, setRoleMode] = useState('client');

  // Emergency Phone OTP States (Client)
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [clientPassword, setClientPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [correctOtp, setCorrectOtp] = useState('');

  // Standard Credentials States (Mechanic)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Handle Mechanic Email Login Submit
  const handleMechanicSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed. Check your email and password.');
      addToast('Login failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Google Login Click (Client)
  const handleGoogleLogin = async () => {
    setError('');
    setSubmitting(true);
    try {
      await loginGoogle();
      navigate('/');
    } catch (err) {
      setError('Google Sign-in failed.');
      addToast('Google Login failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Simulate sending SMS OTP
  const handleSendOtp = () => {
    if (!phoneOrEmail || phoneOrEmail.includes('@') || phoneOrEmail.length < 10) {
      addToast('Please enter a valid phone number to send OTP.', 'warning');
      return;
    }
    setError('');
    const randomOtp = Math.floor(1000 + Math.random() * 9000).toString();
    setCorrectOtp(randomOtp);
    setOtpSent(true);
    addToast(`Verification code sent to ${phoneOrEmail}`, 'info');
    
    // Simulate real SMS arrival notification in browser
    setTimeout(() => {
      alert(`Simulated SMS to ${phoneOrEmail}:\nYour AutoRescue verification code is: ${randomOtp}`);
    }, 600);
  };

  // Handle phone verification submit (Client)
  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (otpCode !== correctOtp) {
      setError('Invalid verification code. Please check your SMS and try again.');
      addToast('Invalid verification code', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await loginPhone(phoneOrEmail);
      navigate('/');
    } catch (err) {
      setError('Phone login failed.');
      addToast('Authentication failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Client Password Login Submit
  const handleClientPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const isEmail = phoneOrEmail.includes('@');
      const emailToSend = isEmail 
        ? phoneOrEmail 
        : `${phoneOrEmail}@autorescue.pk`;

      await login(emailToSend, clientPassword);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed. Check your password.');
      addToast('Login failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fade-in" style={{ maxWidth: 500, margin: '3.5rem auto', padding: '0 1.5rem' }}>
      <div className="glass-panel" style={{ padding: '2.5rem 2.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)' }}>
        
        {/* Toggle Mode buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.75rem', background: 'var(--bg-main)', padding: '0.35rem', borderRadius: '30px', border: '1px solid var(--border-color)' }}>
          <button
            type="button"
            onClick={() => { setRoleMode('client'); setError(''); }}
            style={{
              flex: 1,
              padding: '0.65rem 1rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              borderRadius: '25px',
              border: 'none',
              background: roleMode === 'client' ? 'var(--primary)' : 'transparent',
              color: roleMode === 'client' ? '#ffffff' : 'var(--text-soft)',
              boxShadow: roleMode === 'client' ? 'var(--shadow-sm)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {t('client_tab')}
          </button>
          <button
            type="button"
            onClick={() => { setRoleMode('mechanic'); setError(''); }}
            style={{
              flex: 1,
              padding: '0.65rem 1rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              borderRadius: '25px',
              border: 'none',
              background: roleMode === 'mechanic' ? 'var(--primary)' : 'transparent',
              color: roleMode === 'mechanic' ? '#ffffff' : 'var(--text-soft)',
              boxShadow: roleMode === 'mechanic' ? 'var(--shadow-sm)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {t('mechanic_tab')}
          </button>
        </div>

        {roleMode === 'client' ? (
          <div>
            <h2 style={{ marginBottom: '0.25rem', fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}>{t('client_heading')}</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-soft)', marginBottom: '1.5rem' }}>
              {t('client_sub')}
            </p>
          </div>
        ) : (
          <div>
            <h2 style={{ marginBottom: '0.25rem', fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}>{t('mechanic_heading')}</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-soft)', marginBottom: '1.5rem' }}>
              {t('mechanic_sub')}
            </p>
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--error)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            {error}
          </div>
        )}

        {/* ---------------- CLIENT EMERGENCY LOGIN ---------------- */}
        {roleMode === 'client' && (
          <div>
            <form onSubmit={clientPassword ? handleClientPasswordSubmit : handlePhoneSubmit}>
              <div className="form-group">
                <label htmlFor="phoneOrEmail">{t('phone_email_label')}</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    id="phoneOrEmail" 
                    type="text" 
                    className="form-control" 
                    value={phoneOrEmail} 
                    onChange={(e) => setPhoneOrEmail(e.target.value)} 
                    placeholder={t('phone_email_placeholder')}
                    required 
                    disabled={otpSent}
                  />
                  {!otpSent && !phoneOrEmail.includes('@') && (
                    <button 
                      type="button" 
                      onClick={handleSendOtp} 
                      className="btn btn-primary" 
                      style={{ fontSize: '0.75rem', padding: '0 1rem', whiteSpace: 'nowrap' }}
                    >
                      {t('send_otp')}
                    </button>
                  )}
                </div>
              </div>

              {!otpSent && (
                <div className="form-group" style={{ marginTop: '0.75rem', position: 'relative' }}>
                  <label htmlFor="clientPassword">{t('password_label')}</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input 
                      id="clientPassword" 
                      type={showPassword ? 'text' : 'password'} 
                      className="form-control" 
                      value={clientPassword} 
                      onChange={(e) => setClientPassword(e.target.value)} 
                      placeholder={t('password_placeholder_client')}
                      style={{ width: '100%', paddingRight: '2.5rem' }} 
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
              )}

              {otpSent && (
                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label htmlFor="otp">{t('otp_label')}</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      id="otp" 
                      type="text" 
                      className="form-control" 
                      maxLength={4} 
                      placeholder={t('otp_placeholder_input')}
                      value={otpCode} 
                      onChange={(e) => setOtpCode(e.target.value)} 
                      required 
                    />
                    <button
                      type="button"
                      onClick={() => { setOtpSent(false); setOtpCode(''); }}
                      className="btn btn-outline"
                      style={{ fontSize: '0.75rem', padding: '0 0.75rem' }}
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.25rem' }} disabled={submitting}>
                {otpSent 
                  ? (submitting ? t('verifying') : t('verify_continue')) 
                  : (submitting ? t('logging_in') : t('login'))}
              </button>
            </form>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0', gap: '1rem' }}>
              <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border-color)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-soft)', fontWeight: 'bold' }}>{t('or_divider')}</span>
              <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border-color)' }} />
            </div>

            {/* Google OAuth Button */}
            <button 
              type="button" 
              onClick={handleGoogleLogin} 
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.6rem',
                padding: '0.6rem',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '30px',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-main)'}
              onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}
              disabled={submitting}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" style={{ display: 'block' }}>
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.69c-.29 1.5-.1.14-.1.14v3.26h2.72c1.6-1.48 2.52-3.66 2.52-6.23z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.86-3c-1.08.72-2.45 1.16-4.1 1.16-3.15 0-5.81-2.13-6.76-5.01H1.32v3.1A12 12 0 0 0 12 24z" />
                <path fill="#FBBC05" d="M5.24 14.24a7.15 7.15 0 0 1 0-4.48V6.66H1.32a12 12 0 0 0 0 10.68l3.92-3.1z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.32 6.66l3.92 3.1c.95-2.88 3.61-5.01 6.76-5.01z" />
              </svg>
              {t('continue_google')}
            </button>
          </div>
        )}

        {/* ---------------- MECHANIC CREDENTIALS LOGIN ---------------- */}
        {roleMode === 'mechanic' && (
          <form onSubmit={handleMechanicSubmit}>
            <div className="form-group">
              <label htmlFor="email">{t('email_label')}</label>
              <input id="email" type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="form-group" style={{ position: 'relative' }}>
              <label htmlFor="password">{t('password_label')}</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input 
                  id="password" 
                  type={showPassword ? 'text' : 'password'} 
                  className="form-control" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  autoComplete="current-password" 
                  style={{ width: '100%', paddingRight: '2.5rem' }} 
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
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={submitting}>
              {submitting ? t('logging_in') : t('login')}
            </button>
          </form>
        )}

        <p style={{ marginTop: '1.5rem', fontSize: '0.85rem', textAlign: 'center', color: 'var(--text-soft)' }}>
          {roleMode === 'mechanic' ? (
            <>
              {t('need_mechanic_account')}{' '}
              <Link to="/register" style={{ fontWeight: 'bold', textDecoration: 'underline', color: 'var(--primary)' }}>
                {t('register_here')}
              </Link>
            </>
          ) : (
            <>
              {t('need_client_account')}{' '}
              <Link to="/register" style={{ fontWeight: 'bold', textDecoration: 'underline', color: 'var(--primary)' }}>
                {t('register_here')}
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
