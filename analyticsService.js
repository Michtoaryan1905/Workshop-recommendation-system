const repo = require('../repositories/analyticsRepository');
const wRepo = require('../repositories/workshopRepository');
const uRepo = require('../repositories/userRepository');
const ml = require('./mlClient');
const reviews = require('./reviewService');

const { zTest } = require('../utils/stats');
const pct = (a, b) => (b ? +(100 * a / b).toFixed(1) : 0);

module.exports = {
  zTest,
  abTest: async () => {
    const rows = await repo.abStats();
    const g = { A: { shown: 0, users: 0, clicks: 0, registrations: 0 }, B: { shown: 0, users: 0, clicks: 0, registrations: 0 } };
    rows.forEach((r) => { g[r.algorithm] = { shown: +r.shown, users: +r.users, clicks: +r.clicks, registrations: +r.registrations }; });
    for (const k of ['A', 'B']) Object.assign(g[k], { click_rate: pct(g[k].clicks, g[k].shown), registration_rate: pct(g[k].registrations, g[k].shown), click_to_registration: pct(g[k].registrations, g[k].clicks) });
    const enough = g.A.shown >= 30 && g.B.shown >= 30;
    let winner = 'No clear winner yet';
    if (g.A.shown && g.B.shown) {
      const sa = g.A.registration_rate + g.A.click_rate / 10, sb = g.B.registration_rate + g.B.click_rate / 10;
      winner = sa === sb ? 'Tie' : `Algorithm ${sb > sa ? 'B' : 'A'} performs better`;
    }
    return { algorithms: { A: { name: 'TF-IDF + Cosine Similarity', ...g.A }, B: { name: 'TF-IDF + Cosine + Ratings + Popularity + User History', ...g.B } },
      winner, p_value_registration: zTest(g.A.registrations, g.A.shown, g.B.registrations, g.B.shown),
      p_value_click: zTest(g.A.clicks, g.A.shown, g.B.clicks, g.B.shown),
      note: enough ? 'p < 0.05 suggests the difference is statistically significant.' : 'Fewer than 30 impressions per group: treat the result as indicative only.' };
  },
  clicks: async () => {
    const [funnel, cats, skills, ev] = await Promise.all([repo.funnel(), repo.popularCategories(), repo.popularSkills(), repo.recentEvents()]);
    const f = Object.fromEntries(funnel.map((r) => [r.event_type, +r.n]));
    const bySession = {};
    ev.reverse().forEach((e) => { (bySession[e.session_id] ||= []).push(e.event_type); });
    const paths = {};
    Object.values(bySession).forEach((seq) => { const p = seq.filter((x, i) => x !== seq[i - 1]).slice(0, 7).join(' → '); if (seq.length > 1) paths[p] = (paths[p] || 0) + 1; });
    return {
      funnel: ['login', 'search', 'view_workshop', 'click_workshop', 'view_review', 'click_register', 'registration', 'review'].map((s) => ({ step: s, count: f[s] || 0 })),
      conversion_rate: pct(f.registration || 0, f.view_workshop || 0),
      most_searched: await repo.topQueries(), most_viewed: await repo.topByEvent('view_workshop'), most_clicked: await repo.topByEvent('click_workshop'),
      most_registered: await repo.topRegistered(), popular_categories: cats, popular_skills: skills,
      top_paths: Object.entries(paths).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([path, count]) => ({ path, count })),
    };
  },
  clusters: async (k = 4) => {
    const workshops = (await wRepo.find({ status: 'approved' })).map((w) => ({ id: w.id, title: w.title, category: w.category, sub_category: w.sub_category, skills: w.skills || [], keywords: w.keywords || [] }));
    const students = (await uRepo.students()).map((u) => ({ id: u.id, skills: u.skills || [], interests: u.interests || [] }));
    return (await ml.cluster(workshops, students, k)) || { clusters: [], user_clusters: {}, error: 'ML service unavailable' };
  },
  admin: async () => ({
    overview: await repo.overview(),
    sentiment: await reviews.insights('1=1', []),
    clicks: await module.exports.clicks(),
  }),
  organizer: async (organizerId) => ({
    workshops: await repo.organizer(organizerId),
    sentiment: await reviews.insights('w.organizer_id=?', [organizerId]),
  }),
};
