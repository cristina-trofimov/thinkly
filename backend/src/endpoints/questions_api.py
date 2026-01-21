from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import insert
from models.schema import Question, Riddle, Tag, TestCase
from DB_Methods.database import get_db
import logging

logger = logging.getLogger(__name__)
questions_router = APIRouter(tags=["Questions"])

@questions_router.get("/get-all-questions")
def get_all_questions(db: Session = Depends(get_db)):
    try:
        questions = db.query(Question).all()
        logger.info(f"Fetched {len(questions)} questions from the database.")
        return questions
    except Exception as e:
        logger.error(f"Error fetching questions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve questions. Exception: {str(e)}")
 
class CreateQuestionRequest(BaseModel):
    question_name: str
    question_description: str
    media: str | None = None
    difficulty: str = "Easy"
    preset_code: str = ""
    from_string_function: str = ""
    to_string_function: str = ""
    template_solution: str
    tags: list[str] = []
    testcases: list[tuple[str, str]] = []  # input-output pairs

def get_question_from_request(db: Session,request: CreateQuestionRequest) -> Question:
    existing_tags = db.query(Tag).filter(Tag.tag_name.in_(request.tags)).all()
    new_tags = [Tag(tag_name=tag_name) for tag_name in request.tags if tag_name not in [tag.tag_name for tag in existing_tags]]
    return Question(
        question_name=request.question_name,
        question_description=request.question_description,
        media=request.media,
        difficulty=request.difficulty,
        preset_code=request.preset_code,
        from_string_function=request.from_string_function,
        to_string_function=request.to_string_function,
        template_solution=request.template_solution,
        tags=existing_tags + new_tags,
        test_cases=[TestCase(input_data=tc[0], expected_output=tc[1]) for tc in request.testcases]
    )

@questions_router.post("/upload-question", status_code=201)
def upload_question(question_request: CreateQuestionRequest, db: Session = Depends(get_db)):
    try:
        question = get_question_from_request(db, question_request)
        db.add(question)
        db.commit()
        db.refresh(question)
        logger.info(f"Uploaded new question with ID: {question.question_id}")
        return {"message": f"Successfully uploaded question with ID: {question.question_id}"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error uploading question: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload question. Exception: {str(e)}")  

@questions_router.post("/upload-question-batch", status_code=201)
def upload_question_batch(question_request: list[CreateQuestionRequest], db: Session = Depends(get_db)):
    try:
        questions = [
            get_question_from_request(db, q) for q in question_request
        ]
        db.add_all(questions)
        db.commit()
        logger.info(f"Uploaded batch of {len(questions)} questions.")
        return {"message": f"Successfully uploaded {len(questions)} questions."}
    except Exception as e:
        db.rollback()
        logger.error(f"Error uploading question batch: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload question batch. Exception: {str(e)}")
        
@questions_router.get("/get-all-riddles")
def get_all_riddles(db: Session = Depends(get_db)):
    try:
        riddles = db.query(Riddle).all()
        logger.info(f"Fetched {len(riddles)} riddles from the database.")
        return riddles
    except Exception as e:
        logger.error(f"Error fetching riddles: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve riddles. Exception: {str(e)}")
