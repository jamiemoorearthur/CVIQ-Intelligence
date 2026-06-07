"""
RAG evaluation using Ragas.

Measures:
- answer_relevancy:    does the review address what was asked?
- context_precision:   are the retrieved rubric chunks relevant to the query?

Metrics NOT used and why:
- faithfulness:     requires answer claims to be attributable to retrieved context.
                    This system uses the knowledge base as a scoring rubric, not as
                    a factual source — review claims ("candidate has FastAPI experience")
                    are derived from the CV/JD, not from rubric text. Score is
                    structurally near 0 regardless of quality.
- context_recall:   requires ground_truth to describe what the context should contain.
                    Our ground_truth describes the expected review output (CV-specific),
                    which will never appear in generic rubric chunks. Always 0.

Scores are pushed to Langfuse after each run for tracking over time.

Run from the backend/ directory:
    pip install -r requirements-eval.txt
    python tests/eval/run_eval.py

Requires OPENAI_API_KEY in environment. LANGFUSE_PUBLIC_KEY and
LANGFUSE_SECRET_KEY are optional — scores are still printed without them.
"""
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from datasets import Dataset
from ragas import evaluate
from ragas.metrics import answer_relevancy, context_precision

from app.embeddings.embedder import embed_single
from app.vectorstore.chroma import get_collection, query_collection
from app.rag.generator import generate_review
from app.core.config import settings

GOLDEN_DATASET = Path(__file__).parent / "golden_dataset.json"
COLLECTION_NAME = "knowledge_base"

# Minimum acceptable scores — eval job fails (and Langfuse records the breach) if any drop below these.
_THRESHOLDS = {
    "answer_relevancy": 0.70,
    "context_precision": 0.60,
}


def _init_langfuse():
    if not settings.langfuse_public_key:
        return None
    try:
        from langfuse import Langfuse
        return Langfuse(
            public_key=settings.langfuse_public_key,
            secret_key=settings.langfuse_secret_key,
            host=settings.langfuse_host,
        )
    except Exception as e:
        print(f"[eval] Langfuse init failed: {e}")
        return None


def _push_scores(langfuse, scores: dict, run_id: str) -> None:
    try:
        trace = langfuse.trace(
            name="ragas-eval",
            id=run_id,
            metadata={"run_at": datetime.now(timezone.utc).isoformat()},
        )
        for metric_name, value in scores.items():
            langfuse.score(
                trace_id=run_id,
                name=metric_name,
                value=round(float(value), 4),
            )
        trace.update(output=scores)
        langfuse.flush()
        print(f"[eval] scores pushed to Langfuse (trace_id={run_id})")
    except Exception as e:
        print(f"[eval] failed to push scores to Langfuse: {e}")


def review_to_prose(review: dict) -> str:
    strengths = "; ".join(review.get("strengths", []))
    weaknesses = "; ".join(review.get("weaknesses", []))
    keywords = ", ".join(review.get("missing_keywords", []))
    bullets = "; ".join(
        f"{b['original']} → {b['improved']}"
        for b in review.get("suggested_bullets", [])
    )
    return (
        f"Overall score: {review.get('overall_score')}. "
        f"ATS score: {review.get('ats_score')}. "
        f"Role alignment: {review.get('role_alignment')}. "
        f"Strengths: {strengths}. "
        f"Weaknesses: {weaknesses}. "
        f"Missing keywords: {keywords}. "
        f"Suggested bullet rewrites: {bullets}."
    )


def run_pipeline_for_eval(cv_text: str, job_description: str):
    query = f"{cv_text[:1000]}\n\n{job_description[:500]}"
    collection = get_collection(COLLECTION_NAME)
    embedding = embed_single(query)
    chunks, _ = query_collection(collection, embedding, n_results=6)
    review = generate_review(cv_text, job_description, chunks)
    return chunks, review


def main():
    with open(GOLDEN_DATASET) as f:
        examples = json.load(f)

    questions, answers, contexts = [], [], []

    for example in examples:
        print(f"Running pipeline for: {example['description']}")
        chunks, review = run_pipeline_for_eval(
            example["cv_text"], example["job_description"]
        )
        questions.append(
            "Review this CV against the job description and provide scores, "
            "missing keywords, strengths, weaknesses, and bullet rewrites."
        )
        answers.append(review_to_prose(review))
        contexts.append(chunks)
        print(f"  overall_score={review.get('overall_score')} ats_score={review.get('ats_score')}")

    dataset = Dataset.from_dict({
        "question": questions,
        "answer": answers,
        "contexts": contexts,
    })

    print("\nRunning Ragas evaluation...")
    results = evaluate(
        dataset=dataset,
        metrics=[answer_relevancy, context_precision],
    )

    scores = {
        "answer_relevancy": results["answer_relevancy"],
        "context_precision": results["context_precision"],
    }

    print("\n=== Ragas Evaluation Results ===")
    print(f"Answer Relevancy:    {scores['answer_relevancy']:.3f}  (1.0 = review directly addresses the question)")
    print(f"Context Precision:   {scores['context_precision']:.3f}  (1.0 = all retrieved rubric chunks are relevant)")
    print()
    print("Per-example breakdown:")
    df = results.to_pandas()
    for i, row in df.iterrows():
        print(
            f"  [{examples[i]['id']}] "
            f"relevancy={row['answer_relevancy']:.3f}  "
            f"precision={row['context_precision']:.3f}"
        )

    langfuse = _init_langfuse()
    if langfuse:
        run_id = f"ragas-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S')}"
        _push_scores(langfuse, scores, run_id)
    else:
        print("\n[eval] LANGFUSE_PUBLIC_KEY not set — scores not persisted")

    # Quality gate — alert and fail if any metric falls below its threshold.
    breaches = {m: v for m, v in scores.items() if v < _THRESHOLDS[m]}
    if breaches:
        print("\n=== QUALITY GATE FAILED ===")
        for metric, value in breaches.items():
            print(f"[alert] type=quality_drop metric={metric} score={value:.3f} threshold={_THRESHOLDS[metric]}")
        if langfuse:
            try:
                run_id_alert = f"ragas-alert-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S')}"
                alert_trace = langfuse.trace(name="ragas-quality-alert", id=run_id_alert)
                for metric, value in breaches.items():
                    langfuse.score(trace_id=run_id_alert, name=f"alert_{metric}", value=round(float(value), 4))
                alert_trace.update(output={"breaches": {m: round(float(v), 4) for m, v in breaches.items()}})
                langfuse.flush()
            except Exception as e:
                print(f"[eval] failed to push alert to Langfuse: {e}")
        sys.exit(1)

    return results


if __name__ == "__main__":
    if not os.getenv("OPENAI_API_KEY"):
        print("Error: OPENAI_API_KEY not set")
        sys.exit(1)
    main()
