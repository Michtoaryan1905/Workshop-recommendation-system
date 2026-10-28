const bcrypt = require('bcryptjs');
const users = require('../repositories/userRepository');
const { sign } = require('../middleware/auth');
const { HttpError } = require('../utils/httpError');
const audit = require('./auditService');
const events = require('./eventService');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const strip = ({ password_hash, ...u }) => u;
module.exports = {
  register: async (b) => {
    const { name, email, password } = b;
    if (!name || !EMAIL.test(email || '')) throw new HttpError(400, 'Valid name and email are required');
    if (!password || password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
    if (await users.findByEmail(email.toLowerCase())) throw new HttpError(409, 'Email already registered');
    const id = await users.create({ ...b, email: email.toLowerCase(), role: 'student', password_hash: await bcrypt.hash(password, 10) });
    await audit.log(id, 'REGISTER', 'user', id, email);
    const user = await users.findById(id);
    return { token: sign(user), user };
  },
  login: async ({ email, password }, session_id) => {
    const row = await users.findByEmail((email || '').toLowerCase());
    if (!row || !(await bcrypt.compare(password || '', row.password_hash))) throw new HttpError(401, 'Invalid email or password');
    if (row.status === 'blocked') throw new HttpError(403, 'Account is blocked');
    await audit.log(row.id, 'LOGIN', 'user', row.id, '');
    await events.track({ user_id: row.id, session_id: session_id || 'anon', event_type: 'login' });
    return { token: sign(row), user: strip(row) };
  },
  me: (id) => users.findById(id),
};
