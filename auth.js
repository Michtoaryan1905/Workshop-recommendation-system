const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');
const { HttpError } = require('../utils/httpError');

function decode(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return null;
  try { return jwt.verify(h.slice(7), jwtSecret); } catch { return null; }
}
exports.optionalAuth = (req, _res, next) => { req.user = decode(req); next(); };
exports.requireAuth = (req, _res, next) => {
  const u = decode(req);
  if (!u) return next(new HttpError(401, 'Authentication required'));
  req.user = u; next();
};
exports.requireRole = (...roles) => (req, _res, next) =>
  roles.includes(req.user?.role) ? next() : next(new HttpError(403, 'Forbidden for your role'));
exports.sign = (u) => jwt.sign({ id: u.id, role: u.role, name: u.name }, jwtSecret, { expiresIn: require('../config').jwtExpires });
