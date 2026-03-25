from datetime import datetime, timezone
from logging import Logger
from typing import Literal, Optional
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy import case
from sqlalchemy.orm import Query

EventStatusFilter = Optional[Literal["active", "upcoming", "completed"]]
SortOrder = Literal["asc", "desc"]


def parse_local_datetime_from_request(
        date_str: str,
        time_str: str,
        local_tz: ZoneInfo,
        logger: Logger,
) -> datetime:
    try:
        dt_naive = datetime.fromisoformat(f"{date_str}T{time_str}:00")
        return dt_naive.replace(tzinfo=local_tz).astimezone(timezone.utc)
    except ValueError:
        logger.error("Invalid date/time format")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date or time format."
        )


def validate_event_times(
        start_dt: datetime,
        end_dt: datetime,
        *,
        require_future_start: bool = False,
        future_start_detail: str,
        invalid_range_detail: str,
):
    if require_future_start and start_dt <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=future_start_detail
        )

    if end_dt <= start_dt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=invalid_range_detail
        )


def apply_event_status_filter(query: Query, event_model, status_filter: EventStatusFilter, now: datetime) -> Query:
    if status_filter == "upcoming":
        return query.filter(event_model.event_start_date > now)
    if status_filter == "active":
        return query.filter(
            event_model.event_start_date <= now,
            event_model.event_end_date >= now,
        )
    if status_filter == "completed":
        return query.filter(event_model.event_end_date < now)
    return query


def build_event_status_order(event_model, now: datetime):
    return case(
        (event_model.event_start_date > now, 1),
        (event_model.event_end_date < now, 2),
        else_=0,
    )


def build_event_date_order(event_model, sort: SortOrder):
    return event_model.event_start_date.asc() if sort == "asc" else event_model.event_start_date.desc()
