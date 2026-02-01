import pytest
from fastapi.testclient import TestClient
from fastapi import FastAPI
from unittest.mock import patch

import main


@pytest.fixture
def client():
    return TestClient(main.app)


class TestMainApp:

    def test_root_route(self, client):
        response = client.get("/")
        assert response.status_code == 200
        assert response.json() == {"message": "Backend is running!"}


    def test_config_route(self, client):
        response = client.get("/config")
        assert response.status_code == 200

        data = response.json()
        assert "allowed_origins" in data
        assert "https://thinklyscs.com" in data["allowed_origins"]


    def test_request_logging_middleware_runs(self, client, capsys):
        response = client.get("/")
        assert response.status_code == 200

        captured = capsys.readouterr()
        assert ">> GET / Origin:" in captured.out


    def test_cors_headers_present_for_allowed_origin(self, client):
        headers = {
            "Origin": "https://thinklyscs.com",
            "Access-Control-Request-Method": "GET",
        }

        response = client.options("/", headers=headers)

        assert response.status_code in (200, 204)
        assert response.headers.get("access-control-allow-origin") == "https://thinklyscs.com"


    def test_unknown_route_returns_404(self, client):
        response = client.get("/this-route-does-not-exist")
        assert response.status_code == 404


    def test_routers_are_registered(self):
        """
        Verifies router prefixes are mounted without hitting internals.
        """
        routes = [route.path for route in main.app.routes]

        expected_prefixes = [
            "/log",
            "/auth",
            "/questions",
            "/competitions",
            "/manage-accounts",
            "/email",
            "/leaderboards",
            "/riddles",
            "/algotime",
            "/admin/dashboard",
        ]

        for prefix in expected_prefixes:
            assert any(path.startswith(prefix) for path in routes), f"{prefix} not registered"
