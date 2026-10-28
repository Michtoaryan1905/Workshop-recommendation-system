const db = require('../config/db');
module.exports = {
  // notifications
  notify: (user_id, message) => db.exec('INSERT INTO notifications (user_id,message) VALUES (?,?)', [user_id, message]),
  notifications: (u) => db.query('SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 50', [u]),
  markRead: (u) => db.exec('UPDATE notifications SET is_read=1 WHERE user_id=?', [u]),
  adminIds: async () => (await db.query("SELECT id FROM users WHERE role='admin'")).map((r) => r.id),
  // audit
  audit: (user_id, action, entity, entity_id, details) => db.exec('INSERT INTO audit_logs (user_id,action,entity,entity_id,details) VALUES (?,?,?,?,?)', [user_id || null, action, entity || null, entity_id || null, (details || '').slice(0, 500)]),
  auditLogs: () => db.query('SELECT a.*, u.name user_name FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.id DESC LIMIT 300'),
  // search + recommendation history
  addSearch: (user_id, query, parsed) => db.exec('INSERT INTO search_history (user_id,query,parsed) VALUES (?,?,?)', [user_id || null, query.slice(0, 255), JSON.stringify(parsed || {})]),
  searchesByUser: (u) => db.query('SELECT query, parsed, created_at FROM search_history WHERE user_id=? ORDER BY id DESC LIMIT 30', [u]),
  upsertRec: (r) => db.exec(
    `INSERT INTO recommendation_log (user_id,workshop_id,score,reasons,algorithm) VALUES (?,?,?,?,?)
     ON DUPLICATE KEY UPDATE score=VALUES(score), reasons=VALUES(reasons), algorithm=VALUES(algorithm), created_at=NOW()`,
    [r.user_id, r.workshop_id, r.score, JSON.stringify(r.reasons), r.algorithm]),
  markRecClicked: (u, w) => db.exec('UPDATE recommendation_log SET clicked=1 WHERE user_id=? AND workshop_id=?', [u, w]),
  recHistory: (u) => db.query(`SELECT rl.*, w.title workshop_name, w.event_date FROM recommendation_log rl JOIN workshops w ON w.id=rl.workshop_id WHERE rl.user_id=? ORDER BY rl.created_at DESC, rl.score DESC`, [u]),
  // clickstream events
  addEvent: (e) => db.exec('INSERT INTO events (user_id,session_id,event_type,workshop_id,meta) VALUES (?,?,?,?,?)', [e.user_id || null, e.session_id || 'anon', e.event_type, e.workshop_id || null, JSON.stringify(e.meta || {})]),
};
