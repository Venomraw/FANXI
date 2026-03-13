"""
FanXI News — WC 2026 Intelligence Feed
GET /news/wc2026 — fetches latest World Cup 2026 news from NewsAPI,
enriches each article with a Groq-generated tactical angle, and caches
for 2 hours. Falls back to 4 static articles if NewsAPI key is missing
or the request fails.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional
import httpx
from fastapi import APIRouter, Request
from groq import Groq

from app.config import settings
from app.limiter import limiter

router = APIRouter()

# ── In-memory cache ───────────────────────────────────────────────────────────

_cache: dict = {
    "data": None,
    "expires_at": datetime.min.replace(tzinfo=timezone.utc),
}

CACHE_TTL = timedelta(hours=2)

# ── Static fallback articles ──────────────────────────────────────────────────

STATIC_ARTICLES = [
    {
        "title": "FIFA confirms 48-team format for 2026 World Cup",
        "description": "The expanded format introduces three-team groups in the opening round.",
        "url": "https://www.fifa.com",
        "source": "FIFA",
        "publishedAt": "2025-01-01T00:00:00Z",
        "tacticalAngle": "Three-team groups demand tactical flexibility from all managers.",
    },
    {
        "title": "USA, Canada, Mexico prepare historic joint hosting bid",
        "description": "Three nations will co-host the first 48-team World Cup across 16 cities.",
        "url": "https://www.espn.com",
        "source": "ESPN",
        "publishedAt": "2025-01-02T00:00:00Z",
        "tacticalAngle": "Three-nation hosting creates unique logistical challenges for squad rotation and travel.",
    },
    {
        "title": "European qualifying heats up for 2026 spots",
        "description": "UEFA's expanded allocation means more European teams will feature in 2026.",
        "url": "https://www.uefa.com",
        "source": "UEFA",
        "publishedAt": "2025-01-03T00:00:00Z",
        "tacticalAngle": "UEFA's expanded allocation means more tactical diversity in the tournament.",
    },
    {
        "title": "Mbappé targets back-to-back World Cups with France",
        "description": "Kylian Mbappé remains France's focal point ahead of 2026.",
        "url": "https://www.lequipe.fr",
        "source": "L'Equipe",
        "publishedAt": "2025-01-04T00:00:00Z",
        "tacticalAngle": "If Mbappé leads France's press, opponents must prepare for explosive counter-attacks.",
    },
]

# ── Groq client ───────────────────────────────────────────────────────────────


def _get_tactical_angle(headline: str, description: str) -> str:
    """Call Groq to generate a one-sentence tactical angle for a news headline."""
    if not settings.groq_api_key:
        return "Tactical analysis unavailable."
    try:
        client = Groq(api_key=settings.groq_api_key)
        prompt = (
            f"In one sentence (max 15 words), give a tactical football angle on this "
            f"World Cup news: {headline}. {description}. "
            f"Be specific and tactical, not generic."
        )
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=60,
            temperature=0.7,
        )
        return completion.choices[0].message.content.strip()
    except Exception:
        return "Tactical analysis unavailable."


# ── Endpoint ──────────────────────────────────────────────────────────────────


@router.get("/wc2026", tags=["news"])
@limiter.limit("30/minute")
async def get_wc2026_news(request: Request) -> list[dict]:
    """
    Returns the latest World Cup 2026 news articles with AI tactical angles.
    Results are cached in memory for 2 hours.
    """
    now = datetime.now(timezone.utc)

    # Serve from cache if still fresh
    if _cache["data"] is not None and now < _cache["expires_at"]:
        return _cache["data"]

    # No NewsAPI key — return static fallback immediately
    if not settings.news_api_key:
        _cache["data"] = STATIC_ARTICLES
        _cache["expires_at"] = now + CACHE_TTL
        return STATIC_ARTICLES

    # Fetch from NewsAPI
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://newsapi.org/v2/everything",
                params={
                    "q": "World Cup 2026",
                    "language": "en",
                    "sortBy": "publishedAt",
                    "pageSize": 6,
                    "apiKey": settings.news_api_key,
                },
            )
            resp.raise_for_status()
            raw = resp.json()
    except Exception:
        # Network error or bad status — return static fallback
        return STATIC_ARTICLES

    articles_raw = raw.get("articles", [])
    if not articles_raw:
        return STATIC_ARTICLES

    # Enrich each article with a Groq tactical angle
    articles: list[dict] = []
    for art in articles_raw[:6]:
        tactical = _get_tactical_angle(
            art.get("title", ""),
            art.get("description", "") or "",
        )
        articles.append(
            {
                "title": art.get("title", ""),
                "description": art.get("description", ""),
                "url": art.get("url", ""),
                "source": art.get("source", {}).get("name", "Unknown"),
                "publishedAt": art.get("publishedAt", ""),
                "tacticalAngle": tactical,
            }
        )

    _cache["data"] = articles
    _cache["expires_at"] = now + CACHE_TTL
    return articles
