import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Shell from './Shell';
import PDFViewerModal from './PDFViewerModal';
import { getMyLocker, downloadCertificate, getProfile, updateProfile } from '../api';

const REC_NAV = [
  { to: '/recipient',          label: 'Overview',       icon: 'dashboard', end: true },
  { to: '/recipient/locker',   label: 'Digital Locker', icon: 'locker' },
  { to: '/recipient/profile',  label: 'My Profile',     icon: 'settings' },
];

// ── Overview ──────────────────────────────────────────────────────────────────
function Overview({ currentUser }) {
  const [certs, setCerts]     = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewCert, setViewCert] = useState(null);

  useEffect(() => {
    Promise.all([
      getMyLocker().catch(() => []),
      getProfile().catch(() => null)
    ]).then(([c, p]) => {
      setCerts(Array.isArray(c) ? c : []);
      setProfile(p);
    }).finally(() => setLoading(false));
  }, []);

  const active  = certs.filter(c => c.status === 'ACTIVE').length;
  const revoked = certs.filter(c => c.status === 'REVOKED').length;

  return (
    <>
      <div className="page-header">
        <div className="page-title">
          Welcome, {profile?.fullName || currentUser.username}
        </div>
        <div className="page-sub">
          {profile?.idProofNumber
            ? <>ID: <span style={{ color: 'var(--gold)', fontFamily: 'monospace', fontSize: 13 }}>{profile.idProofNumber}</span></>
            : 'Your certificate dashboard'}
        </div>
      </div>
      <div className="page-body">
        <div className="stats-row">
          {[
            { label: 'Total Certificates', value: certs.length, hint: 'Issued to you' },
            { label: 'Active',             value: active,       hint: 'Valid & verified' },
            { label: 'Revoked',            value: revoked,      hint: 'Invalidated' },
          ].map(s => (
            <div className="stat-card" key={s.label}>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{loading ? '—' : s.value}</div>
              <div className="stat-hint">{s.hint}</div>
            </div>
          ))}
        </div>

        {/* Profile summary card */}
        {profile && (
          <div className="card">
            <div className="card-title">Your Profile</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {[
                { label: 'Full Name',       val: profile.fullName },
                { label: 'ID Proof No.',    val: profile.idProofNumber },
                { label: 'Date of Birth',   val: profile.dateOfBirth },
                { label: 'Gender',          val: profile.gender },
                { label: 'Phone',           val: profile.phone },
                { label: 'Address',         val: profile.address },
              ].filter(r => r.val).map(row => (
                <div key={row.label} style={{ padding: '12px 14px', background: 'var(--navy-3)', borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: 'var(--white-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                    {row.label}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--white)' }}>{row.val}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-title">Recent Certificates</div>
          {loading ? <p className="text-muted">Loading...</p> : certs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎓</div>
              <p>No certificates yet</p>
              <p style={{ fontSize: 12, marginTop: 8 }}>
                Certificates issued to your ID proof number will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th>Cert ID</th><th>Issuer</th><th>Type</th><th>Status</th><th>PDF</th>
                </tr></thead>
                <tbody>
                  {certs.slice(0, 5).map(c => (
                    <tr key={c.certId}>
                      <td className="mono">{c.certId}</td>
                      <td>{c.issuerOrg}</td>
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

// ── Digital Locker ────────────────────────────────────────────────────────────
function Locker() {
  const [certs, setCerts]      = useState([]);
  const [loading, setLoading]  = useState(true);
  const [error, setError]      = useState('');
  const [dlLoading, setDlLoad] = useState({});
  const [filter, setFilter]    = useState('ALL');
  const [viewCert, setViewCert] = useState(null);

  useEffect(() => {
    getMyLocker()
      .then(data => setCerts(Array.isArray(data) ? data : []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'ALL' ? certs : certs.filter(c => c.status === filter);

  const handleDownload = async (cert) => {
    if (!cert.ipfsCid) return;
    setDlLoad(p => ({ ...p, [cert.certId]: true }));
    try {
      const blob = await downloadCertificate(cert.ipfsCid);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `${cert.certId}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError('Download failed: ' + e.message);
    } finally {
      setDlLoad(p => ({ ...p, [cert.certId]: false }));
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="flex-between">
          <div>
            <div className="page-title">Digital Locker</div>
            <div className="page-sub">All blockchain-verified certificates linked to your ID</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['ALL', 'ACTIVE', 'REVOKED'].map(f => (
              <button
                key={f}
                className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilter(f)}
              >{f}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="page-body">
        {error && <div className="alert alert-error">{error}</div>}
        {loading ? (
          <p className="text-muted">Loading your certificates...</p>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔒</div>
            <p>No certificates found</p>
            <p style={{ fontSize: 12, marginTop: 8 }}>
              Certificates issued to your government ID proof number will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="cert-grid">
            {filtered.map(cert => (
              <CertCard
                key={cert.certId}
                cert={cert}
                onDownload={handleDownload}
                onView={setViewCert}
                dlLoading={dlLoading}
              />
            ))}
          </div>
        )}
      </div>

      {viewCert && <PDFViewerModal cert={viewCert} onClose={() => setViewCert(null)} />}
    </>
  );
}

function CertCard({ cert, onDownload, onView, dlLoading }) {
  const [expanded, setExpanded] = useState(false);
  const meta    = cert.metadata || {};
  const entries = Object.entries(meta);

  return (
    <div className="cert-card">
      <div className="cert-card-header">
        <div>
          <div className="cert-card-type">{cert.certType}</div>
          <div style={{ fontSize: 11, color: 'var(--white-dim)', marginTop: 3 }}>
            Issued by {cert.issuerOrg}
          </div>
        </div>
        <span className={`badge badge-${cert.status === 'ACTIVE' ? 'active' : 'revoked'}`}>
          {cert.status}
        </span>
      </div>

      <div className="cert-card-body">
        <div className="cert-row">
          <span className="cert-row-label">Cert ID</span>
          <span className="cert-row-val mono" style={{ fontSize: 11 }}>{cert.certId}</span>
        </div>
        <div className="cert-row">
          <span className="cert-row-label">Your ID</span>
          <span className="cert-row-val mono">{cert.recipientId}</span>
        </div>

        {entries.slice(0, expanded ? undefined : 3).map(([k, v]) => (
          <div className="cert-row" key={k}>
            <span className="cert-row-label">{k}</span>
            <span className="cert-row-val">{v}</span>
          </div>
        ))}

        {entries.length > 3 && (
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}
            onClick={() => setExpanded(e => !e)}
          >
            {expanded ? '▲ Show less' : `▼ Show ${entries.length - 3} more fields`}
          </button>
        )}

        {expanded && (
          <>
            <div className="divider" />
            <div className="cert-row">
              <span className="cert-row-label">Hash</span>
              <span className="cert-row-val mono" style={{ fontSize: 10 }}>
                {cert.certHash ? cert.certHash.slice(0, 32) + '…' : '—'}
              </span>
            </div>
            {cert.ipfsCid && (
              <div className="cert-row">
                <span className="cert-row-label">IPFS CID</span>
                <span className="cert-row-val mono" style={{ fontSize: 10 }}>{cert.ipfsCid.slice(0, 24)}…</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="cert-card-footer">
        {cert.ipfsCid ? (
          <>
            {/* View PDF button */}
            <button
              className="btn btn-ghost btn-sm"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => onView(cert)}
            >
              👁 View PDF
            </button>
            {/* Download button */}
            <button
              className="btn btn-success btn-sm"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => onDownload(cert)}
              disabled={dlLoading[cert.certId]}
            >
              {dlLoading[cert.certId]
                ? <><span className="spinner" /> Downloading…</>
                : '↓ Download'}
            </button>
          </>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--white-dim)' }}>No PDF available</span>
        )}
        {cert.status === 'REVOKED' && (
          <span className="badge badge-revoked">Revoked — not valid</span>
        )}
      </div>
    </div>
  );
}

// ── My Profile ────────────────────────────────────────────────────────────────
function MyProfile() {
  const [profile, setProfile]   = useState(null);
  const [form, setForm]         = useState({
    fullName: '', dateOfBirth: '', gender: '', phone: '', address: ''
  });
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState('');
  const [err, setErr]           = useState('');

  useEffect(() => {
    getProfile()
      .then(p => {
        setProfile(p);
        setForm({
          fullName:    p.fullName    || '',
          dateOfBirth: p.dateOfBirth || '',
          gender:      p.gender      || '',
          phone:       p.phone       || '',
          address:     p.address     || '',
        });
      })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg(''); setErr('');
    try {
      await updateProfile(form);
      setMsg('Profile updated successfully.');
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <>
      <div className="page-header"><div className="page-title">My Profile</div></div>
      <div className="page-body"><p className="text-muted">Loading...</p></div>
    </>
  );

  return (
    <>
      <div className="page-header">
        <div className="page-title">My Profile</div>
        <div className="page-sub">Your personal information and government ID details</div>
      </div>
      <div className="page-body">
        {err && <div className="alert alert-error">{err}</div>}
        {msg && <div className="alert alert-success">{msg}</div>}

        <div className="card">
          <div className="card-title">Identity Information</div>
          <p className="text-muted" style={{ marginBottom: 16 }}>
            These fields were set at registration and cannot be changed.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="field">
              <label>Username</label>
              <input value={profile?.username || ''} readOnly style={{ opacity: 0.65, cursor: 'not-allowed' }} />
            </div>
            <div className="field">
              <label>Government ID Proof Number</label>
              <input value={profile?.idProofNumber || ''} readOnly style={{ opacity: 0.65, cursor: 'not-allowed' }} />
            </div>
          </div>
          <p className="text-muted" style={{ marginTop: 10, fontSize: 11 }}>
            Your ID proof number is permanently linked to your certificates on the blockchain.
            Organizations use this number to issue certificates to you.
          </p>
        </div>

        <div className="card">
          <div className="card-title">Personal Details</div>
          <form onSubmit={handleSave}>
            <div className="form-grid">
              <div className="field span-2">
                <label>Full Name</label>
                <input value={form.fullName} onChange={set('fullName')} placeholder="Your full name" required />
              </div>
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
              <div className="field">
                <label>Phone Number</label>
                <input type="tel" value={form.phone} onChange={set('phone')} placeholder="+91 XXXXX XXXXX" />
              </div>
              <div className="field">
                <label>Address</label>
                <input value={form.address} onChange={set('address')} placeholder="City, State, Country" />
              </div>
            </div>
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <><span className="spinner" /> Saving...</> : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function RecipientDashboard({ currentUser, onLogout }) {
  return (
    <Shell currentUser={currentUser} onLogout={onLogout} navItems={REC_NAV}>
      <Routes>
        <Route path="/"        element={<Overview currentUser={currentUser} />} />
        <Route path="/locker"  element={<Locker />} />
        <Route path="/profile" element={<MyProfile />} />
      </Routes>
    </Shell>
  );
}
// import { useState, useEffect } from 'react';
// import { Routes, Route } from 'react-router-dom';
// import Shell from './Shell';
// import { getMyLocker, downloadCertificate, getProfile, updateProfile } from '../api';

// const REC_NAV = [
//   { to: '/recipient',          label: 'Overview',       icon: 'dashboard', end: true },
//   { to: '/recipient/locker',   label: 'Digital Locker', icon: 'locker' },
//   { to: '/recipient/profile',  label: 'My Profile',     icon: 'settings' },
// ];

// // ── Overview ──────────────────────────────────────────────────────────────────
// function Overview({ currentUser }) {
//   const [certs, setCerts]     = useState([]);
//   const [profile, setProfile] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     Promise.all([
//       getMyLocker().catch(() => []),
//       getProfile().catch(() => null)
//     ]).then(([c, p]) => {
//       setCerts(Array.isArray(c) ? c : []);
//       setProfile(p);
//     }).finally(() => setLoading(false));
//   }, []);

//   const active  = certs.filter(c => c.status === 'ACTIVE').length;
//   const revoked = certs.filter(c => c.status === 'REVOKED').length;

//   return (
//     <>
//       <div className="page-header">
//         <div className="page-title">
//           Welcome, {profile?.fullName || currentUser.username}
//         </div>
//         <div className="page-sub">
//           {profile?.idProofNumber
//             ? <>ID: <span style={{ color: 'var(--gold)', fontFamily: 'monospace', fontSize: 13 }}>{profile.idProofNumber}</span></>
//             : 'Your certificate dashboard'}
//         </div>
//       </div>
//       <div className="page-body">
//         <div className="stats-row">
//           {[
//             { label: 'Total Certificates', value: certs.length, hint: 'Issued to you' },
//             { label: 'Active',             value: active,       hint: 'Valid & verified' },
//             { label: 'Revoked',            value: revoked,      hint: 'Invalidated' },
//           ].map(s => (
//             <div className="stat-card" key={s.label}>
//               <div className="stat-label">{s.label}</div>
//               <div className="stat-value">{loading ? '—' : s.value}</div>
//               <div className="stat-hint">{s.hint}</div>
//             </div>
//           ))}
//         </div>

//         {/* Profile summary card */}
//         {profile && (
//           <div className="card">
//             <div className="card-title">Your Profile</div>
//             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
//               {[
//                 { label: 'Full Name',       val: profile.fullName },
//                 { label: 'ID Proof No.',    val: profile.idProofNumber },
//                 { label: 'Date of Birth',   val: profile.dateOfBirth },
//                 { label: 'Gender',          val: profile.gender },
//                 { label: 'Phone',           val: profile.phone },
//                 { label: 'Address',         val: profile.address },
//               ].filter(r => r.val).map(row => (
//                 <div key={row.label} style={{ padding: '12px 14px', background: 'var(--navy-3)', borderRadius: 8 }}>
//                   <div style={{ fontSize: 10, color: 'var(--white-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
//                     {row.label}
//                   </div>
//                   <div style={{ fontSize: 13, color: 'var(--white)' }}>{row.val}</div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         )}

//         <div className="card">
//           <div className="card-title">Recent Certificates</div>
//           {loading ? <p className="text-muted">Loading...</p> : certs.length === 0 ? (
//             <div className="empty-state">
//               <div className="empty-icon">🎓</div>
//               <p>No certificates yet</p>
//               <p style={{ fontSize: 12, marginTop: 8 }}>
//                 Certificates issued to your ID proof number will appear here automatically.
//               </p>
//             </div>
//           ) : (
//             <div className="table-wrap">
//               <table>
//                 <thead><tr>
//                   <th>Cert ID</th><th>Issuer</th><th>Type</th><th>Status</th>
//                 </tr></thead>
//                 <tbody>
//                   {certs.slice(0, 5).map(c => (
//                     <tr key={c.certId}>
//                       <td className="mono">{c.certId}</td>
//                       <td>{c.issuerOrg}</td>
//                       <td>{c.certType}</td>
//                       <td>
//                         <span className={`badge badge-${c.status === 'ACTIVE' ? 'active' : 'revoked'}`}>
//                           {c.status}
//                         </span>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           )}
//         </div>
//       </div>
//     </>
//   );
// }

// // ── Digital Locker ────────────────────────────────────────────────────────────
// function Locker() {
//   const [certs, setCerts]      = useState([]);
//   const [loading, setLoading]  = useState(true);
//   const [error, setError]      = useState('');
//   const [dlLoading, setDlLoad] = useState({});
//   const [filter, setFilter]    = useState('ALL');

//   useEffect(() => {
//     getMyLocker()
//       .then(data => setCerts(Array.isArray(data) ? data : []))
//       .catch(e => setError(e.message))
//       .finally(() => setLoading(false));
//   }, []);

//   const filtered = filter === 'ALL' ? certs : certs.filter(c => c.status === filter);

//   const handleDownload = async (cert) => {
//     if (!cert.ipfsCid) return;
//     setDlLoad(p => ({ ...p, [cert.certId]: true }));
//     try {
//       const blob = await downloadCertificate(cert.ipfsCid);
//       const url  = URL.createObjectURL(blob);
//       const a    = document.createElement('a');
//       a.href = url; a.download = `${cert.certId}.pdf`; a.click();
//       URL.revokeObjectURL(url);
//     } catch (e) {
//       setError('Download failed: ' + e.message);
//     } finally {
//       setDlLoad(p => ({ ...p, [cert.certId]: false }));
//     }
//   };

//   return (
//     <>
//       <div className="page-header">
//         <div className="flex-between">
//           <div>
//             <div className="page-title">Digital Locker</div>
//             <div className="page-sub">All blockchain-verified certificates linked to your ID</div>
//           </div>
//           <div style={{ display: 'flex', gap: 8 }}>
//             {['ALL', 'ACTIVE', 'REVOKED'].map(f => (
//               <button
//                 key={f}
//                 className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
//                 onClick={() => setFilter(f)}
//               >{f}</button>
//             ))}
//           </div>
//         </div>
//       </div>
//       <div className="page-body">
//         {error && <div className="alert alert-error">{error}</div>}
//         {loading ? (
//           <p className="text-muted">Loading your certificates...</p>
//         ) : filtered.length === 0 ? (
//           <div className="empty-state">
//             <div className="empty-icon">🔒</div>
//             <p>No certificates found</p>
//             <p style={{ fontSize: 12, marginTop: 8 }}>
//               Certificates issued to your government ID proof number will appear here automatically.
//             </p>
//           </div>
//         ) : (
//           <div className="cert-grid">
//             {filtered.map(cert => (
//               <CertCard key={cert.certId} cert={cert} onDownload={handleDownload} dlLoading={dlLoading} />
//             ))}
//           </div>
//         )}
//       </div>
//     </>
//   );
// }

// function CertCard({ cert, onDownload, dlLoading }) {
//   const [expanded, setExpanded] = useState(false);
//   const meta    = cert.metadata || {};
//   const entries = Object.entries(meta);

//   return (
//     <div className="cert-card">
//       <div className="cert-card-header">
//         <div>
//           <div className="cert-card-type">{cert.certType}</div>
//           <div style={{ fontSize: 11, color: 'var(--white-dim)', marginTop: 3 }}>
//             Issued by {cert.issuerOrg}
//           </div>
//         </div>
//         <span className={`badge badge-${cert.status === 'ACTIVE' ? 'active' : 'revoked'}`}>
//           {cert.status}
//         </span>
//       </div>

//       <div className="cert-card-body">
//         <div className="cert-row">
//           <span className="cert-row-label">Cert ID</span>
//           <span className="cert-row-val mono" style={{ fontSize: 11 }}>{cert.certId}</span>
//         </div>
//         <div className="cert-row">
//           <span className="cert-row-label">Your ID</span>
//           <span className="cert-row-val mono">{cert.recipientId}</span>
//         </div>

//         {/* Show top 3 metadata fields always */}
//         {entries.slice(0, expanded ? undefined : 3).map(([k, v]) => (
//           <div className="cert-row" key={k}>
//             <span className="cert-row-label">{k}</span>
//             <span className="cert-row-val">{v}</span>
//           </div>
//         ))}

//         {entries.length > 3 && (
//           <button
//             className="btn btn-ghost btn-sm"
//             style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}
//             onClick={() => setExpanded(e => !e)}
//           >
//             {expanded ? '▲ Show less' : `▼ Show ${entries.length - 3} more fields`}
//           </button>
//         )}

//         {expanded && (
//           <>
//             <div className="divider" />
//             <div className="cert-row">
//               <span className="cert-row-label">Hash</span>
//               <span className="cert-row-val mono" style={{ fontSize: 10 }}>
//                 {cert.certHash ? cert.certHash.slice(0, 32) + '…' : '—'}
//               </span>
//             </div>
//             {cert.ipfsCid && (
//               <div className="cert-row">
//                 <span className="cert-row-label">IPFS CID</span>
//                 <span className="cert-row-val mono" style={{ fontSize: 10 }}>{cert.ipfsCid.slice(0, 24)}…</span>
//               </div>
//             )}
//           </>
//         )}
//       </div>

//       <div className="cert-card-footer">
//         {cert.ipfsCid ? (
//           <button
//             className="btn btn-success btn-sm"
//             style={{ flex: 1, justifyContent: 'center' }}
//             onClick={() => onDownload(cert)}
//             disabled={dlLoading[cert.certId]}
//           >
//             {dlLoading[cert.certId]
//               ? <><span className="spinner" /> Downloading…</>
//               : '↓ Download PDF'}
//           </button>
//         ) : (
//           <span style={{ fontSize: 12, color: 'var(--white-dim)' }}>No PDF available</span>
//         )}
//         {cert.status === 'REVOKED' && (
//           <span className="badge badge-revoked">Revoked — not valid</span>
//         )}
//       </div>
//     </div>
//   );
// }

// // ── My Profile ────────────────────────────────────────────────────────────────
// function MyProfile() {
//   const [profile, setProfile]   = useState(null);
//   const [form, setForm]         = useState({
//     fullName: '', dateOfBirth: '', gender: '', phone: '', address: ''
//   });
//   const [loading, setLoading]   = useState(true);
//   const [saving, setSaving]     = useState(false);
//   const [msg, setMsg]           = useState('');
//   const [err, setErr]           = useState('');

//   useEffect(() => {
//     getProfile()
//       .then(p => {
//         setProfile(p);
//         setForm({
//           fullName:    p.fullName    || '',
//           dateOfBirth: p.dateOfBirth || '',
//           gender:      p.gender      || '',
//           phone:       p.phone       || '',
//           address:     p.address     || '',
//         });
//       })
//       .catch(e => setErr(e.message))
//       .finally(() => setLoading(false));
//   }, []);

//   const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

//   const handleSave = async (e) => {
//     e.preventDefault();
//     setSaving(true); setMsg(''); setErr('');
//     try {
//       await updateProfile(form);
//       setMsg('Profile updated successfully.');
//     } catch (e) {
//       setErr(e.message);
//     } finally {
//       setSaving(false);
//     }
//   };

//   if (loading) return (
//     <>
//       <div className="page-header"><div className="page-title">My Profile</div></div>
//       <div className="page-body"><p className="text-muted">Loading...</p></div>
//     </>
//   );

//   return (
//     <>
//       <div className="page-header">
//         <div className="page-title">My Profile</div>
//         <div className="page-sub">Your personal information and government ID details</div>
//       </div>
//       <div className="page-body">
//         {err && <div className="alert alert-error">{err}</div>}
//         {msg && <div className="alert alert-success">{msg}</div>}

//         {/* Read-only ID info */}
//         <div className="card">
//           <div className="card-title">Identity Information</div>
//           <p className="text-muted" style={{ marginBottom: 16 }}>
//             These fields were set at registration and cannot be changed.
//           </p>
//           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
//             <div className="field">
//               <label>Username</label>
//               <input value={profile?.username || ''} readOnly style={{ opacity: 0.65, cursor: 'not-allowed' }} />
//             </div>
//             <div className="field">
//               <label>Government ID Proof Number</label>
//               <input value={profile?.idProofNumber || ''} readOnly style={{ opacity: 0.65, cursor: 'not-allowed' }} />
//             </div>
//           </div>
//           <p className="text-muted" style={{ marginTop: 10, fontSize: 11 }}>
//             Your ID proof number is permanently linked to your certificates on the blockchain.
//             Organizations use this number to issue certificates to you.
//           </p>
//         </div>

//         {/* Editable profile */}
//         <div className="card">
//           <div className="card-title">Personal Details</div>
//           <form onSubmit={handleSave}>
//             <div className="form-grid">
//               <div className="field span-2">
//                 <label>Full Name</label>
//                 <input value={form.fullName} onChange={set('fullName')} placeholder="Your full name" required />
//               </div>
//               <div className="field">
//                 <label>Date of Birth</label>
//                 <input type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
//               </div>
//               <div className="field">
//                 <label>Gender</label>
//                 <select value={form.gender} onChange={set('gender')}>
//                   <option value="">Select</option>
//                   <option value="Male">Male</option>
//                   <option value="Female">Female</option>
//                   <option value="Other">Other</option>
//                   <option value="Prefer not to say">Prefer not to say</option>
//                 </select>
//               </div>
//               <div className="field">
//                 <label>Phone Number</label>
//                 <input type="tel" value={form.phone} onChange={set('phone')} placeholder="+91 XXXXX XXXXX" />
//               </div>
//               <div className="field">
//                 <label>Address</label>
//                 <input value={form.address} onChange={set('address')} placeholder="City, State, Country" />
//               </div>
//             </div>
//             <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
//               <button type="submit" className="btn btn-primary" disabled={saving}>
//                 {saving ? <><span className="spinner" /> Saving...</> : 'Save Profile'}
//               </button>
//             </div>
//           </form>
//         </div>
//       </div>
//     </>
//   );
// }

// // ── Root ──────────────────────────────────────────────────────────────────────
// export default function RecipientDashboard({ currentUser, onLogout }) {
//   return (
//     <Shell currentUser={currentUser} onLogout={onLogout} navItems={REC_NAV}>
//       <Routes>
//         <Route path="/"        element={<Overview currentUser={currentUser} />} />
//         <Route path="/locker"  element={<Locker />} />
//         <Route path="/profile" element={<MyProfile />} />
//       </Routes>
//     </Shell>
//   );
// }
