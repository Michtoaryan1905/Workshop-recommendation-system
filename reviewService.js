const repo = require('../repositories/reviewRepository');
const wRepo = require('../repositories/workshopRepository');
const regRepo = require('../repositories/registrationRepository');
const ml = require('./mlClient');
const events = require('./eventService');
const audit = require('./auditService');
const notify = require('./notificationService');
const { HttpError } = require('../utils/httpError');

module.exports = {
  /** rating + review text; sentiment is computed by the ML service and stored */
  submit: async (user, workshopId, { rating, comment }, session_id) => {
    rating = +rating;
    if (!(rating >= 1 && rating <= 5)) throw new HttpError(400, 'rating must be 1-5');
    const w = await wRepo.findById(workshopId);
    if (!w) throw new HttpError(404, 'Workshop not found');
    if (!(await regRepo.find(user.id, workshopId))) throw new HttpError(403, 'Only registered attendees can review');
    comment = (comment || '').trim();
    const s = comment ? await ml.sentiment(comment) : null;
    await repo.upsert({ user_id: user.id, workshop_id: workshopId, rating, comment, sentiment: s?.sentiment || null, confidence: s?.confidence ?? null });
    await wRepo.refreshRating(workshopId);
    await events.track({ user_id: user.id, session_id, event_type: 'rating', workshop_id: workshopId });
    if (comment) await events.track({ user_id: user.id, session_id, event_type: 'review', workshop_id: workshopId });
    await audit.log(user.id, 'REVIEW', 'workshop', workshopId, `rating ${rating}`);
    await notify.to(w.organizer_id, `New ${rating}★ review on "${w.title}"${s ? ` (${s.sentiment})` : ''}.`);
    return { sentiment: s?.sentiment || null, confidence: s?.confidence ?? null };
  },
  list: (workshopId) => repo.byWorkshop(workshopId),
  mine: (u) => repo.byUser(u),
  report: async (user, reviewId, reason) => {
    if (!reason) throw new HttpError(400, 'reason required');
    if (!(await repo.byId(reviewId))) throw new HttpError(404, 'Review not found');
    await repo.report(reviewId, user.id, reason);
    await audit.log(user.id, 'REPORT_REVIEW', 'review', reviewId, reason);
    await notify.toAdmins('A review was reported and needs moderation.');
  },
  /** Review analytics: topics, instructor/difficulty feedback, skills mentioned (per workshop, organizer or whole platform) */
  insights: async (where, params) => {
    const rows = await repo.textsFor(where, params);
    const counts = Object.fromEntries((await repo.sentimentCounts(where, params)).map((c) => [c.sentiment, c.n]));
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const base = { sentiment: { Positive: counts.Positive || 0, Neutral: counts.Neutral || 0, Negative: counts.Negative || 0 },
      overall_percent: Object.fromEntries(['Positive', 'Neutral', 'Negative'].map((k) => [k, total ? +(100 * (counts[k] || 0) / total).toFixed(1) : 0])) };
    const ins = rows.length ? await ml.insights(rows.map((r) => ({ text: r.text, rating: r.rating }))) : null;
    return { ...base, insights: ins };
  },
};
