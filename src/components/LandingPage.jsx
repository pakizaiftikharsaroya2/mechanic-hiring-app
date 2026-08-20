import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useInView, useCountUp } from '../hooks/useScrollReveal';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { BRAND_DEALERSHIP_POLICIES } from '../data/dealershipData';

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

// Premium Vector SVGs for clean, consistent auto parts cards
function TireSVG() {
  return (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '100%', height: '100%', padding: '1.75rem', color: 'var(--text-soft)' }}>
      <circle cx="50" cy="50" r="35" strokeWidth="6" />
      <circle cx="50" cy="50" r="22" strokeWidth="2.5" strokeDasharray="4 2" />
      <circle cx="50" cy="50" r="8" />
      <path d="M50 15v10M50 75v10M15 50h10M75 50h10M25 25l7 7M68 68l7 7M25 75l7-7M68 32l7-7" />
    </svg>
  );
}

function BatterySVG() {
  return (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '100%', height: '100%', padding: '1.75rem', color: 'var(--text-soft)' }}>
      <rect x="20" y="30" width="60" height="45" rx="4" />
      <rect x="30" y="20" width="12" height="10" />
      <rect x="58" y="20" width="12" height="10" />
      <path d="M36 45h6M61 45h6M64 42v6" />
      <line x1="20" y1="58" x2="80" y2="58" strokeDasharray="3 3" />
    </svg>
  );
}

function OilSVG() {
  return (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '100%', height: '100%', padding: '1.75rem', color: 'var(--text-soft)' }}>
      <path d="M35 38h30l5 8v34H30V46l5-8z" rx="2" />
      <rect x="42" y="22" width="16" height="16" rx="1" />
      <path d="M50 48c-5 5-8 9-8 13s3.5 7 8 7 8-3.1 8-7-3-8-8-13z" fill="var(--primary-soft)" />
    </svg>
  );
}

function KitSVG() {
  return (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '100%', height: '100%', padding: '1.75rem', color: 'var(--text-soft)' }}>
      <rect x="20" y="25" width="60" height="50" rx="6" />
      <path d="M40 25V16h20v9" />
      <path d="M50 38v24M38 50h24" strokeWidth="4" />
    </svg>
  );
}

