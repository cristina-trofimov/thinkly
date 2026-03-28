import pytest
import sys
from unittest.mock import AsyncMock, Mock, patch
from pathlib import Path
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.endpoints.judge0_api import (
    judge0_get_output,
    submit_to_judge0,
)

# Import app after sys.path is set — raise_server_exceptions=False lets the
# TestClient handle 429s from SlowAPIMiddleware gracefully instead of crashing.
from main import app

client = TestClient(app, raise_server_exceptions=False)

# Reusable submission payload
SINGLE_SUBMISSION = [
    {
        "source_code": "print('Hello')",
        "language_id": "71",
        "stdin": "",
        "expected_output": None,
    }
]


@patch('src.endpoints.judge0_api.JUDGE0_URL', 'http://localhost:2358')
@patch('src.endpoints.judge0_api.requests.get')
def test_judge0_get_output_success(mock_get):
    mock_get.return_value = Mock(
        status_code=200,
        json=lambda: {
            "status": {"description": "Accepted"},
            "stdout": "Hello\n",
            "token": "abc123",
        },
        raise_for_status=lambda: None,
    )

    result = judge0_get_output("abc123")

    assert result["status"]["description"] == "Accepted"


@patch('src.endpoints.judge0_api.JUDGE0_URL', 'http://localhost:2358')
@patch('src.endpoints.judge0_api.requests.get')
@patch('src.endpoints.judge0_api.requests.post')
def test_judge0_submit_success(mock_post, mock_get):
    mock_post.return_value = Mock(
        status_code=201,
        json=lambda: [{"token": "abc123"}],
        raise_for_status=lambda: None,
    )

    mock_get.return_value = Mock(
        status_code=200,
        json=lambda: {
            "submissions": [
                {
                    "status": {"description": "Accepted"},
                    "stdout": "Hello\n",
                    "token": "abc123",
                }
            ]
        },
        raise_for_status=lambda: None,
    )

    result = submit_to_judge0(submissions=SINGLE_SUBMISSION)

    assert result["status"]["description"] == "Accepted"
    assert result["stdout"] == "Hello\n"


@patch('src.endpoints.judge0_api.JUDGE0_URL', 'http://localhost:2358')
@patch("src.endpoints.judge0_api.time.sleep", return_value=None)
@patch("src.endpoints.judge0_api.requests.get")
@patch("src.endpoints.judge0_api.requests.post")
def test_judge0_polling_timeout(mock_post, mock_get, mock_sleep):
    mock_post.return_value = Mock(
        status_code=201,
        json=lambda: [{"token": "abc123"}],
        raise_for_status=lambda: None,
    )

    # Always return "Processing"
    mock_get.return_value = Mock(
        status_code=200,
        json=lambda: {
            "submissions": [
                {"status": {"description": "Processing"}, "token": "abc123"}
            ]
        },
        raise_for_status=lambda: None,
    )

    with pytest.raises(RuntimeError, match="timed out"):
        submit_to_judge0(submissions=SINGLE_SUBMISSION)


@patch('src.endpoints.judge0_api.JUDGE0_URL', 'http://localhost:2358')
@patch("src.endpoints.judge0_api.requests.post")
def test_judge0_network_error(mock_post):
    mock_post.side_effect = Exception("Connection failed")

    with pytest.raises(RuntimeError, match="Network error"):
        submit_to_judge0(submissions=SINGLE_SUBMISSION)


@patch('src.endpoints.judge0_api.track_custom_event')
@patch('src.endpoints.judge0_api.JUDGE0_URL', 'http://localhost:2358')
@patch('src.endpoints.judge0_api.requests.get')
@patch('src.endpoints.judge0_api.requests.post')
@patch('main.logger')
@patch('endpoints.authentification_api.get_current_user', return_value={"id": "test-user"})
@patch('endpoints.authentification_api.oauth2_scheme', new_callable=AsyncMock, return_value="fake-token")
def test_judge0_route_success(mock_oauth, mock_auth, mock_logger, mock_post, mock_get, mock_track):
    mock_post.return_value = Mock(
        status_code=201,
        json=lambda: [{"token": "abc123"}],
        raise_for_status=lambda: None,
    )
    mock_get.return_value = Mock(
        status_code=200,
        json=lambda: {
            "submissions": [
                {"status": {"description": "Accepted"}, "stdout": "OK", "token": "abc123"}
            ]
        },
        raise_for_status=lambda: None,
    )

    response = client.post("/judge0", json={
        "submissions": SINGLE_SUBMISSION,
        "user_id": "test-user",
    })

    assert response.status_code == 200
    assert response.json()["ok"] is True


@patch('src.endpoints.judge0_api.track_custom_event')
@patch('src.endpoints.judge0_api.JUDGE0_URL', 'http://localhost:2358')
@patch('src.endpoints.judge0_api.requests.get')
@patch('src.endpoints.judge0_api.requests.post')
@patch('main.logger')
@patch('endpoints.authentification_api.get_current_user', return_value={"id": "test-user"})
@patch('endpoints.authentification_api.oauth2_scheme', new_callable=AsyncMock, return_value="fake-token")
def test_judge0_rate_limit(mock_oauth, mock_auth, mock_logger, mock_post, mock_get, mock_track):
    """Hitting the endpoint 6 times should trigger a 429 on the last request (limit is 5/minute)."""
    from slowapi import Limiter
    from slowapi.util import get_remote_address

    # Reset the limiter state to avoid bleed from other tests
    app.state.limiter = Limiter(key_func=get_remote_address)

    mock_post.return_value = Mock(
        status_code=201,
        json=lambda: [{"token": "abc123"}],
        raise_for_status=lambda: None,
    )
    mock_get.return_value = Mock(
        status_code=200,
        json=lambda: {
            "submissions": [
                {"status": {"description": "Accepted"}, "stdout": "OK", "token": "abc123"}
            ]
        },
        raise_for_status=lambda: None,
    )

    payload = {
        "submissions": SINGLE_SUBMISSION,
        "user_id": "test-user",
    }

    for _ in range(5):
        client.post("/judge0", json=payload)

    response = client.post("/judge0", json=payload)
    assert response.status_code == 429
