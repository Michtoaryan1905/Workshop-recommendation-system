"""Sentiment classifier: TF-IDF (1-2 grams) + Logistic Regression -> Positive / Neutral / Negative + confidence.
Trained at start-up on a built-in labelled review corpus. Drop a CSV with columns `text,label` at
data/reviews_labeled.csv to retrain on your own data (label in positive|neutral|negative)."""
import os
import random
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline

TOPICS = ["The instructor", "The workshop", "The content", "The Python session", "The practical exercises", "The pace of the workshop",
          "The study material", "The venue and setup", "The hands-on labs", "The trainer", "The examples", "The overall session"]
POS = ["was excellent", "was very clear and easy to follow", "was amazing and really helpful", "explained everything clearly",
       "was great, I learned a lot", "was well organised and engaging", "was fantastic and worth the fee", "was really good and practical",
       "exceeded my expectations", "was very informative and well paced", "was superb, highly recommended", "made complex topics simple",
       "was brilliant and I loved the hands-on work", "was outstanding and very useful"]
NEU = ["was okay", "was average", "was fine, nothing special", "covered the basics", "was neither good nor bad",
       "was decent but could be better", "was as expected", "was alright", "was acceptable", "was standard",
       "had a mix of useful and ordinary parts", "was moderate overall"]
NEG = ["was too fast and hard to follow", "was disappointing", "was not clear at all", "was poor and confusing",
       "was too short and rushed", "was boring and not helpful", "was a waste of time", "was badly organised",
       "was not worth the fee", "was terrible", "did not explain the concepts properly", "was too basic and slow",
       "was confusing and the audio was bad", "was not useful and I would not recommend it"]
EXTRA = [("Great workshop, loved it", "positive"), ("Excellent instructor and practical examples", "positive"),
         ("Very helpful and informative", "positive"), ("Not bad, learned something new", "positive"),
         ("It was okay, nothing special", "neutral"), ("Average session", "neutral"),
         ("Terrible experience, very disappointing", "negative"), ("Not good, too fast and no time for questions", "negative"),
         ("Too short, we needed more time", "negative"), ("Worst workshop ever", "negative"),
         ("The instructor explained Python very clearly. The workshop was excellent.", "positive")]


def _corpus():
    rnd = random.Random(7)
    rows = []
    for label, phrases in (("positive", POS), ("neutral", NEU), ("negative", NEG)):
        for p in phrases:
            for t in rnd.sample(TOPICS, 6):
                rows.append((f"{t} {p}.", label))
    rows += EXTRA * 3
    path = os.path.join(os.path.dirname(__file__), "..", "data", "reviews_labeled.csv")
    if os.path.exists(path):
        df = pd.read_csv(path)
        rows += list(zip(df["text"].astype(str), df["label"].str.lower()))
    return rows


class SentimentModel:
    def __init__(self):
        rows = _corpus()
        X, y = [r[0] for r in rows], [r[1] for r in rows]
        self.pipe = make_pipeline(TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True),
                                  LogisticRegression(max_iter=1000, C=5.0))
        self.pipe.fit(X, y)

    def predict(self, text: str):
        proba = self.pipe.predict_proba([text])[0]
        i = int(np.argmax(proba))
        return {"sentiment": self.pipe.classes_[i].capitalize(), "confidence": round(float(proba[i]), 2),
                "probabilities": {c.capitalize(): round(float(p), 2) for c, p in zip(self.pipe.classes_, proba)}}


_model = None


def get_model() -> SentimentModel:
    global _model
    if _model is None:
        _model = SentimentModel()
    return _model
