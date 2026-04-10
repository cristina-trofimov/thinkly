from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock
import sys
import os

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from src.endpoints.long_term_statistics_api import get_db, long_term_statistics_router


@pytest.fixture
def mock_db():
    return MagicMock()


@pytest.fixture
def client(mock_db):
    test_app = FastAPI()
    test_app.include_router(long_term_statistics_router, prefix="/long-term-statistics")

    def override_get_db():
        yield mock_db

    test_app.dependency_overrides[get_db] = override_get_db
    return TestClient(test_app)


def test_summary_returns_all_difficulties(client, mock_db):
    easy = SimpleNamespace(difficulty="easy", total_solves=12, weighted_avg_solve_time=37.5)
    hard = SimpleNamespace(difficulty="hard", total_solves=2, weighted_avg_solve_time=91.0)

    mock_db.query.return_value.join.return_value.filter.return_value.group_by.return_value.all.return_value = [
        easy,
        hard,
    ]

    response = client.get("/long-term-statistics/summary?window_value=7&window_unit=days")

    assert response.status_code == 200
    data = response.json()
    assert "range_start" in data
    assert "range_end" in data
    assert len(data["stats"]) == 3

    easy_item = next(item for item in data["stats"] if item["difficulty"] == "easy")
    medium_item = next(item for item in data["stats"] if item["difficulty"] == "medium")
    hard_item = next(item for item in data["stats"] if item["difficulty"] == "hard")

    assert easy_item["total_questions_solved"] == 12
    assert easy_item["average_solve_time"] == pytest.approx(37.5)
    assert medium_item["total_questions_solved"] == 0
    assert medium_item["average_solve_time"] == pytest.approx(0.0)
    assert hard_item["total_questions_solved"] == 2


def test_summary_for_single_difficulty(client, mock_db):
    medium = SimpleNamespace(difficulty="medium", total_solves=5, weighted_avg_solve_time=44.234)

    mock_db.query.return_value.join.return_value.filter.return_value.filter.return_value.group_by.return_value.all.return_value = [
        medium,
    ]

    response = client.get(
        "/long-term-statistics/summary?difficulty=medium&window_value=2&window_unit=hours"
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["stats"]) == 1
    assert data["stats"][0]["difficulty"] == "medium"
    assert data["stats"][0]["total_questions_solved"] == 5
    assert data["stats"][0]["average_solve_time"] == pytest.approx(44.23)


def test_summary_invalid_window_unit_returns_422(client):
    response = client.get("/long-term-statistics/summary?window_unit=months")
    assert response.status_code == 422


def test_summary_db_error_returns_500(client, mock_db):
    mock_db.query.side_effect = Exception("db failure")

    response = client.get("/long-term-statistics/summary")

    assert response.status_code == 500
    assert response.json()["detail"] == "Failed to fetch long-term statistics"
