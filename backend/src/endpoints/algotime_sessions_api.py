from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from models.schema import AlgoTimeSession, AlgoTimeSeries, BaseEvent, QuestionInstance, Question
from database_operations.database import get_db
from datetime import datetime, timezone
from pydantic import BaseModel, validator
from typing import Annotated, List, Literal, Optional
import logging
from services.posthog_analytics import track_custom_event
from endpoints.authentification_api import get_current_user
from endpoints.event_utils import (
    apply_event_status_filter,
    build_event_date_order,
    build_event_status_order,
    parse_local_datetime_from_request,
    validate_event_times,
)
from zoneinfo import ZoneInfo
logger = logging.getLogger(__name__)
algotime_router = APIRouter(tags=["Algotime"])
LOCAL_TZ = ZoneInfo("America/Toronto") 
SESSION_NOT_FOUND = "AlgoTime session not found"
DEFAULT_PAGE_SIZE = 11
MAX_PAGE_SIZE = 100


# ---------------- Models ----------------
class CreateAlgotimeSessionRequest(BaseModel):
    name: str
    date: str  # YYYY-MM-DD
    startTime: str  # HH:MM
    endTime: str  # HH:MM
    selectedQuestions: List[int]
    location: Optional[str] = None

    @validator('selectedQuestions')
    def validate_questions(cls, v):
        if not v or len(v) == 0:
            raise ValueError('At least one question must be selected')
        return v


class CreateAlgoTimeRequest(BaseModel):
    seriesName: str
    questionCooldown: int = 300
    sessions: List[CreateAlgotimeSessionRequest]

    @validator("sessions")
    def validate_sessions(cls, v):
        if not v:
            raise ValueError("At least one session is required")
        return v

    @validator('questionCooldown')
    def validate_cooldown(cls, v):
        if v < 0:
            raise ValueError('Cooldown time cannot be negative')
        return v


class AlgoTimeQuestionResponse(BaseModel):
    questionId: int
    questionName: str
    questionDescription: str
    difficulty: str
    tags: List[str]


class AlgoTimeSessionResponse(BaseModel):
    id: int
    eventName: str
    startTime: str
    endTime: str
    questionCooldown: int
    location: Optional[str] = None
    seriesId: Optional[int] = None
    seriesName: Optional[str] = None
    questions: List[AlgoTimeQuestionResponse]


class AlgoTimeSessionCardResponse(BaseModel):
    id: int
    eventName: str
    startTime: str
    endTime: str
    questionCooldown: int
    location: Optional[str] = None
    seriesId: Optional[int] = None
    seriesName: Optional[str] = None
    questionCount: int


class AlgoTimeSessionCardPageResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[AlgoTimeSessionCardResponse]

class DetailedAlgoTimeSessionResponse(BaseModel):
    """Response model for editing algotime sessions - includes all necessary details"""
    id: int
    sessionName: str
    date: str
    startTime: str
    endTime: str
    questionCooldown: int
    selectedQuestions: List[int]
    seriesId: Optional[int] = None
    seriesName: Optional[str] = None

    class Config:
        from_attributes = True

# ------Functions to help
def validate_questions_exist(db: Session, question_ids: List[int]):
    count = (
        db.query(Question)
        .filter(Question.question_id.in_(question_ids))
        .count()
    )

    if count != len(set(question_ids)):
        logger.error("Selected question does not exist")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more questions do not exist"
        )


def parse_datetime_from_request(date_str: str, time_str: str) -> datetime:
    return parse_local_datetime_from_request(date_str, time_str, LOCAL_TZ, logger)


def validate_competition_times(start_dt: datetime, end_dt: datetime):
    validate_event_times(
        start_dt,
        end_dt,
        future_start_detail="AlgoTime session start time must be in the future",
        invalid_range_detail="Competition end time must be after start time",
    )


def generate_unique_series_name(name: str) -> str:
    timestamp = datetime.now(timezone.utc).strftime("%H%M%S")
    return f"{name} - #{timestamp}"


def get_algotime_session_or_404(db: Session, session_id: int) -> AlgoTimeSession:
    session = db.query(AlgoTimeSession).filter(
        AlgoTimeSession.event_id == session_id
    ).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=SESSION_NOT_FOUND
        )
    return session


def get_session_question_instances(db: Session, session_id: int) -> List[QuestionInstance]:
    return db.query(QuestionInstance).filter(
        QuestionInstance.event_id == session_id
    ).all()


def build_algotime_questions(question_instances: List[QuestionInstance]) -> List[AlgoTimeQuestionResponse]:
    return [
        AlgoTimeQuestionResponse(
            questionId=qi.question.question_id,
            questionName=qi.question.question_name,
            questionDescription=qi.question.question_description,
            difficulty=qi.question.difficulty,
            tags=[tag.tag_name for tag in qi.question.tags]
        )
        for qi in question_instances
    ]


