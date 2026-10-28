import React, { useEffect, useState } from 'react';
import api, { errMsg } from '../api';
import { Alert, Badge, Insights, SentimentSummary, Table } from '../components.jsx';

const BLANK = { title: '', description: '', category: '', sub_category: '', skills: '', difficulty: 'Beginner', instructor: '', event_date: '', start_time: '10:00', end_time: '13:00', location: '', mode: 'Offline', capacity: 30, fee: 0 };

export default function Organizer() {
  const [tab, setTab] = useState('list'); const [list, setList] = useState([]); const [cats, setCats] = useState([]); const [an, setAn] = useState(null);
  const [form, setForm] = useState(BLANK); const [editing, setEditing] = useState(null); const [detail, setDetail] = useState(null);
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  const load = () => { api.get('/organizer/workshops').then((r) => setList(r.data)); api.get('/organizer/analytics').then((r) => setAn(r.data)); };
  useEffect(() => { load(); api.get('/categories').then((r) => setCats(r.data)); }, []);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault(); setErr(''); setMsg('');
    try {
      const body = { ...form, capacity: +form.capacity, fee: +form.fee };
      if (editing) await api.put(`/workshops/${editing}`, body); else await api.post('/workshops', body);
      setMsg(editing ? 'Workshop updated and sent for re-approval' : 'Workshop created and sent for admin approval'); setForm(BLANK); setEditing(null); setTab('list'); load();
    } catch (x) { setErr(errMsg(x)); }
  };
  const edit = (w) => { setEditing(w.id); setForm({ ...w, skills: (w.skills || []).join(', '), event_date: String(w.event_date).slice(0, 10), start_time: String(w.start_time).slice(0, 5), end_time: String(w.end_time).slice(0, 5) }); setTab('form'); };
  const del = async (w) => { if (window.confirm(`Delete "${w.title}"?`)) { await api.delete(`/workshops/${w.id}`); load(); } };
  const open = async (w) => setDetail({ w, regs: (await api.get(`/organizer/workshops/${w.id}/registrations`)).data, reviews: (await api.get(`/organizer/workshops/${w.id}/reviews`)).data });

  return (
    <>
      <ul className="nav nav-tabs mb-3">{[['list', 'My workshops'], ['form', editing ? 'Edit workshop' : 'Create workshop'], ['analytics', 'Analytics']].map(([k, l]) => <li key={k} className="nav-item"><button className={`nav-link ${tab === k ? 'active' : ''}`} onClick={() => { setTab(k); if (k === 'form' && !editing) setForm(BLANK); }}>{l}</button></li>)}</ul>
      <Alert msg={msg} type="success" /><Alert msg={err} />
      {tab === 'list' && <>
        <Table rows={list} cols={[{ label: 'Title', key: 'title' }, { label: 'Date', render: (w) => String(w.event_date).slice(0, 10) }, { label: 'Status', render: (w) => <Badge text={w.status} /> },
          { label: 'Seats', render: (w) => `${w.capacity - w.available_seats}/${w.capacity}` }, { label: 'Rating', render: (w) => `⭐ ${Number(w.rating_avg).toFixed(1)} (${w.review_count})` },
          { label: '', render: (w) => <div className="btn-group btn-group-sm"><button className="btn btn-outline-primary" onClick={() => open(w)}>Registrations & reviews</button><button className="btn btn-outline-secondary" onClick={() => edit(w)}>Edit</button><button className="btn btn-outline-danger" onClick={() => del(w)}>Delete</button></div> }]} />
        {detail && <div className="card p-3 shadow-sm"><div className="d-flex justify-content-between"><h5>{detail.w.title}</h5><button className="btn-close" onClick={() => setDetail(null)} /></div>
          <h6>Registrations ({detail.regs.length})</h6><Table rows={detail.regs} cols={[{ label: 'Name', key: 'name' }, { label: 'Email', key: 'email' }, { label: 'Level', key: 'skill_level' }, { label: 'On', render: (r) => String(r.created_at).slice(0, 10) }]} />
          <h6>Reviews ({detail.reviews.length})</h6><Table rows={detail.reviews} cols={[{ label: 'By', key: 'user_name' }, { label: '⭐', key: 'rating' }, { label: 'Sentiment', render: (r) => r.sentiment && <Badge text={r.sentiment} /> }, { label: 'Comment', key: 'comment' }]} /></div>}
      </>}
      {tab === 'form' && (
        <form className="card p-4 shadow-sm" onSubmit={save}>
          <div className="row g-2">
            <div className="col-md-8"><input className="form-control" placeholder="Title" value={form.title} onChange={set('title')} required /></div>
            <div className="col-md-4"><select className="form-select" value={form.category} onChange={set('category')} required><option value="">Category</option>{cats.map((c) => <option key={c.id}>{c.name}</option>)}</select></div>
            <div className="col-12"><textarea className="form-control" rows="4" placeholder="Description (keywords are extracted automatically with NLP)" value={form.description} onChange={set('description')} required /></div>
            <div className="col-md-4"><input className="form-control" placeholder="Sub-category" value={form.sub_category} onChange={set('sub_category')} /></div>
            <div className="col-md-8"><input className="form-control" placeholder="Skills (comma separated)" value={form.skills} onChange={set('skills')} /></div>
            <div className="col-md-3"><select className="form-select" value={form.difficulty} onChange={set('difficulty')}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></div>
            <div className="col-md-3"><input className="form-control" placeholder="Instructor" value={form.instructor} onChange={set('instructor')} required /></div>
            <div className="col-md-3"><select className="form-select" value={form.mode} onChange={set('mode')}><option>Offline</option><option>Online</option></select></div>
            <div className="col-md-3"><input className="form-control" placeholder="Location / city" value={form.mode === 'Online' ? 'Online' : form.location} disabled={form.mode === 'Online'} onChange={set('location')} /></div>
            <div className="col-md-3"><input className="form-control" type="date" value={form.event_date} onChange={set('event_date')} required /></div>
            <div className="col-md-2"><input className="form-control" type="time" value={form.start_time} onChange={set('start_time')} required /></div>
            <div className="col-md-2"><input className="form-control" type="time" value={form.end_time} onChange={set('end_time')} required /></div>
            <div className="col-md-2"><input className="form-control" type="number" min="1" placeholder="Capacity" value={form.capacity} onChange={set('capacity')} required /></div>
            <div className="col-md-3"><input className="form-control" type="number" min="0" placeholder="Fee ₹" value={form.fee} onChange={set('fee')} /></div>
          </div>
          <button className="btn btn-primary mt-3 align-self-start">{editing ? 'Save changes' : 'Create workshop'}</button>
        </form>
      )}
      {tab === 'analytics' && an && <>
        <div className="card p-3 shadow-sm mb-3"><h5>Review sentiment</h5><SentimentSummary data={an.sentiment} /><div className="mt-3"><Insights ins={an.sentiment.insights} /></div></div>
        <Table rows={an.workshops} cols={[{ label: 'Workshop', key: 'title' }, { label: 'Views', key: 'views' }, { label: 'Registrations', key: 'registrations' }, { label: 'Fill %', render: (w) => `${Math.round((100 * w.registrations) / w.capacity)}%` },
          { label: 'Rating', render: (w) => Number(w.rating_avg).toFixed(1) }, { label: '👍 / 😐 / 👎', render: (w) => `${w.positive} / ${w.neutral} / ${w.negative}` }]} />
      </>}
    </>
  );
}
