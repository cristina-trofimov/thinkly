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
    submitted_on: str # CHNAGE
    time: int
    status: str
    memory: int
    stdout: str
    stderr: str


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
        db.add(SubmissionModel(
            user_id = sub_request['user_id'],
            question_instance_id = sub_request['question_instance_id'],
            compile_output = sub_request['compile_output'],
            submitted_on = sub_request['submitted_on'],
            time = sub_request['time'],
            status = sub_request['status'],
            memory = sub_request['memory'],
            stdout = sub_request['stdout'],
            stderr = sub_request['stderr'],
        ))
        db.commit()

        logger.info(f"Uploaded submission.")

        return {"status_code": 200, "message": f"Successfully uploaded submission"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error uploading submissions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload submissions. Exception: {str(e)}")
