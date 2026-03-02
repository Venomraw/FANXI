"""
Nation Intel API — aggregates Guardian news, NewsData, Reddit, and YouTube
for a given World Cup nation. All results are fetched server-side to keep
API keys out of the browser.
"""

import httpx
from fastapi import APIRouter, HTTPException, Query
from app.config import settings

router = APIRouter(prefix="/intel", tags=["intel"])

# ── Guardian ──────────────────────────────────────────────────────────────────

@router.get("/news/{team_name}")
async def get_team_news(team_name: str, page: int = Query(default=1, ge=1)):
    """Fetch Guardian football articles for a given nation."""
    if not settings.guardian_api_key:
        raise HTTPException(status_code=503, detail="Guardian API key not configured")

    params = {
        "q": f"{team_name} World Cup",
        "section": "football",
        "order-by": "newest",
        "page-size": 12,
        "page": page,
        "show-fields": "thumbnail,trailText,byline,publication",
        "api-key": settings.guardian_api_key,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get("https://content.guardianapis.com/search", params=params)

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Guardian API error")

    data = resp.json().get("response", {})
    articles = []
    for item in data.get("results", []):
        fields = item.get("fields", {})
        articles.append({
            "id": item.get("id"),
            "title": item.get("webTitle"),
            "url": item.get("webUrl"),
            "published": item.get("webPublicationDate"),
            "section": item.get("sectionName"),
            "thumbnail": fields.get("thumbnail"),
            "trail": fields.get("trailText"),
            "byline": fields.get("byline"),
        })

    return {
        "total": data.get("total", 0),
        "page": data.get("currentPage", 1),
        "pages": data.get("pages", 1),
        "articles": articles,
    }


# ── NewsData ──────────────────────────────────────────────────────────────────

@router.get("/more-news/{team_name}")
async def get_more_news(team_name: str):
    """Fetch additional news from NewsData.io."""
    if not settings.newsdata_api_key:
        return {"articles": []}          # Graceful degradation until key added

    params = {
        "apikey": settings.newsdata_api_key,
        "q": f"{team_name} World Cup 2026",
        "language": "en",
        "category": "sports",
        "size": 6,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get("https://newsdata.io/api/1/news", params=params)

    if resp.status_code != 200:
        return {"articles": []}

    results = resp.json().get("results", [])
    articles = [
        {
            "title": r.get("title"),
            "url": r.get("link"),
            "published": r.get("pubDate"),
            "source": r.get("source_id"),
            "thumbnail": r.get("image_url"),
            "trail": r.get("description"),
        }
        for r in results
        if r.get("title") and r.get("link")
    ]
    return {"articles": articles}


# ── Reddit ────────────────────────────────────────────────────────────────────

@router.get("/reddit/{team_name}")
async def get_reddit_posts(team_name: str):
    """Fetch top Reddit posts about the team from r/soccer and r/worldcup."""
    posts = []
    headers = {"User-Agent": "FanXI/1.0 (World Cup 2026 fan app)"}

    subreddits = ["soccer", "worldcup"]
    async with httpx.AsyncClient(timeout=10.0, headers=headers) as client:
        for sub in subreddits:
            url = f"https://www.reddit.com/r/{sub}/search.json"
            params = {
                "q": team_name,
                "sort": "hot",
                "limit": 6,
                "restrict_sr": "true",
                "t": "week",
            }
            try:
                resp = await client.get(url, params=params)
                if resp.status_code != 200:
                    continue
                children = resp.json().get("data", {}).get("children", [])
                for child in children:
                    p = child.get("data", {})
                    if p.get("over_18") or p.get("stickied"):
                        continue
                    posts.append({
                        "id": p.get("id"),
                        "title": p.get("title"),
                        "url": f"https://reddit.com{p.get('permalink')}",
                        "subreddit": p.get("subreddit_name_prefixed"),
                        "score": p.get("score", 0),
                        "comments": p.get("num_comments", 0),
                        "thumbnail": p.get("thumbnail") if p.get("thumbnail", "").startswith("http") else None,
                        "flair": p.get("link_flair_text"),
                        "author": p.get("author"),
                        "created": p.get("created_utc"),
                        "selftext": p.get("selftext", "")[:200],
                    })
            except Exception:
                continue

    # Sort all posts by score descending
    posts.sort(key=lambda x: x["score"], reverse=True)
    return {"posts": posts[:10]}


# ── YouTube ───────────────────────────────────────────────────────────────────

@router.get("/videos/{team_name}")
async def get_youtube_videos(team_name: str):
    """Fetch recent YouTube highlights for the team."""
    if not settings.youtube_api_key:
        return {"videos": []}            # Graceful degradation until key added

    params = {
        "part": "snippet",
        "q": f"{team_name} World Cup 2026 highlights",
        "type": "video",
        "order": "relevance",
        "maxResults": 8,
        "relevanceLanguage": "en",
        "key": settings.youtube_api_key,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get("https://www.googleapis.com/youtube/v3/search", params=params)

    if resp.status_code != 200:
        return {"videos": []}

    items = resp.json().get("items", [])
    videos = [
        {
            "id": item["id"].get("videoId"),
            "title": item["snippet"].get("title"),
            "channel": item["snippet"].get("channelTitle"),
            "thumbnail": item["snippet"].get("thumbnails", {}).get("medium", {}).get("url"),
            "published": item["snippet"].get("publishedAt"),
            "description": item["snippet"].get("description", "")[:120],
        }
        for item in items
        if item.get("id", {}).get("videoId")
    ]
    return {"videos": videos}
