import json
from typing import Annotated, Literal, Optional, List, Any as AnyJSONNode
from datetime import datetime, timezone
from email.utils import format_datetime, parsedate_to_datetime
from fastapi import APIRouter, Depends, HTTPException, Body, Query, Response, Request
from pydantic import BaseModel, Field, ConfigDict, model_validator
from sqlalchemy import or_, func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, DataError
from models.schema import Language, Question, QuestionLanguageSpecificProperties, Riddle, Tag, TestCase
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

    @staticmethod
    def from_tag(tag: Tag):
        return TagResponse(
            tag_id=getattr(tag, "tag_id", 0),
            tag_name=getattr(tag, "tag_name", "")
        )

class TestCaseResponse(BaseModel):
    test_case_id: int
    question_id: int
    input_data: AnyJSONNode
    expected_output: AnyJSONNode

    @staticmethod
    def from_testcase(tc: TestCase):
        return TestCaseResponse(
            test_case_id=getattr(tc, "test_case_id", 0),
            question_id=getattr(tc, "question_id", 0),
            input_data=getattr(tc, "input_data", None),
            expected_output=getattr(tc, "expected_output", None)
        )

class QuestionLanguageSpecificPropertiesResponse(BaseModel):
    question_id: int
    language_id: int
    language_display_name: str
    from_json_function: str
    to_json_function: str
    preset_code: str
    template_solution: str

    @staticmethod
    def from_question_language_specific_properties(qlsp: QuestionLanguageSpecificProperties):
        return QuestionLanguageSpecificPropertiesResponse(
            question_id=getattr(qlsp, "question_id", 0),
            language_id=getattr(qlsp, "language_id", 0),
            language_display_name=getattr(getattr(qlsp, "language", None), "display_name", ""),
            from_json_function=getattr(qlsp, "from_json_function", ""),
            to_json_function=getattr(qlsp, "to_json_function", ""),
            preset_code=getattr(qlsp, "preset_code", ""),
            template_solution=getattr(qlsp, "template_solution", "")
        )

class QuestionListItemResponse(BaseModel):
    question_id: int
    question_name: str
    question_description: str
    media: str | None = None
    difficulty: str
    language_specific_properties: List[QuestionLanguageSpecificPropertiesResponse]
    test_cases: List[TestCaseResponse]
    created_at: str
    last_modified_at: str
    tags: List[TagResponse]

    @staticmethod
    def from_question(question: Question) -> "QuestionListItemResponse":
        return QuestionListItemResponse(
            question_id=question.question_id,
            question_name=question.question_name,
            question_description=question.question_description,
            media=question.media,
            difficulty=question.difficulty,
            language_specific_properties=[
                QuestionLanguageSpecificPropertiesResponse.from_question_language_specific_properties(qlsp)
                for qlsp in getattr(question, "language_specific_properties", [])
            ],
            test_cases=[TestCaseResponse.from_testcase(tc) for tc in getattr(question, "test_cases", [])],
            created_at=question.created_at.isoformat(),
            last_modified_at=question.last_modified_at.isoformat(),
            tags=[TagResponse.from_tag(tag) for tag in getattr(question, "tags", [])],
        )


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


def apply_text_search(query, search: Optional[str], *columns):
    if search and search.strip():
        needle = f"%{search.strip()}%"
        query = query.filter(or_(*(column.ilike(needle) for column in columns)))
    return query


def paginate_query(query, page: int, page_size: int):
    total = query.count()
    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()
    return total, items


def build_paginated_response(total: int, page: int, page_size: int, items: list[dict]) -> dict:
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": items,
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
    "/get-question-by-id/{question_id}",
    response_model=QuestionListItemResponse,
    responses={
        404: {"description": "Question not found."},
        500: {"description": "Failed to retrieve question."},
    }
)
def get_question_by_id(question_id: int, db: Annotated[Session, Depends(get_db)]):
    try:
        question: Question = db.query(Question).filter(Question.question_id == question_id).first()
        if not question:
            raise HTTPException(status_code=404, detail=f"Question with id {question_id} not found")
        logger.info(f"Fetched question with ID {question_id}")
        return QuestionListItemResponse.from_question(question)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching question with ID: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve question with id {question_id}")

