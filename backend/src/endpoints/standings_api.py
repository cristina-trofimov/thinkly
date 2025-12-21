from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from models.schema import Competition, BaseEvent, CompetitionLeaderboardEntry
from DB_Methods.database import get_db
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)
standings_router = APIRouter(tags=["Leaderboards"])

@standings_router.get("/current")
def get_current_leaderboard(db: Session = Depends(get_db)):
    current_comp = db.query(Competition).join(BaseEvent).filter(
        BaseEvent.event_start_date <= datetime.now(timezone.utc),
        BaseEvent.event_end_date >= datetime.now(timezone.utc)
    ).first()
    if not current_comp:
        logger.warning("No current competition found.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No current competition found.")
    
    return get_leaderboard_by_competition(current_comp.event_id, db)


@standings_router.get("/leaderboards")
def get_all_leaderboards(db: Session = Depends(get_db)):
    competitions = db.query(Competition).join(BaseEvent).all()
    all_leaderboards = []

    for comp in competitions:
        formatted_standings = get_leaderboard_by_competition(comp.event_id, db)
        all_leaderboards.append(formatted_standings)
    return all_leaderboards

@standings_router.get("/{competition_id}")
def get_leaderboard_by_competition(competition_id: int, db: Session = Depends(get_db)):
    comp = db.query(Competition).filter(Competition.event_id == competition_id).first()
    if not comp:
        logger.warning(f"Competition with ID {competition_id} not found.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Competition not found.")
    
    standings = comp.competition_leaderboard_entries

    formatted_standings = []
    for entry in standings:
        formatted_standings.append({
            "name": entry.name,
            "total_score": entry.total_score,
            "total_time": entry.total_time,
            "problems_solved": entry.problems_solved,
            "user_id": entry.user_id,
            "rank": entry.rank
        })

    return {
        "competition_name": comp.base_event.event_name,
        "competition_id": comp.event_id,
        "participants": formatted_standings
    }