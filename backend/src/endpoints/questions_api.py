from fastapi import APIRouter, Depends, HTTPException, status
import logging
from sqlalchemy.orm import Session
from models.schema import BaseQuestion
from DB_Methods.database import get_db

questions_router = APIRouter(tags=["Questions"])
logger = logging.getLogger(__name__)

# @questions_router.get("/get-all-questions")
# def get_all_questions(db: Session = Depends(get_db)):
#     logger.info("Accessing /questions endpoint to retrieve all questions.")
    
#     try:
#         # Check database schema integrity
#         insp = inspect(db.bind)
#         table_names = insp.get_table_names()
        
#         # Check if the expected question table exists
#         if "base_question" not in table_names and "basequestion" not in table_names:
#             error_msg = "Table for BaseQuestion not found. Did you run the seeder & use the same DB URL?"
#             logger.error(f"SCHEMA ERROR: {error_msg}. Tables found: {table_names}")
#             raise RuntimeError(error_msg)
        
#         logger.debug("BaseQuestion table successfully validated in the database schema.")

#         # Query all questions
#         rows = db.query(BaseQuestion).all()
#         num_rows = len(rows)
#         logger.info(f"Successfully retrieved {num_rows} question records.")

#         def to_dict(q: BaseQuestion):
#             created = None
#             if hasattr(q, "created_at") and isinstance(q.created_at, datetime):
#                 # Ensure date format conversion success is noted
#                 created = q.created_at.strftime("%Y-%m-%d")

#             return {
#                 "id": str(getattr(q, "question_id", getattr(q, "id", None))),
#                 "title": getattr(q, "title", None),
#                 "description": getattr(q, "description", None),
#                 "difficulty": getattr(q, "difficulty", None),
#                 "solution": getattr(q, "solution", None),
#                 "media": getattr(q, "media", None),
#                 "createdAt": created,
#             }

#         # Final successful return path
#         logger.debug("Successfully serialized question data to dictionary format.")
#         return [to_dict(q) for q in rows]

#     except RuntimeError as e:
#         # Catch specific configuration errors (like missing table) and return 500
#         logger.error(f"Configuration/Database Error in /questions: {e}")
#         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
        
#     except Exception as e:
#         # Catch all other unexpected errors (e.g., connection drop, SQL syntax error)
#         logger.exception("Unexpected failure while fetching /questions data.")
#         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"/questions error: {type(e).__name__}: {e}")


@questions_router.get("/get-all-questions")
def get_all_questions(db: Session = Depends(get_db)):
    # Log when the API endpoint is hit
    logger.info("Accessing /homepage/get-questions endpoint.")
    
    try:
        questions = db.query(BaseQuestion).all()
        
        # Log the number of records retrieved
        num_questions = len(questions)
        logger.info(f"Successfully retrieved {num_questions} questions from the database.")
        
        result = []
        for q in questions:
            result.append({
                "id": q.question_id,
                "questionTitle": q.title,
                "date": q.created_at,
                "difficulty": q.difficulty,
            })
        
        # Log successful completion
        logger.debug("Successfully formatted question results.")
        return result
        
    except Exception as e:
        # Log the exception with stack trace (essential for ELK)
        logger.exception("An error occurred while fetching questions.")
        # Raise an HTTPException to communicate the error back to the client
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve questions: {type(e).__name__}"
        )