import unittest
import pytest
from unittest.mock import Mock, patch, MagicMock

from email_validator import EmailNotValidError
from fastapi import HTTPException
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.endpoints.send_email_api import (
    normalize_iso_utc,
    send_email_via_brevo,
    send_email,
    health,
    index,
    SendEmailRequest
)


class TestNormalizeIsoUtc:
    """Tests for normalize_iso_utc helper function"""

    def test_normalize_none(self):
        """Test with None input"""
        result = normalize_iso_utc(None)
        assert result is None

    def test_normalize_empty_string(self):
        """Test with empty string"""
        result = normalize_iso_utc("")
        assert result is None

    def test_normalize_with_z_suffix(self):
        """Test ISO string with Z suffix"""
        result = normalize_iso_utc("2025-01-15T10:30:00Z")
        assert result == "2025-01-15T10:30:00Z"

    def test_normalize_with_timezone(self):
        """Test ISO string with timezone offset"""
        result = normalize_iso_utc("2025-01-15T10:30:00+00:00")
        assert result == "2025-01-15T10:30:00Z"

    def test_normalize_without_timezone(self):
        """Test ISO string without timezone (assumes UTC)"""
        result = normalize_iso_utc("2025-01-15T10:30:00")
        assert result == "2025-01-15T10:30:00Z"

    def test_normalize_invalid_format(self):
        """Test with invalid ISO format"""
        result = normalize_iso_utc("invalid-date")
        assert result is None

    def test_normalize_with_whitespace(self):
        """Test ISO string with whitespace"""
        result = normalize_iso_utc("  2025-01-15T10:30:00Z  ")
        assert result == "2025-01-15T10:30:00Z"


