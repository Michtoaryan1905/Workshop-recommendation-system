const crypto = require('crypto');
const users = require('../repositories/userRepository');
const wRepo = require('../repositories/workshopRepository');
const regRepo = require('../repositories/registrationRepository');
const misc = require('../repositories/miscRepository');
const ml = require('./mlClient');

/** Random, persistent 50/50 assignment for A/B testing (students only). */
async function ensureGroup(u) {
  if (u.ab_group) return u.ab_group;
  const g = crypto.randomInt(2) === 0 ? 'A' : 'B';
  await users.setAbGroup(u.id, g);
  return g;
}
const slim = (w) => ({ id: w.id, title: w.title, description: w.description, category: w.category, sub_category: w.sub_category,
  skills: w.skills || [], keywords: w.keywords || [], difficulty: w.difficulty, location: w.location, mode: w.mode,
  rating_avg: w.rating_avg, review_count: w.review_count, popularity: w.popularity || 0 });

module.exports = {
  ensureGroup,
  recommend: async (userId, topN = 10) => {
    const u = await users.findById(userId);
    const algorithm = u.role === 'student' ? await ensureGroup(u) : 'A';
    const mine = await regRepo.byUser(userId);
    const taken = new Set(mine.map((r) => r.id));
    const pop = Object.fromEntries((await wRepo.popularity()).map((p) => [p.workshop_id, p.n]));
    const candidates = (await wRepo.find({ status: 'approved', upcoming: true, hasSeats: true }))
      .filter((w) => !taken.has(w.id)).map((w) => slim({ ...w, popularity: pop[w.id] || 0 }));
    const res = await ml.recommend({
      user: { skills: u.skills || [], interests: u.interests || [], level: u.skill_level, career_goal: u.career_goal,
        preferred_location: u.preferred_location, preferred_mode: u.preferred_mode },
      workshops: candidates, history: mine.map(slim), algorithm, top_n: topN });
    const byId = Object.fromEntries(candidates.map((w) => [w.id, w]));
    for (const r of res.recommendations) {
      await misc.upsertRec({ user_id: userId, workshop_id: r.workshop_id, score: r.similarity_score, reasons: r.recommendation_reasons, algorithm });
    }
    return { algorithm, recommendations: res.recommendations.map((r) => ({ ...r, workshop: byId[r.workshop_id] })) };
  },
  history: (userId) => misc.recHistory(userId),
};
