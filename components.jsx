import React, { useState } from 'react';

export const Alert = ({ msg, type = 'danger' }) => (msg ? <div className={`alert alert-${type} py-2`}>{msg}</div> : null);

export const ScoreBar = ({ value }) => (
  <div className="progress score-bar"><div className={`progress-bar ${value >= 80 ? 'bg-success' : value >= 50 ? 'bg-warning' : 'bg-secondary'}`} style={{ width: `${value}%` }} /></div>
);

const COLOR = { Positive: 'success', Neutral: 'secondary', Negative: 'danger', approved: 'success', pending: 'warning', rejected: 'danger', open: 'warning', removed: 'danger', dismissed: 'secondary', active: 'success', blocked: 'danger' };
export const Badge = ({ text, extra }) => <span className={`badge bg-${COLOR[text] || 'info'}`}>{text}{extra ? ` ${extra}` : ''}</span>;

export function Chips({ value = [], onChange, placeholder }) {
  const [t, setT] = useState('');
  const add = () => { const v = t.trim(); if (v && !value.includes(v)) onChange([...value, v]); setT(''); };
  return (
    <div>
      <div className="mb-1">{value.map((v) => <span key={v} className="chip">{v} <a href="#!" onClick={(e) => { e.preventDefault(); onChange(value.filter((x) => x !== v)); }} className="text-decoration-none">×</a></span>)}</div>
      <input className="form-control" value={t} placeholder={placeholder} onChange={(e) => setT(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }} onBlur={add} />
    </div>
  );
}

/** Horizontal bars for [{label, value}] */
export const Bars = ({ rows, color = 'primary' }) => {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return rows.length ? rows.map((r) => (
    <div key={r.label} className="mb-1"><div className="d-flex justify-content-between small"><span>{r.label}</span><b>{r.value}</b></div>
      <div className="progress score-bar"><div className={`progress-bar bg-${color}`} style={{ width: `${(100 * r.value) / max}%` }} /></div></div>
  )) : <div className="text-muted small">No data yet</div>;
};

export const Table = ({ cols, rows, empty = 'No records' }) => (
  <div className="table-responsive"><table className="table table-sm table-hover align-middle bg-white">
    <thead><tr>{cols.map((c) => <th key={c.label}>{c.label}</th>)}</tr></thead>
    <tbody>{rows.length ? rows.map((r, i) => <tr key={r.id ?? i}>{cols.map((c) => <td key={c.label}>{c.render ? c.render(r) : r[c.key]}</td>)}</tr>) : <tr><td colSpan={cols.length} className="text-muted">{empty}</td></tr>}</tbody>
  </table></div>
);

export const SentimentSummary = ({ data }) => data ? (
  <div>
    <div className="d-flex gap-3 mb-2">
      {['Positive', 'Neutral', 'Negative'].map((k) => <div key={k} className="text-center"><Badge text={k} /><div className="fs-5">{data.sentiment[k]}</div><div className="small text-muted">{data.overall_percent[k]}%</div></div>)}
    </div>
    <div className="progress" style={{ height: 14 }}>
      {['Positive', 'Neutral', 'Negative'].map((k) => <div key={k} className={`progress-bar bg-${COLOR[k]}`} style={{ width: `${data.overall_percent[k]}%` }} />)}
    </div>
  </div>
) : null;

export const Insights = ({ ins }) => ins ? (
  <div className="row g-3">
    <div className="col-md-6"><h6 className="text-success">Positive topics</h6><Bars color="success" rows={ins.positive_topics.map((t) => ({ label: t.topic, value: t.mentions }))} />
      <h6 className="text-success mt-3">Highlights</h6>{ins.positive_highlights.map((h) => <span key={h.label} className="chip">{h.label} ({h.mentions})</span>)}</div>
    <div className="col-md-6"><h6 className="text-danger">Negative topics</h6><Bars color="danger" rows={ins.negative_topics.map((t) => ({ label: t.topic, value: t.mentions }))} />
      <h6 className="text-danger mt-3">Issues</h6>{ins.negative_issues.map((h) => <span key={h.label} className="chip">{h.label} ({h.mentions})</span>)}</div>
    <div className="col-md-6"><h6>Instructor feedback</h6>
      {['Positive', 'Neutral', 'Negative'].map((k) => <Badge key={k} text={k} extra={ins.instructor_feedback.counts[k]} />)}
      {ins.instructor_feedback.samples.map((s, i) => <div key={i} className="small text-muted fst-italic">“{s.text}”</div>)}</div>
    <div className="col-md-6"><h6>Difficulty feedback</h6>{Object.entries(ins.difficulty_feedback).map(([k, v]) => <div key={k} className="small">{k}: <b>{v}</b></div>)}
      <h6 className="mt-2">Most mentioned skills</h6>{ins.top_skills_mentioned.map((s) => <span key={s.skill} className="chip">{s.skill} ({s.mentions})</span>)}</div>
  </div>
) : <div className="text-muted small">Not enough reviews for insights yet.</div>;

export const WorkshopMeta = ({ w }) => (
  <div className="small text-muted">
    {w.category} · {w.difficulty} · {w.mode === 'Online' ? 'Online' : w.location} · {String(w.event_date).slice(0, 10)} {String(w.start_time).slice(0, 5)}–{String(w.end_time).slice(0, 5)} · {Number(w.fee) ? `₹${Number(w.fee)}` : 'Free'} · ⭐ {Number(w.rating_avg || 0).toFixed(1)} ({w.review_count})
  </div>
);
