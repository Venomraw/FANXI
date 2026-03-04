from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # API-Football key
    football_api_key: str

    # Base URL for API-Football v3
    football_api_base_url: str = "https://v3.football.api-sports.io"

    # La Liga league ID + season in API-Football
    football_laliga_id: int = 140
    football_season: int = 2024

    # Nation Intel APIs
    guardian_api_key: str = ""
    newsdata_api_key: str = ""
    youtube_api_key: str = ""

    # Password reset via Resend (resend.com)
    resend_api_key: str = ""
    frontend_url: str = "http://localhost:3000"

    # JWT Secret
    secret_key: str = ""

    # Anthropic Claude API
    anthropic_api_key: str = ""

    # Tell Pydantic where to read env vars from
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
