import axios from 'axios';

const api = axios.create({ baseURL: '/api' });
let sid = sessionStorage.getItem('wrs_sid');
if (!sid) { sid = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem('wrs_sid', sid); }

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem('wrs_token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  cfg.headers['X-Session-Id'] = sid;
  return cfg;
});
api.interceptors.response.use((r) => r, (e) => {
  if (e.response?.status === 401 && localStorage.getItem('wrs_token')) { localStorage.removeItem('wrs_token'); localStorage.removeItem('wrs_user'); window.location.href = '/login'; }
  return Promise.reject(e);
});

/** clickstream tracking: search, view_workshop, click_workshop, view_review, click_register, reco_click ... */
export const track = (event_type, workshop_id, meta) => api.post('/events', { event_type, workshop_id, meta }).catch(() => {});
export const errMsg = (e) => e.response?.data?.error || e.message || 'Something went wrong';
export default api;