const SPARE_PARTS = [
  {
    id: 'part_toyota_pads',
    name: 'Toyota Corolla Front Brake Pads (OEM)',
    category: 'Emergency Kits',
    price: 14500,
    brand: 'Toyota Indus Motors',
    description: 'Official Toyota Indus Motors genuine front disc brake pads. Restores factory stopping distances and preserves warranty.',
    type: 'kit',
    hub: 'Toyota Dealership Network'
  },
  {
    id: 'part_honda_filter',
    name: 'Honda Civic Premium Air Filter Element',
    category: 'Emergency Kits',
    price: 6800,
    brand: 'Honda Atlas Cars',
    description: 'Official Honda Atlas genuine engine air filter element. Keeps dust particles out of Civic engines. Dispatched from official parts counters.',
    type: 'kit',
    hub: 'Honda Dealership Network'
  },
  {
    id: 'part_suzuki_oil',
    name: 'Suzuki Alto Genuine Maintenance Kit',
    category: 'Lubricants',
    price: 8200,
    brand: 'Pak Suzuki Motor Company',
    description: 'Official Suzuki Genuine Parts (SGP) combo pack. Includes oil filter and Suzuki-recommended engine oil.',
    type: 'oil',
    hub: 'Suzuki Dealership Network'
  },
  {
    id: 'part_ags_battery',
    name: 'AGS MF65 Maintenance-Free Battery',
    category: 'Batteries',
    price: 18500,
    brand: 'AGS Battery Pakistan',
    description: 'Official AGS maintenance-free battery for Suzuki Alto, WagonR, and Cultus. Sourced from Atlas Battery authorized distributors.',
    type: 'battery',
    hub: 'AGS Distributor Network'
  },
  {
    id: 'part_michelin',
    name: 'Michelin Pilot Sport 4 (18-Inch Tire)',
    category: 'Tires',
    price: 65000,
    brand: 'Michelin Pakistan',
    description: 'High-performance passenger car tire. Sourced from Michelin Pakistan authorized importers for Civic RS or luxury sedans.',
    type: 'tire',
    hub: 'Michelin Authorized Importers'
  },
  {
    id: 'part_caltex_oil',
    name: 'Caltex Havoline Formula 10W-30 Oil',
    category: 'Lubricants',
    price: 7400,
    brand: 'Caltex Pakistan',
    description: '4 Liters Caltex Havoline motor oil. Advanced engine protection under extreme hot climates in local cities.',
    type: 'oil',
    hub: 'Caltex Official Depot'
  },
  {
    id: 'part_yokohama',
    name: 'Yokohama Advan Decibel V701 (Tire)',
    category: 'Tires',
    price: 38000,
    brand: 'Yokohama Pakistan',
    description: 'Comfort-comfort passenger car tire. Sourced from Yokohama Pakistan authorized dealer networks to ensure premium quality.',
    type: 'tire',
    hub: 'Yokohama Dealer Network'
  },
  {
    id: 'part_exide_battery',
    name: 'Exide MF-90 Heavy-Duty Battery',
    category: 'Batteries',
    price: 22000,
    brand: 'Exide Pakistan',
    description: 'Exide premium maintenance-free battery for SUVs and pickups. Sourced from official Exide Pakistan dealerships.',
    type: 'battery',
    hub: 'Exide Dealer Network'
  }
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
  const location = useLocation();
  const { isAuthenticated, role, addToast } = useAuth();
  const { t, language } = useLanguage();

  // Always start at top when landing page loads fresh
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Scroll to spare parts only when hash is explicitly set in URL, then clean the hash
  useEffect(() => {
    if (location.hash === '#parts-marketplace') {
      const el = document.getElementById('parts-marketplace');
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth' });
          // Clean hash from URL so refreshing the page doesn't auto-scroll again
          window.history.replaceState(null, '', '/');
        }, 200);
      }
    }
  }, [location.hash]);

  // Spare parts state variables
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [checkoutPart, setCheckoutPart] = useState(null);
  
  // Sourcing form fields
  const [shippingName, setShippingName] = useState('');
  const [shippingEmail, setShippingEmail] = useState('');
  const [shippingPhone, setShippingPhone] = useState('');
  const [shippingCity, setShippingCity] = useState('Lahore');
  const [shippingAddress, setShippingAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  
  // Card details
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  
  // Fitting assistance request checkbox
  const [needFitting, setNeedFitting] = useState(false);

  const [orders, setOrders] = useState(() => {
    return JSON.parse(localStorage.getItem('mock_parts_orders') || '[]');
  });

  // Track active order delivery simulation
  useEffect(() => {
    const timer = setInterval(() => {
      const pendingOrders = orders.some(o => o.status !== 'DELIVERED');
      if (!pendingOrders) return;

      const updated = orders.map(order => {
        if (order.status === 'PENDING') {
          return { ...order, status: 'SHIPPED', logs: [...order.logs, 'Dispatched from Sourcing Hub via TCS. Tracking reference generated.'] };
        } else if (order.status === 'SHIPPED') {
          return { ...order, status: 'OUT_FOR_DELIVERY', logs: [...order.logs, 'Arrived at target city hub. Handed over to local delivery rider.'] };
        } else if (order.status === 'OUT_FOR_DELIVERY') {
          return { ...order, status: 'DELIVERED', logs: [...order.logs, `Delivered to doorstep. ${order.needFitting ? 'Mechanic dispatched for installation.' : 'Order complete.'}`] };
        }
        return order;
      });

      setOrders(updated);
      localStorage.setItem('mock_parts_orders', JSON.stringify(updated));
      addToast('Parts delivery status updated!', 'info');
    }, 15000); // Progress status every 15s

    return () => clearInterval(timer);
  }, [orders, addToast]);

  const handleBuyNow = (part) => {
    setCheckoutPart(part); // Open modal directly - guest checkout supported!
  };

  const handlePlaceOrder = (e) => {
    e.preventDefault();
    if (!shippingName || !shippingPhone || !shippingAddress || !shippingEmail) {
      addToast('Please fill in all shipping details.', 'warning');
      return;
    }

    if (paymentMethod === 'Card' && (!cardNumber || !cardExpiry || !cardCvv)) {
      addToast('Please fill in your card details.', 'warning');
      return;
    }

    const orderPrice = checkoutPart.price + (needFitting ? 1500 : 0);

    const newOrder = {
      id: `ord_${Date.now()}`,
      partName: checkoutPart.name,
      partPrice: orderPrice,
      partType: checkoutPart.type || 'kit',
      clientName: shippingName,
      email: shippingEmail,
      phone: shippingPhone,
      city: shippingCity,
      address: shippingAddress,
      payment: paymentMethod === 'Card' ? `Card (Ending in ${cardNumber.slice(-4)})` : paymentMethod,
      needFitting,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      logs: [
        'Order successfully created.',
        needFitting ? 'Fitting request registered. Sourcing local AutoRescue mechanic.' : 'Product dispatching from warehouse.'
      ]
    };

    const newOrders = [newOrder, ...orders];
    setOrders(newOrders);
    localStorage.setItem('mock_parts_orders', JSON.stringify(newOrders));

    addToast('Parts order successfully submitted!', 'success');
    
    // Clear forms
    setCheckoutPart(null);
    setShippingName('');
    setShippingEmail('');
    setShippingPhone('');
    setShippingAddress('');
    setPaymentMethod('COD');
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
    setNeedFitting(false);
  };

  const handleCancelOrder = (orderId) => {
    const updated = orders.filter(o => o.id !== orderId);
    setOrders(updated);
    localStorage.setItem('mock_parts_orders', JSON.stringify(updated));
    addToast('Order cancelled successfully.', 'info');
  };

  const translatedStats = STATS.map(s => ({
    ...s,
    label: t(s.label)
  }));

  const translatedSteps = STEPS.map(step => ({
    ...step,
    title: t(step.title),
    copy: t(step.copy)
  }));

  const translatedParts = SPARE_PARTS.map(part => ({
    ...part,
    name: t(`${part.id}_name`),
    description: t(`${part.id}_desc`),
    brand: t(`${part.id}_brand`),
    hub: t(`${part.id}_hub`),
    category: t(part.category)
  }));

  const filteredParts = translatedParts.filter(p => {
    const matchesCat = selectedCategory === 'All' || p.category === t(selectedCategory);
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const renderPartIcon = (type) => {
    switch (type) {
      case 'tire': return <TireSVG />;
      case 'battery': return <BatterySVG />;
      case 'oil': return <OilSVG />;
      default: return <KitSVG />;
    }
  };

  return (
    <div className="landing-container fade-in" style={{ width: '100%', flexGrow: 1, position: 'relative' }}>

      {/* ---------------- HERO BANNER BACKGROUND IMAGE ---------------- */}
      <section className="hero-split-container">
        <div className="hero-split-content">
          <div style={{ maxWidth: '580px', width: '100%' }}>
            <span className="section-eyebrow">{t('section_eyebrow')}</span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.2rem, 5vw, 3.4rem)', fontWeight: 700, lineHeight: '1.05', letterSpacing: '-0.03em', marginBottom: '1.25rem' }}>
              {t('hero_title_1')}<br />
              <span className="hero-gradient-text">{t('hero_title_2')}</span>
            </h1>
            <p style={{ fontSize: '1.05rem', color: 'var(--text-soft)', lineHeight: '1.6', marginBottom: '2rem', maxWidth: '480px' }}>
              {t('hero_sub')}
            </p>
            
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {isAuthenticated ? (
                <button 
                  onClick={() => navigate(role === 'MECHANIC' ? '/mechanic' : '/client')} 
                  className="btn btn-primary" 
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 2rem', fontSize: '0.95rem', fontWeight: 700, borderRadius: '30px' }}
                >
                  {role === 'MECHANIC' ? t('job_board') : t('open_dashboard')}
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => navigate('/register')} 
                    className="btn btn-primary" 
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 2rem', fontSize: '0.95rem', fontWeight: 700, borderRadius: '30px' }}
                  >
                    {t('request_assistance')}
                  </button>
                  <button 
                    onClick={() => navigate('/register')} 
                    className="btn btn-outline" 
                    style={{ padding: '0.8rem 2rem', fontSize: '0.95rem', fontWeight: 700, borderRadius: '30px', borderWidth: '2px' }}
                  >
                    {t('become_mechanic')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Right side container showing the two mechanics clearly side-by-side with overlaid floating status badges */}
        <div className="hero-split-image">
          <div className="floating-badge" style={{ top: '18%', right: '8%', animationDelay: '0.2s' }}>
            <span className="pulse-indicator"></span> Mechanic 2.3 km away
          </div>
          <div className="floating-badge" style={{ bottom: '16%', right: '18%', animationDelay: '1.1s' }}>
            Job accepted in 40s
          </div>
        </div>
      </section>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem' }}>

        {/* ---------------- LIVE NETWORK STATS ---------------- */}
        <Reveal as="section" style={{ marginTop: '4rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem' }}>
            {translatedStats.map((s) => (
              <StatCard key={s.label} target={s.target} label={s.label} />
            ))}
          </div>
        </Reveal>

        {/* ---------------- HOW IT WORKS ---------------- */}
        <section style={{ marginTop: '6rem' }}>
          <Reveal style={{ textAlign: 'center', maxWidth: '560px', margin: '0 auto 2.5rem' }}>
            <span className="section-eyebrow" style={{ textAlign: 'center', display: 'block' }}>{t('How It Works')}</span>
            <h2 className="section-heading">{t('From breakdown to back-on-the-road, in four steps')}</h2>
          </Reveal>
          <Reveal stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            {translatedSteps.map((step) => (
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
            <span className="section-eyebrow">{t('Real-Time Tracking')}</span>
            <h2 className="section-heading">{t('Watch your mechanic arrive, live')}</h2>
            <p style={{ color: 'var(--text-soft)', fontSize: '0.95rem', lineHeight: '1.7', marginBottom: '1.5rem' }}>
              {t('Once a mechanic accepts your request, their position updates on your map in real time — powered by live GPS and OpenStreetMap routing, not a guess. No more "on my way" with no way to verify it.')}
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.9rem' }}>
              {['Live location updates, no refresh needed', 'Turn-by-turn route drawn on the map', 'In-app chat with your mechanic'].map((item) => (
                <li key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ color: 'var(--success)', fontWeight: 800 }}></span> {t(item)}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal>
            <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span className="pulse-indicator"></span> {t('Live Tracking Preview')}
              </div>
              <div style={{ height: '260px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, var(--primary-soft), var(--secondary-glow))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-soft)', fontWeight: 600 }}>{t('Map renders here once you sign in')}</span>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ---------------- FOR MECHANICS ---------------- */}
        <section style={{ marginTop: '6rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'center' }} className="rt-tracking-grid">
          <Reveal style={{ order: 2 }}>
            <span className="section-eyebrow">{t('For Mechanics')}</span>
            <h2 className="section-heading">{t('Turn your skills into steady income')}</h2>
            <p style={{ color: 'var(--text-soft)', fontSize: '0.95rem', lineHeight: '1.7', marginBottom: '1.5rem' }}>
              {t("Go online when you're free, get matched to nearby jobs automatically, and get paid your way. No subscriptions, no hidden cuts — you set your availability.")}
            </p>
            <button onClick={() => navigate('/register')} className="btn btn-primary" style={{ padding: '0.8rem 1.75rem' }}>
              {t('Join as a Mechanic')}
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
                  <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--primary)', fontWeight: 800 }}></div>
                  <div>
                    <strong style={{ fontSize: '0.9rem' }}>{t(title)}</strong>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{t(copy)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ---------------- PAKISTAN COVERAGE ---------------- */}
        <section style={{ marginTop: '6rem' }}>
          <Reveal style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span className="section-eyebrow" style={{ display: 'block' }}>{t('Pakistan Coverage')}</span>
            <h2 className="section-heading">{t('Cities we cover')}</h2>
          </Reveal>
          <Reveal stagger style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
            {CITIES.map((c) => (
              <span key={c} className="city-pill">{t(c)}</span>
            ))}
          </Reveal>
        </section>

        {/* ---------------- SERVICES ---------------- */}
        <section style={{ marginTop: '6rem' }}>
          <Reveal style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span className="section-eyebrow" style={{ display: 'block' }}>{t('Services')}</span>
            <h2 className="section-heading">{t("Whatever broke, we've got it covered")}</h2>
          </Reveal>
          <Reveal stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.9rem' }}>
            {SERVICES.map((s) => (
              <div key={s} className="service-chip">{t(s)}</div>
            ))}
          </Reveal>
        </section>

        {/* ---------------- SPARE PARTS MARKETPLACE ---------------- */}
        <section id="parts-marketplace" style={{ marginTop: '6rem', scrollMarginTop: '80px' }}>
          <Reveal style={{ textAlign: 'center', maxWidth: '620px', margin: '0 auto 2.5rem' }}>
            <span className="section-eyebrow" style={{ display: 'block', textAlign: 'center' }}>{t('Branded Parts Hub')}</span>
            <h2 className="section-heading">{t('Official Automotive Spare Parts')}</h2>
            <p style={{ color: 'var(--text-soft)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              {t('AutoRescue acts as a digital marketplace connecting you directly with official manufacturer dealerships and brand-authorized distributors in Pakistan.')}
            </p>
          </Reveal>

          {/* Search, Categories Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['All', 'Tires', 'Batteries', 'Lubricants', 'Emergency Kits'].map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`btn ${selectedCategory === category ? 'btn-primary' : 'btn-outline'}`}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 1rem', borderRadius: '20px' }}
                >
                  {t(category)}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder={t('Search spare parts...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                border: '1px solid var(--border-color)',
                width: '100%',
                maxWidth: '220px',
                fontSize: '0.85rem',
                outline: 'none',
                background: 'var(--bg-card)',
                color: 'var(--text-main)'
              }}
            />
          </div>

          {/* Spare Parts Grid */}
          <Reveal stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {filteredParts.length > 0 ? (
              filteredParts.map(part => (
                <div key={part.id} className="glass-panel" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
                  <div style={{ position: 'relative', height: '160px', background: 'linear-gradient(135deg, #1c2a38 0%, #0d151d 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {renderPartIcon(part.type || 'kit')}
                    <span style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(17,17,17,0.85)', color: '#ffffff', padding: '0.2rem 0.6rem', fontSize: '0.7rem', fontWeight: 600, borderRadius: '4px' }}>
                      {part.category}
                    </span>
                    <span style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'var(--primary)', color: '#ffffff', padding: '0.2rem 0.5rem', fontSize: '0.7rem', fontWeight: 600, borderRadius: '4px' }}>
                      {part.hub}
                    </span>
                  </div>

                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                    {part.brand && (
                      <div style={{
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: 'var(--primary)',
                        marginBottom: '0.25rem'
                      }}>
                        {t('Genuine {brand} Part').replace('{brand}', part.brand)}
                      </div>
                    )}
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.35rem' }}>{part.name}</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5', flexGrow: 1, marginBottom: '1rem' }}>
                      {part.description}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Price')}</span>
                        <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>Rs. {part.price.toLocaleString()}</span>
                      </div>
                      <button 
                        onClick={() => handleBuyNow(part)}
                        className="btn btn-primary"
                        style={{ padding: '0.5rem 1.2rem', fontSize: '0.8rem' }}
                      >
                        {t('Buy Now')}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                {t('No spare parts match your filters.')}
              </div>
            )}
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
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>{t(title)}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>{t(copy)}</p>
              </div>
            ))}
          </Reveal>
        </section>

        {/* ---------------- FINAL CTA ---------------- */}
        <Reveal as="section" style={{ marginTop: '6rem', marginBottom: '5rem' }}>
          <div className="final-cta">
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 700, marginBottom: '0.75rem' }}>
                {t('Stuck on the road? Help is minutes away.')}
              </h2>
              <p style={{ opacity: 0.9, marginBottom: '1.75rem', fontSize: '0.95rem' }}>
                {t('Join AutoRescue Pakistan today — as a client or a mechanic.')}
              </p>
              {isAuthenticated ? (
                <button
                  onClick={() => navigate(role === 'MECHANIC' ? '/mechanic' : '/client')}
                  className="btn"
                  style={{ background: '#ffffff', color: 'var(--primary)', padding: '0.9rem 2.25rem', fontWeight: 700, border: 'none' }}
                >
                  {role === 'MECHANIC' ? t('Go to Mechanic Board') : t('Request Assistance Now')}
                </button>
              ) : (
                <button
                  onClick={() => navigate('/register')}
                  className="btn"
                  style={{ background: '#ffffff', color: 'var(--primary)', padding: '0.9rem 2.25rem', fontWeight: 700, border: 'none' }}
                >
                  {t("Get Started — It's Free")}
                </button>
              )}
            </div>
          </div>
        </Reveal>
      </div>

      {/* ---------------- CHECKOUT MODAL ---------------- */}
      {checkoutPart && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem'
        }}>
          <div className="glass-panel fade-in" style={{
            background: 'var(--bg-main)',
            border: '1px solid var(--border-color)',
            maxWidth: '520px',
            width: '100%',
            padding: '2rem',
            position: 'relative',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <button 
              onClick={() => {
                setCheckoutPart(null);
                setNeedFitting(false);
              }}
              style={{
                position: 'absolute',
                top: '1.5rem',
                right: '1.5rem',
                border: 'none',
                background: 'transparent',
                fontSize: '1.25rem',
                cursor: 'pointer',
                color: 'var(--text-muted)'
              }}
            >
              ✕
            </button>

            <span className="section-eyebrow">{t('Confirm Sourcing Order')}</span>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.25rem 0 1rem' }}>{t('Checkout Part')}</h3>

            {/* Sourcing warranty warning for OEM Assembler Parts */}
            {(() => {
              const matchedBrandKey = Object.keys(BRAND_DEALERSHIP_POLICIES).find(k => 
                checkoutPart.brand?.toLowerCase().includes(k.toLowerCase()) || 
                checkoutPart.name?.toLowerCase().includes(k.toLowerCase())
              );
              const policy = matchedBrandKey ? BRAND_DEALERSHIP_POLICIES[matchedBrandKey] : null;
              if (!policy) return null;
              return (
                <div style={{
                  background: 'rgba(217, 83, 79, 0.08)',
                  border: '1px solid var(--danger)',
                  padding: '0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  color: 'var(--text-main)',
                  marginBottom: '1rem',
                  lineHeight: '1.4'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                    <span>🛡️</span>
                    <strong style={{ color: 'var(--danger)' }}>{policy.assembler} 3S Dealership Advisory ({policy.warrantyYears} Warranty):</strong>
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-soft)' }}>
                    {language === 'ur' ? policy.advisoryUrdu : policy.advisory}
                  </p>
                </div>
              );
            })()}

            {/* Part brief in modal */}
            <div style={{ display: 'flex', gap: '1rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', marginBottom: '1.5rem', alignItems: 'center' }}>
              <div style={{ width: '50px', height: '50px', background: 'linear-gradient(135deg, #1c2a38 0%, #0d151d 100%)', borderRadius: '4px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ scale: '0.6' }}>{renderPartIcon(checkoutPart.type || 'kit')}</span>
              </div>
              <div style={{ flexGrow: 1 }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {checkoutPart.brand}
                </div>
                <h5 style={{ fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>{checkoutPart.name}</h5>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)', display: 'block', marginTop: '0.25rem' }}>Rs. {checkoutPart.price.toLocaleString()}</span>
              </div>
            </div>

            {/* Sourcing Form */}
            <form onSubmit={handlePlaceOrder}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{t('Full Name *')}</label>
                  <input type="text" required value={shippingName} onChange={(e) => setShippingName(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', outline: 'none', background: 'var(--bg-card)', color: 'var(--text-main)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{t('Email Address *')}</label>
                  <input type="email" required placeholder="name@example.com" value={shippingEmail} onChange={(e) => setShippingEmail(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', outline: 'none', background: 'var(--bg-card)', color: 'var(--text-main)' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{t('Contact Phone *')}</label>
                  <input type="text" required placeholder="03xx-xxxxxxx" value={shippingPhone} onChange={(e) => setShippingPhone(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', outline: 'none', background: 'var(--bg-card)', color: 'var(--text-main)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{t('Destination City *')}</label>
                  <select value={shippingCity} onChange={(e) => setShippingCity(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', outline: 'none', background: 'var(--bg-card)', color: 'var(--text-main)' }}>
                    {CITIES.map(c => <option key={c} value={c}>{t(c)}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{t('Complete Delivery Address *')}</label>
                <textarea required rows="2" value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', outline: 'none', resize: 'none', background: 'var(--bg-card)', color: 'var(--text-main)' }}></textarea>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{t('Payment Method *')}</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', outline: 'none', background: 'var(--bg-card)', color: 'var(--text-main)' }}>
                  <option value="COD">{t('Cash on Delivery (COD)')}</option>
                  <option value="Card">{t('Debit / Credit Card')}</option>
                  <option value="JazzCash">{t('JazzCash Mobile Wallet')}</option>
                  <option value="EasyPaisa">{t('EasyPaisa Mobile Wallet')}</option>
                </select>
              </div>

              {/* Debit/Credit Card details box */}
              {paymentMethod === 'Card' && (
                <div style={{
                  padding: '1rem',
                  border: '1.5px solid var(--primary-soft)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-card)',
                  marginBottom: '1rem'
                }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)', display: 'block', marginBottom: '0.75rem' }}>{t('Debit / Credit Card')}</span>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Card Number</label>
                    <input type="text" maxLength="16" placeholder="xxxx xxxx xxxx xxxx" required value={cardNumber} onChange={(e) => setCardNumber(e.target.value.replace(/\D/g,''))} style={{ width: '100%', padding: '0.4rem', border: '1px solid var(--border-color)', borderRadius: '4px', outline: 'none', background: 'var(--bg-main)', color: 'var(--text-main)' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Expiry Date</label>
                      <input type="text" maxLength="5" placeholder="MM/YY" required value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} style={{ width: '100%', padding: '0.4rem', border: '1px solid var(--border-color)', borderRadius: '4px', outline: 'none', background: 'var(--bg-main)', color: 'var(--text-main)' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.15rem' }}>CVV</label>
                      <input type="password" maxLength="3" placeholder="***" required value={cardCvv} onChange={(e) => setCardCvv(e.target.value.replace(/\D/g,''))} style={{ width: '100%', padding: '0.4rem', border: '1px solid var(--border-color)', borderRadius: '4px', outline: 'none', background: 'var(--bg-main)', color: 'var(--text-main)' }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Mechanic Fitting assistant checkbox */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                margin: '1.25rem 0',
                padding: '0.75rem',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                background: 'var(--bg-card)'
              }}>
                <input 
                  type="checkbox" 
                  id="mechanic-fitting" 
                  checked={needFitting}
                  onChange={(e) => setNeedFitting(e.target.checked)}
                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                />
                <label htmlFor="mechanic-fitting" style={{ cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {t('Dispatch an AutoRescue mechanic to install/fit this part (+ Rs. 1,500 Fitting Charge)')}
                </label>
              </div>

              {/* Pricing breakdown summary */}
              <div style={{
                borderTop: '1.5px solid var(--border-color)',
                paddingTop: '0.75rem',
                marginBottom: '1.5rem',
                fontSize: '0.85rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  <span>{t('Product Price:')}</span>
                  <span>Rs. {checkoutPart.price.toLocaleString()}</span>
                </div>
                {needFitting && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    <span>{t('Fitting & Installation Charge:')}</span>
                    <span>Rs. 1,500</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.05rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.4rem', marginTop: '0.4rem' }}>
                  <span>{t('Total Amount:')}</span>
                  <span style={{ color: 'var(--primary)' }}>Rs. {(checkoutPart.price + (needFitting ? 1500 : 0)).toLocaleString()}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setCheckoutPart(null); setNeedFitting(false); }} className="btn btn-outline" style={{ padding: '0.6rem 1.5rem' }}>{t('Cancel')}</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem 2rem' }}>{t('Confirm Sourcing Order')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- MY PARTS ORDERS SIDEBAR (PERSISTENT TRACKING) ---------------- */}
      {orders.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          width: '320px',
          maxHeight: '480px',
          background: 'var(--bg-main)',
          border: '1.5px solid var(--primary)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          zIndex: 900,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{ background: 'var(--primary)', color: '#ffffff', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📦 My Parts Orders ({orders.length})</span>
          </div>

          <div style={{ padding: '1rem', overflowY: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {orders.map(order => (
              <div key={order.id} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #1c2a38 0%, #0d151d 100%)', borderRadius: '4px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ scale: '0.45' }}>{renderPartIcon(order.partType || 'kit')}</span>
                  </div>
                  <div style={{ flexGrow: 1 }}>
                    <h6 style={{ fontWeight: 700, margin: 0, fontSize: '0.8rem' }}>{order.partName}</h6>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Rs. {order.partPrice.toLocaleString()}</span>
                  </div>
                </div>

                {/* Delivery stepper indicator */}
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.75rem 0 0.5rem', background: '#f0f3f6', padding: '0.4rem', borderRadius: '4px', fontWeight: 700, fontSize: '0.7rem', textAlign: 'center' }}>
                  <span style={{ color: 'var(--primary)' }}>
                    Status: {order.status}
                  </span>
                </div>

                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: '1.4', background: 'var(--bg-card)', padding: '0.5rem', borderRadius: '4px' }}>
                  <strong>Timeline Update:</strong> {order.logs[order.logs.length - 1]}
                </div>

                {order.status === 'PENDING' && (
                  <button 
                    onClick={() => handleCancelOrder(order.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--danger)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      marginTop: '0.5rem',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    ✕ Cancel Sourcing Order
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
