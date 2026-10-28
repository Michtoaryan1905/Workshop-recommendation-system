import React, { useCallback, useEffect, useState } from 'react';
import api, { errMsg } from '../api';
import { Alert, Badge, Bars, Insights, SentimentSummary, Table } from '../components.jsx';

const TABS = ['Overview', 'Users', 'Workshops', 'Categories', 'Registrations', 'Reviews', 'Reports', 'Clusters', 'A/B Test', 'Risk Management', 'Audit Log'];
const fmt = (d) => String(d).slice(0, 16);

export default function Admin() {
  const [tab, setTab] = useState('Overview'); const [d, setD] = useState(null); const [err, setErr] = useState(''); const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '' }); const [cat, setCat] = useState('');
  const paths = { Users: '/admin/users', Workshops: '/admin/workshops', Categories: '/categories', Registrations: '/admin/registrations', Reviews: '/admin/reviews', Reports: '/admin/reports', Clusters: '/admin/clusters', 'A/B Test': '/admin/abtest', 'Audit Log': '/admin/audit', Overview: '/admin/analytics' };
  const load = useCallback(() => { setD(null); setErr(''); if (tab === 'Risk Management') { setD({}); return; } api.get(paths[tab]).then((r) => setD(r.data)).catch((e) => setErr(errMsg(e))); /* eslint-disable-next-line */ }, [tab]);
  useEffect(() => { load(); }, [load]);
  const act = async (fn, ok) => { setErr(''); setMsg(''); try { await fn(); setMsg(ok); load(); } catch (e) { setErr(errMsg(e)); } };

  return (
    <>
      <ul className="nav nav-pills mb-3 flex-wrap">{TABS.map((t) => <li key={t} className="nav-item"><button className={`nav-link ${tab === t ? 'active' : ''}`} onClick={() => { setTab(t); setMsg(''); }}>{t}</button></li>)}</ul>
      <Alert msg={err} /><Alert msg={msg} type="success" />
      {!d && !err && <div>Loading…</div>}
      {d && tab === 'Overview' && <Overview d={d} />}
      {d && tab === 'Users' && <>
        <form className="row g-2 mb-3" onSubmit={(e) => { e.preventDefault(); act(() => api.post('/admin/organizers', form).then(() => setForm({ name: '', email: '', password: '' })), 'Organizer created'); }}>
          <div className="col-md-3"><input className="form-control" placeholder="Organizer name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="col-md-3"><input className="form-control" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
          <div className="col-md-3"><input className="form-control" type="password" placeholder="Password (min 8)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
          <div className="col-md-3"><button className="btn btn-primary">Add organizer</button></div>
        </form>
        <Table rows={d} cols={[{ label: 'Name', key: 'name' }, { label: 'Email', key: 'email' }, { label: 'Role', key: 'role' }, { label: 'Level', key: 'skill_level' }, { label: 'A/B', key: 'ab_group' }, { label: 'Status', render: (u) => <Badge text={u.status} /> },
          { label: '', render: (u) => u.role !== 'admin' && <button className="btn btn-sm btn-outline-secondary" onClick={() => act(() => api.patch(`/admin/users/${u.id}/status`, { status: u.status === 'active' ? 'blocked' : 'active' }), 'User updated')}>{u.status === 'active' ? 'Block' : 'Unblock'}</button> }]} />
      </>}
      {d && tab === 'Workshops' && <Table rows={d} cols={[{ label: 'Title', key: 'title' }, { label: 'Organizer', key: 'organizer' }, { label: 'Category', key: 'category' }, { label: 'Date', render: (w) => String(w.event_date).slice(0, 10) }, { label: 'Status', render: (w) => <Badge text={w.status} /> },
        { label: '', render: (w) => <div className="btn-group btn-group-sm">
          {w.status !== 'approved' && <button className="btn btn-success" onClick={() => act(() => api.patch(`/admin/workshops/${w.id}/status`, { status: 'approved' }), 'Approved')}>Approve</button>}
          {w.status !== 'rejected' && <button className="btn btn-warning" onClick={() => act(() => api.patch(`/admin/workshops/${w.id}/status`, { status: 'rejected' }), 'Rejected')}>Reject</button>}
          <button className="btn btn-outline-danger" onClick={() => window.confirm('Delete workshop?') && act(() => api.delete(`/workshops/${w.id}`), 'Deleted')}>Delete</button></div> }]} />}
      {d && tab === 'Categories' && <>
        <form className="input-group mb-3 w-50" onSubmit={(e) => { e.preventDefault(); act(() => api.post('/admin/categories', { name: cat }).then(() => setCat('')), 'Category added'); }}>
          <input className="form-control" placeholder="New category" value={cat} onChange={(e) => setCat(e.target.value)} required /><button className="btn btn-primary">Add</button></form>
        <Table rows={d} cols={[{ label: 'Category', key: 'name' }, { label: '', render: (c) => <div className="btn-group btn-group-sm">
          <button className="btn btn-outline-secondary" onClick={() => { const n = window.prompt('Rename category', c.name); if (n) act(() => api.put(`/admin/categories/${c.id}`, { name: n }), 'Renamed'); }}>Rename</button>
          <button className="btn btn-outline-danger" onClick={() => act(() => api.delete(`/admin/categories/${c.id}`), 'Deleted')}>Delete</button></div> }]} /></>}
      {d && tab === 'Registrations' && <Table rows={d} cols={[{ label: 'Student', key: 'user_name' }, { label: 'Workshop', key: 'workshop' }, { label: 'On', render: (r) => fmt(r.created_at) }]} />}
      {d && tab === 'Reviews' && <Table rows={d} cols={[{ label: 'Workshop', key: 'workshop' }, { label: 'By', key: 'user_name' }, { label: '⭐', key: 'rating' }, { label: 'Sentiment', render: (r) => r.sentiment && <Badge text={r.sentiment} extra={Number(r.sentiment_confidence).toFixed(2)} /> }, { label: 'Comment', key: 'comment' }, { label: 'Hidden', render: (r) => (r.hidden ? 'Yes' : '') }]} />}
      {d && tab === 'Reports' && <Table rows={d} empty="No reported content" cols={[{ label: 'Workshop', key: 'workshop' }, { label: 'Review', key: 'comment' }, { label: 'Reason', key: 'reason' }, { label: 'By', key: 'reporter' }, { label: 'Status', render: (r) => <Badge text={r.status} /> },
        { label: '', render: (r) => r.status === 'open' && <div className="btn-group btn-group-sm"><button className="btn btn-danger" onClick={() => act(() => api.patch(`/admin/reports/${r.id}`, { action: 'remove' }), 'Review removed')}>Remove review</button><button className="btn btn-outline-secondary" onClick={() => act(() => api.patch(`/admin/reports/${r.id}`, { action: 'dismiss' }), 'Dismissed')}>Dismiss</button></div> }]} />}
      {d && tab === 'Clusters' && <div className="row g-3">{d.clusters?.map((c) => <div key={c.cluster} className="col-md-6"><div className="card p-3 shadow-sm h-100"><h6>Cluster {c.cluster}: {c.label}</h6><div className="small text-muted mb-1">{c.workshops.length} workshops · {c.users} students</div>{c.workshops.map((t) => <div key={t} className="small">• {t}</div>)}</div></div>)}{d.error && <Alert msg={d.error} />}</div>}
      {tab === 'Risk Management' && <RiskManagement />}
      {d && tab === 'A/B Test' && <AB d={d} />}
      {d && tab === 'Audit Log' && <Table rows={d} cols={[{ label: 'Time', render: (a) => fmt(a.created_at) }, { label: 'User', key: 'user_name' }, { label: 'Action', key: 'action' }, { label: 'Entity', render: (a) => `${a.entity || ''} ${a.entity_id || ''}` }, { label: 'Details', key: 'details' }]} />}
    </>
  );
}

