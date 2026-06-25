from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from supabase import create_client

from app.core.config import settings

router = APIRouter(prefix="/testimonials")


def _client():
    return create_client(settings.supabase_url, settings.supabase_service_key)


class TestimonialIn(BaseModel):
    name: str
    role: str
    content: str


@router.get("")
def get_testimonials():
    """Return all testimonials ordered by most recent first."""
    try:
        res = _client().table("testimonials").select("*").order("created_at", desc=True).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", status_code=201)
def create_testimonial(body: TestimonialIn):
    """Submit a new testimonial."""
    try:
        res = _client().table("testimonials").insert(body.model_dump()).execute()
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
