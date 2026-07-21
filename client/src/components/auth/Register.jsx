import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { UserPlus, HardDrive } from 'lucide-react';

const Register = ({ onSwitchToLogin }) => {
  const { register } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(name, email, password, role);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-darker)' }}>
      <div className="card" style={{ width: '440px', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '50%', color: 'var(--purple)', marginBottom: '1rem' }}>
            <UserPlus size={36} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Create Account</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>Join the Network File Server System</p>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--danger)', borderRadius: '6px', color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alice Smith"
              required
            />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alice@domain.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <div className="form-group">
            <label>System Role</label>
            <select
              className="form-input"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="user">User (Standard Access)</option>
              <option value="admin">Admin (Full Control)</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }} disabled={submitting}>
            {submitting ? 'Registering...' : 'Register Account'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <span style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }} onClick={onSwitchToLogin}>
            Sign In Here
          </span>
        </div>
      </div>
    </div>
  );
};

export default Register;
