const bcrypt = require('bcryptjs');
const users = require('../repositories/userRepository');
const wRepo = require('../repositories/workshopRepository');
const rRepo = require('../repositories/reviewRepository');
const audit = require('./auditService');
const notify = require('./notificationService');
const { HttpError } = require('../utils/httpError');
module.exports = {
  users: (role) => users.list(role),
  createOrganizer: async (admin, { name, email, password }) => {
    if (!name || !email || !password || password.length < 8) throw new HttpError(400, 'name, email and password (min 8 chars) required');
    if (await users.findByEmail(email.toLowerCase())) throw new HttpError(409, 'Email already registered');
    const id = await users.create({ name, email: email.toLowerCase(), role: 'organizer', password_hash: await bcrypt.hash(password, 10) });
    await audit.log(admin.id, 'CREATE_ORGANIZER', 'user', id, email);
    return users.findById(id);
  },
  setUserStatus: async (admin, id, status) => {
    if (!['active', 'blocked'].includes(status)) throw new HttpError(400, 'status must be active or blocked');
    const u = await users.findById(id); if (!u) throw new HttpError(404, 'User not found');
    if (u.role === 'admin') throw new HttpError(403, 'Cannot change an admin');
    await users.setStatus(id, status); await audit.log(admin.id, `USER_${status.toUpperCase()}`, 'user', id, u.email);
  },
  categories: () => wRepo.categories(),
  addCategory: async (admin, name) => { if (!name) throw new HttpError(400, 'name required'); const id = await wRepo.addCategory(name.trim()); await audit.log(admin.id, 'ADD_CATEGORY', 'category', id, name); return { id, name }; },
  renameCategory: async (admin, id, name) => { await wRepo.renameCategory(id, name.trim()); await audit.log(admin.id, 'RENAME_CATEGORY', 'category', id, name); },
  deleteCategory: async (admin, id) => {
    if (await wRepo.categoryInUse(id)) throw new HttpError(409, 'Category has workshops; reassign them first');
    await wRepo.deleteCategory(id); await audit.log(admin.id, 'DELETE_CATEGORY', 'category', id, '');
  },
  reports: () => rRepo.reports(),
  /** moderate a reported review: remove (hide) it or dismiss the report */
  resolveReport: async (admin, id, action) => {
    const rep = await rRepo.reportById(id); if (!rep) throw new HttpError(404, 'Report not found');
    if (action === 'remove') { await rRepo.setHidden(rep.review_id, true); const r = await rRepo.byId(rep.review_id); await wRepo.refreshRating(r.workshop_id); await notify.to(r.user_id, 'One of your reviews was removed by a moderator.'); }
    else if (action !== 'dismiss') throw new HttpError(400, 'action must be remove or dismiss');
    await rRepo.setReportStatus(id, action === 'remove' ? 'removed' : 'dismissed');
    await audit.log(admin.id, `REPORT_${action.toUpperCase()}`, 'review', rep.review_id, '');
  },
  reviews: () => rRepo.all(),
};
