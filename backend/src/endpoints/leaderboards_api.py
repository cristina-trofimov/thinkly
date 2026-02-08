from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional
from datetime import datetime, timezone
from DB_Methods.database import get_db
from models.schema import (
    CompetitionLeaderboardEntry,
    AlgoTimeLeaderboardEntry,
    Competition,
    BaseEvent
)
import logging

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
            .all()
        )
        logger.debug(f"Scoreboard query completed for ID {competition_id}. Found {len(scoreboards)} entries.")
        return scoreboards
    except Exception as e:
        logger.exception(f"Database error while fetching scoreboard for competition ID {competition_id}.")
        raise e


def calculate_rank(entries: List) -> List:
    """
    Calculate rank for each entry based on total_score (highest score = rank 1).
    Entries with the same score get the same rank.
    Returns entries sorted by score (highest first) with rank added.
    """
    if not entries:
        return []

    # Sort by total_score descending
    sorted_entries = sorted(entries, key=lambda x: x.total_score, reverse=True)

    # Assign ranks
    current_rank = 1
    for i, entry in enumerate(sorted_entries):
        if i > 0 and sorted_entries[i].total_score < sorted_entries[i - 1].total_score:
            current_rank = i + 1
        entry.calculated_rank = current_rank

    return sorted_entries


def get_filtered_leaderboard_entries(entries: List, current_user_id: Optional[int]) -> tuple:
    """
    Returns top 10 entries, or top 10 + current user (±1 position) if user is not in top 10.
    Also returns whether to show separator (ellipsis).
    Returns: (filtered_entries, show_separator)
    """
    if not entries:
        return [], False

    # Calculate ranks for all entries
    ranked_entries = calculate_rank(entries)

    # If no user logged in, return top 10
    if current_user_id is None:
        return ranked_entries[:10], False

    # Find user's entry
    user_entry = None
    user_index = None

    logger.debug(f"Searching for user_id {current_user_id} in {len(ranked_entries)} entries")
    logger.debug(f"Entry user_ids: {[entry.user_id for entry in ranked_entries[:15]]}")

    for idx, entry in enumerate(ranked_entries):
        if entry.user_id == current_user_id:
            user_entry = entry
            user_index = idx
            logger.debug(f"Found user at index {idx} (rank {entry.calculated_rank})")
            break

    # If user not in leaderboard or in top 10, return top 10
    if user_entry is None:
        logger.debug(f"User ID {current_user_id} not found in leaderboard, returning top 10")
        return ranked_entries[:10], False

    if user_index < 10:
        logger.debug(f"User is in top 10 at index {user_index}, returning top 10")
        return ranked_entries[:10], False

    # User at rank 11 (index 10): show top 10 + ranks 11-12, no separator
    if user_index == 10:
        result = list(ranked_entries[:12])  # Top 10 + 11 + 12
        logger.debug(f"User at rank 11: returning {len(result)} entries without separator")
        return result, False

    # User at rank 12 (index 11): show top 10 + ranks 11-13, no separator
    if user_index == 11:
        end_idx = min(13, len(ranked_entries))  # Top 10 + 11 + 12 + 13 (if exists)
        result = list(ranked_entries[:end_idx])
        logger.debug(f"User at rank 12: returning {len(result)} entries without separator")
        return result, False

    # User at rank 13+ (index 12+): show top 10 + separator + user ± 1
    result = list(ranked_entries[:10])  # Top 10

    # Add entry before user (if exists)
    if user_index > 0:
        result.append(ranked_entries[user_index - 1])

    # Add user's entry
    result.append(user_entry)

    # Add entry after user (if exists)
    if user_index < len(ranked_entries) - 1:
        result.append(ranked_entries[user_index + 1])

    logger.debug(
        f"Filtered leaderboard: User ID {current_user_id} at rank {user_index + 1} (index {user_index}), returning {len(result)} entries with separator")
    return result, True


