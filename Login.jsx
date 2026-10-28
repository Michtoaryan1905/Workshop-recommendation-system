import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { Alert } from '../components.jsx';
import { errMsg } from '../api';

export default function Login() {
  const { login, register } = useAuth(); const nav = useNavigate();
  const [mode, setMode] = useState('login'); const [f, setF] = useState({ name: '', email: '', password: '' }); const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const go = (u) => nav(u.role === 'admin' ? '/admin' : u.role === 'organizer' ? '/organizer' : mode === 'register' ? '/profile' : '/recommendations');
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    try { go(mode === 'login' ? await login(f.email, f.password) : await register(f)); } catch (x) { setErr(errMsg(x)); }
  };
  return (
    <div className="row justify-content-center"><div className="col-md-5"><div className="card p-4 shadow-sm">
      <h4>{mode === 'login' ? 'Login' : 'Create student account'}</h4>
      <Alert msg={err} />
      <form onSubmit={submit}>
        {mode === 'register' && <input className="form-control mb-2" placeholder="Full name" value={f.name} onChange={set('name')} required />}
        <input className="form-control mb-2" type="email" placeholder="Email" value={f.email} onChange={set('email')} required />
        <input className="form-control mb-3" type="password" placeholder="Password (min 8 characters)" value={f.password} onChange={set('password')} required />
        <button className="btn btn-primary w-100">{mode === 'login' ? 'Login' : 'Register'}</button>
      </form>
      <button className="btn btn-link mt-2" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }}>{mode === 'login' ? 'New student? Register' : 'Have an account? Login'}</button>
      <div className="small text-muted mt-2">Demo: aryan@wrs.com / Student@123 · org1@wrs.com / Organizer@123 · admin@wrs.com / Admin@123</div>
    </div></div></div>
  );
}
