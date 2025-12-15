from fastapi import APIRouter, Request, HTTPException, Form, Depends
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlmodel import Session
from app.api.teams import MOCK_TEAMS, MOCK_MATCHES
from app.db import get_session
from app.models import PredictionDB
from app.api.predictions import (
    to_prediction_model,
    score_single_prediction,
    OFFICIAL_LINEUPS,
)

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
                "match_id": m.id,
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
@router.get(
    "/teams/{team_id}/matches/{match_id}/predict",
    response_class=HTMLResponse,
)
def show_prediction_form(team_id: int, match_id: int, request: Request):
    team = next((t for t in MOCK_TEAMS if t.id == team_id), None)
    match = next((m for m in MOCK_MATCHES if m.id == match_id), None)
    if team is None or match is None:
        raise HTTPException(status_code=404, detail="Team or match not found")

    team_map = {t.id: t for t in MOCK_TEAMS}
    home_team = team_map.get(match.home_team_id)
    away_team = team_map.get(match.away_team_id)

    kickoff_display = (
        match.kickoff_time.strftime("%Y-%m-%d %H:%M")
        if getattr(match, "kickoff_time", None)
        else "TBD"
    )

    return templates.TemplateResponse(
        "predict.html",
        {
            "request": request,
            "team": team,
            "match": match,
            "home_team": home_team,
            "away_team": away_team,
            "kickoff": kickoff_display,
            "errors": [],
            "username": "",
            "formation": "4-3-3",
            "players_text": "",
            "score": None,
        },
    )


@router.post(
    "/teams/{team_id}/matches/{match_id}/predict",
    response_class=HTMLResponse,
)
def submit_prediction(
    team_id: int,
    match_id: int,
    request: Request,
    username: str = Form(...),
    formation: str = Form(...),
    players_text: str = Form(...),
    session: Session = Depends(get_session),
):
    team = next((t for t in MOCK_TEAMS if t.id == team_id), None)
    match = next((m for m in MOCK_MATCHES if m.id == match_id), None)
    if team is None or match is None:
        raise HTTPException(status_code=404, detail="Team or match not found")

    team_map = {t.id: t for t in MOCK_TEAMS}
    home_team = team_map.get(match.home_team_id)
    away_team = team_map.get(match.away_team_id)

    kickoff_display = (
        match.kickoff_time.strftime("%Y-%m-%d %H:%M")
        if getattr(match, "kickoff_time", None)
        else "TBD"
    )

    errors: list[str] = []

    players = [p.strip() for p in players_text.splitlines() if p.strip()]
    if len(players) != 11:
        errors.append("Please enter exactly 11 player names (one per line).")

    score = None

    if not errors:
        db_obj = PredictionDB(
            username=username,
            team_id=team_id,
            match_id=match_id,
            formation=formation,
            players_csv="|".join(players),
        )
        session.add(db_obj)
        session.commit()
        session.refresh(db_obj)

        if match_id in OFFICIAL_LINEUPS:
            prediction = to_prediction_model(db_obj)
            score = score_single_prediction(
                prediction,
                OFFICIAL_LINEUPS[match_id],
            )

    return templates.TemplateResponse(
        "predict.html",
        {
            "request": request,
            "team": team,
            "match": match,
            "home_team": home_team,
            "away_team": away_team,
            "kickoff": kickoff_display,
            "errors": errors,
            "username": username,
            "formation": formation,
            "players_text": players_text,
            "score": score,
        },
    )

