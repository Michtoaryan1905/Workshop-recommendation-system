from app.nlp import extract_keywords, preprocess
from app.query import analyze_query
from app.sentiment import get_model
from app.recommender import recommend
from app.clustering import cluster

WS = [
    {"id": 1, "title": "Python for Data Science", "description": "Learn Python, pandas and SQL for data science.", "category": "Data Science", "skills": ["Python", "Pandas", "SQL"], "keywords": ["Python", "Data Science"], "difficulty": "Beginner", "mode": "Offline", "location": "Mumbai", "rating_avg": 4.6, "review_count": 10, "popularity": 30},
    {"id": 2, "title": "React Masterclass", "description": "Build single page apps with React and JavaScript.", "category": "Web Development", "skills": ["React", "JavaScript"], "keywords": ["React"], "difficulty": "Intermediate", "mode": "Online", "location": "Online", "rating_avg": 4.2, "review_count": 5, "popularity": 10},
    {"id": 3, "title": "Docker and AWS Deployment", "description": "Containers, Docker, AWS EC2 and CI/CD.", "category": "DevOps", "skills": ["Docker", "AWS"], "keywords": ["Docker", "AWS"], "difficulty": "Intermediate", "mode": "Online", "location": "Online", "rating_avg": 4.0, "review_count": 4, "popularity": 8},
    {"id": 4, "title": "Machine Learning Basics", "description": "Intro to machine learning with scikit-learn and Python.", "category": "Machine Learning", "skills": ["Python", "Scikit-learn"], "keywords": ["Machine Learning"], "difficulty": "Beginner", "mode": "Offline", "location": "Mumbai", "rating_avg": 4.5, "review_count": 8, "popularity": 20},
]
USER = {"skills": ["Python", "HTML", "SQL"], "interests": ["Data Science", "AI"], "level": "Beginner", "preferred_location": "Mumbai"}


def test_pipeline_stages():
    p = preprocess("Learning Python, QUICKLY!")
    assert p["tokens"] == ["learning", "python", "quickly"] and "python" in p["stems"]


def test_keywords_contains_domain_terms():
    kws = [k["keyword"] for k in extract_keywords("Hands-on Python and SQL for machine learning on AWS with Docker.")]
    for t in ("Python", "SQL", "Machine Learning", "AWS", "Docker"):
        assert t in kws


def test_query():
    q = analyze_query("I want a beginner Python workshop for data science.")
    assert q["skills"] == ["Python"] and q["interests"] == ["Data Science"] and q["level"] == "Beginner"


def test_sentiment():
    m = get_model()
    assert m.predict("The instructor explained Python very clearly. The workshop was excellent.")["sentiment"] == "Positive"
    assert m.predict("The workshop was terrible and too fast, a waste of time.")["sentiment"] == "Negative"


def test_recommender_ranks_and_explains():
    for algo in ("A", "B"):
        r = recommend(USER, WS, [WS[2]], algo)
        assert r[0]["workshop_id"] in (1, 4) and 0 <= r[0]["similarity_score"] <= 100
        assert any("Python" in x for x in r[0]["recommendation_reasons"])
        assert set(r[0]) >= {"workshop_id", "workshop_name", "similarity_score", "recommendation_reasons"}


def test_cluster():
    res = cluster(WS, [USER], k=2)
    assert len(res["clusters"]) == 2 and sum(len(c["workshop_ids"]) for c in res["clusters"]) == 4