@questions_router.get(
    "/get-all-questions",
    response_model=PaginatedQuestionsResponse,
    responses={500: {"description": "Failed to retrieve questions."}}
)
def get_all_questions(
    request: Request,
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
        query = apply_text_search(
            query,
            search,
            Question.question_name,
            Question.question_description,
        )

        if difficulty:
            query = query.filter(Question.difficulty == difficulty)

        latest_modified = query.with_entities(func.max(Question.last_modified_at)).scalar()
        if latest_modified is None:
            latest_modified = datetime.now(timezone.utc)
        elif latest_modified.tzinfo is None:
            latest_modified = latest_modified.replace(tzinfo=timezone.utc)
        else:
            latest_modified = latest_modified.astimezone(timezone.utc)
        latest_modified = latest_modified.replace(microsecond=0)

        common_headers = {
            "Cache-Control": "no-cache, must-revalidate",
            "Last-Modified": format_datetime(latest_modified, usegmt=True),
        }

        if_modified_since = request.headers.get("if-modified-since")
        if if_modified_since:
            try:
                client_timestamp = parsedate_to_datetime(if_modified_since).astimezone(timezone.utc)
                if client_timestamp >= latest_modified:
                    return Response(status_code=304, headers=common_headers)
            except (TypeError, ValueError):
                logger.warning("Invalid If-Modified-Since header: %s", if_modified_since)

        if sort == "desc":
            query = query.order_by(Question.question_id.desc())
        else:
            query = query.order_by(Question.question_id.asc())

        total, questions = paginate_query(query, page, page_size)

        response.headers.update(common_headers)

        logger.info(
            "Fetched %s question(s) for page=%s, page_size=%s (total=%s).",
            len(questions),
            page,
            page_size,
            total,
        )
        return build_paginated_response(
            total,
            page,
            page_size,
            [QuestionListItemResponse.from_question(question) for question in questions],
        )
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

class CreateLanguageSpecificPropertiesRequest(BaseModel):
    language_name: str
    preset_code: str
    from_json_function: str
    to_json_function: str
    template_solution: str

class CreateTestCaseRequest(BaseModel):
    input_data: AnyJSONNode
    expected_output: AnyJSONNode

    @model_validator(mode="before")
    @classmethod
    def allow_tuple_payload(cls, value):
        if isinstance(value, (list, tuple)) and len(value) == 2:
            return {
                "input_data": value[0],
                "expected_output": value[1],
            }
        return value

class CreateQuestionRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    question_name: str
    question_description: str
    media: str | None = None
    difficulty: str = "easy"
    language_specific_properties: List[CreateLanguageSpecificPropertiesRequest] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    test_cases: List[CreateTestCaseRequest] = Field(default_factory=list, alias="testcases")


def get_question_from_request(db: Session, request: CreateQuestionRequest) -> Question:
    existing_tags = db.query(Tag).filter(Tag.tag_name.in_(request.tags)).all()
    new_tags = [Tag(tag_name=tag_name) for tag_name in request.tags if
                tag_name not in [tag.tag_name for tag in existing_tags]]
    question = Question(
        question_name=request.question_name,
        question_description=request.question_description,
        media=request.media,
        difficulty=request.difficulty,
        tags=existing_tags + new_tags
    )

    question.language_specific_properties = [QuestionLanguageSpecificProperties(
        question_id=question.question_id,
        language=db.query(Language).filter(Language.display_name == qlsp.language_name).first(),
        preset_code=qlsp.preset_code,
        from_json_function=qlsp.from_json_function,
        to_json_function=qlsp.to_json_function,
        template_solution=qlsp.template_solution
    ) for qlsp in request.language_specific_properties]

    return question


@questions_router.post(
    "/upload-question", status_code=201,
    responses={500: {"description": "Failed to upload question."}}
)
def upload_question(question_request: CreateQuestionRequest, db: Annotated[Session, Depends(get_db)]):
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
                "testcase_count": len(question_request.test_cases),
            }
        )

        return {"message": f"Successfully uploaded question with ID: {question.question_id}"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error uploading question: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload question.")


@questions_router.post("/upload-question-batch", status_code=201,
    responses={ 500: { "description": "Failed to upload question batch." } }
)
def upload_question_batch(
    question_request: Annotated[list[CreateQuestionRequest], Body(min_length=1)],
    db: Annotated[Session, Depends(get_db)],
):
    error_message = None
    error_code = 500
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
    except IntegrityError as e:
        error_message = getattr(e.orig, 'diag', {}).message_detail or "Duplicate entry found."
        error_code = 409
        logger.warning(f"Integrity Error: {e}")
    except DataError as e:
        error_message = str(e.orig).split('\n')[0]
        error_code = 400
        logger.warning(f"Data validation error: {e}")
    except Exception as e:
        error_message = str(e)
        error_code = 500
        logger.error(f"Error uploading question batch: {e}")

    db.rollback()
    raise HTTPException(status_code=error_code, detail=f"Failed to upload question batch: {error_message}")
        
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
        query = apply_text_search(
            query,
            search,
            Riddle.riddle_question,
            Riddle.riddle_answer,
        )

        query = query.order_by(Riddle.riddle_id.desc())

        total, riddles = paginate_query(query, page, page_size)

        response.headers["Cache-Control"] = "public, max-age=60"

        logger.info(
            "Fetched %s riddle(s) for page=%s, page_size=%s (total=%s).",
            len(riddles),
            page,
            page_size,
            total,
        )
        return build_paginated_response(
            total,
            page,
            page_size,
            [serialize_riddle(riddle) for riddle in riddles],
        )
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

class BatchDeleteQuestionsRequest(BaseModel):
    question_ids: list[int]

@questions_router.delete(
    "/batch-delete",
    responses={500: {"description": "Error deleting questions."}},
)
def batch_delete_questions(payload: BatchDeleteQuestionsRequest, db: Annotated[Session, Depends(get_db)]):
    try:
        requested_ids = list(dict.fromkeys(payload.question_ids))
        existing_ids = [
            row.question_id
            for row in db.query(Question.question_id)
            .filter(Question.question_id.in_(requested_ids))
            .all()
        ]
        if existing_ids:
            deleted_count = (
                db.query(Question)
                .filter(Question.question_id.in_(existing_ids))
                .delete(synchronize_session=False)
            )
        else:
            deleted_count = 0
        db.commit()
        logger.info(f"Deleted {deleted_count} questions from the database.")

        existing_set = set(existing_ids)
        missing_ids = [question_id for question_id in requested_ids if question_id not in existing_set]
        errors = [{"question_id": question_id, "error": "Question not found."} for question_id in missing_ids]

        return {
            "deleted_count": deleted_count,
            "deleted_questions": [{"question_id": question_id} for question_id in existing_ids],
            "total_requested": len(requested_ids),
            "errors": errors,
        }
    except Exception as e:
        logger.error(f"Error deleting questions: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Error deleting questions.")
    
@questions_router.put(
    '/update-question/{question_id}',
    responses={
        404: {"description": "Question not found."},
        500: {"description": "Update failed."},
    },
)
def update_question(question_id: int, question_request: CreateQuestionRequest, db: Annotated[Session, Depends(get_db)]):
    try:
        db_question = db.query(Question).filter(Question.question_id == int(question_id)).first()
        if not db_question:
            raise HTTPException(
                status_code=404,
                detail=f"Update failed: Question with id {question_id} not found"
            )
        for old_qlsp in getattr(db_question, "language_specific_properties", []):
            db.delete(old_qlsp)
        db_question.language_specific_properties = []
        for qlsp in question_request.language_specific_properties:
            language = db.query(Language).filter(Language.display_name == qlsp.language_name).first()
            if language is None:
                continue
            db_question.language_specific_properties.append(
                QuestionLanguageSpecificProperties(
                    question_id=db_question.question_id,
                    language=language,
                    preset_code=qlsp.preset_code,
                    from_json_function=qlsp.from_json_function,
                    to_json_function=qlsp.to_json_function,
                    template_solution=qlsp.template_solution,
                )
            )
        
        db_question.question_name=question_request.question_name
        db_question.question_description=question_request.question_description
        db_question.media=question_request.media
        db_question.difficulty=question_request.difficulty
        
        existing_tags = db.query(Tag).filter(Tag.tag_name.in_(question_request.tags)).all()
        existing_tag_names = [tag.tag_name for tag in existing_tags]
        new_tags = [Tag(tag_name=tag_name) for tag_name in question_request.tags if tag_name not in existing_tag_names]
        db_question.tags = existing_tags + new_tags
        
        for old_tc in getattr(db_question, "test_cases", []):
            db.delete(old_tc)
        
        db_question.test_cases = []
        for tc in question_request.test_cases:
            db_question.test_cases.append(TestCase(
                question_id=db_question.question_id,
                input_data=tc.input_data,
                expected_output=tc.expected_output
            ))

        db.commit()
        db.refresh(db_question)
        logger.info(f"Updated question: {question_id}")
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.warning(f"Error updating question: {question_id}")
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")

