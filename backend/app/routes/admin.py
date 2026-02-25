import csv
import io
import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..config import settings
from ..database import get_db
from ..models import User, Subscription, Generation

router = APIRouter(prefix='/admin', tags=['admin'])

def load_leads():
    path = Path(settings.leads_output_file)
    if not path.exists():
        return []
    leads = []
    for line in path.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            leads.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return leads


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


@router.get('/leads')
def admin_leads(limit: int = 200, current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail='Admins only')
    leads = load_leads()
    leads.sort(key=lambda l: l.get('received_at') or '', reverse=True)
    return {'leads': leads[: max(1, min(limit, 1000))]}


@router.get('/leads.csv')
def admin_leads_csv(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail='Admins only')
    leads = load_leads()
    output = io.StringIO()
    fieldnames = ['received_at', 'name', 'email', 'church', 'role', 'consent', 'ip']
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    for lead in leads:
        writer.writerow({k: lead.get(k, '') for k in fieldnames})
    return Response(content=output.getvalue(), media_type='text/csv')
