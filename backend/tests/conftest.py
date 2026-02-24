import os
import pytest

# This function runs BEFORE any of your app code is imported by pytest
def pytest_configure(config):
    # Fix for Brevo SystemExit
    os.environ["BREVO_API_KEY"] = "mock_key"
    os.environ["DEFAULT_SENDER_EMAIL"] = "test@example.com"
    
    # Fix for Database ValueError
    # We use a mock sqlite URL to satisfy the 'if not DATABASE_URL' check
    os.environ["DATABASE_URL"] = "sqlite:///./test.db"
    
    # Other necessary env vars
    os.environ["JWT_SECRET_KEY"] = "test_secret_key"
    os.environ["GOOGLE_CLIENT_ID"] = "test_google_client"