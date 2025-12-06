#  do /backend/src and run python -m DB_Methods.loadDBforQuestions
from sqlalchemy.orm import Session
from datetime import datetime


from src.DB_Methods.crudOperations import engine, SessionLocal

from src.models.schema import *

# ----- CONFIG -----
DIFFICULTIES = ["easy", "medium", "hard"]

seed_questions = [
   {
        # mandatory
        "title": "Two Sum",
        "description": "Given an array of integers nums and an integer target, return indices of the two numbers that add up to target.",
        "difficulty": "easy",
        "solution": "Use a hash map to store complement indices in O(n).",
        # optional -> None
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

def main():
    # Reset DB (drop & recreate all tables known to Base)
    print("Dropping and recreating all tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("Schema recreated.")

    db: Session = SessionLocal()
    try:
        # Insert BaseQuestion rows. Only mandatory fields are required.
        objects = []
        for q in seed_questions:
            # Defensive: ensure difficulty matches enum
            if q["difficulty"] not in DIFFICULTIES:
                raise ValueError(f"Invalid difficulty: {q['difficulty']}")

            obj = BaseQuestion(
                title=q["title"],
                description=q["description"],
                difficulty=q["difficulty"],
                solution=q["solution"],
                # optional fields -> use provided or None
                media=q.get("media"),
                user_id=q.get("user_id"),# stays None unless you want to attach to an existing user
                created_at = datetime.utcnow()
            )
            objects.append(obj)

        db.add_all(objects)
        db.commit()

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()