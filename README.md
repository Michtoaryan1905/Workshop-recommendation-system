# Workshop Recommendation System (WRS)

Full-stack, ML-powered web app that recommends workshops to students using **TF-IDF + cosine similarity**, analyses reviews with **NLP / sentiment analysis**, clusters workshops with **K-Means**, tracks a **clickstream**, and compares two recommendation algorithms with an **A/B test**.

Subjects covered: **ITPM** (docs/ - see "ITPM mapping"), **Enterprise Systems** (3-tier / MVC, roles, audit, RBAC, Docker, CI) and **ASTMA** (text mining, sentiment, clustering, web analytics, A/B testing).

## 1. Architecture

```
React (Vite, Bootstrap)  --HTTP/JSON-->  Express Routes -> Controllers -> Services -> Repositories -> MySQL
                                                          |
                                                          +--> ML client --> FastAPI (pandas, NumPy, scikit-learn, NLTK) -> NLP/ML models
```
| Layer | Folder | Responsibility |
|---|---|---|
| Presentation | `frontend/src` | pages per role, tracking of clickstream events |
| Controller | `backend/src/controllers` | HTTP in/out only |
| Service | `backend/src/services` | business rules (seat locking, A/B assignment, notifications, audit) |
| Repository | `backend/src/repositories` | all SQL |
| ML/NLP | `ml-service/app` | stateless FastAPI service; Express sends it the data it needs |

The ML service is **stateless** (it receives workshops/profile in the request), so it can be scaled or replaced independently. If it is down, the core app still works (keywords/sentiment are skipped, search falls back to text match; recommendations return HTTP 503).

## 2. Check your tools first (do this before anything else)

Run each command; you need at least these versions.

| Tool | Command | Needed |
|---|---|---|
| Git | `git --version` | any |
| Docker + Compose (easiest path) | `docker --version` and `docker compose version` | Docker 24+ |
| Node.js + npm (manual path) | `node -v` and `npm -v` | Node 18+ (20 recommended) |
| Python + pip (manual path) | `python --version` and `pip --version` | Python 3.10-3.12 |
| MySQL (manual path) | `mysql --version` | MySQL 8.0 (JSON functions required) |

## 3. Run it - Option A: Docker (recommended, one command)

```bash
docker compose up --build            # first build takes several minutes
# in a second terminal, load demo data (32 workshops, users, reviews, clickstream):
docker compose exec backend npm run seed:demo
```
* App: http://localhost:3000   * API: http://localhost:5000/api/health   * ML docs (Swagger): http://localhost:8000/docs

`seed:demo` also **simulates** recommendation clicks/registrations so the A/B dashboard is not empty. That data is synthetic (it is hard-coded to favour B slightly); use `npm run seed` for no simulation and let real usage fill the dashboard.

## 4. Run it - Option B: manual (3 terminals)

```bash
# 0. database
mysql -u root -p < database/schema.sql

# 1. ML service
cd ml-service
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --port 8000 --reload
pytest -q                                              # optional: 6 tests

# 2. Backend
cd backend
cp ../.env.example .env                                # set DB_PASSWORD and JWT_SECRET
npm install
npm run seed:demo
npm run dev                                            # http://localhost:5000

# 3. Frontend
cd frontend
npm install
npm run dev                                            # http://localhost:5173 (proxies /api to :5000)
```

## 5. Demo logins

| Role | Email | Password |
|---|---|---|
| Admin | admin@wrs.com | Admin@123 |
| Organizer | org1@wrs.com / org2@wrs.com | Organizer@123 |
| Student | aryan@wrs.com (Python, HTML, SQL; Data Science, AI; Beginner; Mumbai) | Student@123 |
| Students | rahul@, sneha@, arjun@, neha@, karan@, isha@, vikram@ `wrs.com` | Student@123 |

Try: log in as Aryan -> **For You** (scores + reasons) -> search "I want a beginner Python workshop for data science".

## 6. How the AI features work

**Recommender** (`ml-service/app/recommender.py`)
* User document = skills x3 + interests x3 (+ related domain terms) + career goal x2. Workshop document = title x2 + keywords x2 + skills x2 + category + description.
* Both go through the NLP pipeline (lowercase -> remove punctuation -> tokenise -> stop-words -> Porter stemming -> stemmed uni+bigrams) and `TfidfVectorizer`; score = cosine similarity.
* Raw cosine values are small, so they are calibrated to 0-100 with `score = 100 * (1 - exp(-4.5 * cosine))` (documented heuristic, constant `K`).
* **Algorithm A** = that score. **Algorithm B** = `0.60 content + 0.15 rating + 0.10 popularity + 0.15 history similarity` (without history: `0.70 / 0.20 / 0.10`).
* Reasons are generated per workshop: skill / interest / career-goal match, level fit, location or online, similarity to attended workshops, high rating.
* Already-registered, past and full workshops are never recommended.

