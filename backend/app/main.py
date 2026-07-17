from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import health, review, upload, knowledge_base, download, auth, testimonials, stripe_checkout, stripe_webhook, ats_preview, chat, account
from app.core.config import settings
from app.ingestion.kb_loader import load_knowledge_base


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_knowledge_base()
    yield


app = FastAPI(title="CV Reviewer API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(testimonials.router)
app.include_router(upload.router)
app.include_router(review.router)
app.include_router(download.router)
app.include_router(knowledge_base.router)
app.include_router(stripe_checkout.router)
app.include_router(stripe_webhook.router)
app.include_router(ats_preview.router)
app.include_router(chat.router)
app.include_router(account.router)

@app.get("/")
def root():
    return {"message": "CV Reviewer API is running"}
