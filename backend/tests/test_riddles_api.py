import sys
import os
import pytest
from unittest.mock import MagicMock
from types import SimpleNamespace

# --- 1. CI/CD BOOTSTRAP: MOCK SUPABASE BEFORE IMPORTING ROUTER ---
# This prevents 'create_client(SUPABASE_URL, ...)' from crashing on import
os.environ["SUPABASE_URL"] = "https://fake.supabase.co"
os.environ["SUPABASE_ANON_KEY"] = "fake-key"

mock_client = MagicMock()
mock_storage = MagicMock()
mock_bucket = MagicMock()

# Setup the Supabase Chain: supabase.storage.from_("uploads").upload(...)
mock_client.storage = mock_storage
mock_storage.from_.return_value = mock_bucket

# Supabase marker required by your _extract_storage_path_from_public_url logic
FAKE_STORAGE_URL = "https://fake.supabase.co/storage/v1/object/public/uploads/public/test_file.png"
mock_bucket.get_public_url.return_value = FAKE_STORAGE_URL
mock_bucket.upload.return_value = {"path": "public/test_file.png"}
mock_bucket.remove.return_value = {"data": "deleted"}

# Inject the mock into sys.modules
fake_supabase_module = MagicMock()
fake_supabase_module.create_client.return_value = mock_client
sys.modules["supabase"] = fake_supabase_module

# --- 2. IMPORTS ---
from fastapi.testclient import TestClient
from src.main import app 
import src.endpoints.riddles_api as riddles_api
from src.DB_Methods.database import get_db

# --- 3. FIXTURES ---

@pytest.fixture
def mock_db(monkeypatch):
    """Force override the DB session and mock internal commit helper."""
    session = MagicMock()
    # Mock the internal helper used in your router
    monkeypatch.setattr(riddles_api, "_commit_or_rollback", lambda db: None)
    # Override FastAPI dependency
    app.dependency_overrides[get_db] = lambda: session
    yield session
    app.dependency_overrides.clear()

@pytest.fixture
def client():
    return TestClient(app)

# --- 4. THE TESTS ---



def test_get_riddle_by_id_not_found(client, mock_db):
    """Test 404 behavior for missing riddle."""
    mock_db.query.return_value.filter.return_value.first.return_value = None
    response = client.get("/riddles/999")
    assert response.status_code == 404

def test_create_riddle_duplicate_error(client, mock_db):
    """Test business logic: block duplicate questions with 400."""
    # Simulate finding an existing riddle
    mock_db.query.return_value.filter.return_value.first.return_value = SimpleNamespace(riddle_id=1)
    
    response = client.post("/riddles/create", data={"question": "Duplicate?", "answer": "Yes"})
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]



def test_edit_riddle_replace_file(client, mock_db):
    """Test uploading a new file replaces the old one."""
    existing = SimpleNamespace(riddle_id=10, riddle_question="Q", riddle_answer="A", riddle_file=FAKE_STORAGE_URL)
    mock_db.query.return_value.filter.return_value.first.side_effect = [existing, None]
    mock_db.refresh.side_effect = lambda x: None

    files = {"file": ("new_pic.png", b"fake-data", "image/png")}
    response = client.put("/riddles/10", data={"question": "New"}, files=files)

    assert response.status_code == 200
    # Storage should be called twice: once for remove(old), once for upload(new)
    mock_bucket.remove.assert_called()
    mock_bucket.upload.assert_called()