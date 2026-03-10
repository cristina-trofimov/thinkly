from __future__ import annotations
from sqlalchemy import CheckConstraint, Column, DateTime, Enum, ForeignKey, Integer, Table, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship, Mapped, mapped_column
from database_operations.db import Base
from typing import List, Optional, Any
from datetime import datetime, timezone

# Foreign key reference constants
FK_USER_ACCOUNT_USER_ID = 'user_account.user_id'
FK_BASE_EVENT_EVENT_ID = 'base_event.event_id'
FK_QUESTION_QUESTION_ID = 'question.question_id'
FK_LANGUAGE_LANG_JUDGE_ID = 'language.lang_judge_id'
ON_DELETE_SET_NULL = 'SET NULL'


class UserAccount(Base):
    __tablename__ = 'user_account'

    user_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(unique=True)
    hashed_password: Mapped[str] = mapped_column()
    first_name: Mapped[str] = mapped_column()
    last_name: Mapped[str] = mapped_column()
    user_type: Mapped[str] = mapped_column(Enum('owner', 'admin', 'participant', name='user_type'),
                                           default='participant')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.now(timezone.utc))

    user_preferences: Mapped[UserPreferences] = relationship('UserPreferences', back_populates='user_account',
                                                             uselist=False)
    sessions: Mapped[List[UserSession]] = relationship('UserSession', back_populates='user_account', uselist=True)
    competition_leaderboard_entries: Mapped[List[CompetitionLeaderboardEntry]] = relationship(
        'CompetitionLeaderboardEntry', back_populates='user_account', uselist=True)
    algotime_leaderboard_entries: Mapped[List[AlgoTimeLeaderboardEntry]] = relationship('AlgoTimeLeaderboardEntry',
                                                                                        back_populates='user_account',
                                                                                        uselist=True)
    submissions: Mapped[List[Submission]] = relationship('Submission', back_populates='user_account', uselist=True)
    most_recent_submission: Mapped[List[MostRecentSubmission]] = relationship('MostRecentSubmission',
                                                                              back_populates='user_account',
                                                                              uselist=True)


class UserPreferences(Base):
    __tablename__ = 'user_preferences'

    pref_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey(FK_USER_ACCOUNT_USER_ID, ondelete='CASCADE'), unique=True)
    theme: Mapped[str] = mapped_column(Enum('light', 'dark', name='theme_type'), default='light')
    notifications_enabled: Mapped[bool] = mapped_column(default=True)
    last_used_programming_language: Mapped[Optional[int]] = mapped_column(
        ForeignKey(FK_LANGUAGE_LANG_JUDGE_ID, ondelete='CASCADE'))

    user_account: Mapped[UserAccount] = relationship('UserAccount', back_populates='user_preferences', uselist=False)


class UserSession(Base):
    __tablename__ = 'user_session'

    session_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey(FK_USER_ACCOUNT_USER_ID))
    jwt_token: Mapped[str] = mapped_column(unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.now(timezone.utc))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    is_active: Mapped[bool] = mapped_column(default=True)

    user_account: Mapped[UserAccount] = relationship('UserAccount', back_populates='sessions', uselist=False)


class BaseEvent(Base):
    __tablename__ = 'base_event'

    event_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    event_name: Mapped[str] = mapped_column(unique=True)
    event_location: Mapped[Optional[str]] = mapped_column()
    question_cooldown: Mapped[int] = mapped_column(default=300)
    event_start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    event_end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.now(timezone.utc),
                                                 onupdate=datetime.now(timezone.utc))

    competition: Mapped[Optional[Competition]] = relationship('Competition', back_populates='base_event', uselist=False)
    algotime: Mapped[Optional[AlgoTimeSession]] = relationship('AlgoTimeSession', back_populates='base_event',
                                                               uselist=False)
    question_instances: Mapped[List[QuestionInstance]] = relationship('QuestionInstance', back_populates='event',
                                                                      uselist=True)

    __table_args__ = (
        CheckConstraint('event_end_date > event_start_date', name='chk_event_dates'),
    )


