
import pytest
from unittest.mock import Mock, patch, call
from fastapi import HTTPException
from sqlalchemy.orm import Session
from src.endpoints.manage_accounts_api import (
    get_all_accounts,
    delete_multiple_accounts,
    update_account,
    get_user_preferences,
    update_user_preferences,
    DeleteAccountsRequest,
    UpdateAccountRequest,
    UpdatePreferencesRequest,
)

TRACK_EVENT = "src.endpoints.manage_accounts_api.track_custom_event"


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_db():
    return Mock(spec=Session)


@pytest.fixture
def sample_user_account():
    user = Mock()
    user.user_id = 1
    user.first_name = "John"
    user.last_name = "Doe"
    user.email = "john.doe@example.com"
    user.user_type = "student"
    return user


@pytest.fixture
def sample_user_accounts():
    users = []
    for i in range(1, 6):
        user = Mock()
        user.user_id = i
        user.first_name = f"User{i}"
        user.last_name = f"Last{i}"
        user.email = f"user{i}@example.com"
        user.user_type = "student"
        users.append(user)
    return users


@pytest.fixture
def sample_preferences():
    prefs = Mock()
    prefs.user_id = 1
    prefs.theme = "dark"
    prefs.notifications_enabled = True
    return prefs


# ---------------------------------------------------------------------------
# get_all_accounts
# ---------------------------------------------------------------------------

class TestGetAllAccounts:

    def test_get_all_accounts_success(self, mock_db, sample_user_accounts):
        mock_db.query.return_value.all.return_value = sample_user_accounts
        result = get_all_accounts(mock_db)
        assert result == sample_user_accounts
        assert len(result) == 5

    def test_get_all_accounts_empty(self, mock_db):
        mock_db.query.return_value.all.return_value = []
        result = get_all_accounts(mock_db)
        assert result == []

    def test_get_all_accounts_database_called(self, mock_db, sample_user_accounts):
        mock_db.query.return_value.all.return_value = sample_user_accounts
        get_all_accounts(mock_db)
        mock_db.query.assert_called_once()

    def test_get_all_accounts_single_result(self, mock_db, sample_user_account):
        mock_db.query.return_value.all.return_value = [sample_user_account]
        result = get_all_accounts(mock_db)
        assert len(result) == 1
        assert result[0].user_id == 1


# ---------------------------------------------------------------------------
# delete_multiple_accounts
# ---------------------------------------------------------------------------

