from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import logging

from database_operations.database import get_db
from models.schema import Question, TestCase

from endpoints.questions_api import (
    TestCaseResponse,
    serialize_test_case
)

logger = logging.getLogger(__name__)


testcase_router = APIRouter(tags=["TestCases"])

@testcase_router.get(
    "/get-all-testcases/{question_id}",
    response_model=List[TestCaseResponse],
    responses={
        404: {"description": "Question not found."},
        500: {"description": "Failed to retrieve test cases."}
    }
)
def get_all_testcases(question_id: int, db: Annotated[Session, Depends(get_db)]):
    """Retrieve all test cases for a specific question."""
    try:
        # Check if question exists first to provide a better error message
        question_exists = db.query(Question).filter(Question.question_id == question_id).first()
        if not question_exists:
            raise HTTPException(status_code=404, detail=f"Question {question_id} not found")

        testcases = db.query(TestCase).filter_by(question_id=question_id).all()
        logger.info(f"Fetched {len(testcases)} test cases for question {question_id}")
        
        # Using your existing serialization helper
        return [serialize_test_case(tc) for tc in testcases]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching test cases: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve test cases.")

