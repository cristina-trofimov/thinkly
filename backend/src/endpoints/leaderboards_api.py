from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone
from DB_Methods.database import get_db
from models.schema import (
    CompetitionLeaderboardEntry,
    AlgoTimeLeaderboardEntry,
    Competition,
    AlgoTimeSession,
    BaseEvent
)
import logging
from zoneinfo import ZoneInfo


leaderboards_router = APIRouter(tags=["Leaderboards"])
logger = logging.getLogger(__name__)

def get_all_competitions(db: Session) -> List[Competition]:
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


@leaderboards_router.get("/competitions")
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
                    "totalTime": entry.total_time,
                    "rank": entry.rank,
                })

            result.append({

                "id": str(comp_id),
                "name": event.event_name,
                "date": event.event_start_date.isoformat(),
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


@leaderboards_router.get("/algotime")
def get_all_algotime_leaderboard_entries(db: Session = Depends(get_db)):
    logger.info("Accessing /leaderboards/algotime/all endpoint to retrieve all AlgoTime leaderboard entries.")

    try:
        entries = (
            db.query(AlgoTimeLeaderboardEntry)
            .order_by(
                AlgoTimeLeaderboardEntry.algotime_series_id.asc(),
                AlgoTimeLeaderboardEntry.rank.asc()
            )
            .all()
        )

        logger.info(f"SUCCESSFUL FETCH: Retrieved {len(entries)} AlgoTime leaderboard entries.")

        result = []
        for entry in entries:
            # Prefer live user data if user exists, else fallback to stored name
            if entry.user_account:
                user_name = f"{entry.user_account.first_name} {entry.user_account.last_name}"
            else:
                user_name = entry.name

            result.append({
                "entryId": entry.algotime_leaderboard_entry_id,
                "algoTimeSeriesId": entry.algotime_series_id,
                "name": user_name,
                "userId": entry.user_id,
                "totalScore": entry.total_score,
                "problemsSolved": entry.problems_solved,
                "totalTime": entry.total_time,
                "rank": entry.rank,
                "lastUpdated": entry.last_updated.isoformat()
            })

        return result

    except Exception:
        logger.exception("FATAL error while fetching all AlgoTime leaderboard entries.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve AlgoTime leaderboard entries."
        )


@leaderboards_router.get("/competitions/current")
def get_current_competition_leaderboard(db: Session = Depends(get_db)):
    logger.info("Accessing /leaderboards/competition/current endpoint to retrieve current competition leaderboard.")

    try:
        now = datetime.now(timezone.utc)

        # Find current competition (event that is currently ongoing)
        current_competition = (
            db.query(Competition)
            .join(BaseEvent)
            .filter(
                BaseEvent.event_start_date <= now,
                BaseEvent.event_end_date >= now
            )
            .first()
        )

        if not current_competition:
            logger.info("No current competition found.")
            return {
                "message": "No competition is currently active.",
                "competition": None,
                "entries": []
            }

        logger.debug(f"Found current competition with ID {current_competition.event_id}.")

        # Get leaderboard entries for this competition
        entries = (
            db.query(CompetitionLeaderboardEntry)
            .filter(CompetitionLeaderboardEntry.competition_id == current_competition.event_id)
            .order_by(CompetitionLeaderboardEntry.rank.asc())
            .all()
        )

        logger.info(
            f"SUCCESSFUL FETCH: Retrieved {len(entries)} entries for current competition '{current_competition.base_event.event_name}'.")

        result_entries = []
        for entry in entries:
            # Prefer live user data if user exists, else fallback to stored name
            if entry.user_account:
                user_name = f"{entry.user_account.first_name} {entry.user_account.last_name}"
            else:
                user_name = entry.name

            result_entries.append({
                "entryId": entry.competition_leaderboard_entry_id,
                "name": user_name,
                "userId": entry.user_id,
                "totalScore": entry.total_score,
                "problemsSolved": entry.problems_solved,
                "totalTime": entry.total_time,
                "rank": entry.rank
            })

        return {
            "competition": {
                "id": current_competition.event_id,
                "name": current_competition.base_event.event_name,
                "startDate": current_competition.base_event.event_start_date.isoformat(),
                "endDate": current_competition.base_event.event_end_date.isoformat()
            },
            "entries": result_entries
        }

    except Exception:
        logger.exception("FATAL error while fetching current competition leaderboard.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve current competition leaderboard."
        )


@leaderboards_router.get("/algotime/current")
def get_current_algotime_leaderboard(db: Session = Depends(get_db)):
    logger.info("Accessing /leaderboards/algotime/current endpoint to retrieve current AlgoTime session leaderboard.")

    try:
        now = datetime.now(timezone.utc)

        # Find current AlgoTime session (event that is currently ongoing)
        current_algotime = (
            db.query(AlgoTimeSession)
            .join(BaseEvent)
            .filter(
                BaseEvent.event_start_date <= now,
                BaseEvent.event_end_date >= now
            )
            .first()
        )

        if not current_algotime:
            logger.info("No current AlgoTime session found.")
            return {
                "message": "No AlgoTime session is currently active.",
                "session": None,
                "entries": []
            }

        if not current_algotime.algotime_series_id:
            logger.warning(f"Current AlgoTime session (ID {current_algotime.event_id}) has no associated series.")
            return {
                "message": "Current AlgoTime session has no associated series.",
                "session": {
                    "id": current_algotime.event_id,
                    "name": current_algotime.base_event.event_name,
                    "startDate": current_algotime.base_event.event_start_date.isoformat(),
                    "endDate": current_algotime.base_event.event_end_date.isoformat()
                },
                "entries": []
            }

        logger.debug(
            f"Found current AlgoTime session with ID {current_algotime.event_id} and series ID {current_algotime.algotime_series_id}.")

        # Get leaderboard entries for this AlgoTime series
        entries = (
            db.query(AlgoTimeLeaderboardEntry)
            .filter(AlgoTimeLeaderboardEntry.algotime_series_id == current_algotime.algotime_series_id)
            .order_by(AlgoTimeLeaderboardEntry.rank.asc())
            .all()
        )

        logger.info(
            f"SUCCESSFUL FETCH: Retrieved {len(entries)} entries for current AlgoTime session '{current_algotime.base_event.event_name}'.")

        result_entries = []
        for entry in entries:
            # Prefer live user data if user exists, else fallback to stored name
            if entry.user_account:
                user_name = f"{entry.user_account.first_name} {entry.user_account.last_name}"
            else:
                user_name = entry.name

            result_entries.append({
                "entryId": entry.algotime_leaderboard_entry_id,
                "name": user_name,
                "userId": entry.user_id,
                "totalScore": entry.total_score,
                "problemsSolved": entry.problems_solved,
                "totalTime": entry.total_time,
                "rank": entry.rank,
                "lastUpdated": entry.last_updated.isoformat()
            })

        return {
            "session": {
                "id": current_algotime.event_id,
                "name": current_algotime.base_event.event_name,
                "seriesId": current_algotime.algotime_series_id,
                "seriesName": current_algotime.algotime_series.algotime_series_name if current_algotime.algotime_series else None,
                "startDate": current_algotime.base_event.event_start_date.isoformat(),
                "endDate": current_algotime.base_event.event_end_date.isoformat()
            },
            "entries": result_entries
        }

    except Exception:
        logger.exception("FATAL error while fetching current AlgoTime session leaderboard.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve current AlgoTime session leaderboard."
        )