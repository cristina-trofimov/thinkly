from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import exists
from sqlalchemy.orm import Session
from typing import Annotated, List, Optional
from datetime import datetime, timezone
from database_operations.database import get_db
from models.schema import (
    CompetitionLeaderboardEntry,
    AlgoTimeLeaderboardEntry,
    Competition,
    BaseEvent
)
import logging
from services.posthog_analytics import track_custom_event

leaderboards_router = APIRouter(tags=["Leaderboards"])
logger = logging.getLogger(__name__)

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100


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
        current_user_id: Optional[int] = None,
        search: Annotated[Optional[str], Query(max_length=200)] = None,
        sort: Annotated[str, Query(pattern="^(asc|desc)$")] = "desc",
        page: Annotated[int, Query(ge=1)] = 1,
        page_size: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = DEFAULT_PAGE_SIZE,
):
    """
    Returns a paginated, optionally filtered and sorted list of competition leaderboards.

    - **search**: case-insensitive substring match on competition name
    - **sort**: `asc` or `desc` by competition date (default: `desc`)
    - **page** / **page_size**: 1-based pagination (default page_size=20, max=100)
    """
    logger.info("=== /leaderboards/competitions endpoint ===")
    logger.info(f"Params — sort={sort}, page={page}, page_size={page_size}")

    try:
        query = (
            db.query(Competition)
            .join(BaseEvent)
            .filter(
                exists().where(
                    CompetitionLeaderboardEntry.competition_id == Competition.event_id
                )
            )
        )

        # --- Backend filtering ---
        if search:
            query = query.filter(BaseEvent.event_name.ilike(f"%{search}%"))

        # --- Backend sorting ---
        if sort == "asc":
            query = query.order_by(BaseEvent.event_start_date.asc())
        else:
            query = query.order_by(BaseEvent.event_start_date.desc())

        # --- Total count (for the client to know how many pages exist) ---
        total_count = query.count()

        # --- Pagination ---
        offset = (page - 1) * page_size
        competitions = query.offset(offset).limit(page_size).all()

        if not competitions:
            logger.info("No competitions found for the given parameters.")
            return {"total": total_count, "page": page, "page_size": page_size, "competitions": []}

        result = []

        for comp in competitions:
            event = comp.base_event
            comp_id = comp.event_id

            logger.debug(f"Processing Competition Event ID {comp_id}")

            all_entries = list(comp.competition_leaderboard_entries)
            logger.debug(f"Competition has {len(all_entries)} total entries")

            filtered_entries, show_separator = get_filtered_leaderboard_entries(all_entries, current_user_id)
            logger.debug(f"After filtering: {len(filtered_entries)} entries, show_separator={show_separator}")

            participants = []
            for entry in filtered_entries:
                if entry.user_account:
                    user_name = f"{entry.user_account.first_name} {entry.user_account.last_name}"
                else:
                    user_name = entry.name

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

        logger.info(f"Successfully returned {len(result)} leaderboards (page {page}/{-(-total_count // page_size)}).")

        # Track leaderboard view
        track_custom_event(
            user_id=str(current_user_id) if current_user_id else "anonymous",
            event_name="competitions_leaderboard_viewed",
            properties={
                "competition_count": len(result),
                "total_participants": sum(len(comp["participants"]) for comp in result),
                "is_authenticated": current_user_id is not None,
                "page": page,
                "search": search,
                "sort": sort,
            }
        )

        return {
            "total": total_count,
            "page": page,
            "page_size": page_size,
            "competitions": result,
        }

    except Exception:
        logger.exception("FATAL error during leaderboard aggregation.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve leaderboards."
        )


