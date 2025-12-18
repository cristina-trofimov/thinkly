from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from DB_Methods.database import get_db
from models.schema import UserResult, Competition, Scoreboard
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

def get_scoreboard_for_competition(db: Session, competition_id: int) -> List[Scoreboard]:
    logger.debug(f"Executing helper query: Fetching scoreboard for competition ID {competition_id}.")
    try:
        scoreboards = (
            db.query(Scoreboard)
            .filter(Scoreboard.competition_id == competition_id)
            .order_by(Scoreboard.rank.asc())
            .all()
        )
        logger.debug(f"Scoreboard query completed for ID {competition_id}. Found {len(scoreboards)} entries.")
        return scoreboards
    except Exception as e:
        logger.exception(f"Database error while fetching scoreboard for competition ID {competition_id}.")
        raise e

@leaderboards_router.get("/")
def get_leaderboards(db: Session = Depends(get_db)):
    logger.info("Accessing /leaderboards endpoint to retrieve all competition results.")

    try:
        competitions = get_all_competitions(db)
        if not competitions:
            logger.info("No competitions found in the database.")
            return []

        result = []

        # Log the start of the primary aggregation loop
        logger.info(f"Starting aggregation for {len(competitions)} competitions.")

        for comp in competitions:
            comp_id = comp.competition_id
            comp_name = comp.name

            logger.debug(f"Processing competition: ID {comp_id}, Name '{comp_name}'.")

            scoreboards = get_scoreboard_for_competition(db, comp_id)
            participants = []

            for s in scoreboards:
                # Query UserResult for detailed performance data
                ur = (
                    db.query(UserResult)
                    .filter(
                        UserResult.user_id == s.user_id,
                        UserResult.competition_id == s.competition_id,
                    )
                    .first()
                )

                if not ur:
                    # Log a warning if participant performance data is missing
                    logger.warning(f"Missing UserResult data for User ID {s.user_id} in Competition ID {comp_id}.")

                # Check if s.user exists (prevent AttributeError on deleted user/bad FK)
                user_name = f"{s.user.first_name} {s.user.last_name}" if s.user else "Unknown User"

                participants.append({
                    "name": user_name,
                    "points": s.total_score or 0,
                    # Fallback values are logged to ensure data completeness
                    "problemsSolved": ur.problems_solved if ur else 0,
                    "totalTime": f"{ur.total_time:.1f} min" if ur else "0.0 min",
                })

            result.append({
                "id": str(comp_id),
                "name": comp_name,
                "date": comp.date.strftime("%Y-%m-%d"),
                "participants": participants,
            })

        # Final success log
        logger.info(f"Successfully aggregated data for all {len(competitions)} competitions.")
        return result

    except Exception:
        # Catch any unexpected error during the complex iteration/query process
        logger.exception("FATAL error during leaderboards data aggregation.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve leaderboards due to internal processing error."
        )