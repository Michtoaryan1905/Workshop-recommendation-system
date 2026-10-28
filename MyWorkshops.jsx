import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Badge, Table } from '../components.jsx';

export default function MyWorkshops() {
  const [h, setH] = useState(null);
  useEffect(() => { api.get('/users/history').then((r) => setH(r.data)); }, []);
  if (!h) return <div>Loading…</div>;
  const today = new Date().toISOString().slice(0, 10);
  const up = h.workshops.filter((w) => String(w.event_date).slice(0, 10) >= today), past = h.workshops.filter((w) => String(w.event_date).slice(0, 10) < today);
  const cols = [{ label: 'Workshop', render: (w) => <Link to={`/workshops/${w.id}`}>{w.title}</Link> }, { label: 'Category', key: 'category' }, { label: 'Date', render: (w) => String(w.event_date).slice(0, 10) },
    { label: 'Where', render: (w) => (w.mode === 'Online' ? 'Online' : w.location) }];
  const mine = Object.fromEntries(h.reviews.map((r) => [r.workshop_id, r]));
  return (
    <>
      <h5>Registered (upcoming)</h5><Table cols={cols} rows={up} empty="You have no upcoming registrations" />
      <h5 className="mt-4">Workshop history</h5>
      <Table cols={[...cols, { label: 'My review', render: (w) => (mine[w.id] ? <>⭐ {mine[w.id].rating} {mine[w.id].sentiment && <Badge text={mine[w.id].sentiment} />}</> : <Link to={`/workshops/${w.id}`}>Rate & review</Link>) }]} rows={past} empty="No past workshops yet" />
      <h5 className="mt-4">Search history</h5>
      <Table cols={[{ label: 'Query', key: 'query' }, { label: 'When', render: (s) => String(s.created_at).slice(0, 16) }]} rows={h.searches.map((s, i) => ({ ...s, id: i }))} />
    </>
  );
}