function RiskManagement() {
  const initial = [
    { id: 1, risk: 'Low workshop registrations', probability: 3, impact: 3, mitigation: 'Improve recommendations, workshop visibility and pricing', owner: 'Admin', status: 'Open' },
    { id: 2, risk: 'Incorrect recommendations', probability: 3, impact: 3, mitigation: 'Review recommendation scores and improve user preference data', owner: 'ML Team', status: 'Open' },
    { id: 3, risk: 'Unauthorized access', probability: 2, impact: 3, mitigation: 'Enforce RBAC, authentication and audit logging', owner: 'Admin', status: 'Mitigated' },
    { id: 4, risk: 'Negative workshop feedback', probability: 2, impact: 2, mitigation: 'Monitor sentiment and address recurring review issues', owner: 'Organizer', status: 'Monitoring' },
    { id: 5, risk: 'Server/database failure', probability: 1, impact: 3, mitigation: 'Regular backups and service health monitoring', owner: 'Admin', status: 'Monitoring' }
  ];
  const [risks, setRisks] = useState(initial);
  const [form, setForm] = useState({ risk: '', probability: 1, impact: 1, mitigation: '', owner: 'Admin' });
  const level = (score) => score >= 7 ? { text: 'High', cls: 'danger' } : score >= 4 ? { text: 'Medium', cls: 'warning' } : { text: 'Low', cls: 'success' };
  const addRisk = (e) => {
    e.preventDefault();
    if (!form.risk.trim()) return;
    setRisks([...risks, { ...form, id: Date.now(), probability: +form.probability, impact: +form.impact, status: 'Open' }]);
    setForm({ risk: '', probability: 1, impact: 1, mitigation: '', owner: 'Admin' });
  };
  const high = risks.filter((r) => r.probability * r.impact >= 7).length;
  const medium = risks.filter((r) => { const s = r.probability * r.impact; return s >= 4 && s < 7; }).length;
  const low = risks.filter((r) => r.probability * r.impact < 4).length;
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div><h4 className="mb-1">ITPM Risk Management</h4><div className="text-muted small">Identify, assess, prioritize and mitigate project risks.</div></div>
      </div>
      <div className="row g-2 mb-3">
        <div className="col-md-4"><div className="card p-3 shadow-sm border-danger"><div className="text-muted small">High Risks</div><div className="fs-3 text-danger">{high}</div></div></div>
        <div className="col-md-4"><div className="card p-3 shadow-sm border-warning"><div className="text-muted small">Medium Risks</div><div className="fs-3 text-warning">{medium}</div></div></div>
        <div className="col-md-4"><div className="card p-3 shadow-sm border-success"><div className="text-muted small">Low Risks</div><div className="fs-3 text-success">{low}</div></div></div>
      </div>
      <div className="card p-3 shadow-sm mb-3">
        <h6>Add Project Risk</h6>
        <form className="row g-2" onSubmit={addRisk}>
          <div className="col-md-3"><input className="form-control" placeholder="Risk description" value={form.risk} onChange={(e) => setForm({ ...form, risk: e.target.value })} required /></div>
          <div className="col-md-2"><select className="form-select" value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })}><option value="1">Probability: Low</option><option value="2">Probability: Medium</option><option value="3">Probability: High</option></select></div>
          <div className="col-md-2"><select className="form-select" value={form.impact} onChange={(e) => setForm({ ...form, impact: e.target.value })}><option value="1">Impact: Low</option><option value="2">Impact: Medium</option><option value="3">Impact: High</option></select></div>
          <div className="col-md-2"><input className="form-control" placeholder="Mitigation action" value={form.mitigation} onChange={(e) => setForm({ ...form, mitigation: e.target.value })} /></div>
          <div className="col-md-2"><input className="form-control" placeholder="Owner" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} /></div>
          <div className="col-md-1"><button className="btn btn-primary w-100">Add</button></div>
        </form>
      </div>
      <div className="card shadow-sm"><div className="card-body">
        <h6>Risk Register</h6>
        <div className="table-responsive"><table className="table table-sm table-hover align-middle">
          <thead><tr><th>Risk</th><th>Probability</th><th>Impact</th><th>Score</th><th>Level</th><th>Mitigation</th><th>Owner</th><th>Status</th></tr></thead>
          <tbody>{risks.map((r) => { const score = r.probability * r.impact; const l = level(score); return <tr key={r.id}><td><b>{r.risk}</b></td><td>{['', 'Low', 'Medium', 'High'][r.probability]}</td><td>{['', 'Low', 'Medium', 'High'][r.impact]}</td><td><b>{score}/9</b></td><td><span className={`badge bg-${l.cls}`}>{l.text}</span></td><td>{r.mitigation || '—'}</td><td>{r.owner}</td><td><span className={`badge ${r.status === 'Mitigated' ? 'bg-success' : r.status === 'Monitoring' ? 'bg-info' : 'bg-warning'}`}>{r.status}</span></td></tr>; })}</tbody>
        </table></div>
      </div></div>
    </div>
  );
}

