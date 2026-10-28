from typing import List, Optional
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from .nlp import extract_keywords, preprocess
from .query import analyze_query
from .sentiment import get_model
from .recommender import recommend
from .insights import analyze_reviews
from .clustering import cluster

app = FastAPI(title="Workshop Recommendation System - ML/NLP service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
def warm():
    get_model()  # train sentiment model once at start-up


class KeywordReq(BaseModel):
    text: str
    top_n: int = 10
    show_pipeline: bool = False


class QueryReq(BaseModel):
    query: str


class SentReq(BaseModel):
    text: str


class RecReq(BaseModel):
    user: dict
    workshops: List[dict]
    history: List[dict] = []
    algorithm: str = "A"
    top_n: int = 10


class InsightReq(BaseModel):
    reviews: List[dict]


class ClusterReq(BaseModel):
    workshops: List[dict]
    users: Optional[List[dict]] = None
    k: int = 4


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/ml/extract-keywords")
def kw(r: KeywordReq):
    out = {"keywords": extract_keywords(r.text, r.top_n)}
    if r.show_pipeline:
        out["pipeline"] = preprocess(r.text)
    return out


@app.post("/api/ml/analyze-query")
def aq(r: QueryReq):
    return analyze_query(r.query)


@app.post("/api/ml/sentiment")
def sent(r: SentReq):
    return get_model().predict(r.text)


@app.post("/api/ml/recommend")
def rec(r: RecReq):
    return {"recommendations": recommend(r.user, r.workshops, r.history, r.algorithm.upper(), r.top_n)}


@app.post("/api/ml/review-insights")
def ins(r: InsightReq):
    return analyze_reviews(r.reviews)


@app.post("/api/ml/cluster")
def cl(r: ClusterReq):
    return cluster(r.workshops, r.users, r.k)