def replace_session_questions(db: Session, session_id: int, question_ids: List[int]):
    db.query(QuestionInstance).filter(
        QuestionInstance.event_id == session_id
    ).delete(synchronize_session=False)

    for question_id in question_ids:
        db.add(
            QuestionInstance(
                event_id=session_id,
                question_id=question_id
            )
        )


def build_algotime_session_response(
        session: AlgoTimeSession,
        questions: List[AlgoTimeQuestionResponse]
) -> AlgoTimeSessionResponse:
    event = session.base_event
    return AlgoTimeSessionResponse(
        id=session.event_id,
        eventName=event.event_name,
        startTime=str(event.event_start_date),
        endTime=str(event.event_end_date),
        questionCooldown=event.question_cooldown,
        location=event.event_location,
        seriesId=session.algotime_series_id,
        seriesName=(
            session.algotime_series.algotime_series_name
            if session.algotime_series else None
        ),
        questions=questions
    )


# ---------------ROUTES----------------
@algotime_router.post("/create", status_code=status.HTTP_201_CREATED)
def create_algotime(
        request: CreateAlgoTimeRequest,
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[dict, Depends(get_current_user)]
):
    logger.info("Creating AlgoTime series")

    try:
        # Create AlgoTime series
        # To make it unique
        series_name = generate_unique_series_name(request.seriesName)

        existing_series = db.query(AlgoTimeSeries).filter(
            AlgoTimeSeries.algotime_series_name == series_name
        ).first()

        if existing_series:
            logger.warning(f"Series name '{series_name}' already exists")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A series with the name '{series_name}' already exists"
            )

        series = AlgoTimeSeries(
            algotime_series_name=series_name
        )
        db.add(series)
        db.flush()  # get algotime_series_id

        # Create sessions
        for session in request.sessions:
            validate_questions_exist(db, session.selectedQuestions)
            start_dt = parse_datetime_from_request(
                session.date,
                session.startTime
            )
            end_dt = parse_datetime_from_request(
                session.date,
                session.endTime
            )

            validate_competition_times(start_dt, end_dt)

            event_name = session.name

            # Check if event name already exists - throw 409
            existing_event = db.query(BaseEvent).filter(
                BaseEvent.event_name == event_name
            ).first()

            if existing_event:
                logger.warning(f"Event name '{event_name}' already exists")
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"A session with the name '{event_name}' already exists"
                )

            base_event = BaseEvent(
                event_name=session.name,
                event_location=session.location if hasattr(session, 'location') else None,
                question_cooldown=request.questionCooldown,
                event_start_date=start_dt,
                event_end_date=end_dt,
            )
            db.add(base_event)
            db.flush()  # get event_id

            algotime_session = AlgoTimeSession(
                event_id=base_event.event_id,
                algotime_series_id=series.algotime_series_id
            )
            db.add(algotime_session)

            replace_session_questions(db, base_event.event_id, session.selectedQuestions)

        db.commit()

        logger.info(
            f"AlgoTime '{series.algotime_series_name}' created "
            f"with {len(request.sessions)} session(s)"
        )

        # Track AlgoTime series creation
        track_custom_event(
            user_id=str(current_user.get("id")),
            event_name="algotime_series_created",
            properties={
                "series_id": series.algotime_series_id,
                "series_name": series.algotime_series_name,
                "session_count": len(request.sessions),
                "question_cooldown": request.questionCooldown,
                "total_questions": sum(len(s.selectedQuestions) for s in request.sessions),
                "user_email": current_user.get("sub"),
            }
        )

        return {
            "series_id": series.algotime_series_id,
            "series_name": series.algotime_series_name,
            "session_count": len(request.sessions)
        }

    except HTTPException:
        raise
    except Exception:
        db.rollback()
        logger.exception("Failed to create AlgoTime")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create AlgoTime"
        )


