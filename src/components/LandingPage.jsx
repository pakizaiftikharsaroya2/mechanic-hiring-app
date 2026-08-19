import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useInView, useCountUp } from '../hooks/useScrollReveal';

const STEPS = [
  { n: '01', title: 'Request Help', copy: 'Describe your breakdown and share your location in under a minute.' },
  { n: '02', title: 'Get Matched', copy: 'The nearest verified, online mechanic is notified instantly.' },
  { n: '03', title: 'Track Your Mechanic', copy: 'Watch them arrive on a live map, and chat in real time.' },
  { n: '04', title: 'Get Back on the Road', copy: 'Job done, pay however suits you — cash, JazzCash, or EasyPaisa.' },
];

const CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan'];

const SERVICES = ['Flat Tire', 'Battery', 'Engine', 'Electrical', 'Towing', 'Diagnostics', 'Emergency Repair'];

const STATS = [
  { target: 14, label: 'Active Mechanics', suffix: '' },
  { target: 18, label: 'Typical Response (min)', suffix: ' min' },
  { target: 6, label: 'Cities Covered', suffix: '' },
];

function Reveal({ children, as: Tag = 'div', stagger = false, style, ...rest }) {
  const [ref, inView] = useInView();
  return (
    <Tag ref={ref} className={`${stagger ? 'reveal-stagger' : 'reveal'} ${inView ? 'in-view' : ''}`} style={style} {...rest}>
      {children}
    </Tag>
  );
}

