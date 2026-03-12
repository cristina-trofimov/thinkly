import logging
from typing import Annotated
from database_operations.database import get_db
from models.schema import Language
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel

logger = logging.getLogger(__name__)

languages_router = APIRouter(tags=["Languages"])

class LanguageModel(BaseModel):
    row_id: int
    lang_judge_id: int
    display_name: str
    active: bool
    monaco_id: str

@languages_router.get("/all",
    responses={500: {"description": "Error retrieving languages."}}
)
def get_all_languages(db: Annotated[str, Depends(get_db)], active: Annotated[bool, Query()] = None):
    try:
        langs = db.query(Language)

        if active is not None:
            langs = langs.filter_by(active = active)

        langs = langs.order_by(Language.display_name.asc()).all()

        logger.info(f"Fetched {len(langs)} languages from the database.")

        return {"status_code": 200, "data": [
            LanguageModel(
                row_id = lang.row_id,
                lang_judge_id = lang.lang_judge_id,
                display_name = lang.display_name,
                active = lang.active,
                monaco_id = lang.monaco_id
            ).model_dump()
            for lang in langs]
        }
    except Exception as e:
        logger.error(f"Error fetching languages: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve languages.")

@languages_router.get("/{lang_judge_id}",
    responses={500: {"description": "Error retrieving languages."}}
)
def get_language_by_id(
    db: Annotated[str, Depends(get_db)],
    lang_judge_id: int
):
    try:
        lang = db.query(Language).filter_by(lang_judge_id = int(lang_judge_id)).first()
        logger.info(f"Fetched a language from the database.")

        return {"status_code": 200, "data":
            LanguageModel(
                row_id = lang.row_id,
                lang_judge_id = lang.lang_judge_id,
                display_name = lang.display_name,
                active = lang.active,
                monaco_id = lang.monaco_id
            ).model_dump()
        }
    except Exception as e:
        logger.error(f"Error fetching languages: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve a language by id.")


@languages_router.post("/add",
    status_code=201,
    responses={
        500: {"description": "Failed to upload a language."},
        412: {"description": "Language already exists"}
    }
)
def save_sub(
    db: Annotated[str, Depends(get_db)],
    sub_request: dict,
):
    try:
        lang = db.query(Language).filter_by(lang_judge_id = int(sub_request['lang_judge_id'])).first()

        if lang: 
            return {"status_code": 412, "error": "Language already exists"}
        else:
            lang = Language(
                lang_judge_id = int(sub_request['lang_judge_id']),
                display_name = sub_request['display_name'],
                active = sub_request['active'],
                monaco_id = sub_request['monaco_id'],
            )
            db.add(lang)
            db.commit()
            db.refresh(lang)

            logger.info("Uploaded language.")

            return {"status_code": 200, "data": 
                LanguageModel(
                    row_id = lang.row_id,
                    lang_judge_id = lang.lang_judge_id,
                    display_name = lang.display_name,
                    active = lang.active,
                    monaco_id = lang.monaco_id
                ).model_dump()
            }
    except Exception as e:
        db.rollback()
        logger.error(f"Error uploading a language: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload a language.")


@languages_router.patch("/update",
    status_code=201,
    responses={
        500: {"description": "Failed to update a language."},
        404: {"description": "Language not found"}
    }
)
def save_sub(
    db: Annotated[str, Depends(get_db)],
    sub_request: dict,
):
    try:
        lang = db.query(Language).filter_by(lang_judge_id = int(sub_request['lang_judge_id'])).first()

        if not lang: 
            return {"status_code": 404, "error": "Language not found"}
        else:
            lang.lang_judge_id = int(sub_request['lang_judge_id'])
            lang.display_name = sub_request['display_name']
            lang.active = sub_request['active']
            lang.monaco_id = sub_request['monaco_id']

            db.commit()
            db.refresh(lang)

            logger.info("Updating a language.")

            return {"status_code": 200, "data": 
                LanguageModel(
                    row_id = lang.row_id,
                    lang_judge_id = lang.lang_judge_id,
                    display_name = lang.display_name,
                    active = lang.active,
                    monaco_id = lang.monaco_id
                ).model_dump()
            }
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating a language: {e}")
        raise HTTPException(status_code=500, detail="Failed to update a language.")