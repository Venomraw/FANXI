# FanXI (Working Title)

A football matchday prediction game where fans try to guess their team's starting XI before kickoff, get scored on how close they were, and climb leaderboards.

## Version 1 – MVP Goals

For one league (La Liga), fans can:

- Browse: League → Team → Upcoming matches
- On a match page:
  - See match info & kickoff time
  - Pick a formation (e.g., 4-3-3, 4-2-3-1)
  - Pick exactly 11 players from the squad (no duplicates)
  - Only submit predictions until a cut-off (e.g., 60 minutes before kickoff)
- After lineups are known:
  - Compare predicted XI vs official XI
  - Compute a score per fan for that match

User experience:

- Simple username-based identity (no passwords in v1)
- "My predictions" page with past matches & scores
- Per-team leaderboard (top predictors by total points)
- Match page shows:
  - Prediction state: PREDICTION OPEN / CLOSED / RESULTS READY
  - Countdown to prediction close
  - Crowd stats while predictions are open (e.g. % of fans picking each player/formation)

## Tech Stack (planned)

- Backend: FastAPI (Python)
- Database: SQLite for dev (designed to move to Postgres later)
- Frontend: React/Next.js
- Football Data: external API for leagues, teams, matches, and lineups

## API Overview (v1 backend)

Base URL (dev): `http://127.0.0.1:8000`

### Health

- `GET /health`  
  - Simple heartbeat to confirm the API is running.

### Leagues & Teams

- `GET /leagues`  
  - Returns available leagues (v1: La Liga only).

- `GET /leagues/{league_code}/teams`  
  - Returns teams in a league.  
  - Example: `/leagues/laliga/teams`

### Teams & Matches

- `GET /teams/{team_id}/matches`  
  - Returns mock fixtures for a team.  
  - Example: `/teams/1/matches` for FC Barcelona.

### Predictions

- `POST /matches/{match_id}/predictions`  
  - Body: `PredictionInput`
    - `username`: string
    - `team_id`: int
    - `match_id`: int
    - `formation`: string (e.g. "4-3-3")
    - `players`: list of 11 player names
  - Creates a prediction for that match.

- `GET /matches/{match_id}/predictions`  
  - Lists all predictions for a match.

### Scoring & Leaderboard

- `GET /matches/{match_id}/scores`  
  - Compares predictions to a mocked “official XI” for that match (v1: match_id = 1).
  - Returns a simple leaderboard:
    - `prediction_id`, `username`, `correct_players`, `total_players`, `score`.

### User History

- `GET /users/{username}/predictions`  
  - Returns all predictions submitted by a given user.
