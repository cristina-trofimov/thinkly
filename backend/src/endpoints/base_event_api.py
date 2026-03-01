import logging
from typing import Annotated
from sqlalchemy.orm import Session
from DB_Methods.database import get_db
from models.schema import BaseEvent
from sqlalchemy.exc import SQLAlchemyError
from fastapi import APIRouter, HTTPException, Depends, Query

logger = logging.getLogger(__name__)

base_event_router = APIRouter(tags=["Events"])

def query_get_event(db: Session, event_id: int ):  
    try:
        query = db.query(BaseEvent).filter_by(event_id = event_id).first()

        logger.info("Fetched event.")
        
        return query
    except SQLAlchemyError as e:
        logger.error(f"Database: getting event query error: {e}")
        raise HTTPException(status_code=500, detail=f"Database: getting event query error: {str(e)}")


@base_event_router.get("/find", response_model = dict,
    responses={500: {"description": "Error retrieving event."}}
)
def get_event(
    db: Annotated[Session, Depends(get_db)],
    event_id: int,
):
    try:
        query = query_get_event(db, event_id)

        logger.info("Fetched event from the database.")

        return {"status_code": 200, 'data': query}
    except Exception as e:
        logger.error(f"Error fetching event: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve event. Exception: {str(e)}")
        
    

@base_event_router.post("/update",
    status_code=201,
    responses={500: {"description": "Failed to upload event."}}
)
def create_event(
    db: Annotated[Session, Depends(get_db)],
    request: dict,
):
    try:
        instance = query_get_event(db, request['event_id'])

        if instance is None:
            instance = BaseEvent(
                event_name = request['event_name'],
                event_location = request['event_location'],
                question_cooldown = request['question_cooldown'],
                event_start_date = request['event_start_date'],
                event_end_date = request['event_end_date'],
                created_at = request['created_at'],
                updated_at = request['updated_at'],
            )
            db.add(instance)
        else:
            instance.event_name = request['event_name']
            instance.event_location = request['event_location']
            instance.question_cooldown = request['question_cooldown']
            instance.event_start_date = request['event_start_date']
            instance.event_end_date = request['event_end_date']
            instance.created_at = request['created_at']
            instance.updated_at = request['updated_at']

        db.commit()
        db.refresh(instance)

        logger.info("Uploaded base event.")

        return {"status_code": 200, 'data': {
            'event_name': instance.event_name,
            'event_location': instance.event_location,
            'question_cooldown': instance.question_cooldown,
            'event_start_date': instance.event_start_date,
            'event_end_date': instance.event_end_date,
            'created_at': instance.created_at,
            'updated_at': instance.updated_at,
        }}
    except Exception as e:
        db.rollback()
        logger.error(f"Error uploading event: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload event. Exception: {str(e)}")
