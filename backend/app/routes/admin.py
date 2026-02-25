from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import User, Subscription, Generation

router = APIRouter(prefix='/admin', tags=['admin'])


@router.get('/stats')
def admin_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail='Admins only')

    users = db.scalar(select(func.count()).select_from(User))
    active_subscriptions = db.scalar(select(func.count()).select_from(Subscription).where(Subscription.status == 'active'))
    generations = db.scalar(select(func.count()).select_from(Generation))

    recent_users = db.scalars(select(User).order_by(User.created_at.desc()).limit(20)).all()
    return {
        'users': users,
        'active_subscriptions': active_subscriptions,
        'generation_count': generations,
        'recent_users': [{'id': u.id, 'email': u.email, 'created_at': u.created_at} for u in recent_users],
    }
