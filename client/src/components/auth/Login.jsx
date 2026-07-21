import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Lock, Mail, HardDrive, Eye, EyeOff } from 'lucide-react';

const Login = ({ onSwitchToRegister }) => {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to login. Please check credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-darker)' }}>
      <div className="card" style={{ width: '420px', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%', color: 'var(--primary)', marginBottom: '1rem' }}>
            <HardDrive size={36} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Network File Server</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>Authenticated Multi-User Storage Client</p>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--danger)', borderRadius: '6px', color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@domain.com"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                style={{ paddingRight: '2.5rem' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.2rem',
                  borderRadius: '4px'
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }} disabled={submitting}>
            {submitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Don't have an account?{' '}
          <span style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }} onClick={onSwitchToRegister}>
            Register Here
          </span>
        </div>

        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          Default Admin Demo: <code style={{ color: 'var(--primary)' }}>admin@fileserver.com</code> / <code style={{ color: 'var(--primary)' }}>Admin@123</code>
        </div>
      </div>
    </div>
  );
};

export default Login;