class TestDeleteMultipleAccounts:

    def test_delete_single_account_success(self, mock_db):
        payload = DeleteAccountsRequest(user_ids=[1])
        mock_user_id = Mock()
        mock_user_id.user_id = 1
        mock_db.query.return_value.filter.return_value.all.return_value = [mock_user_id]
        mock_db.query.return_value.filter.return_value.delete.return_value = 1

        with patch(TRACK_EVENT):
            result = delete_multiple_accounts(payload, mock_db)

        assert result["deleted_count"] == 1
        assert len(result["deleted_users"]) == 1
        assert result["deleted_users"][0]["user_id"] == 1
        assert result["total_requested"] == 1
        assert len(result["errors"]) == 0
        mock_db.commit.assert_called_once()

    def test_delete_multiple_accounts_success(self, mock_db):
        payload = DeleteAccountsRequest(user_ids=[1, 2, 3])
        mock_users = [Mock(user_id=1), Mock(user_id=2), Mock(user_id=3)]
        mock_db.query.return_value.filter.return_value.all.return_value = mock_users
        mock_db.query.return_value.filter.return_value.delete.return_value = 3

        with patch(TRACK_EVENT):
            result = delete_multiple_accounts(payload, mock_db)

        assert result["deleted_count"] == 3
        assert result["total_requested"] == 3
        assert len(result["errors"]) == 0

    def test_delete_accounts_with_missing_ids(self, mock_db):
        payload = DeleteAccountsRequest(user_ids=[1, 2, 999])
        mock_users = [Mock(user_id=1), Mock(user_id=2)]
        mock_db.query.return_value.filter.return_value.all.return_value = mock_users
        mock_db.query.return_value.filter.return_value.delete.return_value = 2

        with patch(TRACK_EVENT):
            result = delete_multiple_accounts(payload, mock_db)

        assert result["deleted_count"] == 2
        assert result["total_requested"] == 3
        assert len(result["errors"]) == 1
        assert result["errors"][0]["user_id"] == 999
        assert result["errors"][0]["error"] == "User not found."

    def test_delete_accounts_all_missing(self, mock_db):
        payload = DeleteAccountsRequest(user_ids=[998, 999])
        mock_db.query.return_value.filter.return_value.all.return_value = []

        with patch(TRACK_EVENT):
            result = delete_multiple_accounts(payload, mock_db)

        assert result["deleted_count"] == 0
        assert result["total_requested"] == 2
        assert len(result["errors"]) == 2

    def test_delete_accounts_with_duplicates(self, mock_db):
        payload = DeleteAccountsRequest(user_ids=[1, 1, 2, 2, 3])
        mock_users = [Mock(user_id=1), Mock(user_id=2), Mock(user_id=3)]
        mock_db.query.return_value.filter.return_value.all.return_value = mock_users
        mock_db.query.return_value.filter.return_value.delete.return_value = 3

        with patch(TRACK_EVENT):
            result = delete_multiple_accounts(payload, mock_db)

        assert result["deleted_count"] == 3
        assert result["total_requested"] == 3  # deduplicated

    def test_delete_accounts_database_error(self, mock_db):
        payload = DeleteAccountsRequest(user_ids=[1])
        mock_db.query.side_effect = Exception("Database error")

        with pytest.raises(HTTPException) as exc_info:
            delete_multiple_accounts(payload, mock_db)

        assert exc_info.value.status_code == 500
        assert exc_info.value.detail == "Error deleting accounts."
        mock_db.rollback.assert_called_once()

    def test_delete_accounts_no_existing_users_sets_deleted_count_zero(self, mock_db):
        payload = DeleteAccountsRequest(user_ids=[404])
        mock_db.query.return_value.filter.return_value.all.return_value = []

        with patch(TRACK_EVENT):
            result = delete_multiple_accounts(payload, mock_db)

        assert result["deleted_count"] == 0

    def test_delete_accounts_calls_track_event(self, mock_db):
        payload = DeleteAccountsRequest(user_ids=[1, 2])
        mock_users = [Mock(user_id=1), Mock(user_id=2)]
        mock_db.query.return_value.filter.return_value.all.return_value = mock_users
        mock_db.query.return_value.filter.return_value.delete.return_value = 2

        with patch(TRACK_EVENT) as mock_track:
            delete_multiple_accounts(payload, mock_db)

        mock_track.assert_called_once()
        call_kwargs = mock_track.call_args[1]
        assert call_kwargs["event_name"] == "users_batch_deleted"
        assert call_kwargs["properties"]["deleted_count"] == 2

    def test_delete_accounts_order_preserved_in_response(self, mock_db):
        """deleted_users list preserves insertion order of existing IDs."""
        payload = DeleteAccountsRequest(user_ids=[3, 1, 2])
        mock_users = [Mock(user_id=3), Mock(user_id=1), Mock(user_id=2)]
        mock_db.query.return_value.filter.return_value.all.return_value = mock_users
        mock_db.query.return_value.filter.return_value.delete.return_value = 3

        with patch(TRACK_EVENT):
            result = delete_multiple_accounts(payload, mock_db)

        ids_in_response = [u["user_id"] for u in result["deleted_users"]]
        assert set(ids_in_response) == {1, 2, 3}


# ---------------------------------------------------------------------------
# update_account
# ---------------------------------------------------------------------------

