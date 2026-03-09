import logging
from typing import Annotated
from database_operations.database import get_db
from models.schema import Language
from fastapi import APIRouter, HTTPException, Depends, Query

logger = logging.getLogger(__name__)

languages_router = APIRouter(tags=["Languages"])

@languages_router.get("/all",
    responses={500: {"description": "Error retrieving languages."}}
)
def get_all_languages(db: Annotated[str, Depends(get_db)]):
    try:
        langs = db.query(Language).all()
        logger.info(f"Fetched {len(langs)} languages from the database.")

        return {"status_code": 200, "data": [
            {
                "row_id": lang.row_id,
                "lang_judge_id": lang.lang_judge_id,
                "display_name": lang.display_name,
                "active": lang.active,
                "monaco_id": lang.monaco_id,
            }
            for lang in langs
        ]}
    except Exception as e:
        logger.error(f"Error fetching languages: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve languages.")

@languages_router.get("",
    responses={500: {"description": "Error retrieving languages."}}
)
def get_language_by_id(
    db: Annotated[str, Depends(get_db)],
    lang_judge_id: int
):
    try:
        langs = db.query(Language).filter_by(lang_judge_id = int(lang_judge_id)).all()
        logger.info(f"Fetched {len(langs)} languages from the database.")

        return {"status_code": 200, "data": [
            {
                "row_id": lang.row_id,
                "lang_judge_id": lang.lang_judge_id,
                "display_name": lang.display_name,
                "active": lang.active,
                "monaco_id": lang.monaco_id,
            }
            for lang in langs
        ]}
    except Exception as e:
        logger.error(f"Error fetching languages: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve languages.")


@languages_router.post("/add",
    status_code=201,
    responses={500: {"description": "Failed to upload a language."}}
)
def save_sub(
    db: Annotated[str, Depends(get_db)],
    sub_request: dict,
):
    try:
        db.add(Language(
            lang_judge_id = int(sub_request['lang_judge_id']),
            display_name = sub_request['display_name'],
            active = sub_request['active'],
            monaco_id = sub_request['monaco_id'],
        ))
        db.commit()

        logger.info("Uploaded language.")

        return {"status_code": 200, "message": "Language sucessful"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error uploading a language: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload a language.")