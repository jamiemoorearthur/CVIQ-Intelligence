import os
import stripe
from fastapi import APIRouter, HTTPException

router = APIRouter()

STRIPE_SECRET = os.getenv("STRIPE_SECRET_KEY")
PRICE_ID = os.getenv("STRIPE_PRICE_ID")
YOUR_DOMAIN = os.getenv(
    "YOUR_DOMAIN",
    "http://129.159.222.241"
)


def get_client():
    if not STRIPE_SECRET:
        raise HTTPException(
            status_code=500,
            detail="Stripe is not configured."
        )
    return stripe.StripeClient(STRIPE_SECRET)


@router.post("/create-checkout-session")
async def create_checkout_session():

    if not PRICE_ID:
        raise HTTPException(
            status_code=500,
            detail="Missing STRIPE_PRICE_ID"
        )

    client = get_client()

    try:
        session = client.checkout.sessions.create(
            params={
                "ui_mode": "embedded",
                "line_items": [
                    {
                        "price": PRICE_ID,
                        "quantity": 1,
                    }
                ],
                "mode": "subscription",
                "return_url": (
                    f"{YOUR_DOMAIN}/return.html"
                    "?session_id={{CHECKOUT_SESSION_ID}}"
                ),
            }
        )

        return {
            "clientSecret": session.client_secret
        }

    except stripe.StripeError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )


@router.get("/session-status")
async def session_status(session_id: str):

    client = get_client()

    try:
        session = client.checkout.sessions.retrieve(session_id)

        email = (
            session.customer_details.email
            if session.customer_details
            else None
        )

        return {
            "status": session.status,
            "customer_email": email,
        }

    except stripe.StripeError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
