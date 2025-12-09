from fastapi import APIRouter

from app.schemas import League

router = APIRouter(
    prefix="/leagues",
    tags=["leagues"],
)

# --- Mock data for now ---

MOCK_LEAGUES = [
    League(code="laliga", name="La Liga"),
]


@router.get("/", response_model=list[League])
def list_leagues():
    """List all available leagues (v1: only La Liga)."""
    return MOCK_LEAGUES
