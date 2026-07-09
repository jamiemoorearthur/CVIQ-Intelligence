import json
import time
from app.core.config import settings
from app.core.llm import get_llm_client
from app.core.exceptions import LLMError
from app.rag.prompts import SYSTEM_PROMPT, build_review_prompt

_COST_PER_INPUT_TOKEN = 0.15 / 1_000_000
_COST_PER_OUTPUT_TOKEN = 0.60 / 1_000_000
_COST_ALERT_THRESHOLD_USD = 0.01   # alert if a single request exceeds 1 cent
_LATENCY_ALERT_THRESHOLD_MS = 8_000  # alert if inference alone exceeds 8 s

# Token budget: the review JSON (scores, keywords, bullets) uses ~220-260 tokens
# in practice. 800 is a hard ceiling that prevents runaway output costs while
# leaving enough headroom for verbose responses.
_MAX_OUTPUT_TOKENS = 2000

# Caching note: OpenAI automatic prompt caching applies to prefixes >1024 tokens.
# The system prompt alone is well under that, and every user prompt is unique
# (different CV + JD each request), so no prompt prefix is ever reused.
# Response caching is also inapplicable — each review is for a unique document.

_HALLUCINATION_MARKERS = [
    "as an ai",
    "i cannot",
    "i'm not able",
    "i don't know",
    "i believe",
    "i think",
    "i'm not sure",
    "as a language model",
]


def _check_output_gate(review: dict) -> dict:
    text = json.dumps(review).lower()
    triggered = [m for m in _HALLUCINATION_MARKERS if m in text]
    if triggered:
        print(f"[guardrail] gate=output reason=hallucination_marker markers={triggered}")
        review["_output_gate_warning"] = triggered
    return review


def generate_review(cv_text: str, job_description: str, context_chunks: list[str], trace=None, tier: str = "paid") -> dict:
    client, model = get_llm_client(tier)
    is_openai = tier != "free"

    user_prompt = build_review_prompt(cv_text, job_description, context_chunks)
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    generation = None
    try:
        if trace and is_openai:
            generation = trace.generation(
                name="gpt-review",
                model=model,
                input=messages,
            )
    except Exception:
        generation = None

    t0 = time.perf_counter()
    try:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.2,
            response_format={"type": "json_object"},
            max_tokens=_MAX_OUTPUT_TOKENS,
        )
    except Exception as e:
        try:
            if generation:
                generation.end(level="ERROR", status_message=str(e))
        except Exception:
            pass
        raise LLMError(f"LLM call failed: {e}") from e

    elapsed_ms = (time.perf_counter() - t0) * 1000
    usage = response.usage

    if is_openai:
        cost = (usage.prompt_tokens * _COST_PER_INPUT_TOKEN) + (usage.completion_tokens * _COST_PER_OUTPUT_TOKEN)
        print(
            f"[llm] provider=openai model={model} prompt={usage.prompt_tokens} completion={usage.completion_tokens} "
            f"total={usage.total_tokens} cost=${cost:.4f} latency={elapsed_ms:.0f}ms"
        )
        if cost > _COST_ALERT_THRESHOLD_USD:
            print(f"[alert] type=cost_spike cost=${cost:.4f} threshold=${_COST_ALERT_THRESHOLD_USD:.4f}")
            try:
                if trace:
                    trace.event(name="cost_spike", metadata={"cost_usd": round(cost, 6), "threshold_usd": _COST_ALERT_THRESHOLD_USD})
            except Exception:
                pass
    else:
        cost = 0.0
        print(
            f"[llm] provider=ollama model={model} prompt={usage.prompt_tokens} completion={usage.completion_tokens} "
            f"latency={elapsed_ms:.0f}ms"
        )

    if elapsed_ms > _LATENCY_ALERT_THRESHOLD_MS:
        print(f"[alert] type=inference_latency_spike latency={elapsed_ms:.0f}ms threshold={_LATENCY_ALERT_THRESHOLD_MS}ms")
        try:
            if trace:
                trace.event(name="inference_latency_spike", metadata={"latency_ms": round(elapsed_ms), "threshold_ms": _LATENCY_ALERT_THRESHOLD_MS})
        except Exception:
            pass

    try:
        if generation:
            generation.end(
                output=response.choices[0].message.content,
                usage={
                    "prompt_tokens": usage.prompt_tokens,
                    "completion_tokens": usage.completion_tokens,
                    "total_tokens": usage.total_tokens,
                },
                metadata={
                    "estimated_cost_usd": round(cost, 6),
                    "latency_ms": round(elapsed_ms),
                },
            )
    except Exception:
        pass

    raw = response.choices[0].message.content
    try:
        review = json.loads(raw)
    except json.JSONDecodeError as e:
        raise LLMError(f"LLM returned invalid JSON: {e}\nRaw response: {raw}") from e

    return _check_output_gate(review)
