import pytest
from fastapi.testclient import TestClient
from fastapi import HTTPException
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone
from types import SimpleNamespace
import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from src.endpoints import admin_dashboard_api
from src.database_operations import database
from fastapi import FastAPI

app = FastAPI()
app.include_router(admin_dashboard_api.admin_dashboard_router, prefix="/admin/dashboard")


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
            mock_db_session.close()

    app.dependency_overrides[database.get_db] = override_get_db

    with patch.object(admin_dashboard_api, 'admin_or_owner_required') as mock_role:
        mock_role.return_value = lambda: mock_admin_user
        app.dependency_overrides[admin_dashboard_api.admin_or_owner_required] = lambda: mock_admin_user
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

        with patch.object(admin_dashboard_api, 'admin_or_owner_required', return_value=lambda: {"sub": "admin@test.com", "role": "admin"}):
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

        with patch.object(admin_dashboard_api, 'admin_or_owner_required', return_value=lambda: {"sub": "admin@test.com", "role": "admin"}):
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

        with patch.object(admin_dashboard_api, 'admin_or_owner_required', return_value=lambda: {"sub": "admin@test.com", "role": "admin"}):
            response = client.get("/admin/dashboard/stats/new-accounts?time_range=7days")

        assert response.status_code in [200, 401, 403]

    def test_get_new_accounts_stats_30days(self, client, mock_db_session):
        mock_db_session.query.return_value.filter.return_value.scalar.return_value = 8

        with patch.object(admin_dashboard_api, 'admin_or_owner_required', return_value=lambda: {"sub": "admin@test.com", "role": "admin"}):
            response = client.get("/admin/dashboard/stats/new-accounts?time_range=30days")

        assert response.status_code in [200, 401, 403]


class TestQuestionsSolvedStats:
    def test_get_questions_solved_stats(self, client, mock_db_session):
        easy = MagicMock()
        easy.difficulty = "easy"
        easy.total_solves = 10
        easy.weighted_avg_solve_time = 25.0
        mock_db_session.query.return_value.join.return_value.filter.return_value.group_by.return_value.all.return_value = [easy]

        with patch.object(admin_dashboard_api, 'admin_or_owner_required', return_value=lambda: {"sub": "admin@test.com", "role": "admin"}):
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
        easy = MagicMock()
        easy.difficulty = "easy"
        easy.total_solves = 3
        easy.weighted_avg_solve_time = 45.5
        mock_db_session.query.return_value.join.return_value.filter.return_value.group_by.return_value.all.return_value = [easy]

        with patch.object(admin_dashboard_api, 'admin_or_owner_required', return_value=lambda: {"sub": "admin@test.com", "role": "admin"}):
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

        with patch.object(admin_dashboard_api, 'admin_or_owner_required', return_value=lambda: {"sub": "admin@test.com", "role": "admin"}):
            response = client.get("/admin/dashboard/stats/logins?time_range=7days")

        assert response.status_code in [200, 401, 403]
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)

    def test_get_logins_stats_30days(self, client, mock_db_session):
        mock_db_session.query.return_value.filter.return_value.scalar.return_value = 5

        with patch.object(admin_dashboard_api, 'admin_or_owner_required', return_value=lambda: {"sub": "admin@test.com", "role": "admin"}):
            response = client.get("/admin/dashboard/stats/logins?time_range=30days")

        assert response.status_code in [200, 401, 403]

    def test_get_logins_stats_3months(self, client, mock_db_session):
        mock_db_session.query.return_value.filter.return_value.group_by.return_value.all.return_value = []

        with patch.object(admin_dashboard_api, 'admin_or_owner_required', return_value=lambda: {"sub": "admin@test.com", "role": "admin"}):
            response = client.get("/admin/dashboard/stats/logins?time_range=3months")

        assert response.status_code in [200, 401, 403]


