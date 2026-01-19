from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from models.schema import Competition, BaseEvent, QuestionInstance, CompetitionEmail, UserAccount, Participation, CompetitionLeaderboardEntry
from DB_Methods.database import get_db, _commit_or_rollback
from endpoints.authentification_api import get_current_user
from endpoints.send_email_api import send_email_via_brevo
import logging
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, validator
from typing import List, Optional

logger = logging.getLogger(__name__)
competitions_router = APIRouter(tags=["Competitions"])


# ---------------- Models ----------------
class EmailNotificationRequest(BaseModel):
    to: str
    subject: str
    body: str
    sendInOneMinute: bool = False
    sendAtLocal: Optional[str] = None

    @validator('sendAtLocal')
    def validate_send_at_local(cls, v):
        if v:
            try:
                datetime.fromisoformat(v.replace('Z', '+00:00'))
            except ValueError:
                raise ValueError('sendAtLocal must be a valid ISO format datetime')
        return v


class EmailNotificationResponse(BaseModel):
    to: str
    subject: str
    body: str
    sendInOneMinute: bool
    sendAtLocal: Optional[str] = None

    class Config:
        from_attributes = True


class CreateCompetitionRequest(BaseModel):
    name: str
    date: str  # YYYY-MM-DD
    startTime: str  # HH:MM
    endTime: str  # HH:MM
    location: Optional[str] = None
    questionCooldownTime: int = 300
    riddleCooldownTime: int = 60
    selectedQuestions: List[int]
    selectedRiddles: List[int]
    emailEnabled: bool = False
    emailNotification: Optional[EmailNotificationRequest] = None

    @validator('name')
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Competition name cannot be empty')
        return v.strip()

    @validator('selectedQuestions')
    def validate_questions(cls, v):
        if not v or len(v) == 0:
            raise ValueError('At least one question must be selected')
        return v

    @validator('selectedRiddles')
    def validate_riddles(cls, v):
        if not v or len(v) == 0:
            raise ValueError('At least one riddle must be selected')
        return v

    @validator('questionCooldownTime', 'riddleCooldownTime')
    def validate_cooldown(cls, v):
        if v < 0:
            raise ValueError('Cooldown time cannot be negative')
        return v

    @validator('selectedRiddles')
    def validate_equal_length(cls, v, values):
        questions = values.get('selectedQuestions')
        if questions and len(v) != len(questions):
            raise ValueError(
                "selectedQuestions and selectedRiddles must have the same length"
            )
        return v


class CompetitionResponse(BaseModel):
    event_id: int
    event_name: str
    event_location: Optional[str]
    event_start_date: datetime
    event_end_date: datetime
    question_cooldown: int
    riddle_cooldown: int
    question_count: int
    riddle_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class DetailedCompetitionResponse(BaseModel):
    """Response model for editing competitions - includes all necessary details"""
    id: int
    competitionTitle: str
    competitionLocation: Optional[str]
    date: str  # ISO date string
    startTime: str  # HH:MM format
    endTime: str  # HH:MM format
    questionCooldownTime: int
    riddleCooldownTime: int
    selectedQuestions: List[int]  # List of question IDs in order
    selectedRiddles: List[int]  # List of riddle IDs in order
    emailNotification: Optional[EmailNotificationResponse] = None

    class Config:
        from_attributes = True


# ---------------- Helper Functions ----------------
def parse_datetime_from_request(date_str: str, time_str: str) -> datetime:
    """
    Combines date and time strings into a timezone-aware datetime object.
    """
    try:
        dt_str = f"{date_str}T{time_str}:00"
        dt = datetime.fromisoformat(dt_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except ValueError as e:
        logger.error(f"Invalid date/time format: {date_str} {time_str}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid date or time format: {str(e)}"
        )


def validate_competition_times(start_dt: datetime, end_dt: datetime, skip_future_check: bool = False):
    """Validates that competition times are logical and in the future."""
    if not skip_future_check:
        now = datetime.now(timezone.utc)
        if start_dt <= now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Competition start time must be in the future"
            )

    if end_dt <= start_dt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Competition end time must be after start time"
        )


