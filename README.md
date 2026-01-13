# FanXI: World Cup 2026 Tactical Hub 🏆

The world's first tactical-first football prediction engine. Fans don't just pick the XI; they set the "Tactical Haki" for the match, including formation, mentality, and pressing intensity.

## 🚀 Version 1.1 – Current Progress (Tactical Bridge Complete)

We have successfully built the end-to-end bridge from the UI to the Database.

- **The Scout Office**: Integrated FastAPI backend with a persistent SQLite vault.
- **Tactical Interface**: Next.js frontend with real-time sliders for Pressing Intensity (0-100) and Team Mentality.
- **Security Haki**: Implemented Bcrypt password hashing and Pydantic data validation.
- **Viral Engine**: Backend support for generating shareable lineup cards using the Pillow library.

## 🛠️ Tech Stack

- **Backend**: FastAPI (Python 3.11)
- **Database**: SQLModel + SQLite (Persistent Vault)
- **Frontend**: Next.js 15+, TypeScript, Tailwind CSS
- **Security**: Bcrypt password hashing & CORS protection
- **Data Integrity**: Pydantic v2 for strict schema validation

## 🏗️ Architecture Flow



1. **Frontend (Port 3000)**: React components capture tactical sliders and player selections.
2. **API Handshake (CORS)**: Secure bridge allows cross-origin requests to the backend.
3. **Backend (Port 8000)**: FastAPI validates the payload against Pydantic schemas.
4. **Database (fanxi.db)**: SQLModel commits the "Tactical Row" to the MatchPrediction table.

## 📡 API Endpoints (Current)

### Authentication & Users
- `POST /register`: Onboard a new Scout with secure password hashing.
- `GET /users/{username}`: Fetch public profile and Football IQ stats.

### Tactical Predictions
- `POST /matches/{match_id}/predictions`: Submit a full tactical lineup.
  - **Body**: `user_id`, `team_id`, `formation`, `mentality`, `pressing_intensity`, `players` (List of 11).
- `GET /matches/{match_id}/leaderboard`: Real-time ranking of the best tactical minds.

### Matchday Data
- `GET /teams/{team_id}/matches`: Returns fixtures with 2026 World Cup timestamps.

## 🧪 Quick Start

1. **Launch the Vault (Backend)**:
   ```bash
   cd backend
   source .venv/bin/activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload


   ---

## 👨‍💻 Author

**Venomraw** (Your Name)
*Cybersecurity Student & Lead Developer*
- [LinkedIn](https://www.linkedin.com/in/binamra-sigdel-377553156/)
- [GitHub](https://github.com/venomraw)

## ⚖️ License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
