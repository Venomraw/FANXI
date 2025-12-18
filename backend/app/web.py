from fastapi import APIRouter, Request, HTTPException, Form, Depends
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlmodel import Session, select

from app.db import get_session
from app.models import TeamDB, MatchDB, PredictionDB
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
def team_fixtures(
    team_id: int,
    request: Request,
    session: Session = Depends(get_session),
):
    # 1) Get team from DB
    team = session.get(TeamDB, team_id)
    if team is None:
        raise HTTPException(status_code=404, detail="Team not found")

    # 2) Get all matches where this team is home or away
    matches = session.exec(
        select(MatchDB).where(
            (MatchDB.home_team_id == team_id)
            | (MatchDB.away_team_id == team_id)
        )
    ).all()

    # 3) Build rows for the template
    rows: list[dict] = []
    for m in matches:
        if m.home_team_id == team_id:
            side = "Home"
            opponent = session.get(TeamDB, m.away_team_id)
        else:
            side = "Away"
            opponent = session.get(TeamDB, m.home_team_id)

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
def show_prediction_form(
    team_id: int,
    match_id: int,
    request: Request,
    session: Session = Depends(get_session),
):
    team = session.get(TeamDB, team_id)
    match = session.get(MatchDB, match_id)
    if team is None or match is None:
        raise HTTPException(status_code=404, detail="Team or match not found")

    # Figure out which side this team is on and who the opponent is
    if match.home_team_id == team_id:
        home_team = team
        away_team = session.get(TeamDB, match.away_team_id)
    else:
        away_team = team
        home_team = session.get(TeamDB, match.home_team_id)

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

@router.get(
    "/users/{username}/predictions/html",
    response_class=HTMLResponse,
)
def user_predictions_html(
    username: str,
    request: Request,
    session: Session = Depends(get_session),
):
    # Fetch this user's predictions, newest first
    predictions = session.exec(
        select(PredictionDB)
        .where(PredictionDB.username == username)
        .order_by(PredictionDB.created_at.desc())
    ).all()

    rows: list[dict] = []

    if predictions:
        team_ids = {p.team_id for p in predictions}
        match_ids = {p.match_id for p in predictions}

        teams = session.exec(
            select(TeamDB).where(TeamDB.id.in_(team_ids))
        ).all()
        matches = session.exec(
            select(MatchDB).where(MatchDB.id.in_(match_ids))
        ).all()

        team_map = {t.id: t for t in teams}
        match_map = {m.id: m for m in matches}

        for p in predictions:
            team = team_map.get(p.team_id)
            match = match_map.get(p.match_id)

            team_name = team.short_name if team else f"Team #{p.team_id}"
            opponent_name = "Unknown"
            side = "n/a"
            kickoff_str = "TBD"

            if match:
                if match.kickoff_time:
                    kickoff_str = match.kickoff_time.strftime("%Y-%m-%d %H:%M")

                # figure out home/away + opponent
                if match.home_team_id == p.team_id:
                    side = "home"
                    opp = team_map.get(match.away_team_id)
                else:
                    side = "away"
                    opp = team_map.get(match.home_team_id)
                if opp:
                    opponent_name = opp.short_name

            rows.append(
                {
                    "created_at": p.created_at.strftime("%Y-%m-%d %H:%M"),
                    "team_name": team_name,
                    "opponent_name": opponent_name,
                    "side": side,
                    "kickoff": kickoff_str,
                    "formation": p.formation,
                    "match_id": p.match_id,
                }
            )

    return templates.TemplateResponse(
        "user_predictions.html",
        {
            "request": request,
            "username": username,
            "rows": rows,
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
    team = session.get(TeamDB, team_id)
    match = session.get(MatchDB, match_id)
    if team is None or match is None:
        raise HTTPException(status_code=404, detail="Team or match not found")

    # Same home/away logic as in GET
    if match.home_team_id == team_id:
        home_team = team
        away_team = session.get(TeamDB, match.away_team_id)
    else:
        away_team = team
        home_team = session.get(TeamDB, match.home_team_id)

    kickoff_display = (
        match.kickoff_time.strftime("%Y-%m-%d %H:%M")
        if getattr(match, "kickoff_time", None)
        else "TBD"
    )

    errors: list[str] = []

    # Parse players: one name per line
    players = [p.strip() for p in players_text.splitlines() if p.strip()]
    if len(players) != 11:
        errors.append("Please enter exactly 11 player names (one per line).")

    score = None

    if not errors:
        # Save prediction to DB
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

        # Optional scoring against official lineup if we have one
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