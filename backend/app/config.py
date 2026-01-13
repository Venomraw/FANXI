from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # API-Football key
    football_api_key: str

    # Base URL for API-Football v3
    football_api_base_url: str = "https://v3.football.api-sports.io"

    # La Liga league ID + season in API-Football
    football_laliga_id: int = 140
    football_season: int = 2024

    # Tell Pydantic where to read env vars from
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",   # ignore any extra env vars you might have
    )


settings = Settings()
