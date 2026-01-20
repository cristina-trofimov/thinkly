
import pytest
from unittest.mock import Mock, patch
from fastapi import HTTPException
from sqlalchemy.orm import Session
from src.endpoints.manage_accounts_api import (
    get_all_accounts,
    delete_multiple_accounts,
    update_account,
    DeleteAccountsRequest,
    UpdateAccountRequest
)


# Test fixtures
@pytest.fixture
def mock_db():
    """Mock database session"""
    db = Mock(spec=Session)
    return db


@pytest.fixture
def sample_user_account():
    """Sample user account"""
    user = Mock()
    user.user_id = 1
    user.first_name = "John"
    user.last_name = "Doe"
    user.email = "john.doe@example.com"
    user.user_type = "student"
    return user


@pytest.fixture
def sample_user_accounts():
    """Sample list of user accounts"""
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


class TestGetAllAccounts:
    """Tests for get_all_accounts endpoint"""

    def test_get_all_accounts_success(self, mock_db, sample_user_accounts):
        """Test successful retrieval of all accounts"""
        mock_db.query.return_value.all.return_value = sample_user_accounts

        result = get_all_accounts(mock_db)

        assert result == sample_user_accounts
        assert len(result) == 5

    def test_get_all_accounts_empty(self, mock_db):
        """Test when no accounts exist"""
        mock_db.query.return_value.all.return_value = []

        result = get_all_accounts(mock_db)

        assert result == []

    def test_get_all_accounts_database_called(self, mock_db, sample_user_accounts):
        """Test that database query is called correctly"""
        mock_db.query.return_value.all.return_value = sample_user_accounts

        get_all_accounts(mock_db)

        mock_db.query.assert_called_once()


class TestDeleteMultipleAccounts:
    """Tests for delete_multiple_accounts endpoint"""

    def test_delete_single_account_success(self, mock_db):
        """Test successful deletion of a single account"""
        payload = DeleteAccountsRequest(user_ids=[1])

        # Mock the query to find existing user
        mock_user_id = Mock()
        mock_user_id.user_id = 1
        mock_db.query.return_value.filter.return_value.all.return_value = [mock_user_id]

        # Mock the delete operation
        mock_db.query.return_value.filter.return_value.delete.return_value = 1

        result = delete_multiple_accounts(payload, mock_db)

        assert result["deleted_count"] == 1
        assert len(result["deleted_users"]) == 1
        assert result["deleted_users"][0]["user_id"] == 1
        assert result["total_requested"] == 1
        assert len(result["errors"]) == 0
        mock_db.commit.assert_called_once()

    def test_delete_multiple_accounts_success(self, mock_db):
        """Test successful deletion of multiple accounts"""
        payload = DeleteAccountsRequest(user_ids=[1, 2, 3])

        # Mock the query to find existing users
        mock_users = [Mock(user_id=1), Mock(user_id=2), Mock(user_id=3)]
        mock_db.query.return_value.filter.return_value.all.return_value = mock_users

        # Mock the delete operation
        mock_db.query.return_value.filter.return_value.delete.return_value = 3

        result = delete_multiple_accounts(payload, mock_db)

        assert result["deleted_count"] == 3
        assert len(result["deleted_users"]) == 3
        assert result["total_requested"] == 3
        assert len(result["errors"]) == 0

    def test_delete_accounts_with_missing_ids(self, mock_db):
        """Test deletion when some user IDs don't exist"""
        payload = DeleteAccountsRequest(user_ids=[1, 2, 999])

        # Mock the query to find only existing users
        mock_users = [Mock(user_id=1), Mock(user_id=2)]
        mock_db.query.return_value.filter.return_value.all.return_value = mock_users

        # Mock the delete operation
        mock_db.query.return_value.filter.return_value.delete.return_value = 2

        result = delete_multiple_accounts(payload, mock_db)

        assert result["deleted_count"] == 2
        assert len(result["deleted_users"]) == 2
        assert result["total_requested"] == 3
        assert len(result["errors"]) == 1
        assert result["errors"][0]["user_id"] == 999
        assert result["errors"][0]["error"] == "User not found."

    def test_delete_accounts_all_missing(self, mock_db):
        """Test deletion when all user IDs don't exist"""
        payload = DeleteAccountsRequest(user_ids=[998, 999])

        # Mock the query to find no users
        mock_db.query.return_value.filter.return_value.all.return_value = []

        result = delete_multiple_accounts(payload, mock_db)

        assert result["deleted_count"] == 0
        assert len(result["deleted_users"]) == 0
        assert result["total_requested"] == 2
        assert len(result["errors"]) == 2

    def test_delete_accounts_with_duplicates(self, mock_db):
        """Test deletion with duplicate user IDs in request"""
        payload = DeleteAccountsRequest(user_ids=[1, 1, 2, 2, 3])

        # Mock the query to find existing users (deduplicated)
        mock_users = [Mock(user_id=1), Mock(user_id=2), Mock(user_id=3)]
        mock_db.query.return_value.filter.return_value.all.return_value = mock_users

        # Mock the delete operation
        mock_db.query.return_value.filter.return_value.delete.return_value = 3

        result = delete_multiple_accounts(payload, mock_db)

        # Should deduplicate the IDs
        assert result["deleted_count"] == 3
        assert result["total_requested"] == 3  # After deduplication

    def test_delete_accounts_database_error(self, mock_db):
        """Test database error handling during deletion"""
        payload = DeleteAccountsRequest(user_ids=[1])

        mock_db.query.side_effect = Exception("Database error")

        with pytest.raises(HTTPException) as exc_info:
            delete_multiple_accounts(payload, mock_db)

        assert exc_info.value.status_code == 500
        assert exc_info.value.detail == "Error deleting accounts."
        mock_db.rollback.assert_called_once()


