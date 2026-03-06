"""
Nation Intel API — aggregates Guardian news, NewsData, Reddit, and YouTube
for a given World Cup nation. All results are fetched server-side to keep
API keys out of the browser.
"""

import asyncio
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, HTTPException, Query
from app.config import settings

RSS_SOURCES = [
    {
        'name': 'BBC Sport',
        'url': 'https://feeds.bbci.co.uk/sport/football/rss.xml',
    },
    {
        'name': 'Sky Sports',
        'url': 'https://www.skysports.com/rss/12040',
    },
    {
        'name': 'Goal.com',
        'url': 'https://www.goal.com/feeds/en/news',
    },
    {
        'name': 'Guardian Football',
        'url': 'https://www.theguardian.com/football/rss',
    },
    {
        'name': 'ESPN FC',
        'url': 'https://www.espn.com/espn/rss/soccer/news',
    },
]

router = APIRouter(prefix="/intel", tags=["intel"])

# ── Guardian ──────────────────────────────────────────────────────────────────

def _strip_html(text: str) -> str:
    return re.sub(r"<[^>]+>", "", text or "").strip()


def _parse_date(date_str: str | None) -> str:
    """Normalise date strings to ISO-8601 for consistent sorting."""
    if not date_str:
        return ""
    for fmt in ("%a, %d %b %Y %H:%M:%S %z", "%a, %d %b %Y %H:%M:%S GMT"):
        try:
            return datetime.strptime(date_str, fmt).astimezone(timezone.utc).isoformat()
        except ValueError:
            continue
    return date_str


async def _fetch_guardian(client: httpx.AsyncClient, team_name: str, page: int) -> list[dict]:
    if not settings.guardian_api_key:
        return []
    params = {
        "q": f'"{team_name}" football',
        "tag": "football/football",
        "order-by": "newest",
        "use-date": "published",
        "page-size": 20,
        "page": page,
        "show-fields": "thumbnail,trailText,byline,publication",
        "api-key": settings.guardian_api_key,
    }
    try:
        resp = await client.get("https://content.guardianapis.com/search", params=params)
        if resp.status_code != 200:
            return []
        articles = []
        for item in resp.json().get("response", {}).get("results", []):
            fields = item.get("fields", {})
            articles.append({
                "title": item.get("webTitle"),
                "url": item.get("webUrl"),
                "published": item.get("webPublicationDate", ""),
                "source": "The Guardian",
                "thumbnail": fields.get("thumbnail"),
                "trail": _strip_html(fields.get("trailText")),
                "byline": fields.get("byline"),
            })
        return articles
    except Exception:
        return []


async def _fetch_bbc(client: httpx.AsyncClient, team_name: str) -> list[dict]:
    try:
        resp = await client.get(
            "https://feeds.bbci.co.uk/sport/football/rss.xml",
            headers={"User-Agent": "FanXI/1.0"},
        )
        if resp.status_code != 200:
            return []
        root = ET.fromstring(resp.text)
        ns = {"media": "http://search.yahoo.com/mrss/"}
        needle = team_name.lower()
        articles = []
        for item in root.iter("item"):
            title = (item.findtext("title") or "")
            desc = (item.findtext("description") or "")
            if needle not in title.lower() and needle not in desc.lower():
                continue
            articles.append({
                "title": title,
                "url": item.findtext("link") or "",
                "published": _parse_date(item.findtext("pubDate")),
                "source": "BBC Sport",
                "thumbnail": None,
                "trail": _strip_html(desc),
                "byline": None,
            })
        return articles
    except Exception:
        return []


