from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, inspect
from sqlalchemy.exc import OperationalError, ProgrammingError
from models.schema import (
    UserAccount, Competition, BaseEvent, Question,
    AlgoTimeSession, QuestionInstance, UserQuestionInstance, Submission, UserSession
)
from database_operations.database import get_db
from endpoints.authentification_api import get_current_user
from endpoints.long_term_statistics_api import get_long_term_statistics_summary
from pydantic import BaseModel
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta
import logging
from typing import Annotated
from services.posthog_analytics import track_custom_event

logger = logging.getLogger(__name__)
admin_dashboard_router = APIRouter(tags=["Admin Dashboard"])


# ---------------- Response Models -----------------

class RecentAccountItem(BaseModel):
    name: str
    info: str  # email
    avatarUrl: Optional[str] = None

    class Config:
        from_attributes = True


class RecentCompetitionItem(BaseModel):
    name: str
    info: str  # date formatted
    color: str

    class Config:
        from_attributes = True


class RecentQuestionItem(BaseModel):
    name: str
    info: str  # date added

    class Config:
        from_attributes = True


class RecentAlgoTimeSessionItem(BaseModel):
    name: str
    info: str  # date added

    class Config:
        from_attributes = True


class DashboardOverviewResponse(BaseModel):
    recent_accounts: List[RecentAccountItem]
    recent_competitions: List[RecentCompetitionItem]
    recent_questions: List[RecentQuestionItem]
    recent_algotime_sessions: List[RecentAlgoTimeSessionItem]


class NewAccountsStatsResponse(BaseModel):
    value: int
    subtitle: str
    trend: str
    description: str


class QuestionsSolvedItem(BaseModel):
    name: str  # Easy, Medium, Hard
    value: int
    color: str


class TimeToSolveItem(BaseModel):
    type: str  # Easy, Medium, Hard
    time: float  # average time in minutes
    color: str


class LoginsDataPoint(BaseModel):
    month: str
    logins: int


class ParticipationDataPoint(BaseModel):
    date: str
    participation: int


# ---------------- Helper Functions ----------------

# Time range configuration: maps time_range to (days, label)
DEFAULT_TIME_RANGE = (90, "3 months")
TIME_RANGE_CONFIG = {
    "7days": (7, "7 days"),
    "30days": (30, "30 days"),
    "3months": DEFAULT_TIME_RANGE,
}


def get_time_range_start(time_range: str) -> datetime:
    """Get the start datetime based on time range filter."""
    now = datetime.now(timezone.utc)
    days = TIME_RANGE_CONFIG.get(time_range, DEFAULT_TIME_RANGE)[0]
    return now - timedelta(days=days)


def get_period_config(time_range: str, range_start: datetime) -> tuple[datetime, str]:
    """Get previous period start and label for a time range."""
    days, label = TIME_RANGE_CONFIG.get(time_range, DEFAULT_TIME_RANGE)
    previous_start = range_start - timedelta(days=days)
    return previous_start, label


def calculate_trend(current_count: int, previous_count: int) -> tuple[str, str]:
    """Calculate trend percentage and direction from period counts."""
    if previous_count > 0:
        trend_value = ((current_count - previous_count) / previous_count) * 100
        trend = f"+{trend_value:.0f}%" if trend_value >= 0 else f"{trend_value:.0f}%"
        direction = "Up" if trend_value >= 0 else "Down"
        return trend, direction

    trend = "+100%" if current_count > 0 else "0%"
    direction = "Up" if current_count > 0 else "No change"
    return trend, direction


def get_trend_description(direction: str) -> str:
    """Get description text based on trend direction."""
    descriptions = {
        "Up": "More users are joining Thinkly",
        "Down": "Fewer users are joining Thinkly",
    }
    return descriptions.get(direction, "User signups are stable")


def format_date(dt: datetime) -> str:
    """Format datetime to readable date string."""
    return dt.strftime("%d/%m/%y")


def get_chart_colors():
    """Return chart colors for consistency."""
    return {
        "easy": "var(--chart-1)",
        "medium": "var(--chart-2)",
        "hard": "var(--chart-3)",
        "chart4": "var(--chart-4)"
    }


def _get_long_term_window_days(time_range: str) -> int:
    return TIME_RANGE_CONFIG.get(time_range, DEFAULT_TIME_RANGE)[0]


