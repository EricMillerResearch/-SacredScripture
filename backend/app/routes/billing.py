import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..config import settings
from ..database import get_db
from ..models import Subscription, User

router = APIRouter(prefix='/billing', tags=['billing'])
stripe.api_key = settings.stripe_secret_key


@router.post('/checkout/{plan}')
def create_checkout(plan: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if plan not in {'starter', 'pro'}:
        raise HTTPException(status_code=400, detail='Invalid plan')

    price_id = settings.stripe_pro_price_id if plan == 'pro' else settings.stripe_starter_price_id
    if not price_id:
        raise HTTPException(status_code=500, detail='Price ID missing')

    session = stripe.checkout.Session.create(
        mode='subscription',
        line_items=[{'price': price_id, 'quantity': 1}],
        success_url=f'{settings.frontend_url}/dashboard?checkout=success',
        cancel_url=f'{settings.frontend_url}/dashboard?checkout=cancel',
        customer_email=current_user.email,
        metadata={'user_id': current_user.id, 'plan': plan},
    )
    return {'checkout_url': session.url}


@router.post('/webhook')
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get('Stripe-Signature', '')

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, settings.stripe_webhook_secret)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f'Invalid webhook: {exc}')

    if event['type'] == 'checkout.session.completed':
        session_obj = event['data']['object']
        user_id = int(session_obj['metadata']['user_id'])
        plan = session_obj['metadata']['plan']
        subscription = db.scalar(select(Subscription).where(Subscription.user_id == user_id))
        if subscription:
            subscription.plan = plan
            subscription.status = 'active'
            subscription.stripe_customer_id = session_obj.get('customer')
            subscription.stripe_subscription_id = session_obj.get('subscription')
            db.commit()

    if event['type'] == 'customer.subscription.deleted':
        sub = event['data']['object']
        subscription = db.scalar(select(Subscription).where(Subscription.stripe_subscription_id == sub['id']))
        if subscription:
            subscription.status = 'canceled'
            db.commit()

    return {'received': True}
