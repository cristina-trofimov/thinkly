# # do /backend/src/DB_Methods and run:  python -m populateDB

# from sqlalchemy.orm import Session
# from datetime import datetime, timedelta, timezone
# import random
# import os
# import sys

# # Add the parent directory to the path to resolve module imports
# # Assumes structure: backend/src/DB_Methods/populateDB.py
# sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# # Import Base, engine, and SessionLocal (adjust the import path as needed)
# from db import engine, Base, SessionLocal
# # Import ALL models from your schema file (assuming it's named 'schema')
# from models.schema import UserAccount, UserPreferences, Question, TestCase, BaseEvent, Competition, QuestionInstance, Participation, CompetitionLeaderboardEntry


# # --- CONFIG ---
# DIFFICULTIES = ["easy", "medium", "hard"]
# PASSWORD_HASH = "mock_hashed_password" # Use a mock hash since you don't have the hashing logic here

# SEED_USERS = [
#     {
#         "email": "admin@example.com",
#         "first_name": "Admin",
#         "last_name": "User",
#         "user_type": "admin",
#     },
#     {
#         "email": "john@example.com",
#         "first_name": "John",
#         "last_name": "Doe",
#         "user_type": "participant",
#     },
#     {
#         "email": "jane@example.com",
#         "first_name": "Jane",
#         "last_name": "Smith",
#         "user_type": "participant",
#     },
# ]

# SEED_QUESTIONS = [
#     {
#         "question_name": "Two Sum",
#         "question_description": "Given an array of integers nums and an integer target, return indices of the two numbers that add up to target.",
#         "difficulty": "easy",
#         "template_solution": "Use a hash map to store complement indices in O(n).",
#         "preset_code": None,
#         "from_string_function": "def parse_input(data):\n    return data.split()",
#         "to_string_function": "def format_output(result):\n    return str(result)",
#     },
#     {
#         "question_name": "Valid Parentheses",
#         "question_description": "Given a string s containing parentheses characters, determine if the input string is valid.",
#         "difficulty": "easy",
#         "template_solution": "Use a stack; push on open, pop on matching close.",
#         "preset_code": None,
#         "from_string_function": "def parse_input(data):\n    return data.strip()",
#         "to_string_function": "def format_output(result):\n    return 'True' if result else 'False'",
#     },
#     {
#         "question_name": "Merge K Sorted Lists",
#         "question_description": "Merge k sorted linked lists and return as one sorted list.",
#         "difficulty": "hard",
#         "template_solution": "Use a min-heap (priority queue) to always extract the smallest head.",
#         "preset_code": None,
#         "from_string_function": "def parse_input(data):\n    return json.loads(data)",
#         "to_string_function": "def format_output(result):\n    return json.dumps(result)",
#     },
# ]

# # ----- HELPER FUNCTIONS -----

# def get_utc_now():
#     """Returns a timezone-aware datetime object in UTC."""
#     return datetime.now(timezone.utc)

# def create_user_orm(db: Session, data: dict) -> UserAccount:
#     """Creates a UserAccount object and its default UserPreferences."""
#     user = UserAccount(
#         email=data["email"],
#         hashed_password=PASSWORD_HASH,
#         first_name=data["first_name"],
#         last_name=data["last_name"],
#         user_type=data["user_type"],
#     )
#     # UserPreferences is created automatically via relationship or can be set explicitly
#     # if not using an implicit relationship:
#     user.user_preferences = UserPreferences()
#     db.add(user)
#     db.flush() # Flush to get the user_id for the next steps if needed
#     return user


# # ----- MAIN SEEDING LOGIC -----

# def main():
#     print("Dropping and recreating all tables...")
#     Base.metadata.drop_all(bind=engine)
#     Base.metadata.create_all(bind=engine)
#     print("Schema recreated.")

#     db: Session = SessionLocal()
#     try:
#         # --- 1. USERS ---
#         print("👤 Seeding core User Accounts...")
#         seeded_users = [create_user_orm(db, data) for data in SEED_USERS]
#         db.commit()
        
#         # Create additional generic users
#         generic_users = [
#             UserAccount(
#                 email=f"user{i}@example.com",
#                 hashed_password=PASSWORD_HASH,
#                 first_name=f"First{i}",
#                 last_name=f"Last{i}",
#                 user_type="participant",
#                 user_preferences=UserPreferences()
#             )
#             for i in range(1, 8)
#         ]
#         db.add_all(generic_users)
#         db.commit()
#         all_users = seeded_users + generic_users
#         print(f"✅ Created {len(all_users)} users.")

