from pydantic import BaseModel


class League(BaseModel):
    code: str         # e.g. "laliga"
    name: str         # e.g. "La Liga"


class Team(BaseModel):
    id: int           # internal ID for now
    name: str         # e.g. "FC Barcelona"
    short_name: str   # e.g. "Barcelona"
    league_code: str  # link back to League.code
