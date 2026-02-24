# nao's DB - cd backend/src ->   python -m DB_Methods.populateDB2
# from sqlalchemy.orm import Session
# from datetime import datetime, timedelta, timezone
# import random
#
# from db import engine, Base, SessionLocal
#
# from models.schema import (
#     UserAccount,
#     BaseEvent,
#     Competition,
#     CompetitionEmail,
#     Question,
#     TestCase,
#     Tag,
#     Language,
#     QuestionInstance,
#     Riddle,
#     Participation,
#     CompetitionLeaderboardEntry,
#     AlgoTimeSeries,
#     AlgoTimeSession,
#     AlgoTimeLeaderboardEntry,
# )
#
# DIFFICULTIES = ["easy", "medium", "hard"]
#
#
# def main():
#     print("Dropping and recreating schema...")
#     Base.metadata.drop_all(bind=engine)
#     Base.metadata.create_all(bind=engine)
#
#     db: Session = SessionLocal()
#
#     try:
#         # ---------------- LANGUAGES ----------------
#         # Required by UserPreferences.last_used_programming_language and MostRecentSubmission.lang_judge_id
#         languages_data = [
#             (63,  "JavaScript (Node.js 12.14.0)"),
#             (71,  "Python (3.8.1)"),
#             (74,  "TypeScript (3.7.4)"),
#             (62,  "Java (OpenJDK 13.0.1)"),
#             (54,  "C++ (GCC 9.2.0)"),
#             (51,  "C# (Mono 6.6.0.161)"),
#         ]
#         languages = []
#         for judge_id, display_name in languages_data:
#             lang = Language(
#                 lang_judge_id=judge_id,
#                 display_name=display_name,
#                 active=True,
#             )
#             languages.append(lang)
#
#         db.add_all(languages)
#         db.commit()
#         print(f"✅ {len(languages)} Languages created")
#
#         # ---------------- USERS ----------------
#         users = []
#         for i in range(1, 21):
#             user = UserAccount(
#                 email=f"user{i}@example.com",
#                 hashed_password="hashed_pw",          # was: password_hash
#                 first_name=f"First{i}",
#                 last_name=f"Last{i}",
#                 user_type="participant",               # was: type
#             )
#             db.add(user)
#             users.append(user)
#
#         db.commit()
#         print(f"✅ {len(users)} Users created")
#
#         # ---------------- EVENTS + COMPETITIONS ----------------
#         competitions = []
#         now = datetime.now(timezone.utc)
#
#         for i in range(1, 6):
#             event_start_date = now - timedelta(days=i * 7)
#             event_end_date = event_start_date + timedelta(hours=2)
#
#             base_event = BaseEvent(
#                 event_name=f"Competition {i}",
#                 event_location="Online",
#                 question_cooldown=5,
#                 event_start_date=event_start_date,
#                 event_end_date=event_end_date,
#                 created_at=now,
#                 updated_at=now,
#             )
#             db.add(base_event)
#             db.flush()
#
#             competition = Competition(
#                 event_id=base_event.event_id,
#                 riddle_cooldown=30,
#             )
#             db.add(competition)
#             db.flush()
#
#             # CompetitionEmail — one reminder per competition
#             email = CompetitionEmail(
#                 competition_id=competition.event_id,
#                 subject=f"Reminder: Competition {i} is coming up!",
#                 to="participants@example.com",
#                 body=f"Don't forget that Competition {i} starts soon. Good luck!",
#                 time_24h_before=event_start_date - timedelta(hours=24),
#                 time_5min_before=event_start_date - timedelta(minutes=5),
#                 other_time=None,
#             )
#             db.add(email)
#             competitions.append(competition)
#
#         db.commit()
#         print("✅ BaseEvents + Competitions + CompetitionEmails created")
#
#         # ---------------- TAGS ----------------
#         tag_names = ["arrays", "strings", "dynamic-programming", "graphs", "sorting", "recursion"]
#         tags = []
#         for name in tag_names:
#             tag = Tag(tag_name=name)
#             db.add(tag)
#             tags.append(tag)
#
#         db.commit()
#         print(f"✅ {len(tags)} Tags created")
#
#         # ---------------- QUESTIONS + TESTCASES ----------------
#         questions = []
#         for i in range(6):
#             q = Question(
#                 question_name=f"Problem {i + 1}",
#                 question_description="Solve the problem efficiently.",
#                 media=None,                            # new optional field
#                 difficulty=random.choice(DIFFICULTIES),
#                 preset_code=f"# Starter code for problem {i + 1}",   # new optional field
#                 from_string_function="def from_string(s): return s",
#                 to_string_function="def to_string(v): return str(v)",
#                 template_solution="Reference solution",
#                 created_at=now,
#                 last_modified_at=now,
#                 tags=random.sample(tags, k=random.randint(1, 3)),     # many-to-many via question_tag
#             )
#             db.add(q)
#             db.flush()
#
#             # TestCase — now its own model, not a simple field
#             for j in range(3):
#                 tc = TestCase(
#                     question_id=q.question_id,
#                     input_data=f"input_{i}_{j}",
#                     expected_output=f"output_{i}_{j}",
#                 )
#                 db.add(tc)
#
#             questions.append(q)
#
#         db.commit()
#         print("✅ Questions + TestCases + Tags created")
#
#         # ---------------- RIDDLES ----------------
#         riddles_data = [
#             ("I speak without a mouth and hear without ears. What am I?", "An echo"),
#             ("The more of this there is, the less you see. What is it?", "Darkness"),
#             ("I'm tall when I'm young, and short when I'm old. What am I?", "A candle"),
#             ("What has keys but can't open locks?", "A piano"),
#             ("What can travel around the world while staying in one spot?", "A stamp"),
#             ("What has a heart that doesn't beat?", "An artichoke"),
#         ]
#
#         riddles = []
#         for question, answer in riddles_data:
#             riddle = Riddle(
#                 riddle_question=question,
#                 riddle_answer=answer,
#                 riddle_file=None
#             )
#             riddles.append(riddle)
#
#         db.add_all(riddles)
#         db.commit()
#         print(f"✅ {len(riddles)} Riddles created")
#
#         # ---------------- QUESTION INSTANCES ----------------
#         for comp in competitions:
#             selected_questions = random.sample(questions, k=min(3, len(questions)))
#             for q in selected_questions:
#                 qi = QuestionInstance(
#                     question_id=q.question_id,
#                     event_id=comp.event_id,
#                     points=random.choice([100, 200, 300]),
#                     riddle_id=random.choice(riddles).riddle_id if random.random() > 0.5 else None,
#                     is_riddle_completed=False,
#                 )
#                 db.add(qi)
#
#         db.commit()
#         print("✅ QuestionInstances created")
#
#         # ---------------- PARTICIPATION + COMPETITION LEADERBOARD ----------------
#         for comp in competitions[:4]:
#             num_participants = random.randint(15, 20)
#             participants = random.sample(users, num_participants)
#
#             for user in participants:
#                 db.add(
#                     Participation(
#                         user_id=user.user_id,
#                         event_id=comp.event_id,
#                         total_score=random.randint(300, 2000),
#                     )
#                 )
#
#                 db.add(
#                     CompetitionLeaderboardEntry(
#                         user_id=user.user_id,
#                         competition_id=comp.event_id,
#                         name=f"{user.first_name} {user.last_name}",
#                         total_score=random.randint(300, 2000),
#                         problems_solved=random.randint(1, 6),
#                         total_time=random.randint(15, 120),
#                     )
#                 )
#
#         db.commit()
#         print("✅ Competition leaderboard entries created")
#
#         # ---------------- ALGOTIME SERIES ----------------
#         series = AlgoTimeSeries(
#             algotime_series_name="Winter Session 2026",
#         )
#         db.add(series)
#         db.commit()
#         print("✅ AlgoTime series created")
#
#         # ---------------- ALGOTIME SESSIONS + PARTICIPATION ----------------
#         for event_id in range(1, 6):
#             session = AlgoTimeSession(
#                 event_id=event_id,
#                 algotime_series_id=series.algotime_series_id
#             )
#             db.add(session)
#             db.flush()
#
#             participants = random.sample(users, random.randint(6, 10))
#
#             for user in participants:
#                 existing = db.query(Participation).filter_by(
#                     user_id=user.user_id,
#                     event_id=event_id
#                 ).first()
#
#                 if not existing:
#                     db.add(
#                         Participation(
#                             user_id=user.user_id,
#                             event_id=event_id,
#                             total_score=0,
#                         )
#                     )
#
#         db.commit()
#         print("✅ AlgoTime sessions created")
#
#         # ---------------- ALGOTIME LEADERBOARD ----------------
#         all_algotime_participants = set()
#         for event_id in range(1, 6):
#             session_participants = db.query(Participation).filter_by(event_id=event_id).all()
#             for p in session_participants:
#                 all_algotime_participants.add(p.user_id)
#
#         remaining_users = [u for u in users if u.user_id not in all_algotime_participants]
#         target_count = random.randint(15, 20)
#
#         if len(all_algotime_participants) < target_count and remaining_users:
#             additional_needed = min(target_count - len(all_algotime_participants), len(remaining_users))
#             additional_users = random.sample(remaining_users, additional_needed)
#             all_algotime_participants.update([u.user_id for u in additional_users])
#
#         user_map = {u.user_id: u for u in users}
#         for user_id in all_algotime_participants:
#             user = user_map[user_id]
#             score = random.randint(500, 2500)
#
#             db.add(
#                 AlgoTimeLeaderboardEntry(
#                     algotime_series_id=series.algotime_series_id,
#                     user_id=user.user_id,
#                     name=f"{user.first_name} {user.last_name}",
#                     total_score=score,
#                     total_time=score,
#                     problems_solved=random.randint(1, 6),
#                     last_updated=now,
#                 )
#             )
#
#         db.commit()
#         print(f"✅ AlgoTime leaderboard created with {len(all_algotime_participants)} participants")
#         print("🎉 Seeding completed successfully")
#
#     except Exception as e:
#         db.rollback()
#         print(f"❌ Error: {e}")
#         raise
#     finally:
#         db.close()
#
#
# if __name__ == "__main__":
#     main()