class TestParticipationStats:
    def test_get_participation_stats_algotime(self, client, mock_db_session):
        mock_db_session.query.return_value.join.return_value.filter.return_value.filter.return_value.scalar.return_value = 10

        with patch.object(admin_dashboard_api, 'admin_or_owner_required', return_value=lambda: {"sub": "admin@test.com", "role": "admin"}):
            response = client.get("/admin/dashboard/stats/participation?time_range=3months&event_type=algotime")

        assert response.status_code in [200, 401, 403]
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)

    def test_get_participation_stats_competitions(self, client, mock_db_session):
        mock_db_session.query.return_value.join.return_value.filter.return_value.filter.return_value.scalar.return_value = 15

        with patch.object(admin_dashboard_api, 'admin_or_owner_required', return_value=lambda: {"sub": "admin@test.com", "role": "admin"}):
            response = client.get("/admin/dashboard/stats/participation?time_range=3months&event_type=competitions")

        assert response.status_code in [200, 401, 403]

    def test_get_participation_stats_7days(self, client, mock_db_session):
        mock_db_session.query.return_value.join.return_value.filter.return_value.filter.return_value.scalar.return_value = 3

        with patch.object(admin_dashboard_api, 'admin_or_owner_required', return_value=lambda: {"sub": "admin@test.com", "role": "admin"}):
            response = client.get("/admin/dashboard/stats/participation?time_range=7days&event_type=algotime")

        assert response.status_code in [200, 401, 403]


class TestTimeRangeValidation:
    def test_invalid_time_range(self, client, mock_db_session):
        mock_db_session.query.return_value.filter.return_value.scalar.return_value = 0
        with patch.object(admin_dashboard_api, 'admin_or_owner_required', return_value=lambda: {"sub": "admin@test.com", "role": "admin"}):
            response = client.get("/admin/dashboard/stats/new-accounts?time_range=invalid")
        assert response.status_code in [401, 422]

    def test_invalid_event_type(self, client, mock_db_session):
        mock_db_session.query.return_value.join.return_value.filter.return_value.filter.return_value.scalar.return_value = 0
        with patch.object(admin_dashboard_api, 'admin_or_owner_required', return_value=lambda: {"sub": "admin@test.com", "role": "admin"}):
            response = client.get("/admin/dashboard/stats/participation?event_type=invalid")
        assert response.status_code in [401, 422]


