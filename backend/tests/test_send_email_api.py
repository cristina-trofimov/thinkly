import unittest
import pytest
from unittest.mock import Mock, patch

from email_validator import EmailNotValidError
from fastapi import HTTPException
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.endpoints.send_email_api import (
    send_email_via_brevo,
    send_email,
    health,
    index,
    SendEmailRequest
)


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
    @patch("src.endpoints.send_email_api.DEFAULT_SENDER_EMAIL", "sender@example.com")
    def test_send_email_empty_subject(self, mock_validate):
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
    @patch("src.endpoints.send_email_api.track_custom_event")
    @patch("src.endpoints.send_email_api.send_email_via_brevo")
    @patch("src.endpoints.send_email_api.BREVO_API_KEY", "test-key")
    @patch("src.endpoints.send_email_api.DEFAULT_SENDER_EMAIL", "sender@example.com")
    async def test_send_email_success(self, mock_send, mock_track):
        mock_send.return_value = {"brevo": {"messageId": "msg-123"}}

        request = Mock(to=["a@b.com"], subject="Test", text="Body")

        result = await send_email(request)

        assert result["ok"] is True
        mock_send.assert_called_once()
        mock_track.assert_called_once()

    @pytest.mark.asyncio
    @patch("src.endpoints.send_email_api.send_email_via_brevo")
    @patch("src.endpoints.send_email_api.BREVO_API_KEY", "test-key")
    @patch("src.endpoints.send_email_api.DEFAULT_SENDER_EMAIL", "sender@example.com")
    async def test_send_email_error(self, mock_send):
        mock_send.side_effect = Exception("fail")

        request = Mock(to=["a@b.com"], subject="Test", text="Body")

        with pytest.raises(HTTPException) as exc:
            await send_email(request)

        assert exc.value.status_code == 400
        assert exc.value.detail == "Error sending email."
        mock_send.assert_called_once()

    @pytest.mark.asyncio
    @patch("src.endpoints.send_email_api.BREVO_API_KEY", None)
    @patch("src.endpoints.send_email_api.DEFAULT_SENDER_EMAIL", "sender@example.com")
    async def test_send_email_503_when_api_key_missing(self):
        request = Mock(to=["a@b.com"], subject="Test", text="Body")

        with pytest.raises(HTTPException) as exc:
            await send_email(request)

        assert exc.value.status_code == 503
        assert exc.value.detail == "Email service is not configured."

    @pytest.mark.asyncio
    @patch("src.endpoints.send_email_api.BREVO_API_KEY", "test-key")
    @patch("src.endpoints.send_email_api.DEFAULT_SENDER_EMAIL", None)
    async def test_send_email_503_when_sender_email_missing(self):
        request = Mock(to=["a@b.com"], subject="Test", text="Body")

        with pytest.raises(HTTPException) as exc:
            await send_email(request)

        assert exc.value.status_code == 503
        assert exc.value.detail == "Email service is not configured."


class TestSendEmailRequestModel:
    """Tests for SendEmailRequest Pydantic model"""

    @patch('src.endpoints.send_email_api.validate_email')
    def test_valid_request(self, mock_validate):
        mock_validate.return_value = True

        request = SendEmailRequest(
            to=["test@example.com"],
            subject="Test Subject",
            text="Test body"
        )
        assert request.to == ["test@example.com"]
        assert request.subject == "Test Subject"
        assert request.text == "Test body"

    def test_invalid_recipient_empty_list(self):
        with pytest.raises(ValueError):
            SendEmailRequest(
                to=[],
                subject="Test",
                text="Body"
            )

    @patch('src.endpoints.send_email_api.validate_email')
    def test_invalid_recipient_email(self, mock_validate):
        mock_validate.side_effect = EmailNotValidError("Invalid email")

        with pytest.raises(ValueError):
            SendEmailRequest(
                to=["invalid-email"],
                subject="Test",
                text="Body"
            )

    @patch('src.endpoints.send_email_api.validate_email')
    def test_empty_subject(self, mock_validate):
        mock_validate.return_value = True

        with pytest.raises(ValueError):
            SendEmailRequest(
                to=["test@example.com"],
                subject="",
                text="Body"
            )

    @patch('src.endpoints.send_email_api.validate_email')
    def test_empty_text(self, mock_validate):
        mock_validate.return_value = True

        with pytest.raises(ValueError):
            SendEmailRequest(
                to=["test@example.com"],
                subject="Test",
                text=""
            )

    @patch('src.endpoints.send_email_api.validate_email')
    def test_whitespace_trimming(self, mock_validate):
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
        result = health()
        assert result == {"ok": True}

    def test_index_endpoint(self):
        result = index()
        assert result["ok"] is True
        assert "endpoints" in result
        assert isinstance(result["endpoints"], list)