**Keyword extraction** - TF-IDF over the description's sentences + a domain gazetteer (`gazetteer.py`) so terms like *Machine Learning*, *AWS*, *Docker* rank first. Stored in `workshops.keywords` whenever a workshop is created/edited.

**Query understanding** - gazetteer + rules -> `{skills, interests, level, keywords, location, mode}`; the search service then ranks workshops by TF-IDF similarity to the parsed query.

**Sentiment** - TF-IDF (1-2 grams) + Logistic Regression, trained on start-up from a built-in labelled corpus (template-generated, so it is a *demo-quality* model). For better accuracy put a CSV with `text,label` (positive/neutral/negative) at `ml-service/data/reviews_labeled.csv`; it is added to the training data automatically.

**Review insights** - sentence-level sentiment x topic lexicon (instructor, practical examples, pace, duration, difficulty, venue, value) -> positive/negative topics, instructor and difficulty feedback, most mentioned skills.

**Clustering** - K-Means on TF-IDF of skill/keyword/category tags; clusters are labelled with their top centroid terms; students are assigned to the nearest cluster (Admin -> Clusters).

**Clickstream & A/B test** - the frontend sends `search`, `view_workshop`, `click_workshop`, `view_review`, `click_register`, `reco_click`; the backend records `login`, `registration`, `rating`, `review`. Each student is randomly assigned A or B on first recommendation (stored in `users.ab_group`). Admin -> A/B Test shows click rate, registration rate, a two-proportion z-test p-value, and which algorithm wins.

## 7. REST API (import `docs/postman_collection.json` into Postman)

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Profile | `GET/PUT /api/users/profile`, `GET /api/users/history` |
| Workshops | `GET /api/workshops?q=&category=&level=&mode=&location=&maxFee=&from=`, `GET /api/workshops/:id`, `POST/PUT/DELETE` (organizer/admin), `GET /api/workshops/:id/insights` |
| Registration / reviews | `POST /api/workshops/:id/register`, `GET /api/registrations/mine`, `GET/POST /api/workshops/:id/reviews`, `POST /api/reviews/:id/report` |
| Recommendations | `GET /api/recommendations`, `GET /api/recommendations/history` -> `workshop_id, workshop_name, similarity_score, recommendation_reasons` |
| Events / notifications | `POST /api/events`, `GET /api/notifications`, `POST /api/notifications/read` |
| Organizer | `GET /api/organizer/workshops`, `.../:id/registrations`, `.../:id/reviews`, `GET /api/organizer/analytics` |
| Admin | `/api/admin/{analytics,abtest,clusters,users,organizers,workshops,categories,registrations,reviews,reports,audit}` |
| ML (FastAPI :8000) | `POST /api/ml/extract-keywords`, `/analyze-query`, `/sentiment`, `/recommend`, `/review-insights`, `/cluster` |

Roles are enforced by JWT + role middleware. Passwords are hashed with **bcryptjs** (pure-JS bcrypt, avoids native build problems). Organizer accounts are created by the admin; organizer edits to an approved workshop send it back for re-approval.

## 8. Project structure
```
database/schema.sql      backend/src/{config,middleware,repositories,services,controllers,routes,seed}
ml-service/app           frontend/src/{pages,components.jsx,api.js,auth.jsx}
docker-compose.yml       .github/workflows/ci.yml        docs/postman_collection.json
```

## 9. Honest limitations
* The sentiment model and review-topic lexicon are lightweight and English-only; replace the training corpus with real labelled reviews for production quality.
* Cosine-to-percent calibration is a heuristic, so "94%" means "very strong match", not a probability.
* With few users, A/B results are not statistically meaningful (the dashboard says so when < 30 impressions per group).
* No payment gateway: registration is free of payment; `fee` is informational.
* Security hardening still needed for a public deployment: HTTPS, rate limiting, refresh tokens, strong `JWT_SECRET`, restricted CORS.

## 10. ITPM mapping (to be completed with your report)
The code base supports your ITPM deliverables: scope = the 14 modules; WBS/sprints = module list; risks = ML service dependency, data sparsity (cold start), seat race conditions (handled with row locks); quality = unit tests + CI; configuration management = Git + Docker + CI workflow.
