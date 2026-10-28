const repo = require('../repositories/workshopRepository');
const misc = require('../repositories/miscRepository');
const ml = require('./mlClient');
const events = require('./eventService');

/** Plain filters (SQL) + optional natural-language query (NLP parse -> TF-IDF ranking). */
module.exports = {
  search: async (q, user, session_id) => {
    const filters = { status: 'approved', upcoming: true, category: q.category, level: q.level, mode: q.mode, location: q.location, maxFee: q.maxFee, from: q.from, to: q.to };
    let parsed = null;
    if (q.q && q.q.trim()) {
      parsed = await ml.analyzeQuery(q.q);
      if (parsed) { // explicit UI filters win; otherwise use what the NLP parser found
        filters.level = filters.level || parsed.level || undefined;
        filters.mode = filters.mode || parsed.mode || undefined;
        filters.location = filters.location || parsed.location || undefined;
      }
    }
    let list = await repo.find(filters);
    if (q.q && q.q.trim()) {
      const understood = parsed && (parsed.skills.length || parsed.interests.length || parsed.keywords.length);
      let ranked = null;
      if (understood && list.length) {
        const pop = Object.fromEntries((await repo.popularity()).map((p) => [p.workshop_id, p.n]));
        const r = await ml.recommend({
          user: { skills: parsed.skills, interests: parsed.interests, level: parsed.level, query_text: parsed.keywords.join(' '), preferred_location: parsed.location },
          workshops: list.map((w) => ({ ...w, popularity: pop[w.id] || 0 })), algorithm: 'A', top_n: 50 }).catch(() => null);
        if (r) ranked = r.recommendations.filter((x) => x.similarity_score > 3);
      }
      if (ranked) {
        const byId = Object.fromEntries(list.map((w) => [w.id, w]));
        list = ranked.map((x) => ({ ...byId[x.workshop_id], match_score: x.similarity_score, reasons: x.recommendation_reasons }));
      } else {
        const term = q.q.toLowerCase();
        list = list.filter((w) => `${w.title} ${w.description}`.toLowerCase().includes(term));
      }
    }
    await misc.addSearch(user?.id, q.q || '(filters)', parsed).catch(() => {});
    await events.track({ user_id: user?.id, session_id, event_type: 'search', meta: { q: q.q || '', results: list.length } });
    return { query: q.q || '', parsed, count: list.length, workshops: list };
  },
};
