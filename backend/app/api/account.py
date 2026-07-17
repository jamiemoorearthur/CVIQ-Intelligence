import os
import stripe
from fastapi import APIRouter, Depends, HTTPException
from supabase import create_client

from app.core.auth import require_user
from app.core.config import settings

router = APIRouter()

STRIPE_SECRET = os.getenv("STRIPE_SECRET_KEY")


def _get_supabase():
    if not settings.supabase_url or not settings.supabase_service_key:
        return None
    return create_client(settings.supabase_url, settings.supabase_service_key)


@router.delete("/account")
async def delete_account(user: dict = Depends(require_user)):
    user_id = user["id"]
    supabase = _get_supabase()
    if not supabase:
        raise HTTPException(status_code=503, detail="Auth service not configured.")

    # Fetch Stripe subscription details before deleting the profile
    profile = None
    try:
        result = (
            supabase.table("user_profiles")
            .select("stripe_subscription_id")
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        profile = result.data
    except Exception:
        pass

    # Cancel active Stripe subscription so the user isn't billed again
    if profile and profile.get("stripe_subscription_id") and STRIPE_SECRET:
        try:
            client = stripe.StripeClient(STRIPE_SECRET)
            client.subscriptions.cancel(profile["stripe_subscription_id"])
            print(f"[delete-account] cancelled subscription={profile['stripe_subscription_id']} for user={user_id}")
        except stripe.StripeError as e:
            # Log but don't block — account deletion should still proceed
            print(f"[delete-account] stripe cancellation failed for user={user_id}: {e}")

    # Delete user_profiles row first (FK constraint on auth.users)
    try:
        supabase.table("user_profiles").delete().eq("user_id", user_id).execute()
    except Exception as e:
        print(f"[delete-account] profile deletion failed for user={user_id}: {e}")

    # Delete the auth user — requires service role key
    try:
        supabase.auth.admin.delete_user(user_id)
        print(f"[delete-account] deleted auth user={user_id}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete account: {e}")

    return {"deleted": True}