class TestSendEmailViaBrevo(unittest.TestCase):
    """Tests for send_email_via_brevo function"""

    @patch("src.endpoints.send_email_api.validate_email")
    @patch("src.endpoints.send_email_api.requests")
    @patch("src.endpoints.send_email_api.BREVO_API_KEY", "test-key")
    @patch("src.endpoints.send_email_api.DEFAULT_SENDER_EMAIL", "sender@example.com")
    def test_send_email_success(self, mock_requests, mock_validate):
        mock_validate.return_value = None

        mock_response = Mock(status_code=201)
        mock_response.json.return_value = {"messageId": "abc123"}
        mock_requests.post.return_value = mock_response

        result = send_email_via_brevo(
            to=["user@example.com"],
            subject="Test",
            text="Hello"
        )

        assert result["brevo"]["messageId"] == "abc123"

    @patch("src.endpoints.send_email_api.validate_email")
    @patch("src.endpoints.send_email_api.requests")
    @patch("src.endpoints.send_email_api.BREVO_API_KEY", "test-key")
    @patch("src.endpoints.send_email_api.DEFAULT_SENDER_EMAIL", "sender@example.com")
    def test_send_email_with_html(self, mock_requests, mock_validate):
        mock_validate.return_value = None

        mock_response = Mock(status_code=201)
        mock_response.json.return_value = {"messageId": "html123"}
        mock_requests.post.return_value = mock_response

        result = send_email_via_brevo(
            to=["user@example.com"],
            subject="HTML",
            text="fallback",
            html="<h1>Hello</h1>"
        )

        assert result["brevo"]["messageId"] == "html123"

    @patch("src.endpoints.send_email_api.validate_email")
    @patch("src.endpoints.send_email_api.requests")
    @patch("src.endpoints.send_email_api.BREVO_API_KEY", "test-key")
    @patch("src.endpoints.send_email_api.DEFAULT_SENDER_EMAIL", "sender@example.com")
    def test_send_email_scheduled(self, mock_requests, mock_validate):
        mock_validate.return_value = None

        mock_response = Mock(status_code=201)
        mock_response.json.return_value = {"messageId": "scheduled123"}
        mock_requests.post.return_value = mock_response

        result = send_email_via_brevo(
            to=["user@example.com"],
            subject="Scheduled",
            text="Body",
            sendAt="2025-12-31T10:00:00Z"
        )

        assert result["brevo"]["messageId"] == "scheduled123"


    @patch('src.endpoints.send_email_api.BREVO_API_KEY', 'test-key')
    @patch('src.endpoints.send_email_api.DEFAULT_SENDER_EMAIL', 'invalid-email')
    def test_send_email_invalid_sender(self):
        """Test with invalid sender email"""
        with pytest.raises(ValueError, match="Invalid sender email"):
            send_email_via_brevo(
                to=["recipient@example.com"],
                subject="Test",
                text="Body"
            )

    @patch("src.endpoints.send_email_api.validate_email")
    @patch("src.endpoints.send_email_api.DEFAULT_SENDER_EMAIL", "sender@example.com")
    def test_empty_recipients(self, mock_validate):
        mock_validate.return_value = None

        with pytest.raises(ValueError):
            send_email_via_brevo(to=[], subject="Test", text="Body")

    @patch("src.endpoints.send_email_api.validate_email")
    @patch("src.endpoints.send_email_api.DEFAULT_SENDER_EMAIL", "sender@example.com")
    def test_send_email_invalid_recipient(self, mock_validate):
        def validate_side_effect(value):
            if value == "not-an-email":
                raise EmailNotValidError("invalid", "invalid")
            return None

        mock_validate.side_effect = validate_side_effect

        with pytest.raises(ValueError):
            send_email_via_brevo(
                to=["not-an-email"],
                subject="Invalid Recipient",
                text="Hello"
            )

    @patch("src.endpoints.send_email_api.validate_email")
    @patch("src.endpoints.send_email_api.requests")
    @patch.dict("src.endpoints.send_email_api.__dict__", {"BREVO_API_KEY": "test-key",
                                                          "DEFAULT_SENDER_EMAIL": "sender@example.com",
                                                          "DEFAULT_SENDER_NAME": "Test Sender"})
    def test_send_email_empty_subject(self, mock_requests, mock_validate):
        """Test sending email with empty subject raises ValueError"""
        mock_validate.return_value = None

        with pytest.raises(ValueError, match="Email subject is required"):
            send_email_via_brevo(
                to=["recipient@example.com"],
                subject="",
                text="Body"
            )

    @patch("src.endpoints.send_email_api.validate_email")
    @patch("src.endpoints.send_email_api.DEFAULT_SENDER_EMAIL", "sender@example.com")
    def test_empty_text(self, mock_validate):
        mock_validate.return_value = None

        with pytest.raises(ValueError):
            send_email_via_brevo(
                to=["user@example.com"],
                subject="Test",
                text=""
            )

    @patch("src.endpoints.send_email_api.validate_email")
    @patch("src.endpoints.send_email_api.requests")
    @patch("src.endpoints.send_email_api.BREVO_API_KEY", "test-key")
    @patch("src.endpoints.send_email_api.DEFAULT_SENDER_EMAIL", "sender@example.com")
    @patch("src.endpoints.send_email_api.DEFAULT_SENDER_NAME", "Test Sender")
    def test_send_email_network_error(self, mock_requests, mock_validate_email):
        mock_validate_email.return_value = None
        mock_requests.post.side_effect = Exception("Network error")

        with pytest.raises(RuntimeError) as exc:
            send_email_via_brevo(
                to=["user@example.com"],
                subject="Fail",
                text="Fail content"
            )

        # ✅ Check the exception message only
        assert "Network error" in str(exc.value)

    @patch("src.endpoints.send_email_api.validate_email")
    @patch("src.endpoints.send_email_api.requests")
    @patch("src.endpoints.send_email_api.BREVO_API_KEY", "test-key")
    @patch("src.endpoints.send_email_api.DEFAULT_SENDER_EMAIL", "sender@example.com")
    def test_api_error(self, mock_requests, mock_validate):
        mock_validate.return_value = None

        mock_response = Mock(status_code=400)
        mock_response.json.return_value = {"message": "Invalid request"}
        mock_requests.post.return_value = mock_response

        with pytest.raises(RuntimeError):
            send_email_via_brevo(
                to=["user@example.com"],
                subject="Test",
                text="Body"
            )

    @patch("src.endpoints.send_email_api.validate_email")
    @patch("src.endpoints.send_email_api.requests")
    @patch("src.endpoints.send_email_api.BREVO_API_KEY", "test-key")
    @patch("src.endpoints.send_email_api.DEFAULT_SENDER_EMAIL", "sender@example.com")
    def test_send_email_multiple_recipients(self, mock_requests, mock_validate):
        mock_validate.return_value = None

        mock_response = Mock(status_code=200)
        mock_response.json.return_value = {"messageId": "msg-123"}
        mock_requests.post.return_value = mock_response

        result = send_email_via_brevo(
            to=["recipient1@example.com", "recipient2@example.com"],
            subject="Test",
            text="Body"
        )

        assert result["brevo"]["messageId"] == "msg-123"