@leaderboards_router.get("/competitions")
def get_leaderboards(
    db: Annotated[Session, Depends(get_db)],
    current_user_id: Optional[int] = None
):
    logger.info("=== /leaderboards/competitions endpoint ===")
    logger.info(f"Received current_user_id parameter: {current_user_id} (type: {type(current_user_id)})")

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

            # Get all entries (will be sorted by total_score in filtering function)
            all_entries = list(comp.competition_leaderboard_entries)

            logger.debug(f"Competition has {len(all_entries)} total entries")

            # Filter entries based on user position (this also calculates ranks)
            filtered_entries, show_separator = get_filtered_leaderboard_entries(all_entries, current_user_id)

            logger.debug(f"After filtering: {len(filtered_entries)} entries, show_separator={show_separator}")

            participants = []
            for entry in filtered_entries:
                # Prefer live user data if user exists, else fallback to stored name
                if entry.user_account:
                    user_name = f"{entry.user_account.first_name} {entry.user_account.last_name}"
                else:
                    user_name = entry.name  # fallback snapshot

                participants.append({
                    "name": user_name,
                    "userId": entry.user_id,
                    "points": entry.total_score,
                    "problemsSolved": entry.problems_solved,
                    "totalTime": entry.total_time,
                    "rank": entry.calculated_rank,
                })

            result.append({
                "id": str(comp_id),
                "name": event.event_name,
                "date": event.event_start_date.isoformat(),
                "participants": participants,
                "showSeparator": show_separator,
            })

        logger.info(f"Successfully returned {len(result)} leaderboards.")
        return result

    except Exception:
        logger.exception("FATAL error during leaderboard aggregation.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve leaderboards."
        )


@leaderboards_router.get("/competitions/current")
def get_current_competition_leaderboard(
    db: Annotated[Session, Depends(get_db)],
    current_user_id: Optional[int] = None
):
    logger.info("=== /leaderboards/competitions/current endpoint ===")
    logger.info(f"Received current_user_id parameter: {current_user_id} (type: {type(current_user_id)})")

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

        # Get all leaderboard entries for this competition
        all_entries = (
            db.query(CompetitionLeaderboardEntry)
            .filter(CompetitionLeaderboardEntry.competition_id == current_competition.event_id)
            .all()
        )

        logger.debug(f"Competition has {len(all_entries)} total entries")

        # Filter entries based on user position (this also calculates ranks)
        filtered_entries, show_separator = get_filtered_leaderboard_entries(all_entries, current_user_id)

        logger.debug(f"After filtering: {len(filtered_entries)} entries, show_separator={show_separator}")

        logger.info(
            f"SUCCESSFUL FETCH: Retrieved {len(filtered_entries)} entries for current competition '{current_competition.base_event.event_name}'.")

        result_entries = []
        for entry in filtered_entries:
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
                "rank": entry.calculated_rank
            })

        return {
            "competition": {
                "id": current_competition.event_id,
                "name": current_competition.base_event.event_name,
                "startDate": current_competition.base_event.event_start_date.isoformat(),
                "endDate": current_competition.base_event.event_end_date.isoformat()
            },
            "entries": result_entries,
            "showSeparator": show_separator
        }

    except Exception:
        logger.exception("FATAL error while fetching current competition leaderboard.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve current competition leaderboard."
        )


@leaderboards_router.get("/algotime")
def get_all_algotime_leaderboard_entries(db: Annotated[Session, Depends(get_db)]):
    """
    Returns all entries in the AlgoTime leaderboard table.
    Ranks are calculated based on total_score (highest score = rank 1).
    """
    logger.info("Accessing /leaderboards/algotime endpoint to fetch all AlgoTime leaderboard entries.")

    try:
        entries = db.query(AlgoTimeLeaderboardEntry).all()

        # Calculate ranks based on total_score
        ranked_entries = calculate_rank(entries)

        result = []
        for entry in ranked_entries:
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
                "rank": entry.calculated_rank,
                "lastUpdated": entry.last_updated.isoformat()
            })

        return result

    except Exception:
        logger.exception("FATAL error while fetching AlgoTime leaderboard entries.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve AlgoTime leaderboard entries."
        )