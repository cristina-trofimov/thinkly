# pip install sqlalchemy psycopg2-binary IF NEEDED
#go to db.py and change username and password and db name if needed
# run python -m src.init_db


from src.db import Base, engine
from src.models import schema

def init_db():
    print("Creating all tables...")
    Base.metadata.create_all(engine)
    print("✅ Tables created successfully!")

if __name__ == "__main__":
    init_db()
