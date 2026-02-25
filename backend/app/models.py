from datetime import datetime, timedelta, timezone

from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    __tablename__ = 'users'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    subscription: Mapped['Subscription'] = relationship(back_populates='user', uselist=False)
    generations: Mapped[list['Generation']] = relationship(back_populates='user')


class Subscription(Base):
    __tablename__ = 'subscriptions'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), unique=True)
    plan: Mapped[str] = mapped_column(String(50), default='starter')
    status: Mapped[str] = mapped_column(String(50), default='trialing')
    stripe_customer_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    trial_ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc) + timedelta(days=7))

    user: Mapped[User] = relationship(back_populates='subscription')


class Generation(Base):
    __tablename__ = 'generations'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index=True)
    verse_reference: Mapped[str] = mapped_column(String(255))
    verse_text: Mapped[str] = mapped_column(Text)
    mood: Mapped[str] = mapped_column(String(50))
    duration_seconds: Mapped[int] = mapped_column(Integer)
    video_path: Mapped[str] = mapped_column(String(255))
    audio_path: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user: Mapped[User] = relationship(back_populates='generations')
