import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api';

// ── Eye icons ─────────────────────────────────────────────────────────────────
const EyeOpen = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOff = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const data = await login(username, password);
      localStorage.setItem('token', data.token);
      const user = { username, role: data.role };
      onLogin(user);
      if (data.role === 'issuer')         navigate('/organization');
      else if (data.role === 'recipient') navigate('/recipient');
      else if (data.role === 'admin')     navigate('/admin');
      else navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">CertChain</div>
        <p className="auth-tagline">
          Tamper-proof certificate issuance and verification powered by Hyperledger Fabric blockchain.
        </p>
        <div className="auth-features">
          {[
            'Immutable certificate records on blockchain',
            'IPFS-backed distributed PDF storage',
            'QR code-based instant verification',
            'SHA-256 hash & Merkle root integrity',
          ].map(f => (
            <div className="auth-feature" key={f}>
              <div className="auth-feature-dot" />
              {f}
            </div>
          ))}
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-box">
          <h2>Sign in</h2>
          <p className="auth-desc">Access your CertChain portal</p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="field">
              <label>Username</label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="your_username"
                required autoFocus
              />
            </div>

            <div className="field">
              <label>Password</label>
              <div className="pw-wrap">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() => setShowPass(s => !s)}
                  tabIndex={-1}
                  title={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff /> : <EyeOpen />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              style={{ marginTop: 8 }}
              disabled={loading}
            >
              {loading ? <><span className="spinner" /> Signing in...</> : 'Sign In'}
            </button>
          </form>

          <p className="auth-link">
            Don't have an account? <Link to="/register">Register</Link>
          </p>
          <p className="auth-link" style={{ marginTop: 8 }}>
            Want to verify a certificate? <Link to="/verify">Public Verifier →</Link>
          </p>
          <p className="auth-link" style={{ marginTop: 8 }}>
            <Link to="/">← Back to Home</Link>
          </p>
        </div>
      </div>

      <style>{`
        .pw-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .pw-wrap input {
          width: 100%;
          padding-right: 44px;
        }
        .pw-toggle {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          color: rgba(244,241,235,0.35);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          transition: color 0.15s;
          line-height: 1;
        }
        .pw-toggle:hover { color: var(--gold, #c9a84c); }
      `}</style>
    </div>
  );
}