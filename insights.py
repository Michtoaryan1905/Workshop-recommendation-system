"""Review analytics: topics, positive/negative themes, instructor feedback, difficulty feedback, skills mentioned."""
import re
from collections import Counter, defaultdict
from .gazetteer import find_terms
from .sentiment import get_model

TOPICS = {
    "Instructor": r"\b(instructor|trainer|teacher|speaker|mentor|explain\w*|presenter)\b",
    "Practical examples": r"\b(practical|hands[- ]on|example\w*|demo\w*|project\w*|lab\w*|exercise\w*|real[- ]world)\b",
    "Content": r"\b(content|material\w*|syllabus|topic\w*|slides|notes|curriculum)\b",
    "Duration": r"\b(duration|short|long|hours?|time|rushed|extended)\b",
    "Pace": r"\b(pace|fast|slow|speed|rushed|quick)\b",
    "Difficulty": r"\b(difficult|hard|easy|advanced|beginner\w*|basic|simple|complex|challenging)\b",
    "Venue & setup": r"\b(venue|audio|wifi|internet|room|setup|schedule|organi[sz]\w*|mic|projector)\b",
    "Value for money": r"\b(price|fee|worth|expensive|value|cheap|cost)\b",
}
ISSUES = {"Short duration": r"too short|more time|not enough time|rushed", "Too fast": r"too fast|too quick|rushed|hard to follow",
          "Too slow": r"too slow|boring|slow pace", "Too basic": r"too basic|too easy|too simple",
          "Too difficult": r"too (hard|difficult|advanced|complex)|confusing"}
HIGHLIGHTS = {"Clear explanation": r"clear(ly)?|explain\w* (well|everything|clearly)", "Practical examples": r"practical|hands[- ]on|real[- ]world|example",
              "Great instructor": r"(great|excellent|amazing|brilliant|superb) (instructor|trainer|teacher)|instructor .*(excellent|great)",
              "Beginner friendly": r"beginner[- ]friendly|easy to follow|easy to understand", "Well organised": r"well organi[sz]ed|well structured"}


def _sentences(t):
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+|\n+|;", t or "") if len(s.strip()) > 3]


def analyze_reviews(reviews):
    """reviews: [{text, rating?}]"""
    model = get_model()
    topic = defaultdict(lambda: Counter())
    issues, highlights, skills = Counter(), Counter(), Counter()
    instr = {"Positive": 0, "Neutral": 0, "Negative": 0}
    instr_samples = []
    diff = Counter()
    overall = Counter()
    for r in reviews:
        text = r.get("text", "")
        overall[model.predict(text)["sentiment"]] += 1
        for c, typ, _ in find_terms(text):
            skills[c] += 1
        for s in _sentences(text):
            low = s.lower()
            sent = model.predict(s)["sentiment"]
            for name, pat in TOPICS.items():
                if re.search(pat, low):
                    topic[name][sent] += 1
            if re.search(TOPICS["Instructor"], low):
                instr[sent] += 1
                if len(instr_samples) < 3:
                    instr_samples.append({"text": s, "sentiment": sent})
            for name, pat in ISSUES.items():
                if re.search(pat, low) and sent != "Positive":
                    issues[name] += 1
            for name, pat in HIGHLIGHTS.items():
                if re.search(pat, low) and sent != "Negative":
                    highlights[name] += 1
            if re.search(r"too (hard|difficult|fast|advanced|complex)|hard to follow", low):
                diff["Too hard / too fast"] += 1
            elif re.search(r"too (easy|basic|simple|slow)", low):
                diff["Too easy / too slow"] += 1
            elif re.search(r"beginner[- ]friendly|just right|easy to follow|well paced|good pace", low):
                diff["Just right / beginner friendly"] += 1
    pos_topics = sorted(((k, v["Positive"]) for k, v in topic.items() if v["Positive"]), key=lambda x: -x[1])
    neg_topics = sorted(((k, v["Negative"]) for k, v in topic.items() if v["Negative"]), key=lambda x: -x[1])
    n = max(1, sum(overall.values()))
    return {
        "review_count": len(reviews),
        "overall": {k: overall.get(k, 0) for k in ("Positive", "Neutral", "Negative")},
        "overall_percent": {k: round(100 * overall.get(k, 0) / n, 1) for k in ("Positive", "Neutral", "Negative")},
        "positive_topics": [{"topic": k, "mentions": v} for k, v in pos_topics],
        "negative_topics": [{"topic": k, "mentions": v} for k, v in neg_topics],
        "positive_highlights": [{"label": k, "mentions": v} for k, v in highlights.most_common(5)],
        "negative_issues": [{"label": k, "mentions": v} for k, v in issues.most_common(5)],
        "instructor_feedback": {"counts": instr, "samples": instr_samples},
        "difficulty_feedback": dict(diff),
        "top_skills_mentioned": [{"skill": k, "mentions": v} for k, v in skills.most_common(8)],
    }
