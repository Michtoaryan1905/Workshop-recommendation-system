const db = require('../config/db');
const one = async (sql, p) => (await db.query(sql, p))[0];
module.exports = {
  overview: async () => ({
    students: (await one("SELECT COUNT(*) n FROM users WHERE role='student'")).n,
    organizers: (await one("SELECT COUNT(*) n FROM users WHERE role='organizer'")).n,
    workshops: (await one('SELECT COUNT(*) n FROM workshops')).n,
    pending_workshops: (await one("SELECT COUNT(*) n FROM workshops WHERE status='pending'")).n,
    registrations: (await one('SELECT COUNT(*) n FROM registrations')).n,
    reviews: (await one('SELECT COUNT(*) n FROM reviews')).n,
    open_reports: (await one("SELECT COUNT(*) n FROM review_reports WHERE status='open'")).n,
  }),
  topQueries: () => db.query('SELECT LOWER(query) query, COUNT(*) n FROM search_history GROUP BY LOWER(query) ORDER BY n DESC LIMIT 8'),
  topByEvent: (type) => db.query(
    'SELECT w.id, w.title, COUNT(*) n FROM events e JOIN workshops w ON w.id=e.workshop_id WHERE e.event_type=? GROUP BY w.id, w.title ORDER BY n DESC LIMIT 5', [type]),
  topRegistered: () => db.query('SELECT w.id, w.title, COUNT(*) n FROM registrations r JOIN workshops w ON w.id=r.workshop_id GROUP BY w.id, w.title ORDER BY n DESC LIMIT 5'),
  funnel: () => db.query('SELECT event_type, COUNT(*) n, COUNT(DISTINCT session_id) sessions FROM events GROUP BY event_type'),
  popularCategories: () => db.query(
    `SELECT c.name, SUM(e.event_type='view_workshop') views, SUM(e.event_type='registration') registrations FROM events e
     JOIN workshops w ON w.id=e.workshop_id JOIN categories c ON c.id=w.category_id GROUP BY c.name ORDER BY registrations*3+views DESC LIMIT 8`),
  popularSkills: () => db.query(
    `SELECT jt.skill, SUM(e.event_type='view_workshop') views, SUM(e.event_type='registration') registrations FROM events e
     JOIN workshops w ON w.id=e.workshop_id, JSON_TABLE(w.skills,'$[*]' COLUMNS(skill VARCHAR(80) PATH '$')) jt
     GROUP BY jt.skill ORDER BY registrations*3+views DESC LIMIT 10`),
  recentEvents: () => db.query('SELECT session_id, event_type, created_at FROM events ORDER BY id DESC LIMIT 800'),
  abStats: () => db.query(
    `SELECT rl.algorithm, COUNT(*) shown, COUNT(DISTINCT rl.user_id) users, SUM(rl.clicked) clicks,
       SUM(EXISTS(SELECT 1 FROM registrations r WHERE r.user_id=rl.user_id AND r.workshop_id=rl.workshop_id)) registrations
     FROM recommendation_log rl GROUP BY rl.algorithm`),
  organizer: (organizerId) => db.query(
    `SELECT w.id, w.title, w.status, w.capacity, w.available_seats, w.rating_avg, w.review_count,
       (SELECT COUNT(*) FROM registrations r WHERE r.workshop_id=w.id) registrations,
       (SELECT COUNT(*) FROM events e WHERE e.workshop_id=w.id AND e.event_type='view_workshop') views,
       (SELECT COUNT(*) FROM reviews r WHERE r.workshop_id=w.id AND r.hidden=0 AND r.sentiment='Positive') positive,
       (SELECT COUNT(*) FROM reviews r WHERE r.workshop_id=w.id AND r.hidden=0 AND r.sentiment='Neutral') neutral,
       (SELECT COUNT(*) FROM reviews r WHERE r.workshop_id=w.id AND r.hidden=0 AND r.sentiment='Negative') negative
     FROM workshops w WHERE w.organizer_id=? ORDER BY w.event_date DESC`, [organizerId]),
};
