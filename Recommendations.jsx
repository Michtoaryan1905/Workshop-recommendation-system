import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errMsg, track } from '../api';
import { Alert, ScoreBar, Table, WorkshopMeta } from '../components.jsx';

export default function Recommendations() {
  const nav = useNavigate();
  const [data, setData] = useState(null); const [hist, setHist] = useState([]); const [tab, setTab] = useState('now'); const [err, setErr] = useState('');
  useEffect(() => { api.get('/recommendations').then((r) => setData(r.data)).catch((e) => setErr(errMsg(e))); api.get('/recommendations/history').then((r) => setHist(r.data)); }, []);
  return (
    <>
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item"><button className={`nav-link ${tab === 'now' ? 'active' : ''}`} onClick={() => setTab('now')}>Recommended for you</button></li>
        <li className="nav-item"><button className={`nav-link ${tab === 'hist' ? 'active' : ''}`} onClick={() => setTab('hist')}>Recommendation history</button></li>
      </ul>
      <Alert msg={err} />
      {tab === 'now' && (!data ? !err && <div>Analysing your profile…</div> : (
        <>
          <div className="small text-muted mb-2">Experiment group: Algorithm {data.algorithm} · Complete your profile (skills, interests, level) for better matches.</div>
          {data.recommendations.map((r, i) => (
            <div key={r.workshop_id} className="card mb-3 card-hover" onClick={() => { track('reco_click', r.workshop_id, { rank: i + 1, algorithm: data.algorithm }); nav(`/workshops/${r.workshop_id}`); }}>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center"><h5 className="mb-0">{i + 1}. {r.workshop_name}</h5><span className="fs-5 fw-bold text-success">{Math.round(r.similarity_score)}% match</span></div>
                <ScoreBar value={r.similarity_score} />
                {r.workshop && <WorkshopMeta w={r.workshop} />}
                <div className="mt-2"><b className="small">Why recommended:</b>{r.recommendation_reasons.map((x) => <div key={x} className="reason text-success">✓ {x}</div>)}</div>
              </div>
            </div>
          ))}
          {!data.recommendations.length && <div className="text-muted">No upcoming workshops to recommend right now.</div>}
        </>
      ))}
      {tab === 'hist' && <Table rows={hist} cols={[{ label: 'Workshop', key: 'workshop_name' }, { label: 'Score', render: (r) => `${Number(r.score)}%` }, { label: 'Algorithm', key: 'algorithm' },
        { label: 'Clicked', render: (r) => (r.clicked ? 'Yes' : 'No') }, { label: 'Recommended on', render: (r) => String(r.created_at).slice(0, 16) }]} />}
    </>
  );
}
