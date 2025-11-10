# do /backend and run:  python -m src.endpoints.leaderboards.populateDB

from sqlalchemy.orm import Session
from datetime import datetime, timezone


from DB_Methods.crudOperations import engine, SessionLocal

from models.schema import Base, BaseQuestion


DIFFICULTIES = ["easy", "medium", "hard"]


SEED_QUESTIONS = [
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
    {
        "title": "LRU Cache",
        "description": "Design a data structure that follows the constraints of a Least Recently Used cache.",
        "difficulty": "medium",
        "solution": "Use a doubly linked list + hashmap for O(1) get/put.",
        "media": None,
        "user_id": None,
    },
    {
        "title": "Binary Tree Level Order Traversal",
        "description": "Return the level order traversal of a binary tree's nodes' values.",
        "difficulty": "medium",
        "solution": "BFS using a queue; append children level by level.",
        "media": None,
        "user_id": None,
    },
    {
        "title": "Maximum Subarray",
        "description": "Find the contiguous subarray with the largest sum.",
        "difficulty": "easy",
        "solution": "Kadane’s algorithm in linear time.",
        "media": None,
        "user_id": None,
    },
    {
        "title": "Kth Largest Element in an Array",
        "description": "Find the kth largest element in an unsorted array.",
        "difficulty": "medium",
        "solution": "Quickselect partitioning or a min-heap of size k.",
        "media": None,
        "user_id": None,
    },
    {
        "title": "Number of Islands",
        "description": "Given a 2D grid map of '1's (land) and '0's (water), count the number of islands.",
        "difficulty": "medium",
        "solution": "DFS/BFS flood fill; mark visited land.",
        "media": None,
        "user_id": None,
    },
    {
        "title": "Edit Distance",
        "description": "Compute the Levenshtein distance between two strings.",
        "difficulty": "hard",
        "solution": "DP over prefixes; O(mn) time.",
        "media": None,
        "user_id": None,
    },
    {
        "title": "Coin Change",
        "description": "Given coins and an amount, compute min coins to make the amount.",
        "difficulty": "medium",
        "solution": "Bottom-up DP; dp[x] = min(dp[x], dp[x-coin]+1).",
        "media": None,
        "user_id": None,
    },
]


def main():

    print("Dropping and recreating all tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("Schema recreated.")

    db: Session = SessionLocal()
    try:

        print("➕ Inserting BaseQuestion rows...")
        objects = []
        for q in SEED_QUESTIONS:
            
            if q["difficulty"] not in DIFFICULTIES:
                raise ValueError(f"Invalid difficulty: {q['difficulty']}")

            obj = BaseQuestion(
                title=q["title"],
                description=q["description"],
                difficulty=q["difficulty"],
                solution=q["solution"],
                # optional fields -> use provided or None
                media=q.get("media"),
                user_id=q.get("user_id"),
                created_at = datetime.now(timezone.utc)
            )
            objects.append(obj)

        db.add_all(objects)
        db.commit()
        print(f" Inserted {len(objects)} BaseQuestion rows.")

        
        count = db.query(BaseQuestion).count()
        one = db.query(BaseQuestion).first()
        print(f"🔎 BaseQuestion count: {count}")
        if one:
            print(f"   First question: id={one.question_id}, title={one.title}, difficulty={one.difficulty}")

    except Exception as e:
        db.rollback()
        print(f"Error during DB population: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