@leaderboards_router.get("/competitions/{competition_id}/all")
def get_all_competition_entries(
        competition_id: int,
        db: Annotated[Session, Depends(get_db)],
):
    """
    Returns ALL entries for a specific competition (no top-10 filtering).
    Used for copy/download exports.
    """
    logger.info(f"=== /leaderboards/competitions/{competition_id}/all endpoint ===")

    try:
        competition = (
            db.query(Competition)
            .join(BaseEvent)
            .filter(Competition.event_id == competition_id)
            .first()
        )

        if not competition:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Competition {competition_id} not found."
            )

        all_entries = list(competition.competition_leaderboard_entries)
        ranked_entries = calculate_rank(all_entries)

        result = []
        for entry in ranked_entries:
            user_name = (
                f"{entry.user_account.first_name} {entry.user_account.last_name}"
                if entry.user_account else entry.name
            )
            result.append({
                "name": user_name,
                "userId": entry.user_id,
                "points": entry.total_score,
                "problemsSolved": entry.problems_solved,
                "totalTime": entry.total_time,
                "rank": entry.calculated_rank,
            })

        logger.info(f"Returning {len(result)} total entries for competition {competition_id}.")

        # Track full leaderboard export/view
        track_custom_event(
            user_id="anonymous",
            event_name="competition_full_leaderboard_viewed",
            properties={
                "competition_id": competition_id,
                "competition_name": competition.base_event.event_name,
                "total_entries": len(result),
                "is_export": True,
            }
        )

        return result

    except HTTPException:
        raise
    except Exception:
        logger.exception(f"FATAL error fetching all entries for competition {competition_id}.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve competition entries."
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

        all_entries = (
            db.query(CompetitionLeaderboardEntry)
            .filter(CompetitionLeaderboardEntry.competition_id == current_competition.event_id)
            .all()
        )

        logger.debug(f"Competition has {len(all_entries)} total entries")

        filtered_entries, show_separator = get_filtered_leaderboard_entries(all_entries, current_user_id)

        logger.debug(f"After filtering: {len(filtered_entries)} entries, show_separator={show_separator}")
        logger.info(
            f"SUCCESSFUL FETCH: Retrieved {len(filtered_entries)} entries for current competition '{current_competition.base_event.event_name}'.")

        result_entries = []
        for entry in filtered_entries:
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

        track_custom_event(
            user_id=str(current_user_id) if current_user_id else "anonymous",
            event_name="current_competition_leaderboard_viewed",
            properties={
                "competition_id": current_competition.event_id,
                "competition_name": current_competition.base_event.event_name,
                "entries_shown": len(result_entries),
                "total_participants": len(all_entries),
                "is_authenticated": current_user_id is not None,
                "has_separator": show_separator,
            }
        )

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
def get_algotime_leaderboard(
        db: Annotated[Session, Depends(get_db)],
        current_user_id: Optional[int] = None,
        search: Annotated[Optional[str], Query(max_length=200)] = None,
        page: Annotated[int, Query(ge=1)] = 1,
        page_size: Annotated[int, Query(ge=1, le=100)] = 15,
):
    """
    Returns a paginated slice of the AlgoTime leaderboard.

    Ranks are always computed globally (highest total_score = rank 1) so a rank
    number is stable regardless of the page being viewed.

    - **search**: case-insensitive substring match on participant name
    - **page** / **page_size**: 1-based pagination (default page_size=15, max=100)
    - **current_user_id**: when provided the matching row is highlighted by the client
    """
    logger.info(
        f"Accessing /leaderboards/algotime, "
        f"page={page}, page_size={page_size}"
    )

    try:
        # 1. Load ALL entries so ranks can be computed globally.
        #    Only lightweight scalar columns are needed for rank assignment.
        all_entries = db.query(AlgoTimeLeaderboardEntry).all()

        # 2. Compute global ranks (sets .calculated_rank on each entry in-place).
        ranked_entries = calculate_rank(all_entries)

        # 3. Resolve display names once (avoids repeated attribute access in the loop).
        def display_name(entry) -> str:
            if entry.user_account:
                return f"{entry.user_account.first_name} {entry.user_account.last_name}"
            return entry.name

        # 4. Apply optional name search *after* ranking so rank numbers are unaffected.
        if search and search.strip():
            needle = search.strip().lower()
            ranked_entries = [e for e in ranked_entries if needle in display_name(e).lower()]

        # 5. Total count for pagination metadata.
        total = len(ranked_entries)

        # 6. Slice for the requested page.
        offset = (page - 1) * page_size
        page_entries = ranked_entries[offset: offset + page_size]

        result = [
            {
                "entryId": entry.algotime_leaderboard_entry_id,
                "algoTimeSeriesId": entry.algotime_series_id,
                "name": display_name(entry),
                "userId": entry.user_id,
                "totalScore": entry.total_score,
                "problemsSolved": entry.problems_solved,
                "totalTime": entry.total_time,
                "rank": entry.calculated_rank,
                "lastUpdated": entry.last_updated.isoformat(),
            }
            for entry in page_entries
        ]

        logger.info(
            f"Returning {len(result)} AlgoTime entries "
            f"(page {page}, total={total})."
        )

        track_custom_event(
            user_id=str(current_user_id) if current_user_id else "anonymous",
            event_name="algotime_leaderboard_viewed",
            properties={
                "entries_shown": len(result),
                "total_entries": len(all_entries),
                "filtered_total": total,
                "page": page,
                "search": search,
                "is_authenticated": current_user_id is not None,
                "unique_series": len({e.algotime_series_id for e in all_entries}),
            }
        )

        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "entries": result,
        }

    except Exception:
        logger.exception("FATAL error while fetching AlgoTime leaderboard entries.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve AlgoTime leaderboard entries."
        )


@leaderboards_router.get("/algotime/all")
def get_all_algotime_entries_export(db: Annotated[Session, Depends(get_db)]):
    """
    Returns ALL AlgoTime entries with globally-computed ranks.
    No pagination — intended exclusively for copy/download exports.
    """
    logger.info("=== /leaderboards/algotime/all export endpoint ===")

    try:
        all_entries = db.query(AlgoTimeLeaderboardEntry).all()
        ranked_entries = calculate_rank(all_entries)

        result = []
        for entry in ranked_entries:
            user_name = (
                f"{entry.user_account.first_name} {entry.user_account.last_name}"
                if entry.user_account else entry.name
            )
            result.append({
                "entryId": entry.algotime_leaderboard_entry_id,
                "name": user_name,
                "userId": entry.user_id,
                "totalScore": entry.total_score,
                "problemsSolved": entry.problems_solved,
                "totalTime": entry.total_time,
                "rank": entry.calculated_rank,
            })

        logger.info(f"Returning {len(result)} AlgoTime entries for export.")

        track_custom_event(
            user_id="anonymous",
            event_name="algotime_leaderboard_exported",
            properties={"total_entries": len(result), "is_export": True},
        )

        return result

    except Exception:
        logger.exception("FATAL error while exporting AlgoTime leaderboard entries.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to export AlgoTime leaderboard entries."
        )