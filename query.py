"""Natural-language query understanding (rule + gazetteer based)."""
from .gazetteer import find_terms, find_level, clean, CITIES, _pat
from .nlp import tokenize, remove_stop

FILLER = {"beginner", "intermediate", "advanced", "beginners", "basic", "basics", "online", "offline", "please",
          "show", "give", "suggest", "recommend", "best", "good", "person"}


def analyze_query(query: str):
    terms = find_terms(query)
    skills = [c for c, t, _ in terms if t == "skill"]
    interests = [c for c, t, _ in terms if t == "interest"]
    q = clean(query)
    location = next((c.title() for c in CITIES if _pat(c).search(q)), "")
    mode = "Online" if _pat("online").search(q) else ("Offline" if (_pat("offline").search(q) or _pat("in person").search(q)) else "")
    known = {w for c, _, _ in terms for w in clean(c).split()}
    extra = [w for w in remove_stop(tokenize(query)) if w not in FILLER and w not in CITIES and w not in known]
    keywords = list(dict.fromkeys([c for c, _, _ in terms] + extra))
    return {"skills": skills, "interests": interests, "level": find_level(query),
            "keywords": keywords, "location": location, "mode": mode}
