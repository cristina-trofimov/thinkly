import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from db import engine, Base
from models.schema import (
    User, UserPreferences, Session as UserSession, Competition,
    BaseQuestion, CompetitionQuestion, QuestionSet, AlgoTimeQuestion,
    Participation, CompetitionQuestionStats, UserAlgoTimeStats,
    UserResult, UserAnswer, Scoreboard, UserCooldown
)

# --- Create tables ---
Base.metadata.create_all(bind=engine)

# --- Helper functions ---
def random_string(prefix, length=6):
    return f"{prefix}_{''.join(random.choices('abcdefghijklmnopqrstuvwxyz', k=length))}"

def random_datetime(days_back=30):
    return datetime.utcnow() - timedelta(days=random.randint(0, days_back))

# --- Insert data ---
def populate_data():
    with Session(engine) as session:
        # USER PREFERENCES
        prefs = []
        for i in range(25):
            p = UserPreferences(
                theme=random.choice(['light', 'dark']),
                notifications_enabled=random.choice([True, False]),
                edit_used_programming_language=random.choice(['Python', 'Java', 'C++', 'Go'])
            )
            prefs.append(p)
            session.add(p)
        session.commit()

        # USERS
        users = []
        for i, p in enumerate(prefs):
            u = User(
                username=f"user{i}",
                email=f"user{i}@example.com",
                first_name=f"First{i}",
                last_name=f"Last{i}",
                user_preferences_id=p.user_id,
                salt=random_string("salt"),
                type=random.choice(['participant', 'admin', 'owner'])
            )
            users.append(u)
            session.add(u)
        session.commit()

        # COMPETITIONS
        competitions = []
        for i in range(20):
            c = Competition(
                name=f"Competition_{i}",
                user_id=random.choice(users).user_id,
                location=random.choice(["Montreal", "Toronto", "Vancouver"]),
                date=random_datetime(),
                cooldown_time=random.randint(30, 300),
                start_time=datetime.utcnow(),
                end_time=datetime.utcnow() + timedelta(hours=2)
            )
            competitions.append(c)
            session.add(c)
        session.commit()

        # QUESTIONS
        questions = []
        for i in range(20):
            q = BaseQuestion(
                title=f"Question {i}",
                description="Solve this problem efficiently.",
                media=None,
                difficulty=random.choice(['easy', 'medium', 'hard']),
                solution="def solution(): pass",
                user_id=random.choice(users).user_id
            )
            questions.append(q)
            session.add(q)
        session.commit()

        # QUESTION SETS
        question_sets = []
        for i in range(10):
            qs = QuestionSet(
                set_name=f"Set_{i}",
                week=random.randint(1, 10)
            )
            question_sets.append(qs)
            session.add(qs)
        session.commit()

        # ALGO TIME QUESTIONS
        algo_questions = []
        for q in questions:
            aq = AlgoTimeQuestion(
                question_id=q.question_id,
                base_score_value=random.randint(50, 100)
            )
            algo_questions.append(aq)
            session.add(aq)
        session.commit()

        # LINK ALGO QUESTIONS ↔ QUESTION SETS
        for aq in algo_questions:
            linked_sets = random.sample(question_sets, k=random.randint(1, 3))
            aq.question_sets.extend(linked_sets)
        session.commit()

        # COMPETITION QUESTIONS
        for c in competitions:
            selected = random.sample(questions, k=random.randint(3, 5))
            for q in selected:
                cq = CompetitionQuestion(
                    competition_id=c.competition_id,
                    question_id=q.question_id,
                    base_score_value=random.randint(100, 500)
                )
                session.add(cq)
        session.commit()

        # PARTICIPATION
        for c in competitions:
            participants = random.sample(users, k=random.randint(5, 10))
            for u in participants:
                session.add(Participation(competition_id=c.competition_id, user_id=u.user_id))
        session.commit()

        # STATS & RESULTS
        for u in users:
            q = random.choice(questions)
            session.add(UserAlgoTimeStats(
                question_id=q.question_id,
                user_id=u.user_id,
                num_attempts=random.randint(1, 5),
                best_time=random.randint(10, 300),
                completed=random.choice([True, False]),
                score_awarded=random.randint(0, 100)
            ))

        for u in users:
            c = random.choice(competitions)
            session.add(UserResult(
                user_id=u.user_id,
                competition_id=c.competition_id,
                total_score=random.randint(0, 500),
                rank=random.randint(1, 25),
                problems_solved=random.randint(0, 5),
                total_time=random.uniform(100.0, 500.0)
            ))

        # ANSWERS
        for u in users:
            q = random.choice(questions)
            session.add(UserAnswer(
                user_id=u.user_id,
                question_id=q.question_id,
                answer_text="print('Hello World')"
            ))

        # SCOREBOARDS
        for c in competitions:
            for u in random.sample(users, k=random.randint(5, 10)):
                session.add(Scoreboard(
                    user_id=u.user_id,
                    competition_id=c.competition_id,
                    total_score=random.randint(100, 500),
                    rank=random.randint(1, 10)
                ))

        # COOLDOWNS
        for u in users:
            session.add(UserCooldown(
                user_id=u.user_id,
                competition_id=random.choice(competitions).competition_id,
                cooldown_ends_at=datetime.utcnow() + timedelta(minutes=30)
            ))

        session.commit()
        print("✅ Database successfully populated with test data!")

if __name__ == "__main__":
    populate_data()