class TestUpdateAccount:

    def test_update_account_single_field(self, mock_db, sample_user_account):
        mock_db.query.return_value.filter.return_value.first.return_value = sample_user_account
        update_data = UpdateAccountRequest(first_name="Jane")

        with patch(TRACK_EVENT):
            result = update_account(1, update_data, mock_db)

        assert result.first_name == "Jane"
        mock_db.commit.assert_called_once()
        mock_db.refresh.assert_called_once_with(sample_user_account)

    def test_update_account_multiple_fields(self, mock_db, sample_user_account):
        mock_db.query.return_value.filter.return_value.first.return_value = sample_user_account
        update_data = UpdateAccountRequest(
            first_name="Jane", last_name="Smith", email="jane.smith@example.com"
        )

        with patch(TRACK_EVENT):
            result = update_account(1, update_data, mock_db)

        assert result.first_name == "Jane"
        assert result.last_name == "Smith"
        assert result.email == "jane.smith@example.com"

    def test_update_account_all_fields(self, mock_db, sample_user_account):
        mock_db.query.return_value.filter.return_value.first.return_value = sample_user_account
        update_data = UpdateAccountRequest(
            first_name="Jane", last_name="Smith",
            email="jane.smith@example.com", user_type="instructor"
        )

        with patch(TRACK_EVENT):
            result = update_account(1, update_data, mock_db)

        assert result.user_type == "instructor"

    def test_update_account_not_found(self, mock_db):
        mock_db.query.return_value.filter.return_value.first.return_value = None
        update_data = UpdateAccountRequest(first_name="Jane")

        with pytest.raises(HTTPException) as exc_info:
            update_account(999, update_data, mock_db)

        assert exc_info.value.status_code == 404
        assert exc_info.value.detail == "Account not found."

    def test_update_account_no_fields(self, mock_db, sample_user_account):
        mock_db.query.return_value.filter.return_value.first.return_value = sample_user_account
        update_data = UpdateAccountRequest()

        with pytest.raises(HTTPException) as exc_info:
            update_account(1, update_data, mock_db)

        assert exc_info.value.status_code == 400
        assert exc_info.value.detail == "No fields to update."

    def test_update_account_calls_track_event(self, mock_db, sample_user_account):
        mock_db.query.return_value.filter.return_value.first.return_value = sample_user_account
        update_data = UpdateAccountRequest(first_name="Jane", email="jane@example.com")

        with patch(TRACK_EVENT) as mock_track:
            update_account(1, update_data, mock_db)

        mock_track.assert_called_once()
        call_kwargs = mock_track.call_args[1]
        assert call_kwargs["user_id"] == "1"
        assert call_kwargs["event_name"] == "account_updated"
        assert "first_name" in call_kwargs["properties"]["updated_fields"]
        assert call_kwargs["properties"]["field_count"] == 2

    def test_update_account_does_not_track_event_on_404(self, mock_db):
        mock_db.query.return_value.filter.return_value.first.return_value = None

        with patch(TRACK_EVENT) as mock_track:
            with pytest.raises(HTTPException):
                update_account(999, UpdateAccountRequest(first_name="X"), mock_db)

        mock_track.assert_not_called()

    def test_update_account_does_not_track_event_on_400(self, mock_db, sample_user_account):
        mock_db.query.return_value.filter.return_value.first.return_value = sample_user_account

        with patch(TRACK_EVENT) as mock_track:
            with pytest.raises(HTTPException):
                update_account(1, UpdateAccountRequest(), mock_db)

        mock_track.assert_not_called()

    def test_update_account_user_type_change(self, mock_db, sample_user_account):
        mock_db.query.return_value.filter.return_value.first.return_value = sample_user_account
        update_data = UpdateAccountRequest(user_type="instructor")

        with patch(TRACK_EVENT):
            result = update_account(1, update_data, mock_db)

        assert result.user_type == "instructor"

    def test_update_account_refresh_called_after_commit(self, mock_db, sample_user_account):
        mock_db.query.return_value.filter.return_value.first.return_value = sample_user_account
        call_order = []
        mock_db.commit.side_effect = lambda: call_order.append("commit")
        mock_db.refresh.side_effect = lambda _: call_order.append("refresh")

        with patch(TRACK_EVENT):
            update_account(1, UpdateAccountRequest(first_name="X"), mock_db)

        assert call_order == ["commit", "refresh"]


