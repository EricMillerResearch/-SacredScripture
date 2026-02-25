from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    app_name: str = 'SacredScripture'
    jwt_secret: str = 'change-me'
    jwt_algorithm: str = 'HS256'
    access_token_minutes: int = 60 * 24

    database_url: str = 'postgresql+psycopg://postgres:postgres@db:5432/sacredscripture'

    stripe_secret_key: str = ''
    stripe_webhook_secret: str = ''
    stripe_starter_price_id: str = ''
    stripe_pro_price_id: str = ''
    frontend_url: str = 'http://localhost:5173'

    media_output_dir: str = 'generated_media'
    ffmpeg_binary: str = 'ffmpeg'
    leads_output_file: str = 'leads.jsonl'


settings = Settings()