def check_competition_name_exists(db: Session, name: str, exclude_id: Optional[int] = None) -> bool:
    """Check if a competition with this name already exists."""
    query = db.query(BaseEvent).filter(BaseEvent.event_name == name)
    if exclude_id:
        query = query.filter(BaseEvent.event_id != exclude_id)
    existing = query.first()
    return existing is not None


def create_competition_emails(
        db: Session,
        competition: Competition,
        email_data: EmailNotificationRequest,
        competition_start: datetime,
        competition_end: datetime,
        competition_name: str,
        date_str: str,
        start_time_str: str,
        end_time_str: str,
        location: Optional[str]
):
    """
    Creates scheduled email record for the competition.
    Stores reminder times: 24 hours before, 5 minutes before, and optional custom time.
    Also stores the email body text, subject, and recipients.
    """
    try:
        # Calculate reminder times
        time_24h = competition_start - timedelta(hours=24)
        time_5min = competition_start - timedelta(minutes=5)

        # Optional custom time
        other_time = None
        if email_data.sendInOneMinute:
            other_time = datetime.now(timezone.utc) + timedelta(minutes=1)
        elif email_data.sendAtLocal:
            other_time = datetime.fromisoformat(
                email_data.sendAtLocal.replace('Z', '+00:00')
            )

        # Create single email record with all reminder times and email content
        competition_email = CompetitionEmail(
            competition_id=competition.event_id,
            subject=email_data.subject,
            to=email_data.to,
            body=email_data.body,
            time_24h_before=time_24h,
            time_5min_before=time_5min,
            other_time=other_time
        )

        db.add(competition_email)
        _commit_or_rollback(db)

        logger.info(f"Competition email record created for competition ID: {competition.event_id}")
        logger.info(f"  - 24h reminder: {time_24h}")
        logger.info(f"  - 5min reminder: {time_5min}")
        if other_time:
            logger.info(f"  - Custom time: {other_time}")

        return competition_email

    except Exception as e:
        logger.error(f"Failed to create competition email record: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to schedule email notifications"
        )


# ---------------- Routes ----------------
@competitions_router.get("/")
def get_all_competitions(db: Session = Depends(get_db)):
    """Get all competitions (existing endpoint kept for compatibility)"""
    try:
        competitions = db.query(Competition).join(BaseEvent).all()
        logger.info(f"Fetched {len(competitions)} competitions from the database.")

        return [
            {
                "id": comp.event_id,
                "competition_title": comp.base_event.event_name,
                "competition_location": comp.base_event.event_location,
                "start_date": comp.base_event.event_start_date,
                "end_date": comp.base_event.event_end_date,
            }
            for comp in competitions
        ]
    except Exception as e:
        logger.error(f"Error fetching competitions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve competitions. Exception: {str(e)}"
        )


@competitions_router.get("/list", response_model=List[CompetitionResponse])
async def list_competitions(
        db: Session = Depends(get_db),
        current_user: dict = Depends(get_current_user)
):
    """
    List all competitions with detailed information.
    Accessible by any authenticated user.
    """
    user_email = current_user.get("sub")
    logger.info(f"User '{user_email}' requesting competitions list")

    try:
        competitions = (
            db.query(BaseEvent, Competition)
            .join(Competition, BaseEvent.event_id == Competition.event_id)
            .order_by(BaseEvent.event_start_date.desc())
            .all()
        )

        result = []
        for base_event, competition in competitions:
            question_count = db.query(QuestionInstance).filter(
                QuestionInstance.event_id == base_event.event_id,
                ~QuestionInstance.is_riddle
            ).count()

            riddle_count = db.query(QuestionInstance).filter(
                QuestionInstance.event_id == base_event.event_id,
                QuestionInstance.is_riddle
            ).count()

            result.append(CompetitionResponse(
                event_id=base_event.event_id,
                event_name=base_event.event_name,
                event_location=base_event.event_location,
                event_start_date=base_event.event_start_date,
                event_end_date=base_event.event_end_date,
                question_cooldown=base_event.question_cooldown,
                riddle_cooldown=competition.riddle_cooldown,
                question_count=question_count,
                riddle_count=riddle_count,
                created_at=base_event.created_at
            ))

        logger.info(f"Retrieved {len(result)} competitions for user '{user_email}'")
        return result

    except Exception as e:
        logger.exception(f"Error retrieving competitions list: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve competitions"
        )


