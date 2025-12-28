import logging
from sqlalchemy import text
from db import engine, Base
from models.schema import (
    UserAccount, UserPreferences, UserSession, 
    BaseEvent, Competition, CompetitionEmail, 
    AlgoTimeSeries, AlgoTimeSession, 
    Question, TestCase, Tag, Riddle, QuestionInstance, 
    Participation, Submission, 
    CompetitionLeaderboardEntry, AlgoTimeLeaderboardEntry
)

# Initialize the logger for the current module 
logger = logging.getLogger(__name__)

def init_db():
    logger.debug("Connecting to the database...")
    
    with engine.connect() as connection:
        trans = connection.begin()
        try:
            logger.debug("Wiping the 'public' schema to remove ALL old tables and constraints...")
            connection.execute(text("DROP SCHEMA public CASCADE;"))
            connection.execute(text("CREATE SCHEMA public;"))
            connection.execute(text("GRANT ALL ON SCHEMA public TO public;"))
            connection.execute(text("COMMENT ON SCHEMA public IS 'standard public schema';"))
            trans.commit()
            logger.info("✅ Database wiped clean. No ghost tables remain.")
        except Exception as e:
            trans.rollback()
            logger.error(f"❌ Failed to wipe database: {e}")
            return

    logger.debug("Creating all tables based on current schema.py...")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database initialized successfully with the latest schema.")
    except Exception as e:
        logger.error(f"❌ Error during table creation: {e}")

if __name__ == "__main__":
    init_db()