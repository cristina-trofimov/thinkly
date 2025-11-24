from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, Enum, ForeignKey, Integer, String, Table, UniqueConstraint
from sqlalchemy.orm import relationship
from db import Base

class UserAccount(Base):
    __tablename__ = 'user_account'

    user_id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    user_type = Column(Enum('owner', 'admin', 'participant', name='user_type'), nullable=False, default='participant')

    user_preferences = relationship('UserPreferences', back_populates='user_account', uselist=False)
    sessions = relationship('UserSession', back_populates='user_account', uselist=True)
    participations = relationship('Participation', back_populates='user_account', uselist=True)
    competition_leaderboard_entries = relationship('CompetitionLeaderboardEntry', back_populates='user_account', uselist=True)
    algotime_leaderboard_entries = relationship('AlgoTimeLeaderboardEntry', back_populates='user_account', uselist=True)

class UserPreferences(Base):
    __tablename__ = 'user_preferences'

    pref_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('user_account.user_id', ondelete='CASCADE'), unique=True, nullable=False)
    theme = Column(Enum('light', 'dark', name='theme_type'), nullable=False, default='light')
    notifications_enabled = Column(Boolean, nullable=False, default=True)
    last_used_programming_language = Column(String, nullable=True)

    user_account = relationship('UserAccount', back_populates='user_preferences', uselist=False)

class UserSession(Base):
    __tablename__ = 'user_session'

    session_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('user_account.user_id'), nullable=False)
    jwt_token = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)

    user_account = relationship('UserAccount', back_populates='sessions', uselist=False)

class BaseEvent(Base):
    __tablename__ = 'base_event'

    event_id = Column(Integer, primary_key=True, autoincrement=True)
    event_name = Column(String, unique=True, nullable=False)
    event_location = Column(String, nullable=True)
    question_cooldown = Column(Integer, nullable=False, default=300)
    event_start_date = Column(DateTime, nullable=False)
    event_end_date = Column(DateTime, nullable=False)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)

    competition = relationship('Competition', back_populates='base_event', uselist=False)
    algotime = relationship('AlgoTimeSession', back_populates='base_event', uselist=False)
    question_instances = relationship('QuestionInstance', back_populates='event', uselist=True)
    participations = relationship('Participation', back_populates='event', uselist=True)

    __table_args__ = (
        CheckConstraint('event_end_date > event_start_date', name='chk_event_dates'),
    )

class Competition(Base):
    __tablename__ = 'competition'

    event_id = Column(Integer, ForeignKey('base_event.event_id', ondelete='CASCADE'), nullable=False, primary_key=True)
    riddle_cooldown = Column(Integer, nullable=False, default=60)

    base_event = relationship('BaseEvent', back_populates='competition', uselist=False)
    competition_leaderboard_entries = relationship('CompetitionLeaderboardEntry', back_populates='competition', uselist=True)

class AlgoTimeSeries(Base):
    __tablename__ = 'algotime_series'
    algotime_series_id = Column(Integer, primary_key=True, autoincrement=True)
    algotime_series_name = Column(String, unique=True, nullable=False)

    algotime_sessions = relationship('AlgoTimeSession', back_populates='algotime_series', uselist=True)
    algotime_leaderboard_entries = relationship('AlgoTimeLeaderboardEntry', back_populates='algotime_series', uselist=True)

class AlgoTimeSession(Base):
    __tablename__ = 'algotime_session'

    event_id = Column(Integer, ForeignKey('base_event.event_id', ondelete='CASCADE'), nullable=False, primary_key=True)
    algotime_series_id = Column(Integer, ForeignKey('algotime_series.algotime_series_id', ondelete='SET NULL'), nullable=True)

    base_event = relationship('BaseEvent', back_populates='algotime', uselist=False)
    algotime_series = relationship('AlgoTimeSeries', back_populates='algotime_sessions', uselist=False)

question_tag = Table(
    'question_tag', Base.metadata,
    Column('tag_id', Integer, ForeignKey('tag.tag_id', ondelete='CASCADE'), primary_key=True),
    Column('question_id', Integer, ForeignKey('question.question_id', ondelete='CASCADE'), primary_key=True)
)

class Question(Base):
    __tablename__ = 'question'

    question_id = Column(Integer, primary_key=True, autoincrement=True)
    question_name = Column(String, unique=True, nullable=False)
    question_description = Column(String, nullable=False)
    media = Column(String, nullable=True)
    difficulty = Column(Enum('easy', 'medium', 'hard', name='difficulty_level'), nullable=False)
    preset_code = Column(String, nullable=True)
    from_string_function = Column(String, nullable=False, default=False)
    to_string_function = Column(String, nullable=False, default=False)
    template_solution = Column(String, nullable=False)

    test_cases = relationship('TestCase', back_populates='question', uselist=True)
    tags = relationship('Tag', secondary=question_tag, back_populates='questions', uselist=True)
    question_instances = relationship('QuestionInstance', back_populates='question', uselist=True)