def _build_zero_participation_series(time_range: str) -> List[ParticipationDataPoint]:
    now = datetime.now(timezone.utc)

    if time_range == "7days":
        days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        return [ParticipationDataPoint(date=day, participation=0) for day in days]

    if time_range == "30days":
        return [
            ParticipationDataPoint(date=f"Day {index}", participation=0)
            for index in range(1, 31)
        ]

    return [
        ParticipationDataPoint(date=(now - timedelta(days=day)).strftime("%b %d"), participation=0)
        for day in range(90, 0, -1)
    ]


def _legacy_participation_tables_available(db: Session) -> bool:
    try:
        inspector = inspect(db.get_bind())
        required_tables = {"submission", "user_question_instance", "question_instance"}
        existing_tables = set(inspector.get_table_names())
        return required_tables.issubset(existing_tables)
    except Exception:
        return True


def _get_submission_count(
    db: Session,
    event_type: Literal["algotime", "competitions"],
    day_start: datetime,
    day_end: datetime,
) -> int:
    query = (
        db.query(func.count(Submission.submission_id))
        .join(UserQuestionInstance, Submission.user_question_instance_id == UserQuestionInstance.user_question_instance_id)
        .join(QuestionInstance, UserQuestionInstance.question_instance_id == QuestionInstance.question_instance_id)
        .filter(
            Submission.submitted_on >= day_start,
            Submission.submitted_on < day_end,
        )
    )

    if event_type == "competitions":
        query = query.filter(
            QuestionInstance.event_id.in_(db.query(Competition.event_id))
        )
    else:
        query = query.filter(
            QuestionInstance.event_id.in_(db.query(AlgoTimeSession.event_id))
        )

    return query.scalar() or 0


def _build_participation_series(
    db: Session,
    time_range: str,
    event_type: Literal["algotime", "competitions"],
) -> List[ParticipationDataPoint]:
    now = datetime.now(timezone.utc)

    if time_range == "7days":
        days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        data = []
        for index, day in enumerate(days):
            day_start = now - timedelta(days=(6 - index))
            day_end = day_start + timedelta(days=1)
            count = _get_submission_count(db, event_type, day_start, day_end)
            data.append(ParticipationDataPoint(date=day, participation=count))
        return data

    if time_range == "30days":
        data = []
        for day in range(30, 0, -1):
            day_start = now - timedelta(days=day)
            day_end = day_start + timedelta(days=1)
            count = _get_submission_count(db, event_type, day_start, day_end)
            data.append(ParticipationDataPoint(date=f"Day {31 - day}", participation=count))
        return data

    data = []
    for day in range(90, 0, -1):
        day_start = now - timedelta(days=day)
        day_end = day_start + timedelta(days=1)
        count = _get_submission_count(db, event_type, day_start, day_end)
        data.append(ParticipationDataPoint(date=day_start.strftime("%b %d"), participation=count))
    return data


