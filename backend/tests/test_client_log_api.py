import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from src.endpoints import log


@pytest.fixture
def app():
    app = FastAPI()
    app.include_router(log.log_router, prefix="/log")
    return app


@pytest.fixture
def client(app):
    return TestClient(app)


class TestClientLogEndpoint:

    def test_log_info_level_success(self, client):
        payload = {
            "level": "INFO",
            "message": "Test log message",
            "component": "TestComponent",
            "url": "/test/url",
        }

        with patch("src.endpoints.log.logger") as mock_logger:
            response = client.post("/log/client-log", json=payload)

            assert response.status_code == 204
            mock_logger.info.assert_called_once()
            logged_message = mock_logger.info.call_args[0][0]

            assert "Test log message" in logged_message
            assert "TestComponent" in logged_message
            assert "/test/url" in logged_message


    def test_log_error_level_with_stack(self, client):
        payload = {
            "level": "ERROR",
            "message": "Something broke",
            "component": "CrashComponent",
            "url": "/crash",
            "stack": "Traceback line 1\nTraceback line 2",
        }

        with patch("src.endpoints.log.logger") as mock_logger:
            response = client.post("/log/client-log", json=payload)

            assert response.status_code == 204
            mock_logger.error.assert_called_once()

            logged_message = mock_logger.error.call_args[0][0]
            assert "STACK_SNIPPET" in logged_message
            assert "Traceback line 1" in logged_message


    def test_unknown_log_level_falls_back_to_info(self, client):
        payload = {
            "level": "NOT_A_LEVEL",
            "message": "Weird level",
            "component": "TestComponent",
            "url": "/weird",
        }

        with patch("src.endpoints.log.logger") as mock_logger:
            response = client.post("/log/client-log", json=payload)

            assert response.status_code == 204
            mock_logger.info.assert_called_once()


    def test_invalid_payload_returns_422(self, client):
        # Missing required fields
        payload = {
            "message": "Missing fields"
        }

        response = client.post("/log/client-log", json=payload)

        assert response.status_code == 422


    def test_internal_exception_returns_500(self, client):
        payload = {
            "level": "INFO",
            "message": "Trigger failure",
            "component": "TestComponent",
            "url": "/fail",
        }

        with patch("src.endpoints.log.logger.info", side_effect=Exception("Boom")):
            response = client.post("/log/client-log", json=payload)

            assert response.status_code == 500
