import logging, datetime
from typing import Annotated
from database_operations.database import get_db
from models.schema import Submission
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel

logger = logging.getLogger(__name__)

submission_router = APIRouter(tags=["Attempts"])

class SubmissionModel(BaseModel):
    submission_id: int
    user_question_instance_id: int
    compile_output: str | None
    status: str
    runtime: int | None
    memory: int | None
    submitted_on: str
    stdout: str | None
    stderr: str | None
    message: str | None

@submission_router.get("/all",
    responses={500: {"description": "Error retrieving submissions."}}
)
def get_all_submissions(
    db: Annotated[str, Depends(get_db)],
    user_question_instance_id: Annotated[int, Query()] = None
):
    try:
        subs = db.query(Submission).filter_by(user_question_instance_id = user_question_instance_id).all()
        logger.info(f"Fetched {len(subs)} submissions from the database.")

        return {"status_code": 200, "data": [
            SubmissionModel(
                submission_id = sub.submission_id,
                user_question_instance_id = sub.user_question_instance_id,
                compile_output = sub.compile_output,
                submitted_on = sub.submitted_on,
                runtime = sub.runtime,
                status = sub.status,
                memory = sub.memory,
                stdout = sub.stdout,
                stderr = sub.stderr,
                message = sub.message
            )
            for sub in subs
        ]}
    except Exception as e:
        logger.error(f"Error fetching submissions: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve submissions.")


@submission_router.post("/add",
    status_code=201,
    responses={500: {"description": "Failed to upload most recent submission."}}
)
def save_sub(
    db: Annotated[str, Depends(get_db)],
    sub_request: dict,
):
    try:
        sub = SubmissionModel(
                user_question_instance_id = sub_request['user_question_instance_id'],
                compile_output = sub_request['compile_output'],
                submitted_on = sub_request['submitted_on'],
                runtime = sub_request['runtime'],
                status = sub_request['status'],
                memory = sub_request['memory'],
                stdout = sub_request['stdout'],
                stderr = sub_request['stderr'],
                message = sub_request['message'],
            )
        db.add(sub)
        db.commit()
        db.refresh(sub)

        logger.info("Uploaded submission.")

        return {"status_code": 200, "data": SubmissionModel(
                submission_id = sub.submission_id,
                user_question_instance_id = sub.user_question_instance_id,
                compile_output = sub.compile_output,
                submitted_on = sub.submitted_on,
                runtime = sub.runtime,
                status = sub.status,
                memory = sub.memory,
                stdout = sub.stdout,
                stderr = sub.stderr,
                message = sub.message
            )}
    except Exception as e:
        db.rollback()
        logger.error(f"Error uploading submissions: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload submission.")