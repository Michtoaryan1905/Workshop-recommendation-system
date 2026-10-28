class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
module.exports = { HttpError, wrap: (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next) };
