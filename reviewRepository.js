const db = require('../config/db');
module.exports = {
  upsert: (r) => db.exec(
    `INSERT INTO reviews (user_id,workshop_id,rating,comment,sentiment,sentiment_confidence) VALUES (?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE rating=VALUES(rating), comment=VALUES(comment), sentiment=VALUES(sentiment), sentiment_confidence=VALUES(sentiment_confidence), hidden=0`,
    [r.user_id, r.workshop_id, r.rating, r.comment, r.sentiment, r.confidence]),
  byWorkshop: (w, includeHidden = false) => db.query(
    `SELECT r.*, u.name user_name FROM reviews r JOIN users u ON u.id=r.user_id WHERE r.workshop_id=? ${includeHidden ? '' : 'AND r.hidden=0'} ORDER BY r.created_at DESC`, [w]),
  byUser: (u) => db.query('SELECT r.*, w.title workshop FROM reviews r JOIN workshops w ON w.id=r.workshop_id WHERE r.user_id=?', [u]),
  all: () => db.query(`SELECT r.*, u.name user_name, w.title workshop FROM reviews r JOIN users u ON u.id=r.user_id JOIN workshops w ON w.id=r.workshop_id ORDER BY r.created_at DESC LIMIT 300`),
  byId: async (id) => (await db.query('SELECT * FROM reviews WHERE id=?', [id]))[0],
  setHidden: (id, h) => db.exec('UPDATE reviews SET hidden=? WHERE id=?', [h ? 1 : 0, id]),
  sentimentCounts: (where = '1=1', p = []) => db.query(
    `SELECT sentiment, COUNT(*) n FROM reviews r JOIN workshops w ON w.id=r.workshop_id WHERE r.hidden=0 AND r.sentiment IS NOT NULL AND ${where} GROUP BY sentiment`, p),
  textsFor: (where = '1=1', p = []) => db.query(
    `SELECT r.comment text, r.rating FROM reviews r JOIN workshops w ON w.id=r.workshop_id WHERE r.hidden=0 AND r.comment<>'' AND ${where}`, p),
  report: (review_id, reporter_id, reason) => db.exec('INSERT INTO review_reports (review_id,reporter_id,reason) VALUES (?,?,?)', [review_id, reporter_id, reason]),
  reports: () => db.query(`SELECT rr.*, r.comment, r.hidden, u.name reporter, w.title workshop FROM review_reports rr JOIN reviews r ON r.id=rr.review_id
    JOIN users u ON u.id=rr.reporter_id JOIN workshops w ON w.id=r.workshop_id ORDER BY rr.status='open' DESC, rr.created_at DESC`),
  reportById: async (id) => (await db.query('SELECT * FROM review_reports WHERE id=?', [id]))[0],
  setReportStatus: (id, s) => db.exec('UPDATE review_reports SET status=? WHERE id=?', [s, id]),
};
