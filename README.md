# SacredScripture

**Tagline:** Verse-Based Ambient Worship Media

SacredScripture is a production-ready SaaS web app for churches to generate scripture-based ambient worship videos with matching audio.

## Church quick start
- Create an account and start the free trial.
- Choose a verse and a mood.
- Generate a video.
- Download and drop into ProPresenter, OBS, or MediaShout.

Guides:
- `docs/ONBOARDING.md`
- `docs/DEPLOYMENT.md`

## Stack
- **Frontend:** React + Vite (dark minimal dashboard UI)
- **Backend:** FastAPI + SQLAlchemy
- **Database:** PostgreSQL
- **Media rendering:** NumPy audio synthesis + FFmpeg video encoding
- **Billing:** Stripe subscriptions + webhooks
- **Deployment:** Docker / Docker Compose

## Plans
- **Starter** — $19/month, 20 generations/month, 7-day trial
- **Pro** — $39/month, 100 generations/month, 7-day trial

## Features
- Email/password auth with JWT
- Stripe checkout and webhook-driven plan updates
- Plan-based generation limits
- Dashboard with saved generation history
- Generation pipeline:
  - loopable 44.1kHz ambient WAV with soft reverb and fade in/out
  - 1080p H.264 MP4 with slow gradient drift, subtle texture noise, centered verse text
- Admin stats endpoint for users/subscriptions/generation counts

## Local setup
### 1) Docker setup (recommended)
```bash
docker compose up --build
```
- Frontend: http://localhost:5173
- Backend docs: http://localhost:8000/docs

### 2) Manual backend setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env
uvicorn app.main:app --reload
```

### 3) Manual frontend setup
```bash
cd frontend
npm install
npm run dev
```

Add `VITE_API_BASE=http://localhost:8000` to `frontend/.env` if needed.

## Stripe setup
1. Create Stripe recurring prices for Starter and Pro.
2. Add values in `.env`:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_STARTER_PRICE_ID`
   - `STRIPE_PRO_PRICE_ID`
3. Forward webhooks locally:
```bash
stripe listen --forward-to localhost:8000/billing/webhook
```

## API overview
- `POST /auth/register`
- `POST /auth/login`
- `GET /dashboard`
- `POST /dashboard/generate`
- `POST /billing/checkout/{starter|pro}`
- `POST /billing/webhook`
- `GET /admin/stats` (admin users only)

## Production deployment notes
- Run FastAPI behind a reverse proxy (Nginx/Traefik) with TLS.
- Store media outputs in persistent object storage or shared volume.
- Rotate JWT secret and Stripe keys via secure env var manager.
- Run DB migrations with Alembic (recommended next step).
- Use a process manager / orchestration (Docker Swarm, Kubernetes, ECS, etc.).

## Branding assets
- App name: **SacredScripture**
- Tagline: **Verse-Based Ambient Worship Media**
- Add your logo placeholder in `frontend/public/logo-placeholder.svg`.
