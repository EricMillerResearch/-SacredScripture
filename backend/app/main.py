from pathlib import Path

import json
from datetime import datetime

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .database import Base, engine
from .routes import auth, generation, billing, admin
from .schemas import LeadRequest

app = FastAPI(title='SacredScripture API', version='1.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, 'http://localhost:5173', 'http://localhost:3000'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(auth.router)
app.include_router(generation.router)
app.include_router(billing.router)
app.include_router(admin.router)

Path(settings.media_output_dir).mkdir(parents=True, exist_ok=True)
app.mount('/media', StaticFiles(directory=settings.media_output_dir), name='media')


@app.on_event('startup')
def startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.get('/health')
def health():
    return {'status': 'ok', 'app': settings.app_name}


@app.post('/leads')
def capture_lead(payload: LeadRequest, request: Request):
    if not payload.consent:
        raise HTTPException(status_code=400, detail='Consent required')
    lead = payload.model_dump()
    lead.update({
        'received_at': datetime.utcnow().isoformat() + 'Z',
        'ip': request.client.host if request.client else None,
    })
    out_path = Path(settings.leads_output_file)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open('a', encoding='utf-8') as handle:
        handle.write(json.dumps(lead) + '\n')
    return {'status': 'ok'}