function Overview({ d }) {
  const { overview: o, sentiment, clicks: c } = d; const rows = (a, k = 'title') => a.map((x) => ({ label: x[k], value: +x.n }));
  return (
    <>
      <div className="row g-2 mb-3">{Object.entries(o).map(([k, v]) => <div key={k} className="col-6 col-md-3 col-lg"><div className="card p-2 text-center shadow-sm"><div className="fs-4">{v}</div><div className="small text-muted">{k.replace('_', ' ')}</div></div></div>)}</div>
      <div className="card p-3 shadow-sm mb-3"><h5>Overall review sentiment</h5><SentimentSummary data={sentiment} /><div className="mt-3"><Insights ins={sentiment.insights} /></div></div>
      <div className="card p-3 shadow-sm mb-3"><h5>Clickstream funnel · conversion rate {c.conversion_rate}% (registrations ÷ workshop views)</h5><Bars rows={c.funnel.map((f) => ({ label: f.step, value: f.count }))} />
        <h6 className="mt-3">Common user journeys</h6>{c.top_paths.map((p) => <div key={p.path} className="small">{p.path} <Badge text={`${p.count}×`} /></div>)}</div>
      <div className="row g-3">
        <div className="col-md-4"><div className="card p-3 shadow-sm"><h6>Most searched</h6><Bars rows={rows(c.most_searched, 'query')} /></div></div>
        <div className="col-md-4"><div className="card p-3 shadow-sm"><h6>Most viewed</h6><Bars rows={rows(c.most_viewed)} /></div></div>
        <div className="col-md-4"><div className="card p-3 shadow-sm"><h6>Most clicked</h6><Bars rows={rows(c.most_clicked)} /></div></div>
        <div className="col-md-4"><div className="card p-3 shadow-sm"><h6>Most registered</h6><Bars rows={rows(c.most_registered)} color="success" /></div></div>
        <div className="col-md-4"><div className="card p-3 shadow-sm"><h6>Popular categories (views + 3×registrations)</h6><Bars rows={c.popular_categories.map((x) => ({ label: x.name, value: +x.views + 3 * +x.registrations }))} color="info" /></div></div>
        <div className="col-md-4"><div className="card p-3 shadow-sm"><h6>Popular skills</h6><Bars rows={c.popular_skills.map((x) => ({ label: x.skill, value: +x.views + 3 * +x.registrations }))} color="warning" /></div></div>
      </div>
    </>
  );
}

function AB({ d }) {
  return (
    <>
      <div className="row g-3">{['A', 'B'].map((k) => { const a = d.algorithms[k]; return (
        <div key={k} className="col-md-6"><div className="card p-3 shadow-sm"><h5>Algorithm {k}</h5><div className="small text-muted mb-2">{a.name}</div>
          <div>Students: <b>{a.users}</b> · Recommendations shown: <b>{a.shown}</b></div><div>Click rate: <b>{a.click_rate}%</b> ({a.clicks})</div>
          <div>Registration rate: <b>{a.registration_rate}%</b> ({a.registrations})</div><div>Click → registration: <b>{a.click_to_registration}%</b></div></div></div>); })}</div>
      <div className="alert alert-primary mt-3"><b>Result:</b> {d.winner}<div className="small">p-value (registration): {d.p_value_registration ?? 'n/a'} · p-value (click): {d.p_value_click ?? 'n/a'} — {d.note}</div></div>
    </>
  );
}
