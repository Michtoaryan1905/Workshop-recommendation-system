const misc = require('../repositories/miscRepository');
const TYPES = ['login', 'search', 'view_workshop', 'click_workshop', 'view_review', 'click_register', 'registration', 'review', 'rating', 'reco_click'];
module.exports = {
  TYPES,
  track: async (e) => {
    if (!TYPES.includes(e.event_type)) return;
    await misc.addEvent(e).catch(() => {});
    if (e.event_type === 'reco_click' && e.user_id && e.workshop_id) await misc.markRecClicked(e.user_id, e.workshop_id).catch(() => {});
  },
};