class TestCase(Base):
    __tablename__ = 'test_case'

    test_case_id = Column(Integer, primary_key=True, autoincrement=True)
    question_id = Column(Integer, ForeignKey('question.question_id', ondelete='CASCADE'), nullable=False)
    input_data = Column(String, nullable=False)
    expected_output = Column(String, nullable=False)

    question = relationship('Question', back_populates='test_cases', uselist=False)

class Tag(Base):
    __tablename__ = 'tag'

    tag_id = Column(Integer, primary_key=True, autoincrement=True)
    tag_name = Column(String, unique=True, nullable=False)

    questions = relationship('Question', secondary=question_tag, back_populates='tags', uselist=True)

class QuestionInstance(Base):
    __tablename__ = 'question_instance'

    question_instance_id = Column(Integer, primary_key=True, autoincrement=True)
    question_id = Column(Integer, ForeignKey('question.question_id', ondelete='CASCADE'), nullable=False)
    event_id = Column(Integer, ForeignKey('base_event.event_id', ondelete='CASCADE'), nullable=False)
    points = Column(Integer, nullable=False, default=0)

    question = relationship('Question', back_populates='question_instances', uselist=False)
    event = relationship('BaseEvent', back_populates='question_instances', uselist=False)
    submissions = relationship('Submission', back_populates='question_instance', uselist=True)

    __table_args__ = (
        UniqueConstraint('question_id', 'event_id', name='uix_question_instance'),
    )

class Participation(Base):
    __tablename__ = 'participation'

    participation_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('user_account.user_id', ondelete='CASCADE'), nullable=False)
    event_id = Column(Integer, ForeignKey('base_event.event_id', ondelete='CASCADE'), nullable=False)
    total_score = Column(Integer, nullable=False, default=0)

    user_account = relationship('UserAccount', back_populates='participations', uselist=False)
    event = relationship('BaseEvent', back_populates='participations', uselist=False)
    submissions = relationship('Submission', back_populates='participation', uselist=True)

    __table_args__ = (
        UniqueConstraint('user_id', 'event_id', name='uix_participation'),
    )

class Submission(Base):
    __tablename__ = 'submission'

    submission_id = Column(Integer, primary_key=True, autoincrement=True)
    participation_id = Column(Integer, ForeignKey('participation.participation_id', ondelete='CASCADE'), nullable=False)
    question_instance_id = Column(Integer, ForeignKey('question_instance.question_instance_id', ondelete='CASCADE'), nullable=False)
    submitted_code = Column(String, nullable=False)
    submission_time = Column(DateTime, nullable=False)
    successful = Column(Boolean, nullable=False, default=False)
    failed_test_case_id = Column(Integer, ForeignKey('test_case.test_case_id'), nullable=True)

    participation = relationship('Participation', back_populates='submissions', uselist=False)
    question_instance = relationship('QuestionInstance', back_populates='submissions', uselist=False)
    failed_test_case = relationship('TestCase', uselist=False)

    __table_args__ = (
        UniqueConstraint('participation_id', 'question_instance_id', name='uix_submission'),
    )

class CompetitionLeaderboardEntry(Base):
    __tablename__ = 'competition_leaderboard_entry'

    competition_leaderboard_entry_id = Column(Integer, primary_key=True, autoincrement=True)
    competition_id = Column(Integer, ForeignKey('competition.event_id', ondelete='CASCADE'), nullable=False)
    username = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey('user_account.user_id', ondelete='SET NULL'), nullable=True)
    total_score = Column(Integer, nullable=False)

    competition = relationship('Competition', back_populates='competition_leaderboard_entries', uselist=False)
    user_account = relationship('UserAccount', back_populates='competition_leaderboard_entries', uselist=False)
    
    __table_args__ = (
        UniqueConstraint('competition_id', 'user_id', name='uix_competition_user'),
    )

class AlgoTimeLeaderboardEntry(Base):
    __tablename__ = 'algotime_leaderboard_entry'

    algotime_leaderboard_entry_id = Column(Integer, primary_key=True, autoincrement=True)
    algotime_series_id = Column(Integer, ForeignKey('algotime_series.algotime_series_id', ondelete='CASCADE'), nullable=False)
    username = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey('user_account.user_id', ondelete='SET NULL'), nullable=True)
    total_time = Column(Integer, nullable=False)
    last_updated = Column(DateTime, nullable=False)

    algotime_series = relationship('AlgoTimeSeries', back_populates='algotime_leaderboard_entries', uselist=False)
    user_account = relationship('UserAccount', uselist=False)

    __table_args__ = (
        UniqueConstraint('algotime_series_id', 'user_id', name='uix_algotime_user'),
    )