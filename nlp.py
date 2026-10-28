"""NLP pipeline:  raw text -> lowercase -> remove punctuation -> tokenise -> stop-word removal -> stemming -> TF-IDF -> keywords"""
import re
from collections import Counter
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS, TfidfVectorizer
from .gazetteer import clean, find_terms

try:  # NLTK Porter stemmer needs no corpus download
    from nltk.stem import PorterStemmer
    _stem = PorterStemmer().stem
except Exception:  # pragma: no cover - lightweight fallback so the service still starts
    def _stem(w):
        for suf in ("ingly", "ing", "edly", "ed", "es", "s"):
            if w.endswith(suf) and len(w) - len(suf) >= 3:
                return w[: -len(suf)]
        return w

DOMAIN_STOP = {"workshop", "workshops", "session", "sessions", "participants", "attendees", "want", "need",
               "looking", "find", "like", "will", "also", "using", "use", "get", "learn", "course", "join", "cover", "covers"}
STOP = set(ENGLISH_STOP_WORDS) | DOMAIN_STOP
TOKEN_RE = re.compile(r"[a-z0-9]+(?:[+#]+)?")


def tokenize(text: str):
    return TOKEN_RE.findall(clean(text))


def remove_stop(tokens):
    return [t for t in tokens if t not in STOP and len(t) > 1]


def stem(w: str) -> str:
    return _stem(w) if w.isalpha() else w


def preprocess(text: str):
    """Returns every stage so the pipeline can be shown/explained in the report."""
    tokens = tokenize(text)
    filtered = remove_stop(tokens)
    return {"lowercase": (text or "").lower(), "cleaned": clean(text), "tokens": tokens,
            "filtered": filtered, "stems": [stem(t) for t in filtered]}


def analyzer(text: str):
    """Analyzer for TfidfVectorizer: stemmed unigrams + bigrams."""
    stems = preprocess(text)["stems"]
    return stems + [f"{a} {b}" for a, b in zip(stems, stems[1:])]


def make_vectorizer():
    return TfidfVectorizer(analyzer=analyzer, sublinear_tf=True)


def extract_keywords(text: str, top_n: int = 10, background=None):
    """TF-IDF over the description's sentences (+ optional background docs) boosted by the domain gazetteer."""
    text = (text or "").strip()
    if not text:
        return []
    sentences = [s for s in re.split(r"(?<=[.!?])\s+|\n+", text) if s.strip()] or [text]
    vec = make_vectorizer()
    try:
        X = vec.fit_transform(sentences + list(background or []))
    except ValueError:
        return []
    n = len(sentences)
    scores = X[:n].sum(axis=0).A1
    vocab = vec.get_feature_names_out()

    words = remove_stop(tokenize(text))
    stems = [stem(w) for w in words]
    surface = {}
    for i, s in enumerate(stems):
        surface.setdefault(s, words[i])
        if i + 1 < len(stems):
            surface.setdefault(f"{s} {stems[i + 1]}", f"{words[i]} {words[i + 1]}")

    hits = find_terms(text)
    gaz_freq = Counter(c for c, _, _ in hits)
    gaz = {c.lower(): c for c in gaz_freq}
    mx = scores.max() or 1.0
    cand = {}
    for term, sc in zip(vocab, scores):
        if sc <= 0:
            continue
        label = surface.get(term, term)
        if " " in term:
            continue  # multi-word keywords come from the domain gazetteer; TF-IDF adds single terms
        cand[label] = max(cand.get(label, 0), 0.6 * sc / mx)
    for low, canon in gaz.items():
        base = cand.pop(low, 0)
        cand[canon] = 0.55 + 0.25 * base + 0.2 * min(1.0, gaz_freq[canon] / 3)
    covered = {w for c in gaz.values() for w in clean(c).split()}
    ranked = []
    for k, v in cand.items():
        if k not in gaz.values() and any(w in covered for w in k.lower().split()):
            v *= 0.5  # fragments of an already-extracted phrase (e.g. "machine", "learning")
        ranked.append((k, v))
    ranked.sort(key=lambda kv: -kv[1])
    top = ranked[:top_n]
    m = top[0][1] if top else 1
    return [{"keyword": k, "score": round(float(v / m), 3)} for k, v in top]
