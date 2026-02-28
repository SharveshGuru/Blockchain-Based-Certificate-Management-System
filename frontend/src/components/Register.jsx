import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api';

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

// ── Password rules ────────────────────────────────────────────────────────────
const RULES = [
  { key: 'len',     label: 'At least 8 characters',      test: p => p.length >= 8 },
  { key: 'upper',   label: 'One uppercase letter (A–Z)',  test: p => /[A-Z]/.test(p) },
  { key: 'lower',   label: 'One lowercase letter (a–z)',  test: p => /[a-z]/.test(p) },
  { key: 'number',  label: 'One number (0–9)',             test: p => /[0-9]/.test(p) },
  { key: 'special', label: 'One special character (!@#…)', test: p => /[^A-Za-z0-9]/.test(p) },
];

const validatePassword = (p) => RULES.every(r => r.test(p));

// ── Password strength meter ───────────────────────────────────────────────────
function PasswordStrength({ password }) {
  if (!password) return null;
  const passed = RULES.filter(r => r.test(password)).length;
  const pct    = (passed / RULES.length) * 100;
  const color  = passed <= 2 ? '#e05c5c' : passed <= 3 ? '#c9a84c' : passed === 4 ? '#5c9fe0' : '#2dd4a0';
  const label  = passed <= 2 ? 'Weak' : passed <= 3 ? 'Fair' : passed === 4 ? 'Good' : 'Strong';

  return (
    <div className="pw-strength">
      <div className="pw-strength-bar-wrap">
        <div className="pw-strength-bar" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="pw-strength-label" style={{ color }}>{label}</span>
    </div>
  );
}

// ── Rule checklist ────────────────────────────────────────────────────────────
function RuleList({ password, touched }) {
  if (!touched) return null;
  return (
    <ul className="pw-rules">
      {RULES.map(r => {
        const ok = r.test(password);
        return (
          <li key={r.key} className={`pw-rule ${ok ? 'pw-rule-ok' : 'pw-rule-fail'}`}>
            <span className="pw-rule-icon">{ok ? '✓' : '✗'}</span>
            {r.label}
          </li>
        );
      })}
    </ul>
  );
}

