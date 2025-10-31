# do /backend and run python -m src.Components.leaderboards.loadDBToDelete

from datetime import datetime, timedelta
import random
from src.DB_Methods.crudOperations import (
    create_user,
    create_competition,
    add_participation,
    upsert_user_result,
    upsert_scoreboard,
    engine, SessionLocal
)
from src.models.schema import Base

# Reset DB
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

db = SessionLocal()

# 1️⃣ Create 10 users
users = []
for i in range(1, 11):
    user = create_user(
        db=db,
        username=f"user{i}",
        email=f"user{i}@example.com",
        password_hash="hashed_pw",
        first_name=f"First{i}",
        last_name=f"Last{i}",
        type="user"
    )
    users.append(user)
print("✅ Created 10 users.")

# 2️⃣ Create 5 competitions (4 past, 1 future)
competitions = []
now = datetime.utcnow()
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

# 3️⃣ Create leaderboard results for past competitions
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
print("🎉 Database seeding completed successfully!")
