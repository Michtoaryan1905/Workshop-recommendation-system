exports.notFound = (req, res) => res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
exports.errorHandler = (err, _req, res, _next) => {
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error' });
};
