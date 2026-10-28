"""Content-based recommender.
Algorithm A: TF-IDF + cosine similarity
Algorithm B: A + ratings + popularity + user history
"""
import math
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from .nlp import make_vectorizer, preprocess
from .gazetteer import clean, find_terms

K = 4.5  # calibrates raw cosine (typically 0.05-0.5) to an intuitive 0-100 scale: 1 - exp(-K*cos)


def scale(c: float) -> float:
    return 1 - math.exp(-K * max(0.0, float(c)))


def _join(*parts):
    return " ".join(p for p in parts if p)


def workshop_doc(w):
    kw = " ".join(w.get("keywords") or [])
    sk = " ".join(w.get("skills") or [])
    # title / keywords / skills are weighted x2 against the description
    return _join(w.get("title", ""), w.get("title", ""), kw, kw, sk, sk, w.get("category", ""),
                 w.get("sub_category", ""), w.get("description", ""))


# light domain knowledge: related terms added (at low weight) so "Data Science" can reach "Machine Learning" etc.
RELATED = {
    "data science": ["machine learning", "python", "pandas", "statistics"],
    "artificial intelligence": ["machine learning", "deep learning", "python"],
    "machine learning": ["python", "scikit-learn", "data science"],
    "deep learning": ["tensorflow", "neural networks", "python"],
    "web development": ["javascript", "react", "html", "css"],
    "cloud computing": ["aws", "devops", "docker"],
    "devops": ["docker", "ci/cd", "kubernetes", "cloud"],
    "cyber security": ["networking", "penetration testing"],
    "database": ["sql", "mysql"],
}


def _canon(term):
    hits = find_terms(term)
    return hits[0][0] if hits else term


def user_doc(u):
    skills = [_canon(s) for s in (u.get("skills") or [])]
    interests = [_canon(i) for i in (u.get("interests") or [])]
    sk, it = " ".join(skills), " ".join(interests)
    related = " ".join(r for i in interests for r in RELATED.get(i.lower(), []))
    q = u.get("query_text", "")
    return _join(sk, sk, sk, it, it, it, related, u.get("career_goal", ""), u.get("career_goal", ""), q, q, q)


def _has(text_low: str, term: str) -> bool:
    t = clean(term)
    return bool(t) and f" {t} " in f" {text_low} "


def explain(u, w, hist_sim, hist_title, rating_pop=False):
    text = clean(_join(w.get("title", ""), w.get("description", ""), " ".join(w.get("keywords") or []),
                       " ".join(w.get("skills") or []), w.get("category", ""), w.get("sub_category", "")))
    reasons = []
    wcanon = {c.lower() for c, _, _ in find_terms(text)}
    for s in u.get("skills") or []:
        if _has(text, s) or _canon(s).lower() in wcanon:
            reasons.append(f"Matches your {s} skill")
    for i in u.get("interests") or []:
        if _has(text, i) or _canon(i).lower() in wcanon:
            reasons.append(f"Matches your {i} interest")
    goal = u.get("career_goal") or ""
    gterms = [c for c, _, _ in find_terms(goal)]
    hit = [g for g in gterms if _has(text, g)]
    if hit:
        reasons.append(f"Supports your career goal ({goal})")
    lvl, wl = u.get("level"), w.get("difficulty")
    if wl and lvl and wl == lvl:
        reasons.append("Beginner-friendly" if wl == "Beginner" else f"Matches your {wl} level")
    elif wl == "Beginner" and lvl in ("Intermediate", "Advanced"):
        reasons.append("Good refresher at Beginner level")
    loc, mode = (u.get("preferred_location") or "").lower(), w.get("mode")
    if mode == "Online":
        reasons.append("Available online")
    elif loc and loc in (w.get("location") or "").lower():
        reasons.append(f"Available in {u.get('preferred_location')}")
    if hist_sim and hist_sim >= 0.35 and hist_title:
        reasons.append(f"Similar to previously attended workshop: {hist_title}")
    if (w.get("review_count") or 0) >= 3 and (w.get("rating_avg") or 0) >= 4.3:
        reasons.append(f"Highly rated ({float(w['rating_avg']):.1f}/5 from {w['review_count']} reviews)")
    if not reasons:
        reasons.append("Related content based on workshop description")
    return reasons[:7]


def recommend(user, workshops, history=None, algorithm="A", top_n=10):
    if not workshops:
        return []
    history = history or []
    vec = make_vectorizer()
    W = vec.fit_transform([workshop_doc(w) for w in workshops])
    U = vec.transform([user_doc(user)])
    content = cosine_similarity(U, W)[0]

    hist_sim = np.zeros(len(workshops))
    hist_best = [None] * len(workshops)
    if history:
        H = vec.transform([workshop_doc(h) for h in history])
        sims = cosine_similarity(W, H)  # workshops x history
        hist_sim = sims.max(axis=1)
        hist_best = [history[int(i)].get("title") for i in sims.argmax(axis=1)]

    pops = np.array([float(w.get("popularity") or 0) for w in workshops])
    pop_norm = np.log1p(pops) / math.log1p(pops.max()) if pops.max() > 0 else np.zeros(len(workshops))

    out = []
    for i, w in enumerate(workshops):
        c = scale(content[i])
        if algorithm == "B":
            rating = (float(w.get("rating_avg") or 0) / 5) if (w.get("review_count") or 0) > 0 else 0.6
            h = scale(hist_sim[i]) if history else 0
            final = (0.60 * c + 0.15 * rating + 0.10 * pop_norm[i] + 0.15 * h) if history \
                else (0.70 * c + 0.20 * rating + 0.10 * pop_norm[i])
        else:
            final = c
        out.append({
            "workshop_id": w["id"], "workshop_name": w.get("title"),
            "similarity_score": round(float(final) * 100, 1),
            "content_score": round(float(c) * 100, 1),
            "recommendation_reasons": explain(user, w, float(hist_sim[i]), hist_best[i]),
            "algorithm": algorithm,
        })
    out.sort(key=lambda r: -r["similarity_score"])
    return out[:top_n]
