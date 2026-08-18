import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User } from 'lucide-react';

export default function Login() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(name, password);
      if (result.success) {
        navigate('/');
      } else {
        setError(result.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-color)', padding: '2rem' }}>
      <div className="w-full max-w-md animate-fade-in" style={{ background: 'var(--card-bg)', padding: '3rem 2.5rem', borderRadius: '24px', boxShadow: 'var(--shadow-lg)' }}>
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div style={{ background: '#EAF0EC', color: 'var(--primary-color)', padding: '1rem', borderRadius: '50%' }}>
                <Lock size={28} />
              </div>
            </div>
            <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Welcome Back</h2>
            <p className="text-secondary">Sign in to securely access your account</p>
          </div>

          {error && (
            <div style={{ padding: '0.75rem', backgroundColor: '#FEE2E2', color: 'var(--danger-color)', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label className="input-label">Name</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  required
                  className="input-field w-full"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div className="input-group mb-6">
              <label className="input-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                <input
                  type="password"
                  required
                  className="input-field w-full"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary w-full" 
              style={{ padding: '0.875rem', fontSize: '1rem', borderRadius: '12px' }}
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>
            
            <p className="text-center mt-6 text-secondary" style={{ fontSize: '0.875rem' }}>
              Don't have an account? <span style={{ color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 500 }}>Contact Support</span>
            </p>
          </form>
        </div>
    </div>
  );
}
