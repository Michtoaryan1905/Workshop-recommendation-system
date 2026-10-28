const db = require('../config/db');
const J = (v) => JSON.stringify(v || []);
const PUBLIC = 'id,name,email,role,skills,interests,skill_level,career_goal,preferred_location,preferred_mode,status,ab_group,created_at';
module.exports = {
  PUBLIC,
  findByEmail: async (email) => (await db.query('SELECT * FROM users WHERE email=?', [email]))[0],
  findById: async (id) => (await db.query(`SELECT ${PUBLIC} FROM users WHERE id=?`, [id]))[0],
  create: async (u) => (await db.exec(
    'INSERT INTO users (name,email,password_hash,role,skills,interests,skill_level,career_goal,preferred_location,preferred_mode) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [u.name, u.email, u.password_hash, u.role || 'student', J(u.skills), J(u.interests), u.skill_level || 'Beginner', u.career_goal || '', u.preferred_location || '', u.preferred_mode || 'Any'])).insertId,
  updateProfile: (id, p) => db.exec(
    'UPDATE users SET name=?,skills=?,interests=?,skill_level=?,career_goal=?,preferred_location=?,preferred_mode=? WHERE id=?',
    [p.name, J(p.skills), J(p.interests), p.skill_level, p.career_goal || '', p.preferred_location || '', p.preferred_mode || 'Any', id]),
  list: (role) => db.query(`SELECT ${PUBLIC} FROM users ${role ? 'WHERE role=?' : ''} ORDER BY id`, role ? [role] : []),
  setStatus: (id, status) => db.exec('UPDATE users SET status=? WHERE id=?', [status, id]),
  setAbGroup: (id, g) => db.exec('UPDATE users SET ab_group=? WHERE id=?', [g, id]),
  students: () => db.query(`SELECT ${PUBLIC} FROM users WHERE role='student' AND status='active'`),
};
