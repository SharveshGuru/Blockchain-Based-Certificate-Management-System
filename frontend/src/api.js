const BASE = 'http://localhost:3000/api';

const getToken = () => localStorage.getItem('token');

const headers = (json = true) => {
  const h = {};
  if (json) h['Content-Type'] = 'application/json';
  const t = getToken();
  if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
};

// ── AUTH ──────────────────────────────────────────────────────────────────────
export const login = async (username, password) => {
  const r = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ username, password })
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Login failed');
  return data; // { token, role }
};

// organizationName required for issuers
// idProofNumber + fullName required for recipients
export const register = async (payload) => {
  const r = await fetch(`${BASE}/register`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload)
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Registration failed');
  return data;
};

// ── PROFILE ───────────────────────────────────────────────────────────────────
export const getProfile = async () => {
  const r = await fetch(`${BASE}/profile`, { headers: headers() });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Failed to fetch profile');
  return data;
};

// Recipient only — update personal metadata
export const updateProfile = async (payload) => {
  const r = await fetch(`${BASE}/profile`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(payload)
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Update failed');
  return data;
};

// Issuer only — update organization display name
export const updateOrgName = async (organizationName) => {
  const r = await fetch(`${BASE}/organization-name`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ organizationName })
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Update failed');
  return data;
};

// Issuer only — check if a recipient ID is registered, returns their details
// for pre-filling the form. 404 is not an error — just means not registered yet.
export const lookupRecipientByIdProof = async (idProof) => {
  const r = await fetch(
    `${BASE}/recipient/lookup?idProof=${encodeURIComponent(idProof)}`,
    { headers: headers() }
  );
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Not found');
  return data; // { fullName, dateOfBirth, gender, phone, address }
};

// ── ASSETS ────────────────────────────────────────────────────────────────────
export const uploadLogo = async (file, assetName = 'logo') => {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('assetName', assetName);
  const r = await fetch(`${BASE}/upload-logo`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: fd
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Upload failed');
  return data;
};

export const uploadSignature = async (file, assetName = 'signature') => {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('assetName', assetName);
  const r = await fetch(`${BASE}/upload-signature`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: fd
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Upload failed');
  return data;
};

// ── CERTIFICATES ──────────────────────────────────────────────────────────────
export const issueCertificate = async (payload) => {
  const r = await fetch(`${BASE}/issue`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload)
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Issue failed');
  return data;
};

export const revokeCertificate = async (certId, revokeReason = '') => {
  const r = await fetch(`${BASE}/revoke`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ certId, revokeReason })
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Revoke failed');
  return data;
};

// org = organizationName stored on blockchain (not username)
export const getIssuedCertificates = async (org) => {
  const r = await fetch(`${BASE}/certificates/issuer?org=${encodeURIComponent(org)}`, {
    headers: headers()
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Fetch failed');
  return data;
};

// Recipient locker — backend uses idProofNumber from authenticated user's DB record
export const getMyLocker = async () => {
  const r = await fetch(`${BASE}/locker`, { headers: headers() });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Fetch failed');
  return data;
};

export const getCertificate = async (certId) => {
  const r = await fetch(`${BASE}/certificate/${certId}`, { headers: headers() });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Not found');
  return data;
};

export const downloadCertificate = async (cid) => {
  const r = await fetch(`${BASE}/download/${cid}`, { headers: headers(false) });
  if (!r.ok) throw new Error('Download failed');
  return r.blob();
};

export const verifyByPDF = async (file) => {
  const fd = new FormData();
  fd.append('pdf', file);
  const r = await fetch(`${BASE}/verify-pdf`, { method: 'POST', body: fd });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Verification failed');
  return data;
};

export const verifyById = async (certId, hash) => {
  const r = await fetch(`${BASE}/verify/${certId}?hash=${encodeURIComponent(hash)}`);
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Verification failed');
  return data;
};

// ── ADMIN ─────────────────────────────────────────────────────────────────────
export const adminGetUsers = async () => {
  const r = await fetch(`${BASE}/admin/users`, { headers: headers() });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Fetch failed');
  return data;
};

export const adminDeleteUser = async (username) => {
  const r = await fetch(`${BASE}/admin/users/${encodeURIComponent(username)}`, {
    method: 'DELETE',
    headers: headers()
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Delete failed');
  return data;
};