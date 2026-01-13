from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from models.schema import (
    UserAccount, Competition, BaseEvent, Question,
    AlgoTimeSession, AlgoTimeSeries, Participation, Submission, UserSession
)
from DB_Methods.database import get_db
from endpoints.authentification_api import role_required
from pydantic import BaseModel
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta
import logging

logger = logging.getLogger(__name__)
admin_dashboard_router = APIRouter(tags=["Admin Dashboard"])


# ---------------- Response Models ----------------

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

def get_time_range_start(time_range: str) -> datetime:
    """Get the start datetime based on time range filter."""
    now = datetime.now(timezone.utc)
    if time_range == "7days":
        return now - timedelta(days=7)
    elif time_range == "30days":
        return now - timedelta(days=30)
    else:  # 3months
        return now - timedelta(days=90)


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


# ---------------- Routes ----------------

@admin_dashboard_router.get("/overview", response_model=DashboardOverviewResponse)
async def get_dashboard_overview(
    db: Session = Depends(get_db),
    current_user: dict = Depends(role_required("admin"))
):
    """
    Get dashboard overview with 2 most recent items for each category.
    Accessible only by admin users.
    """
    user_email = current_user.get("sub")
    logger.info(f"Admin '{user_email}' requesting dashboard overview")

    colors = get_chart_colors()
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
    time_range: Literal["7days", "30days", "3months"] = Query(default="3months"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(role_required("admin"))
):
    """
    Get new accounts statistics for the specified time range.
    """
    logger.info(f"Fetching new accounts stats for range: {time_range}")

    try:
        now = datetime.now(timezone.utc)
        range_start = get_time_range_start(time_range)

        # Get new accounts in current period
        current_period_count = (
            db.query(func.count(UserAccount.user_id))
            .filter(UserAccount.created_at >= range_start)
            .scalar() or 0
        )

        # Get previous period for comparison
        if time_range == "7days":
            previous_start = range_start - timedelta(days=7)
            period_label = "7 days"
        elif time_range == "30days":
            previous_start = range_start - timedelta(days=30)
            period_label = "30 days"
        else:  # 3months
            previous_start = range_start - timedelta(days=90)
            period_label = "3 months"

        previous_period_count = (
            db.query(func.count(UserAccount.user_id))
            .filter(
                UserAccount.created_at >= previous_start,
                UserAccount.created_at < range_start
            )
            .scalar() or 0
        )

        # Calculate trend percentage
        if previous_period_count > 0:
            trend_value = ((current_period_count - previous_period_count) / previous_period_count) * 100
            trend = f"+{trend_value:.0f}%" if trend_value >= 0 else f"{trend_value:.0f}%"
            trend_direction = "Up" if trend_value >= 0 else "Down"
        else:
            trend = "+100%" if current_period_count > 0 else "0%"
            trend_direction = "Up" if current_period_count > 0 else "No change"

        subtitle = f"{trend_direction} {abs(int(trend.replace('%', '').replace('+', '')))}% in the last {period_label}"

        if trend_direction == "Up":
            description = "More users are joining Thinkly"
        elif trend_direction == "Down":
            description = "Fewer users are joining Thinkly"
        else:
            description = "User signups are stable"

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
    time_range: Literal["7days", "30days", "3months"] = Query(default="3months"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(role_required("admin"))
):
    """
    Get questions solved by difficulty for the specified time range.
    Returns data for pie chart.
    """
    logger.info(f"Fetching questions solved stats for range: {time_range}")
    colors = get_chart_colors()

    try:
        range_start = get_time_range_start(time_range)

        # Query successful submissions grouped by question difficulty
        from models.schema import QuestionInstance

        results = (
            db.query(
                Question.difficulty,
                func.count(Submission.submission_id).label('count')
            )
            .join(QuestionInstance, Question.question_id == QuestionInstance.question_id)
            .join(Submission, QuestionInstance.question_instance_id == Submission.question_instance_id)
            .filter(
                Submission.successful == True,
                Submission.submission_time >= range_start
            )
            .group_by(Question.difficulty)
            .all()
        )

        # Convert to dict for easy lookup
        counts = {r.difficulty: r.count for r in results}

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
    time_range: Literal["7days", "30days", "3months"] = Query(default="3months"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(role_required("admin"))
):
    """
    Get average time to solve questions by difficulty.
    Returns data for horizontal bar chart.
    Time is calculated as minutes from event start to successful submission.
    """
    logger.info(f"Fetching time to solve stats for range: {time_range}")
    colors = get_chart_colors()

    try:
        range_start = get_time_range_start(time_range)
        from models.schema import QuestionInstance

        # Calculate average time to solve by difficulty
        # Time = submission_time - event_start_date (in minutes)
        results = (
            db.query(
                Question.difficulty,
                func.avg(
                    func.extract('epoch', Submission.submission_time - BaseEvent.event_start_date) / 60
                ).label('avg_minutes')
            )
            .join(QuestionInstance, Question.question_id == QuestionInstance.question_id)
            .join(Submission, QuestionInstance.question_instance_id == Submission.question_instance_id)
            .join(Participation, Submission.participation_id == Participation.participation_id)
            .join(BaseEvent, Participation.event_id == BaseEvent.event_id)
            .filter(
                Submission.successful == True,
                Submission.submission_time >= range_start
            )
            .group_by(Question.difficulty)
            .all()
        )

        # Convert to dict for easy lookup
        times = {r.difficulty: round(r.avg_minutes, 1) if r.avg_minutes else 0 for r in results}

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
    time_range: Literal["7days", "30days", "3months"] = Query(default="3months"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(role_required("admin"))
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
    time_range: Literal["7days", "30days", "3months"] = Query(default="3months"),
    event_type: Literal["algotime", "competitions"] = Query(default="algotime"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(role_required("admin"))
):
    """
    Get participation over time filtered by event type.
    Returns data for bar chart.
    """
    logger.info(f"Fetching participation stats for range: {time_range}, type: {event_type}")

    try:
        now = datetime.now(timezone.utc)

        # Build base query with event type filter
        def get_submission_count(day_start, day_end):
            query = (
                db.query(func.count(Submission.submission_id))
                .join(Participation, Submission.participation_id == Participation.participation_id)
            )

            # Filter by event type
            if event_type == "competitions":
                query = query.filter(
                    Participation.event_id.in_(
                        db.query(Competition.event_id)
                    )
                )
            else:  # algotime
                query = query.filter(
                    Participation.event_id.in_(
                        db.query(AlgoTimeSession.event_id)
                    )
                )

            return query.filter(
                Submission.submission_time >= day_start,
                Submission.submission_time < day_end
            ).scalar() or 0

        if time_range == "7days":
            days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
            data = []
            for i, day in enumerate(days):
                day_start = now - timedelta(days=(6-i))
                day_end = day_start + timedelta(days=1)
                count = get_submission_count(day_start, day_end)
                data.append(ParticipationDataPoint(date=day, participation=count))
            return data

        elif time_range == "30days":
            data = []
            for day in range(30, 0, -1):
                day_start = now - timedelta(days=day)
                day_end = day_start + timedelta(days=1)
                count = get_submission_count(day_start, day_end)
                data.append(ParticipationDataPoint(
                    date=f"Day {31 - day}",
                    participation=count
                ))
            return data

        else:  # 3months
            data = []
            for day in range(90, 0, -1):
                day_start = now - timedelta(days=day)
                day_end = day_start + timedelta(days=1)
                count = get_submission_count(day_start, day_end)
                date_str = day_start.strftime("%b %d")
                data.append(ParticipationDataPoint(date=date_str, participation=count))
            return data

    except Exception as e:
        logger.exception(f"Error fetching participation stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch participation statistics"
        )
