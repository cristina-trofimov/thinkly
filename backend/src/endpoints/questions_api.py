from typing import Annotated, Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session
from models.schema import Question, Riddle, Tag, TestCase
from database_operations.database import get_db
import logging
from services.posthog_analytics import track_custom_event

logger = logging.getLogger(__name__)
questions_router = APIRouter(tags=["Questions"])
DEFAULT_PAGE_SIZE = 25
MAX_PAGE_SIZE = 100


class TagResponse(BaseModel):
    tag_id: int
    tag_name: str


class QuestionListItemResponse(BaseModel):
    question_id: int
    question_name: str
    question_description: str
    media: str | None = None
    difficulty: str
    preset_code: str | None = None
    from_string_function: str
    to_string_function: str
    template_solution: str
    created_at: str
    last_modified_at: str
    tags: list[TagResponse]


class PaginatedQuestionsResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[QuestionListItemResponse]


class RiddleListItemResponse(BaseModel):
    riddle_id: int
    riddle_question: str
    riddle_answer: str
    riddle_file: str | None = None


class PaginatedRiddlesResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[RiddleListItemResponse]


class TestCaseResponse(BaseModel):
    test_case_id: int
    question_id: int
    input_data: str
    expected_output: str


def serialize_question(question: Question) -> dict:
    return {
        "question_id": question.question_id,
        "question_name": question.question_name,
        "question_description": question.question_description,
        "media": question.media,
        "difficulty": question.difficulty,
        "preset_code": question.preset_code,
        "from_string_function": question.from_string_function,
        "to_string_function": question.to_string_function,
        "template_solution": question.template_solution,
        "created_at": question.created_at.isoformat(),
        "last_modified_at": question.last_modified_at.isoformat(),
        "tags": [
            {
                "tag_id": tag.tag_id,
                "tag_name": tag.tag_name,
            }
            for tag in question.tags
        ],
    }


def serialize_riddle(riddle: Riddle) -> dict:
    return {
        "riddle_id": riddle.riddle_id,
        "riddle_question": riddle.riddle_question,
        "riddle_answer": riddle.riddle_answer,
        "riddle_file": riddle.riddle_file,
    }


def serialize_test_case(test_case: TestCase) -> dict:
    return {
        "test_case_id": test_case.test_case_id,
        "question_id": test_case.question_id,
        "input_data": test_case.input_data,
        "expected_output": test_case.expected_output,
    }


@questions_router.get(
    "/get-all-questions",
    response_model=PaginatedQuestionsResponse,
    responses={500: {"description": "Failed to retrieve questions."}}
)
def get_all_questions(
    response: Response,
    db: Annotated[Session, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = DEFAULT_PAGE_SIZE,
    search: Annotated[Optional[str], Query(max_length=200)] = None,
    difficulty: Annotated[Optional[Literal["easy", "medium", "hard"]], Query()] = None,
    sort: Annotated[Literal["asc", "desc"], Query()] = "asc",
):
    try:
        query = db.query(Question)

        if search and search.strip():
            needle = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Question.question_name.ilike(needle),
                    Question.question_description.ilike(needle),
                )
            )

        if difficulty:
            query = query.filter(Question.difficulty == difficulty)

        if sort == "desc":
            query = query.order_by(Question.question_id.desc())
        else:
            query = query.order_by(Question.question_id.asc())

        total = query.count()
        offset = (page - 1) * page_size
        questions = query.offset(offset).limit(page_size).all()

        response.headers["Cache-Control"] = "public, max-age=60"

        logger.info(
            "Fetched %s question(s) for page=%s, page_size=%s (total=%s).",
            len(questions),
            page,
            page_size,
            total,
        )
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": [serialize_question(question) for question in questions],
        }
    except Exception as e:
        logger.error(f"Error fetching questions: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve questions.")