@competitions_router.post("/create", response_model=CompetitionResponse, status_code=status.HTTP_201_CREATED)
async def create_competition(
        request: CreateCompetitionRequest,
        db: Session = Depends(get_db),
        current_user: dict = Depends(get_current_user)
):
    user_email = current_user.get("sub")
    logger.info(f"User '{user_email}' attempting to create competition: {request.name}")

    if check_competition_name_exists(db, request.name):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Competition with name '{request.name}' already exists")

    start_dt = parse_datetime_from_request(request.date, request.startTime)
    end_dt = parse_datetime_from_request(request.date, request.endTime)
    validate_competition_times(start_dt, end_dt)

    try:
        base_event = BaseEvent(
            event_name=request.name,
            event_location=request.location,
            question_cooldown=request.questionCooldownTime,
            event_start_date=start_dt,
            event_end_date=end_dt,
        )
        db.add(base_event)
        _commit_or_rollback(db)
        db.refresh(base_event)

        logger.info(f"BaseEvent created with ID: {base_event.event_id}")

        competition = Competition(
            event_id=base_event.event_id,
            riddle_cooldown=request.riddleCooldownTime
        )
        db.add(competition)
        _commit_or_rollback(db)
        db.refresh(competition)

        logger.info(f"Competition created with event_id: {competition.event_id}")

        for index, (question_id, riddle_id) in enumerate(
                zip(request.selectedQuestions, request.selectedRiddles)
        ):
            question_instance = QuestionInstance(
                event_id=base_event.event_id,
                question_id=question_id,
                riddle_id=riddle_id,
                points=0,
                is_riddle_completed=False
            )
            db.add(question_instance)

        _commit_or_rollback(db)
        logger.info(f"Added {len(request.selectedQuestions)} question+riddle pairs")

        # Email Triggering Logic
        if request.emailEnabled and request.emailNotification:
            # 1. Save to DB
            create_competition_emails(db, competition, request.emailNotification, start_dt, end_dt, request.name, request.date, request.startTime, request.endTime, request.location)

            # 2. Resolve Recipients
            recipients = []
            if request.emailNotification.to.strip().lower() == "all participants":
                recipients = [u.email for u in db.query(UserAccount).all()]
            else:
                recipients = [e.strip() for e in request.emailNotification.to.split(",") if e.strip()]

            if recipients:
                # A. Send/Schedule 24h Reminder
                # if email_record.time_24h_before and email_record.time_24h_before > datetime.now(timezone.utc):
                #      TO-DO in future features: have something that watches if the email can be sent yet (Brevo only allows less than 3 days of email scheduling)

                # B. Send/Schedule 5m Reminder
                # if email_record.time_5min_before and email_record.time_5min_before > datetime.now(timezone.utc):
                #     TO-DO in future features: have something that watches if the email can be sent yet (Brevo only allows less than 3 days of email scheduling)

                # C. Send Immediate Test
                if request.emailNotification.sendInOneMinute:
                    # Send now (Brevo handles immediate delivery if sendAt is None or very soon)
                    send_email_via_brevo(to=recipients, subject=f"[TEST] {request.emailNotification.subject}", text=request.emailNotification.text)

                # D. Send/Schedule Custom Reminder
                if request.emailNotification.sendAtLocal and not request.emailNotification.sendInOneMinute:
                    send_email_via_brevo(to=recipients, subject=request.emailNotification.subject, text=request.emailNotification.text, sendAt=request.emailNotification.sendAtLocal)
            else:
                logger.warning("Email enabled but no recipients resolved.")

        return CompetitionResponse(
            event_id=base_event.event_id,
            event_name=base_event.event_name,
            event_location=base_event.event_location,
            event_start_date=base_event.event_start_date,
            event_end_date=base_event.event_end_date,
            question_cooldown=base_event.question_cooldown,
            riddle_cooldown=competition.riddle_cooldown,
            question_count=len(request.selectedQuestions),
            riddle_count=len(request.selectedRiddles),
            created_at=base_event.created_at
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"FATAL error during competition creation: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error during competition creation")


