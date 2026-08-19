import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import LandingPage from './components/LandingPage';
import ClientDashboard from './components/ClientDashboard';
import MechanicDashboard from './components/MechanicDashboard';

function Header() {
  const { isAuthenticated, role, theme, toggleTheme, logout } = useAuth();

  return (
    <header className="app-header">
      <Link to="/" className="app-brand" style={{ textDecoration: 'none' }}>
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A1.5 1.5 0 0019.5 21l2-2a1.5 1.5 0 000-2.25l-5.83-5.83M11.42 15.17l2.43-2.43M11.42 15.17L4.5 8.25M13.85 12.74l-2.43 2.43m2.43-2.43l5.83-5.83a1.5 1.5 0 000-2.25l-2-2a1.5 1.5 0 00-2.25 0l-5.83 5.83m0 0l-2.43 2.43m0 0L4.5 8.25m0 0L2 10.75a1.5 1.5 0 000 2.25l2 2a1.5 1.5 0 002.25 0l2.43-2.43" />
        </svg>
        Auto<span>Rescue</span>
      </Link>

      <nav className="nav-links">
        {isAuthenticated ? (
          <>
            <Link
              to={role === 'MECHANIC' ? '/mechanic' : '/client'}
              className="btn"
              style={{ fontSize: '0.85rem', padding: '0.4rem 1rem', background: 'transparent', color: 'var(--text-main)', border: 'none', fontWeight: 600, textDecoration: 'none' }}
            >
              Dashboard
            </Link>
            <button
              onClick={logout}
              className="btn"
              style={{ fontSize: '0.85rem', padding: '0.4rem 1rem', background: 'transparent', color: 'var(--text-main)', border: 'none', fontWeight: 500 }}
            >
              Log Out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn" style={{ fontSize: '0.85rem', padding: '0.4rem 1rem', background: 'transparent', color: 'var(--text-main)', border: 'none', fontWeight: 500, textDecoration: 'none' }}>
              Log In
            </Link>
            <Link to="/register" className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.4rem 1rem', textDecoration: 'none' }}>
              Get Started
            </Link>
          </>
        )}
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
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
  const { isAuthenticated, role, loading } = useAuth();
  if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}>Loading...</div>;
  if (!isAuthenticated) return <LandingPage />;
  return <Navigate to={role === 'MECHANIC' ? '/mechanic' : '/client'} replace />;
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
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  );
}
