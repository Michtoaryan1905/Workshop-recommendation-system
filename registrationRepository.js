const db = require('../config/db');
const { HttpError } = require('../utils/httpError');
module.exports = {
  /** Seat-safe registration: row lock + unique key prevent over-booking and duplicates. */
  register: async (userId, workshopId) => {
    const conn = await db.pool.getConnection();
    try {
      await conn.beginTransaction();
      const [[w]] = await conn.query('SELECT id,status,available_seats,event_date,organizer_id,title FROM workshops WHERE id=? FOR UPDATE', [workshopId]);
      if (!w || w.status !== 'approved') throw new HttpError(404, 'Workshop not available');
      if (new Date(w.event_date) < new Date(new Date().toDateString())) throw new HttpError(400, 'Workshop has already taken place');
      if (w.available_seats < 1) throw new HttpError(409, 'No seats left');
      const [[dup]] = await conn.query('SELECT id FROM registrations WHERE user_id=? AND workshop_id=?', [userId, workshopId]);
      if (dup) throw new HttpError(409, 'Already registered');
      await conn.query('INSERT INTO registrations (user_id,workshop_id) VALUES (?,?)', [userId, workshopId]);
      await conn.query('UPDATE workshops SET available_seats=available_seats-1 WHERE id=?', [workshopId]);
      await conn.commit();
      return w;
    } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  },
  find: async (u, w) => (await db.query('SELECT * FROM registrations WHERE user_id=? AND workshop_id=?', [u, w]))[0],
  byUser: (u) => db.query(`SELECT r.id reg_id, r.created_at registered_at, w.*, c.name category FROM registrations r
    JOIN workshops w ON w.id=r.workshop_id JOIN categories c ON c.id=w.category_id WHERE r.user_id=? ORDER BY w.event_date DESC`, [u]),
  byWorkshop: (w) => db.query(`SELECT r.id, r.created_at, u.id user_id, u.name, u.email, u.skill_level FROM registrations r JOIN users u ON u.id=r.user_id WHERE r.workshop_id=? ORDER BY r.created_at DESC`, [w]),
  all: () => db.query(`SELECT r.id, r.created_at, u.name user_name, w.title workshop FROM registrations r JOIN users u ON u.id=r.user_id JOIN workshops w ON w.id=r.workshop_id ORDER BY r.created_at DESC LIMIT 300`),
};
