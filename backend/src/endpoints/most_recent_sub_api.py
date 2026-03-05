import logging
from typing import Annotated
from sqlalchemy.orm import Session
from database_operations.database import get_db
from models.schema import MostRecentSubmission
from sqlalchemy.exc import SQLAlchemyError
from fastapi import APIRouter, HTTPException, Depends

logger = logging.getLogger(__name__)

most_recent_sub_router = APIRouter(tags=["Last_Runs"])

def query_get_last_run(
    db: Session, user_id: int,
    question_instance_id: int,
):  
    try:
        query = db.query(MostRecentSubmission).filter_by(user_id = user_id, question_instance_id = question_instance_id).first()

        logger.info("Database: Fetched most recent submission from the database.")
        
        return query
    except SQLAlchemyError as e:
        logger.error(f"Database: getting most recent submission query error: {e}")
        raise HTTPException(status_code=500, detail=f"Database: getting most recent submission query error: {str(e)}")


@most_recent_sub_router.get("/latest", response_model = dict,
    responses={500: {"description": "Error retrieving most recent submission."}}
)
def get_most_recent_sub(
    db: Annotated[Session, Depends(get_db)],
    user_id: int, question_instance_id: int,
):
    try:
        query = query_get_last_run(db, user_id, question_instance_id)

        logger.info("Fetched most recent submission from the database.")

        return {"status_code": 200, 'data': query}
    except Exception as e:
        logger.error(f"Error fetching most recent submission: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve most recent submission. Exception: {str(e)}")
        
    

@most_recent_sub_router.post("/update", status_code=201,
    responses={500: {"description": "Failed to update most recent submission."}}
)
def add_most_recent_sub(
    db: Annotated[Session, Depends(get_db)],
    request: dict,
):
    try:
        recent_run = None

        recent_run = query_get_last_run(db,
            request['user_id'],
            request['question_instance_id']
        )

        if recent_run is None:
            recent_run = MostRecentSubmission(
                user_id = request['user_id'],
                question_instance_id = request['question_instance_id'],
                code = request['code'],
                lang_judge_id = request['lang_judge_id'],
            )
            db.add(recent_run)
        else:
            # update if it exist
            recent_run.user_id = request['user_id'],
            recent_run.question_instance_id = request['question_instance_id'],
            recent_run.code = request['code'],
            recent_run.lang_judge_id = request['lang_judge_id'],

        db.commit()
        db.refresh(recent_run)

        logger.info("Uploaded most recent submission.")

        return {"status_code": 200, 'data': recent_run}
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating most recent submission: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to updating most recent submission. Exception: {str(e)}")
