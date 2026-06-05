# CV Reviewer AI

An AI-powered CV review platform that analyses your resume against a real job description and returns structured, actionable feedback. Built with a RAG (Retrieval-Augmented Generation) pipeline, semantic search, and GPT-4o to give feedback that is grounded in real hiring criteria, not generic advice.

[![CI](https://github.com/jamiemoorearthur/Resume-Review-Engine/actions/workflows/ci.yml/badge.svg)](https://github.com/jamiemoorearthur/Resume-Review-Engine/actions/workflows/ci.yml)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.136-009688?style=flat&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991?style=flat&logo=openai&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Containerised-2496ED?style=flat&logo=docker&logoColor=white)
![Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?style=flat&logo=vercel&logoColor=white)
![Render](https://img.shields.io/badge/Backend-Render-46E3B7?style=flat&logo=render&logoColor=white)

---

## Live

| | URL |
|---|---|
| **Frontend** | [project-splj5.vercel.app](https://project-splj5.vercel.app) |
| **Backend API** | [cv-reviewer-api.onrender.com/docs](https://cv-reviewer-api.onrender.com/docs) |

> Note: The backend runs on Render's free tier and spins down after 15 minutes of inactivity. The first request may take 30 seconds to wake up.

---

## What it does

Upload a CV (PDF) and paste a job description. The system returns:

```json
{
  "overall_score": 75,
  "ats_score": 70,
  "role_alignment": "Good",
  "missing_keywords": ["Django", "PostgreSQL", "OpenAPI", "OAuth2"],
  "strengths": ["Strong Python and backend experience"],
  "weaknesses": ["No evidence of production daemon or background worker experience"],
  "suggested_bullets": [
    {
      "original": "Built AI chatbot using FastAPI",
      "improved": "Built and deployed a FastAPI-based AI chatbot with prompt-injection filtering, structured logging and Docker support, reducing customer queries by 22%."
    }
  ]
}
```

---

## How it works

The system uses a RAG pipeline to ground every piece of feedback in a curated knowledge base rather than relying on the model's general knowledge alone.

```
CV (PDF)  +  Job Description (text)
        |
        v
  Text Extraction (pypdf)
        |
        v
  Chunking + Embedding (OpenAI text-embedding-3-small)
        |
        v
  ChromaDB Semantic Search
  (retrieves relevant rubric, ATS rules, bullet examples)
        |
        v
  GPT-4o-mini (CV + JD + retrieved context)
        |
        v
  Structured JSON Review
        |
        v
  React Frontend (scores, keywords, strengths, bullet rewrites)
```

![RAG Architecture](images/ragarch.PNG)

**Knowledge base sources loaded into ChromaDB at startup:**
- CV review rubric (7 scoring categories with weighted criteria)
- ATS guidelines (keyword strategy, formatting rules, score thresholds)
- Strong bullet point examples (before/after rewrites with structure rules)
- Role matching criteria (tech stack requirements by role across 7 job families)

---

## Tech stack

### Frontend
| Technology | Purpose |
|---|---|
| [React 18](https://react.dev/) | UI framework |
| [Vite](https://vitejs.dev/) | Build tool and dev server |
| [React Router](https://reactrouter.com/) | Client-side routing |
| [Axios](https://axios-http.com/) | API requests |
| [React Dropzone](https://react-dropzone.js.org/) | Drag and drop file upload |
| [Vercel](https://vercel.com/) | Frontend hosting |

### Backend
| Technology | Purpose |
|---|---|
| [FastAPI 0.136](https://fastapi.tiangolo.com/) | API framework |
| [Uvicorn](https://www.uvicorn.org/) | ASGI server |
| [Pydantic v2](https://docs.pydantic.dev/) | Request/response validation |
| [pypdf 6.10.2](https://pypdf.readthedocs.io/) | PDF text extraction |
| [python-multipart 0.0.27](https://multipart.fastapiexpert.com/) | File upload handling |

### AI and NLP
| Technology | Purpose |
|---|---|
| [OpenAI GPT-4o-mini](https://platform.openai.com/docs/models) | Review generation |
| [OpenAI text-embedding-3-small](https://platform.openai.com/docs/guides/embeddings) | Semantic embeddings |
| [ChromaDB 0.6.3](https://www.trychroma.com/) | Local vector store |

### Infrastructure
| Technology | Purpose |
|---|---|
| [Docker](https://www.docker.com/) | Containerisation |
| [Render](https://render.com/) | Backend cloud deployment |
| [Vercel](https://vercel.com/) | Frontend cloud deployment |
| [GitHub Actions](https://github.com/features/actions) | CI/CD |

---

## Architecture

```
Browser (Vercel)
      |
      | HTTPS POST /review (multipart/form-data)
      v
FastAPI Backend (Render)
      |
      |-- pypdf extracts CV text
      |-- ChromaDB retrieves relevant knowledge base chunks
      |-- GPT-4o-mini generates structured review
      |
      v
JSON response back to frontend
```
<img width="580" height="206" alt="image" src="https://github.com/user-attachments/assets/e5512de3-5cbf-4bc9-b0aa-4334a80a2ac1" />

The frontend and backend are deployed independently. The React app on Vercel calls the FastAPI backend on Render directly from the browser. CORS is configured on the backend to allow requests from the Vercel domain.

---

## Security

Security was treated as a first-class concern throughout the build, not something added at the end.

### Dependency and code scanning (CI gates)

Every push to `main` runs three automated security checks. The pipeline fails and blocks deployment if any of them report critical or high severity findings.

| Tool | What it scans | Threshold |
|---|---|---|
| [Bandit](https://bandit.readthedocs.io/) | Python source code for common vulnerabilities (injection, hardcoded secrets, unsafe functions) | Medium and above |
| [pip-audit](https://pypi.org/project/pip-audit/) | Python dependencies against the OSV and PyPI Advisory databases | Any known CVE |
| [Trivy](https://trivy.dev/) | Docker image (OS packages + Python packages installed in the container) | Critical and High (fixed only) |

### Vulnerability remediation history

The project has gone through multiple rounds of dependency hardening since initial build:

- Migrated from `PyPDF2` (deprecated, CVE-2023-36464) to `pypdf 6.10.2` which patches 25 DoS vulnerabilities in PDF parsing
- Upgraded `python-multipart` from 0.0.19 to 0.0.27, patching a path traversal vulnerability (CVE-2026-24486) and a DoS vulnerability (CVE-2026-40347)
- Upgraded `python-dotenv` from 1.0.1 to 1.2.2, patching a symlink file overwrite vulnerability (CVE-2026-28684)
- Upgraded `FastAPI` from 0.115.6 to 0.136.3 to pull in `starlette 1.2.1`, patching a DoS via malformed Range headers (CVE-2025-62727)
- Upgraded `wheel` to 0.47.0 and `setuptools` to 82.0.1 to patch vendored dependency CVEs

### Secrets management

- The OpenAI API key lives in `.env` which is in `.gitignore` and never committed
- `.env.example` documents required variable names without values
- On Render, secrets are injected as environment variables at runtime, never baked into the image
- The Docker image is built from a `.dockerignore` that explicitly excludes `.env`, `.venv`, and the ChromaDB data folder

### Input validation

- All API request bodies are validated by Pydantic v2 before any processing occurs
- File uploads are validated for type (PDF and TXT only) and content (empty documents are rejected)
- Custom exception handlers return clean error messages without exposing stack traces or internal paths

---

## API endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/upload` | Parse a CV file and return extracted text |
| `POST` | `/review` | Full AI review: scores, keywords, strengths, weaknesses, bullet rewrites |

Full interactive documentation at: [https://cv-reviewer-api.onrender.com/docs](https://cv-reviewer-api.onrender.com/docs)

---

## Running locally

**Requirements:** Python 3.11, Node.js 18+, an OpenAI API key

### Backend

```bash
git clone https://github.com/jamiemoorearthur/Resume-Review-Engine.git
cd Resume-Review-Engine/backend

python -m venv .venv
source .venv/Scripts/activate  # Windows
# or: source .venv/bin/activate  # Mac/Linux

pip install -r requirements.txt
echo "OPENAI_API_KEY=sk-your-key-here" > .env
uvicorn app.main:app --reload
```

Backend available at `http://localhost:8000`.

### Frontend

```bash
cd Resume-Review-Engine/frontend
npm install
npm run dev
```

Frontend available at `http://localhost:5173`.

**Running with Docker:**
```bash
cd Resume-Review-Engine
docker-compose up --build
```

**Running tests:**
```bash
cd backend
pytest tests/ -v
```

---

## Project structure

```
Resume-Review-Engine/
├── backend/
│   ├── app/
│   │   ├── api/            # FastAPI routers (health, upload, review)
│   │   ├── core/           # Config, exceptions
│   │   ├── ingestion/      # PDF parsing, text loading, chunking
│   │   ├── embeddings/     # OpenAI embedding wrapper
│   │   ├── vectorstore/    # ChromaDB integration
│   │   ├── rag/            # Pipeline, retriever, generator, prompts
│   │   ├── review/         # Rubric, scorer
│   │   └── Models/         # Pydantic response models
│   ├── knowledge_base/     # CV rubric, ATS guidelines, bullet examples, role criteria
│   ├── tests/              # pytest test suite (19 tests)
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/            # Axios API client
│   │   ├── components/     # ScoreCards, KeywordList, BulletRewrites, ResultPanel
│   │   ├── pages/          # Home, Upload, Results
│   │   └── styles/         # CSS per page
│   ├── index.html
│   └── package.json
├── terraform/              # Azure infrastructure as code (planned)
├── docker-compose.yml
└── .github/workflows/ci.yml
```

---

## Roadmap

### Kubernetes (planned)
Once the Azure deployment is stable, the system will be migrated to Kubernetes for production-grade orchestration. This includes horizontal pod autoscaling, rolling updates, and a proper ingress controller with rate limiting.

### Terraform + Azure (planned)
Full Azure deployment managed with Terraform: Azure Container Registry, Azure Container App, Azure Key Vault for secrets, and Azure File Share for ChromaDB persistence.

---

## Team

Built by [Seyi Bello](https://github.com/seyiabello), [Jamie Moore-Arthur](https://github.com/jamiemoorearthur), and [Rochelle Smith](https://github.com/rochellejjsmith).

- Seyi: AI/application layer (RAG pipeline, embeddings, vector store, review logic, API endpoints, infrastructure, CI/CD, security)
- Jamie: Knowledge base content, ingestion pipeline, file upload, FastAPI contributions
- [Rochelle Smith](https://github.com/rochellejjsmith): Frontend (React UI, component design, upload flow, results display, Vercel deployment)
