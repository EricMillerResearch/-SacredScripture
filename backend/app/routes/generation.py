from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..config import settings
from ..database import get_db
from ..models import User, Generation, Subscription
from ..schemas import GenerateRequest, DashboardOut, GenerationOut
from ..services.media import generate_ambient_wav, generate_video_with_audio, media_url
from ..services.subscription import generation_limit_for_plan, has_active_access

router = APIRouter(prefix='/dashboard', tags=['dashboard'])


@router.get('', response_model=DashboardOut)
def dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    subscription = db.scalar(select(Subscription).where(Subscription.user_id == current_user.id))
    generations = db.scalars(select(Generation).where(Generation.user_id == current_user.id).order_by(Generation.created_at.desc())).all()
    plan = subscription.plan if subscription else 'starter'
    status = subscription.status if subscription else 'trialing'
    return DashboardOut(
        plan=plan,
        status=status,
        generation_count=len(generations),
        generation_limit=generation_limit_for_plan(plan),
        generations=[
            GenerationOut(
                id=g.id,
                verse_reference=g.verse_reference,
                mood=g.mood,
                duration_seconds=g.duration_seconds,
                video_path=media_url(g.video_path),
                created_at=g.created_at,
            )
            for g in generations
        ],
    )


@router.post('/generate')
def generate(payload: GenerateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    subscription = db.scalar(select(Subscription).where(Subscription.user_id == current_user.id))
    if not subscription or not has_active_access(subscription.status, subscription.trial_ends_at):
        raise HTTPException(status_code=402, detail='Subscription inactive. Please renew to continue.')

    generation_count = db.scalar(select(func.count()).select_from(Generation).where(Generation.user_id == current_user.id))
    limit = generation_limit_for_plan(subscription.plan)
    if generation_count >= limit:
        raise HTTPException(status_code=429, detail=f'Monthly generation limit reached for {subscription.plan} plan.')

    duration_seconds = payload.duration_minutes * 60
    base_name = f'{current_user.id}_{uuid4().hex}'
    audio_path = str(Path(settings.media_output_dir) / f'{base_name}.wav')
    video_path = str(Path(settings.media_output_dir) / f'{base_name}.mp4')

    generate_ambient_wav(audio_path, payload.mood, duration_seconds)
    generate_video_with_audio(video_path, audio_path, payload.verse_text, payload.mood, duration_seconds)

    generation = Generation(
        user_id=current_user.id,
        verse_reference=payload.verse_reference,
        verse_text=payload.verse_text,
        mood=payload.mood,
        duration_seconds=duration_seconds,
        video_path=video_path,
        audio_path=audio_path,
    )
    db.add(generation)
    db.commit()
    db.refresh(generation)

    return {
        'id': generation.id,
        'video_url': media_url(video_path),
        'audio_url': media_url(audio_path),
        'message': 'Generation complete',
    }
