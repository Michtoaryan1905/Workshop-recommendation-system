import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { track } from '../api';
import { Badge, ScoreBar, WorkshopMeta } from '../components.jsx';

const EMPTY = { q: '', category: '', level: '', mode: '', location: '', maxFee: '', from: '' };
export default function Workshops() {
  const nav = useNavigate();
  const [f, setF] = useState(EMPTY); const [cats, setCats] = useState([]); const [res, setRes] = useState({ workshops: [], parsed: null }); const [loading, setLoading] = useState(false);
  const run = async (filters = f) => {
    setLoading(true);
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
    try { setRes((await api.get('/workshops', { params })).data); } finally { setLoading(false); }
  };
  useEffect(() => { api.get('/categories').then((r) => setCats(r.data)); run(EMPTY); /* eslint-disable-next-line */ }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const p = res.parsed;
  return (
    <>
      <form className="card p-3 mb-3 shadow-sm" onSubmit={(e) => { e.preventDefault(); run(); }}>
        <div className="input-group mb-2">
          <input className="form-control" placeholder='Try: "I want a beginner Python workshop for data science"' value={f.q} onChange={set('q')} />
          <button className="btn btn-primary">Search</button>
        </div>
        <div className="row g-2">
          <div className="col-md-2"><select className="form-select" value={f.category} onChange={set('category')}><option value="">All categories</option>{cats.map((c) => <option key={c.id}>{c.name}</option>)}</select></div>
          <div className="col-md-2"><select className="form-select" value={f.level} onChange={set('level')}><option value="">Any level</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></div>
          <div className="col-md-2"><select className="form-select" value={f.mode} onChange={set('mode')}><option value="">Online/Offline</option><option>Online</option><option>Offline</option></select></div>
          <div className="col-md-2"><input className="form-control" placeholder="City" value={f.location} onChange={set('location')} /></div>
          <div className="col-md-2"><input className="form-control" type="number" min="0" placeholder="Max fee ₹" value={f.maxFee} onChange={set('maxFee')} /></div>
          <div className="col-md-2"><input className="form-control" type="date" value={f.from} onChange={set('from')} /></div>
        </div>
        <button type="button" className="btn btn-sm btn-link align-self-start" onClick={() => { setF(EMPTY); run(EMPTY); }}>Clear filters</button>
      </form>
      {p && (p.skills.length || p.interests.length || p.level || p.keywords.length) ? (
        <div className="alert alert-info py-2 small"><b>Understood your query:</b> {p.skills.length > 0 && <>Skills: {p.skills.join(', ')} · </>}{p.interests.length > 0 && <>Interests: {p.interests.join(', ')} · </>}{p.level && <>Level: {p.level} · </>}{p.location && <>Location: {p.location} · </>}{p.mode && <>Mode: {p.mode}</>}</div>
      ) : null}
      <div className="text-muted small mb-2">{loading ? 'Searching…' : `${res.count ?? 0} workshops`}</div>
      <div className="row g-3">
        {res.workshops.map((w) => (
          <div className="col-md-6 col-lg-4" key={w.id}>
            <div className="card h-100 card-hover" onClick={() => { track('click_workshop', w.id); nav(`/workshops/${w.id}`); }}>
              <div className="card-body">
                <div className="d-flex justify-content-between"><h6 className="card-title">{w.title}</h6>{w.match_score !== undefined && <Badge text={`${Math.round(w.match_score)}% match`} />}</div>
                {w.match_score !== undefined && <ScoreBar value={w.match_score} />}
                <WorkshopMeta w={w} />
                <p className="card-text small mt-2">{w.description.slice(0, 120)}…</p>
                <div>{(w.keywords || []).slice(0, 5).map((k) => <span key={k} className="chip">{k}</span>)}</div>
              </div>
              <div className="card-footer small">{w.available_seats} seats left · by {w.organizer}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