class TestUpdateAccount:
    """Tests for update_account endpoint"""

    def test_update_account_single_field(self, mock_db, sample_user_account):
        """Test updating a single field"""
        mock_db.query.return_value.filter.return_value.first.return_value = sample_user_account

        update_data = UpdateAccountRequest(first_name="Jane")

        result = update_account(1, update_data, mock_db)

        assert result.first_name == "Jane"
        mock_db.commit.assert_called_once()
        mock_db.refresh.assert_called_once_with(sample_user_account)

    def test_update_account_multiple_fields(self, mock_db, sample_user_account):
        """Test updating multiple fields"""
        mock_db.query.return_value.filter.return_value.first.return_value = sample_user_account

        update_data = UpdateAccountRequest(
            first_name="Jane",
            last_name="Smith",
            email="jane.smith@example.com"
        )

        result = update_account(1, update_data, mock_db)

        assert result.first_name == "Jane"
        assert result.last_name == "Smith"
        assert result.email == "jane.smith@example.com"

    def test_update_account_all_fields(self, mock_db, sample_user_account):
        """Test updating all fields"""
        mock_db.query.return_value.filter.return_value.first.return_value = sample_user_account

        update_data = UpdateAccountRequest(
            first_name="Jane",
            last_name="Smith",
            email="jane.smith@example.com",
            user_type="instructor"
        )

        result = update_account(1, update_data, mock_db)

        assert result.first_name == "Jane"
        assert result.last_name == "Smith"
        assert result.email == "jane.smith@example.com"
        assert result.user_type == "instructor"

    def test_update_account_not_found(self, mock_db):
        """Test updating non-existent account"""
        mock_db.query.return_value.filter.return_value.first.return_value = None

        update_data = UpdateAccountRequest(first_name="Jane")

        with pytest.raises(HTTPException) as exc_info:
            update_account(999, update_data, mock_db)

        assert exc_info.value.status_code == 404
        assert exc_info.value.detail == "Account not found."

    def test_update_account_no_fields(self, mock_db, sample_user_account):
        """Test updating with no fields provided"""
        mock_db.query.return_value.filter.return_value.first.return_value = sample_user_account

        update_data = UpdateAccountRequest()

        with pytest.raises(HTTPException) as exc_info:
            update_account(1, update_data, mock_db)

        assert exc_info.value.status_code == 400
        assert exc_info.value.detail == "No fields to update."


class TestRequestModels:
    """Tests for Pydantic request models"""

    def test_delete_accounts_request_valid(self):
        """Test valid DeleteAccountsRequest"""
        request = DeleteAccountsRequest(user_ids=[1, 2, 3])
        assert request.user_ids == [1, 2, 3]

    def test_delete_accounts_request_empty_list(self):
        """Test DeleteAccountsRequest with empty list"""
        with pytest.raises(ValueError):
            DeleteAccountsRequest(user_ids=[])

    def test_update_account_request_partial(self):
        """Test UpdateAccountRequest with partial data"""
        request = UpdateAccountRequest(first_name="John")
        assert request.first_name == "John"
        assert request.last_name is None
        assert request.email is None
        assert request.user_type is None

    def test_update_account_request_all_fields(self):
        """Test UpdateAccountRequest with all fields"""
        request = UpdateAccountRequest(
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            user_type="student"
        )
        assert request.first_name == "John"
        assert request.last_name == "Doe"
        assert request.email == "john@example.com"
        assert request.user_type == "student"

    def test_update_account_request_empty(self):
        """Test UpdateAccountRequest with no fields"""
        request = UpdateAccountRequest()
        assert request.first_name is None
        assert request.last_name is None
        assert request.email is None
        assert request.user_type is None