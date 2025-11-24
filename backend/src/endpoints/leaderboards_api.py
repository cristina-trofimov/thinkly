from fastapi import APIRouter, Depends
from sqlalchemy import Sequence, select
from sqlalchemy.orm import Session
from typing import List, Optional
from DB_Methods.database import get_db
from models.schema import Competition, CompetitionLeaderboardEntry

leaderboards_router = APIRouter(tags=["Leaderboards"])

def get_all_competitions(db: Session) -> List[Competition]:
    return db.scalars(select(Competition).order_by(Competition.base_event.event_start_date.desc())).all()

def get_scoreboard_for_competition(db: Session, competition_id: int) -> List[CompetitionLeaderboardEntry]:
    return db.scalars(
        select(CompetitionLeaderboardEntry)
        .where(CompetitionLeaderboardEntry.competition_id == competition_id)
        .order_by(CompetitionLeaderboardEntry.total_score.desc())
    ).all()

@leaderboards_router.get("/")
def get_leaderboards(db: Session = Depends(get_db), limit: Optional[int] = None):
    leaderboards = db.scalars(
        select(CompetitionLeaderboardEntry)
        .order_by(CompetitionLeaderboardEntry.competition.base_event.event_start_date.desc(), CompetitionLeaderboardEntry.total_score.desc())
        .limit(limit) if limit else ()
    )

    current_competition_leaderboard = []
    current_competition = None
    all_leaderboards = []

    for entry in leaderboards:
        if len(current_competition_leaderboard) > 0 and current_competition.competition_id != entry.competition_id:
            all_leaderboards.append({current_competition.name: current_competition_leaderboard})
            current_competition_leaderboard = []
            current_competition = entry.competition
            rank = 1

        current_competition_leaderboard.append({
            "username": entry.username,
            "rank": rank,
            "totalScore": entry.total_score,
        })

    all_leaderboards.append({current_competition.name: current_competition_leaderboard})
    return all_leaderboards