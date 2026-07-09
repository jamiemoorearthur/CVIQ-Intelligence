import re
import spacy

_nlp = None

_TECH_TERMS = re.compile(
    r'\b(python|javascript|typescript|react|node\.?js|docker|kubernetes|k8s|aws|gcp|azure|'
    r'ci[/\-]cd|git|github|gitlab|jenkins|terraform|ansible|sql|nosql|mongodb|postgresql|'
    r'mysql|redis|kafka|elasticsearch|fastapi|django|flask|spring boot|java|c\+\+|c#|rust|'
    r'golang|go|machine learning|deep learning|nlp|pytorch|tensorflow|scikit.learn|pandas|'
    r'numpy|rest api|graphql|microservices|agile|scrum|devops|linux|bash|html|css|vue\.?js|'
    r'angular|next\.?js|svelte|tailwind|figma|jira|confluence|kubernetes|helm|prometheus|'
    r'grafana|airflow|spark|hadoop|dbt|snowflake|looker|tableau|power bi|excel|vba|'
    r'product management|stakeholder management|project management|data analysis|'
    r'communication|leadership|problem.solving|cross.functional)\b',
    re.IGNORECASE,
)

_SECTION_HEADERS = re.compile(
    r'^(experience|work experience|employment history|education|skills|technical skills|'
    r'core skills|projects|side projects|certifications|achievements|awards|summary|'
    r'professional summary|profile|objective|publications|volunteer|languages|interests)',
    re.IGNORECASE,
)


def _get_nlp():
    global _nlp
    if _nlp is None:
        _nlp = spacy.load("en_core_web_sm")
    return _nlp


def _detect_section(line_idx: int, lines: list[str]) -> str:
    for i in range(line_idx, -1, -1):
        m = _SECTION_HEADERS.match(lines[i].strip())
        if m:
            return m.group().title()
    return "General"


def extract_jd_keywords(jd_text: str) -> list[str]:
    keywords: set[str] = set()

    # Regex-based tech term extraction (most reliable for job descriptions)
    for m in _TECH_TERMS.finditer(jd_text):
        keywords.add(m.group().lower().strip())

    # spaCy: named entities (products, orgs, languages)
    nlp = _get_nlp()
    doc = nlp(jd_text[:5000])  # cap to avoid slow processing on long JDs
    for ent in doc.ents:
        if ent.label_ in ("PRODUCT", "ORG", "LANGUAGE") and len(ent.text) > 2:
            keywords.add(ent.text.strip().lower())

    # Capitalised single words that appear 2+ times (likely required skills/tools)
    words = re.findall(r'\b[A-Z][a-zA-Z]{2,}\b', jd_text)
    freq = {}
    for w in words:
        freq[w.lower()] = freq.get(w.lower(), 0) + 1
    for word, count in freq.items():
        if count >= 2 and word not in {"the", "and", "for", "with", "this", "that", "will", "you", "our", "are", "have"}:
            keywords.add(word)

    return sorted(keywords)


def parse_ats(cv_text: str, jd_text: str) -> dict:
    jd_keywords = extract_jd_keywords(jd_text)
    cv_lower = cv_text.lower()
    cv_lines = cv_text.split("\n")

    found = []
    missing = []

    for kw in jd_keywords:
        if kw in cv_lower:
            count = cv_lower.count(kw)
            section = "General"
            for i, line in enumerate(cv_lines):
                if kw in line.lower():
                    section = _detect_section(i, cv_lines)
                    break
            found.append({"keyword": kw, "section": section, "count": count})
        else:
            missing.append(kw)

    total = len(jd_keywords)
    matched = len(found)
    density = round(matched / total, 2) if total > 0 else 0.0

    return {
        "found_keywords": found,
        "missing_keywords": missing,
        "keyword_density": density,
        "total_jd_keywords": total,
        "matched_count": matched,
    }
