import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import LandingPage from './components/LandingPage';
import ClientDashboard from './components/ClientDashboard';
import MechanicDashboard from './components/MechanicDashboard';
import Profile from './pages/Profile';
import { LanguageProvider, useLanguage } from './context/LanguageContext';

// App Header and Navigation Bar

function Header() {
  const { isAuthenticated, role, theme, toggleTheme, logout, user, profile } = useAuth();
  const { t, toggleLanguage, language } = useLanguage();
  const location = useLocation();

  const isHome = location.pathname === '/';
  const firstName = profile?.name ? profile.name.split(' ')[0] : (user?.email?.split('@')[0] || 'User');

  return (
    <header className={isHome ? 'app-header app-header-transparent' : 'app-header'}>
      <Link to="/" className="app-brand" style={{ textDecoration: 'none' }}>
        <div className="brand-icon-wrapper">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A1.5 1.5 0 0019.5 21l2-2a1.5 1.5 0 000-2.25l-5.83-5.83M11.42 15.17l2.43-2.43M11.42 15.17L4.5 8.25M13.85 12.74l-2.43 2.43m2.43-2.43l5.83-5.83a1.5 1.5 0 000-2.25l-2-2a1.5 1.5 0 00-2.25 0l-5.83 5.83m0 0l-2.43 2.43m0 0L4.5 8.25m0 0L2 10.75a1.5 1.5 0 000 2.25l2 2a1.5 1.5 0 002.25 0l2.43-2.43" />
          </svg>
        </div>
        <span className="brand-text">AUTO<span className="brand-accent">RESCUE</span></span>
      </Link>

      <nav className="nav-links">
        <Link 
          to="/"
          className="nav-link-premium" 
          onClick={(e) => {
            e.preventDefault();
            const el = document.getElementById('parts-marketplace');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth' });
            } else {
              window.location.href = '/#parts-marketplace';
            }
          }}
        >
          {t('buy_spare_parts')}
        </Link>
        {isAuthenticated ? (
          <>
            <Link
              to={role === 'MECHANIC' ? '/mechanic' : '/client'}
              className="nav-link-premium"
            >
              {role === 'MECHANIC' ? t('job_board') : t('request_assistance')}
            </Link>
            <Link
              to="/profile"
              className="nav-link-premium"
              title="View Account Profile Settings"
            >
              {firstName === 'Emergency' ? t('profile') : firstName}
            </Link>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link-premium">
              {t('login')}
            </Link>
            <Link 
              to="/register" 
              className="nav-link-premium nav-cta-pill"
            >
              {t('get_started')}
            </Link>
          </>
        )}

        <div className="nav-controls-group">
          <button
            onClick={toggleLanguage}
            className="nav-control-toggle"
            title={language === 'en' ? 'Switch to Urdu' : 'Switch to English'}
          >
            {language === 'en' ? 'اردو' : 'EN'}
          </button>
          <span className="nav-control-sep"></span>
          <button
            onClick={toggleTheme}
            className="nav-control-toggle"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? 'DARK' : 'LIGHT'}
          </button>
        </div>
      </nav>
    </header>
  );
}

function Toasts() {
  const { toasts } = useAuth();
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t.message}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Home() {
  const { loading } = useAuth();
  if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}>Loading...</div>;
  return <LandingPage />;
}

function AppShell() {
  return (
    <>
      <Header />
      <Toasts />
      <main style={{ flexGrow: 1, width: '100%' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/client"
            element={
              <ProtectedRoute allowedRole="CLIENT">
                <ClientDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mechanic"
            element={
              <ProtectedRoute allowedRole="MECHANIC">
                <MechanicDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      <footer style={{ borderTop: '1px solid var(--border-color)', padding: '1.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 'auto', background: '#f8f9fa' }}>
        <p>&copy; {new Date().getFullYear()} AutoRescue Pakistan • Roadside Assistance Platform</p>
        <p style={{ marginTop: '0.35rem' }}>Karachi • Lahore • Islamabad • Pay with JazzCash / EasyPaisa / Cash</p>
      </footer>
    </>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}
