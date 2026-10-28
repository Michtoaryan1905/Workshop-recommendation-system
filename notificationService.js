const misc = require('../repositories/miscRepository');
module.exports = {
  to: (userId, msg) => misc.notify(userId, msg).catch(() => {}),
  toAdmins: async (msg) => { for (const id of await misc.adminIds()) await misc.notify(id, msg).catch(() => {}); },
  list: (u) => misc.notifications(u), markAllRead: (u) => misc.markRead(u),
};
