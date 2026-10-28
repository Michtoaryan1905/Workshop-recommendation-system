const misc = require('../repositories/miscRepository');
module.exports = { log: (userId, action, entity, id, details) => misc.audit(userId, action, entity, id, details).catch(() => {}), list: () => misc.auditLogs() };