@competitions_router.get("/{competition_id}", response_model=DetailedCompetitionResponse)
async def get_competition_detailed(
        competition_id: int,
        db: Session = Depends(get_db),
        current_user: dict = Depends(get_current_user)
):
    """
    Get full details of a competition for editing purposes.
    Returns all fields needed by the edit dialog.
    """
    user_email = current_user.get("sub")
    logger.info(f"User '{user_email}' requesting detailed competition ID: {competition_id}")

    try:
        base_event = db.query(BaseEvent).filter(BaseEvent.event_id == competition_id).first()
        if not base_event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Competition not found"
            )

        competition = db.query(Competition).filter(Competition.event_id == competition_id).first()
        if not competition:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Competition details not found"
            )

        # Get ordered question instances
        question_instances = (
            db.query(QuestionInstance)
            .filter(QuestionInstance.event_id == competition_id)
            .order_by(QuestionInstance.question_instance_id)
            .all()
        )

        selected_questions = [qi.question_id for qi in question_instances]
        selected_riddles = [qi.riddle_id for qi in question_instances]

        # Extract date and time from datetime
        date_str = base_event.event_start_date.strftime('%Y-%m-%d')
        start_time_str = base_event.event_start_date.strftime('%H:%M')
        end_time_str = base_event.event_end_date.strftime('%H:%M')

        # Get email notification if exists
        email_notification = None
        competition_email = db.query(CompetitionEmail).filter(
            CompetitionEmail.competition_id == competition_id
        ).first()

        if competition_email:
            logger.info(f"Found competition email for ID {competition_id}")
            logger.info(f"  - Subject: {competition_email.subject}")
            logger.info(f"  - To: {competition_email.to}")
            logger.info(f"  - Body length: {len(competition_email.body) if competition_email.body else 0}")
            logger.info(f"  - time_24h_before: {competition_email.time_24h_before}")
            logger.info(f"  - time_5min_before: {competition_email.time_5min_before}")
            logger.info(f"  - other_time: {competition_email.other_time}")

            send_in_one_minute = False
            send_at_local = None

            if competition_email.other_time:
                # Format datetime for datetime-local input (YYYY-MM-DDTHH:mm)
                send_at_local = competition_email.other_time.strftime('%Y-%m-%dT%H:%M')
                logger.info(f"  - Formatted send_at_local: {send_at_local}")

            email_notification = EmailNotificationResponse(
                to=competition_email.to,
                subject=competition_email.subject,
                body=competition_email.body,
                sendInOneMinute=send_in_one_minute,
                sendAtLocal=send_at_local
            )

            logger.info("Email notification response created successfully")
        else:
            logger.info(f"No email notification found for competition ID {competition_id}")

        return DetailedCompetitionResponse(
            id=base_event.event_id,
            competitionTitle=base_event.event_name,
            competitionLocation=base_event.event_location,
            date=date_str,
            startTime=start_time_str,
            endTime=end_time_str,
            questionCooldownTime=base_event.question_cooldown,
            riddleCooldownTime=competition.riddle_cooldown,
            selectedQuestions=selected_questions,
            selectedRiddles=selected_riddles,
            emailNotification=email_notification
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error retrieving detailed competition {competition_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve competition details"
        )


@competitions_router.put("/{competition_id}", response_model=CompetitionResponse)
async def update_competition(
        competition_id: int,
        request: CreateCompetitionRequest,
        db: Session = Depends(get_db),
        current_user: dict = Depends(get_current_user)
):

    user_email = current_user.get("sub")
    logger.info(f"User '{user_email}' attempting to update competition ID: {competition_id}")

    try:
        # Check if competition exists
        base_event = db.query(BaseEvent).filter(BaseEvent.event_id == competition_id).first()
        if not base_event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Competition not found"
            )

        competition = db.query(Competition).filter(Competition.event_id == competition_id).first()
        if not competition:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Competition details not found"
            )

        # Check if new name conflicts with another competition
        if request.name != base_event.event_name:
            if check_competition_name_exists(db, request.name, exclude_id=competition_id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Competition with name '{request.name}' already exists"
                )

        # Parse and validate times (skip future check for updates)
        start_dt = parse_datetime_from_request(request.date, request.startTime)
        end_dt = parse_datetime_from_request(request.date, request.endTime)
        validate_competition_times(start_dt, end_dt, skip_future_check=True)

        # Update BaseEvent
        base_event.event_name = request.name
        base_event.event_location = request.location
        base_event.question_cooldown = request.questionCooldownTime
        base_event.event_start_date = start_dt
        base_event.event_end_date = end_dt
        base_event.updated_at = datetime.now(timezone.utc)

        # Update Competition
        competition.riddle_cooldown = request.riddleCooldownTime

        # Delete existing question instances
        db.query(QuestionInstance).filter(
            QuestionInstance.event_id == competition_id
        ).delete()

        # Create new question instances
        for question_id, riddle_id in zip(request.selectedQuestions, request.selectedRiddles):
            question_instance = QuestionInstance(
                event_id=competition_id,
                question_id=question_id,
                riddle_id=riddle_id,
                points=0,
                is_riddle_completed=False
            )
            db.add(question_instance)

        # Update or delete email notifications
        db.query(CompetitionEmail).filter(
            CompetitionEmail.competition_id == competition_id
        ).delete()

        if request.emailEnabled and request.emailNotification:
            create_competition_emails(
                db,
                competition,
                request.emailNotification,
                start_dt,
                end_dt,
                request.name,
                request.date,
                request.startTime,
                request.endTime,
                request.location
            )

        _commit_or_rollback(db)

        logger.info(f"SUCCESSFUL UPDATE: Competition '{request.name}' (ID: {competition_id}) by '{user_email}'")

        return CompetitionResponse(
            event_id=base_event.event_id,
            event_name=base_event.event_name,
            event_location=base_event.event_location,
            event_start_date=base_event.event_start_date,
            event_end_date=base_event.event_end_date,
            question_cooldown=base_event.question_cooldown,
            riddle_cooldown=competition.riddle_cooldown,
            question_count=len(request.selectedQuestions),
            riddle_count=len(request.selectedRiddles),
            created_at=base_event.created_at
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error updating competition {competition_id}: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update competition"
        )