async def fetch_rss_articles(
    client: httpx.AsyncClient,
    url: str,
    source_name: str,
    team_name: str,
    max_items: int = 20,
) -> list[dict]:
    """Fetch an RSS feed and filter articles by team name."""
    try:
        resp = await client.get(url, timeout=8.0, follow_redirects=True)
        resp.raise_for_status()
        root = ET.fromstring(resp.text)

        # Handle both RSS and Atom namespaces
        ns = {'media': 'http://search.yahoo.com/mrss/'}
        channel = root.find('channel')
        if channel is None:
            return []

        articles = []
        team_lower = team_name.lower()

        for item in channel.findall('item'):
            title = item.findtext('title', '').strip()
            link = item.findtext('link', '').strip()
            description = item.findtext('description', '').strip()
            pub_date = item.findtext('pubDate', '').strip()

            # Get thumbnail from media:thumbnail or enclosure
            thumbnail = None
            media_thumb = item.find('media:thumbnail', ns)
            if media_thumb is not None:
                thumbnail = media_thumb.get('url')
            if not thumbnail:
                enclosure = item.find('enclosure')
                if enclosure is not None:
                    thumbnail = enclosure.get('url')

            # Strip HTML from description
            clean_desc = re.sub(r'<[^>]+>', '', description).strip()
            clean_desc = clean_desc[:300] if len(clean_desc) > 300 else clean_desc

            # Filter by team name (case-insensitive)
            searchable = f"{title} {clean_desc}".lower()
            if team_lower not in searchable:
                continue

            # Parse date to ISO format
            try:
                parsed_date = datetime.strptime(
                    pub_date, '%a, %d %b %Y %H:%M:%S %z'
                ).isoformat()
            except Exception:
                parsed_date = datetime.now(timezone.utc).isoformat()

            articles.append({
                'title': title,
                'url': link,
                'published': parsed_date,
                'source': source_name,
                'trail': clean_desc,
                'thumbnail': thumbnail,
            })

            if len(articles) >= max_items:
                break

        return articles

    except Exception as e:
        print(f"RSS fetch error ({source_name}): {e}")
        return []


@router.get("/news/{team_name}")
async def get_team_news(team_name: str):
    """Fetch football news from Guardian API + multiple RSS feeds."""
    async with httpx.AsyncClient() as client:
        # ── 1. Guardian API ─────────────────────────────────────
        guardian_articles = []
        try:
            guardian_key = settings.guardian_api_key
            if guardian_key:
                resp = await client.get(
                    "https://content.guardianapis.com/search",
                    params={
                        "q": f'"{team_name}" football',
                        "tag": "football/football",
                        "show-fields": "trailText,byline,thumbnail",
                        "order-by": "newest",
                        "page-size": 10,
                        "api-key": guardian_key,
                    },
                    timeout=8.0,
                )
                data = resp.json()
                for r in data.get("response", {}).get("results", []):
                    fields = r.get("fields", {})
                    guardian_articles.append({
                        "title": r.get("webTitle", ""),
                        "url": r.get("webUrl", ""),
                        "published": r.get("webPublicationDate", ""),
                        "source": "The Guardian",
                        "trail": fields.get("trailText", ""),
                        "byline": fields.get("byline", ""),
                        "thumbnail": fields.get("thumbnail"),
                    })
        except Exception as e:
            print(f"Guardian API error: {e}")

        # ── 2. RSS Feeds (parallel fetch) ────────────────────────
        rss_tasks = [
            fetch_rss_articles(client, src['url'], src['name'], team_name)
            for src in RSS_SOURCES
        ]
        rss_results = await asyncio.gather(*rss_tasks, return_exceptions=True)

        rss_articles = []
        for result in rss_results:
            if isinstance(result, list):
                rss_articles.extend(result)

        # ── 3. Merge + deduplicate ───────────────────────────────
        all_articles = guardian_articles + rss_articles

        seen_titles: set[str] = set()
        unique_articles = []
        for article in all_articles:
            title_key = article['title'][:60].lower().strip()
            if title_key not in seen_titles:
                seen_titles.add(title_key)
                unique_articles.append(article)

        def parse_date(a: dict) -> datetime:
            try:
                return datetime.fromisoformat(
                    a['published'].replace('Z', '+00:00')
                )
            except Exception:
                return datetime.min.replace(tzinfo=timezone.utc)

        unique_articles.sort(key=parse_date, reverse=True)

        return {"articles": unique_articles[:18]}


@router.get("/more-news/{team_name}")
async def get_more_news(team_name: str):
    """Fetch broader World Cup / football context news."""
    async with httpx.AsyncClient() as client:
        broad_terms = ['World Cup 2026', 'FIFA 2026', team_name]

        all_articles = []

        for term in broad_terms:
            rss_tasks = [
                fetch_rss_articles(
                    client, src['url'], src['name'], term, max_items=5
                )
                for src in RSS_SOURCES[:3]  # Only top 3 sources
            ]
            results = await asyncio.gather(*rss_tasks, return_exceptions=True)
            for result in results:
                if isinstance(result, list):
                    all_articles.extend(result)

        seen: set[str] = set()
        unique = []
        for a in all_articles:
            key = a['title'][:60].lower().strip()
            if key not in seen:
                seen.add(key)
                unique.append(a)

        def parse_date(a: dict) -> datetime:
            try:
                return datetime.fromisoformat(
                    a['published'].replace('Z', '+00:00')
                )
            except Exception:
                return datetime.min.replace(tzinfo=timezone.utc)

        unique.sort(key=parse_date, reverse=True)

        return {"articles": unique[:12]}


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
