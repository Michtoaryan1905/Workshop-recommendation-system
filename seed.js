/* Seeds categories, users, 32 workshops, registrations, reviews (sentiment via ML service when available) and clickstream events.
   Usage: npm run seed            (base data)
          npm run seed:demo       (+ simulates recommendation clicks/registrations so the A/B dashboard has data) */
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const wRepo = require('../repositories/workshopRepository');
const ml = require('../services/mlClient');
const WORKSHOPS = require('./workshops');

const SIMULATE = process.argv.includes('--simulate');
let seedState = 42;
const rnd = () => { seedState |= 0; seedState = (seedState + 0x6d2b79f5) | 0; let t = Math.imul(seedState ^ (seedState >>> 15), 1 | seedState); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const day = (o) => { const d = new Date(); d.setDate(d.getDate() + o); return d.toISOString().slice(0, 10); };

const CATEGORIES = ['Programming', 'Web Development', 'Data Science', 'Artificial Intelligence', 'Machine Learning', 'Cloud Computing', 'Cyber Security', 'DevOps', 'Database', 'UI/UX', 'Digital Marketing', 'Communication Skills', 'Career Development'];
const STUDENTS = [
  ['Aryan Naik', 'aryan@wrs.com', ['Python', 'HTML', 'SQL'], ['Data Science', 'AI'], 'Beginner', 'Become a data scientist', 'Mumbai', [0, 5, 1]],
  ['Rahul Verma', 'rahul@wrs.com', ['React', 'JavaScript', 'CSS'], ['Web Development'], 'Intermediate', 'Full stack developer', 'Pune', [2]],
  ['Sneha Iyer', 'sneha@wrs.com', ['Docker', 'Linux', 'Git'], ['Cloud Computing', 'DevOps'], 'Intermediate', 'DevOps engineer', 'Bangalore', [3, 6]],
  ['Arjun Mehta', 'arjun@wrs.com', ['Networking', 'Linux'], ['Cyber Security'], 'Beginner', 'Security analyst', 'Delhi', [4]],
  ['Neha Kapoor', 'neha@wrs.com', ['Figma'], ['UI/UX', 'Digital Marketing'], 'Beginner', 'Product designer', 'Mumbai', [7]],
  ['Karan Singh', 'karan@wrs.com', ['Python', 'TensorFlow'], ['Machine Learning', 'Deep Learning'], 'Advanced', 'Machine learning engineer', 'Hyderabad', [0, 1]],
  ['Isha Patel', 'isha@wrs.com', ['Excel', 'SQL'], ['Data Science', 'Career Development'], 'Beginner', 'Business analyst', 'Mumbai', [5, 0]],
  ['Vikram Rao', 'vikram@wrs.com', ['Java', 'Git'], ['Programming', 'Database'], 'Intermediate', 'Backend developer', 'Pune', [5, 2]],
];
const REVIEWS = {
  Positive: ['The instructor explained {s} very clearly. The workshop was excellent.', 'Great practical examples and hands-on labs, loved it.', 'Very well organised and beginner friendly. Highly recommended.',
    'Excellent content, the trainer made complex topics simple. Worth the fee.', 'Fantastic session on {s}. The exercises were really helpful.'],
  Neutral: ['The workshop was okay. It covered the basics of {s}.', 'Average session, nothing special.', 'It was fine, but I expected a little more depth.', 'Decent workshop, as expected.'],
  Negative: ['The pace was too fast and hard to follow. The duration was too short.', 'Too short, we needed more time for the exercises.', 'The audio was bad and the venue was not well organised.',
    'Instructor was knowledgeable but the session was too fast and rushed. Disappointing.', 'Not worth the fee. The content was too basic and slow.'],
};
const QUERIES = ['python for data science', 'beginner python workshop', 'machine learning', 'react', 'docker kubernetes', 'aws cloud', 'cyber security', 'sql', 'ui ux design', 'resume and interview', 'ai workshop in mumbai', 'free online workshop'];

async function main() {
  console.log('Seeding...');
  await db.query('SET FOREIGN_KEY_CHECKS=0');
  for (const t of ['audit_logs', 'notifications', 'recommendation_log', 'events', 'search_history', 'review_reports', 'reviews', 'registrations', 'workshops', 'categories', 'users']) await db.query(`TRUNCATE TABLE ${t}`);
  await db.query('SET FOREIGN_KEY_CHECKS=1');

  const catId = {};
  for (const c of CATEGORIES) catId[c] = (await db.exec('INSERT INTO categories (name) VALUES (?)', [c])).insertId;

  const hash = (p) => bcrypt.hashSync(p, 10);
  const mkUser = async (name, email, pw, role, extra = {}) => (await db.exec(
    'INSERT INTO users (name,email,password_hash,role,skills,interests,skill_level,career_goal,preferred_location) VALUES (?,?,?,?,?,?,?,?,?)',
    [name, email, hash(pw), role, JSON.stringify(extra.skills || []), JSON.stringify(extra.interests || []), extra.level || 'Beginner', extra.goal || '', extra.loc || ''])).insertId;
  await mkUser('System Admin', 'admin@wrs.com', 'Admin@123', 'admin');
  const orgs = [await mkUser('TechSkills Academy', 'org1@wrs.com', 'Organizer@123', 'organizer'), await mkUser('Creative & Career Hub', 'org2@wrs.com', 'Organizer@123', 'organizer')];
  const students = [];
  for (const s of STUDENTS) students.push(await mkUser(s[0], s[1], 'Student@123', 'student', { skills: s[2], interests: s[3], level: s[4], goal: s[5], loc: s[6] }));

  // workshops (+ NLP keywords from the ML service, falling back to the skill list)
  const ws = [];
  for (const w of WORKSHOPS) {
    const [title, category, sub, skills, level, mode, location, fee, cap, instructor, oi, off, description] = w;
    const kw = await ml.extractKeywords(`${title}. ${description}. ${skills.join(', ')}`, 10);
    const id = await wRepo.create({ title, description, category_id: catId[category], sub_category: sub, skills, difficulty: level, instructor, organizer_id: orgs[oi],
      event_date: day(off), start_time: pick(['10:00:00', '14:00:00', '17:30:00']), end_time: '19:30:00', location, mode, capacity: cap, fee, keywords: kw ? kw.keywords.map((k) => k.keyword) : skills, status: 'approved' });
    ws.push({ id, off, skills, level, title });
  }
  console.log(kwNote(await ml.extractKeywords('test', 1)));

  // registrations: mapped history for each student + a few random extras; reviews on past workshops
  const reg = new Set();
  const addReg = async (u, w) => { const k = `${u}-${ws[w].id}`; if (reg.has(k)) return false; reg.add(k); await db.exec('INSERT INTO registrations (user_id,workshop_id,created_at) VALUES (?,?,DATE_SUB(NOW(), INTERVAL ? DAY))', [u, ws[w].id, Math.max(1, Math.abs(Math.min(0, ws[w].off)) + 5)]); return true; };
  for (let i = 0; i < students.length; i++) for (const w of STUDENTS[i][7]) await addReg(students[i], w);
  for (let w = 0; w < 8; w++) while ([...reg].filter((k) => k.endsWith(`-${ws[w].id}`)).length < 4) await addReg(pick(students), w);
  for (const s of students) if (rnd() < 0.5) await addReg(s, 8 + Math.floor(rnd() * 24)); // a few upcoming registrations

  let nrev = 0;
  for (const k of reg) {
    const [u, wid] = k.split('-').map(Number); const w = ws.find((x) => x.id === wid);
    if (w.off >= 0 || rnd() > 0.9) continue;
    const r = rnd(); const label = r < 0.55 ? 'Positive' : r < 0.75 ? 'Neutral' : 'Negative';
    const text = pick(REVIEWS[label]).replace('{s}', w.skills[0]);
    const s = await ml.sentiment(text);
    const rating = label === 'Positive' ? pick([4, 5, 5]) : label === 'Neutral' ? 3 : pick([1, 2, 2]);
    await db.exec('INSERT INTO reviews (user_id,workshop_id,rating,comment,sentiment,sentiment_confidence) VALUES (?,?,?,?,?,?)', [u, wid, rating, text, s?.sentiment || label, s?.confidence ?? 0.9]); nrev++;
  }
  await db.exec('UPDATE workshops w SET available_seats = capacity - (SELECT COUNT(*) FROM registrations r WHERE r.workshop_id=w.id)');
  for (const w of ws) await wRepo.refreshRating(w.id);

  // search history + clickstream sessions
  for (let i = 0; i < 60; i++) { const q = pick(QUERIES), u = pick(students); await db.exec('INSERT INTO search_history (user_id,query,parsed) VALUES (?,?,?)', [u, q, '{}']); }
  const ev = (u, s, t, w) => db.exec('INSERT INTO events (user_id,session_id,event_type,workshop_id,meta) VALUES (?,?,?,?,?)', [u, s, t, w || null, '{}']);
  let sess = 0;
  for (const k of reg) { const [u, wid] = k.split('-').map(Number); const s = `seed-${sess++}`;
    for (const t of ['login', 'search', 'view_workshop', 'click_workshop', 'view_review', 'click_register', 'registration']) await ev(u, s, t, ['login', 'search'].includes(t) ? null : wid); }
  for (let i = 0; i < 140; i++) { const u = pick(students), s = `seed-${sess++}`, w = ws[Math.floor(Math.pow(rnd(), 1.6) * ws.length)].id;
    await ev(u, s, 'login'); await ev(u, s, 'search'); await ev(u, s, 'view_workshop', w); if (rnd() < 0.5) await ev(u, s, 'click_workshop', w); if (rnd() < 0.3) await ev(u, s, 'view_review', w); }
  console.log(`Seeded: ${CATEGORIES.length} categories, ${1 + orgs.length + students.length} users, ${ws.length} workshops, ${reg.size} registrations, ${nrev} reviews.`);

  if (SIMULATE) { // DEMO ONLY: simulated clicks/registrations so the A/B dashboard is populated. Real usage replaces this.
    const rec = require('../services/recommendationService'); const regSvc = require('../services/registrationService');
    const misc = require('../repositories/miscRepository');
    for (const u of students) {
      let out; try { out = await rec.recommend(u, 6); } catch (e) { console.warn('Simulation skipped (ML service down):', e.message); break; }
      for (const r of out.recommendations) {
        const pClick = out.algorithm === 'B' ? 0.5 : 0.35, pReg = out.algorithm === 'B' ? 0.45 : 0.3;
        if (rnd() < pClick) { await misc.markRecClicked(u, r.workshop_id); if (rnd() < pReg) await regSvc.register({ id: u, name: 'student' }, r.workshop_id, `sim-${u}`).catch(() => {}); }
      }
    }
    console.log('Simulated recommendation clicks/registrations (demo data only).');
  }
  console.log('\nLogins:  admin@wrs.com / Admin@123   org1@wrs.com / Organizer@123   aryan@wrs.com / Student@123 (all students: Student@123)');
  process.exit(0);
}
const kwNote = (r) => (r ? 'ML service reachable: keywords/sentiment computed by the Python service.' : 'ML service NOT reachable: fell back to skills as keywords and labelled sentiment. Re-run seed after starting the ML service.');
main().catch((e) => { console.error(e); process.exit(1); });
