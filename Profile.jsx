import React, { useEffect, useState } from 'react';
import api, { errMsg } from '../api';
import { Alert, Chips } from '../components.jsx';

export default function Profile() {
  const [p, setP] = useState(null); const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  useEffect(() => { api.get('/users/profile').then((r) => setP(r.data)); }, []);
  if (!p) return <div>Loading…</div>;
  const set = (k) => (e) => setP({ ...p, [k]: e.target.value });
  const save = async (e) => { e.preventDefault(); setMsg(''); setErr(''); try { setP((await api.put('/users/profile', p)).data); setMsg('Profile saved. Your recommendations will now use it.'); } catch (x) { setErr(errMsg(x)); } };
  return (
    <form className="card p-4 shadow-sm col-md-8" onSubmit={save}>
      <h4>My profile</h4><Alert msg={msg} type="success" /><Alert msg={err} />
      <label className="form-label">Name</label><input className="form-control mb-2" value={p.name} onChange={set('name')} />
      <label className="form-label">Email</label><input className="form-control mb-2" value={p.email} disabled />
      <label className="form-label">Skills (press Enter to add)</label><div className="mb-2"><Chips value={p.skills || []} onChange={(v) => setP({ ...p, skills: v })} placeholder="e.g. Python" /></div>
      <label className="form-label">Interests</label><div className="mb-2"><Chips value={p.interests || []} onChange={(v) => setP({ ...p, interests: v })} placeholder="e.g. Data Science" /></div>
      <div className="row g-2 mb-2">
        <div className="col-md-4"><label className="form-label">Skill level</label><select className="form-select" value={p.skill_level} onChange={set('skill_level')}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></div>
        <div className="col-md-4"><label className="form-label">Preferred location</label><input className="form-control" value={p.preferred_location || ''} onChange={set('preferred_location')} /></div>
        <div className="col-md-4"><label className="form-label">Preferred mode</label><select className="form-select" value={p.preferred_mode} onChange={set('preferred_mode')}><option>Any</option><option>Online</option><option>Offline</option></select></div>
      </div>
      <label className="form-label">Career goal</label><input className="form-control mb-3" value={p.career_goal || ''} onChange={set('career_goal')} placeholder="e.g. Become a data scientist" />
      <button className="btn btn-primary align-self-start">Save profile</button>
    </form>
  );
}
