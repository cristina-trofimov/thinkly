from __future__ import annotations
from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, Enum, ForeignKey, Integer, String, Table, UniqueConstraint
from sqlalchemy.orm import relationship, Mapped, mapped_column
from db import Base
from typing import List, TYPE_CHECKING, Optional
from datetime import datetime, timezone

class UserAccount(Base):
    __tablename__ = 'user_account'

    user_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(unique=True)
    email: Mapped[str] = mapped_column(unique=True)
    hashed_password: Mapped[str] = mapped_column()
    first_name: Mapped[str] = mapped_column()
    last_name: Mapped[str] = mapped_column()
    user_type: Mapped[str] = mapped_column(Enum('owner', 'admin', 'participant', name='user_type'), default='participant')

    user_preferences: Mapped[UserPreferences] = relationship('UserPreferences', back_populates='user_account', uselist=False)
    sessions: Mapped[List[UserSession]] = relationship('UserSession', back_populates='user_account', uselist=True)
    participations: Mapped[List[Participation]] = relationship('Participation', back_populates='user_account', uselist=True)
    competition_leaderboard_entries: Mapped[List[CompetitionLeaderboardEntry]] = relationship('CompetitionLeaderboardEntry', back_populates='user_account', uselist=True)
    algotime_leaderboard_entries: Mapped[List[AlgoTimeLeaderboardEntry]] = relationship('AlgoTimeLeaderboardEntry', back_populates='user_account', uselist=True)
class UserPreferences(Base):
    __tablename__ = 'user_preferences'

    pref_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('user_account.user_id', ondelete='CASCADE'), unique=True)
    theme: Mapped[str] = mapped_column(Enum('light', 'dark', name='theme_type'), default='light')
    notifications_enabled: Mapped[bool] = mapped_column(default=True)
    last_used_programming_language: Mapped[Optional[str]] = mapped_column()

    user_account: Mapped[UserAccount] = relationship('UserAccount', back_populates='user_preferences', uselist=False)

class UserSession(Base):
    __tablename__ = 'user_session'

    session_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('user_account.user_id'))
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
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))

    competition: Mapped[Optional[Competition]] = relationship('Competition', back_populates='base_event', uselist=False)
    algotime: Mapped[Optional[AlgoTimeSession]] = relationship('AlgoTimeSession', back_populates='base_event', uselist=False)
    question_instances: Mapped[List[QuestionInstance]] = relationship('QuestionInstance', back_populates='event', uselist=True)
    participations: Mapped[List[Participation]] = relationship('Participation', back_populates='event', uselist=True)

    __table_args__ = (
        CheckConstraint('event_end_date > event_start_date', name='chk_event_dates'),
    )

class Competition(Base):
    __tablename__ = 'competition'

    event_id: Mapped[int] = mapped_column(ForeignKey('base_event.event_id', ondelete='CASCADE'), primary_key=True)
    riddle_cooldown: Mapped[int] = mapped_column(default=60)

    base_event: Mapped[BaseEvent] = relationship('BaseEvent', back_populates='competition', uselist=False)
    competition_leaderboard_entries: Mapped[List[CompetitionLeaderboardEntry]] = relationship('CompetitionLeaderboardEntry', back_populates='competition', uselist=True)
class AlgoTimeSeries(Base):
    __tablename__ = 'algotime_series'
    algotime_series_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    algotime_series_name: Mapped[str] = mapped_column(unique=True)
    algotime_sessions: Mapped[List[AlgoTimeSession]] = relationship('AlgoTimeSession', back_populates='algotime_series', uselist=True)
    algotime_leaderboard_entries: Mapped[List[AlgoTimeLeaderboardEntry]] = relationship('AlgoTimeLeaderboardEntry', back_populates='algotime_series', uselist=True)

class AlgoTimeSession(Base):
    __tablename__ = 'algotime_session'

    event_id: Mapped[int] = mapped_column(ForeignKey('base_event.event_id', ondelete='CASCADE'), primary_key=True)
    algotime_series_id: Mapped[Optional[int]] = mapped_column(ForeignKey('algotime_series.algotime_series_id', ondelete='SET NULL'))

    base_event: Mapped[BaseEvent] = relationship('BaseEvent', back_populates='algotime', uselist=False)
    algotime_series: Mapped[Optional[AlgoTimeSeries]] = relationship('AlgoTimeSeries', back_populates='algotime_sessions', uselist=False)

question_tag = Table(
    'question_tag', Base.metadata,
    Column('tag_id', Integer, ForeignKey('tag.tag_id', ondelete='CASCADE'), primary_key=True),
    Column('question_id', Integer, ForeignKey('question.question_id', ondelete='CASCADE'), primary_key=True)
)

class Question(Base):
    __tablename__ = 'question'

    question_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    question_name: Mapped[str] = mapped_column(unique=True)
    question_description: Mapped[str] = mapped_column()
    media: Mapped[Optional[str]] = mapped_column()
    difficulty: Mapped[str] = mapped_column(Enum('easy', 'medium', 'hard', name='difficulty_level'))
    preset_code: Mapped[Optional[str]] = mapped_column()
    from_string_function: Mapped[str] = mapped_column(default=False)
    to_string_function: Mapped[str] = mapped_column(default=False)
    template_solution: Mapped[str] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.now(timezone.utc))
    last_modified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))

    test_cases: Mapped[List[TestCase]] = relationship('TestCase', back_populates='question', uselist=True)
    tags: Mapped[List[Tag]] = relationship('Tag', secondary=question_tag, back_populates='questions', uselist=True)
    question_instances: Mapped[List[QuestionInstance]] = relationship('QuestionInstance', back_populates='question', uselist=True)

