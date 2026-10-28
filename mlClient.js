const { mlUrl } = require('../config');
/** Calls the Python FastAPI service. Returns null (instead of throwing) when ML is unreachable so the core app keeps working. */
async function call(path, body, { required = false, timeout = 20000 } = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const res = await fetch(`${mlUrl}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal });
    if (!res.ok) throw new Error(`ML ${path} -> ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn('[ml]', e.message);
    if (required) { const err = new Error('ML service unavailable'); err.status = 503; throw err; }
    return null;
  } finally { clearTimeout(t); }
}
module.exports = {
  extractKeywords: (text, top_n = 10) => call('/api/ml/extract-keywords', { text, top_n }),
  analyzeQuery: (query) => call('/api/ml/analyze-query', { query }),
  sentiment: (text) => call('/api/ml/sentiment', { text }),
  recommend: (payload) => call('/api/ml/recommend', payload, { required: true }),
  insights: (reviews) => call('/api/ml/review-insights', { reviews }),
  cluster: (workshops, users, k = 4) => call('/api/ml/cluster', { workshops, users, k }),
};