class Competition(Base):
    __tablename__ = 'competition'

    event_id: Mapped[int] = mapped_column(ForeignKey(FK_BASE_EVENT_EVENT_ID, ondelete='CASCADE'), primary_key=True)
    riddle_cooldown: Mapped[int] = mapped_column(default=60)

    base_event: Mapped[BaseEvent] = relationship('BaseEvent', back_populates='competition', uselist=False)
    competition_leaderboard_entries: Mapped[List[CompetitionLeaderboardEntry]] = relationship(
        'CompetitionLeaderboardEntry', back_populates='competition', uselist=True)

    emails: Mapped[List[CompetitionEmail]] = relationship('CompetitionEmail', back_populates='competition',
                                                          uselist=True)


class CompetitionEmail(Base):
    __tablename__ = 'competition_email'

    email_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    competition_id: Mapped[int] = mapped_column(ForeignKey('competition.event_id', ondelete='CASCADE'))

    # Basic email schedule info
    subject: Mapped[str] = mapped_column()  # e.g., "Competition Reminder"
    to: Mapped[str] = mapped_column()  # e.g., "Competition Reminder"
    body: Mapped[str] = mapped_column()

    # Computed reminder times
    time_24h_before: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    time_5min_before: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    other_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    competition: Mapped[Competition] = relationship('Competition', back_populates='emails', uselist=False)


class AlgoTimeSeries(Base):
    __tablename__ = 'algotime_series'
    algotime_series_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    algotime_series_name: Mapped[str] = mapped_column(unique=True)
    algotime_sessions: Mapped[List[AlgoTimeSession]] = relationship('AlgoTimeSession', back_populates='algotime_series',
                                                                    uselist=True)
    algotime_leaderboard_entries: Mapped[List[AlgoTimeLeaderboardEntry]] = relationship('AlgoTimeLeaderboardEntry',
                                                                                        back_populates='algotime_series',
                                                                                        uselist=True)


class AlgoTimeSession(Base):
    __tablename__ = 'algotime_session'

    event_id: Mapped[int] = mapped_column(ForeignKey(FK_BASE_EVENT_EVENT_ID, ondelete='CASCADE'), primary_key=True)
    algotime_series_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey('algotime_series.algotime_series_id', ondelete=ON_DELETE_SET_NULL))

    base_event: Mapped[BaseEvent] = relationship('BaseEvent', back_populates='algotime', uselist=False)
    algotime_series: Mapped[Optional[AlgoTimeSeries]] = relationship('AlgoTimeSeries',
                                                                     back_populates='algotime_sessions', uselist=False)


question_tag = Table(
    'question_tag', Base.metadata,
    Column('tag_id', Integer, ForeignKey('tag.tag_id', ondelete='CASCADE'), primary_key=True),
    Column('question_id', Integer, ForeignKey(FK_QUESTION_QUESTION_ID, ondelete='CASCADE'), primary_key=True)
)


class Question(Base):
    __tablename__ = 'question'

    question_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    question_name: Mapped[str] = mapped_column(unique=True)
    question_description: Mapped[str] = mapped_column()
    media: Mapped[Optional[str]] = mapped_column()
    difficulty: Mapped[str] = mapped_column(Enum('easy', 'medium', 'hard', name='difficulty_level'))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.now(timezone.utc))
    last_modified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.now(timezone.utc),
                                                       onupdate=datetime.now(timezone.utc))

    test_cases: Mapped[List[TestCase]] = relationship('TestCase', back_populates='question', uselist=True)
    tags: Mapped[List[Tag]] = relationship('Tag', secondary=question_tag, back_populates='questions', uselist=True)
    question_instances: Mapped[List[QuestionInstance]] = relationship('QuestionInstance', back_populates='question',
                                                                      uselist=True)
    language_specific_properties: Mapped[List[QuestionLanguageSpecificProperties]] = relationship(
        'QuestionLanguageSpecificProperties', back_populates='question', uselist=True)


