import logging
from typing import Annotated
from pydantic import BaseModel
from DB_Methods.database import get_db
from models.schema import MostRecentSubmission
from fastapi import APIRouter, HTTPException, Depends, Query

logger = logging.getLogger(__name__)

most_recent_sub_router = APIRouter(tags=["Recent_subs"])

class MostRecentSub(BaseModel):
    user_id: int
    question_instance_id: int
    lang_judge_id: int
    code: str


@most_recent_sub_router.get("/latest",
    responses={400: {"description": "Error retrieving most recent submission."}}
)
def get_most_recent_sub(
    db: Annotated[str, Depends(get_db)],
    user_id: int = Query(None),
    question_instance_id: int = Query(None),
):
    try:
        sub = db.query(MostRecentSubmission).filter_by(
            user_id = int(user_id),
            question_instance_id = int(question_instance_id)
            ).all()
        logger.info("Fetched most recent submission from the database.")

        return {"status_code": 200, **sub}
    except Exception as e:
        logger.error(f"Error fetching most recent submission: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve most recent submission. Exception: {str(e)}")


@most_recent_sub_router.post("/update",
    status_code=201,
    responses={500: {"description": "Failed to upload most recent submission."}}
)
def save_most_recent_sub(
    db: Annotated[str, Depends(get_db)],
    sub_request: dict,
):
    print("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n")
    print(sub_request)
    print("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
    try:
        sub = get_most_recent_sub(db, {
            "user_id": sub_request.user_id,
            "question_instance_id": sub_request.question_instance_id
        })
        
        if sub is None:
            db.add(MostRecentSubmission(
                user_id = sub_request['user_id'],
                question_instance_id = sub_request['question_instance_id'],
                lang_judge_id = sub_request['lang_judge_id'],
                code = sub_request['code'],
            ))
        else:
            sub.user_id = sub_request['user_id']
            sub.question_instance_id = sub_request['question_instance_id']
            sub.lang_judge_id = sub_request['lang_judge_id']
            sub.code = sub_request['code']

        db.commit()

        logger.info("Uploaded most recent submission.")

        return {"status_code": 200, "message": "Successfully uploaded most recent submission"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error uploading most recent submission: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload most recent submission. Exception: {str(e)}")
