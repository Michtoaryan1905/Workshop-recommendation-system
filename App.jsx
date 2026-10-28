import React, { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import api from './api';
import Login from './pages/Login.jsx';
import Workshops from './pages/Workshops.jsx';
import WorkshopDetail from './pages/WorkshopDetail.jsx';
import Recommendations from './pages/Recommendations.jsx';
import Profile from './pages/Profile.jsx';
import MyWorkshops from './pages/MyWorkshops.jsx';
import Organizer from './pages/Organizer.jsx';
import Admin from './pages/Admin.jsx';

const Guard = ({ roles, children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return roles && !roles.includes(user.role) ? <Navigate to="/" replace /> : children;
};
const home = (u) => (!u ? '/workshops' : u.role === 'admin' ? '/admin' : u.role === 'organizer' ? '/organizer' : '/recommendations');

function Notifications() {
  const [items, setItems] = useState([]); const [open, setOpen] = useState(false);
  const load = () => api.get('/notifications').then((r) => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);
  const unread = items.filter((i) => !i.is_read).length;
  return (
    <div className="position-relative me-3">
      <button className="btn btn-sm btn-outline-light" onClick={() => { setOpen(!open); if (!open && unread) api.post('/notifications/read').then(load); }}>🔔 {unread > 0 && <span className="badge bg-danger">{unread}</span>}</button>
      {open && <div className="card position-absolute end-0 mt-1 shadow" style={{ width: 320, zIndex: 20, maxHeight: 360, overflow: 'auto' }}>
        {items.length ? items.map((n) => <div key={n.id} className="p-2 border-bottom small">{n.message}<div className="text-muted">{String(n.created_at).slice(0, 16)}</div></div>) : <div className="p-2 small text-muted">No notifications</div>}</div>}
    </div>
  );
}

export default function App() {
  const { user, logout } = useAuth(); const nav = useNavigate();
  return (
    <>
      <nav className="navbar navbar-expand navbar-dark bg-dark px-3">
        <Link className="navbar-brand" to="/">🎓 Workshop Recommender</Link>
        <div className="navbar-nav me-auto">
          <Link className="nav-link" to="/workshops">Workshops</Link>
          {user?.role === 'student' && <><Link className="nav-link" to="/recommendations">For You</Link><Link className="nav-link" to="/my-workshops">My Workshops</Link><Link className="nav-link" to="/profile">Profile</Link></>}
          {user?.role === 'organizer' && <Link className="nav-link" to="/organizer">Organizer</Link>}
          {user?.role === 'admin' && <Link className="nav-link" to="/admin">Admin</Link>}
        </div>
        {user ? <><Notifications /><span className="text-light me-3 small">{user.name} ({user.role})</span><button className="btn btn-sm btn-outline-light" onClick={() => { logout(); nav('/login'); }}>Logout</button></>
          : <Link className="btn btn-sm btn-outline-light" to="/login">Login / Register</Link>}
      </nav>
      <div className="container py-4">
        <Routes>
          <Route path="/" element={<Navigate to={home(user)} replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/workshops" element={<Workshops />} />
          <Route path="/workshops/:id" element={<WorkshopDetail />} />
          <Route path="/recommendations" element={<Guard roles={['student']}><Recommendations /></Guard>} />
          <Route path="/profile" element={<Guard roles={['student']}><Profile /></Guard>} />
          <Route path="/my-workshops" element={<Guard roles={['student']}><MyWorkshops /></Guard>} />
          <Route path="/organizer" element={<Guard roles={['organizer', 'admin']}><Organizer /></Guard>} />
          <Route path="/admin" element={<Guard roles={['admin']}><Admin /></Guard>} />
          <Route path="*" element={<div>Page not found</div>} />
        </Routes>
      </div>
    </>
  );
}
