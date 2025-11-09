"""
CRUD helpers for the provided SQLAlchemy models.
Assumptions:
- The models from the user's schema (User, Session, UserPreferences, Competition, BaseQuestion, etc.) are imported.
- A SQLAlchemy Session object (session: Session) is passed into each function.
- Password hashing / verification is left as a placeholder (you should wire your hashing/salt logic).

Usage:
from src.models import User, Session as SessionModel, ...
from src.crud_operations import create_user, login_user, create_competition, ...

All functions commit on success and rollback on exception.
"""
from dotenv import load_dotenv
from datetime import datetime
from typing import Optional, List
from datetime import timedelta
from sqlalchemy.orm import Session
import uuid
import bcrypt
import jwt
from sqlalchemy.exc import NoResultFound
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Import your models here (adjust the import path as needed)
from src.models.schema import (
    User,
    UserPreferences,
    Competition,
    BaseQuestion,
    CompetitionQuestion,
    QuestionTag,
    QuestionSet,
    AlgoTimeQuestion,
    Participation,
    CompetitionQuestionStats,
    UserAlgoTimeStats,
    UserResult,
    UserAnswer,
    Scoreboard,
    UserCooldown
)
from src.models import SessionModel as UserSession

#---------------------------- Config Values (to be changed) ------------
JWT_SECRET_KEY = "YOUR_SECRET_KEY"   # should come from env var
JWT_ALGORITHM = "HS256"
SESSION_DURATION_HOURS = 2


load_dotenv()

# ---------------- DATABASE CONNECTION SETUP ----------------
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://postgres:postgres@localhost:5432/ThinklyDB"
)

engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """
    Dependency-style generator for getting a new database session.
    Usage example:
        with next(get_db()) as db:
            ...
    Or inside FastAPI:
        Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --------------------------- Utility helpers ---------------------------

def _commit_or_rollback(db: Session):
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a bcrypt hash."""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def generate_jwt(user_id: int):
    """Generate a JWT access token."""
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(hours=SESSION_DURATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)



# --------------------------- 1) Authentication / account ---------------------------