class TestSendEmailEndpoint:
    """Tests for send_email endpoint"""

    @pytest.mark.asyncio
    @patch("src.endpoints.send_email_api.send_email_via_brevo")
    async def test_send_email_success(self, mock_send):
        mock_send.return_value = {"brevo": {"messageId": "msg-123"}}

        request = Mock(to=["a@b.com"], subject="Test", text="Body", sendAt=None)
        result = await send_email(request)

        assert result["ok"] is True

    @pytest.mark.asyncio
    @patch("src.endpoints.send_email_api.send_email_via_brevo")
    async def test_send_email_error(self, mock_send):
        mock_send.side_effect = Exception("fail")

        request = Mock(to=["a@b.com"], subject="Test", text="Body", sendAt=None)

        with pytest.raises(HTTPException):
            await send_email(request)


class TestSendEmailRequestModel:
    """Tests for SendEmailRequest Pydantic model"""

    @patch('src.endpoints.send_email_api.validate_email')
    def test_valid_request(self, mock_validate):
        """Test valid email request"""
        mock_validate.return_value = True

        request = SendEmailRequest(
            to=["test@example.com"],
            subject="Test Subject",
            text="Test body"
        )
        assert request.to == ["test@example.com"]
        assert request.subject == "Test Subject"
        assert request.text == "Test body"
        assert request.sendAt is None

    @patch('src.endpoints.send_email_api.validate_email')
    def test_request_with_schedule(self, mock_validate):
        """Test request with scheduled time"""
        mock_validate.return_value = True

        request = SendEmailRequest(
            to=["test@example.com"],
            subject="Test",
            text="Body",
            sendAt="2025-01-20T10:00:00Z"
        )
        assert request.sendAt == "2025-01-20T10:00:00Z"

    def test_invalid_recipient_empty_list(self):
        """Test validation with empty recipient list"""
        with pytest.raises(ValueError):
            SendEmailRequest(
                to=[],
                subject="Test",
                text="Body"
            )

    @patch('src.endpoints.send_email_api.validate_email')
    def test_invalid_recipient_email(self, mock_validate):
        """Test validation with invalid email"""
        from email_validator import EmailNotValidError
        mock_validate.side_effect = EmailNotValidError("Invalid email")

        with pytest.raises(ValueError):
            SendEmailRequest(
                to=["invalid-email"],
                subject="Test",
                text="Body"
            )

    @patch('src.endpoints.send_email_api.validate_email')
    def test_empty_subject(self, mock_validate):
        """Test validation with empty subject"""
        mock_validate.return_value = True

        with pytest.raises(ValueError):
            SendEmailRequest(
                to=["test@example.com"],
                subject="",
                text="Body"
            )

    @patch('src.endpoints.send_email_api.validate_email')
    def test_empty_text(self, mock_validate):
        """Test validation with empty text"""
        mock_validate.return_value = True

        with pytest.raises(ValueError):
            SendEmailRequest(
                to=["test@example.com"],
                subject="Test",
                text=""
            )

    @patch('src.endpoints.send_email_api.validate_email')
    def test_whitespace_trimming(self, mock_validate):
        """Test that whitespace is trimmed from subject and text"""
        mock_validate.return_value = True

        request = SendEmailRequest(
            to=["test@example.com"],
            subject="  Test Subject  ",
            text="  Test body  "
        )
        assert request.subject == "Test Subject"
        assert request.text == "Test body"

    @patch('src.endpoints.send_email_api.validate_email')
    def test_multiple_recipients(self, mock_validate):
        """Test with multiple recipients"""
        mock_validate.return_value = True

        request = SendEmailRequest(
            to=["test1@example.com", "test2@example.com"],
            subject="Test",
            text="Body"
        )
        assert len(request.to) == 2


class TestHealthAndIndexEndpoints:
    """Tests for health and index endpoints"""

    def test_health_endpoint(self):
        """Test health check endpoint"""
        result = health()
        assert result == {"ok": True}

    def test_index_endpoint(self):
        """Test index endpoint"""
        result = index()
        assert result["ok"] is True
        assert "endpoints" in result
        assert isinstance(result["endpoints"], list)