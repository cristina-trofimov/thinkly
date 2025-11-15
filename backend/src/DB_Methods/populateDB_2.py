#  do /backend/src and run python -m DB_Methods.populateDB_2
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, UTC, timezone
import random
from DB_Methods.crudOperations import (

    create_competition,
    add_participation,
    upsert_user_result,
    upsert_scoreboard,
    engine, SessionLocal
)
from endpoints.authentification import (
    create_user
)
# Reuse your existing engine/Session factory
# Import Base + the model we’re seeding
from models.schema import Base, BaseQuestion

# ----- CONFIG -----
DIFFICULTIES = ["easy", "medium", "hard"]

seed_users = [
    {
        "username": "admin_user",
        "email": "admin@example.com",
        "first_name": "Admin",
        "last_name": "User",
        "salt": "random_salt_1",
        "type": "admin",
    },
    {
        "username": "john_doe",
        "email": "john@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "salt": "random_salt_2",
        "type": "participant",
    },
    {
        "username": "jane_smith",
        "email": "jane@example.com",
        "first_name": "Jane",
        "last_name": "Smith",
        "salt": "random_salt_3",
        "type": "participant",
    },
]

seed_competitions = [
    {
        "name": "Spring Coding Challenge 2025",
        "location": "Online",
        "date": datetime(2025, 11, 15, tzinfo=UTC),
        "cooldown_time": 30,
        "start_time": datetime(2025, 11, 15, 9, 0, 0, tzinfo=UTC),
        "end_time": datetime(2025, 11, 15, 17, 0, 0, tzinfo=UTC),
    },
    {
        "name": "Local Programming Contest",
        "location": "University Campus",
        "date": datetime(2025, 11, 10, tzinfo=UTC),
        "cooldown_time": 60,
        "start_time": datetime(2025, 11, 10, 10, 0, 0, tzinfo=UTC),
        "end_time": datetime(2025, 11, 10, 14, 0, 0, tzinfo=UTC),
    },
]

seed_questions = [
    {
        "title": "Two Sum",
        "description": "Given an array of integers nums and an integer target, return indices of the two numbers that add up to target.",
        "difficulty": "easy",
        "solution": "Use a hash map to store complement indices in O(n).",
        "media": None,
        "user_id": None,
    },
    {
        "title": "Valid Parentheses",
        "description": "Given a string s containing parentheses characters, determine if the input string is valid.",
        "difficulty": "easy",
        "solution": "Use a stack; push on open, pop on matching close.",
        "media": None,
        "user_id": None,
    },
    {
        "title": "Merge K Sorted Lists",
        "description": "Merge k sorted linked lists and return as one sorted list.",
        "difficulty": "hard",
        "solution": "Use a min-heap (priority queue) to always extract the smallest head.",
        "media": None,
        "user_id": None,
    },
]

# UserResult seed data will be created after users and competitions
seed_user_results = [
    {
        # John Doe in Spring Coding Challenge
        "user_index": 1,  # john_doe
        "competition_index": 1,  # Spring Coding Challenge
        "total_score": 150,
        "rank": 2,
        "problems_solved": 2,
        "total_time": 45.5,  # minutes
    },
    {
        # Jane Smith in Spring Coding Challenge
        "user_index": 2,  # jane_smith
        "competition_index": 1,  # Spring Coding Challenge
        "total_score": 100,
        "rank": 3,
        "problems_solved": 1,
        "total_time": 30.0,
    },
    {
        # Jane Smith in Local Programming Contest
        "user_index": 0,  # jane_smith
        "competition_index": 1,  # Local Programming Contest
        "total_score": 200,
        "rank": 1,
        "problems_solved": 3,
        "total_time": 120.5,
    },
]


def main():
    # Reset DB (drop & recreate all tables known to Base)
    print("Dropping and recreating all tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("Schema recreated.")

    db: Session = SessionLocal()
    try:
        print("Seeding users...")
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
        print("✅ Created 10 users.")

        # 2. Insert Competitions (linked to first user as creator)
        print("Seeding competitions...")
        competitions = []
        now = datetime.now(timezone.utc)
        for i in range(1, 6):
            date = now - timedelta(days=i * 7) if i < 5 else now + timedelta(days=14)
            comp = create_competition(
                db=db,
                user_id=random.choice(users).user_id,
                name=f"Competition {i}",
                location="Online",
                date=date,
                start_time=date - timedelta(hours=1),
                end_time=date + timedelta(hours=2),
                cooldown_time=30
            )
            competitions.append(comp)
        print("✅ Created 5 competitions (4 past, 1 future).")

        # 3. Insert BaseQuestions (some linked to users)
        print("Seeding questions...")
        question_objects = []
        for idx, q in enumerate(seed_questions):
            # Defensive: ensure difficulty matches enum
            if q["difficulty"] not in DIFFICULTIES:
                raise ValueError(f"Invalid difficulty: {q['difficulty']}")

            # Link first question to admin, second to john_doe
            user_id = None
            if idx == 0:
                user_id = users[0].user_id  # admin
            elif idx == 1:
                user_id = users[1].user_id  # john_doe

            obj = BaseQuestion(
                title=q["title"],
                description=q["description"],
                difficulty=q["difficulty"],
                solution=q["solution"],
                media=q.get("media"),
                user_id=user_id,
                created_at=datetime.now(UTC)
            )
            question_objects.append(obj)

        db.add_all(question_objects)
        db.commit()
        print(f"Created {len(question_objects)} questions.")

        # 4. Insert UserResults
        print("Seeding user results...")
        for comp in competitions[:4]:
            participants = random.sample(users, random.randint(5, 8))
            for rank, user in enumerate(participants, start=1):
                add_participation(db, competition_id=comp.competition_id, user_id=user.user_id)
                score = random.randint(1000, 1600)
                problems = random.randint(10, 20)
                total_time = round(random.uniform(20.0, 60.0), 1)  # minutes

                upsert_user_result(
                    db,
                    user_id=user.user_id,
                    competition_id=comp.competition_id,
                    total_score=score,
                    rank=rank,
                    problems_solved=problems,
                    total_time=total_time
                )
                upsert_scoreboard(
                    db,
                    user_id=user.user_id,
                    competition_id=comp.competition_id,
                    total_score=score,
                    rank=rank
                )

        print("✅ Added user results and leaderboards for past competitions.")

        print("Seeding completed successfully!")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()