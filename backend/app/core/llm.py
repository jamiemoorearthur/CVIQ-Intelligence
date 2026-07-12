from openai import OpenAI
from app.core.config import settings


def get_llm_client(tier: str = "paid") -> tuple[OpenAI, str]:
    """Return (client, model_name) for the given user tier.

    tier="free"  → Ollama running locally (no cost)
    tier="paid"  → OpenAI API
    """
    return OpenAI(api_key=settings.openai_api_key), settings.openai_model
