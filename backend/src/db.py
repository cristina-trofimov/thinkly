from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# You can load this from an environment variable or .env file
# username: postgres
# password: postgres
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://postgres:postgres@localhost:5432/ThinklyDB"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

Base = declarative_base()
