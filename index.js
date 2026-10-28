const r = require('express').Router();
const c = require('../controllers');
const { requireAuth, optionalAuth, requireRole } = require('../middleware/auth');
const student = [requireAuth, requireRole('student')];
const org = [requireAuth, requireRole('organizer', 'admin')];
const adm = [requireAuth, requireRole('admin')];

r.get('/health', (_q, s) => s.json({ status: 'ok' }));
// auth + profile
r.post('/auth/register', c.auth.register); r.post('/auth/login', c.auth.login); r.get('/auth/me', requireAuth, c.auth.me);
r.get('/users/profile', requireAuth, c.profile.get); r.put('/users/profile', requireAuth, c.profile.update); r.get('/users/history', ...student, c.profile.history);
// workshops + search (optionalAuth so anonymous browsing is tracked too)
r.get('/categories', c.workshops.categories);
r.get('/workshops', optionalAuth, c.workshops.list);
r.get('/workshops/:id', c.workshops.get); r.get('/workshops/:id/insights', c.workshops.insights);
r.post('/workshops', ...org, c.workshops.create); r.put('/workshops/:id', ...org, c.workshops.update); r.delete('/workshops/:id', ...org, c.workshops.remove);
// registration, reviews
r.post('/workshops/:id/register', ...student, c.registrations.register); r.get('/registrations/mine', ...student, c.registrations.mine);
r.get('/workshops/:id/reviews', c.reviews.list); r.post('/workshops/:id/reviews', ...student, c.reviews.submit); r.post('/reviews/:id/report', requireAuth, c.reviews.report);
// recommendations, events, notifications
r.get('/recommendations', ...student, c.recommendations.get); r.get('/recommendations/history', ...student, c.recommendations.history);
r.post('/events', optionalAuth, c.events.track);
r.get('/notifications', requireAuth, c.notifications.list); r.post('/notifications/read', requireAuth, c.notifications.read);
// organizer
r.get('/organizer/workshops', ...org, c.organizer.workshops); r.get('/organizer/workshops/:id/registrations', ...org, c.organizer.registrations);
r.get('/organizer/workshops/:id/reviews', ...org, c.organizer.reviews); r.get('/organizer/analytics', ...org, c.organizer.analytics);
// admin
const a = c.admin;
r.get('/admin/analytics', ...adm, a.analytics); r.get('/admin/abtest', ...adm, a.abtest); r.get('/admin/clusters', ...adm, a.clusters);
r.get('/admin/users', ...adm, a.users); r.post('/admin/organizers', ...adm, a.createOrganizer); r.patch('/admin/users/:id/status', ...adm, a.setUserStatus);
r.get('/admin/workshops', ...adm, a.workshops); r.patch('/admin/workshops/:id/status', ...adm, a.setWorkshopStatus);
r.post('/admin/categories', ...adm, a.addCategory); r.put('/admin/categories/:id', ...adm, a.renameCategory); r.delete('/admin/categories/:id', ...adm, a.deleteCategory);
r.get('/admin/registrations', ...adm, a.registrations); r.get('/admin/reviews', ...adm, a.reviews);
r.get('/admin/reports', ...adm, a.reports); r.patch('/admin/reports/:id', ...adm, a.resolveReport); r.get('/admin/audit', ...adm, a.audit);
module.exports = r;