def login_user(db: Session, username: str, password: str):

    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.salt):
        raise ValueError("Invalid username or password")

    db.query(UserSession).filter(
        UserSession.user_id == user.user_id,
        UserSession.is_active
    ).update({"is_active": False})
    db.commit()

    jwt_token = generate_jwt(user.user_id)
    expires_at = datetime.utcnow() + timedelta(hours=SESSION_DURATION_HOURS)

    new_session = UserSession(
        session_id=str(uuid.uuid4()),
        user_id=user.user_id,
        jwt_token=jwt_token,
        expires_at=expires_at,
        is_active=True
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    return {
        "user_id": user.user_id,
        "username": user.username,
        "access_token": jwt_token,
        "expires_at": expires_at
    }

def logout_user(db: Session, user_id: int, token: str):

    session = db.query(UserSession).filter(
        UserSession.user_id == user_id,
        UserSession.jwt_token == token,
        UserSession.is_active
    ).first()

    if not session:
        raise ValueError("Active session not found")

    session.is_active = False
    db.commit()

    return {"message": "Logged out successfully"}

def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """Retrieve a user by ID."""
    return db.query(User).filter(User.user_id == user_id).first()

def get_user_by_username(db: Session, username: str) -> Optional[User]:
    """Retrieve a user by username."""
    return db.query(User).filter(User.username == username).first()



def update_user(db: Session, user_id: int, username: Optional[str] = None, email: Optional[str] = None, first_name: Optional[str] = None, last_name: Optional[str] = None, password_hash: Optional[str] = None, type: Optional[str] = None) -> User:
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise ValueError("User not found")

    # Prevent creating multiple owners
    if type == 'owner' and user.type != 'owner':
        existing_owner = db.query(User).filter(User.type == 'owner').first()
        if existing_owner:
            raise ValueError("An owner already exists. Only one owner is allowed.")

    if username is not None:
        user.username = username
    if email is not None:
        user.email = email
    if first_name is not None:
        user.first_name = first_name
    if last_name is not None:
        user.last_name = last_name
    if password_hash is not None:
        user.salt = password_hash
    if type is not None:
        user.type = type

    _commit_or_rollback(db)
    db.refresh(user)
    return user

def delete_user_full(db: Session, user_id: int) -> bool:
    """
    Delete a user and all related data (sessions, cooldowns, results, preferences, etc.)
    while keeping historical scoreboard entries and nullifying ownerships.
    """

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise ValueError("User not found")

    # Set user_id = NULL for competitions and questions they created
    db.query(Competition).filter(Competition.user_id == user_id).update({"user_id": None})
    db.query(BaseQuestion).filter(BaseQuestion.user_id == user_id).update({"user_id": None})

    # Delete user preferences explicitly (not handled via relationship)
    db.query(UserPreferences).filter(UserPreferences.user_id == user_id).delete()

    # Delete the user (cascades handle: sessions, results, cooldowns, stats, answers, participations)
    db.delete(user)
    _commit_or_rollback(db)
    return True

# --------------------------- 2) Set user preference (while logged in) ---------------------------

# ASSUMED: USER LOGGED IN
# Edit_lang: will store last language used by user
def set_user_preferences(db: Session, user_id: int, theme: Optional[str]=None, notifications_enabled: Optional[bool]=None, edit_lang: Optional[str]=None) -> UserPreferences:
    pref = db.get(UserPreferences, user_id)
    if not pref:
        pref = UserPreferences(user_id=user_id)
        db.add(pref)
    if theme is not None:
        pref.theme = theme
    if notifications_enabled is not None:
        pref.notifications_enabled = notifications_enabled
    if edit_lang is not None:
        pref.edit_used_programming_language = edit_lang
    _commit_or_rollback(db)
    db.refresh(pref)
    return pref


# --------------------------- 4) User creating a new competition ---------------------------

def create_competition(db: Session, user_id: int, name: str, location: str, date: [datetime]=None, cooldown_time: Optional[int]=None, start_time: Optional[datetime]=None, end_time: Optional[datetime]=None) -> Competition:
    comp = Competition(
        name=name,
        user_id=user_id,
        location=location,
        date=date or datetime.utcnow(),
        cooldown_time=cooldown_time,
        start_time=start_time,
        end_time=end_time,
        created_at=datetime.utcnow()
    )
    db.add(comp)
    _commit_or_rollback(db)
    db.refresh(comp)
    return comp

def create_full_competition( db: Session, owner_user_id: int, name: str, location: str, date: Optional[datetime] = None, cooldown_time: Optional[int] = None, start_time: Optional[datetime] = None, end_time: Optional[datetime] = None, questions: Optional[List[int]] = None) -> Competition:
    """
    Create a competition with optional initial participants and existing questions.
    """

    comp = Competition(
        name=name,
        user_id=owner_user_id,
        location=location,
        date=date or datetime.utcnow(),
        cooldown_time=cooldown_time,
        start_time=start_time,
        end_time=end_time,
        created_at=datetime.utcnow()
    )
    db.add(comp)
    db.flush()

    # Add existing base questions as competition questions
    if questions:
        for qid in questions:
            db.add(CompetitionQuestion(competition_id=comp.competition_id, question_id=qid))

    _commit_or_rollback(db)
    db.refresh(comp)
    return comp


def update_competition( db: Session, competition_id: int, name: Optional[str] = None, location: Optional[str] = None, date: Optional[datetime] = None, cooldown_time: Optional[int] = None, start_time: Optional[datetime] = None, end_time: Optional[datetime] = None) -> Competition:
    comp = db.query(Competition).filter(Competition.competition_id == competition_id).first()
    if not comp:
        raise ValueError("Competition not found")

    if location is not None:
        comp.location = location
    if date is not None:
        comp.date = date
    if cooldown_time is not None:
        comp.cooldown_time = cooldown_time
    if start_time is not None:
        comp.start_time = start_time
    if end_time is not None:
        comp.end_time = end_time

    _commit_or_rollback(db)
    db.refresh(comp)
    return comp

def delete_competition_full(db: Session, competition_id: int) -> bool:
    """
    Delete a competition and all related participation, cooldowns, questions, etc.
    Scoreboards are deleted automatically (cascade), and related questions are removed.
    """

    comp = db.query(Competition).filter(Competition.competition_id == competition_id).first()
    if not comp:
        raise ValueError("Competition not found")

    # ORM cascade will delete CompetitionQuestion, Participation, UserResult, UserCooldown, Scoreboard
    db.delete(comp)
    _commit_or_rollback(db)
    return True



def get_competition_by_id(db: Session, competition_id: int) -> Optional[Competition]:
    return db.query(Competition).filter(Competition.competition_id == competition_id).first()


def get_all_competitions(db: Session) -> List[Competition]:
    return db.query(Competition).all()

# --------------------------- 5) Create a new competition question ---------------------------

def create_full_competition_question( db: Session, competition_id: int, title: str, description: str, difficulty: str, solution: str, media: Optional[str] = None, base_score_value: Optional[int] = None, creator_user_id: Optional[int] = None,) -> CompetitionQuestion:
    """
    Create a full competition question with its base question entry.
    Optionally initialize question stats for all competition participants.
    """

    # 1️⃣ Create Base Question
    base_q = BaseQuestion( title=title, description=description, difficulty=difficulty, solution=solution, media=media, user_id=creator_user_id)
    db.add(base_q)
    db.flush()  # ensures base_q.question_id is available

    # 2️⃣ Create CompetitionQuestion
    cq = CompetitionQuestion( competition_id=competition_id, question_id=base_q.question_id, base_score_value=base_score_value)
    db.add(cq)

    _commit_or_rollback(db)
    db.refresh(cq)
    return cq

def create_competition_question(db: Session, competition_id: int, question_id: int, base_score_value: Optional[int]=None) -> CompetitionQuestion:
    cq = CompetitionQuestion( competition_id=competition_id, question_id=question_id, base_score_value=base_score_value)
    db.add(cq)
    _commit_or_rollback(db)
    db.refresh(cq)
    return cq

def update_competition_question(db: Session, competition_id: int, question_id: int, base_score_value: Optional[int] = None) -> CompetitionQuestion:
    cq = db.query(CompetitionQuestion).filter(
        CompetitionQuestion.competition_id == competition_id,
        CompetitionQuestion.question_id == question_id
    ).first()

    if not cq:
        raise ValueError("Competition question not found")

    if base_score_value is not None:
        cq.base_score_value = base_score_value

    _commit_or_rollback(db)
    db.refresh(cq)
    return cq

def delete_competition_question( db: Session, competition_id: int, question_id: int) -> bool:
    """Delete a competition-question mapping."""
    cq = db.query(CompetitionQuestion).filter(
        CompetitionQuestion.competition_id == competition_id,
        CompetitionQuestion.question_id == question_id
    ).first()

    if not cq:
        raise ValueError("Competition question not found")

    db.delete(cq)
    _commit_or_rollback(db)
    return True

def delete_all_questions_for_competition(db: Session, competition_id: int) -> int:
    """Delete all questions linked to a competition."""
    deleted_count = db.query(CompetitionQuestion).filter(
        CompetitionQuestion.competition_id == competition_id
    ).delete()
    _commit_or_rollback(db)
    return deleted_count


def get_competition_question(db: Session, competition_id: int, question_id: int) -> Optional[CompetitionQuestion]:
    """Retrieve a single competition question mapping."""
    return db.query(CompetitionQuestion).filter(
        CompetitionQuestion.competition_id == competition_id,
        CompetitionQuestion.question_id == question_id
    ).first()

def get_questions_by_competition(db: Session, competition_id: int) -> List[CompetitionQuestion]:
    """Retrieve all questions linked to a specific competition."""
    return db.query(CompetitionQuestion).filter(
        CompetitionQuestion.competition_id == competition_id
    ).all()

def get_competitions_by_question( db: Session, question_id: int) -> List[CompetitionQuestion]:
    """Retrieve all competitions that use a specific question."""
    return db.query(CompetitionQuestion).filter(
        CompetitionQuestion.question_id == question_id
    ).all()
# --------------------------- 6) Add question tags ---------------------------

def add_question_tag(db: Session, question_id: int, tag_value: str) -> QuestionTag:
    tag = QuestionTag(question_id=question_id, tag_value=tag_value)
    db.add(tag)
    _commit_or_rollback(db)
    db.refresh(tag)
    return tag

def update_question_tag(
    db: Session, question_id: int, old_tag_value: str, new_tag_value: str
) -> QuestionTag:
    """Update a tag's value for a question."""
    tag = db.query(QuestionTag).filter(
        QuestionTag.question_id == question_id,
        QuestionTag.tag_value == old_tag_value
    ).first()

    if not tag:
        raise ValueError("Tag not found for this question")

    tag.tag_value = new_tag_value
    _commit_or_rollback(db)
    db.refresh(tag)
    return tag

def delete_question_tag(db: Session, question_id: int, tag_value: str) -> bool:
    """Delete a specific tag from a question."""
    tag = db.query(QuestionTag).filter(
        QuestionTag.question_id == question_id,
        QuestionTag.tag_value == tag_value
    ).first()

    if not tag:
        raise ValueError("Tag not found")

    db.delete(tag)
    _commit_or_rollback(db)
    return True

def delete_all_tags_for_question(db: Session, question_id: int) -> int:
    """Remove all tags for a specific question."""
    deleted_count = db.query(QuestionTag).filter(
        QuestionTag.question_id == question_id
    ).delete()
    _commit_or_rollback(db)
    return deleted_count

def get_tags_by_question(db: Session, question_id: int) -> List[QuestionTag]:
    """Retrieve all tags linked to a question."""
    return db.query(QuestionTag).filter(
        QuestionTag.question_id == question_id
    ).all()

def get_questions_by_tag(db: Session, tag_value: str) -> List[QuestionTag]:
    """Retrieve all questions that use a specific tag."""
    return db.query(QuestionTag).filter(
        QuestionTag.tag_value == tag_value
    ).all()

# --------------------------- 7) Add question to a set (and create a set) ---------------------------

def create_question_set(db: Session, set_name: str, week: Optional[int]=None) -> QuestionSet:
    qs = QuestionSet(set_name=set_name, week=week, created_at=datetime.utcnow())
    db.add(qs)
    _commit_or_rollback(db)
    db.refresh(qs)
    return qs


def add_question_to_set(db: Session, question_id: int, set_id: Optional[int]=None, set_name: Optional[str]=None, week: Optional[int]=None) -> QuestionSet:
    """If set_id provided, add question to that set. Otherwise, create a new set with set_name.
    Returns the QuestionSet object the question now belongs to.
    """
    if set_id is None:
        if not set_name:
            raise ValueError("Either set_id or set_name must be provided")
        qs = create_question_set(db, set_name=set_name, week=week)
    else:
        qs = db.query(QuestionSet).get(set_id)
        if not qs:
            raise NoResultFound(f"QuestionSet {set_id} not found")

    # use association relationship on QuestionSet / AlgoTimeQuestion
    # fetch AlgoTimeQuestion for the question (or create) to use association table if necessary
    atq = db.query(AlgoTimeQuestion).get(question_id)
    if not atq:
        # create a placeholder AlgoTimeQuestion row that references BaseQuestion
        atq = AlgoTimeQuestion(question_id=question_id)
        db.add(atq)
        _commit_or_rollback(db)
        db.refresh(atq)

    if atq not in qs.algo_questions:
        qs.algo_questions.append(atq)
        _commit_or_rollback(db)
        db.refresh(qs)
    return qs

def update_question_set(
    db: Session, set_id: int, set_name: Optional[str] = None, week: Optional[int] = None
) -> QuestionSet:
    """Update a question set's details."""
    qs = db.query(QuestionSet).filter(QuestionSet.set_id == set_id).first()

    if not qs:
        raise ValueError("Question set not found")

    if set_name is not None:
        qs.set_name = set_name
    if week is not None:
        qs.week = week

    _commit_or_rollback(db)
    db.refresh(qs)
    return qs

def delete_question_set(db: Session, set_id: int) -> bool:
    """Delete a specific question set."""
    qs = db.query(QuestionSet).filter(QuestionSet.set_id == set_id).first()

    if not qs:
        raise ValueError("Question set not found")

    db.delete(qs)
    _commit_or_rollback(db)
    return True

def get_question_set(db: Session, set_id: int) -> Optional[QuestionSet]:
    """Retrieve a specific question set by ID."""
    return db.query(QuestionSet).filter(QuestionSet.set_id == set_id).first()

def get_all_question_sets(db: Session) -> List[QuestionSet]:
    """Retrieve all question sets."""
    return db.query(QuestionSet).all()

def get_question_sets_by_week(db: Session, week: int) -> List[QuestionSet]:
    """Retrieve question sets filtered by week."""
    return db.query(QuestionSet).filter(QuestionSet.week == week).all()

def get_sets_by_question(db: Session, question_id: int) -> List[QuestionSet]:
    """Get all sets that contain a specific question."""
    return (
        db.query(QuestionSet)
        .join(QuestionSet.algo_questions)
        .filter_by(question_id=question_id)
        .all()
    )

# --------------------------- 8) Create new algotime questions ---------------------------

def create_full_algotime_question( db: Session, title: str, description: str, difficulty: str, solution: str, media: Optional[str] = None, base_score_value: Optional[int] = None, creator_user_id: Optional[int] = None, set_id: Optional[int] = None) -> AlgoTimeQuestion:
    """
    Create a full AlgoTime question with its BaseQuestion, optionally linking to a question set
    and initializing user stats.
    """

    # 1️⃣ Create Base Question
    base_q = BaseQuestion(title=title, description=description, difficulty=difficulty, solution=solution, media=media, user_id=creator_user_id
    )
    db.add(base_q)
    db.flush()

    # 2️⃣ Create AlgoTimeQuestion
    atq = AlgoTimeQuestion( question_id=base_q.question_id, base_score_value=base_score_value
    )
    db.add(atq)

    # 3️⃣ Optionally link to QuestionSet
    if set_id:
        qs = db.query(QuestionSet).filter(QuestionSet.set_id == set_id).first()
        if not qs:
            raise ValueError("QuestionSet not found")
        qs.algo_questions.append(atq)

    _commit_or_rollback(db)
    db.refresh(atq)
    return atq

def duplicate_competition_question(
    db: Session,
    source_competition_id: int,
    target_competition_id: int,
    question_id: int
) -> CompetitionQuestion:
    """
    Duplicate an existing competition question into another competition.
    Copies the base question and creates a new competition question.
    """

    source_cq = db.query(CompetitionQuestion).filter_by(
        competition_id=source_competition_id,
        question_id=question_id
    ).first()

    if not source_cq:
        raise ValueError("Source competition question not found")

    base_q = db.query(BaseQuestion).filter_by(question_id=question_id).first()
    if not base_q:
        raise ValueError("Base question not found")

    # Duplicate the question
    new_q = BaseQuestion(
        title=base_q.title,
        description=base_q.description,
        difficulty=base_q.difficulty,
        solution=base_q.solution,
        media=base_q.media,
        user_id=base_q.user_id
    )
    db.add(new_q)
    db.flush()

    # Link new base question to target competition
    new_cq = CompetitionQuestion(
        competition_id=target_competition_id,
        question_id=new_q.question_id,
        base_score_value=source_cq.base_score_value
    )
    db.add(new_cq)

    _commit_or_rollback(db)
    db.refresh(new_cq)
    return new_cq

def delete_base_question_full(db: Session, question_id: int) -> bool:
    """
    Delete a base question and all associated competition/algotime records, answers, and stats.
    Cascades will automatically remove related rows.
    """

    q = db.query(BaseQuestion).filter(BaseQuestion.question_id == question_id).first()
    if not q:
        raise ValueError("Base question not found")

    db.delete(q)
    _commit_or_rollback(db)
    return True

def delete_competition_or_algotime_question_full(db: Session, question_id: int) -> bool:
    """
    Delete a competition or AlgoTime question.
    Since both reference BaseQuestion with ondelete='CASCADE', this will
    also delete the underlying BaseQuestion automatically.
    """

    # Try deleting either one — CASCADE ensures BaseQuestion goes too
    cq = db.query(CompetitionQuestion).filter(CompetitionQuestion.question_id == question_id).first()
    atq = db.query(AlgoTimeQuestion).filter(AlgoTimeQuestion.question_id == question_id).first()

    if not cq and not atq:
        raise ValueError("No competition or AlgoTime question found for this ID")

    if cq:
        db.delete(cq)
    if atq:
        db.delete(atq)

    _commit_or_rollback(db)
    return True


def create_algotime_question(db: Session, question_id: int, base_score_value: Optional[int]=None) -> AlgoTimeQuestion:
    atq = AlgoTimeQuestion(question_id=question_id, base_score_value=base_score_value)
    db.add(atq)
    _commit_or_rollback(db)
    db.refresh(atq)
    return atq

def update_algotime_question(
    db: Session, question_id: int, base_score_value: Optional[int] = None
) -> AlgoTimeQuestion:
    """Update the base score for an AlgoTime question."""
    atq = db.query(AlgoTimeQuestion).filter(
        AlgoTimeQuestion.question_id == question_id
    ).first()

    if not atq:
        raise ValueError("AlgoTime question not found")

    if base_score_value is not None:
        atq.base_score_value = base_score_value

    _commit_or_rollback(db)
    db.refresh(atq)
    return atq

def delete_algotime_question(db: Session, question_id: int) -> bool:
    """Delete an AlgoTime question."""
    atq = db.query(AlgoTimeQuestion).filter(
        AlgoTimeQuestion.question_id == question_id
    ).first()

    if not atq:
        raise ValueError("AlgoTime question not found")

    db.delete(atq)
    _commit_or_rollback(db)
    return True

def get_algotime_question(db: Session, question_id: int) -> Optional[AlgoTimeQuestion]:
    """Retrieve a single AlgoTime question by ID."""
    return db.query(AlgoTimeQuestion).filter(
        AlgoTimeQuestion.question_id == question_id
    ).first()

def get_all_algotime_questions(db: Session) -> List[AlgoTimeQuestion]:
    """Retrieve all AlgoTime questions."""
    return db.query(AlgoTimeQuestion).all()

def get_algotime_questions_by_set(db: Session, set_id: int) -> List[AlgoTimeQuestion]:
    """Retrieve all AlgoTime questions in a given question set."""
    return (
        db.query(AlgoTimeQuestion)
        .join(AlgoTimeQuestion.question_sets)
        .filter_by(set_id=set_id)
        .all()
    )

# --------------------------- 9) Checking participation for a competition ---------------------------

def add_participation(db: Session, competition_id: int, user_id: int) -> Participation:
    """Register a user as a participant in a competition."""
    existing = db.query(Participation).filter_by(
        competition_id=competition_id,
        user_id=user_id
    ).first()

    if existing:
        raise ValueError("User is already participating in this competition")

    p = Participation(competition_id=competition_id, user_id=user_id)
    db.add(p)
    _commit_or_rollback(db)
    db.refresh(p)
    return p

def update_participation(
    db: Session, competition_id: int, user_id: int, **kwargs
) -> Participation:
    """Update participation record (if extended with more fields)."""
    p = db.query(Participation).filter_by(
        competition_id=competition_id,
        user_id=user_id
    ).first()

    if not p:
        raise ValueError("Participation not found")

    for key, value in kwargs.items():
        if hasattr(p, key):
            setattr(p, key, value)

    _commit_or_rollback(db)
    db.refresh(p)
    return p

def remove_participation(db: Session, competition_id: int, user_id: int) -> bool:
    """Remove a user's participation from a competition."""
    p = db.query(Participation).filter_by(
        competition_id=competition_id,
        user_id=user_id
    ).first()

    if not p:
        raise ValueError("Participation not found")

    db.delete(p)
    _commit_or_rollback(db)
    return True

def is_participating(db: Session, competition_id: int, user_id: int) -> bool:
    """Check if a user is participating in a competition."""
    return db.query(Participation).filter_by(
        competition_id=competition_id,
        user_id=user_id
    ).first() is not None

def get_participants_by_competition(db: Session, competition_id: int) -> List[Participation]:
    """Retrieve all participants in a given competition."""
    return db.query(Participation).filter(
        Participation.competition_id == competition_id
    ).all()

def get_competitions_by_user(db: Session, user_id: int) -> List[Participation]:
    """Retrieve all competitions a user is participating in."""
    return db.query(Participation).filter(
        Participation.user_id == user_id
    ).all()



# --------------------------- 10) Competition question stats & user stats ---------------------------

def get_competition_question_stats(db: Session, question_id: int, user_id: Optional[int]=None) -> List[CompetitionQuestionStats]:
    q = db.query(CompetitionQuestionStats).filter(CompetitionQuestionStats.question_id == question_id)
    if user_id is not None:
        q = q.filter(CompetitionQuestionStats.user_id == user_id)
    return q.all()


def add_or_update_competition_question_stats( db: Session, question_id: int, user_id: int, num_attempts: Optional[int] = None, completed: Optional[bool] = None, score_awarded: Optional[int] = None, datetime_completed: Optional[datetime] = None) -> CompetitionQuestionStats:
    stats = db.query(CompetitionQuestionStats).get((question_id, user_id))
    if not stats:
        stats = CompetitionQuestionStats(question_id=question_id, user_id=user_id)
        db.add(stats)

    if num_attempts is not None:
        stats.num_attempts = num_attempts
    if completed is not None:
        stats.completed = completed
    if score_awarded is not None:
        stats.score_awarded = score_awarded
    if datetime_completed is not None:
        stats.datetime_completed = datetime_completed

    _commit_or_rollback(db)
    db.refresh(stats)
    return stats

def delete_competition_question_stats(db: Session, question_id: int, user_id: int) -> bool:
    """Delete a specific user's competition question stats."""
    stats = db.query(CompetitionQuestionStats).get((question_id, user_id))
    if not stats:
        raise ValueError("Competition question stats not found")

    db.delete(stats)
    _commit_or_rollback(db)
    return True

def delete_all_competition_stats_for_question(db: Session, question_id: int) -> int:
    """Delete all stats for a question across all users."""
    count = db.query(CompetitionQuestionStats).filter(
        CompetitionQuestionStats.question_id == question_id
    ).delete()
    _commit_or_rollback(db)
    return count

def get_user_algotime_stats(db: Session, question_id: int, user_id: Optional[int]=None) -> List[UserAlgoTimeStats]:
    q = db.query(UserAlgoTimeStats).filter(UserAlgoTimeStats.question_id == question_id)
    if user_id is not None:
        q = q.filter(UserAlgoTimeStats.user_id == user_id)
    return q.all()

def get_all_competition_stats_for_user(db: Session, user_id: int) -> List[CompetitionQuestionStats]:
    """Retrieve all competition stats for a user."""
    return db.query(CompetitionQuestionStats).filter(
        CompetitionQuestionStats.user_id == user_id
    ).all()

def add_or_update_user_algotime_stats(db: Session, question_id: int, user_id: int, num_attempts: Optional[int]=None, best_time: Optional[int]=None, completed: Optional[bool]=None, score_awarded: Optional[int]=None, datetime_completed: Optional[datetime]=None) -> UserAlgoTimeStats:
    stats = db.query(UserAlgoTimeStats).get((question_id, user_id))
    if not stats:
        stats = UserAlgoTimeStats(question_id=question_id, user_id=user_id)
        db.add(stats)
    if num_attempts is not None:
        stats.num_attempts = num_attempts
    if best_time is not None:
        stats.best_time = best_time
    if completed is not None:
        stats.completed = completed
    if score_awarded is not None:
        stats.score_awarded = score_awarded
    if datetime_completed is not None:
        stats.datetime_completed = datetime_completed
    _commit_or_rollback(db)
    db.refresh(stats)
    return stats

def delete_user_algotime_stats(db: Session, question_id: int, user_id: int) -> bool:
    """Delete a specific user's AlgoTime stats for a question."""
    stats = db.query(UserAlgoTimeStats).get((question_id, user_id))
    if not stats:
        raise ValueError("User AlgoTime stats not found")

    db.delete(stats)
    _commit_or_rollback(db)
    return True

def delete_all_algotime_stats_for_question(db: Session, question_id: int) -> int:
    """Delete all AlgoTime stats for a question."""
    count = db.query(UserAlgoTimeStats).filter(
        UserAlgoTimeStats.question_id == question_id
    ).delete()
    _commit_or_rollback(db)
    return count

def get_all_algotime_stats_for_user(db: Session, user_id: int) -> List[UserAlgoTimeStats]:
    """Retrieve all AlgoTime stats for a specific user."""
    return db.query(UserAlgoTimeStats).filter(
        UserAlgoTimeStats.user_id == user_id
    ).all()

# --------------------------- 11) CRUD user results and answers ---------------------------

def upsert_user_result(
    db: Session,
    user_id: int,
    competition_id: int,
    total_score: Optional[int] = None,
    rank: Optional[int] = None,
    problems_solved: Optional[int] = None,
    total_time: Optional[float] = None
) -> UserResult:
    ur = db.query(UserResult).get((user_id, competition_id))
    if not ur:
        ur = UserResult(user_id=user_id, competition_id=competition_id)
        db.add(ur)
    if total_score is not None:
        ur.total_score = total_score
    if rank is not None:
        ur.rank = rank
    if problems_solved is not None:
        ur.problems_solved = problems_solved
    if total_time is not None:
        ur.total_time = total_time

    _commit_or_rollback(db)
    db.refresh(ur)
    return ur


def get_user_result(db: Session, user_id: int, competition_id: int) -> Optional[UserResult]:
    return db.query(UserResult).get((user_id, competition_id))


def delete_user_result(db: Session, user_id: int, competition_id: int) -> bool:
    ur = db.query(UserResult).get((user_id, competition_id))
    if not ur:
        return False
    db.delete(ur)
    _commit_or_rollback(db)
    return True


# UserAnswer CRUD

def upsert_user_answer(db: Session, user_id: int, question_id: int, answer_text: str) -> UserAnswer:
    ua = db.query(UserAnswer).get((user_id, question_id))
    if not ua:
        ua = UserAnswer(user_id=user_id, question_id=question_id)
        db.add(ua)
    ua.answer_text = answer_text
    ua.submission_datetime = datetime.utcnow()
    _commit_or_rollback(db)
    db.refresh(ua)
    return ua


def get_user_answer(db: Session, user_id: int, question_id: int) -> Optional[UserAnswer]:
    return db.query(UserAnswer).get((user_id, question_id))


def delete_user_answer(db: Session, user_id: int, question_id: int) -> bool:
    ua = db.query(UserAnswer).get((user_id, question_id))
    if not ua:
        return False
    db.delete(ua)
    _commit_or_rollback(db)
    return True


# --------------------------- 12) CRUD scoreboard for all and by competition ---------------------------

def get_scoreboard_for_competition(db: Session, competition_id: int) -> List[Scoreboard]:
    return db.query(Scoreboard).filter(Scoreboard.competition_id == competition_id).order_by(Scoreboard.rank.asc()).all()


def get_all_scoreboards(db: Session) -> List[Scoreboard]:
    return db.query(Scoreboard).order_by(Scoreboard.competition_id, Scoreboard.rank.asc()).all()


def upsert_scoreboard(db: Session, user_id: int, competition_id: int, total_score: Optional[int]=None, rank: Optional[int]=None) -> Scoreboard:
    sb = db.query(Scoreboard).get((user_id, competition_id))
    if not sb:
        sb = Scoreboard(user_id=user_id, competition_id=competition_id)
        db.add(sb)
    if total_score is not None:
        sb.total_score = total_score
    if rank is not None:
        sb.rank = rank
    sb.updated_at = datetime.utcnow()
    _commit_or_rollback(db)
    db.refresh(sb)
    return sb


def delete_scoreboard_entry(db: Session, user_id: int, competition_id: int) -> bool:
    sb = db.query(Scoreboard).get((user_id, competition_id))
    if not sb:
        return False
    db.delete(sb)
    _commit_or_rollback(db)
    return True


# --------------------------- 12 (duplicate in user) retrieve user cooldown ---------------------------

def get_user_cooldown(db: Session, user_id: int, competition_id: Optional[int]=None) -> List[UserCooldown]:
    q = db.query(UserCooldown).filter(UserCooldown.user_id == user_id)
    if competition_id is not None:
        q = q.filter(UserCooldown.competition_id == competition_id)
    return q.all()


def upsert_user_cooldown(db: Session, cooldown_id: Optional[int], user_id: int, competition_id: int, last_submission_time: Optional[datetime]=None, cooldown_ends_at: Optional[datetime]=None) -> UserCooldown:
    if cooldown_id is not None:
        uc = db.query(UserCooldown).get(cooldown_id)
    else:
        # try to find by user + competition
        uc = db.query(UserCooldown).filter(UserCooldown.user_id == user_id, UserCooldown.competition_id == competition_id).one_or_none()
    if not uc:
        uc = UserCooldown(user_id=user_id, competition_id=competition_id)
        db.add(uc)
    if last_submission_time is not None:
        uc.last_submission_time = last_submission_time
    if cooldown_ends_at is not None:
        uc.cooldown_ends_at = cooldown_ends_at
    _commit_or_rollback(db)
    db.refresh(uc)
    return uc


# --------------------------- Additional helpers ---------------------------

def list_competitions(db: Session, owner_user_id: Optional[int]=None) -> List[Competition]:
    q = db.query(Competition)
    if owner_user_id is not None:
        q = q.filter(Competition.user_id == owner_user_id)
    return q.all()


def list_user_questions(db: Session, user_id: int) -> List[BaseQuestion]:
    return db.query(BaseQuestion).filter(BaseQuestion.user_id == user_id).all()
