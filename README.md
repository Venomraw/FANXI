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
