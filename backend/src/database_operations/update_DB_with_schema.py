from sqlalchemy import text
from dotenv import load_dotenv

from database_operations.db import Base, engine

load_dotenv()

print("Dropping and recreating schema...")
with engine.connect() as conn:
    conn.execute(text("DROP SCHEMA public CASCADE"))
    conn.execute(text("CREATE SCHEMA public"))
    conn.commit()

Base.metadata.create_all(bind=engine)
print("✅ All tables created successfully.")