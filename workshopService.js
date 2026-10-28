const repo = require('../repositories/workshopRepository');
const ml = require('./mlClient');
const audit = require('./auditService');
const notify = require('./notificationService');
const { HttpError } = require('../utils/httpError');

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
async function normalize(b) {
  const req = ['title', 'description', 'category', 'instructor', 'event_date', 'start_time', 'end_time', 'capacity'];
  for (const k of req) if (b[k] === undefined || b[k] === '') throw new HttpError(400, `${k} is required`);
  if (!LEVELS.includes(b.difficulty)) throw new HttpError(400, 'difficulty must be Beginner, Intermediate or Advanced');
  if (!['Online', 'Offline'].includes(b.mode)) throw new HttpError(400, 'mode must be Online or Offline');
  if (+b.capacity < 1) throw new HttpError(400, 'capacity must be >= 1');
  const cat = await repo.categoryByName(b.category);
  if (!cat) throw new HttpError(400, 'Unknown category');
  const list = (v) => (Array.isArray(v) ? v : String(v || '').split(',')).map((s) => s.trim()).filter(Boolean);
  return { ...b, category_id: cat.id, skills: list(b.skills), location: b.location || 'Online', fee: +b.fee || 0, capacity: +b.capacity };
}
/** NLP step: store keywords extracted from title + description + skills */
async function keywordsFor(w) {
  const r = await ml.extractKeywords(`${w.title}. ${w.description}. ${(w.skills || []).join(', ')}`, 10);
  return r ? r.keywords.map((k) => k.keyword) : (w.skills || []);
}
function assertOwner(w, user) {
  if (!w) throw new HttpError(404, 'Workshop not found');
  if (user.role !== 'admin' && w.organizer_id !== user.id) throw new HttpError(403, 'Not your workshop');
}
module.exports = {
  get: async (id) => { const w = await repo.findById(id); if (!w) throw new HttpError(404, 'Workshop not found'); return w; },
  create: async (b, user) => {
    const w = await normalize(b);
    w.organizer_id = user.role === 'admin' && b.organizer_id ? +b.organizer_id : user.id;
    w.status = user.role === 'admin' ? 'approved' : 'pending';
    w.keywords = await keywordsFor(w);
    const id = await repo.create(w);
    await audit.log(user.id, 'CREATE_WORKSHOP', 'workshop', id, w.title);
    if (w.status === 'pending') await notify.toAdmins(`New workshop awaiting approval: ${w.title}`);
    return repo.findById(id);
  },
  update: async (id, b, user) => {
    const old = await repo.findById(id); assertOwner(old, user);
    const w = await normalize(b);
    const regs = old.capacity - old.available_seats;
    if (w.capacity < regs) throw new HttpError(400, `capacity cannot be below current registrations (${regs})`);
    w.keywords = await keywordsFor(w); // re-run NLP on edited text
    w.status = user.role === 'admin' ? (b.status || old.status) : (old.status === 'approved' ? 'pending' : old.status); // organizer edits go back to review
    await repo.update(id, w, w.capacity - old.capacity);
    await audit.log(user.id, 'UPDATE_WORKSHOP', 'workshop', id, w.title);
    return repo.findById(id);
  },
  remove: async (id, user) => {
    const w = await repo.findById(id); assertOwner(w, user);
    await repo.remove(id); await audit.log(user.id, 'DELETE_WORKSHOP', 'workshop', id, w.title);
  },
  setStatus: async (id, status, user) => {
    if (!['approved', 'rejected', 'pending'].includes(status)) throw new HttpError(400, 'Invalid status');
    const w = await repo.findById(id); if (!w) throw new HttpError(404, 'Workshop not found');
    await repo.setStatus(id, status);
    await audit.log(user.id, `WORKSHOP_${status.toUpperCase()}`, 'workshop', id, w.title);
    await notify.to(w.organizer_id, `Your workshop "${w.title}" was ${status}.`);
  },
  assertOwner,
};