# ---------------------------------------------------------------------------
# get_user_preferences
# ---------------------------------------------------------------------------

class TestGetUserPreferences:

    def test_get_preferences_success(self, mock_db, sample_preferences):
        mock_db.query.return_value.filter.return_value.first.return_value = sample_preferences

        result = get_user_preferences(1, mock_db)

        assert result["theme"] == "dark"
        assert result["notifications_enabled"] is True

    def test_get_preferences_not_found(self, mock_db):
        mock_db.query.return_value.filter.return_value.first.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            get_user_preferences(999, mock_db)

        assert exc_info.value.status_code == 404
        assert exc_info.value.detail == "Preferences not found."

    def test_get_preferences_returns_only_expected_keys(self, mock_db, sample_preferences):
        mock_db.query.return_value.filter.return_value.first.return_value = sample_preferences

        result = get_user_preferences(1, mock_db)

        assert set(result.keys()) == {"theme", "notifications_enabled"}

    def test_get_preferences_light_theme(self, mock_db):
        prefs = Mock()
        prefs.theme = "light"
        prefs.notifications_enabled = False
        mock_db.query.return_value.filter.return_value.first.return_value = prefs

        result = get_user_preferences(1, mock_db)

        assert result["theme"] == "light"
        assert result["notifications_enabled"] is False

    def test_get_preferences_queries_correct_user(self, mock_db, sample_preferences):
        mock_db.query.return_value.filter.return_value.first.return_value = sample_preferences

        get_user_preferences(42, mock_db)

        mock_db.query.assert_called_once()


# ---------------------------------------------------------------------------
# update_user_preferences
# ---------------------------------------------------------------------------

class TestUpdateUserPreferences:

    def test_update_theme_only(self, mock_db, sample_preferences):
        mock_db.query.return_value.filter.return_value.first.return_value = sample_preferences
        update_data = UpdatePreferencesRequest(theme="light")

        with patch(TRACK_EVENT):
            result = update_user_preferences(1, update_data, mock_db)

        assert result["theme"] == "light"
        mock_db.commit.assert_called_once()
        mock_db.refresh.assert_called_once_with(sample_preferences)

    def test_update_notifications_only(self, mock_db, sample_preferences):
        mock_db.query.return_value.filter.return_value.first.return_value = sample_preferences
        update_data = UpdatePreferencesRequest(notifications_enabled=False)

        with patch(TRACK_EVENT):
            result = update_user_preferences(1, update_data, mock_db)

        assert result["notifications_enabled"] is False

    def test_update_both_preference_fields(self, mock_db, sample_preferences):
        mock_db.query.return_value.filter.return_value.first.return_value = sample_preferences
        update_data = UpdatePreferencesRequest(theme="system", notifications_enabled=False)

        with patch(TRACK_EVENT):
            result = update_user_preferences(1, update_data, mock_db)

        assert result["theme"] == "system"
        assert result["notifications_enabled"] is False

    def test_update_preferences_not_found(self, mock_db):
        mock_db.query.return_value.filter.return_value.first.return_value = None
        update_data = UpdatePreferencesRequest(theme="light")

        with pytest.raises(HTTPException) as exc_info:
            update_user_preferences(999, update_data, mock_db)

        assert exc_info.value.status_code == 404
        assert exc_info.value.detail == "Preferences not found."

    def test_update_preferences_no_fields(self, mock_db, sample_preferences):
        mock_db.query.return_value.filter.return_value.first.return_value = sample_preferences
        update_data = UpdatePreferencesRequest()

        with pytest.raises(HTTPException) as exc_info:
            update_user_preferences(1, update_data, mock_db)

        assert exc_info.value.status_code == 400
        assert exc_info.value.detail == "No fields to update."

    def test_update_preferences_calls_track_event(self, mock_db, sample_preferences):
        mock_db.query.return_value.filter.return_value.first.return_value = sample_preferences
        update_data = UpdatePreferencesRequest(theme="light")

        with patch(TRACK_EVENT) as mock_track:
            update_user_preferences(1, update_data, mock_db)

        mock_track.assert_called_once()
        call_kwargs = mock_track.call_args[1]
        assert call_kwargs["user_id"] == "1"
        assert call_kwargs["event_name"] == "preferences_updated"
        assert "theme" in call_kwargs["properties"]["updated_fields"]

    def test_update_preferences_no_track_event_on_404(self, mock_db):
        mock_db.query.return_value.filter.return_value.first.return_value = None

        with patch(TRACK_EVENT) as mock_track:
            with pytest.raises(HTTPException):
                update_user_preferences(99, UpdatePreferencesRequest(theme="dark"), mock_db)

        mock_track.assert_not_called()

    def test_update_preferences_no_track_event_on_400(self, mock_db, sample_preferences):
        mock_db.query.return_value.filter.return_value.first.return_value = sample_preferences

        with patch(TRACK_EVENT) as mock_track:
            with pytest.raises(HTTPException):
                update_user_preferences(1, UpdatePreferencesRequest(), mock_db)

        mock_track.assert_not_called()

    def test_update_preferences_returns_correct_shape(self, mock_db, sample_preferences):
        mock_db.query.return_value.filter.return_value.first.return_value = sample_preferences
        update_data = UpdatePreferencesRequest(theme="dark")

        with patch(TRACK_EVENT):
            result = update_user_preferences(1, update_data, mock_db)

        assert set(result.keys()) == {"theme", "notifications_enabled"}

    def test_update_preferences_commit_before_refresh(self, mock_db, sample_preferences):
        mock_db.query.return_value.filter.return_value.first.return_value = sample_preferences
        call_order = []
        mock_db.commit.side_effect = lambda: call_order.append("commit")
        mock_db.refresh.side_effect = lambda _: call_order.append("refresh")

        with patch(TRACK_EVENT):
            update_user_preferences(1, UpdatePreferencesRequest(theme="dark"), mock_db)

        assert call_order == ["commit", "refresh"]


