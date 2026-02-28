import { useState, useEffect, useRef } from 'react';
import { Routes, Route } from 'react-router-dom';
import Shell from './Shell';
import PDFViewerModal from './PDFViewerModal';
import {
  issueCertificate, revokeCertificate, getIssuedCertificates,
  uploadLogo, uploadSignature, downloadCertificate,
  getProfile, updateOrgName, lookupRecipientByIdProof
} from '../api';

const ORG_NAV = [
  { to: '/organization',          label: 'Overview',              icon: 'dashboard', end: true },
  { to: '/organization/issue',    label: 'Issue Certificate',     icon: 'issue' },
  { to: '/organization/issued',   label: 'Issued Certificates',   icon: 'list' },
  { to: '/organization/settings', label: 'Organization Settings', icon: 'settings' },
];

const CERT_TYPES = ['ACADEMIC', 'CORPORATE', 'GOVERNMENT', 'LEGAL'];

// ── Type abbreviation map ─────────────────────────────────────────────────────
const TYPE_ABBREV = {
  ACADEMIC:   'ACAD',
  CORPORATE:  'CORP',
  GOVERNMENT: 'GOVT',
  LEGAL:      'LEGL',
};

// ── Structured ID generator ───────────────────────────────────────────────────
// Format: {PREFIX}-{TYPE_ABBREV}-{YEAR}-{SEQUENCE}
// Example: IITM-CS-ACAD-2025-000042
//
// Sequence is persisted in localStorage keyed by "prefix::type" so each
// prefix+type combination has its own independent counter that increments
// across page refreshes and sessions.
const genId = (prefix, certType) => {
  const cleanPrefix = prefix.trim().toUpperCase();
  const abbrev      = TYPE_ABBREV[certType] || certType.slice(0, 4).toUpperCase();
  const year        = new Date().getFullYear();

  // Read & increment sequence from localStorage
  const seqKey = `certchain_seq::${cleanPrefix}::${abbrev}`;
  const current = parseInt(localStorage.getItem(seqKey) || '0', 10);
  const next    = current + 1;
  localStorage.setItem(seqKey, String(next));

  // Zero-pad to 6 digits
  const seq = String(next).padStart(6, '0');

  return `${cleanPrefix}-${abbrev}-${year}-${seq}`;
};

// ── Date formatter — "2025-01-15" → "15 January 2025" ────────────────────────
const formatDateOfIssue = (isoDate) => {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
};

// ── Shared hook: load org's display name from backend ─────────────────────────
function useOrgName() {
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfile()
      .then(p => setOrgName(p.organizationName || p.username))
      .catch(() => setOrgName(''))
      .finally(() => setLoading(false));
  }, []);

  return { orgName, setOrgName, loading };
}

