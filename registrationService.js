const repo = require('../repositories/registrationRepository');
const wRepo = require('../repositories/workshopRepository');
const audit = require('./auditService');
const notify = require('./notificationService');
const events = require('./eventService');
module.exports = {
  register: async (user, workshopId, session_id) => {
    const w = await repo.register(user.id, workshopId);
    await events.track({ user_id: user.id, session_id, event_type: 'registration', workshop_id: workshopId });
    await audit.log(user.id, 'REGISTER_WORKSHOP', 'workshop', workshopId, w.title);
    await notify.to(user.id, `You are registered for "${w.title}".`);
    await notify.to(w.organizer_id, `${user.name} registered for "${w.title}".`);
    return { message: 'Registered successfully', workshop_id: workshopId };
  },
  mine: (userId) => repo.byUser(userId),
  forWorkshop: (id) => repo.byWorkshop(id),
  all: () => repo.all(),
  find: repo.find,
};
