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
from datetime import datetime
from typing import Optional, List, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import uuid, bcrypt, jwt
from sqlalchemy.exc import NoResultFound
from sqlalchemy.exc import IntegrityError

# Import your models here (adjust the import path as needed)
from src.models import (
    User,
    UserPreferences,
    Session as SessionModel,
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
from src.models import User, Session as UserSession

#---------------------------- Config Values (to be changed) ------------
JWT_SECRET_KEY = "YOUR_SECRET_KEY"   # should come from env var
JWT_ALGORITHM = "HS256"
SESSION_DURATION_HOURS = 2


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

def create_user(db: Session, username: str, email: str, password_hash: str, first_name: str, last_name: str, type: str = 'user'):
    # Prevent multiple owners
    if type == 'owner':
        existing_owner = db.query(User).filter(User.type == 'owner').first()
        if existing_owner:
            raise ValueError("An owner already exists. Only one owner is allowed.")

    new_user = User(
        username=username,
        email=email,
        first_name=first_name,
        last_name=last_name,
        salt=password_hash,
        type=type,
    )
    db.add(new_user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise
    db.refresh(new_user)
    return new_user

def login_user(db: Session, username_or_email: str, password_hash_candidate: str) -> Optional[User]:
    user = db.query(User).filter(
        (User.username == username_or_email) | (User.email == username_or_email)
    ).one_or_none()

    if not user:
        return None
    # Replace this check with proper password verification using stored salt
    if user.salt != password_hash_candidate:
        return None
    return user

def login_user(db: Session, username: str, password: str):

    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.salt):
        raise ValueError("Invalid username or password")

    db.query(UserSession).filter(
        UserSession.user_id == user.user_id,
        UserSession.is_active == True
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
        UserSession.is_active == True
    ).first()

    if not session:
        raise ValueError("Active session not found")

    session.is_active = False
    db.commit()

    return {"message": "Logged out successfully"}


# --------------------------- 2) Set user preference (while logged in) ---------------------------

# ASSUMED: USER LOGGED IN
# Edit_lang: will store last language used by user
def set_user_preferences(db: Session, user_id: int, theme: Optional[str]=None, notifications_enabled: Optional[bool]=None, edit_lang: Optional[str]=None) -> UserPreferences:
    pref = db.query(UserPreferences).get(user_id)
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

def create_competition(db: Session, user_id: int, name: str, location: str, date: Optional[datetime]=None, cooldown_time: Optional[int]=None, start_time: Optional[datetime]=None, end_time: Optional[datetime]=None) -> Competition:
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


# --------------------------- 5) Create a new competition question ---------------------------

def create_competition_question(db: Session, competition_id: int, question_id: int, base_score_value: Optional[int]=None) -> CompetitionQuestion:
    cq = CompetitionQuestion(
        competition_id=competition_id,
        question_id=question_id,
        base_score_value=base_score_value
    )
    db.add(cq)
    _commit_or_rollback(db)
    db.refresh(cq)
    return cq


# --------------------------- 6) Add question tags ---------------------------

def add_question_tag(db: Session, question_id: int, tag_value: str) -> QuestionTag:
    tag = QuestionTag(question_id=question_id, tag_value=tag_value)
    db.add(tag)
    _commit_or_rollback(db)
    db.refresh(tag)
    return tag


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


# --------------------------- 8) Create new algotime questions ---------------------------

def create_algotime_question(db: Session, question_id: int, base_score_value: Optional[int]=None) -> AlgoTimeQuestion:
    atq = AlgoTimeQuestion(question_id=question_id, base_score_value=base_score_value)
    db.add(atq)
    _commit_or_rollback(db)
    db.refresh(atq)
    return atq


# --------------------------- 9) Checking participation for a competition ---------------------------

def is_participating(db: Session, competition_id: int, user_id: int) -> bool:
    p = db.query(Participation).get((competition_id, user_id))
    return p is not None


# --------------------------- 10) Competition question stats & user stats ---------------------------

def get_competition_question_stats(db: Session, question_id: int, user_id: Optional[int]=None) -> List[CompetitionQuestionStats]:
    q = db.query(CompetitionQuestionStats).filter(CompetitionQuestionStats.question_id == question_id)
    if user_id is not None:
        q = q.filter(CompetitionQuestionStats.user_id == user_id)
    return q.all()


def add_or_update_competition_question_stats(db: Session, question_id: int, user_id: int, num_attempts: Optional[int]=None, completed: Optional[bool]=None, score_awarded: Optional[int]=None, datetime_completed: Optional[datetime]=None) -> CompetitionQuestionStats:
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


def get_user_algotime_stats(db: Session, question_id: int, user_id: Optional[int]=None) -> List[UserAlgoTimeStats]:
    q = db.query(UserAlgoTimeStats).filter(UserAlgoTimeStats.question_id == question_id)
    if user_id is not None:
        q = q.filter(UserAlgoTimeStats.user_id == user_id)
    return q.all()


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


# --------------------------- 11) CRUD user results and answers ---------------------------

def upsert_user_result(db: Session, user_id: int, competition_id: int, total_score: Optional[int]=None, rank: Optional[int]=None) -> UserResult:
    ur = db.query(UserResult).get((user_id, competition_id))
    if not ur:
        ur = UserResult(user_id=user_id, competition_id=competition_id)
        db.add(ur)
    if total_score is not None:
        ur.total_score = total_score
    if rank is not None:
        ur.rank = rank
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