// ── Overview ──────────────────────────────────────────────────────────────────
function Overview({ currentUser }) {
  const { orgName, loading: profileLoading } = useOrgName();
  const [certs, setCerts]               = useState([]);
  const [certsLoading, setCertsLoading] = useState(false);
  const [viewCert, setViewCert]         = useState(null);

  useEffect(() => {
    if (profileLoading || !orgName) return;
    setCertsLoading(true);
    getIssuedCertificates(orgName)
      .then(setCerts)
      .catch(() => setCerts([]))
      .finally(() => setCertsLoading(false));
  }, [orgName, profileLoading]);

  const loading = profileLoading || certsLoading;
  const active  = certs.filter(c => c.status === 'ACTIVE').length;
  const revoked = certs.filter(c => c.status === 'REVOKED').length;

  return (
    <>
      <div className="page-header">
        <div className="page-title">Welcome, {currentUser.username}</div>
        <div className="page-sub">
          {orgName && !profileLoading
            ? <>Issuing as <strong style={{ color: 'var(--gold)' }}>{orgName}</strong></>
            : 'Organization dashboard — manage your certificates'}
        </div>
      </div>
      <div className="page-body">
        <div className="stats-row">
          {[
            { label: 'Total Issued', value: certs.length, hint: 'All time' },
            { label: 'Active',       value: active,       hint: 'Valid on blockchain' },
            { label: 'Revoked',      value: revoked,      hint: 'Invalidated' },
          ].map(s => (
            <div className="stat-card" key={s.label}>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{loading ? '—' : s.value}</div>
              <div className="stat-hint">{s.hint}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-title">Recent Activity</div>
          {loading ? (
            <p className="text-muted">Loading...</p>
          ) : certs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📜</div>
              <p>No certificates issued yet</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th>Cert ID</th><th>Recipient Name</th><th>ID Proof</th><th>Type</th><th>Status</th><th>PDF</th>
                </tr></thead>
                <tbody>
                  {certs.slice(0, 5).map(c => (
                    <tr key={c.certId}>
                      <td className="mono">{c.certId}</td>
                      <td>{c.metadata?.recipientName || '—'}</td>
                      <td className="mono">{c.recipientId}</td>
                      <td>{c.certType}</td>
                      <td>
                        <span className={`badge badge-${c.status === 'ACTIVE' ? 'active' : 'revoked'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td>
                        {c.ipfsCid && (
                          <button className="btn btn-ghost btn-sm" onClick={() => setViewCert(c)}>
                            👁 View
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {viewCert && <PDFViewerModal cert={viewCert} onClose={() => setViewCert(null)} />}
    </>
  );
}

// ── Issue Certificate ─────────────────────────────────────────────────────────
function IssueCert() {
  const { orgName, loading: profileLoading } = useOrgName();

  const emptyForm = {
    idPrefix:        '',
    certType:        'ACADEMIC',
    recipientId:     '',
    recipientName:   '',
    recipientDob:    '',
    recipientGender: '',
    degree:          '',
    department:      '',
    dateOfIssue:     '',
    grade:           '',
    duration:        '',
    customKey1: '', customVal1: '',
    customKey2: '', customVal2: '',
  };

  const [form, setForm]     = useState(emptyForm);
  const [certId, setCertId] = useState('');
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState('');

  const [lookupStatus, setLookupStatus] = useState('idle');
  const lookupTimer = useRef(null);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const refreshId = () => {
    if (form.idPrefix.trim()) setCertId(genId(form.idPrefix, form.certType));
  };

  // Regenerate ID whenever prefix or cert type changes
  useEffect(() => {
    if (form.idPrefix.trim()) setCertId(genId(form.idPrefix, form.certType));
    else setCertId('');
  }, [form.idPrefix, form.certType]);

  const handleIdProofChange = (e) => {
    const val = e.target.value;
    setForm(f => ({ ...f, recipientId: val }));
    setLookupStatus('idle');

    if (lookupTimer.current) clearTimeout(lookupTimer.current);
    if (val.trim().length < 4) return;

    lookupTimer.current = setTimeout(async () => {
      setLookupStatus('loading');
      try {
        const data = await lookupRecipientByIdProof(val.trim());
        setForm(f => ({
          ...f,
          recipientName:   f.recipientName   || data.fullName    || '',
          recipientDob:    f.recipientDob     || data.dateOfBirth || '',
          recipientGender: f.recipientGender  || data.gender      || '',
        }));
        setLookupStatus('found');
      } catch {
        setLookupStatus('notfound');
      }
    }, 600);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!certId)              { setError('Generate a Certificate ID first (enter a prefix)'); return; }
    if (!orgName)             { setError('Organization name not loaded yet, please wait');     return; }
    if (!form.recipientId.trim())   { setError('Recipient ID proof number is required'); return; }
    if (!form.recipientName.trim()) { setError('Recipient name is required');            return; }

    setError(''); setLoading(true); setResult(null);
    try {
      const metadata = {};
      if (form.degree)      metadata.degree      = form.degree;
      if (form.department)  metadata.department  = form.department;
      if (form.dateOfIssue) metadata.dateOfIssue = formatDateOfIssue(form.dateOfIssue);
      if (form.grade)       metadata.grade       = form.grade;
      if (form.duration)    metadata.duration    = form.duration;
      if (form.customKey1 && form.customVal1) metadata[form.customKey1] = form.customVal1;
      if (form.customKey2 && form.customVal2) metadata[form.customKey2] = form.customVal2;

      const data = await issueCertificate({
        certId,
        certType:        form.certType,
        recipientId:     form.recipientId.trim(),
        recipientName:   form.recipientName.trim(),
        recipientDob:    form.recipientDob,
        recipientGender: form.recipientGender,
        metadata
      });

      setResult(data);
      // Reset fields but keep prefix & type so the next genId fires correctly
      // via useEffect only when the user actually changes prefix/type — not on mount.
      setForm(f => ({ ...emptyForm, idPrefix: f.idPrefix, certType: f.certType }));
      setCertId('');  // clear display; user hits ↻ or changes prefix/type to get next ID
      setLookupStatus('idle');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-title">Issue Certificate</div>
        <div className="page-sub">
          {profileLoading
            ? 'Loading organization profile...'
            : <>Issuing as <strong style={{ color: 'var(--gold)' }}>{orgName}</strong></>}
        </div>
      </div>
      <div className="page-body">
        {error  && <div className="alert alert-error">{error}</div>}
        {result && (
          <div className="alert alert-success">
            ✓ Certificate recorded on blockchain &nbsp;|&nbsp;
            IPFS: <span className="mono">{result.ipfsCid}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="card">
            <div className="card-title">Certificate Identity</div>
            <div className="form-grid">
              <div className="field">
                <label>ID Prefix</label>
                <input value={form.idPrefix} onChange={set('idPrefix')} placeholder="e.g. IITM-CS or RMKEC-ECE" required />
              </div>
              <div className="field">
                <label>Auto-generated Certificate ID</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={certId} readOnly placeholder="Enter prefix to generate" style={{ flex: 1, fontFamily: 'DM Mono, monospace', fontSize: 13 }} />
                  <button type="button" className="btn btn-ghost" onClick={refreshId} title="Generate next sequence number">↻</button>
                </div>
                <span style={{ fontSize: 11, color: 'var(--white-dim)', marginTop: 4 }}>
                  Format: PREFIX–TYPE–YEAR–SEQUENCE &nbsp;·&nbsp; Sequence increments per prefix + type combination
                </span>
              </div>
              <div className="field">
                <label>Certificate Type</label>
                <select value={form.certType} onChange={set('certType')}>
                  {CERT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Issuer Organization</label>
                <input value={profileLoading ? 'Loading...' : orgName} readOnly style={{ opacity: 0.65, cursor: 'not-allowed' }} title="Change this in Organization Settings" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Recipient Details</div>
            <p className="text-muted" style={{ marginBottom: 16 }}>
              Enter the recipient's government ID number and their personal details.
              If the recipient is already registered on the platform, their details will be pre-filled automatically.
              You may edit them if needed — what you enter here will appear on the certificate.
            </p>
            <div className="form-grid">
              <div className="field span-2">
                <label>Government ID Proof Number *</label>
                <input value={form.recipientId} onChange={handleIdProofChange} placeholder="Aadhaar / PAN / Passport / Voter ID number" required />
                {lookupStatus === 'loading' && (
                  <span style={{ fontSize: 11, color: 'var(--white-dim)', marginTop: 5, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="spinner" style={{ width: 10, height: 10 }} /> Looking up recipient...
                  </span>
                )}
                {lookupStatus === 'found' && (
                  <span style={{ fontSize: 11, color: 'var(--green)', marginTop: 5 }}>
                    ✓ Registered recipient found — details pre-filled below. You may edit them.
                  </span>
                )}
                {lookupStatus === 'notfound' && (
                  <span style={{ fontSize: 11, color: 'var(--gold)', marginTop: 5 }}>
                    ⚠ No registered account for this ID. Fill in the recipient details manually below.
                    The certificate will be linked to this ID — recipient can view it after registering.
                  </span>
                )}
              </div>
              <div className="field span-2">
                <label>Recipient Full Name *</label>
                <input value={form.recipientName} onChange={set('recipientName')} placeholder="Full name as it should appear on the certificate" required />
              </div>
              <div className="field">
                <label>Date of Birth</label>
                <input type="date" value={form.recipientDob} onChange={set('recipientDob')} />
              </div>
              <div className="field">
                <label>Gender</label>
                <select value={form.recipientGender} onChange={set('recipientGender')}>
                  <option value="">Select (optional)</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Certificate Details</div>
            <div className="form-grid">
              <div className="field">
                <label>Degree / Course / Award</label>
                <input value={form.degree} onChange={set('degree')} placeholder="e.g. B.Tech Computer Science" />
              </div>
              <div className="field">
                <label>Department / Division</label>
                <input value={form.department} onChange={set('department')} placeholder="e.g. Dept. of Engineering" />
              </div>
              <div className="field">
                <label>Date of Issue</label>
                <input
                  type="date"
                  value={form.dateOfIssue}
                  onChange={set('dateOfIssue')}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="field">
                <label>Grade / Score / Result</label>
                <input value={form.grade} onChange={set('grade')} placeholder="e.g. First Class, 9.2 CGPA" />
              </div>
              <div className="field span-2">
                <label>Duration / Period</label>
                <input value={form.duration} onChange={set('duration')} placeholder="e.g. 4 Years, Jan 2020 – Dec 2024" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Additional Custom Fields <span className="text-muted">(optional)</span></div>
            <div className="form-grid">
              <div className="field">
                <label>Field Name 1</label>
                <input value={form.customKey1} onChange={set('customKey1')} placeholder="e.g. Specialization" />
              </div>
              <div className="field">
                <label>Field Value 1</label>
                <input value={form.customVal1} onChange={set('customVal1')} placeholder="e.g. Machine Learning" />
              </div>
              <div className="field">
                <label>Field Name 2</label>
                <input value={form.customKey2} onChange={set('customKey2')} placeholder="e.g. Registrar" />
              </div>
              <div className="field">
                <label>Field Value 2</label>
                <input value={form.customVal2} onChange={set('customVal2')} placeholder="e.g. Prof. K. Murthy" />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading || profileLoading}>
              {loading ? <><span className="spinner" /> Issuing to blockchain...</> : '⛓ Issue Certificate'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ── Issued Certificates ───────────────────────────────────────────────────────
function IssuedCerts() {
  const { orgName, loading: profileLoading } = useOrgName();
  const [certs, setCerts]               = useState([]);
  const [certsLoading, setCertsLoading] = useState(false);
  const [revokeTarget, setRevoke]       = useState(null);
  const [revokeReason, setReason]       = useState('');
  const [revoking, setRevoking]         = useState(false);
  const [msg, setMsg]                   = useState('');
  const [err, setErr]                   = useState('');
  const [dlLoading, setDlLoad]          = useState({});
  const [viewCert, setViewCert]         = useState(null);

  const load = (name) => {
    if (!name) return;
    setCertsLoading(true);
    getIssuedCertificates(name)
      .then(setCerts)
      .catch(() => setCerts([]))
      .finally(() => setCertsLoading(false));
  };

  useEffect(() => {
    if (!profileLoading && orgName) load(orgName);
  }, [orgName, profileLoading]);

  const loading = profileLoading || certsLoading;

  const handleRevoke = async () => {
    setRevoking(true); setErr('');
    try {
      await revokeCertificate(revokeTarget.certId, revokeReason);
      setMsg(`Certificate ${revokeTarget.certId} has been revoked.`);
      setRevoke(null); setReason('');
      load(orgName);
    } catch (e) { setErr(e.message); }
    finally { setRevoking(false); }
  };

  const handleDownload = async (cert) => {
    if (!cert.ipfsCid) return;
    setDlLoad(p => ({ ...p, [cert.certId]: true }));
    try {
      const blob = await downloadCertificate(cert.ipfsCid);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `${cert.certId}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setErr('Download failed: ' + e.message); }
    finally { setDlLoad(p => ({ ...p, [cert.certId]: false })); }
  };

  return (
    <>
      <div className="page-header">
        <div className="flex-between">
          <div>
            <div className="page-title">Issued Certificates</div>
            <div className="page-sub">All certificates issued by your organization</div>
          </div>
          <button className="btn btn-ghost" onClick={() => load(orgName)}>↻ Refresh</button>
        </div>
      </div>
      <div className="page-body">
        {msg && <div className="alert alert-success">{msg}</div>}
        {err && <div className="alert alert-error">{err}</div>}

        <div className="card">
          {loading ? (
            <p className="text-muted">Loading...</p>
          ) : certs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <p>No certificates issued yet</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th>Cert ID</th>
                  <th>Recipient Name</th>
                  <th>ID Proof</th>
                  <th>Type</th>
                  <th>IPFS</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr></thead>
                <tbody>
                  {certs.map(c => (
                    <tr key={c.certId}>
                      <td className="mono">{c.certId}</td>
                      <td>{c.metadata?.recipientName || '—'}</td>
                      <td className="mono">{c.recipientId}</td>
                      <td>{c.certType}</td>
                      <td className="mono">{c.ipfsCid ? c.ipfsCid.slice(0, 14) + '…' : '—'}</td>
                      <td>
                        <span className={`badge badge-${c.status === 'ACTIVE' ? 'active' : 'revoked'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {c.ipfsCid && (
                            <>
                              <button className="btn btn-ghost btn-sm" onClick={() => setViewCert(c)}>
                                👁 View
                              </button>
                              <button className="btn btn-ghost btn-sm" onClick={() => handleDownload(c)} disabled={dlLoading[c.certId]}>
                                {dlLoading[c.certId] ? <span className="spinner" /> : '↓'}
                              </button>
                            </>
                          )}
                          {c.status === 'ACTIVE' && (
                            <button className="btn btn-danger btn-sm" onClick={() => { setRevoke(c); setMsg(''); setErr(''); }}>
                              Revoke
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {viewCert && <PDFViewerModal cert={viewCert} onClose={() => setViewCert(null)} />}

      {revokeTarget && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Revoke Certificate</h3>
            <p>
              Revoking <strong style={{ color: 'var(--white)' }}>{revokeTarget.certId}</strong> issued to{' '}
              <strong style={{ color: 'var(--white)' }}>
                {revokeTarget.metadata?.recipientName || revokeTarget.recipientId}
              </strong>.
              This cannot be undone.
            </p>
            <div className="field" style={{ marginTop: 12 }}>
              <label>Reason for Revocation</label>
              <textarea value={revokeReason} onChange={e => setReason(e.target.value)} placeholder="Optional reason..." rows={3} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setRevoke(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleRevoke} disabled={revoking}>
                {revoking ? <><span className="spinner" /> Revoking...</> : 'Confirm Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Settings ──────────────────────────────────────────────────────────────────
function OrgSettings() {
  const [orgName, setOrgName]           = useState('');
  const [orgNameMsg, setOrgMsg]         = useState('');
  const [orgNameErr, setOrgErr]         = useState('');
  const [orgNameLoad, setOrgLoad]       = useState(false);
  const [profileReady, setProfileReady] = useState(false);

  const [logoFile, setLogoFile]         = useState(null);
  const [logoMsg, setLogoMsg]           = useState('');
  const [logoErr, setLogoErr]           = useState('');
  const [logoLoad, setLogoLoad]         = useState(false);

  const [sigFile, setSigFile]           = useState(null);
  const [sigMsg, setSigMsg]             = useState('');
  const [sigErr, setSigErr]             = useState('');
  const [sigLoad, setSigLoad]           = useState(false);

  const logoRef = useRef();
  const sigRef  = useRef();

  useEffect(() => {
    getProfile()
      .then(p => { setOrgName(p.organizationName || ''); setProfileReady(true); })
      .catch(() => setProfileReady(true));
  }, []);

  const handleOrgName = async () => {
    if (!orgName.trim()) return;
    setOrgLoad(true); setOrgErr(''); setOrgMsg('');
    try {
      await updateOrgName(orgName.trim());
      setOrgMsg('Organization name updated. All future certificates will use this name.');
    } catch (e) { setOrgErr(e.message); }
    finally { setOrgLoad(false); }
  };

  const handleLogo = async () => {
    if (!logoFile) return;
    setLogoLoad(true); setLogoErr(''); setLogoMsg('');
    try {
      await uploadLogo(logoFile);
      setLogoMsg('Logo uploaded. It will appear on all future certificates.');
      setLogoFile(null);
      if (logoRef.current) logoRef.current.value = '';
    } catch (e) { setLogoErr(e.message); }
    finally { setLogoLoad(false); }
  };

  const handleSig = async () => {
    if (!sigFile) return;
    setSigLoad(true); setSigErr(''); setSigMsg('');
    try {
      await uploadSignature(sigFile);
      setSigMsg('Signature uploaded. It will appear on all future certificates.');
      setSigFile(null);
      if (sigRef.current) sigRef.current.value = '';
    } catch (e) { setSigErr(e.message); }
    finally { setSigLoad(false); }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-title">Organization Settings</div>
        <div className="page-sub">Manage your display name, logo, and signature</div>
      </div>
      <div className="page-body">
        <div className="card">
          <div className="card-title">Organization Display Name</div>
          <p className="text-muted" style={{ marginBottom: 16 }}>
            This name is stamped on every certificate you issue. Changing it only affects future certificates.
          </p>
          {orgNameErr && <div className="alert alert-error">{orgNameErr}</div>}
          {orgNameMsg && <div className="asset-uploaded">✓ {orgNameMsg}</div>}
          <div className="field">
            <label>Display Name</label>
            <input value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="e.g. IIT Madras — Dept. of Computer Science" disabled={!profileReady} />
          </div>
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleOrgName} disabled={!orgName.trim() || orgNameLoad || !profileReady}>
              {orgNameLoad ? <><span className="spinner" /> Saving...</> : 'Save Name'}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Organization Logo</div>
          <p className="text-muted" style={{ marginBottom: 16 }}>
            One logo per organization. Uploading replaces the existing one. Appears top-left on certificates.
          </p>
          {logoErr && <div className="alert alert-error">{logoErr}</div>}
          {logoMsg && <div className="asset-uploaded">✓ {logoMsg}</div>}
          <div className="file-drop" onClick={() => logoRef.current.click()}>
            <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setLogoFile(e.target.files[0])} />
            <div className="file-drop-icon">🖼</div>
            <div className="file-drop-text">{logoFile ? logoFile.name : 'Click to select logo image'}</div>
            <div className="file-drop-hint">PNG, JPG — transparent background recommended</div>
          </div>
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleLogo} disabled={!logoFile || logoLoad}>
              {logoLoad ? <><span className="spinner" /> Uploading...</> : 'Upload Logo'}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Authorised Signature</div>
          <p className="text-muted" style={{ marginBottom: 16 }}>
            One signature per organization. Uploading replaces the existing one. Appears bottom-right on certificates.
          </p>
          {sigErr && <div className="alert alert-error">{sigErr}</div>}
          {sigMsg && <div className="asset-uploaded">✓ {sigMsg}</div>}
          <div className="file-drop" onClick={() => sigRef.current.click()}>
            <input ref={sigRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setSigFile(e.target.files[0])} />
            <div className="file-drop-icon">✍</div>
            <div className="file-drop-text">{sigFile ? sigFile.name : 'Click to select signature image'}</div>
            <div className="file-drop-hint">PNG with transparent background works best</div>
          </div>
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleSig} disabled={!sigFile || sigLoad}>
              {sigLoad ? <><span className="spinner" /> Uploading...</> : 'Upload Signature'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function OrganizationDashboard({ currentUser, onLogout }) {
  return (
    <Shell currentUser={currentUser} onLogout={onLogout} navItems={ORG_NAV}>
      <Routes>
        <Route path="/"         element={<Overview currentUser={currentUser} />} />
        <Route path="/issue"    element={<IssueCert />} />
        <Route path="/issued"   element={<IssuedCerts />} />
        <Route path="/settings" element={<OrgSettings />} />
      </Routes>
    </Shell>
  );
}