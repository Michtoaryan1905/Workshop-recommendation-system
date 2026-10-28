const db = require('../config/db');
const SELECT = `SELECT w.*, c.name AS category, u.name AS organizer FROM workshops w
  JOIN categories c ON c.id=w.category_id JOIN users u ON u.id=w.organizer_id`;
const J = (v) => JSON.stringify(v || []);

module.exports = {
  find: async (f = {}) => {
    const where = [], p = [];
    if (f.status) { where.push('w.status=?'); p.push(f.status); }
    if (f.organizer_id) { where.push('w.organizer_id=?'); p.push(f.organizer_id); }
    if (f.category) { where.push('c.name=?'); p.push(f.category); }
    if (f.level) { where.push('w.difficulty=?'); p.push(f.level); }
    if (f.mode) { where.push('w.mode=?'); p.push(f.mode); }
    if (f.location) { where.push('(w.location LIKE ? OR w.mode="Online")'); p.push(`%${f.location}%`); }
    if (f.maxFee !== undefined && f.maxFee !== '') { where.push('w.fee<=?'); p.push(+f.maxFee); }
    if (f.from) { where.push('w.event_date>=?'); p.push(f.from); }
    if (f.to) { where.push('w.event_date<=?'); p.push(f.to); }
    if (f.upcoming) where.push('w.event_date>=CURDATE()');
    if (f.hasSeats) where.push('w.available_seats>0');
    if (f.text) { where.push('(w.title LIKE ? OR w.description LIKE ?)'); p.push(`%${f.text}%`, `%${f.text}%`); }
    return db.query(`${SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY w.event_date ASC, w.id`, p);
  },
  findById: async (id) => (await db.query(`${SELECT} WHERE w.id=?`, [id]))[0],
  create: async (w) => (await db.exec(
    `INSERT INTO workshops (title,description,category_id,sub_category,skills,difficulty,instructor,organizer_id,event_date,start_time,end_time,location,mode,capacity,available_seats,fee,keywords,status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [w.title, w.description, w.category_id, w.sub_category || '', J(w.skills), w.difficulty, w.instructor, w.organizer_id, w.event_date, w.start_time, w.end_time,
      w.mode === 'Online' ? 'Online' : w.location, w.mode, w.capacity, w.capacity, w.fee || 0, J(w.keywords), w.status || 'pending'])).insertId,
  update: (id, w, seatsDelta = 0) => db.exec(
    `UPDATE workshops SET title=?,description=?,category_id=?,sub_category=?,skills=?,difficulty=?,instructor=?,event_date=?,start_time=?,end_time=?,location=?,mode=?,
     capacity=?,available_seats=GREATEST(0,available_seats+?),fee=?,keywords=?,status=? WHERE id=?`,
    [w.title, w.description, w.category_id, w.sub_category || '', J(w.skills), w.difficulty, w.instructor, w.event_date, w.start_time, w.end_time,
      w.mode === 'Online' ? 'Online' : w.location, w.mode, w.capacity, seatsDelta, w.fee || 0, J(w.keywords), w.status, id]),
  remove: (id) => db.exec('DELETE FROM workshops WHERE id=?', [id]),
  setStatus: (id, status) => db.exec('UPDATE workshops SET status=? WHERE id=?', [status, id]),
  setKeywords: (id, kw) => db.exec('UPDATE workshops SET keywords=? WHERE id=?', [J(kw), id]),
  refreshRating: (id) => db.exec(
    `UPDATE workshops w SET rating_avg=COALESCE((SELECT AVG(rating) FROM reviews WHERE workshop_id=w.id AND hidden=0),0),
     review_count=(SELECT COUNT(*) FROM reviews WHERE workshop_id=w.id AND hidden=0) WHERE w.id=?`, [id]),
  popularity: () => db.query('SELECT workshop_id, COUNT(*) n FROM registrations GROUP BY workshop_id'),
  categories: () => db.query('SELECT * FROM categories ORDER BY name'),
  categoryByName: async (n) => (await db.query('SELECT * FROM categories WHERE name=?', [n]))[0],
  addCategory: async (name) => (await db.exec('INSERT INTO categories (name) VALUES (?)', [name])).insertId,
  renameCategory: (id, name) => db.exec('UPDATE categories SET name=? WHERE id=?', [name, id]),
  deleteCategory: (id) => db.exec('DELETE FROM categories WHERE id=?', [id]),
  categoryInUse: async (id) => (await db.query('SELECT COUNT(*) n FROM workshops WHERE category_id=?', [id]))[0].n > 0,
};
