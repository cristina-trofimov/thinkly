from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
import logging

from database_operations.database import get_db
from models.schema import Question, TestCase
# Importing the models and helpers you already wrote in questions.py
from questions_api import (
    TestCaseResponse,
    CreateTestCaseRequest,
    serialize_test_case
)

logger = logging.getLogger(__name__)

# Prefixing with /testcase so all routes start with /testcase/
testcase_router = APIRouter(prefix="/testcase", tags=["TestCases"])

@testcase_router.get(
    "/{question_id}",
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

@testcase_router.post(
    "/{question_id}", 
    status_code=201,
    response_model=TestCaseResponse
)
def create_testcase(
    question_id: int, 
    test_case_request: CreateTestCaseRequest, 
    db: Annotated[Session, Depends(get_db)]
):
    """Create a single test case for a specific question."""
    try:
        if not db.query(Question).filter_by(question_id=question_id).first():
            raise HTTPException(status_code=404, detail="Question not found")

        new_tc = TestCase(
            question_id=question_id,
            input_data=test_case_request.input_data,
            expected_output=test_case_request.expected_output
        )

        db.add(new_tc)
        db.commit()
        db.refresh(new_tc)
        
        logger.info(f"Created test case {new_tc.test_case_id} for question {question_id}")
        return TestCaseResponse.from_testcase(new_tc)
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating test case: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload test case.")

@testcase_router.delete("/{test_case_id}", status_code=204)
def delete_testcase(test_case_id: int, db: Annotated[Session, Depends(get_db)]):
    """Delete a specific test case by its unique ID."""
    tc = db.query(TestCase).filter_by(test_case_id=test_case_id).first()
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")
    
    db.delete(tc)
    db.commit()
    return None