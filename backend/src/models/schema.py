from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum, Float, Table
)
from sqlalchemy.orm import relationship
from db import Base

# Association table for many-to-many relationship between AlgoTimeQuestion and QuestionSet
algo_question_set = Table(
    'algo_question_set',
    Base.metadata,
    Column('question_id', Integer, ForeignKey('algo_time_question.question_id', ondelete='CASCADE'), primary_key=True),
    Column('set_id', Integer, ForeignKey('question_set.set_id', ondelete='CASCADE'), primary_key=True),
    extend_existing=True
)


class UserPreferences(Base):
    __tablename__ = 'user_preferences'

    user_id = Column(Integer, primary_key=True)
    theme = Column(String, default='light')
    notifications_enabled = Column(Boolean)
    edit_used_programming_language = Column(String)

#salt = password
# questions - if we want to know who created question, necessarey know - nice to have probably
class User(Base):
    __tablename__ = 'user'

    user_id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    first_name = Column(String)
    last_name = Column(String)
    user_preferences_id = Column(Integer, ForeignKey('user_preferences.user_id', ondelete='CASCADE'))
    salt = Column(String)
    type = Column(Enum('user', 'admin', 'owner', name='type_enum'), nullable=False)

    # Relationships
    competitions = relationship( 'Competition', back_populates='user', cascade="save-update", passive_deletes=True)
    user_results = relationship( 'UserResult', back_populates='user', cascade="all, delete-orphan")
    questions = relationship('BaseQuestion', back_populates='user', cascade="save-update", passive_deletes=True)
    sessions = relationship('Session', back_populates='user', cascade="all, delete-orphan")
    user_cooldowns = relationship( 'UserCooldown', back_populates='user', cascade="all, delete-orphan")
    scoreboards = relationship('Scoreboard', back_populates='user', cascade="save-update", passive_deletes=True)

# need to talk to constance to see if this is necessary
class Session(Base):
    __tablename__ = 'session'

    session_id = Column(String, primary_key=True)
    user_id = Column(Integer, ForeignKey('user.user_id', ondelete='CASCADE'), nullable=False)
    jwt_token = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True)

    user = relationship('User', back_populates='sessions')

class Competition(Base):
    __tablename__ = 'competition'

    competition_id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey('user.user_id', ondelete='SET NULL'))
    location = Column(String, nullable=False)
    date = Column(DateTime, default=datetime.utcnow)
    cooldown_time = Column(Integer)
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship('User', back_populates='competitions')
    competition_questions = relationship( 'CompetitionQuestion', back_populates='competition', cascade="all, delete-orphan")
    participations = relationship( 'Participation', back_populates='competition', cascade="all, delete-orphan")
    scoreboards = relationship( 'Scoreboard', back_populates='competition', cascade="all, delete-orphan")

# for space purpose keep media only for image
class BaseQuestion(Base):
    __tablename__ = 'base_question'

    question_id = Column(Integer, primary_key=True)
    title = Column(Text, nullable=False)
    description = Column(Text, nullable=False)
    media = Column(String)
    difficulty = Column(Enum('easy', 'medium', 'hard', name='difficulty_enum'), nullable=False)
    solution = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey('user.user_id', ondelete='SET NULL'))  # ← added

    user = relationship('User', back_populates='questions')
    competition_questions = relationship('CompetitionQuestion', back_populates='question', cascade="all, delete-orphan")
    competition_question_stats = relationship( 'CompetitionQuestionStats', back_populates='question', cascade="all, delete-orphan")

    user_algotime_stats = relationship('UserAlgoTimeStats', back_populates='question', cascade="all, delete-orphan")
    user_answers = relationship( 'UserAnswer', back_populates='question', cascade="all, delete-orphan")
    algo_time_question = relationship('AlgoTimeQuestion', backref='base_question', cascade="all, delete-orphan", uselist=False )

class CompetitionQuestion(Base):
    __tablename__ = 'competition_question'

    competition_id = Column(Integer, ForeignKey('competition.competition_id', ondelete='CASCADE'), primary_key=True)
    question_id = Column(Integer, ForeignKey('base_question.question_id', ondelete='CASCADE'), primary_key=True)
    base_score_value = Column(Integer)

    competition = relationship('Competition', back_populates='competition_questions')
    question = relationship('BaseQuestion', back_populates='competition_questions')