class QuestionLanguageSpecificProperties(Base):
    __tablename__ = 'question_language_specific_properties'

    question_id: Mapped[int] = mapped_column(ForeignKey(FK_QUESTION_QUESTION_ID, ondelete='CASCADE'), primary_key=True)
    language_id: Mapped[int] = mapped_column(ForeignKey(FK_LANGUAGE_LANG_JUDGE_ID, ondelete='CASCADE'), primary_key=True)
    preset_code: Mapped[Optional[str]] = mapped_column()
    from_json_function: Mapped[Optional[str]] = mapped_column()
    to_json_function: Mapped[Optional[str]] = mapped_column()
    template_solution: Mapped[str] = mapped_column()

    question: Mapped[Question] = relationship('Question', back_populates='language_specific_properties', uselist=False)
    language: Mapped[Language] = relationship('Language', back_populates='question_language_specific_properties', uselist=False)

    __table_args__ = (
        UniqueConstraint('question_id', 'language_id', name='uix_question_language_specific_properties'),
    )


class TestCase(Base):
    __tablename__ = 'test_case'

    test_case_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    question_id: Mapped[int] = mapped_column(ForeignKey(FK_QUESTION_QUESTION_ID, ondelete='CASCADE'))
    input_data: Mapped[Any] = mapped_column(JSONB)
    expected_output: Mapped[Any] = mapped_column(JSONB)

    question: Mapped[Question] = relationship('Question', back_populates='test_cases', uselist=False)


class Tag(Base):
    __tablename__ = 'tag'

    tag_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    tag_name: Mapped[str] = mapped_column(unique=True)

    questions: Mapped[List[Question]] = relationship('Question', secondary=question_tag, back_populates='tags',
                                                     uselist=True)


class Riddle(Base):
    __tablename__ = 'riddle'

    riddle_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    riddle_question: Mapped[str] = mapped_column()
    riddle_answer: Mapped[str] = mapped_column()
    riddle_file: Mapped[Optional[str]] = mapped_column()


class QuestionInstance(Base):
    __tablename__ = 'question_instance'

    question_instance_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    question_id: Mapped[int] = mapped_column(ForeignKey(FK_QUESTION_QUESTION_ID, ondelete='CASCADE'))
    event_id: Mapped[Optional[int]] = mapped_column(ForeignKey(FK_BASE_EVENT_EVENT_ID, ondelete='CASCADE'), nullable=True)
    riddle_id: Mapped[Optional[int]] = mapped_column(ForeignKey('riddle.riddle_id', ondelete=ON_DELETE_SET_NULL))

    question: Mapped[Question] = relationship('Question', back_populates='question_instances', uselist=False)
    riddle: Mapped[Optional[Riddle]] = relationship('Riddle', uselist=False)
    event: Mapped[BaseEvent] = relationship('BaseEvent', back_populates='question_instances', uselist=False)
    submissions: Mapped[List[Submission]] = relationship('Submission', back_populates='question_instance', uselist=True)
    most_recent_submission: Mapped[List[MostRecentSubmission]] = relationship('MostRecentSubmission', back_populates='question_instance', uselist=True)

    __table_args__ = (
        UniqueConstraint('question_id', 'event_id', name='uix_question_instance'),
    )

class Language(Base):
    __tablename__ = 'language'

    row_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    lang_judge_id: Mapped[int] = mapped_column(unique=True)
    display_name: Mapped[str] = mapped_column()
    active: Mapped[bool] = mapped_column(default=False)
    question_language_specific_properties: Mapped[List[QuestionLanguageSpecificProperties]] = relationship(
        'QuestionLanguageSpecificProperties', back_populates='language', uselist=True)

    __table_args__ = (UniqueConstraint('lang_judge_id', 'display_name', name='uix_language'),)


