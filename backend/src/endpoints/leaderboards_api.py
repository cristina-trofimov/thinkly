from sqlalchemy import Sequence, select
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from DB_Methods.database import get_db
from models.schema import Competition, CompetitionLeaderboardEntry
import logging

leaderboards_router = APIRouter(tags=["Leaderboards"])
logger = logging.getLogger(__name__)

def get_all_competitions(db: Session) -> List[Competition]:
    # INFO: Log the start of a helper function query
    logger.info("Executing helper query: Fetching all competitions.")
    try:
        competitions = db.scalars(
            select(Competition)
            .order_by(Competition.base_event.event_start_date.desc())
        ).all()
        logger.debug(f"Helper query completed. Found {len(competitions)} competitions.")
        return competitions
    except Exception as e:
        logger.exception("Database error while fetching all competitions.")
        raise e

def get_scoreboard_for_competition(db: Session, competition_id: int, limit: Optional[int] = None) -> List[CompetitionLeaderboardEntry]:
    logger.debug(f"Executing helper query: Fetching scoreboard for competition ID {competition_id}.")
    try:
        scoreboards = db.scalars(
            select(CompetitionLeaderboardEntry)
            .order_by(CompetitionLeaderboardEntry.competition.base_event.event_start_date.desc(), CompetitionLeaderboardEntry.total_score.desc())
            .limit(limit) if limit else ()
        ).all()
        logger.debug(f"Scoreboard query completed for ID {competition_id}. Found {len(scoreboards)} entries.")
        return scoreboards
    except Exception as e:
        logger.exception(f"Database error while fetching scoreboard for competition ID {competition_id}.")
        raise e

@leaderboards_router.get("/")
def get_leaderboards(db: Session = Depends(get_db), limit: Optional[int] = None):
    logger.info("Accessing /leaderboards endpoint to retrieve all competition results.")
    try:
        leaderboards = db.scalars(
            select(CompetitionLeaderboardEntry)
            .order_by(CompetitionLeaderboardEntry.competition.base_event.event_start_date.desc(), CompetitionLeaderboardEntry.total_score.desc())
            .limit(limit) if limit else ()
        ).all()

        logger.info(f"Starting aggregation for {len(leaderboards)} competition leaderboard entries.")

        current_competition_leaderboard = []
        current_competition = None
        all_leaderboards = []
        rank = 1
        for entry in leaderboards:
            if len(current_competition_leaderboard) > 0 and current_competition.competition_id != entry.competition_id:
                all_leaderboards.append({current_competition.name: current_competition_leaderboard})
                current_competition_leaderboard = []
                current_competition = entry.competition
                rank = 1
                logger.debug(f"Processing competition: ID {current_competition.competition_id}, Name '{current_competition.name}'.")

            current_competition_leaderboard.append({
                "username": entry.username,
                "rank": rank,
                "totalScore": entry.total_score,
            })

        all_leaderboards.append({current_competition.name: current_competition_leaderboard})
        logger.info(f"Successfully aggregated data for all {len(competitions)} competitions.")
        return all_leaderboards
    except Exception:
         # Catch any unexpected error during the complex iteration/query process
        logger.exception("FATAL error during leaderboards data aggregation.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to retrieve leaderboards due to internal processing error."
        )
