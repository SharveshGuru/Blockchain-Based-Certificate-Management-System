import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Shell from './Shell';
import PDFViewerModal from './PDFViewerModal';
import { getIssuedCertificates, revokeCertificate, downloadCertificate } from '../api';

const ADMIN_NAV = [
  { to: '/admin',              label: 'Overview',         icon: 'dashboard', end: true },
  { to: '/admin/certificates', label: 'All Certificates', icon: 'list' },
];

function Overview() {
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getIssuedCertificates('').catch(() => []).then(data => {
      setCerts(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  const active  = certs.filter(c => c.status === 'ACTIVE').length;
  const revoked = certs.filter(c => c.status === 'REVOKED').length;

  return (
    <>
      <div className="page-header">
        <div className="page-title">Admin Dashboard</div>
        <div className="page-sub">System-wide overview</div>
      </div>
      <div className="page-body">
        <div className="stats-row">
          {[
            { label: 'Total Certificates', value: certs.length },
            { label: 'Active',    value: active  },
            { label: 'Revoked',   value: revoked },
          ].map(s => (
            <div className="stat-card" key={s.label}>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{loading ? '—' : s.value}</div>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-title">Blockchain & Infrastructure Status</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              { name: 'Hyperledger Fabric', status: 'Active',     detail: 'Channel: mychannel' },
              { name: 'IPFS Storage',       status: 'Connected',  detail: 'Distributed file storage' },
              { name: 'Certificate Auth.',  status: 'Running',    detail: 'Fabric CA enrolled' },
            ].map(s => (
              <div key={s.name} style={{
                padding: '16px', background: 'var(--navy-3)', borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.06)'
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--white)', marginBottom: 6 }}>{s.name}</div>
                <div style={{ color: 'var(--green)', fontSize: 13, fontWeight: 700 }}>{s.status}</div>
                <div style={{ fontSize: 11, color: 'var(--white-dim)', marginTop: 4 }}>{s.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function AllCertificates() {
  const [certs, setCerts]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [revokeTarget, setRevoke] = useState(null);
  const [revokeReason, setReason] = useState('');
  const [revoking, setRevoking]   = useState(false);
  const [msg, setMsg]             = useState('');
  const [err, setErr]             = useState('');
  const [dlLoad, setDlLoad]       = useState({});
  const [search, setSearch]       = useState('');
  const [viewCert, setViewCert]   = useState(null);

  const load = () => {
    setLoading(true);
    getIssuedCertificates('').catch(() => []).then(data => {
      setCerts(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  };

  useEffect(load, []);

  const filtered = certs.filter(c =>
    !search ||
    c.certId?.toLowerCase().includes(search.toLowerCase()) ||
    c.recipientId?.toLowerCase().includes(search.toLowerCase()) ||
    c.issuerOrg?.toLowerCase().includes(search.toLowerCase())
  );

  const handleRevoke = async () => {
    setRevoking(true); setErr('');
    try {
      await revokeCertificate(revokeTarget.certId, revokeReason);
      setMsg(`Revoked: ${revokeTarget.certId}`);
      setRevoke(null); setReason(''); load();
    } catch (e) { setErr(e.message); }
    finally { setRevoking(false); }
  };

  const handleDownload = async (cert) => {
    if (!cert.ipfsCid) return;
    setDlLoad(p => ({ ...p, [cert.certId]: true }));
    try {
      const blob = await downloadCertificate(cert.ipfsCid);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
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
            <div className="page-title">All Certificates</div>
            <div className="page-sub">Manage all certificates across all organizations</div>
          </div>
          <button className="btn btn-ghost" onClick={load}>↻ Refresh</button>
        </div>
      </div>
      <div className="page-body">
        {msg && <div className="alert alert-success">{msg}</div>}
        {err && <div className="alert alert-error">{err}</div>}

        <div className="card">
          <div style={{ marginBottom: 16 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by cert ID, recipient, or org..."
              style={{ width: '100%', maxWidth: 400 }}
            />
          </div>
          {loading ? <p className="text-muted">Loading...</p> : filtered.length === 0 ? (
            <div className="empty-state"><p>No certificates found</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th>Cert ID</th><th>Recipient</th><th>Issuer</th><th>Type</th>
                  <th>IPFS CID</th><th>Status</th><th>Actions</th>
                </tr></thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.certId}>
                      <td className="mono">{c.certId}</td>
                      <td>{c.recipientId}</td>
                      <td>{c.issuerOrg}</td>
                      <td>{c.certType}</td>
                      <td className="mono">{c.ipfsCid ? c.ipfsCid.slice(0, 14) + '…' : '—'}</td>
                      <td><span className={`badge badge-${c.status === 'ACTIVE' ? 'active' : 'revoked'}`}>{c.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {c.ipfsCid && (
                            <>
                              <button className="btn btn-ghost btn-sm" onClick={() => setViewCert(c)}>
                                👁 View
                              </button>
                              <button className="btn btn-ghost btn-sm" onClick={() => handleDownload(c)} disabled={dlLoad[c.certId]}>
                                {dlLoad[c.certId] ? <span className="spinner" /> : '↓ PDF'}
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
            <p>Revoking <strong style={{ color: 'var(--white)' }}>{revokeTarget.certId}</strong>. This action is irreversible.</p>
            <div className="field">
              <label>Reason</label>
              <textarea value={revokeReason} onChange={e => setReason(e.target.value)} rows={3} />
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

export default function AdminDashboard({ currentUser, onLogout }) {
  return (
    <Shell currentUser={currentUser} onLogout={onLogout} navItems={ADMIN_NAV}>
      <Routes>
        <Route path="/"              element={<Overview />} />
        <Route path="/certificates" element={<AllCertificates />} />
      </Routes>
    </Shell>
  );
}