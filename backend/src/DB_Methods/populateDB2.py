from sqlalchemy.orm import Session
from datetime import datetime, timedelta, UTC
import random

from db import engine, Base, SessionLocal
from endpoints.authentification_api import create_user

from models.schema import (
    Base,
    UserAccount,
    BaseEvent,
    Competition,
    Question,
    Participation,
    CompetitionLeaderboardEntry,
    AlgoTimeSeries,
    AlgoTimeSession,
    AlgoTimeLeaderboardEntry,
)

DIFFICULTIES = ["easy", "medium", "hard"]


def main():
    print("Dropping and recreating schema...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()

    try:
        # ---------------- USERS ----------------
        users = []
        for i in range(1, 11):
            user = create_user(
                db=db,
                username=f"user{i}",
                email=f"user{i}@example.com",
                password_hash="hashed_pw",
                first_name=f"First{i}",
                last_name=f"Last{i}",
                type="participant"
            )
            users.append(user)

        print("✅ Users created")

        # ---------------- EVENTS + COMPETITIONS ----------------
        competitions = []
        now = datetime.now(UTC)

        for i in range(1, 6):
            event_start_date = now - timedelta(days=i * 7)
            event_end_date = event_start_date + timedelta(hours=2)

            base_event = BaseEvent(
                event_name=f"Competition {i}",
                event_location="Online",
                question_cooldown= 5,
                event_start_date=event_start_date,
                event_end_date = event_end_date,
                created_at=now,
                updated_at=now,
            )
            db.add(base_event)
            db.flush()

            competition = Competition(
                event_id=base_event.event_id,
                riddle_cooldown=30,
            )
            db.add(competition)
            competitions.append(competition)

        db.commit()
        print("✅ BaseEvents + Competitions created")

        # ---------------- QUESTIONS ----------------
        questions = []
        for i in range(6):
            q = Question(
                question_name=f"Problem {i+1}",
                question_description="Solve the problem efficiently.",
                difficulty=random.choice(DIFFICULTIES),
                template_solution="Reference solution",
                created_at=now,
                last_modified_at=now,
            )
            questions.append(q)

        db.add_all(questions)
        db.commit()
        print("✅ Questions created")

        # ---------------- PARTICIPATION + LEADERBOARD ----------------
        for comp in competitions[:4]:
            participants = random.sample(users, random.randint(5, 8))

            for rank, user in enumerate(participants, start=1):
                db.add(
                    Participation(
                        user_id=user.user_id,
                        event_id=comp.event_id
                    )
                )

                db.add(
                    CompetitionLeaderboardEntry(
                        user_id=user.user_id,
                        competition_id=comp.event_id,
                        name = f"{user.first_name} {user.last_name}",
                        rank=rank,
                        total_score=random.randint(500, 1500),
                        problems_solved=random.randint(1, 5),
                        total_time=round(random.uniform(20, 90), 2),
                    )
                )

        db.commit()
        print("✅ Competition leaderboard entries created")

        # ---------------- ALGOTIME SESSIONS + LEADERBOARD ----------------
        # Pick your single AlgoTimeSeries
        series = AlgoTimeSeries(
            algotime_series_name="Winter Session 2026",
        )
        db.add(series)
        db.commit()  # so series gets an ID
        print("✅ AlgoTime series created")

        # Create multiple sessions, connected to existing BaseEvents (IDs 1 to 5)
        for event_id in range(1, 6):
            # Create a single session for this event
            session = AlgoTimeSession(
                event_id=event_id,
                algotime_series_id=series.algotime_series_id
            )
        db.add(session)
        db.commit()
        print("✅ AlgoTime sessions created")
        db.flush()  # get session.id if needed later

            # Pick random participants for this session
        participants = random.sample(users, random.randint(4, 7))

            # Store their best times for the leaderboard
        results = []

        for user in participants:
            time_ms = random.randint(200, 2000)
            results.append((user, time_ms))

        # Sort by time (ascending = faster is better)
        results.sort(key=lambda x: x[1])

        # Insert leaderboard with rank
        for rank, (user, best_time) in enumerate(results, start=1):
            db.add(
                AlgoTimeLeaderboardEntry(
                    algotime_series_id=series.algotime_series_id,
                    user_id=user.user_id,
                    name=f"{user.first_name} {user.last_name}",
                    total_score=best_time,
                    total_time=best_time,
                    problems_solved=random.randint(1, 5),
                    rank=rank,  # ✅ FIX
                    last_updated=now
                )
            )

        db.commit()
        print("✅ leaderboard created")
        print("🎉 Seeding completed successfully")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