@competitions_router.delete("/{competition_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_competition(
        competition_id: int,
        db: Session = Depends(get_db),
        current_user: dict = Depends(get_current_user)
):
    """
    Delete a competition.
    Only accessible by users with 'owner' role.
    Cascade delete handles related records.
    """
    user_email = current_user.get("sub")
    logger.info(f"User '{user_email}' attempting to delete competition ID: {competition_id}")

    try:
        base_event = db.query(BaseEvent).filter(BaseEvent.event_id == competition_id).first()
        if not base_event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Competition not found"
            )

        competition_name = base_event.event_name
        # Delete in correct order to avoid foreign key issues
        # 1. Delete competition emails
        db.query(CompetitionEmail).filter(
            CompetitionEmail.competition_id == competition_id
        ).delete()

        # 2. Delete question instances
        db.query(QuestionInstance).filter(
            QuestionInstance.event_id == competition_id
        ).delete()

        # 3. Delete leaderboard instances for that competition   Participation, CompetitionLeaderboardEntry
        db.query(Participation).filter(
            Participation.event_id == competition_id
        ).delete()
        db.query(CompetitionLeaderboardEntry).filter(
            CompetitionLeaderboardEntry.competition_id == competition_id
        ).delete()

        # 4. Delete competition record
        db.query(Competition).filter(
            Competition.event_id == competition_id
        ).delete()

        # 5. Finally delete base event
        db.delete(base_event)
        _commit_or_rollback(db)

        logger.info(
            f"SUCCESSFUL DELETION: Competition '{competition_name}' (ID: {competition_id}) deleted by '{user_email}'")

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error deleting competition {competition_id}: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete competition"
        )
