import logging
from typing import Annotated
from database_operations.database import get_db
from models.schema import Submission
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

submission_router = APIRouter(tags=["Attempts"])

@submission_router.get("/all",
    responses={500: {"description": "Error retrieving submissions."}}
)
def get_all_submissions(
    db: Annotated[Session, Depends(get_db)],
    user_question_instance_id: Annotated[int, Query()],
):
    try:
        subs = db.query(Submission).filter_by(
            user_question_instance_id=user_question_instance_id
        ).all()
        logger.info(f"Fetched {len(subs)} submissions from the database.")

        return {"status_code": 200, "data": [
            {
                "submission_id": sub.submission_id,
                "user_question_instance_id": sub.user_question_instance_id,
                "compile_output": sub.compile_output,
                "submitted_on": sub.submitted_on,
                "runtime": sub.runtime,
                "status": sub.status,
                "memory": sub.memory,
                "stdout": sub.stdout,
                "stderr": sub.stderr,
                "message": sub.message,
            }
            for sub in subs
        ]}
    except Exception as e:
        logger.error(f"Error fetching submissions: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve submissions.")


@submission_router.post("/add",
    status_code=201,
    responses={500: {"description": "Failed to upload submission."}}
)
def save_sub(
    db: Annotated[Session, Depends(get_db)],
    sub_request: dict,
):
    try:
        db.add(Submission(
            user_question_instance_id=int(sub_request['user_question_instance_id']),
            compile_output=sub_request.get('compile_output'),
            submitted_on=sub_request['submitted_on'],
            runtime=float(sub_request['runtime']) if sub_request.get('runtime') is not None else None,
            status=sub_request.get('status'),
            memory=int(sub_request['memory']) if sub_request.get('memory') is not None else None,
            stdout=sub_request.get('stdout'),
            stderr=sub_request.get('stderr'),
            message=sub_request.get('message'),
        ))
        db.commit()

        logger.info("Uploaded submission.")

        return {"status_code": 200, "message": "Submission successful"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error uploading submissions: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload submission.")