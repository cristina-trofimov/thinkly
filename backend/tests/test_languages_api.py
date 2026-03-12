import pytest
from unittest.mock import MagicMock
from fastapi import FastAPI
from fastapi.testclient import TestClient
from types import SimpleNamespace
import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from database_operations.database import get_db
from src.endpoints.languages_api import languages_router


# --- FIXTURES ---

@pytest.fixture
def mock_db():
    """Creates a mock database session."""
    return MagicMock()

@pytest.fixture
def client(mock_db):
    test_app = FastAPI()
    test_app.include_router(languages_router)

    def override_get_db():
        try:
            yield mock_db
        finally:
            pass

    test_app.dependency_overrides[get_db] = override_get_db
    return TestClient(test_app)


# --- GET /all TESTS ---

def test_get_all_languages(client, mock_db):
    """Test fetching get all languages."""
    langs = [
        SimpleNamespace(
            row_id = 2,
            lang_judge_id = 51,
            display_name = "Java",
            active = True,
            monaco_id = "java"
        ),
        SimpleNamespace(
            row_id = 1,
            lang_judge_id = 71,
            display_name = "Python",
            active = True,
            monaco_id = "python"
        )
    ]

    mock_db.query.return_value.order_by.return_value.all.return_value = langs

    response = client.get("/all")

    assert response.status_code == 200
    data = response.json()
    assert data["status_code"] == 200
    assert len(data["data"]) == 2
    assert data["data"][0]["row_id"] == 2
    assert data["data"][0]["lang_judge_id"] == 51
    assert data["data"][0]["display_name"] == "Java"
    assert data["data"][0]["active"] == True
    assert data["data"][0]["monaco_id"] == "java"

def test_get_all_active_languages(client, mock_db):
    """Test fetching get all languages."""
    langs = [
        SimpleNamespace(
            row_id = 2,
            lang_judge_id = 51,
            display_name = "Java",
            active = True,
            monaco_id = "java"
        ),
        SimpleNamespace(
            row_id = 1,
            lang_judge_id = 71,
            display_name = "Python",
            active = False,
            monaco_id = "python"
        )
    ]

    mock_db.query.return_value.filter_by.return_value.order_by.return_value.all.return_value = [langs[1]]

    response = client.get("/all?active=true")

    assert response.status_code == 200
    data = response.json()
    assert data["status_code"] == 200
    assert len(data["data"]) == 1
    assert data["data"][0]["row_id"] == 1
    assert data["data"][0]["lang_judge_id"] == 71
    assert data["data"][0]["display_name"] == "Python"
    assert data["data"][0]["active"] == False
    assert data["data"][0]["monaco_id"] == "python"

def test_get_all_active_languages(client, mock_db):
    """Test fetching get all languages."""
    langs = [
        SimpleNamespace(
            row_id = 2,
            lang_judge_id = 51,
            display_name = "Java",
            active = True,
            monaco_id = "java"
        ),
        SimpleNamespace(
            row_id = 1,
            lang_judge_id = 71,
            display_name = "Python",
            active = False,
            monaco_id = "python"
        )
    ]

    mock_db.query.return_value.filter_by.return_value.order_by.return_value.all.return_value = [langs[0]]

    response = client.get("/all?active=true")

    assert response.status_code == 200
    data = response.json()
    assert data["status_code"] == 200
    assert len(data["data"]) == 1
    assert data["data"][0]["row_id"] == 2
    assert data["data"][0]["lang_judge_id"] == 51
    assert data["data"][0]["display_name"] == "Java"
    assert data["data"][0]["active"] == True
    assert data["data"][0]["monaco_id"] == "java"

def test_get_all_langs_empty(client, mock_db):
    """Test fetching languages that don't exist."""
    mock_db.query.return_value.order_by.return_value.all.return_value = []

    response = client.get("/all")

    data = response.json()
    assert data["status_code"] == 200
    assert data['data'] == []

def test_get_all_langs_error(client, mock_db):
    """Test that a database error returns 500."""
    mock_db.query.return_value.order_by.side_effect = Exception("DB Connection Lost")

    response = client.get("/all")

    assert response.status_code == 500
    assert "Failed to retrieve languages." in response.json()["detail"]


# --- GET / TEST ---

