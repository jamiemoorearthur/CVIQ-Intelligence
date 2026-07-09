import json
from fastapi import APIRouter, HTTPException
from app.Models.cv_models import (
    ChatRequest, ChatResponse,
    RewriteBulletRequest, RewriteBulletResponse,
)
from app.core.llm import get_llm_client
from app.rag.retriever import retrieve_context

router = APIRouter()

_MAX_HISTORY = 20  # cap to avoid unbounded context growth
_CHAT_MAX_TOKENS = 1000
_REWRITE_MAX_TOKENS = 600


def _build_chat_system_prompt(cv_text: str, job_description: str, context_chunks: list[str]) -> str:
    kb_context = "\n\n".join(context_chunks) if context_chunks else "No additional context available."
    return f"""You are a CV review assistant with 15 years of experience as a senior recruiter. You are helping a candidate improve their CV for a specific job.

You have already reviewed their CV and job description. Answer questions directly, reference specific lines from the CV, and give concrete, actionable advice. When asked to rewrite a bullet, provide 2-3 distinct alternatives using only facts present in the original CV.

## Candidate's CV
{cv_text}

## Job Description
{job_description}

## Relevant Hiring Guidelines
{kb_context}

Be concise, specific, and practical. Do not give generic advice — always tie your answer back to something you can see in the CV or the job description."""


@router.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest):
    query = f"{body.message} {body.job_description[:400]}"
    try:
        context_chunks = retrieve_context(query, n_results=4)
    except Exception:
        context_chunks = []

    system_prompt = _build_chat_system_prompt(body.cv_text, body.job_description, context_chunks)

    messages = [{"role": "system", "content": system_prompt}]
    for msg in body.history[-_MAX_HISTORY:]:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": body.message})

    try:
        client, model = get_llm_client(tier="free")
        completion = client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=_CHAT_MAX_TOKENS,
            temperature=0.7,
        )
        return ChatResponse(response=completion.choices[0].message.content)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Chat model unavailable: {str(e)}")


@router.post("/rewrite-bullet", response_model=RewriteBulletResponse)
async def rewrite_bullet(body: RewriteBulletRequest):
    prompt = f"""Rewrite the following weak CV bullet in exactly 3 different ways.

Job description context:
{body.job_description}

Weak bullet to rewrite:
{body.bullet}

Return a JSON object with exactly this structure:
{{"rewrites": ["<version 1>", "<version 2>", "<version 3>"]}}

Rules:
- Each rewrite must follow: strong action verb + specific task + measurable result
- Use only facts present in the original bullet — do not invent metrics or details
- Each version takes a different angle: version 1 = technical depth, version 2 = scale or impact, version 3 = business outcome
- Keep each rewrite to one sentence
- Return valid JSON only. No markdown, no explanation."""

    try:
        client, model = get_llm_client(tier="free")
        completion = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=_REWRITE_MAX_TOKENS,
            temperature=0.6,
        )
        content = completion.choices[0].message.content.strip()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Rewrite model unavailable: {str(e)}")

    try:
        data = json.loads(content)
        rewrites = [str(r) for r in data.get("rewrites", [])][:3]
    except (json.JSONDecodeError, AttributeError):
        # best-effort: split by newline if JSON parse fails
        rewrites = [
            line.lstrip("0123456789.-) ").strip()
            for line in content.split("\n")
            if line.strip() and not line.strip().startswith("{")
        ][:3]

    if not rewrites:
        raise HTTPException(status_code=502, detail="Model returned no rewrites")

    return RewriteBulletResponse(rewrites=rewrites)
