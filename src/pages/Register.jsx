import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register, addToast } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'CLIENT' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Registration failed.');
      addToast('Registration failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fade-in" style={{ maxWidth: 460, margin: '4rem auto', padding: '0 1.5rem' }}>
      <div className="card" style={{ padding: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', fontFamily: 'var(--font-display)' }}>Create your account</h2>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--error)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>I am a...</label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {['CLIENT', 'MECHANIC'].map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setForm((prev) => ({ ...prev, role: r }))}
                  className={form.role === r ? 'btn btn-primary' : 'btn btn-outline'}
                  style={{ flex: 1 }}
                >
                  {r === 'CLIENT' ? 'Client needing help' : 'Mechanic'}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="name">Full name</label>
            <input id="name" className="form-control" value={form.name} onChange={update('name')} required />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" className="form-control" value={form.email} onChange={update('email')} required autoComplete="email" />
          </div>
          <div className="form-group">
            <label htmlFor="phone">Phone</label>
            <input id="phone" className="form-control" value={form.phone} onChange={update('phone')} placeholder="03xx-xxxxxxx" />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" className="form-control" value={form.password} onChange={update('password')} required minLength={6} autoComplete="new-password" />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={submitting}>
            {submitting ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p style={{ marginTop: '1.25rem', fontSize: '0.85rem', textAlign: 'center', color: 'var(--text-soft)' }}>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
