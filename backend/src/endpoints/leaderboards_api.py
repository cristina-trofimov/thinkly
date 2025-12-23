from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from DB_Methods.database import get_db
from models.schema import CompetitionLeaderboardEntry, Competition, BaseEvent
import logging

leaderboards_router = APIRouter(tags=["Leaderboards"])
logger = logging.getLogger(__name__)

def get_all_competitions(db: Session) -> List[Competition]:
    # INFO: Log the start of a helper function query
    logger.info("Executing helper query: Fetching all competitions.")
    try:
        competitions = db.query(Competition).all()
        logger.debug(f"Helper query completed. Found {len(competitions)} competitions.")
        return competitions
    except Exception as e:
        logger.exception("Database error while fetching all competitions.")
        raise e

def get_scoreboard_for_competition(db: Session, competition_id: int) -> List[CompetitionLeaderboardEntry]:
    logger.debug(f"Executing helper query: Fetching scoreboard for competition ID {competition_id}.")
    try:
        scoreboards = (
            db.query(CompetitionLeaderboardEntry)
            .filter(CompetitionLeaderboardEntry.competition_id == competition_id)
            .order_by(CompetitionLeaderboardEntry.rank.asc())
            .all()
        )
        logger.debug(f"Scoreboard query completed for ID {competition_id}. Found {len(scoreboards)} entries.")
        return scoreboards
    except Exception as e:
        logger.exception(f"Database error while fetching scoreboard for competition ID {competition_id}.")
        raise e

@leaderboards_router.get("/")
def get_leaderboards(db: Session = Depends(get_db)):
    logger.info("Accessing /leaderboards endpoint to retrieve all competition leaderboards.")

    try:
        competitions = (
            db.query(Competition)
            .join(BaseEvent)
            .all()
        )

        if not competitions:
            logger.info("No competitions found.")
            return []

        result = []

        for comp in competitions:
            event = comp.base_event
            comp_id = comp.event_id

            logger.debug(f"Processing Competition Event ID {comp_id}")

            leaderboard_entries = comp.competition_leaderboard_entries
            participants = []

            for entry in leaderboard_entries:
                # Prefer live user data if user exists, else fallback to stored name
                if entry.user_account:
                    user_name = f"{entry.user_account.first_name} {entry.user_account.last_name}"
                else:
                    user_name = entry.name  # fallback snapshot

                participants.append({
                    "name": user_name,
                    "points": entry.total_score,
                    "problemsSolved": entry.problems_solved,
                    "totalTime": f"{entry.total_time:.1f} min",
                    "rank": entry.rank,
                })

            result.append({
                "id": str(comp_id),
                "name": event.event_name,
                "date": event.event_start_date.strftime("%Y-%m-%d"),
                "participants": sorted(participants, key=lambda x: x["rank"]),
            })

        logger.info(f"Successfully returned {len(result)} leaderboards.")
        return result

    except Exception:
        logger.exception("FATAL error during leaderboard aggregation.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve leaderboards."
        )