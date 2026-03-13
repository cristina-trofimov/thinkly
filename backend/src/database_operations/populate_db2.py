# nao's DB - cd backend/src ->   python -m database_operations.populate_db2
# from sqlalchemy.orm import Session
# from sqlalchemy import text
# from datetime import datetime, timedelta, timezone
# import random
#
# from .db import engine, Base, SessionLocal
#
# from models.schema import (
#     UserAccount,
#     BaseEvent,
#     Competition,
#     CompetitionEmail,
#     Question,
#     QuestionLanguageSpecificProperties,
#     TestCase,
#     Tag,
#     Language,
#     QuestionInstance,
#     Riddle,
#     Submission,
#     MostRecentSubmission,
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
#     with engine.connect() as conn:
#         conn.execute(text("DROP SCHEMA public CASCADE"))
#         conn.execute(text("CREATE SCHEMA public"))
#         conn.commit()
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
#                 email=f"user{i}@gmail.com",
#                 hashed_password="hashed_pw",
#                 first_name=f"First{i}",
#                 last_name=f"Last{i}",
#                 user_type="participant",
#             )
#             db.add(user)
#             users.append(user)
#
#         db.commit()
#         print(f"✅ {len(users)} Users created")
#
#         # ---------------- EVENTS + COMPETITIONS ----------------
#         competitions = []
#         base_events = []
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
#             base_events.append(base_event)
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
#         # ---------------- QUESTIONS + TESTCASES + LANGUAGE-SPECIFIC PROPERTIES ----------------
#         questions = []
#         for i in range(6):
#             q = Question(
#                 question_name=f"Problem {i + 1}",
#                 question_description="Solve the problem efficiently.",
#                 media=None,
#                 difficulty=random.choice(DIFFICULTIES),
#                 created_at=now,
#                 last_modified_at=now,
#                 tags=random.sample(tags, k=random.randint(1, 3)),
#             )
#             db.add(q)
#             db.flush()
#
#             # TestCase — input_data / expected_output are now JSONB
#             for j in range(3):
#                 tc = TestCase(
#                     question_id=q.question_id,
#                     input_data={"value": f"input_{i}_{j}"},
#                     expected_output={"value": f"output_{i}_{j}"},
#                 )
#                 db.add(tc)
#
#             # QuestionLanguageSpecificProperties — one entry per language
#             for lang in languages:
#                 qlsp = QuestionLanguageSpecificProperties(
#                     question_id=q.question_id,
#                     language_id=lang.lang_judge_id,
#                     preset_code=f"# Starter code for problem {i + 1} in {lang.display_name}",
#                     from_json_function="def from_json(s): return s",
#                     to_json_function="def to_json(v): return str(v)",
#                     template_solution="Reference solution",
#                 )
#                 db.add(qlsp)
#
#             questions.append(q)
#
#         db.commit()
#         print("✅ Questions + TestCases + Tags + QuestionLanguageSpecificProperties created")
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
#         # Track QIs per event so we can create submissions against them later
#         question_instances_by_event: dict[int, list] = {}
#
#         for comp, base_event in zip(competitions, base_events):
#             selected_questions = random.sample(questions, k=min(3, len(questions)))
#             qis = []
#             for q in selected_questions:
#                 qi = QuestionInstance(
#                     question_id=q.question_id,
#                     event_id=comp.event_id,
#                     riddle_id=random.choice(riddles).riddle_id if random.random() > 0.5 else None,
#                 )
#                 db.add(qi)
#                 db.flush()
#                 qis.append(qi)
#             question_instances_by_event[comp.event_id] = (base_event.event_start_date, qis)
#
#         db.commit()
#         print("✅ QuestionInstances created")
#
#         # ---------------- COMPETITION LEADERBOARD ----------------
#         # Track participants per competition so we can create submissions for them
#         competition_participants: dict[int, list] = {}
#
#         for comp in competitions[:4]:
#             num_participants = random.randint(15, 20)
#             participants = random.sample(users, num_participants)
#             competition_participants[comp.event_id] = participants
#
#             for user in participants:
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
#         # ---------------- SUBMISSIONS ----------------
#         # Creates realistic submission history so the admin dashboard charts have data:
#         #   - Questions solved (by difficulty)      → Accepted submissions per QI
#         #   - Avg question solve time               → submitted_on relative to event_start_date
#         #   - Participation over time               → submissions spread across the last ~35 days
#         STATUSES = ["Wrong Answer", "Runtime Error", "Time Limit Exceeded", "Accepted"]
#
#         submission_count = 0
#         for event_id, (event_start, qis) in question_instances_by_event.items():
#             participants = competition_participants.get(event_id, random.sample(users, 10))
#
#             for user in participants:
#                 # Each user attempts a random subset of the event's questions
#                 attempted_qis = random.sample(qis, k=random.randint(1, len(qis)))
#
#                 for qi in attempted_qis:
#                     # 1-3 failed attempts then a final submission
#                     num_attempts = random.randint(1, 3)
#                     solved = random.random() < 0.65  # 65% chance of eventually solving
#
#                     for attempt in range(num_attempts):
#                         # Each attempt is a few minutes after the previous one
#                         offset_minutes = random.randint(5, 80) + (attempt * random.randint(2, 10))
#                         submitted_on = event_start + timedelta(minutes=offset_minutes)
#
#                         # Only the last attempt can be Accepted
#                         if attempt == num_attempts - 1 and solved:
#                             sub_status = "Accepted"
#                         else:
#                             sub_status = random.choice(STATUSES[:3])  # non-Accepted only
#
#                         db.add(Submission(
#                             user_id=user.user_id,
#                             question_instance_id=qi.question_instance_id,
#                             compile_output="",
#                             submitted_on=submitted_on,
#                             status=sub_status,
#                             runtime=random.randint(50, 500) if sub_status == "Accepted" else None,
#                             memory=random.randint(10, 256) if sub_status == "Accepted" else None,
#                             message=None,
#                             stdout=None,
#                             stderr=None if sub_status == "Accepted" else "Error occurred",
#                         ))
#                         submission_count += 1
#
#         db.commit()
#         print(f"✅ {submission_count} Submissions created (competition)")
#
#         # ---------------- ALGOTIME SERIES ----------------
#         series = AlgoTimeSeries(
#             algotime_series_name="Winter Session 2026",
#         )
#         db.add(series)
#         db.commit()
#         print("✅ AlgoTime series created")
#
#         # ---------------- ALGOTIME SESSIONS ----------------
#         algotime_participants_per_event: dict[int, list] = {}
#
#         for base_event in base_events:
#             session = AlgoTimeSession(
#                 event_id=base_event.event_id,
#                 algotime_series_id=series.algotime_series_id
#             )
#             db.add(session)
#             db.flush()
#
#             participants = random.sample(users, random.randint(6, 10))
#             algotime_participants_per_event[base_event.event_id] = participants
#
#         db.commit()
#         print("✅ AlgoTime sessions created")
#
#         # ---------------- ALGOTIME SUBMISSIONS ----------------
#         algotime_submission_count = 0
#         for event_id, participants in algotime_participants_per_event.items():
#             if event_id not in question_instances_by_event:
#                 continue
#             event_start, qis = question_instances_by_event[event_id]
#
#             for user in participants:
#                 attempted_qis = random.sample(qis, k=random.randint(1, len(qis)))
#                 for qi in attempted_qis:
#                     offset_minutes = random.randint(5, 90)
#                     submitted_on = event_start + timedelta(minutes=offset_minutes)
#                     solved = random.random() < 0.6
#
#                     db.add(Submission(
#                         user_id=user.user_id,
#                         question_instance_id=qi.question_instance_id,
#                         compile_output="",
#                         submitted_on=submitted_on,
#                         status="Accepted" if solved else random.choice(STATUSES[:3]),
#                         runtime=random.randint(50, 500) if solved else None,
#                         memory=random.randint(10, 256) if solved else None,
#                         message=None,
#                         stdout=None,
#                         stderr=None if solved else "Error occurred",
#                     ))
#                     algotime_submission_count += 1
#
#         db.commit()
#         print(f"✅ {algotime_submission_count} Submissions created (algotime)")
#
#         # ---------------- ALGOTIME LEADERBOARD ----------------
#         all_algotime_participant_ids: set[int] = set()
#         for participants in algotime_participants_per_event.values():
#             for user in participants:
#                 all_algotime_participant_ids.add(user.user_id)
#
#         remaining_users = [u for u in users if u.user_id not in all_algotime_participant_ids]
#         target_count = random.randint(15, 20)
#
#         if len(all_algotime_participant_ids) < target_count and remaining_users:
#             additional_needed = min(target_count - len(all_algotime_participant_ids), len(remaining_users))
#             additional_users = random.sample(remaining_users, additional_needed)
#             all_algotime_participant_ids.update([u.user_id for u in additional_users])
#
#         user_map = {u.user_id: u for u in users}
#         for user_id in all_algotime_participant_ids:
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
#         print(f"✅ AlgoTime leaderboard created with {len(all_algotime_participant_ids)} participants")
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