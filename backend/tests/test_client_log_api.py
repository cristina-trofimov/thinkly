import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from unittest.mock import patch

from backend.src.endpoints import log_api


@pytest.fixture
def app():
    app = FastAPI()
    app.include_router(log_api.log_router, prefix="/log")
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

        with patch("backend.src.endpoints.log_api.logger") as mock_logger:
            response = client.post("/log/client-log", json=payload)

            assert response.status_code == 204
            mock_logger.info.assert_called_once()

            fmt, url, component, message, stack = mock_logger.info.call_args[0]

            assert fmt == "ClientLog url=%s component=%s message=%s stack=%s"
            assert url == "/test/url"
            assert component == "TestComponent"
            assert message == "Test log message"
            assert stack == ""


    def test_log_error_level_with_stack(self, client):
        payload = {
            "level": "ERROR",
            "message": "Something broke",
            "component": "CrashComponent",
            "url": "/crash",
            "stack": "Traceback line 1\nTraceback line 2",
        }

        with patch("backend.src.endpoints.log_api.logger") as mock_logger:
            response = client.post("/log/client-log", json=payload)

            assert response.status_code == 204
            mock_logger.error.assert_called_once()

            fmt, url, component, message, stack = mock_logger.error.call_args[0]

            assert fmt == "ClientLog url=%s component=%s message=%s stack=%s"
            assert url == "/crash"
            assert component == "CrashComponent"
            assert message == "Something broke"
            # only first line, sanitized (\n becomes \\n, but we only take line 1 anyway)
            assert stack == "Traceback line 1"


    def test_unknown_log_level_falls_back_to_info(self, client):
        payload = {
            "level": "NOT_A_LEVEL",
            "message": "Weird level",
            "component": "TestComponent",
            "url": "/weird",
        }

        with patch("backend.src.endpoints.log_api.logger") as mock_logger:
            response = client.post("/log/client-log", json=payload)

            assert response.status_code == 204
            mock_logger.info.assert_called_once()


    def test_invalid_payload_returns_422(self, client):
        payload = {"message": "Missing fields"}
        response = client.post("/log/client-log", json=payload)
        assert response.status_code == 422


    def test_internal_exception_returns_500(self, client):
        payload = {
            "level": "INFO",
            "message": "Trigger failure",
            "component": "TestComponent",
            "url": "/fail",
        }

        # endpoint calls logger.info(...) via getattr(logger, level.lower())
        with patch("backend.src.endpoints.log_api.logger.info", side_effect=Exception("Boom")):
            response = client.post("/log/client-log", json=payload)

            assert response.status_code == 500