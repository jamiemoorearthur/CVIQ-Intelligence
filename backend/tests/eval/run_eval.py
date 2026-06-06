"""
RAG evaluation using Ragas.

Measures:
- faithfulness: are review claims grounded in the retrieved knowledge base chunks?
- answer_relevancy: does the review address what was asked?

Run from the backend/ directory:
    pip install -r requirements-eval.txt
    python tests/eval/run_eval.py

Requires OPENAI_API_KEY in environment (Ragas uses an LLM as judge).
"""
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "backend"))

from datasets import Dataset
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy

from app.embeddings.embedder import embed_single
from app.vectorstore.chroma import get_collection, query_collection
from app.rag.generator import generate_review

GOLDEN_DATASET = Path(__file__).parent / "golden_dataset.json"
COLLECTION_NAME = "knowledge_base"


def run_pipeline_for_eval(cv_text: str, job_description: str):
    query = f"{cv_text[:1000]}\n\n{job_description[:500]}"
    collection = get_collection(COLLECTION_NAME)
    embedding = embed_single(query)
    chunks = query_collection(collection, embedding, n_results=6)
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
            f"Review this CV against the job description and provide scores, "
            f"missing keywords, strengths, weaknesses, and bullet rewrites."
        )
        answers.append(json.dumps(review, indent=2))
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
        metrics=[faithfulness, answer_relevancy],
    )

    print("\n=== Ragas Evaluation Results ===")
    print(f"Faithfulness:     {results['faithfulness']:.3f}  (1.0 = fully grounded in retrieved context)")
    print(f"Answer Relevancy: {results['answer_relevancy']:.3f}  (1.0 = directly answers the question)")
    print()
    print("Per-example breakdown:")
    df = results.to_pandas()
    for i, row in df.iterrows():
        print(f"  [{examples[i]['id']}] faithfulness={row['faithfulness']:.3f}  relevancy={row['answer_relevancy']:.3f}")

    return results


if __name__ == "__main__":
    if not os.getenv("OPENAI_API_KEY"):
        print("Error: OPENAI_API_KEY not set")
        sys.exit(1)
    main()