class MostRecentSubmission(Base):
    __tablename__ = 'most_recent_submission'

    row_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey(FK_USER_ACCOUNT_USER_ID))
    question_instance_id: Mapped[int] = mapped_column(
        ForeignKey('question_instance.question_instance_id', ondelete='CASCADE'))
    code: Mapped[str] = mapped_column()
    lang_judge_id: Mapped[int] = mapped_column(
        ForeignKey(FK_LANGUAGE_LANG_JUDGE_ID, ondelete='CASCADE'))

    question_instance: Mapped[QuestionInstance] = relationship('QuestionInstance',
                                                               back_populates='most_recent_submission',
                                                               uselist=False)
    __table_args__ = (UniqueConstraint('question_instance_id', 'user_id', name='uix_most_recent_submission'),)
    user_account: Mapped[UserAccount] = relationship('UserAccount', back_populates='most_recent_submission',
                                                     uselist=False)


class Submission(Base):
    __tablename__ = 'submission'

    submission_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey(FK_USER_ACCOUNT_USER_ID))
    question_instance_id: Mapped[int] = mapped_column(
        ForeignKey('question_instance.question_instance_id', ondelete='CASCADE'))
    compile_output: Mapped[str | None] = mapped_column(nullable=True)
    submitted_on: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.now(timezone.utc))
    runtime: Mapped[Optional[int]] = mapped_column(nullable=True)
    status: Mapped[str] = mapped_column()
    memory: Mapped[Optional[int]] = mapped_column(nullable=True)
    message: Mapped[Optional[str]] = mapped_column(nullable=True)
    stdout: Mapped[Optional[str]] = mapped_column(nullable=True)
    stderr: Mapped[Optional[str]] = mapped_column(nullable=True)

    question_instance: Mapped[QuestionInstance] = relationship('QuestionInstance', back_populates='submissions',
                                                               uselist=False)
    user_account: Mapped[UserAccount] = relationship('UserAccount', back_populates='submissions',
                                                     uselist=False)

class CompetitionLeaderboardEntry(Base):
    __tablename__ = 'competition_leaderboard_entry'

    competition_leaderboard_entry_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    competition_id: Mapped[int] = mapped_column(ForeignKey('competition.event_id', ondelete='CASCADE'))
    name: Mapped[str] = mapped_column()  # <= NOT NULL
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey(FK_USER_ACCOUNT_USER_ID, ondelete=ON_DELETE_SET_NULL))
    total_score: Mapped[int] = mapped_column()
    problems_solved: Mapped[int] = mapped_column(default=0)
    total_time: Mapped[int] = mapped_column()

    competition: Mapped[Competition] = relationship('Competition', back_populates='competition_leaderboard_entries',
                                                    uselist=False)
    user_account: Mapped[Optional[UserAccount]] = relationship('UserAccount',
                                                               back_populates='competition_leaderboard_entries',
                                                               uselist=False)

    __table_args__ = (
        UniqueConstraint('competition_id', 'user_id', name='uix_competition_user'),
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.calculated_rank = None  # Initialize runtime attribute


class AlgoTimeLeaderboardEntry(Base):
    __tablename__ = 'algotime_leaderboard_entry'

    algotime_leaderboard_entry_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    algotime_series_id: Mapped[int] = mapped_column(
        ForeignKey('algotime_series.algotime_series_id', ondelete='CASCADE'))
    name: Mapped[str] = mapped_column()
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey(FK_USER_ACCOUNT_USER_ID, ondelete=ON_DELETE_SET_NULL))
    total_score: Mapped[int] = mapped_column()
    problems_solved: Mapped[int] = mapped_column(default=0)
    total_time: Mapped[int] = mapped_column()
    last_updated: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.now(timezone.utc),
                                                   onupdate=datetime.now(timezone.utc))
    algotime_series: Mapped[AlgoTimeSeries] = relationship('AlgoTimeSeries',
                                                           back_populates='algotime_leaderboard_entries', uselist=False)
    user_account: Mapped[Optional[UserAccount]] = relationship('UserAccount', uselist=False)

    __table_args__ = (
        UniqueConstraint('algotime_series_id', 'user_id', name='uix_algotime_user'),
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.calculated_rank = None  # Initialize runtime attribute