"""Domain vocabulary: canonical skills / interests with aliases (used for keyword boosting and query analysis)."""
import re

# canonical -> (type, aliases)
TERMS = {
    # ---- skills
    "Python": ("skill", ["python"]), "Java": ("skill", ["java"]),
    "JavaScript": ("skill", ["javascript", "js", "ecmascript"]), "TypeScript": ("skill", ["typescript"]),
    "HTML": ("skill", ["html", "html5"]), "CSS": ("skill", ["css", "css3"]),
    "SQL": ("skill", ["sql"]), "MySQL": ("skill", ["mysql"]), "MongoDB": ("skill", ["mongodb", "nosql"]),
    "React": ("skill", ["react", "reactjs", "react js"]), "Node.js": ("skill", ["node js", "nodejs", "node"]),
    "REST API": ("skill", ["rest api", "rest apis", "restful"]),
    "Docker": ("skill", ["docker", "containerization"]), "Kubernetes": ("skill", ["kubernetes", "k8s"]),
    "AWS": ("skill", ["aws", "amazon web services"]), "Azure": ("skill", ["azure"]),
    "Git": ("skill", ["git", "github"]), "Linux": ("skill", ["linux"]),
    "CI/CD": ("skill", ["ci cd", "cicd", "jenkins"]), "Terraform": ("skill", ["terraform"]),
    "TensorFlow": ("skill", ["tensorflow", "keras"]), "Pandas": ("skill", ["pandas"]), "NumPy": ("skill", ["numpy"]),
    "Scikit-learn": ("skill", ["scikit learn", "sklearn"]), "Tableau": ("skill", ["tableau"]),
    "Power BI": ("skill", ["power bi", "powerbi"]), "Excel": ("skill", ["excel"]),
    "Figma": ("skill", ["figma"]), "Penetration Testing": ("skill", ["penetration testing", "pentest", "pen testing", "ethical hacking"]),
    "Networking": ("skill", ["networking", "tcp ip"]), "SEO": ("skill", ["seo"]),
    "Public Speaking": ("skill", ["public speaking"]), "Resume Writing": ("skill", ["resume", "cv writing"]),
    "Interview Preparation": ("skill", ["interview", "interviews"]),
    # ---- interests / domains
    "Data Science": ("interest", ["data science", "data scientist", "data analytics", "data analysis"]),
    "Artificial Intelligence": ("interest", ["artificial intelligence", "ai"]),
    "Machine Learning": ("interest", ["machine learning", "ml"]),
    "Deep Learning": ("interest", ["deep learning", "neural network", "neural networks"]),
    "NLP": ("interest", ["nlp", "natural language processing", "text mining"]),
    "Web Development": ("interest", ["web development", "web dev", "web developer", "frontend", "full stack", "fullstack"]),
    "Cloud Computing": ("interest", ["cloud computing", "cloud"]),
    "Cyber Security": ("interest", ["cyber security", "cybersecurity", "infosec", "security"]),
    "DevOps": ("interest", ["devops"]), "Database": ("interest", ["database", "databases", "dbms"]),
    "UI/UX": ("interest", ["ui ux", "ux", "ui", "user experience", "user interface", "product design"]),
    "Digital Marketing": ("interest", ["digital marketing", "social media marketing", "marketing"]),
    "Communication Skills": ("interest", ["communication skills", "communication", "presentation skills"]),
    "Career Development": ("interest", ["career development", "career growth", "career", "placement"]),
    "Programming": ("interest", ["programming", "coding"]),
}

LEVELS = {
    "Beginner": ["beginner", "beginners", "basic", "basics", "intro", "introduction", "introductory", "starter", "newbie", "fresher", "new to", "from scratch", "no experience", "entry level"],
    "Intermediate": ["intermediate", "medium", "some experience", "mid level"],
    "Advanced": ["advanced", "expert", "professional", "in depth", "deep dive", "experienced"],
}
CITIES = ["mumbai", "pune", "delhi", "bangalore", "bengaluru", "hyderabad", "chennai", "kolkata", "ahmedabad", "thane", "navi mumbai"]


def clean(text: str) -> str:
    """lowercase + strip punctuation (keeps + and # so c++ / c# survive)"""
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9+#\s]", " ", (text or "").lower())).strip()


def _pat(alias: str):
    return re.compile(r"(?<![a-z0-9+#])" + re.escape(clean(alias)) + r"(?![a-z0-9+#])")


_PATTERNS = [(canon, typ, _pat(a), len(a)) for canon, (typ, aliases) in TERMS.items() for a in aliases]


def find_terms(text: str):
    """Greedy longest-match, non-overlapping. Returns list of (canonical, type, position) ordered by position."""
    t = clean(text)
    hits = []
    for canon, typ, pat, ln in _PATTERNS:
        for m in pat.finditer(t):
            hits.append((m.end() - m.start(), m.start(), m.end(), canon, typ))
    hits.sort(key=lambda h: (-h[0], h[1]))
    taken, out = [], []
    for ln, s, e, canon, typ in hits:
        if any(s < te and e > ts for ts, te in taken):
            continue
        taken.append((s, e))
        out.append((canon, typ, s))
    out.sort(key=lambda h: h[2])
    return out


def find_level(text: str):
    t = clean(text)
    for level, words in LEVELS.items():
        if any(_pat(w).search(t) for w in words):
            return level
    return ""
