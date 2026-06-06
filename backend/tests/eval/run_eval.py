"""
RAG evaluation using Ragas.

Measures:
- faithfulness:        are review claims grounded in the retrieved knowledge base chunks?
- answer_relevancy:    does the review address what was asked?
- context_precision:   are the retrieved chunks relevant to the ground truth answer?
- context_recall:      does the retrieved context cover the ground truth answer?

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
from ragas.metrics import faithfulness, answer_relevancy, context_precision, context_recall

from app.embeddings.embedder import embed_single
from app.vectorstore.chroma import get_collection, query_collection
from app.rag.generator import generate_review
from app.core.config import settings

GOLDEN_DATASET = Path(__file__).parent / "golden_dataset.json"
COLLECTION_NAME = "knowledge_base"


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

    questions, answers, contexts, ground_truths = [], [], [], []

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
        ground_truths.append(example["ground_truth"])
        print(f"  overall_score={review.get('overall_score')} ats_score={review.get('ats_score')}")

    dataset = Dataset.from_dict({
        "question": questions,
        "answer": answers,
        "contexts": contexts,
        "ground_truth": ground_truths,
    })

    print("\nRunning Ragas evaluation...")
    results = evaluate(
        dataset=dataset,
        metrics=[faithfulness, answer_relevancy, context_precision, context_recall],
    )

    scores = {
        "faithfulness": results["faithfulness"],
        "answer_relevancy": results["answer_relevancy"],
        "context_precision": results["context_precision"],
        "context_recall": results["context_recall"],
    }

    print("\n=== Ragas Evaluation Results ===")
    print(f"Faithfulness:        {scores['faithfulness']:.3f}  (1.0 = fully grounded in retrieved context)")
    print(f"Answer Relevancy:    {scores['answer_relevancy']:.3f}  (1.0 = directly answers the question)")
    print(f"Context Precision:   {scores['context_precision']:.3f}  (1.0 = all retrieved chunks are relevant)")
    print(f"Context Recall:      {scores['context_recall']:.3f}  (1.0 = ground truth fully covered by context)")
    print()
    print("Per-example breakdown:")
    df = results.to_pandas()
    for i, row in df.iterrows():
        print(
            f"  [{examples[i]['id']}] "
            f"faithfulness={row['faithfulness']:.3f}  "
            f"relevancy={row['answer_relevancy']:.3f}  "
            f"precision={row['context_precision']:.3f}  "
            f"recall={row['context_recall']:.3f}"
        )

    langfuse = _init_langfuse()
    if langfuse:
        run_id = f"ragas-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S')}"
        _push_scores(langfuse, scores, run_id)
    else:
        print("\n[eval] LANGFUSE_PUBLIC_KEY not set — scores not persisted")

    return results


if __name__ == "__main__":
    if not os.getenv("OPENAI_API_KEY"):
        print("Error: OPENAI_API_KEY not set")
        sys.exit(1)
    main()
