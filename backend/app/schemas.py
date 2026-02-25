from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'


class GenerateRequest(BaseModel):
    verse_reference: str
    verse_text: str
    mood: str
    duration_minutes: int


class GenerationOut(BaseModel):
    id: int
    verse_reference: str
    mood: str
    duration_seconds: int
    video_path: str
    created_at: datetime


class DashboardOut(BaseModel):
    plan: str
    status: str
    generation_count: int
    generation_limit: int
    generations: list[GenerationOut]