@questions_router.get(
    "/question",
    responses={500: {"description": "Failed to retrieve question."}}
)
def get_question(db: Annotated[str, Depends(get_db)], question_id: int):
    try:
        question = db.query(Question).filter_by(question_id = question_id).first()
        logger.info("Fetched question from the database.")
        return { 'status_code': 200, 'data': question}
    except Exception as e:
        logger.error(f"Error fetching question: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve question. Exception: {str(e)}")


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


def get_question_from_request(db: Session, request: CreateQuestionRequest) -> Question:
    existing_tags = db.query(Tag).filter(Tag.tag_name.in_(request.tags)).all()
    new_tags = [Tag(tag_name=tag_name) for tag_name in request.tags if
                tag_name not in [tag.tag_name for tag in existing_tags]]
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


@questions_router.post(
    "/upload-question", status_code=201,
    responses={500: {"description": "Failed to upload question."}}
)
def upload_question(question_request: CreateQuestionRequest, db: Annotated[str, Depends(get_db)]):
    try:
        question = get_question_from_request(db, question_request)
        db.add(question)
        db.commit()
        db.refresh(question)
        logger.info(f"Uploaded new question with ID: {question.question_id}")

        # Track question upload
        track_custom_event(
            user_id="admin",  # Questions are typically uploaded by admins
            event_name="question_uploaded",
            properties={
                "question_id": question.question_id,
                "question_name": question.question_name,
                "difficulty": question_request.difficulty,
                "tag_count": len(question_request.tags),
                "testcase_count": len(question_request.testcases),
            }
        )

        return {"message": f"Successfully uploaded question with ID: {question.question_id}"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error uploading question: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload question.")


@questions_router.post("/upload-question-batch", status_code=201,
                       responses={500: {"description": "Failed to upload question batch."}}
                       )
def upload_question_batch(question_request: list[CreateQuestionRequest], db: Annotated[str, Depends(get_db)]):
    try:
        questions = [
            get_question_from_request(db, q) for q in question_request
        ]
        db.add_all(questions)
        db.commit()
        logger.info(f"Uploaded batch of {len(questions)} questions.")

        # Track batch upload
        track_custom_event(
            user_id="admin",
            event_name="questions_batch_uploaded",
            properties={
                "question_count": len(questions),
                "difficulties": [q.difficulty for q in question_request],
            }
        )

        return {"message": f"Successfully uploaded {len(questions)} questions."}
    except Exception as e:
        db.rollback()
        logger.error(f"Error uploading question batch: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload question batch.")


@questions_router.get(
    "/get-all-riddles",
    response_model=PaginatedRiddlesResponse,
    responses={500: {"description": "Failed to retrieve questions."}}
)
def get_all_riddles(
    response: Response,
    db: Annotated[Session, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = DEFAULT_PAGE_SIZE,
    search: Annotated[Optional[str], Query(max_length=200)] = None,
):
    try:
        query = db.query(Riddle)

        if search and search.strip():
            needle = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Riddle.riddle_question.ilike(needle),
                    Riddle.riddle_answer.ilike(needle),
                )
            )

        query = query.order_by(Riddle.riddle_id.desc())

        total = query.count()
        offset = (page - 1) * page_size
        riddles = query.offset(offset).limit(page_size).all()

        response.headers["Cache-Control"] = "public, max-age=60"

        logger.info(
            "Fetched %s riddle(s) for page=%s, page_size=%s (total=%s).",
            len(riddles),
            page,
            page_size,
            total,
        )
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": [serialize_riddle(riddle) for riddle in riddles],
        }
    except Exception as e:
        logger.error(f"Error fetching riddles: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve riddles.")


@questions_router.get(
    "/get-all-testcases/{question_id}",
    response_model=list[TestCaseResponse],
    responses={500: {"description": "Failed to upload test cases."}}
)
def get_all_testcases(question_id: int, db: Annotated[Session, Depends(get_db)]):
    try:
        testcases = db.query(TestCase).filter_by(question_id=question_id).all()
        logger.info(f"Fetched {len(testcases)} test cases from the database.")
        return [serialize_test_case(test_case) for test_case in testcases]
    except Exception as e:
        logger.error(f"Error fetching test cases: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve test cases.")