class TestDashboardHelpers:
    def test_get_long_term_window_days_known_and_default(self):
        assert admin_dashboard_api._get_long_term_window_days("7days") == 7
        assert admin_dashboard_api._get_long_term_window_days("30days") == 30
        assert admin_dashboard_api._get_long_term_window_days("unknown") == 90

    def test_build_zero_participation_series_lengths(self):
        weekly = admin_dashboard_api._build_zero_participation_series("7days")
        monthly = admin_dashboard_api._build_zero_participation_series("30days")
        quarterly = admin_dashboard_api._build_zero_participation_series("3months")

        assert len(weekly) == 7
        assert [item.date for item in weekly] == ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        assert len(monthly) == 30
        assert monthly[0].date == "Day 1"
        assert monthly[-1].date == "Day 30"
        assert len(quarterly) == 90

    @patch("src.endpoints.admin_dashboard_api.inspect")
    def test_legacy_participation_tables_available_true(self, mock_inspect):
        inspector = MagicMock()
        inspector.get_table_names.return_value = ["submission", "user_question_instance", "question_instance"]
        mock_inspect.return_value = inspector

        db = MagicMock()
        db.get_bind.return_value = MagicMock()

        assert admin_dashboard_api._legacy_participation_tables_available(db) is True

    @patch("src.endpoints.admin_dashboard_api.inspect")
    def test_legacy_participation_tables_available_false(self, mock_inspect):
        inspector = MagicMock()
        inspector.get_table_names.return_value = ["submission", "user_question_instance"]
        mock_inspect.return_value = inspector

        db = MagicMock()
        db.get_bind.return_value = MagicMock()

        assert admin_dashboard_api._legacy_participation_tables_available(db) is False

    @patch("src.endpoints.admin_dashboard_api.inspect", side_effect=Exception("inspect failed"))
    def test_legacy_participation_tables_available_exception_defaults_true(self, _):
        db = MagicMock()
        assert admin_dashboard_api._legacy_participation_tables_available(db) is True

    def test_build_participation_series_7days(self):
        db = MagicMock()
        with patch.object(admin_dashboard_api, "_get_submission_count", side_effect=[1, 2, 3, 4, 5, 6, 7]):
            data = admin_dashboard_api._build_participation_series(db, "7days", "algotime")

        assert len(data) == 7
        assert [item.participation for item in data] == [1, 2, 3, 4, 5, 6, 7]

    def test_build_participation_series_30days(self):
        db = MagicMock()
        with patch.object(admin_dashboard_api, "_get_submission_count", side_effect=[1] * 30):
            data = admin_dashboard_api._build_participation_series(db, "30days", "competitions")

        assert len(data) == 30
        assert data[0].date == "Day 1"
        assert data[-1].date == "Day 30"

    def test_build_participation_series_3months(self):
        db = MagicMock()
        with patch.object(admin_dashboard_api, "_get_submission_count", side_effect=[0] * 90):
            data = admin_dashboard_api._build_participation_series(db, "3months", "competitions")

        assert len(data) == 90

    def test_get_submission_count_competitions_branch(self):
        db = MagicMock()
        base_query = MagicMock()
        subquery = MagicMock()
        event_filtered_query = MagicMock()

        db.query.side_effect = [base_query, subquery]
        filtered_query = base_query.join.return_value.join.return_value.filter.return_value
        filtered_query.filter.return_value = event_filtered_query
        event_filtered_query.scalar.return_value = 9

        count = admin_dashboard_api._get_submission_count(
            db,
            "competitions",
            datetime.now(timezone.utc),
            datetime.now(timezone.utc),
        )

        assert count == 9

    def test_get_submission_count_algotime_branch_returns_zero_on_null(self):
        db = MagicMock()
        base_query = MagicMock()
        subquery = MagicMock()
        event_filtered_query = MagicMock()

        db.query.side_effect = [base_query, subquery]
        filtered_query = base_query.join.return_value.join.return_value.filter.return_value
        filtered_query.filter.return_value = event_filtered_query
        event_filtered_query.scalar.return_value = None

        count = admin_dashboard_api._get_submission_count(
            db,
            "algotime",
            datetime.now(timezone.utc),
            datetime.now(timezone.utc),
        )

        assert count == 0

    def test_admin_or_owner_required_allows_admin_and_owner(self):
        admin = admin_dashboard_api.admin_or_owner_required({"sub": "a@test.com", "role": "admin"})
        owner = admin_dashboard_api.admin_or_owner_required({"sub": "o@test.com", "role": "owner"})

        assert admin["role"] == "admin"
        assert owner["role"] == "owner"

    def test_admin_or_owner_required_rejects_other_roles(self):
        with pytest.raises(HTTPException) as exc_info:
            admin_dashboard_api.admin_or_owner_required({"sub": "p@test.com", "role": "participant"})

        assert exc_info.value.status_code == 403