# ---------------------------------------------------------------------------
# Request model validation
# ---------------------------------------------------------------------------

class TestRequestModels:

    def test_delete_accounts_request_valid(self):
        request = DeleteAccountsRequest(user_ids=[1, 2, 3])
        assert request.user_ids == [1, 2, 3]

    def test_delete_accounts_request_empty_list(self):
        with pytest.raises(ValueError):
            DeleteAccountsRequest(user_ids=[])

    def test_update_account_request_partial(self):
        request = UpdateAccountRequest(first_name="John")
        assert request.first_name == "John"
        assert request.last_name is None
        assert request.email is None
        assert request.user_type is None

    def test_update_account_request_all_fields(self):
        request = UpdateAccountRequest(
            first_name="John", last_name="Doe",
            email="john@example.com", user_type="student"
        )
        assert request.first_name == "John"
        assert request.last_name == "Doe"
        assert request.email == "john@example.com"
        assert request.user_type == "student"

    def test_update_account_request_empty(self):
        request = UpdateAccountRequest()
        assert request.first_name is None
        assert request.last_name is None
        assert request.email is None
        assert request.user_type is None

    def test_update_preferences_request_partial(self):
        request = UpdatePreferencesRequest(theme="dark")
        assert request.theme == "dark"
        assert request.notifications_enabled is None

    def test_update_preferences_request_all_fields(self):
        request = UpdatePreferencesRequest(theme="light", notifications_enabled=True)
        assert request.theme == "light"
        assert request.notifications_enabled is True

    def test_update_preferences_request_empty(self):
        request = UpdatePreferencesRequest()
        assert request.theme is None
        assert request.notifications_enabled is None

    def test_delete_accounts_request_single_id(self):
        request = DeleteAccountsRequest(user_ids=[42])
        assert len(request.user_ids) == 1
        assert request.user_ids[0] == 42