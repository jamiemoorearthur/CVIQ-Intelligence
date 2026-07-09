from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from app.ingestion.loader import load_text_from_bytes
from app.review.ats_parser import parse_ats
from app.core.exceptions import CVReviewerError

router = APIRouter()


@router.post("/ats-preview")
async def ats_preview(
    cv_file: UploadFile = File(...),
    job_description: str = Form(...),
):
    file_bytes = await cv_file.read()
    try:
        cv_text = load_text_from_bytes(file_bytes, cv_file.filename)
    except CVReviewerError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return parse_ats(cv_text, job_description)
