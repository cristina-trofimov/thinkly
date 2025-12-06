import pytest
import os
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch

# Mock environment variables BEFORE importing the module
os.environ['BREVO_API_KEY'] = 'test_api_key_12345'
os.environ['DEFAULT_SENDER_EMAIL'] = 'sender@example.com'  # Use a valid-looking email
os.environ['DEFAULT_SENDER_NAME'] = 'Test Sender'

from main import app
from endpoints import send_email_api

client = TestClient(app)


# ---------------- Tests ----------------
class TestEmailEndpoints:

    def test_health_endpoint(self):
        """Test the health check endpoint"""
        response = client.get("/email/health")
        assert response.status_code == 200
        assert response.json() == {"ok": True}

    def test_index_endpoint(self):
        """Test the index endpoint"""
        response = client.get("/email/")
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert "endpoints" in data

    @patch('endpoints.send_email_api.validate_email')
    @patch('endpoints.send_email_api.requests.post')
    def test_send_email_success(self, mock_post, mock_validate):
        """Test successful email sending"""
        # Mock email validation to always pass
        mock_validate.return_value = True

        # Mock Brevo API response
        mock_response = Mock()
        mock_response.status_code = 201
        mock_response.json.return_value = {"messageId": "12345"}
        mock_post.return_value = mock_response

        payload = {
            "to": ["test@example.com"],
            "subject": "Test Subject",
            "text": "Test email content"
        }

        response = client.post("/email/send", json=payload)

        # Debug: print the response if it fails
        if response.status_code != 200:
            print(f"Response: {response.status_code}")
            print(f"Body: {response.json()}")

        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert data["brevo"]["messageId"] == "12345"
        assert data["scheduledAt"] is None

        # Verify the API was called with correct parameters
        mock_post.assert_called_once()
        call_args = mock_post.call_args
        assert call_args.kwargs["json"]["subject"] == "Test Subject"
        assert call_args.kwargs["json"]["textContent"] == "Test email content"

    @patch('endpoints.send_email_api.validate_email')
    @patch('endpoints.send_email_api.requests.post')
    def test_send_email_multiple_recipients(self, mock_post, mock_validate):
        """Test sending email to multiple recipients"""
        mock_validate.return_value = True

        mock_response = Mock()
        mock_response.status_code = 201
        mock_response.json.return_value = {"messageId": "67890"}
        mock_post.return_value = mock_response

        payload = {
            "to": ["user1@example.com", "user2@example.com", "user3@example.com"],
            "subject": "Team Update",
            "text": "Hello team!"
        }

        response = client.post("/email/send", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True

        # Verify multiple recipients were sent
        call_args = mock_post.call_args
        recipients = call_args.kwargs["json"]["to"]
        assert len(recipients) == 3
        assert {"email": "user1@example.com"} in recipients

    @patch('endpoints.send_email_api.validate_email')
    @patch('endpoints.send_email_api.requests.post')
    def test_send_email_with_scheduled_time(self, mock_post, mock_validate):
        """Test sending email with scheduled time"""
        mock_validate.return_value = True

        mock_response = Mock()
        mock_response.status_code = 201
        mock_response.json.return_value = {"messageId": "scheduled123"}
        mock_post.return_value = mock_response

        payload = {
            "to": ["scheduled@example.com"],
            "subject": "Scheduled Email",
            "text": "This will be sent later",
            "sendAt": "2025-12-25T10:00:00Z"
        }

        response = client.post("/email/send", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert data["scheduledAt"] == "2025-12-25T10:00:00Z"

        # Verify scheduledAt was included in API call
        call_args = mock_post.call_args
        assert "scheduledAt" in call_args.kwargs["json"]

    def test_send_email_invalid_recipient(self):
        """Test validation of invalid email address"""
        payload = {
            "to": ["not-an-email"],
            "subject": "Test",
            "text": "Test content"
        }

        response = client.post("/email/send", json=payload)
        assert response.status_code == 422
        assert "Invalid recipient" in str(response.json())

    def test_send_email_empty_recipients(self):
        """Test validation of empty recipients list"""
        payload = {
            "to": [],
            "subject": "Test",
            "text": "Test content"
        }

        response = client.post("/email/send", json=payload)
        assert response.status_code == 422

    def test_send_email_missing_subject(self):
        """Test validation of missing subject"""
        payload = {
            "to": ["test@example.com"],
            "subject": "",
            "text": "Test content"
        }

        response = client.post("/email/send", json=payload)
        assert response.status_code == 422

    def test_send_email_missing_text(self):
        """Test validation of missing text content"""
        payload = {
            "to": ["test@example.com"],
            "subject": "Test",
            "text": ""
        }

        response = client.post("/email/send", json=payload)
        assert response.status_code == 422

    @patch('endpoints.send_email_api.validate_email')
    def test_send_email_invalid_scheduled_time(self, mock_validate):
        """Test validation of invalid scheduled time format"""
        mock_validate.return_value = True

        payload = {
            "to": ["test@example.com"],
            "subject": "Test",
            "text": "Test content",
            "sendAt": "not-a-valid-date"
        }

        response = client.post("/email/send", json=payload)
        assert response.status_code == 400
        assert "valid ISO8601 timestamp" in response.json()["detail"]

    @patch('endpoints.send_email_api.validate_email')
    @patch('endpoints.send_email_api.requests.post')
    def test_send_email_brevo_api_error(self, mock_post, mock_validate):
        """Test handling of Brevo API errors"""
        mock_validate.return_value = True

        mock_response = Mock()
        mock_response.status_code = 400
        mock_response.json.return_value = {"message": "Invalid API key"}
        mock_post.return_value = mock_response

        payload = {
            "to": ["test@example.com"],
            "subject": "Test",
            "text": "Test content"
        }

        response = client.post("/email/send", json=payload)

        assert response.status_code == 502
        data = response.json()
        assert "Brevo API error" in data["detail"]["error"]

    @patch('endpoints.send_email_api.validate_email')
    @patch('endpoints.send_email_api.requests.post')
    def test_send_email_network_error(self, mock_post, mock_validate):
        """Test handling of network errors"""
        import requests
        mock_validate.return_value = True
        mock_post.side_effect = requests.RequestException("Connection timeout")

        payload = {
            "to": ["test@example.com"],
            "subject": "Test",
            "text": "Test content"
        }

        response = client.post("/email/send", json=payload)

        assert response.status_code == 502
        data = response.json()
        assert "Network error" in data["detail"]["error"]

    @patch('endpoints.send_email_api.validate_email')
    @patch('endpoints.send_email_api.requests.post')
    def test_send_email_strips_whitespace(self, mock_post, mock_validate):
        """Test that subject and text are stripped of whitespace"""
        mock_validate.return_value = True

        mock_response = Mock()
        mock_response.status_code = 201
        mock_response.json.return_value = {"messageId": "strip123"}
        mock_post.return_value = mock_response

        payload = {
            "to": ["test@example.com"],
            "subject": "  Test Subject  ",
            "text": "  Test content  "
        }

        response = client.post("/email/send", json=payload)

        assert response.status_code == 200

        # Verify whitespace was stripped
        call_args = mock_post.call_args
        assert call_args.kwargs["json"]["subject"] == "Test Subject"
        assert call_args.kwargs["json"]["textContent"] == "Test content"

    @patch('endpoints.send_email_api.validate_email')
    @patch('endpoints.send_email_api.requests.post')
    def test_send_email_with_timezone_conversion(self, mock_post, mock_validate):
        """Test scheduled time with timezone conversion"""
        mock_validate.return_value = True

        mock_response = Mock()
        mock_response.status_code = 201
        mock_response.json.return_value = {"messageId": "tz123"}
        mock_post.return_value = mock_response

        payload = {
            "to": ["test@example.com"],
            "subject": "Test",
            "text": "Test content",
            "sendAt": "2025-12-25T10:00:00+05:00"  # Non-UTC timezone
        }

        response = client.post("/email/send", json=payload)

        assert response.status_code == 200
        data = response.json()
        # Should be normalized to UTC with Z suffix
        assert data["scheduledAt"].endswith("Z")

    def test_send_email_missing_required_fields(self):
        """Test missing required fields"""
        # Missing 'to' field
        payload = {
            "subject": "Test",
            "text": "Test content"
        }
        response = client.post("/email/send", json=payload)
        assert response.status_code == 422

        # Missing 'subject' field
        payload = {
            "to": ["test@example.com"],
            "text": "Test content"
        }
        response = client.post("/email/send", json=payload)
        assert response.status_code == 422

        # Missing 'text' field
        payload = {
            "to": ["test@example.com"],
            "subject": "Test"
        }
        response = client.post("/email/send", json=payload)
        assert response.status_code == 422

    @patch('endpoints.send_email_api.validate_email')
    @patch('endpoints.send_email_api.requests.post')
    def test_send_email_brevo_returns_non_json(self, mock_post, mock_validate):
        """Test handling when Brevo returns non-JSON response"""
        mock_validate.return_value = True

        mock_response = Mock()
        mock_response.status_code = 500
        mock_response.json.side_effect = Exception("Not JSON")
        mock_response.text = "Internal Server Error"
        mock_post.return_value = mock_response

        payload = {
            "to": ["test@example.com"],
            "subject": "Test",
            "text": "Test content"
        }

        response = client.post("/email/send", json=payload)

        assert response.status_code == 502
        data = response.json()
        assert data["detail"]["detail"] == "Internal Server Error"


class TestNormalizeIsoUtc:
    """Test the normalize_iso_utc utility function"""

    def test_normalize_iso_utc_with_z_suffix(self):
        """Test normalization with Z suffix"""
        from endpoints.send_email_api import normalize_iso_utc
        result = normalize_iso_utc("2025-12-25T10:00:00Z")
        assert result == "2025-12-25T10:00:00Z"

    def test_normalize_iso_utc_without_timezone(self):
        """Test normalization without timezone (assumes UTC)"""
        from endpoints.send_email_api import normalize_iso_utc
        result = normalize_iso_utc("2025-12-25T10:00:00")
        assert result == "2025-12-25T10:00:00Z"

    def test_normalize_iso_utc_with_offset(self):
        """Test normalization with timezone offset"""
        from endpoints.send_email_api import normalize_iso_utc
        result = normalize_iso_utc("2025-12-25T10:00:00+05:00")
        # Should convert to UTC
        assert result.endswith("Z")

    def test_normalize_iso_utc_with_none(self):
        """Test normalization with None input"""
        from endpoints.send_email_api import normalize_iso_utc
        result = normalize_iso_utc(None)
        assert result is None

    def test_normalize_iso_utc_with_empty_string(self):
        """Test normalization with empty string"""
        from endpoints.send_email_api import normalize_iso_utc
        result = normalize_iso_utc("")
        assert result is None

    def test_normalize_iso_utc_with_invalid_format(self):
        """Test normalization with invalid format"""
        from endpoints.send_email_api import normalize_iso_utc
        result = normalize_iso_utc("not-a-date")
        assert result is None