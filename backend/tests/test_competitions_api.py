import warnings

# Suppress Pydantic V2 migration warnings globally for the test session.
# This catches both the @validator deprecations and the class-based Config deprecations
# without requiring changes to the source competitions_api.py code.
warnings.filterwarnings("ignore", message=".*Pydantic V1 style.*")
warnings.filterwarnings("ignore", message=".*class-based `config` is deprecated.*")
warnings.filterwarnings("ignore", category=DeprecationWarning, module="pydantic.*")

import pytest
from unittest.mock import MagicMock, patch
from fastapi import FastAPI
from fastapi.testclient import TestClient
from datetime import datetime
from types import SimpleNamespace
import sys
import os

# 1. Path setup
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from DB_Methods import database
from src.endpoints.competitions_api import competitions_router
from src.endpoints.authentification_api import get_current_user


# --- FIXTURES ---

@pytest.fixture
def mock_db():
    """Creates a mock database session."""
    return MagicMock()


@pytest.fixture
def client(mock_db):
    """
    Creates a test client with the dependency override active.
    We create a fresh FastAPI app here to test the router in isolation.
    """
    test_app = FastAPI()
    test_app.include_router(competitions_router)

    # DEFINE THE OVERRIDE FOR DATABASE
    def override_get_db():
        try:
            yield mock_db
        finally:
            pass

    # DEFINE THE OVERRIDE FOR AUTHENTICATION
    def override_get_current_user():
        return {"sub": "test@example.com", "role": "admin"}

    # APPLY THE OVERRIDES
    test_app.dependency_overrides[database.get_db] = override_get_db
    test_app.dependency_overrides[get_current_user] = override_get_current_user

    return TestClient(test_app)


# --- TESTS ---

def test_get_all_competitions_success(client, mock_db):
    """Test the happy path where competitions are returned."""

    # 1. Arrange: Create fake competition objects
    fake_comps = [
        SimpleNamespace(
            event_id=101,
            base_event=SimpleNamespace(
                event_name="Winter Hackathon",
                event_location="Montreal",
                event_start_date=datetime(2025, 12, 1, 10, 0, 0),
                event_end_date=datetime(2025, 12, 1, 18, 0, 0),
            )
        ),
        SimpleNamespace(
            event_id=102,
            base_event=SimpleNamespace(
                event_name="Summer Code Fest",
                event_location="Toronto",
                event_start_date=datetime(2026, 6, 15, 9, 30, 0),
                event_end_date=datetime(2026, 6, 15, 17, 0, 0),
            )
        ),
    ]

    # Create a mock query that returns itself for any chained method
    mock_query = MagicMock()
    mock_query.join.return_value = mock_query
    mock_query.filter.return_value = mock_query
    mock_query.filter_by.return_value = mock_query
    mock_query.order_by.return_value = mock_query
    mock_query.limit.return_value = mock_query
    mock_query.offset.return_value = mock_query
    # The terminal operation returns actual data
    mock_query.all.return_value = fake_comps

    # Attach the query to the db mock
    mock_db.query.return_value = mock_query

    # 2. Act
    response = client.get("/")

    # 3. Assert
    assert response.status_code == 200
    data = response.json()

    # Verify the count
    assert len(data) == 2

    assert data[0]["id"] == 101
    assert data[0]["competition_title"] == "Winter Hackathon"
    assert data[0]["competition_location"] == "Montreal"
    assert "2025-12-01" in data[0]["start_date"]


def test_get_all_competitions_empty(client, mock_db):
    """Test when the database is empty."""

    mock_query = MagicMock()
    mock_query.join.return_value = mock_query
    mock_query.all.return_value = []
    mock_db.query.return_value = mock_query

    # Act
    response = client.get("/")

    # Assert
    assert response.status_code == 200
    assert response.json() == []


def test_get_all_competitions_db_error(client, mock_db):
    """Test how the endpoint handles a database exception."""

    mock_query = MagicMock()
    mock_query.join.return_value = mock_query
    mock_query.all.side_effect = Exception("DB Connection Lost")
    mock_db.query.return_value = mock_query

    # Act
    response = client.get("/")

    # Assert
    assert response.status_code == 500
    assert "DB Connection Lost" in response.json()["detail"]