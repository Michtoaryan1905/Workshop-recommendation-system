"""K-Means clustering of workshops (and assignment of users) on skill/keyword/category 'tag' vectors."""
import numpy as np
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer


def _tags_w(w):
    t = list(w.get("skills") or []) + list(w.get("keywords") or []) + [w.get("category", ""), w.get("sub_category", "")]
    return [x.strip().lower() for x in t if x and x.strip()]


def _tags_u(u):
    return [x.strip().lower() for x in list(u.get("skills") or []) + list(u.get("interests") or []) if x and x.strip()]


def cluster(workshops, users=None, k=4):
    if len(workshops) < 2:
        return {"clusters": [], "user_clusters": {}}
    k = max(2, min(k, len(workshops)))
    vec = TfidfVectorizer(analyzer=lambda tags: tags)
    X = vec.fit_transform([_tags_w(w) for w in workshops])
    km = KMeans(n_clusters=k, n_init=10, random_state=42).fit(X)
    terms = vec.get_feature_names_out()
    res = []
    for c in range(k):
        idx = [i for i, l in enumerate(km.labels_) if l == c]
        top = [terms[j] for j in np.argsort(-km.cluster_centers_[c])[:3]]
        res.append({"cluster": c + 1, "label": " + ".join(t.title() if len(t) > 3 else t.upper() for t in top),
                    "top_terms": top, "workshop_ids": [workshops[i]["id"] for i in idx],
                    "workshops": [workshops[i]["title"] for i in idx], "users": 0})
    ucl = {}
    if users:
        U = vec.transform([_tags_u(u) for u in users])
        for n, (u, l) in enumerate(zip(users, km.predict(U))):
            ucl[str(u.get("id", n))] = int(l) + 1
            res[int(l)]["users"] += 1
    return {"clusters": res, "user_clusters": ucl}