def test_get_language_by_id_exist(client, mock_db):
    """Test fetching get a specific language by judge id."""
    lang = SimpleNamespace(
        row_id = 1,
        lang_judge_id = 71,
        display_name = "Python",
        active = True,
        monaco_id = "python"
    )

    mock_db.query.return_value.filter_by.return_value.first.return_value = lang

    response = client.get("/71")

    assert response.status_code == 200
    data = response.json()
    assert data["data"]["row_id"] == 1
    assert data["data"]["lang_judge_id"] == 71
    assert data["data"]["display_name"] == "Python"
    assert data["data"]["active"] == True
    assert data["data"]["monaco_id"] == "python"

def test_get_lang_by_id_none(client, mock_db):
    """Test fetching a language that doesn't exist."""
    mock_db.query.return_value.filter_by.return_value.first.return_value = None

    response = client.get("/71")

    assert response.status_code == 500
    data = response.json()
    assert 'detail' in data
    assert data['detail'] == "Failed to retrieve a language by id."

def test_get_lang_by_id_error(client, mock_db):
    """Test that a database error returns 500."""
    mock_db.query.return_value.filter_by.side_effect = Exception("DB Connection Lost")

    response = client.get("/100")

    assert response.status_code == 500
    assert "Failed to retrieve a language by id." in response.json()["detail"]


# --- POST /add TESTS ---

def test_add_lang(client, mock_db):
    """Test adding a new language that doesn't exist yet."""
    payload = {
        "lang_judge_id": 71,
        "display_name": "Python",
        "active": True,
        "monaco_id": "python"
    }

    mock_db.query.return_value.filter_by.return_value.first.return_value = None

    def fake_refresh(instance):
        instance.row_id = 2

    mock_db.refresh.side_effect = fake_refresh

    response = client.post("/add", json=payload)

    assert response.status_code == 201
    mock_db.add.assert_called_once()
    mock_db.commit.assert_called_once()

def test_add_existing_lang(client, mock_db):
    """Test adding an existing language."""
    payload = {
        "lang_judge_id": 71,
        "display_name": "Python",
        "active": True,
        "monaco_id": "python"
    }

    existing = SimpleNamespace(
        lang_judge_id = 71,
        display_name = "Python",
        active = True,
        monaco_id = "python"
    )

    mock_db.query.return_value.filter_by.return_value.first.return_value = existing

    def fake_refresh(instance):
        instance.pref_id = 2

    mock_db.refresh.side_effect = fake_refresh

    response = client.post("/add", json=payload)
    
    assert response.status_code == 201
    data = response.json()
    assert data["status_code"] == 412
    assert "error" in data
    assert data["error"] == "Language already exists"

def test_add_lang_db_error(client, mock_db):
    """Test that a commit failure rolls back and returns 500."""
    mock_db.commit.side_effect = Exception("Commit Failed")

    response = client.post("/add", json={})

    assert response.status_code == 500
    data = response.json()
    assert "Failed to upload a language." in data["detail"]
    mock_db.rollback.assert_called_once()
    mock_db.commit.assert_not_called()


# --- PATCH /update TESTS ---

def test_update_lang(client, mock_db):
    """Test updating a language that exist."""
    payload = {
        "lang_judge_id": 71,
        "display_name": "Python",
        "active": True,
        "monaco_id": "python"
    }
    
    existing = SimpleNamespace(
        lang_judge_id = 71,
        display_name = "Pythonnn",
        active = True,
        monaco_id = "python"
    )

    mock_db.query.return_value.filter_by.return_value.first.return_value = existing

    def fake_refresh(instance):
        instance.row_id = 2

    mock_db.refresh.side_effect = fake_refresh

    response = client.patch("/update", json=payload)

    assert response.status_code == 201
    mock_db.commit.assert_called_once()
    mock_db.refresh.assert_called_once()

def test_update_non_existing_lang(client, mock_db):
    """Test updating a language that doesn't exist."""
    payload = {
        "lang_judge_id": 71,
        "display_name": "Python",
        "active": True,
        "monaco_id": "python"
    }

    mock_db.query.return_value.filter_by.return_value.first.return_value = None

    mock_db.refresh.side_effect = None

    response = client.patch("/update", json=payload)
    
    assert response.status_code == 201
    data = response.json()
    assert data["status_code"] == 404
    assert "error" in data
    assert data["error"] == "Language not found"

def test_updating_lang_db_error(client, mock_db):
    """Test that a commit failure rolls back and returns 500."""
    mock_db.commit.side_effect = Exception("Commit Failed")

    response = client.patch("/update", json={})

    assert response.status_code == 500
    data = response.json()
    assert "Failed to update a language." in data["detail"]
    mock_db.rollback.assert_called_once()
    mock_db.commit.assert_not_called()
