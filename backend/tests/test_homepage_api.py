import sys
import os

# 1. Boilerplate to make Python see the 'backend' folder
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock
from datetime import datetime
from types import SimpleNamespace
from main import app
from src.DB_Methods import database

client = TestClient(app)

# ---------------- Fixtures ----------------
@pytest.fixture
def mock_db():
    return Mock()

# ---------------- Helper ----------------
def override_get_db(mock_db):
    def _override():
        yield mock_db
    return _override

# ---------------- Tests ----------------
class TestHomepageEndpoints:

    def test_get_all_competitions(self, mock_db):
        # Create fake competitions with datetime objects (not strings!)
        fake_comps = [
            SimpleNamespace(competition_id=1, name="Comp 1", date=datetime(2025, 12, 1), user_id=10),
            SimpleNamespace(competition_id=2, name="Comp 2", date=None, user_id=11)
        ]

        # Patch db query
        mock_db.query.return_value.all.return_value = fake_comps
        app.dependency_overrides[database.get_db] = override_get_db(mock_db)

        response = client.get("/homepage/get-competitions")
        assert response.status_code == 200
        assert response.json() == [
            {"id": 1, "competitionTitle": "Comp 1", "date": "2025-12-01T00:00:00", "user_id": 10},
            {"id": 2, "competitionTitle": "Comp 2", "date": None, "user_id": 11}
        ]

        app.dependency_overrides.clear()
