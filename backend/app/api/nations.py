"""
Nations API — public endpoints for SEO nation pages.

Endpoints:
  GET /nations          — list all 48 nations with slugs
  GET /nations/{slug}   — full nation page data for a team
"""
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from sqlmodel import Session, select

from app.db import engine
from app.models import NationPage, VisionCache
from app.data.static_squads import STATIC_SQUADS
from app.agents.hermes import WC2026_TEAMS, WC2026_SLUGS, team_to_slug

logger = logging.getLogger("fanxi.api.nations")

router = APIRouter(prefix="/nations", tags=["nations"])


@router.get("")
def list_nations():
    """
    Return all 48 WC2026 nations with slugs.
    Used by frontend for generateStaticParams.
    Public endpoint — no auth required.
    """
    nations = []
    for team in WC2026_TEAMS:
        nations.append({
            "team": team,
            "slug": team_to_slug(team),
        })
    return {"count": len(nations), "nations": nations}


@router.get("/{slug}")
def get_nation(slug: str):
    """
    Return full nation page data for a team slug.
    Includes: SEO content, squad, formation profile.
    Public endpoint — no auth required.
    """
    # Find the team name from the slug
    team_name: Optional[str] = None
    for team in WC2026_TEAMS:
        if team_to_slug(team) == slug:
            team_name = team
            break

    if not team_name:
        raise HTTPException(status_code=404, detail=f"Nation '{slug}' not found")

    # Fetch SEO content from NationPage table
    seo_data = None
    with Session(engine) as session:
        page = session.exec(
            select(NationPage).where(NationPage.slug == slug)
        ).first()

        if page:
            seo_data = {
                "seo_title": page.seo_title,
                "meta_description": page.meta_description,
                "hero_paragraph": page.hero_paragraph,
                "history_paragraph": page.history_paragraph,
                "wc2026_outlook": page.wc2026_outlook,
                "faq": page.faq_json,
                "keywords": page.keywords,
                "generated_at": page.generated_at.isoformat() if page.generated_at else None,
                "updated_at": page.updated_at.isoformat() if page.updated_at else None,
            }

        # Fetch formation profile from VisionCache
        formation_profile = None
        formation_entry = session.exec(
            select(VisionCache).where(
                VisionCache.cache_type == "formation",
                VisionCache.lookup_key == team_name,
            )
            .order_by(VisionCache.generated_at.desc())
        ).first()

        if formation_entry:
            formation_profile = formation_entry.report_data

    # Fetch squad from static_squads
    squad = STATIC_SQUADS.get(team_name, [])

    return {
        "team": team_name,
        "slug": slug,
        "seo": seo_data,
        "squad": squad,
        "formation_profile": formation_profile,
    }
