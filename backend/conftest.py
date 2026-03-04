import os
import pytest

# 1. SET ENV VARS FIRST (Before any other imports)
os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["JWT_SECRET_KEY"] = "test_secret_key"
os.environ["GOOGLE_CLIENT_ID"] = "test_google_client"
os.environ["BREVO_API_KEY"] = "mock_key"
os.environ["DEFAULT_SENDER_EMAIL"] = "test_sender@example.com"
os.environ["SUPABASE_URL"] = "https://mock.supabase.co"
os.environ["SUPABASE_ANON_KEY"] = "mock_key"

# 2. NOW import the app
from main import app 
from endpoints.authentification_api import get_current_user

# 3. Apply the Mock
async def mocked_get_current_user():
    return {
        "sub": "test@example.com", 
        "role": "admin", 
        "id": 1
    }

app.dependency_overrides[get_current_user] = mocked_get_current_user

# You can keep this empty or remove it if not needed for other config
def pytest_configure(config):
    pass