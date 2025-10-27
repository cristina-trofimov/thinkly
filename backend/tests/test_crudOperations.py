"""
Quick CRUD test runner for ThinklyDB.
Spins up an in-memory SQLite DB, creates all tables,
runs core CRUD functions from src.DB_Methods.crudOperations, and reports results.
"""

import inspect
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.db import Base
from src import models
from src.DB_Methods import crudOperations as crud
import bcrypt

def setup_db():
    """Create in-memory SQLite DB for testing."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()


def seed_minimum_data(db):
    """Insert base data needed for many CRUD ops."""
    u = crud.create_user(
        db,
        username="testuser",
        email="test@example.com",
        password_hash="hashed_pw",
        first_name="Test",
        last_name="User",
    )
    c = crud.create_competition(
        db, user_id=u.user_id, name="Comp1", location="NYC", date=datetime.utcnow()
    )
    bq = models.BaseQuestion(
        title="SampleQ", description="desc", difficulty="easy", solution="sol"
    )
    db.add(bq)
    db.commit()
    db.refresh(bq)
    return {"user": u, "competition": c, "base_q": bq}


def run_tests():
    db = setup_db()
    print("✅ Database initialized")

    passed, failed = [], []

    try:
        # ---------- USERS ----------
        password = "hashed_pw"
        hashed_pw = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        u = crud.create_user(db, "user1", "u1@ex.com", hashed_pw, "A", "B")
        crud.update_user(db, u.user_id, email="new@ex.com")
        crud.search_users(db, "A")
        crud.get_user_by_id(db, u.user_id)
        # Create a real session for logout
        login_result = crud.login_user(db, u.username, password)
        crud.logout_user(db, u.user_id, login_result["access_token"])
        passed.append("user_crud")

        # ---------- COMPETITIONS ----------
        comp = crud.create_competition(db, u.user_id, "CompX", "Paris", datetime.utcnow())
        crud.update_competition(db, comp.competition_id, location="Berlin")
        crud.get_all_competitions(db)
        passed.append("competition_crud")

        # ---------- QUESTIONS ----------
        cq = crud.create_full_competition_question(
            db, comp.competition_id, "QTitle", "desc", "easy", "sol", None, 100, u.user_id
        )
        crud.add_question_tag(db, cq.question_id, "algo")
        crud.update_question_tag(db, cq.question_id, "algo", "math")
        crud.delete_question_tag(db, cq.question_id, "math")
        passed.append("question_crud")

        # ---------- QUESTION SETS ----------
        qs = crud.create_question_set(db, "SetA", 1)
        crud.update_question_set(db, qs.set_id, set_name="SetB")
        passed.append("question_sets")

        # ---------- ALGO QUESTIONS ----------
        aq = crud.create_full_algotime_question(
            db, "ATitle", "desc", "med", "solution", None, 50, u.user_id, qs.set_id
        )
        crud.update_algotime_question(db, aq.question_id, base_score_value=120)
        passed.append("algotime")

        # ---------- PARTICIPATION ----------
        p = crud.add_participation(db, comp.competition_id, u.user_id)
        crud.is_participating(db, comp.competition_id, u.user_id)
        crud.remove_participation(db, comp.competition_id, u.user_id)
        passed.append("participation")

        # ---------- USER STATS ----------
        crud.add_or_update_user_algotime_stats(db, aq.question_id, u.user_id, num_attempts=3)
        crud.get_user_algotime_stats(db, aq.question_id)
        passed.append("stats")

        # ---------- SCOREBOARD ----------
        crud.upsert_scoreboard(db, u.user_id, comp.competition_id, total_score=90, rank=1)
        crud.get_scoreboard_for_competition(db, comp.competition_id)
        passed.append("scoreboard")

        # ---------- COOLDOWN ----------
        crud.upsert_user_cooldown(db, None, u.user_id, comp.competition_id)
        crud.get_user_cooldown(db, u.user_id)
        passed.append("cooldown")

    except Exception as e:
        failed.append(("general", str(e)))

    print("\n=== CRUD Summary ===")
    print(f"✅ Passed groups: {len(passed)} -> {passed}")
    if failed:
        print(f"❌ Failed: {len(failed)}")
        for f in failed:
            print(f"  - {f[0]}: {f[1]}")
    else:
        print("🎉 All executed successfully!")


if __name__ == "__main__":
    run_tests()
