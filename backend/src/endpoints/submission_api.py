import logging
from typing import Annotated
from pydantic import BaseModel
from DB_Methods.database import get_db
from models.schema import Submission
from fastapi import APIRouter, HTTPException, Depends, Query

logger = logging.getLogger(__name__)

submission_router = APIRouter(tags=["Attempts"])

class SubmissionModel(BaseModel):
    user_id: int
    question_instance_id: int
    compile_output: str
    submitted_on: str
    runtime: float | None = None
    status: str | None = None
    memory: int | None = None
    stdout: str | None = None
    stderr: str | None = None
    message: str | None = None


@submission_router.get("/all",
    responses={400: {"description": "Error retrieving submissions."}}
)
def get_all_submissions(
    db: Annotated[str, Depends(get_db)],
    user_id: int = Query(None),
    question_instance_id: int = Query(None),
):
    try:
        subs = db.query(Submission).filter_by(
            user_id = int(user_id),
            question_instance_id = int(question_instance_id)
            ).all()
        logger.info(f"Fetched {len(subs)} submissions from the database.")

        return {"status_code": 200, **subs}
    except Exception as e:
        logger.error(f"Error fetching submissions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve submissions. Exception: {str(e)}")


@submission_router.post("/add",
    status_code=201,
    responses={500: {"description": "Failed to upload most recent submission."}}
)
def save_most_recent_sub(
    db: Annotated[str, Depends(get_db)],
    sub_request: dict,
):
    try:
        db.add(Submission(
            user_id = sub_request['user_id'],
            question_instance_id = int(sub_request['question_instance_id']),
            compile_output = sub_request['compile_output'],
            submitted_on = sub_request['submitted_on'],
            runtime = float(sub_request['runtime']) if sub_request['runtime'] is not None else None,
            status = sub_request['status'],
            memory = int(sub_request['memory']) if sub_request['memory'] is not None else None,
            stdout = sub_request['stdout'] if sub_request['stdout'] is not None else None,
            stderr = sub_request['stderr'] if sub_request['stderr'] is not None else None,
            message = sub_request['message'] if sub_request['message'] is not None else None,
        ))
        db.commit()

        logger.info(f"Uploaded submission.")

        return {"status_code": 200, "message": f"Submission sucessful"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error uploading submissions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload submissions. Exception: {str(e)}")
