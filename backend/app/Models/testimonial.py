# models/testimonial.py
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

class Testimonial(BaseModel):
    id: Optional[str] = None
    name: str
    role: str
    rating: str
    ats_before: Optional[str] = None
    ats_after: Optional[str] = None
    review: str
    linkedin_url: Optional[str] = None
    approved: Optional[bool] = None
