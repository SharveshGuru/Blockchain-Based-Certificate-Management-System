import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import AdminDashboard from './components/AdminDashboard';
import OrganizationDashboard from './components/OrganizationDashboard';
import RecipientDashboard from './components/RecipientDashboard';
import VerifierDashboard from './components/VerifierDashboard';
import Homepage from './components/Homepage';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('certchain_user');
    if (saved) setCurrentUser(JSON.parse(saved));
    setLoading(false);
  }, []);

  const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem('certchain_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('certchain_user');
    localStorage.removeItem('token');
  };

  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0a0e1a', color: '#c9a84c', fontFamily: 'serif', fontSize: 18
    }}>
      Loading CertChain...
    </div>
  );

  return (
    <Router>
      <Routes>
        {/* ── DEFAULT: Homepage ────────────────────────────────────── */}
        <Route path="/" element={<Homepage />} />

        {/* ── AUTH ─────────────────────────────────────────────────── */}
        <Route path="/login" element={
          currentUser
            ? <Navigate to={currentUser.role === 'issuer' ? '/organization' : `/${currentUser.role}`} />
            : <Login onLogin={handleLogin} />
        } />
        <Route path="/register" element={<Register />} />

        {/* ── DASHBOARDS ───────────────────────────────────────────── */}
        <Route path="/admin/*" element={
          currentUser?.role === 'admin'
            ? <AdminDashboard currentUser={currentUser} onLogout={handleLogout} />
            : <Navigate to="/login" />
        } />
        <Route path="/organization/*" element={
          currentUser?.role === 'issuer'
            ? <OrganizationDashboard currentUser={currentUser} onLogout={handleLogout} />
            : <Navigate to="/login" />
        } />
        <Route path="/recipient/*" element={
          currentUser?.role === 'recipient'
            ? <RecipientDashboard currentUser={currentUser} onLogout={handleLogout} />
            : <Navigate to="/login" />
        } />

        {/* ── PUBLIC ───────────────────────────────────────────────── */}
        <Route path="/verify" element={<VerifierDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;