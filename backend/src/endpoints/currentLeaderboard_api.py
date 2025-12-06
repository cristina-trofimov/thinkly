from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from DB_Methods.database import get_db
from models.schema import *
import logging

current_leaderboard_router = APIRouter(tags=["Current Leaderboard"])
logger = logging.getLogger(__name__)

@current_leaderboard_router.get("/current")
def get_current_standings(db: Session = Depends(get_db)):
    """
    Get the current/active competition standings.
    Returns the most recent competition that has participants in the scoreboard.
    """
    logger.info("Starting query for the most recent competition with standings.")

    # Get the most recent competition with scoreboard entries
    try:
        current_competition: Competition | None = (
            db.query(Competition)
            .join(BaseEvent, Competition.event_id == BaseEvent.event_id)
            .filter(BaseEvent.event_start_date <= datetime.now())
            .order_by(desc(BaseEvent.event_start_date))
        ).first() # assumes only one active competition at a time
        
        if not current_competition:
            logger.warning("No active competition found in the current time frame.")
            raise HTTPException(status_code=404, detail="No active competition found")
        
        standings = current_competition.competition_leaderboard_entries
        
        
    except Exception:
        logger.exception("Database error while querying recent competition.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database query failed")

    logger.info(f"Found active competition: ID {current_competition.event_id}, Name '{current_competition.base_event.event_name}'. Fetching standings.")

    if not standings or len(standings) == 0:
        logger.warning(f"Standings query for competition ID {current_competition.event_id} returned no results.")
        raise HTTPException(status_code=404, detail="No standings found for current competition")

    # Build participants list
    participants = []
    for s in standings:
        if s.user:
            participants.append({
                "name": f"{s.user.first_name} {s.user.last_name}",
                "points": s.total_score or 0,
                "problemsSolved": s.problems_solved or 0,
                "totalTime": f"{s.current_time:.1f} min" if s.current_time else "0.0 min",
            })

    logger.info(f"Successfully returned {len(participants)} participants for current standings.")

    return {
        "competitionName": current_competition.base_event.event_name,
        "participants": participants
    }


@current_leaderboard_router.get("/{competition_id}")
def get_standings_by_competition(competition_id: int, db: Session = Depends(get_db)):
    """
    Get standings for a specific competition by ID.
    Useful if you want to display a specific competition's live standings.
    """
    logger.info(f"Starting query for standings by competition ID: {competition_id}")

    try:
        competition = db.query(Competition).filter(Competition.competition_id == competition_id).first()
    except Exception:
        logger.exception(f"Database error while querying competition ID {competition_id}.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database query failed")

    if not competition:
        logger.warning(f"Competition ID {competition_id} not found.")
        raise HTTPException(status_code=404, detail="Competition not found")

    logger.debug(f"Competition '{competition.name}' found. Fetching scoreboard entries.")

    standings = (
        db.query(Scoreboard)
        .filter(Scoreboard.competition_id == competition_id)
        .order_by(Scoreboard.rank.asc())
        .all()
    )

    if not standings:
        logger.info(f"No scoreboard entries found for competition ID {competition_id}.")
        raise HTTPException(status_code=404, detail="No standings found for this competition")

    participants = []
    for s in standings:
        if s.user:
            participants.append({
                "name": f"{s.user.first_name} {s.user.last_name}",
                "points": s.total_score or 0,
                "problemsSolved": s.problems_solved or 0,
                "totalTime": f"{s.current_time:.1f} min" if s.current_time else "0.0 min",
            })

    logger.info(f"Successfully returned {len(participants)} participants for competition ID {competition_id}.")

    return {
        "competitionName": competition.name,
        "participants": participants
    }