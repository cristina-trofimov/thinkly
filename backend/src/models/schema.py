from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum, Float, Table
from sqlalchemy.orm import relationship
from src.db import Base

# Association table for many-to-many relationship between AlgoTimeQuestion and QuestionSet
algo_question_set = Table(
    'algo_question_set',
    Base.metadata,
    Column('question_id', Integer, ForeignKey('algo_time_question.question_id'), primary_key=True),
    Column('set_id', Integer, ForeignKey('question_set.set_id'), primary_key=True)
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
    user_preferences_id = Column(Integer, ForeignKey('user_preferences.user_id'))
    salt = Column(String)
    type = Column(Enum('user', 'admin', 'owner', name='type_enum'),nullable=False)

    # Relationships
    competitions = relationship('Competition', back_populates='user')
    user_results = relationship('UserResult', back_populates='user')
    questions = relationship('BaseQuestion', back_populates='user')
    sessions = relationship('Session', back_populates='user')
    user_cooldowns = relationship('UserCooldown', back_populates='user')
    scoreboards = relationship('Scoreboard', back_populates='user')


# need to talk to constance to see if this is necessary
class Session(Base):
    __tablename__ = 'session'

    session_id = Column(String, primary_key=True)
    user_id = Column(Integer, ForeignKey('user.user_id'), nullable=False)
    jwt_token = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True)

    # Relationships
    user = relationship('User', back_populates='sessions')


class Competition(Base):
    __tablename__ = 'competition'

    competition_id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey('user.user_id'))
    location = Column(String, nullable=False)
    date = Column(DateTime, default=datetime.utcnow)
    cooldown_time = Column(Integer)  # in seconds
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship('User', back_populates='competitions')
    competition_questions = relationship('CompetitionQuestion', back_populates='competition')
    participations = relationship('Participation', back_populates='competition')
    scoreboards = relationship('Scoreboard', back_populates='competition')

# for space purpose keep media only for image
class BaseQuestion(Base):
    __tablename__ = 'base_question'

    question_id = Column(Integer, primary_key=True)
    title = Column(Text, nullable=False)
    description = Column(Text, nullable=False)
    media = Column(String)
    difficulty = Column(Enum('easy', 'medium', 'hard', name='difficulty_enum'),nullable=False)
    solution = Column(Text, nullable=False)

    # Relationships
    user = relationship('User', back_populates='questions')
    competition_questions = relationship('CompetitionQuestion', back_populates='question')
    competition_question_stats = relationship('CompetitionQuestionStats', back_populates='question')
    user_answers = relationship('UserAnswer', back_populates='question')


class CompetitionQuestion(Base):
    __tablename__ = 'competition_question'

    competition_id = Column(Integer, ForeignKey('competition.competition_id'), primary_key=True)
    question_id = Column(Integer, ForeignKey('base_question.question_id'), primary_key=True)
    base_score_value = Column(Integer)

    # Relationships
    competition = relationship('Competition', back_populates='competition_questions')
    question = relationship('BaseQuestion', back_populates='competition_questions')

# idk if this necessary - or use this instead of set or change them idk
class QuestionTag(Base):
    __tablename__ = 'question_tag'

    question_id = Column(Integer, ForeignKey('base_question.question_id'), primary_key=True)
    tag_value = Column(String, primary_key=True)


class QuestionSet(Base):
    __tablename__ = 'question_set'

    set_id = Column(Integer, primary_key=True)
    set_name = Column(String, nullable=False)
    week = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    algo_questions = relationship(
        'AlgoTimeQuestion',
        secondary=algo_question_set,
        back_populates='question_sets'
    )


class AlgoTimeQuestion(Base):
    __tablename__ = 'algo_time_question'

    question_id = Column(Integer, ForeignKey('base_question.question_id'), primary_key=True)
    base_score_value = Column(Integer)

    # Relationships
    question_sets = relationship(
        'QuestionSet',
        secondary=algo_question_set,
        back_populates='algo_questions'
    )

# i feel we dont need this
class Participation(Base):
    __tablename__ = 'participation'

    competition_id = Column(Integer, ForeignKey('competition.competition_id'), primary_key=True)
    user_id = Column(Integer, ForeignKey('user.user_id'), primary_key=True)

    # Relationships
    competition = relationship('Competition', back_populates='participations')
    user = relationship('User', back_populates='user_results', foreign_keys=[user_id])


class CompetitionQuestionStats(Base):
    __tablename__ = 'competition_question_stats'

    question_id = Column(Integer, ForeignKey('base_question.question_id'), primary_key=True)
    user_id = Column(Integer, ForeignKey('user.user_id'), primary_key=True)
    num_attempts = Column(Integer)
    completed = Column(Boolean)
    score_awarded = Column(Integer, nullable=True)
    datetime_completed = Column(DateTime, nullable=True)

    # Relationships
    question = relationship('BaseQuestion', back_populates='competition_question_stats')


class UserAlgoTimeStats(Base):
    __tablename__ = 'user_algotime_stats'

    question_id = Column(Integer, ForeignKey('base_question.question_id'), primary_key=True)
    user_id = Column(Integer, ForeignKey('user.user_id'), primary_key=True)
    num_attempts = Column(Integer)
    best_time = Column(Integer)
    completed = Column(Boolean)
    score_awarded = Column(Integer, nullable=True)
    datetime_completed = Column(DateTime, nullable=True)

    # Relationships
    question = relationship('BaseQuestion', back_populates='competition_question_stats')


#long term ranking - idk if rank is necessary
class UserResult(Base):
    __tablename__ = 'user_result'

    user_id = Column(Integer, ForeignKey('user.user_id'), primary_key=True)
    competition_id = Column(Integer, ForeignKey('competition.competition_id'), primary_key=True)
    total_score = Column(Integer)
    rank = Column(Integer)

    # Relationships
    user = relationship('User', back_populates='user_results')

# saving last entry
class UserAnswer(Base):
    __tablename__ = 'user_answer'

    user_id = Column(Integer, ForeignKey('user.user_id'), primary_key=True)
    question_id = Column(Integer, ForeignKey('base_question.question_id'), primary_key=True)
    answer_text = Column(Text)
    submission_datetime = Column(DateTime, default=datetime.utcnow)

    # Relationships
    question = relationship('BaseQuestion', back_populates='user_answers')

# short term entry
class Scoreboard(Base):
    __tablename__ = 'scoreboard'

    user_id = Column(Integer, ForeignKey('user.user_id'), nullable=False, primary_key=True)
    competition_id = Column(Integer, ForeignKey('competition.competition_id'), nullable=False, primary_key=True)
    total_score = Column(Integer, default=0)
    rank = Column(Integer)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship('User', back_populates='scoreboards')
    competition = relationship('Competition', back_populates='scoreboards')

# idk about comptetition id
class UserCooldown(Base):
    __tablename__ = 'user_cooldown'

    cooldown_id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('user.user_id'), nullable=False)
    competition_id = Column(Integer, ForeignKey('competition.competition_id'), nullable=False)
    last_submission_time = Column(DateTime, default=datetime.utcnow)
    cooldown_ends_at = Column(DateTime)

    # Relationships
    user = relationship('User', back_populates='user_cooldowns')