class TestCase(Base):
    __tablename__ = 'test_case'

    test_case_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    question_id: Mapped[int] = mapped_column(ForeignKey('question.question_id', ondelete='CASCADE'))
    input_data: Mapped[str] = mapped_column()
    expected_output: Mapped[str] = mapped_column()

    question: Mapped[Question] = relationship('Question', back_populates='test_cases', uselist=False)

class Tag(Base):
    __tablename__ = 'tag'

    tag_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    tag_name: Mapped[str] = mapped_column(unique=True)

    questions: Mapped[List[Question]] = relationship('Question', secondary=question_tag, back_populates='tags', uselist=True)

class QuestionInstance(Base):
    __tablename__ = 'question_instance'

    question_instance_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    question_id: Mapped[int] = mapped_column(ForeignKey('question.question_id', ondelete='CASCADE'))
    event_id: Mapped[int] = mapped_column(ForeignKey('base_event.event_id', ondelete='CASCADE'))
    points: Mapped[int] = mapped_column(default=0)

    question: Mapped[Question] = relationship('Question', back_populates='question_instances', uselist=False)
    event: Mapped[BaseEvent] = relationship('BaseEvent', back_populates='question_instances', uselist=False)
    submissions: Mapped[List[Submission]] = relationship('Submission', back_populates='question_instance', uselist=True)

    __table_args__ = (
        UniqueConstraint('question_id', 'event_id', name='uix_question_instance'),
    )

class Participation(Base):
    __tablename__ = 'participation'

    participation_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('user_account.user_id', ondelete='CASCADE'))
    event_id: Mapped[int] = mapped_column(ForeignKey('base_event.event_id', ondelete='CASCADE'))
    total_score: Mapped[int] = mapped_column(default=0)

    user_account: Mapped[UserAccount] = relationship('UserAccount', back_populates='participations', uselist=False)
    event: Mapped[BaseEvent] = relationship('BaseEvent', back_populates='participations', uselist=False)
    submissions: Mapped[List[Submission]] = relationship('Submission', back_populates='participation', uselist=True)

    __table_args__ = (
        UniqueConstraint('user_id', 'event_id', name='uix_participation'),
    )

class Submission(Base):
    __tablename__ = 'submission'

    submission_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    participation_id: Mapped[int] = mapped_column(ForeignKey('participation.participation_id', ondelete='CASCADE'))
    question_instance_id: Mapped[int] = mapped_column(ForeignKey('question_instance.question_instance_id', ondelete='CASCADE'))
    submitted_code: Mapped[str] = mapped_column()
    submission_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.now(timezone.utc))
    successful: Mapped[bool] = mapped_column(default=False)
    failed_test_case_id: Mapped[Optional[int]] = mapped_column(ForeignKey('test_case.test_case_id'))
    participation: Mapped[Participation] = relationship('Participation', back_populates='submissions', uselist=False)
    question_instance: Mapped[QuestionInstance] = relationship('QuestionInstance', back_populates='submissions', uselist=False)
    failed_test_case: Mapped[Optional[TestCase]] = relationship('TestCase', uselist=False)
    __table_args__ = (
        UniqueConstraint('participation_id', 'question_instance_id', name='uix_submission'),
    )

class CompetitionLeaderboardEntry(Base):
    __tablename__ = 'competition_leaderboard_entry'

    competition_leaderboard_entry_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    competition_id: Mapped[int] = mapped_column(ForeignKey('competition.event_id', ondelete='CASCADE'))
    username: Mapped[str] = mapped_column()
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey('user_account.user_id', ondelete='SET NULL'))
    total_score: Mapped[int] = mapped_column()

    competition: Mapped[Competition] = relationship('Competition', back_populates='competition_leaderboard_entries', uselist=False)
    user_account: Mapped[Optional[UserAccount]] = relationship('UserAccount', back_populates='competition_leaderboard_entries', uselist=False)
    
    __table_args__ = (
        UniqueConstraint('competition_id', 'user_id', name='uix_competition_user'),
    )

class AlgoTimeLeaderboardEntry(Base):
    __tablename__ = 'algotime_leaderboard_entry'

    algotime_leaderboard_entry_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    algotime_series_id: Mapped[int] = mapped_column(ForeignKey('algotime_series.algotime_series_id', ondelete='CASCADE'))
    username: Mapped[str] = mapped_column()
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey('user_account.user_id', ondelete='SET NULL'))
    total_time: Mapped[int] = mapped_column()
    last_updated: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))
    algotime_series: Mapped[AlgoTimeSeries] = relationship('AlgoTimeSeries', back_populates='algotime_leaderboard_entries', uselist=False)
    user_account: Mapped[Optional[UserAccount]] = relationship('UserAccount', uselist=False)

    __table_args__ = (
        UniqueConstraint('algotime_series_id', 'user_id', name='uix_algotime_user'),
    )