"""
Quick CRUD test runner for ThinklyDB.
Spins up an in-memory SQLite DB, creates all tables,
runs core CRUD functions from src.DB_Methods.crudOperations, and reports results.
"""

import inspect
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from db import Base
import models
from DB_Methods import crudOperations as crud
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
        results = crud.search_users(db, "A")
        assert len(results) == 1, "User search failed"
        assert results[0].username == "user1", "User search returned wrong user"
        results = crud.get_user_by_id(db, u.user_id)
        assert results is not None, "Fetched user is None"
        assert results.username == "user1", "Fetched user has wrong username"
        assert results.email == "new@ex.com", "Fetched user email was not updated"

        # Create a real session for logout
        login_result = crud.login_user(db, u.username, password)
        crud.logout_user(db, u.user_id, login_result["access_token"])
        passed.append("user_crud")

        # ---------- COMPETITIONS ----------
        comp = crud.create_competition(db, u.user_id, "CompX", "Paris", datetime.utcnow())
        crud.update_competition(db, comp.competition_id, location="Berlin")
        results = crud.get_all_competitions(db)
        assert len(results) == 1, "Competition search failed"
        assert results[0].name == "CompX", "Competition search returned wrong competition"
        assert results[0].location == "Berlin", "Competition update failed"
        passed.append("competition_crud")

        # ---------- QUESTIONS ----------
        cq = crud.create_full_competition_question(
            db, comp.competition_id, "QTitle", "desc", "easy", "sol", None, 100, u.user_id
        )
        results = crud.get_competition_question(db, cq.competition_id, cq.question_id)
        assert results is not None, "Competition question fetch failed"
        
        crud.add_question_tag(db, cq.question_id, "algo")
        results = crud.get_tags_by_question(db, cq.question_id)
        assert len(results) == 1, "Question tag addition failed"
        assert results[0].tag_value == "algo", "Question tag addition incorrect tag"
        
        crud.update_question_tag(db, cq.question_id, "algo", "math")
        results = crud.get_tags_by_question(db, cq.question_id)
        assert results[0].tag_value == "math", "Question tag update failed"

        crud.delete_question_tag(db, cq.question_id, "math")
        results = crud.get_tags_by_question(db, cq.question_id)
        assert len(results) == 0, "Question tag deletion failed"
        
        passed.append("question_crud")

        # ---------- QUESTION SETS ----------
        qs = crud.create_question_set(db, "SetA", 1)
        crud.update_question_set(db, qs.set_id, set_name="SetB")
        results = crud.get_question_set(db, qs.set_id)
        assert results.set_name == "SetB", "Question set update failed"
        passed.append("question_sets")

        # ---------- ALGO QUESTIONS ----------
        aq = crud.create_full_algotime_question(
            db, "ATitle", "desc", "med", "solution", None, 50, u.user_id, qs.set_id
        )
        crud.update_algotime_question(db, aq.question_id, base_score_value=120)
        results = crud.get_algotime_question(db, aq.question_id)
        assert results.base_score_value == 120, "AlgoTime question update failed"
        passed.append("algotime")

        # ---------- PARTICIPATION ----------
        crud.add_participation(db, comp.competition_id, u.user_id)
        results = crud.is_participating(db, comp.competition_id, u.user_id)
        assert results is True, "Participation add/check failed"
        crud.remove_participation(db, comp.competition_id, u.user_id)
        results = crud.is_participating(db, comp.competition_id, u.user_id)
        assert results is False, "Participation removal failed"
        passed.append("participation")

        # ---------- USER STATS ----------
        crud.add_or_update_user_algotime_stats(db, aq.question_id, u.user_id, num_attempts=3)
        results = crud.get_user_algotime_stats(db, aq.question_id)
        assert results[0].num_attempts == 3, "User AlgoTime stats update failed"
        passed.append("stats")

        # ---------- SCOREBOARD ----------
        crud.upsert_scoreboard(db, u.user_id, comp.competition_id, total_score=90, rank=1)
        results = crud.get_scoreboard_for_competition(db, comp.competition_id)
        assert len(results) == 1, "Scoreboard fetch failed"
        assert results[0].user_id == u.user_id, "Scoreboard user ID mismatch"
        assert results[0].total_score == 90, "Scoreboard total score mismatch"
        assert results[0].rank == 1, "Scoreboard rank mismatch"
        passed.append("scoreboard")

        # ---------- COOLDOWN ----------
        crud.upsert_user_cooldown(db, None, u.user_id, comp.competition_id)
        results = crud.get_user_cooldown(db, u.user_id)
        assert results is not None, "User cooldown fetch failed"
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
