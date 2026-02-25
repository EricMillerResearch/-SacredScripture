import csv
import io
import json
from pathlib import Path

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..config import settings
from ..database import get_db
from ..models import User, Subscription, Generation
from ..schemas import LeadContactRequest

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


def load_lead_status():
    status_path = Path(settings.leads_output_file).with_suffix('.status.json')
    if not status_path.exists():
        return {}
    try:
        return json.loads(status_path.read_text(encoding='utf-8'))
    except json.JSONDecodeError:
        return {}


def save_lead_status(status):
    status_path = Path(settings.leads_output_file).with_suffix('.status.json')
    status_path.write_text(json.dumps(status, indent=2), encoding='utf-8')


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
def admin_leads(q: str | None = None, limit: int = 200, offset: int = 0, current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail='Admins only')
    leads = load_leads()
    status = load_lead_status()
    if q:
        q_lower = q.lower()
        leads = [l for l in leads if q_lower in (l.get('email') or '').lower() or q_lower in (l.get('church') or '').lower()]
    leads.sort(key=lambda l: l.get('received_at') or '', reverse=True)
    safe_limit = max(1, min(limit, 1000))
    slice_start = max(0, offset)
    slice_end = slice_start + safe_limit
    window = leads[slice_start:slice_end]
    for lead in window:
        lead['contacted_at'] = status.get(lead.get('email', ''), None)
    return {'leads': window, 'total': len(leads)}


@router.post('/leads/contacted')
def mark_lead_contacted(payload: LeadContactRequest, current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail='Admins only')
    status = load_lead_status()
    status[payload.email] = datetime.utcnow().isoformat() + 'Z'
    save_lead_status(status)
    return {'status': 'ok', 'contacted_at': status[payload.email]}


@router.get('/leads.csv')
def admin_leads_csv(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail='Admins only')
    leads = load_leads()
    status = load_lead_status()
    output = io.StringIO()
    fieldnames = ['received_at', 'name', 'email', 'church', 'role', 'consent', 'ip', 'contacted_at']
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    for lead in leads:
        lead = {**lead, 'contacted_at': status.get(lead.get('email', ''), '')}
        writer.writerow({k: lead.get(k, '') for k in fieldnames})
    return Response(content=output.getvalue(), media_type='text/csv')
