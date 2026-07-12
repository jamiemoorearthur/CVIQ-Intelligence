import stripe
from fastapi import APIRouter, Request, HTTPException, Header
from supabase import create_client

from app.core.config import settings

router = APIRouter()


def _get_supabase():
    if not settings.supabase_url or not settings.supabase_service_key:
        return None
    return create_client(settings.supabase_url, settings.supabase_service_key)


def _upsert_profile(user_id: str, is_pro: bool, stripe_customer_id: str = None,
                    subscription_id: str = None, subscription_status: str = None):
    supabase = _get_supabase()
    if not supabase:
        print("[stripe-webhook] Supabase not configured — skipping profile update")
        return
    data = {"user_id": user_id, "is_pro": is_pro}
    if stripe_customer_id:
        data["stripe_customer_id"] = stripe_customer_id
    if subscription_id:
        data["stripe_subscription_id"] = subscription_id
    if subscription_status:
        data["subscription_status"] = subscription_status
    supabase.table("user_profiles").upsert(data).execute()
    print(f"[stripe-webhook] upserted user_id={user_id} is_pro={is_pro} status={subscription_status}")


def _find_user_by_customer(customer_id: str) -> str | None:
    supabase = _get_supabase()
    if not supabase:
        return None
    try:
        result = (
            supabase.table("user_profiles")
            .select("user_id")
            .eq("stripe_customer_id", customer_id)
            .execute()
        )
        return result.data[0]["user_id"] if result.data else None
    except Exception:
        return None


@router.post("/stripe/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="stripe-signature"),
):
    if not settings.stripe_webhook_secret:
        raise HTTPException(status_code=500, detail="Webhook secret not configured")

    payload = await request.body()

    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, settings.stripe_webhook_secret
        )
    except stripe.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook error: {e}")

    event_type = event["type"]
    obj = event["data"]["object"]

    if event_type == "checkout.session.completed":
        user_id = obj.get("client_reference_id")
        if not user_id:
            print("[stripe-webhook] checkout.session.completed missing client_reference_id")
            return {"received": True}
        _upsert_profile(
            user_id=user_id,
            is_pro=True,
            stripe_customer_id=obj.get("customer"),
            subscription_id=obj.get("subscription"),
            subscription_status="active",
        )

    elif event_type == "customer.subscription.updated":
        customer_id = obj.get("customer")
        status = obj.get("status", "")
        user_id = _find_user_by_customer(customer_id)
        if user_id:
            _upsert_profile(
                user_id=user_id,
                is_pro=(status == "active"),
                subscription_status=status,
            )

    elif event_type == "customer.subscription.deleted":
        customer_id = obj.get("customer")
        user_id = _find_user_by_customer(customer_id)
        if user_id:
            _upsert_profile(user_id=user_id, is_pro=False, subscription_status="cancelled")

    else:
        print(f"[stripe-webhook] unhandled event type={event_type}")

    return {"received": True}
