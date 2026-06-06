import json
from openai import OpenAI
from app.core.config import settings
from app.core.exceptions import LLMError
from app.rag.prompts import SYSTEM_PROMPT, build_review_prompt

client = OpenAI(api_key=settings.openai_api_key)


def generate_review(cv_text: str, job_description: str, context_chunks: list[str], trace=None) -> dict:
    user_prompt = build_review_prompt(cv_text, job_description, context_chunks)
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    generation = None
    try:
        if trace:
            generation = trace.generation(
                name="gpt-review",
                model=settings.openai_model,
                input=messages,
            )
    except Exception:
        generation = None

    try:
        response = client.chat.completions.create(
            model=settings.openai_model,
            messages=messages,
            temperature=0.2,
            response_format={"type": "json_object"},
        )
    except Exception as e:
        try:
            if generation:
                generation.end(level="ERROR", status_message=str(e))
        except Exception:
            pass
        raise LLMError(f"GPT call failed: {e}") from e

    try:
        if generation:
            generation.end(
                output=response.choices[0].message.content,
                usage={
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens,
                },
            )
    except Exception:
        pass

    raw = response.choices[0].message.content
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        raise LLMError(f"GPT returned invalid JSON: {e}\nRaw response: {raw}") from e
