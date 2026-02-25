from datetime import datetime, timezone

PLAN_LIMITS = {
    'starter': 20,
    'pro': 100,
}


def generation_limit_for_plan(plan: str) -> int:
    return PLAN_LIMITS.get(plan, 20)


def has_active_access(status: str, trial_ends_at: datetime | None) -> bool:
    if status == 'active':
        return True
    if status == 'trialing' and trial_ends_at:
        return trial_ends_at >= datetime.now(timezone.utc)
    return False
