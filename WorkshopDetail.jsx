import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api, { errMsg, track } from '../api';
import { useAuth } from '../auth.jsx';
import { Alert, Badge, Insights, SentimentSummary, WorkshopMeta } from '../components.jsx';

export default function WorkshopDetail() {
  const { id } = useParams(); const { user } = useAuth();
  const [w, setW] = useState(null); const [reviews, setReviews] = useState([]); const [ins, setIns] = useState(null);
  const [registered, setRegistered] = useState(false); const [showRev, setShowRev] = useState(false);
  const [msg, setMsg] = useState(''); const [err, setErr] = useState(''); const [form, setForm] = useState({ rating: 5, comment: '' });

  const load = () => {
    api.get(`/workshops/${id}`).then((r) => setW(r.data)).catch((e) => setErr(errMsg(e)));
    api.get(`/workshops/${id}/reviews`).then((r) => setReviews(r.data));
    api.get(`/workshops/${id}/insights`).then((r) => setIns(r.data));
    if (user?.role === 'student') api.get('/registrations/mine').then((r) => setRegistered(r.data.some((x) => x.id === +id)));
  };
  useEffect(() => { load(); track('view_workshop', +id); /* eslint-disable-next-line */ }, [id]);

  const register = async () => {
    setMsg(''); setErr(''); track('click_register', +id);
    try { await api.post(`/workshops/${id}/register`); setMsg('You are registered! 🎉'); load(); } catch (e) { setErr(errMsg(e)); }
  };
  const submit = async (e) => {
    e.preventDefault(); setMsg(''); setErr('');
    try { const r = (await api.post(`/workshops/${id}/reviews`, form)).data; setMsg(`Review saved${r.sentiment ? ` — detected sentiment: ${r.sentiment} (confidence ${r.confidence})` : ''}`); setForm({ rating: 5, comment: '' }); load(); } catch (x) { setErr(errMsg(x)); }
  };
  const report = async (rid) => { const reason = window.prompt('Why are you reporting this review?'); if (reason) { try { await api.post(`/reviews/${rid}/report`, { reason }); setMsg('Report sent to the admin'); } catch (x) { setErr(errMsg(x)); } } };

  if (!w) return err ? <Alert msg={err} /> : <div>Loading…</div>;
  return (
    <>
      <Alert msg={msg} type="success" /><Alert msg={err} />
      <div className="card p-4 shadow-sm mb-3">
        <div className="d-flex justify-content-between"><h3>{w.title}</h3><Badge text={w.status} /></div>
        <WorkshopMeta w={w} />
        <p className="mt-3">{w.description}</p>
        <div className="row small mb-2">
          <div className="col-md-4"><b>Instructor:</b> {w.instructor}</div><div className="col-md-4"><b>Organizer:</b> {w.organizer}</div>
          <div className="col-md-4"><b>Seats:</b> {w.available_seats}/{w.capacity}</div>
        </div>
        <div><b className="small">Skills:</b> {(w.skills || []).map((s) => <span key={s} className="chip">{s}</span>)}</div>
        <div><b className="small">Extracted keywords (NLP):</b> {(w.keywords || []).map((s) => <span key={s} className="chip">{s}</span>)}</div>
        {user?.role === 'student' && (registered ? <div className="mt-3"><Badge text="Registered" /></div>
          : <button className="btn btn-success mt-3 align-self-start" disabled={w.available_seats < 1 || w.status !== 'approved'} onClick={register}>{w.available_seats < 1 ? 'Sold out' : `Register${Number(w.fee) ? ` (₹${Number(w.fee)})` : ' (Free)'}`}</button>)}
        {!user && <div className="small text-muted mt-3">Login as a student to register.</div>}
      </div>

      <div className="card p-4 shadow-sm mb-3"><h5>Review insights</h5><SentimentSummary data={ins} /><div className="mt-3"><Insights ins={ins?.insights} /></div></div>

      {registered && (
        <form className="card p-4 shadow-sm mb-3" onSubmit={submit}><h5>Rate & review</h5>
          <select className="form-select w-auto mb-2" value={form.rating} onChange={(e) => setForm({ ...form, rating: +e.target.value })}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'⭐'.repeat(n)}</option>)}</select>
          <textarea className="form-control mb-2" rows="3" placeholder="Share your experience…" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
          <button className="btn btn-primary align-self-start">Submit</button></form>
      )}

      <div className="card p-4 shadow-sm">
        <button className="btn btn-link p-0 align-self-start" onClick={() => { if (!showRev) track('view_review', +id); setShowRev(!showRev); }}>{showRev ? 'Hide' : 'Show'} reviews ({reviews.length})</button>
        {showRev && reviews.map((r) => (
          <div key={r.id} className="border-top py-2">
            <b>{r.user_name}</b> ⭐{r.rating} {r.sentiment && <Badge text={r.sentiment} extra={`(${Number(r.sentiment_confidence).toFixed(2)})`} />}
            <p className="mb-0">{r.comment}</p>
            {user && <button className="btn btn-sm btn-link text-danger p-0" onClick={() => report(r.id)}>Report</button>}
          </div>
        ))}
      </div>
    </>
  );
}