#         # --- 2. QUESTIONS ---
#         print("❓ Seeding Questions...")
#         question_objects = []
#         for q in SEED_QUESTIONS:
#             obj = Question(
#                 question_name=q["question_name"],
#                 question_description=q["question_description"],
#                 difficulty=q["difficulty"],
#                 template_solution=q["template_solution"],
#                 preset_code=q.get("preset_code"),
#                 from_string_function=q.get("from_string_function"),
#                 to_string_function=q.get("to_string_function"),
#                 # created_at and last_modified_at use default=get_utc_now()
#             )
#             question_objects.append(obj)
            
#             # Add a mock test case for each question
#             obj.test_cases.append(TestCase(
#                 input_data="[2, 7, 11, 15], 9" if "Two Sum" in q["question_name"] else "()",
#                 expected_output="[0, 1]" if "Two Sum" in q["question_name"] else "True"
#             ))

#         db.add_all(question_objects)
#         db.commit()
#         print(f"✅ Created {len(question_objects)} Questions and TestCases.")
        
#         # --- 3. COMPETITIONS (BaseEvent + Competition) ---
#         print("🏆 Seeding Competitions...")
#         competitions = []
#         now = get_utc_now()
        
#         # Create 5 Competitions (4 past, 1 future)
#         for i in range(1, 6):
#             # Future competition
#             is_future = i == 5
#             date = now + timedelta(days=14) if is_future else now - timedelta(days=i * 7)
            
#             base_event = BaseEvent(
#                 event_name=f"Competition Event {i}",
#                 event_location="Online",
#                 question_cooldown=300,
#                 event_start_date=date - timedelta(hours=1),
#                 event_end_date=date + timedelta(hours=2)
#             )
            
#             competition = Competition(
#                 base_event=base_event,
#                 riddle_cooldown=60
#             )
#             competitions.append(competition)
#             db.add(competition)
            
#         db.commit()
#         print(f"✅ Created {len(competitions)} BaseEvent/Competition pairs.")
        
#         # --- 4. INTERMEDIATE DATA (Participation & QuestionInstance) ---
#         print("🔗 Seeding Participation and Question Instances...")
        
#         past_competitions = competitions[:4]
        
#         for comp in past_competitions:
#             # Add Question Instances for the first 2 questions to the competition
#             for q_obj in question_objects[:2]:
#                 q_instance = QuestionInstance(
#                     question_id=q_obj.question_id,
#                     event_id=comp.event_id,
#                     points=50 if q_obj.difficulty == 'easy' else 100
#                 )
#                 db.add(q_instance)
            
#             # Select random users to participate in past competitions
#             participants = random.sample(all_users, random.randint(5, len(all_users)))
            
#             for user in participants:
#                 participation = Participation(
#                     user_id=user.user_id,
#                     event_id=comp.event_id,
#                     total_score=random.randint(50, 200) # Mock score
#                 )
#                 db.add(participation)
                
#         db.commit()
#         print("✅ Created QuestionInstances and Participations.")

#         # --- 5. LEADERBOARDS ---
#         print("🥇 Seeding Leaderboard Entries...")
#         for comp in past_competitions:
#             # Fetch all participations for the current competition
#             participations = db.query(Participation).filter(Participation.event_id == comp.event_id).all()
            
#             # Sort to mock ranks
#             participations.sort(key=lambda p: p.total_score, reverse=True)
            
#             for rank, participation in enumerate(participations, start=1):
#                 user = db.query(UserAccount).get(participation.user_id)
                
                # Insert CompetitionLeaderboardEntry
                leaderboard_entry = CompetitionLeaderboardEntry(
                    competition_id=comp.event_id,
                    name=user.first_name + " " + user.last_name,
                    user_id=user.user_id,
                    total_score=participation.total_score,
                    total_time= random.randint(300, 3600), # Mock total time in seconds
                    rank=rank
                )
                db.add(leaderboard_entry)
                
#         db.commit()
#         print("✅ Created CompetitionLeaderboardEntries.")
        
#         print("\n✨ Seeding completed successfully! Tables populated.")

#     except Exception as e:
#         db.rollback()
#         print(f"\n❌ Error during DB population: {e}")
#         raise
#     finally:
#         db.close()


# if __name__ == "__main__":
#     main()