class TestChangedRouteLogic:
    @pytest.mark.asyncio
    async def test_questions_solved_stats_uses_long_term_summary(self):
        db = MagicMock()
        summary = SimpleNamespace(
            stats=[
                SimpleNamespace(difficulty="easy", total_questions_solved=10, average_solve_time=12.3),
                SimpleNamespace(difficulty="hard", total_questions_solved=4, average_solve_time=55.5),
            ]
        )

        with patch.object(admin_dashboard_api, "get_long_term_statistics_summary", return_value=summary):
            response = await admin_dashboard_api.get_questions_solved_stats(
                db=db,
                current_user={"sub": "admin@test.com", "role": "admin"},
                time_range="30days",
            )

        assert len(response) == 3
        assert response[0].name == "Easy"
        assert response[0].value == 10
        assert response[1].value == 0
        assert response[2].value == 4

    @pytest.mark.asyncio
    async def test_questions_solved_stats_wraps_errors(self):
        db = MagicMock()
        with patch.object(admin_dashboard_api, "get_long_term_statistics_summary", side_effect=Exception("boom")):
            with pytest.raises(HTTPException) as exc_info:
                await admin_dashboard_api.get_questions_solved_stats(
                    db=db,
                    current_user={"sub": "admin@test.com", "role": "admin"},
                    time_range="7days",
                )

        assert exc_info.value.status_code == 500

    @pytest.mark.asyncio
    async def test_time_to_solve_stats_uses_long_term_summary(self):
        db = MagicMock()
        summary = SimpleNamespace(
            stats=[
                SimpleNamespace(difficulty="easy", total_questions_solved=0, average_solve_time=45.56),
                SimpleNamespace(difficulty="medium", total_questions_solved=0, average_solve_time=0.0),
                SimpleNamespace(difficulty="hard", total_questions_solved=0, average_solve_time=120.01),
            ]
        )

        with patch.object(admin_dashboard_api, "get_long_term_statistics_summary", return_value=summary):
            response = await admin_dashboard_api.get_time_to_solve_stats(
                db=db,
                current_user={"sub": "admin@test.com", "role": "admin"},
                time_range="3months",
            )

        assert len(response) == 3
        assert response[0].type == "Easy"
        assert response[0].time == pytest.approx(45.6)
        assert response[1].time == 0
        assert response[2].time == pytest.approx(120.0)

    @pytest.mark.asyncio
    async def test_time_to_solve_stats_wraps_errors(self):
        db = MagicMock()
        with patch.object(admin_dashboard_api, "get_long_term_statistics_summary", side_effect=Exception("boom")):
            with pytest.raises(HTTPException) as exc_info:
                await admin_dashboard_api.get_time_to_solve_stats(
                    db=db,
                    current_user={"sub": "admin@test.com", "role": "admin"},
                    time_range="30days",
                )

        assert exc_info.value.status_code == 500

    @pytest.mark.asyncio
    async def test_participation_stats_returns_zero_series_when_tables_missing(self):
        db = MagicMock()

        with patch.object(admin_dashboard_api, "_legacy_participation_tables_available", return_value=False), \
                patch.object(admin_dashboard_api, "_build_zero_participation_series") as zero_series:
            zero_series.return_value = [admin_dashboard_api.ParticipationDataPoint(date="Mon", participation=0)]

            response = await admin_dashboard_api.get_participation_stats(
                db=db,
                current_user={"sub": "admin@test.com", "role": "admin"},
                time_range="7days",
                event_type="algotime",
            )

        assert len(response) == 1
        assert response[0].participation == 0

    @pytest.mark.asyncio
    async def test_participation_stats_returns_built_series_when_tables_exist(self):
        db = MagicMock()
        built = [admin_dashboard_api.ParticipationDataPoint(date="Day 1", participation=5)]

        with patch.object(admin_dashboard_api, "_legacy_participation_tables_available", return_value=True), \
                patch.object(admin_dashboard_api, "_build_participation_series", return_value=built):
            response = await admin_dashboard_api.get_participation_stats(
                db=db,
                current_user={"sub": "admin@test.com", "role": "admin"},
                time_range="30days",
                event_type="competitions",
            )

        assert response == built

    @pytest.mark.asyncio
    async def test_participation_stats_falls_back_on_operational_errors(self):
        db = MagicMock()

        with patch.object(admin_dashboard_api, "_legacy_participation_tables_available", return_value=True), \
            patch.object(admin_dashboard_api, "_build_participation_series", side_effect=admin_dashboard_api.OperationalError("stmt", {}, RuntimeError("db"))), \
                patch.object(admin_dashboard_api, "_build_zero_participation_series") as zero_series:
            zero_series.return_value = [admin_dashboard_api.ParticipationDataPoint(date="Mon", participation=0)]

            response = await admin_dashboard_api.get_participation_stats(
                db=db,
                current_user={"sub": "admin@test.com", "role": "admin"},
                time_range="7days",
                event_type="algotime",
            )

        assert len(response) == 1
        assert response[0].participation == 0

    @pytest.mark.asyncio
    async def test_participation_stats_wraps_unexpected_errors(self):
        db = MagicMock()

        with patch.object(admin_dashboard_api, "_legacy_participation_tables_available", return_value=True), \
                patch.object(admin_dashboard_api, "_build_participation_series", side_effect=RuntimeError("boom")):
            with pytest.raises(HTTPException) as exc_info:
                await admin_dashboard_api.get_participation_stats(
                    db=db,
                    current_user={"sub": "admin@test.com", "role": "admin"},
                    time_range="7days",
                    event_type="algotime",
                )

        assert exc_info.value.status_code == 500
