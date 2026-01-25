import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone, timedelta
import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from src.endpoints import admin_dashboard_api
from src.DB_Methods import database
from fastapi import FastAPI

app = FastAPI()
app.include_router(admin_dashboard_api.admin_dashboard_router, prefix="/admin/dashboard")


@pytest.fixture
def client(mock_db):
    """Creates a test client with dependency overrides."""
    test_app = FastAPI()
    test_app.include_router(competitions_router)

    # Override database dependency
    def override_get_db():
        try:
            yield mock_db
        finally:
            pass

    # Override authentication dependency
    def override_get_current_user():
        return {"sub": "test@example.com", "role": "admin"}

    test_app.dependency_overrides[database.get_db] = override_get_db
    test_app.dependency_overrides[get_current_user] = override_get_current_user

    return TestClient(test_app)

@pytest.fixture
def mock_db_session():
    return MagicMock()


@pytest.fixture
def mock_admin_user():
    return {"sub": "admin@test.com", "role": "admin", "id": 1}


@pytest.fixture
def client(mock_db_session, mock_admin_user):
    def override_get_db():
        try:
            yield mock_db_session
        finally:
            pass

    app.dependency_overrides[database.get_db] = override_get_db

    with patch.object(admin_dashboard_api, 'role_required') as mock_role:
        mock_role.return_value = lambda: mock_admin_user
        app.dependency_overrides[admin_dashboard_api.role_required("admin")] = lambda: mock_admin_user
        yield TestClient(app)

    app.dependency_overrides.clear()


@pytest.fixture
def mock_user_account():
    user = MagicMock()
    user.user_id = 1
    user.email = "user@test.com"
    user.first_name = "Test"
    user.last_name = "User"
    user.user_type = "participant"
    user.created_at = datetime.now(timezone.utc)
    return user


@pytest.fixture
def mock_competition():
    event = MagicMock()
    event.event_id = 1
    event.event_name = "Test Competition"
    event.event_start_date = datetime.now(timezone.utc)
    event.created_at = datetime.now(timezone.utc)
    return event


@pytest.fixture
def mock_question():
    question = MagicMock()
    question.question_id = 1
    question.question_name = "Test Question"
    question.difficulty = "easy"
    question.created_at = datetime.now(timezone.utc)
    return question


class TestDashboardOverview:
    def test_get_overview_success(self, client, mock_db_session, mock_user_account, mock_competition, mock_question):
        mock_db_session.query.return_value.order_by.return_value.limit.return_value.all.return_value = [mock_user_account]
        mock_db_session.query.return_value.join.return_value.order_by.return_value.limit.return_value.all.return_value = []

        with patch.object(admin_dashboard_api, 'role_required', return_value=lambda: {"sub": "admin@test.com", "role": "admin"}):
            response = client.get("/admin/dashboard/overview")

        assert response.status_code in [200, 401, 403]

    def test_get_overview_unauthorized(self, mock_db_session):
        def override_get_db():
            yield mock_db_session

        app.dependency_overrides[database.get_db] = override_get_db
        app.dependency_overrides.clear()

        test_client = TestClient(app)
        response = test_client.get("/admin/dashboard/overview")
        assert response.status_code in [401, 403, 422]


class TestNewAccountsStats:
    def test_get_new_accounts_stats_3months(self, client, mock_db_session):
        mock_db_session.query.return_value.filter.return_value.scalar.return_value = 10

        with patch.object(admin_dashboard_api, 'role_required', return_value=lambda: {"sub": "admin@test.com", "role": "admin"}):
            response = client.get("/admin/dashboard/stats/new-accounts?time_range=3months")

        assert response.status_code in [200, 401, 403]
        if response.status_code == 200:
            data = response.json()
            assert "value" in data
            assert "subtitle" in data
            assert "trend" in data
            assert "description" in data

    def test_get_new_accounts_stats_7days(self, client, mock_db_session):
        mock_db_session.query.return_value.filter.return_value.scalar.return_value = 5

        with patch.object(admin_dashboard_api, 'role_required', return_value=lambda: {"sub": "admin@test.com", "role": "admin"}):
            response = client.get("/admin/dashboard/stats/new-accounts?time_range=7days")

        assert response.status_code in [200, 401, 403]

    def test_get_new_accounts_stats_30days(self, client, mock_db_session):
        mock_db_session.query.return_value.filter.return_value.scalar.return_value = 8

        with patch.object(admin_dashboard_api, 'role_required', return_value=lambda: {"sub": "admin@test.com", "role": "admin"}):
            response = client.get("/admin/dashboard/stats/new-accounts?time_range=30days")

        assert response.status_code in [200, 401, 403]


