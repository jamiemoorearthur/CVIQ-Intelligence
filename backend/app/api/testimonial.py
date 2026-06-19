from fastapi import APIRouter
from app.models.testimonial import Testimonial

router = APIRouter(
    prefix="/testimonials",
    tags=["Testimonials"]
)

testimonials_db = []


@router.post("/")
async def submit_testimonial(testimonial: Testimonial):
    testimonials_db.append(testimonial.model_dump())

    return {
        "success": True,
        "message": "Testimonial submitted successfully"
    }


@router.get("/")
async def get_testimonials():
    return testimonials_db
