# pip install sqlalchemy psycopg2-binary IF NEEDED
#go to db.py and change username and password and db name if needed
# cd src and then run python init_db.py


from db import Base, engine
import models

def init_db():
    print("Creating all tables...")
    Base.metadata.create_all(engine)
    print("✅ Tables created successfully!")

if __name__ == "__main__":
    init_db()
