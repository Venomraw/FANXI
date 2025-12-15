from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from app.api.teams import MOCK_TEAMS, MOCK_MATCHES

templates = Jinja2Templates(directory="app/templates")

router = APIRouter(tags=["web"])


@router.get("/", response_class=HTMLResponse)
def home(request: Request):
    # For now, leagues are hardcoded to match the API
    leagues = [
        {"code": "laliga", "name": "La Liga"},
    ]
    return templates.TemplateResponse(
        "home.html",
        {
            "request": request,
            "leagues": leagues,
        },
    )
@router.get("/teams/{team_id}/fixtures", response_class=HTMLResponse)
def team_fixtures(team_id: int, request: Request):
    # Find the team from the mock list
    team = next((t for t in MOCK_TEAMS if t.id == team_id), None)
    if team is None:
        raise HTTPException(status_code=404, detail="Team not found")

    # All matches where this team is home or away
    fixtures = [
        m for m in MOCK_MATCHES
        if m.home_team_id == team_id or m.away_team_id == team_id
    ]

    # Sort by kickoff time (if present)
    fixtures.sort(key=lambda m: m.kickoff_time or "")

    # Build simple rows for the template
    team_map = {t.id: t for t in MOCK_TEAMS}
    rows = []
    for m in fixtures:
        if m.home_team_id == team_id:
            opponent = team_map.get(m.away_team_id)
            side = "Home"
        else:
            opponent = team_map.get(m.home_team_id)
            side = "Away"

        kickoff_str = (
            m.kickoff_time.strftime("%Y-%m-%d %H:%M")
            if getattr(m, "kickoff_time", None)
            else "TBD"
        )

        rows.append(
            {
                "round": m.round,
                "kickoff": kickoff_str,
                "opponent_name": opponent.short_name if opponent else "Unknown",
                "side": side,
                "venue": m.venue,
                "status": m.status,
            }
        )

    return templates.TemplateResponse(
        "fixtures.html",
        {
            "request": request,
            "team": team,
            "rows": rows,
        },
    )