def admin_or_owner_required(
    current_user: Annotated[dict, Depends(get_current_user)]
):
    if current_user.get("role") not in {"admin", "owner"}:
        logger.warning(
            "Access Forbidden: User %s attempted to access admin dashboard stats endpoint.",
            current_user.get("sub"),
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return current_user


# ---------------- Routes ----------------

@admin_dashboard_router.get("/overview", response_model=DashboardOverviewResponse)
async def get_dashboard_overview(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[dict, Depends(admin_or_owner_required)]
):
    """
    Get dashboard overview with 2 most recent items for each category.
    Accessible only by admin users.
    """
    user_email = current_user.get("sub")
    logger.info(f"Admin '{user_email}' requesting dashboard overview")

    competition_colors = ["var(--color-chart-1)", "var(--color-chart-4)"]

    try:
        # Recent Accounts (2 most recent)
        recent_users = (
            db.query(UserAccount)
            .order_by(UserAccount.user_id.desc())
            .limit(2)
            .all()
        )
        recent_accounts = [
            RecentAccountItem(
                name=f"{user.first_name} {user.last_name}",
                info=user.email,
                avatarUrl=None  # Can add avatar URL field to schema if needed
            )
            for user in recent_users
        ]

        # Recent Competitions (2 most recent)
        recent_comps = (
            db.query(BaseEvent, Competition)
            .join(Competition, BaseEvent.event_id == Competition.event_id)
            .order_by(BaseEvent.created_at.desc())
            .limit(2)
            .all()
        )
        recent_competitions = [
            RecentCompetitionItem(
                name=base_event.event_name,
                info=format_date(base_event.event_start_date),
                color=competition_colors[i % len(competition_colors)]
            )
            for i, (base_event, comp) in enumerate(recent_comps)
        ]

        # Recent Questions (2 most recent)
        recent_qs = (
            db.query(Question)
            .order_by(Question.created_at.desc())
            .limit(2)
            .all()
        )
        recent_questions = [
            RecentQuestionItem(
                name=q.question_name,
                info=f"Date added: {format_date(q.created_at)}"
            )
            for q in recent_qs
        ]

        # Recent AlgoTime Sessions (2 most recent)
        recent_algos = (
            db.query(BaseEvent, AlgoTimeSession)
            .join(AlgoTimeSession, BaseEvent.event_id == AlgoTimeSession.event_id)
            .order_by(BaseEvent.created_at.desc())
            .limit(2)
            .all()
        )
        recent_algotime_sessions = [
            RecentAlgoTimeSessionItem(
                name=base_event.event_name,
                info=f"Date added: {format_date(base_event.created_at)}"
            )
            for base_event, algo in recent_algos
        ]

        # Track admin dashboard access
        track_custom_event(
            user_id=str(current_user.get("id")),
            event_name="admin_dashboard_accessed",
            properties={
                "user_email": user_email,
                "recent_users_count": len(recent_accounts),
                "recent_competitions_count": len(recent_competitions),
                "recent_questions_count": len(recent_questions),
                "recent_algotime_count": len(recent_algotime_sessions),
            }
        )

        return DashboardOverviewResponse(
            recent_accounts=recent_accounts,
            recent_competitions=recent_competitions,
            recent_questions=recent_questions,
            recent_algotime_sessions=recent_algotime_sessions
        )

    except Exception as e:
        logger.exception(f"Error fetching dashboard overview: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch dashboard overview"
        )


@admin_dashboard_router.get("/stats/new-accounts", response_model=NewAccountsStatsResponse)
async def get_new_accounts_stats(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[dict, Depends(admin_or_owner_required)],
    time_range: Annotated[
            Literal["7days", "30days", "3months"],
            Query()
        ] = "3months",
):
    """
    Get new accounts statistics for the specified time range.
    """
    logger.info(f"Fetching new accounts stats for range: {time_range}")

    try:
        range_start = get_time_range_start(time_range)
        previous_start, period_label = get_period_config(time_range, range_start)

        # Get new accounts in current period
        current_period_count = (
            db.query(func.count(UserAccount.user_id))
            .filter(UserAccount.created_at >= range_start)
            .scalar() or 0
        )

        # Get previous period for comparison
        previous_period_count = (
            db.query(func.count(UserAccount.user_id))
            .filter(
                UserAccount.created_at >= previous_start,
                UserAccount.created_at < range_start
            )
            .scalar() or 0
        )

        trend, trend_direction = calculate_trend(current_period_count, previous_period_count)
        subtitle = f"{trend_direction} {abs(int(trend.replace('%', '').replace('+', '')))}% in the last {period_label}"
        description = get_trend_description(trend_direction)

        return NewAccountsStatsResponse(
            value=current_period_count,
            subtitle=subtitle,
            trend=trend,
            description=description
        )

    except Exception as e:
        logger.exception(f"Error fetching new accounts stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch new accounts statistics"
        )


@admin_dashboard_router.get("/stats/questions-solved", response_model=List[QuestionsSolvedItem])
async def get_questions_solved_stats(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[dict, Depends(admin_or_owner_required)],
    time_range: Annotated[
            Literal["7days", "30days", "3months"],
            Query()
        ] = "3months",
):
    """
    Get questions solved by difficulty for the specified time range.
    Returns data for pie chart.
    """
    logger.info(f"Fetching questions solved stats for range: {time_range}")
    colors = get_chart_colors()

    try:
        summary = get_long_term_statistics_summary(
            db=db,
            window_value=_get_long_term_window_days(time_range),
            window_unit="days",
            difficulty=None,
        )

        counts = {
            item.difficulty: item.total_questions_solved
            for item in summary.stats
        }

        return [
            QuestionsSolvedItem(name="Easy", value=counts.get("easy", 0), color=colors["easy"]),
            QuestionsSolvedItem(name="Medium", value=counts.get("medium", 0), color=colors["medium"]),
            QuestionsSolvedItem(name="Hard", value=counts.get("hard", 0), color=colors["hard"]),
        ]

    except Exception as e:
        logger.exception(f"Error fetching questions solved stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch questions solved statistics"
        )


@admin_dashboard_router.get("/stats/time-to-solve", response_model=List[TimeToSolveItem])
async def get_time_to_solve_stats(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[dict, Depends(admin_or_owner_required)],
    time_range: Annotated[
            Literal["7days", "30days", "3months"],
            Query()
        ] = "3months",
):
    """
    Get average time to solve questions by difficulty.
    Returns data for horizontal bar chart.
    Time is calculated as minutes from event start to successful submission.
    """
    logger.info(f"Fetching time to solve stats for range: {time_range}")
    colors = get_chart_colors()

    try:
        summary = get_long_term_statistics_summary(
            db=db,
            window_value=_get_long_term_window_days(time_range),
            window_unit="days",
            difficulty=None,
        )

        times = {
            item.difficulty: round(item.average_solve_time, 1) if item.average_solve_time else 0
            for item in summary.stats
        }

        return [
            TimeToSolveItem(type="Easy", time=times.get("easy", 0), color=colors["easy"]),
            TimeToSolveItem(type="Medium", time=times.get("medium", 0), color=colors["medium"]),
            TimeToSolveItem(type="Hard", time=times.get("hard", 0), color=colors["hard"]),
        ]

    except Exception as e:
        logger.exception(f"Error fetching time to solve stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch time to solve statistics"
        )


@admin_dashboard_router.get("/stats/logins", response_model=List[LoginsDataPoint])
async def get_logins_stats(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[dict, Depends(admin_or_owner_required)],
    time_range: Annotated[
            Literal["7days", "30days", "3months"],
            Query()
        ] = "3months",
):
    """
    Get login counts over time.
    Returns data for line chart.
    """
    logger.info(f"Fetching logins stats for range: {time_range}")

    try:
        now = datetime.now(timezone.utc)
        range_start = get_time_range_start(time_range)

        # Query user sessions (logins) grouped by time period
        if time_range == "7days":
            # Group by day of week
            sessions = (
                db.query(
                    func.to_char(UserSession.created_at, 'Dy').label('day'),
                    func.count(UserSession.session_id).label('count')
                )
                .filter(UserSession.created_at >= range_start)
                .group_by(func.to_char(UserSession.created_at, 'Dy'))
                .all()
            )

            day_order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
            counts = {s.day: s.count for s in sessions}
            return [
                LoginsDataPoint(month=day, logins=counts.get(day, 0))
                for day in day_order
            ]

        elif time_range == "30days":
            # Group by week
            data = []
            for week in range(4, 0, -1):
                week_start = now - timedelta(days=week * 7)
                week_end = week_start + timedelta(days=7)
                count = (
                    db.query(func.count(UserSession.session_id))
                    .filter(
                        UserSession.created_at >= week_start,
                        UserSession.created_at < week_end
                    )
                    .scalar() or 0
                )
                data.append(LoginsDataPoint(month=f"Week {5 - week}", logins=count))
            return data

        else:  # 3months
            # Generate dynamic months for last 3 months
            months = []
            for i in range(2, -1, -1):
                month_date = now - timedelta(days=i * 30)
                months.append(month_date.strftime('%b'))

            sessions = (
                db.query(
                    func.to_char(UserSession.created_at, 'Mon').label('month'),
                    func.count(UserSession.session_id).label('count')
                )
                .filter(UserSession.created_at >= range_start)
                .group_by(func.to_char(UserSession.created_at, 'Mon'))
                .all()
            )

            counts = {s.month: s.count for s in sessions}
            return [
                LoginsDataPoint(month=m, logins=counts.get(m, 0))
                for m in months
            ]

    except Exception as e:
        logger.exception(f"Error fetching logins stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch login statistics"
        )


@admin_dashboard_router.get("/stats/participation", response_model=List[ParticipationDataPoint])
async def get_participation_stats(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[dict, Depends(admin_or_owner_required)],
    time_range: Annotated[
            Literal["7days", "30days", "3months"],
            Query()
        ] = "3months",
    event_type: Annotated[
            Literal["algotime", "competitions"],
            Query()
        ] = "algotime",
):
    """
    Get participation over time filtered by event type.
    Returns data for bar chart.
    """
    logger.info(f"Fetching participation stats for range: {time_range}, type: {event_type}")

    try:
        if not _legacy_participation_tables_available(db):
            logger.warning(
                "Legacy participation tables are missing; returning zero-filled participation stats."
            )
            return _build_zero_participation_series(time_range)

        return _build_participation_series(db, time_range, event_type)

    except (OperationalError, ProgrammingError) as e:
        logger.warning("Participation stats query failed; returning zero-filled series: %s", e)
        return _build_zero_participation_series(time_range)

    except Exception as e:
        logger.exception(f"Error fetching participation stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch participation statistics"
        )