# idk if this necessary - or use this instead of set or change them idk
class QuestionTag(Base):
    __tablename__ = 'question_tag'

    question_id = Column(Integer, ForeignKey('base_question.question_id', ondelete='CASCADE'), primary_key=True)
    tag_value = Column(String, primary_key=True)


class QuestionSet(Base):
    __tablename__ = 'question_set'

    set_id = Column(Integer, primary_key=True)
    set_name = Column(String, nullable=False)
    week = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)

    algo_questions = relationship(
        'AlgoTimeQuestion',
        secondary=algo_question_set,
        back_populates='question_sets'
    )

class AlgoTimeQuestion(Base):
    __tablename__ = 'algo_time_question'

    question_id = Column(Integer, ForeignKey('base_question.question_id', ondelete='CASCADE'), primary_key=True)
    base_score_value = Column(Integer)

    question_sets = relationship(
        'QuestionSet',
        secondary=algo_question_set,
        back_populates='algo_questions'
    )

# i feel we dont need this
class Participation(Base):
    __tablename__ = 'participation'

    competition_id = Column(Integer, ForeignKey('competition.competition_id', ondelete='CASCADE'), primary_key=True)
    user_id = Column(Integer, ForeignKey('user.user_id', ondelete='CASCADE'), primary_key=True)

    competition = relationship('Competition', back_populates='participations')
    user = relationship('User', foreign_keys=[user_id])


class CompetitionQuestionStats(Base):
    __tablename__ = 'competition_question_stats'

    question_id = Column(Integer, ForeignKey('base_question.question_id', ondelete='CASCADE'), primary_key=True)
    user_id = Column(Integer, ForeignKey('user.user_id', ondelete='CASCADE'), primary_key=True)
    num_attempts = Column(Integer)
    completed = Column(Boolean)
    score_awarded = Column(Integer, nullable=True)
    datetime_completed = Column(DateTime, nullable=True)

    question = relationship('BaseQuestion', back_populates='competition_question_stats')


class UserAlgoTimeStats(Base):
    __tablename__ = 'user_algotime_stats'


    question_id = Column(Integer, ForeignKey('base_question.question_id', ondelete='CASCADE'), primary_key=True)
    user_id = Column(Integer, ForeignKey('user.user_id', ondelete='CASCADE'), primary_key=True)
    num_attempts = Column(Integer)
    best_time = Column(Integer)
    completed = Column(Boolean)
    score_awarded = Column(Integer, nullable=True)
    datetime_completed = Column(DateTime, nullable=True)

    question = relationship('BaseQuestion', back_populates='user_algotime_stats')

#long term ranking - idk if rank is necessary
class UserResult(Base):
    __tablename__ = 'user_result'

    user_id = Column(Integer, ForeignKey('user.user_id', ondelete='CASCADE'), primary_key=True)
    competition_id = Column(Integer, ForeignKey('competition.competition_id', ondelete='CASCADE'), primary_key=True)
    total_score = Column(Integer)
    rank = Column(Integer)
    problems_solved = Column(Integer, default=0)
    total_time = Column(Float, default=0.0)

    user = relationship('User', back_populates='user_results')

# saving last entry
class UserAnswer(Base):
    __tablename__ = 'user_answer'

    user_id = Column(Integer, ForeignKey('user.user_id', ondelete='CASCADE'), primary_key=True)
    question_id = Column(Integer, ForeignKey('base_question.question_id', ondelete='CASCADE'), primary_key=True)
    answer_text = Column(Text)
    submission_datetime = Column(DateTime, default=datetime.utcnow)

    question = relationship('BaseQuestion', back_populates='user_answers')

# short term entry
class Scoreboard(Base):
    __tablename__ = 'scoreboard'

    user_id = Column(Integer, ForeignKey('user.user_id', ondelete='SET NULL'), primary_key=True)
    competition_id = Column(Integer, ForeignKey('competition.competition_id', ondelete='CASCADE'), primary_key=True)
    total_score = Column(Integer, default=0)
    rank = Column(Integer)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship('User', back_populates='scoreboards')
    competition = relationship('Competition', back_populates='scoreboards')

# idk about comptetition id
class UserCooldown(Base):
    __tablename__ = 'user_cooldown'

    cooldown_id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('user.user_id', ondelete='CASCADE'), nullable=False)
    competition_id = Column(Integer, ForeignKey('competition.competition_id', ondelete='CASCADE'), nullable=False)
    last_submission_time = Column(DateTime, default=datetime.utcnow)
    cooldown_ends_at = Column(DateTime)

    user = relationship('User', back_populates='user_cooldowns')