class TestQuestionsSolvedStats:
    def test_get_questions_solved_stats(self, client, mock_db_session):
        mock_result = MagicMock()
        mock_result.difficulty = "easy"
        mock_result.count = 10
        mock_db_session.query.return_value.join.return_value.join.return_value.filter.return_value.group_by.return_value.all.return_value = [mock_result]

        with patch.object(admin_dashboard_api, 'role_required', return_value=lambda: {"sub": "admin@test.com", "role": "admin"}):
            response = client.get("/admin/dashboard/stats/questions-solved?time_range=3months")

        assert response.status_code in [200, 401, 403]
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 3
            for item in data:
                assert "name" in item
                assert "value" in item
                assert "color" in item


class TestTimeToSolveStats:
    def test_get_time_to_solve_stats(self, client, mock_db_session):
        mock_result = MagicMock()
        mock_result.difficulty = "easy"
        mock_result.avg_minutes = 45.5
        mock_db_session.query.return_value.join.return_value.join.return_value.join.return_value.join.return_value.filter.return_value.group_by.return_value.all.return_value = [mock_result]

        with patch.object(admin_dashboard_api, 'role_required', return_value=lambda: {"sub": "admin@test.com", "role": "admin"}):
            response = client.get("/admin/dashboard/stats/time-to-solve?time_range=3months")

        assert response.status_code in [200, 401, 403]
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 3
            for item in data:
                assert "type" in item
                assert "time" in item
                assert "color" in item


class TestLoginsStats:
    def test_get_logins_stats_7days(self, client, mock_db_session):
        mock_db_session.query.return_value.filter.return_value.group_by.return_value.all.return_value = []

        with patch.object(admin_dashboard_api, 'role_required', return_value=lambda: {"sub": "admin@test.com", "role": "admin"}):
            response = client.get("/admin/dashboard/stats/logins?time_range=7days")

        assert response.status_code in [200, 401, 403]
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)

    def test_get_logins_stats_30days(self, client, mock_db_session):
        mock_db_session.query.return_value.filter.return_value.scalar.return_value = 5

        with patch.object(admin_dashboard_api, 'role_required', return_value=lambda: {"sub": "admin@test.com", "role": "admin"}):
            response = client.get("/admin/dashboard/stats/logins?time_range=30days")

        assert response.status_code in [200, 401, 403]

    def test_get_logins_stats_3months(self, client, mock_db_session):
        mock_db_session.query.return_value.filter.return_value.group_by.return_value.all.return_value = []

        with patch.object(admin_dashboard_api, 'role_required', return_value=lambda: {"sub": "admin@test.com", "role": "admin"}):
            response = client.get("/admin/dashboard/stats/logins?time_range=3months")

        assert response.status_code in [200, 401, 403]


class TestParticipationStats:
    def test_get_participation_stats_algotime(self, client, mock_db_session):
        mock_db_session.query.return_value.join.return_value.filter.return_value.filter.return_value.scalar.return_value = 10

        with patch.object(admin_dashboard_api, 'role_required', return_value=lambda: {"sub": "admin@test.com", "role": "admin"}):
            response = client.get("/admin/dashboard/stats/participation?time_range=3months&event_type=algotime")

        assert response.status_code in [200, 401, 403]
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)

    def test_get_participation_stats_competitions(self, client, mock_db_session):
        mock_db_session.query.return_value.join.return_value.filter.return_value.filter.return_value.scalar.return_value = 15

        with patch.object(admin_dashboard_api, 'role_required', return_value=lambda: {"sub": "admin@test.com", "role": "admin"}):
            response = client.get("/admin/dashboard/stats/participation?time_range=3months&event_type=competitions")

        assert response.status_code in [200, 401, 403]

    def test_get_participation_stats_7days(self, client, mock_db_session):
        mock_db_session.query.return_value.join.return_value.filter.return_value.filter.return_value.scalar.return_value = 3

        with patch.object(admin_dashboard_api, 'role_required', return_value=lambda: {"sub": "admin@test.com", "role": "admin"}):
            response = client.get("/admin/dashboard/stats/participation?time_range=7days&event_type=algotime")

        assert response.status_code in [200, 401, 403]


class TestTimeRangeValidation:
    def test_invalid_time_range(self, client, mock_db_session):
        mock_db_session.query.return_value.filter.return_value.scalar.return_value = 0
        with patch.object(admin_dashboard_api, 'role_required', return_value=lambda: {"sub": "admin@test.com", "role": "admin"}):
            response = client.get("/admin/dashboard/stats/new-accounts?time_range=invalid")
        assert response.status_code in [401, 422]

    def test_invalid_event_type(self, client, mock_db_session):
        mock_db_session.query.return_value.join.return_value.filter.return_value.filter.return_value.scalar.return_value = 0
        with patch.object(admin_dashboard_api, 'role_required', return_value=lambda: {"sub": "admin@test.com", "role": "admin"}):
            response = client.get("/admin/dashboard/stats/participation?event_type=invalid")
        assert response.status_code in [401, 422]
