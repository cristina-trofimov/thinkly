from sqlalchemy import text

try:
    from src.database_operations.db import engine
    from src.models.schema import Base, LongTermStatistics
except ModuleNotFoundError:
    from database_operations.db import engine
    from models.schema import Base, LongTermStatistics

TABLE_NAME = "long_term_statistics"
TARGET_FK = "base_event(event_id)"


def create_long_term_statistics_table() -> None:
    """Create the long_term_statistics table if it does not already exist."""
    Base.metadata.create_all(bind=engine, tables=[LongTermStatistics.__table__], checkfirst=True)
    print("long_term_statistics migration completed successfully.")


if __name__ == "__main__":
    create_long_term_statistics_table()
