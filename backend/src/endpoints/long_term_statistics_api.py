import logging
from datetime import datetime, timedelta, timezone
from typing import Annotated, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from database_operations.database import get_db
from models.schema import BaseEvent, LongTermStatistics

logger = logging.getLogger(__name__)
long_term_statistics_router = APIRouter(tags=["Long Term Statistics"])

TimeUnit = Literal["minutes", "hours", "days", "weeks"]
Difficulty = Literal["easy", "medium", "hard"]


class LongTermStatisticsItem(BaseModel):
    difficulty: Difficulty
    total_questions_solved: int
    average_solve_time: float


class LongTermStatisticsResponse(BaseModel):
    range_start: datetime
    range_end: datetime
    stats: List[LongTermStatisticsItem]


def _get_range_start(now: datetime, value: int, unit: TimeUnit) -> datetime:
    if unit == "minutes":
        return now - timedelta(minutes=value)
    if unit == "hours":
        return now - timedelta(hours=value)
    if unit == "weeks":
        return now - timedelta(weeks=value)
    return now - timedelta(days=value)


@long_term_statistics_router.get("/summary", response_model=LongTermStatisticsResponse)
def get_long_term_statistics_summary(
    db: Annotated[Session, Depends(get_db)],
    window_value: Annotated[int, Query(ge=1, le=3650)] = 7,
    window_unit: TimeUnit = "days",
    difficulty: Optional[Difficulty] = None,
):
    """
    Query aggregated long-term statistics by time window and difficulty.

    Examples:
    - Easy questions solved in the last 7 days:
      /long-term-statistics/summary?difficulty=easy&window_value=7&window_unit=days
    - Average solve time for medium questions in the last 2 hours:
      /long-term-statistics/summary?difficulty=medium&window_value=2&window_unit=hours
    """
    try:
        now = datetime.now(timezone.utc)
        range_start = _get_range_start(now, window_value, window_unit)

        weighted_avg_expr = (
            func.sum(
                LongTermStatistics.average_question_solve_time
                * LongTermStatistics.number_solves
            )
            / func.nullif(func.sum(LongTermStatistics.number_solves), 0)
        )

        query = (
            db.query(
                LongTermStatistics.difficulty.label("difficulty"),
                func.sum(LongTermStatistics.number_solves).label("total_solves"),
                weighted_avg_expr.label("weighted_avg_solve_time"),
            )
            .join(BaseEvent, BaseEvent.event_id == LongTermStatistics.event_id)
            .filter(
                BaseEvent.event_end_date >= range_start,
                BaseEvent.event_end_date <= now,
            )
        )

        if difficulty is not None:
            query = query.filter(LongTermStatistics.difficulty == difficulty)

        results = query.group_by(LongTermStatistics.difficulty).all()

        if difficulty is None:
            by_difficulty = {
                row.difficulty: row
                for row in results
                if getattr(row, "difficulty", None) is not None
            }

            stats = []
            for level in ("easy", "medium", "hard"):
                row = by_difficulty.get(level)
                total_solves = int(getattr(row, "total_solves", 0) or 0)
                avg_solve_time = float(getattr(row, "weighted_avg_solve_time", 0.0) or 0.0)
                stats.append(
                    LongTermStatisticsItem(
                        difficulty=level,
                        total_questions_solved=total_solves,
                        average_solve_time=round(avg_solve_time, 2),
                    )
                )
        else:
            row = results[0] if results else None
            total_solves = int(getattr(row, "total_solves", 0) or 0)
            avg_solve_time = float(getattr(row, "weighted_avg_solve_time", 0.0) or 0.0)
            stats = [
                LongTermStatisticsItem(
                    difficulty=difficulty,
                    total_questions_solved=total_solves,
                    average_solve_time=round(avg_solve_time, 2),
                )
            ]

        return LongTermStatisticsResponse(
            range_start=range_start,
            range_end=now,
            stats=stats,
        )

    except Exception as e:
        logger.exception("Error fetching long-term statistics: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch long-term statistics",
        )