export default function Register() {
  const [form, setForm] = useState({
    username:      '',
    password:      '',
    confirm:       '',
    role:          'issuer',
    orgName:       '',
    idProofNumber: '',
    fullName:      '',
    dateOfBirth:   '',
    gender:        '',
    phone:         '',
    address:       '',
  });

  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passTouched, setPassTouched] = useState(false);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState('');
  const [loading,     setLoading]     = useState(false);
  const navigate = useNavigate();

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validatePassword(form.password)) {
      setPassTouched(true);
      setError('Password does not meet all requirements below.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (form.role === 'issuer' && !form.orgName.trim()) {
      setError('Organization display name is required.');
      return;
    }
    if (form.role === 'recipient') {
      if (!form.idProofNumber.trim()) { setError('Government ID proof number is required.'); return; }
      if (!form.fullName.trim())      { setError('Full name is required.'); return; }
    }

    setLoading(true);
    try {
      const payload = { username: form.username, password: form.password, role: form.role };
      if (form.role === 'issuer') {
        payload.organizationName = form.orgName.trim();
      } else {
        payload.idProofNumber = form.idProofNumber.trim();
        payload.fullName      = form.fullName.trim();
        payload.dateOfBirth   = form.dateOfBirth;
        payload.gender        = form.gender;
        payload.phone         = form.phone;
        payload.address       = form.address;
      }
      await register(payload);
      setSuccess('Account created! Redirecting to login…');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isIssuer    = form.role === 'issuer';
  const isRecipient = form.role === 'recipient';
  const passMatch   = form.confirm && form.password === form.confirm;
  const passMismatch = form.confirm && form.password !== form.confirm;

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">CertChain</div>
        <p className="auth-tagline">
          Join the blockchain-powered certificate management platform trusted by organizations and recipients.
        </p>
        <div className="auth-features">
          {[
            'Organizations: Issue tamper-proof certificates',
            'Upload your logo and signature once',
            'Recipients: Access your digital certificate locker',
            'Certificates linked to your government ID — no account needed at issuance',
          ].map(f => (
            <div className="auth-feature" key={f}>
              <div className="auth-feature-dot" />
              {f}
            </div>
          ))}
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-box" style={{ maxWidth: 440 }}>
          <h2>Create account</h2>
          <p className="auth-desc">Register as an organization or recipient</p>

          {error   && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Username */}
            <div className="field">
              <label>Username</label>
              <input value={form.username} onChange={set('username')} placeholder="your_username" required autoFocus />
            </div>

            {/* Role */}
            <div className="field">
              <label>Role</label>
              <select value={form.role} onChange={set('role')}>
                <option value="issuer">Organization (Issuer)</option>
                <option value="recipient">Recipient</option>
              </select>
            </div>

            {/* ── ISSUER FIELDS ── */}
            {isIssuer && (
              <div className="field">
                <label>Organization Display Name</label>
                <input value={form.orgName} onChange={set('orgName')} placeholder="e.g. IIT Madras, RMKEC, Tata Consultancy Services" required />
                <span style={{ fontSize: 11, color: 'var(--white-dim)', marginTop: 4 }}>
                  This name is permanently stamped on every certificate you issue.
                </span>
              </div>
            )}

            {/* ── RECIPIENT FIELDS ── */}
            {isRecipient && (
              <>
                <div style={{
                  padding: '12px 14px',
                  background: 'var(--gold-dim)',
                  border: '1px solid var(--gold-border)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: 'var(--gold)',
                  lineHeight: 1.5
                }}>
                  ⚠ Your <strong>Government ID Proof Number</strong> is used to link certificates to you.
                  Organizations enter this number when issuing — certificates issued before your registration
                  will automatically appear in your locker when you sign up.
                </div>
                <div className="field">
                  <label>Government ID Proof Number *</label>
                  <input value={form.idProofNumber} onChange={set('idProofNumber')} placeholder="Aadhaar / PAN / Passport / Voter ID number" required />
                </div>
                <div className="field">
                  <label>Full Name *</label>
                  <input value={form.fullName} onChange={set('fullName')} placeholder="As it appears on your ID" required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="field">
                    <label>Date of Birth</label>
                    <input type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
                  </div>
                  <div className="field">
                    <label>Gender</label>
                    <select value={form.gender} onChange={set('gender')}>
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label>Phone Number</label>
                  <input value={form.phone} onChange={set('phone')} placeholder="+91 XXXXX XXXXX" type="tel" />
                </div>
                <div className="field">
                  <label>Address</label>
                  <input value={form.address} onChange={set('address')} placeholder="City, State, Country" />
                </div>
              </>
            )}

            {/* ── PASSWORD ── */}
            <div className="field">
              <label>Password</label>
              <div className="pw-wrap">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => { set('password')(e); setPassTouched(true); }}
                  placeholder="Create a strong password"
                  required
                />
                <button type="button" className="pw-toggle" onClick={() => setShowPass(s => !s)} tabIndex={-1} title={showPass ? 'Hide' : 'Show'}>
                  {showPass ? <EyeOff /> : <EyeOpen />}
                </button>
              </div>
              <PasswordStrength password={form.password} />
              <RuleList password={form.password} touched={passTouched} />
            </div>

            {/* ── CONFIRM PASSWORD ── */}
            <div className="field">
              <label>Confirm Password</label>
              <div className="pw-wrap">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={form.confirm}
                  onChange={set('confirm')}
                  placeholder="Repeat your password"
                  required
                  style={{
                    borderColor: passMatch
                      ? 'rgba(45,212,160,0.5)'
                      : passMismatch
                      ? 'rgba(224,92,92,0.5)'
                      : undefined
                  }}
                />
                <button type="button" className="pw-toggle" onClick={() => setShowConfirm(s => !s)} tabIndex={-1} title={showConfirm ? 'Hide' : 'Show'}>
                  {showConfirm ? <EyeOff /> : <EyeOpen />}
                </button>
              </div>
              {passMatch   && <span className="pw-match-ok">✓ Passwords match</span>}
              {passMismatch && <span className="pw-match-fail">✗ Passwords do not match</span>}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              style={{ marginTop: 4 }}
              disabled={loading}
            >
              {loading ? <><span className="spinner" /> Creating account…</> : 'Create Account'}
            </button>
          </form>

          <p className="auth-link">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>

      <style>{`
        /* ── Password input wrap ── */
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

        /* ── Strength bar ── */
        .pw-strength {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 7px;
        }
        .pw-strength-bar-wrap {
          flex: 1;
          height: 3px;
          background: rgba(255,255,255,0.08);
          border-radius: 2px;
          overflow: hidden;
        }
        .pw-strength-bar {
          height: 100%;
          border-radius: 2px;
          transition: width 0.3s ease, background 0.3s ease;
        }
        .pw-strength-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.5px;
          min-width: 40px;
          text-align: right;
        }

        /* ── Rule checklist ── */
        .pw-rules {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-top: 8px;
          padding: 10px 12px;
          background: rgba(0,0,0,0.2);
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .pw-rule {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 11.5px;
          line-height: 1.4;
        }
        .pw-rule-ok   { color: #2dd4a0; }
        .pw-rule-fail { color: rgba(244,241,235,0.35); }
        .pw-rule-icon {
          font-size: 11px;
          font-weight: 700;
          width: 13px;
          flex-shrink: 0;
        }

        /* ── Match feedback ── */
        .pw-match-ok   { font-size: 11px; color: #2dd4a0; margin-top: 5px; display: block; }
        .pw-match-fail { font-size: 11px; color: #e05c5c; margin-top: 5px; display: block; }
      `}</style>
    </div>
  );
}