@algotime_router.get("/", response_model=AlgoTimeSessionCardPageResponse)
def get_all_algotime_sessions(
    db: Annotated[Session, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = DEFAULT_PAGE_SIZE,
    search: Optional[str] = None,
    status_filter: Annotated[Optional[Literal["active", "upcoming", "completed"]], Query(alias="status")] = None,
    sort: Annotated[Literal["asc", "desc"], Query()] = "desc",
):
    try:
        now = datetime.now(timezone.utc)
        query = (
            db.query(AlgoTimeSession)
            .join(BaseEvent)
            .outerjoin(AlgoTimeSeries, AlgoTimeSession.algotime_series_id == AlgoTimeSeries.algotime_series_id)
        )

        if search and search.strip():
            search_term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    BaseEvent.event_name.ilike(search_term),
                    AlgoTimeSeries.algotime_series_name.ilike(search_term),
                )
            )

        query = apply_event_status_filter(query, BaseEvent, status_filter, now)

        total = query.count()
        status_order = build_event_status_order(BaseEvent, now)
        date_order = build_event_date_order(BaseEvent, sort)
        sessions = (
            query
            .order_by(status_order.asc(), date_order)
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        logger.info("Fetched %s AlgoTime sessions for page=%s page_size=%s", len(sessions), page, page_size)

        event_ids = [session.event_id for session in sessions]
        question_counts = dict(
            db.query(
                QuestionInstance.event_id,
                func.count(QuestionInstance.question_instance_id),
            )
            .filter(QuestionInstance.event_id.in_(event_ids))
            .group_by(QuestionInstance.event_id)
            .all()
        ) if event_ids else {}

        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": [
                {
                    "id": s.event_id,
                    "eventName": s.base_event.event_name,
                    "startTime": str(s.base_event.event_start_date),
                    "endTime": str(s.base_event.event_end_date),
                    "questionCooldown": s.base_event.question_cooldown,
                    "location": s.base_event.event_location,
                    "seriesId": s.algotime_series.algotime_series_id if s.algotime_series else None,
                    "seriesName": s.algotime_series.algotime_series_name if s.algotime_series else None,
                    "questionCount": question_counts.get(s.event_id, 0),
                }
                for s in sessions
            ],
        }

    except Exception as e:
        logger.error(f"Error fetching AlgoTime sessions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve AlgoTime sessions."
        )

@algotime_router.get("/{session_id}", response_model=AlgoTimeSessionResponse)
def get_algotime_session(
    session_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)]
):
    logger.info(f"User {current_user.get('sub')} requested AlgoTime session {session_id}")

    session = get_algotime_session_or_404(db, session_id)
    questions = build_algotime_questions(
        get_session_question_instances(db, session_id)
    )

    logger.info(f"AlgoTime session {session_id} fetched successfully")

    return build_algotime_session_response(session, questions)

@algotime_router.put("/{session_id}", response_model=AlgoTimeSessionResponse)
def update_algotime_session(
    session_id: int,
    request: CreateAlgotimeSessionRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)]
):
    logger.info(f"User {current_user.get('sub')} updating AlgoTime session {session_id}")

    session = get_algotime_session_or_404(db, session_id)
    event = session.base_event

    validate_questions_exist(db, request.selectedQuestions)
    start_dt = parse_datetime_from_request(request.date, request.startTime)
    end_dt = parse_datetime_from_request(request.date, request.endTime)
    validate_competition_times(start_dt, end_dt)

    event.event_name = request.name
    event.event_location = request.location
    event.event_start_date = start_dt
    event.event_end_date = end_dt

    replace_session_questions(db, session_id, request.selectedQuestions)

    db.commit()
    db.refresh(event)

    questions = build_algotime_questions(
        get_session_question_instances(db, session_id)
    )

    logger.info(f"AlgoTime session {session_id} updated successfully")

    return build_algotime_session_response(session, questions)

@algotime_router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_algotime_session(
    session_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)]
):
    user_email = current_user.get("sub") or "unknown"
    logger.info(f"User '{user_email}' attempting to delete AlgoTime session {session_id}")

    try:
        # Fetch the AlgoTimeSession first (not BaseEvent) so we have series info
        algotime_session = get_algotime_session_or_404(db, session_id)
        base_event = algotime_session.base_event

        if not base_event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="AlgoTime session event not found"
            )

        session_name = base_event.event_name
        series_id = algotime_session.algotime_series_id

        # 1. Delete question instances
        db.query(QuestionInstance).filter(
            QuestionInstance.event_id == session_id
        ).delete(synchronize_session=False)

        # 2. Delete AlgoTimeSession first, flush before touching BaseEvent
        db.delete(algotime_session)
        db.flush()

        # 3. Delete BaseEvent
        db.delete(base_event)
        db.flush()

        # 4. Check if series is now empty and clean it up if so
        if series_id:
            remaining = db.query(AlgoTimeSession).filter(
                AlgoTimeSession.algotime_series_id == series_id
            ).count()

            if remaining == 0:
                db.query(AlgoTimeSeries).filter(
                    AlgoTimeSeries.algotime_series_id == series_id
                ).delete(synchronize_session=False)
                logger.info(f"Series {series_id} had no remaining sessions, deleted it too")

        db.commit()

        logger.info(f"SUCCESSFUL DELETION: AlgoTime session '{session_name}' (ID: {session_id}) deleted by '{user_email}'")

        track_custom_event(
            user_id=str(current_user.get("id", "unknown")),
            event_name="algotime_session_deleted",
            properties={
                "session_id": session_id,
                "session_name": session_name,
                "user_email": user_email,
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error deleting AlgoTime session {session_id}: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete AlgoTime session: {str(e)}"
        )

