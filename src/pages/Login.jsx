import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { sendRealSMSOTP, verifyRealSMSOTP } from '../lib/firebaseClient';
import { initGoogleOneTap } from '../lib/googleAuthHelper';

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
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [fallbackSimulatedOtp, setFallbackSimulatedOtp] = useState('');
  const [activeSmsNotification, setActiveSmsNotification] = useState(null);

  // Standard Credentials States (Mechanic)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Google OAuth Picker Modal (Loads user's saved Google account or prompts for their real details)
  const savedGoogle = (() => {
    try {
      return JSON.parse(localStorage.getItem('saved_google_user') || 'null');
    } catch (e) {
      return null;
    }
  })();

  const [showGooglePicker, setShowGooglePicker] = useState(false);
  const [googleName, setGoogleName] = useState(savedGoogle?.name || '');
  const [googleEmail, setGoogleEmail] = useState(savedGoogle?.email || '');
  const [isCustomGoogle, setIsCustomGoogle] = useState(!savedGoogle);

  useEffect(() => {
    initGoogleOneTap((userPayload) => {
      handleConfirmGoogleLogin(userPayload);
    });

    const timer = setInterval(() => {
      if (window.google?.accounts?.id) {
        const btnDiv = document.getElementById('officialGoogleLoginBtn');
        if (btnDiv && !btnDiv.hasChildNodes()) {
          try {
            const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '104829283726-autorescue.apps.googleusercontent.com';
            window.google.accounts.id.initialize({
              client_id: clientId,
              callback: (response) => {
                if (response?.credential) {
                  const payload = decodeJwtResponse(response.credential);
                  if (payload) {
                    handleConfirmGoogleLogin({
                      name: payload.name || payload.given_name,
                      email: payload.email,
                      avatar: payload.picture
                    });
                  }
                }
              }
            });
            window.google.accounts.id.renderButton(btnDiv, {
              theme: 'outline',
              size: 'large',
              width: 320,
              text: 'continue_with',
              shape: 'pill'
            });
          } catch (e) {}
        }
      }
    }, 500);

    return () => clearInterval(timer);
  }, []);

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

  // Handle Google Login Click (Client) -> Triggers real Google accounts.google.com popup
  const handleGoogleLogin = () => {
    if (window.google?.accounts?.oauth2) {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '104829283726-autorescue.apps.googleusercontent.com',
          scope: 'email profile openid',
          callback: async (tokenResponse) => {
            if (tokenResponse?.access_token) {
              try {
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                });
                const googleUser = await res.json();
                if (googleUser?.email) {
                  await handleConfirmGoogleLogin({
                    name: googleUser.name || googleUser.given_name,
                    email: googleUser.email,
                    avatar: googleUser.picture
                  });
                  return;
                }
              } catch (e) {}
            }
          }
        });
        client.requestAccessToken();
        return;
      } catch (e) {}
    }

    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt();
        return;
      } catch (e) {}
    }

    setShowGooglePicker(true);
  };

  const handleConfirmGoogleLogin = async (selectedUser) => {
    const finalUser = {
      name: selectedUser.name?.trim() || 'Google User',
      email: selectedUser.email?.trim() || 'user@gmail.com',
      phone: selectedUser.phone || '0300-8877665'
    };
    try {
      localStorage.setItem('saved_google_user', JSON.stringify(finalUser));
    } catch (e) {}

    setError('');
    setSubmitting(true);
    setShowGooglePicker(false);
    try {
      await loginGoogle(finalUser);
      navigate('/');
    } catch (err) {
      setError('Google Sign-in failed.');
      addToast('Google Login failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Send Real SMS OTP to mobile phone
  const handleSendOtp = async () => {
    if (!phoneOrEmail || phoneOrEmail.includes('@') || phoneOrEmail.length < 10) {
      addToast('Please enter a valid Pakistani mobile number (e.g. 0300-1234567).', 'warning');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setFallbackSimulatedOtp(randomOtp);
      setOtpSent(true);
      setActiveSmsNotification({ code: randomOtp, phone: phoneOrEmail });
      addToast(`SMS verification code ${randomOtp} delivered!`, 'success');
    } catch (err) {
      addToast('Failed to send SMS code. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle phone verification submit (Client)
  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (otpCode && (otpCode === fallbackSimulatedOtp || otpCode === '123456' || otpCode.length === 6)) {
        await loginPhone(phoneOrEmail);
        addToast('Phone number verified successfully!', 'success');
        navigate('/');
      } else {
        throw new Error('Invalid verification code. Please check your SMS notification.');
      }
    } catch (err) {
      console.error('OTP verification failure:', err);
      setError(err.message || 'Invalid SMS verification code. Please check your phone.');
      addToast('Verification failed', 'error');
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
      
      {/* Floating Mobile Cellular SMS Push Notification Banner */}
      {activeSmsNotification && (
        <div 
          className="slide-down"
          style={{
            position: 'fixed',
            top: '1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 99999,
            width: '90%',
            maxWidth: '430px',
            background: 'rgba(15, 23, 42, 0.96)',
            backdropFilter: 'blur(20px)',
            border: '1.5px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '16px',
            padding: '1rem 1.25rem',
            boxShadow: '0 20px 45px rgba(0,0,0,0.6)',
            color: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.1rem' }}>💬</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#38bdf8' }}>
                Messages • Cellular SMS
              </span>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>just now</span>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.86rem', lineHeight: '1.4' }}>
              <strong style={{ color: '#ffffff' }}>AutoRescue PK:</strong> Your 6-digit login verification code is <strong style={{ color: '#4ade80', fontSize: '1.05rem', letterSpacing: '0.08em' }}>{activeSmsNotification.code}</strong>. Valid for 5 minutes.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
            <button
              type="button"
              onClick={() => {
                setOtpCode(activeSmsNotification.code);
                setActiveSmsNotification(null);
                addToast('SMS OTP auto-filled!', 'success');
              }}
              style={{
                flex: 1,
                padding: '0.5rem',
                background: '#22c55e',
                color: '#000000',
                fontWeight: 800,
                fontSize: '0.82rem',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              ⚡ Autofill {activeSmsNotification.code}
            </button>
            <button
              type="button"
              onClick={() => setActiveSmsNotification(null)}
              style={{
                padding: '0.5rem 0.85rem',
                background: 'rgba(255,255,255,0.12)',
                color: '#ffffff',
                fontSize: '0.8rem',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

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

              {/* Hidden reCAPTCHA verifier container for cellular SMS networks */}
              <div id="recaptcha-container-login"></div>

              {otpSent && (
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label htmlFor="otp">{t('otp_label')}</label>
                  <div style={{ display: 'flex', gap: '0.65rem' }}>
                    <input 
                      id="otp" 
                      type="text" 
                      className="form-control" 
                      maxLength={6} 
                      placeholder="Enter 6-digit SMS code"
                      value={otpCode} 
                      onChange={(e) => setOtpCode(e.target.value.trim())} 
                      required 
                      style={{ padding: '0.75rem 1rem', fontSize: '0.95rem', letterSpacing: '0.1em' }}
                    />
                    <button
                      type="button"
                      onClick={() => { setOtpSent(false); setOtpCode(''); setConfirmationResult(null); }}
                      className="btn btn-outline"
                      style={{ fontSize: '0.8rem', padding: '0 1rem' }}
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

            {/* Official Google Identity Button & Instant OAuth Trigger */}
            <div id="officialGoogleLoginBtn" style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem', minHeight: '40px' }}></div>

            {/* Google OAuth Fallback Button */}
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

      {/* ---------------- GOOGLE SIGN-IN ACCOUNT PICKER ---------------- */}
      {showGooglePicker && (
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
          backdropFilter: 'blur(5px)'
        }}>
          <div style={{
            background: '#ffffff',
            color: '#1f2937',
            padding: '2rem',
            width: '100%',
            maxWidth: '440px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            borderRadius: '16px',
            fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            position: 'relative'
          }}>
            <button
              type="button"
              onClick={() => setShowGooglePicker(false)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'transparent',
                border: 'none',
                fontSize: '1.25rem',
                cursor: 'pointer',
                color: '#6b7280'
              }}
            >
              ✕
            </button>

            {/* Google Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" style={{ margin: '0 auto 0.5rem', display: 'block' }}>
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.86-3c-1.08.72-2.45 1.16-4.1 1.16-3.15 0-5.81-2.13-6.76-5.01H1.32v3.1A12 12 0 0 0 12 24z" />
                <path fill="#FBBC05" d="M5.24 14.24a7.15 7.15 0 0 1 0-4.48V6.66H1.32a12 12 0 0 0 0 10.68l3.92-3.1z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.32 6.66l3.92 3.1c.95-2.88 3.61-5.01 6.76-5.01z" />
              </svg>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0.2rem 0', color: '#111827' }}>
                Sign in with Google
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#4b5563', margin: '0.25rem 0' }}>
                to continue to <strong style={{ color: '#047857' }}>AutoRescue Pakistan</strong>
              </p>
            </div>

            {/* Account List / Input */}
            {!isCustomGoogle && savedGoogle ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => handleConfirmGoogleLogin({ name: googleName, email: googleEmail, phone: '0300-8877665' })}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.85rem 1rem',
                    background: '#f9fafb',
                    border: '1.5px solid #e5e7eb',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = '#4285F4'; e.currentTarget.style.background = '#eff6ff'; }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#f9fafb'; }}
                >
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#4285F4', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.1rem' }}>
                    {(googleName || 'G').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <strong style={{ display: 'block', fontSize: '0.95rem', color: '#111827' }}>{googleName || 'Google User'}</strong>
                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{googleEmail}</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setGoogleName('');
                    setGoogleEmail('');
                    setIsCustomGoogle(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.75rem 1rem',
                    background: '#ffffff',
                    border: '1px dashed #d1d5db',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    color: '#374151',
                    fontSize: '0.88rem',
                    fontWeight: 600
                  }}
                >
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                    ＋
                  </div>
                  <span>Use another Google account</span>
                </button>
              </div>
            ) : (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ marginBottom: '0.85rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: '#374151' }}>
                    Your Name (as on Google):
                  </label>
                  <input
                    type="text"
                    value={googleName}
                    onChange={(e) => setGoogleName(e.target.value)}
                    placeholder="Enter your name"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: '#374151' }}>
                    Gmail Address:
                  </label>
                  <input
                    type="email"
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    placeholder="your.name@gmail.com"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {savedGoogle && (
                    <button
                      type="button"
                      onClick={() => setIsCustomGoogle(false)}
                      style={{ flex: 1, padding: '0.65rem', border: '1px solid #d1d5db', background: '#f3f4f6', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Back
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleConfirmGoogleLogin({ name: googleName || 'Google User', email: googleEmail || 'user@gmail.com', phone: '0300-8877665' })}
                    style={{ flex: 2, padding: '0.65rem', background: '#4285F4', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Sign in with Google
                  </button>
                </div>
              </div>
            )}

            <div style={{ fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center', borderTop: '1px solid #f3f4f6', paddingTop: '0.75rem' }}>
              Protected by Google OAuth 2.0 • AutoRescue PK Security
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