function StatCard({ target, label }) {
  const [ref, inView] = useInView();
  const value = useCountUp(target, inView);
  return (
    <div ref={ref} className="stat-card">
      <div className="stat-number">{value}{target < 100 && label.includes('min') ? '' : '+'}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-container fade-in" style={{ width: '100%', flexGrow: 1 }}>

      {/* ---------------- HERO ---------------- */}
      <section
        style={{
          position: 'relative',
          minHeight: '520px',
          backgroundImage: `url('/mechanics_banner.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(100deg, var(--bg-main) 0%, var(--bg-main) 38%, rgba(240,253,249,0.55) 65%, rgba(240,253,249,0.15) 100%)',
            zIndex: 1,
          }}
        ></div>

        <div style={{ position: 'relative', zIndex: 2, maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '4rem 1.5rem' }}>
          <div style={{ maxWidth: '600px' }}>
            <span className="section-eyebrow">Roadside Assistance, Reimagined for Pakistan</span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.2rem, 5vw, 3.4rem)', fontWeight: 700, lineHeight: '1.05', letterSpacing: '-0.03em', marginBottom: '1.25rem' }}>
              Your car breaks down.<br />
              <span className="hero-gradient-text">We bring the mechanic to you.</span>
            </h1>
            <p style={{ fontSize: '1.05rem', color: 'var(--text-soft)', lineHeight: '1.6', marginBottom: '2rem', maxWidth: '480px' }}>
              Find verified mechanics nearby, track them live on the map, and get back on the road — pay with Cash, JazzCash or EasyPaisa.
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button onClick={() => navigate('/register')} className="btn btn-primary" style={{ fontSize: '0.9rem', padding: '0.9rem 2rem' }}>
                Request Assistance
              </button>
              <button onClick={() => navigate('/register')} className="btn btn-outline" style={{ fontSize: '0.9rem', padding: '0.9rem 2rem', borderWidth: '1.5px' }}>
                Become a Mechanic
              </button>
            </div>
          </div>
        </div>

        <div className="floating-badge" style={{ top: '18%', right: '8%', animationDelay: '0.2s' }}>
          <span className="pulse-indicator"></span> Mechanic 2.3 km away
        </div>
        <div className="floating-badge" style={{ bottom: '16%', right: '18%', animationDelay: '1.1s' }}>
          🔧 Job accepted in 40s
        </div>
      </section>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem' }}>

        {/* ---------------- LIVE NETWORK STATS ---------------- */}
        <Reveal as="section" style={{ marginTop: '4rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem' }}>
            {STATS.map((s) => (
              <StatCard key={s.label} target={s.target} label={s.label} />
            ))}
          </div>
        </Reveal>

        {/* ---------------- HOW IT WORKS ---------------- */}
        <section style={{ marginTop: '6rem' }}>
          <Reveal style={{ textAlign: 'center', maxWidth: '560px', margin: '0 auto 2.5rem' }}>
            <span className="section-eyebrow" style={{ textAlign: 'center', display: 'block' }}>How It Works</span>
            <h2 className="section-heading">From breakdown to back-on-the-road, in four steps</h2>
          </Reveal>
          <Reveal stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            {STEPS.map((step) => (
              <div key={step.n} className="step-card">
                <div className="step-number">{step.n}</div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.4rem' }}>{step.title}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>{step.copy}</p>
              </div>
            ))}
          </Reveal>
        </section>

        {/* ---------------- REAL-TIME TRACKING ---------------- */}
        <section style={{ marginTop: '6rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'center' }} className="rt-tracking-grid">
          <Reveal>
            <span className="section-eyebrow">Real-Time Tracking</span>
            <h2 className="section-heading">Watch your mechanic arrive, live</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.7', marginBottom: '1.5rem' }}>
              Once a mechanic accepts your request, their position updates on your map in real time —
              powered by live GPS and OpenStreetMap routing, not a guess. No more "on my way" with no way to verify it.
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.9rem' }}>
              {['Live location updates, no refresh needed', 'Turn-by-turn route drawn on the map', 'In-app chat with your mechanic'].map((t) => (
                <li key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ color: 'var(--success)', fontWeight: 800 }}>✓</span> {t}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal>
            <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span className="pulse-indicator"></span> Live Tracking Preview
              </div>
              <div style={{ height: '260px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, var(--primary-soft), var(--secondary-glow))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-soft)', fontWeight: 600 }}>📍 Map renders here once you sign in</span>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ---------------- FOR MECHANICS ---------------- */}
        <section style={{ marginTop: '6rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'center' }} className="rt-tracking-grid">
          <Reveal style={{ order: 2 }}>
            <span className="section-eyebrow">For Mechanics</span>
            <h2 className="section-heading">Turn your skills into steady income</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.7', marginBottom: '1.5rem' }}>
              Go online when you're free, get matched to nearby jobs automatically, and get paid your way.
              No subscriptions, no hidden cuts — you set your availability.
            </p>
            <button onClick={() => navigate('/register')} className="btn btn-primary" style={{ padding: '0.8rem 1.75rem' }}>
              Join as a Mechanic
            </button>
          </Reveal>
          <Reveal style={{ order: 1 }}>
            <div className="glass-panel" style={{ padding: '1.75rem', background: 'var(--bg-card)' }}>
              {[
                ['Flexible hours', 'Go ONLINE or OFFLINE anytime, from your own dashboard.'],
                ['Fair matching', 'Nearest available mechanic gets shown the job first.'],
                ['Verified badge', 'Build trust with clients through ratings and job history.'],
              ].map(([title, copy]) => (
                <div key={title} style={{ display: 'flex', gap: '0.9rem', padding: '0.85rem 0', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--primary)', fontWeight: 800 }}>✓</div>
                  <div>
                    <strong style={{ fontSize: '0.9rem' }}>{title}</strong>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ---------------- PAKISTAN COVERAGE ---------------- */}
        <section style={{ marginTop: '6rem' }}>
          <Reveal style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span className="section-eyebrow" style={{ display: 'block' }}>Pakistan Coverage</span>
            <h2 className="section-heading">Cities we cover</h2>
          </Reveal>
          <Reveal stagger style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
            {CITIES.map((c) => (
              <span key={c} className="city-pill">{c}</span>
            ))}
          </Reveal>
        </section>

        {/* ---------------- SERVICES ---------------- */}
        <section style={{ marginTop: '6rem' }}>
          <Reveal style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span className="section-eyebrow" style={{ display: 'block' }}>Services</span>
            <h2 className="section-heading">Whatever broke, we've got it covered</h2>
          </Reveal>
          <Reveal stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.9rem' }}>
            {SERVICES.map((s) => (
              <div key={s} className="service-chip">{s}</div>
            ))}
          </Reveal>
        </section>

        {/* ---------------- TRUST ---------------- */}
        <section style={{ marginTop: '6rem' }}>
          <Reveal stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            {[
              ['Verified Mechanics', 'Every mechanic is identity-checked before going live on the platform.'],
              ['Transparent Pricing', 'You set your budget upfront — no surprise charges after the job.'],
              ['Rated by Real Clients', 'Job history and ratings follow every mechanic, visible before you accept.'],
            ].map(([title, copy]) => (
              <div key={title} className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-card)' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>{title}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>{copy}</p>
              </div>
            ))}
          </Reveal>
        </section>

        {/* ---------------- FINAL CTA ---------------- */}
        <Reveal as="section" style={{ marginTop: '6rem', marginBottom: '5rem' }}>
          <div className="final-cta">
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 700, marginBottom: '0.75rem' }}>
                Stuck on the road? Help is minutes away.
              </h2>
              <p style={{ opacity: 0.9, marginBottom: '1.75rem', fontSize: '0.95rem' }}>
                Join AutoRescue Pakistan today — as a client or a mechanic.
              </p>
              <button
                onClick={() => navigate('/register')}
                className="btn"
                style={{ background: '#ffffff', color: 'var(--primary)', padding: '0.9rem 2.25rem', fontWeight: 700, border: 'none' }}
              >
                Get Started — It's Free
              </button>
            </div>
          </div>
        </Reveal>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .rt-tracking-grid { grid-template-columns: 1fr !important; }
          .rt-tracking-grid > div[style*="order: 2"] { order: 1 !important; }
          .rt-tracking-grid > div[style*="order: 1"] { order: 2 !important; }
        }
      `}</style>
    </div>
  );
}
