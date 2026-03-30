import pytest
import sys
from unittest.mock import AsyncMock, Mock, patch
from pathlib import Path
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.endpoints.judge0_api import (
    judge0_get_output,
    judge0_get_outputs,
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
            "stdout": "All testcases passed.\n",
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
                    "stdout": "All testcases passed.",
                    "token": "abc123",
                }
            ]
        },
        raise_for_status=lambda: None,
    )

    result = submit_to_judge0(submissions=SINGLE_SUBMISSION)

    assert result["status"]["description"] == "Accepted"
    assert result["stdout"] == "All testcases passed."


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


# ---------------------------------------------------------------------------
# judge0_get_outputs — average submission aggregation
# ---------------------------------------------------------------------------

def _make_batch_response(submissions: list) -> Mock:
    """Wrap a list of submission dicts in a Mock that looks like a Judge0
    batch GET response."""
    return Mock(
        status_code=200,
        json=lambda s=submissions: {"submissions": s},
        raise_for_status=lambda: None,
    )


def _accepted(time_s: str, memory_kb: str, token: str = "tok") -> dict:
    return {
        "status": {"id": 3, "description": "Accepted"},
        "stdout": "ok",
        "time": time_s,
        "memory": memory_kb,
        "stderr": None,
        "compile_output": None,
        "message": None,
        "token": token,
    }


def _failed(description: str = "Wrong Answer", token: str = "tok") -> dict:
    return {
        "status": {"id": 4, "description": description},
        "stdout": "wrong",
        "time": "0.10",
        "memory": "1024",
        "stderr": None,
        "compile_output": None,
        "message": None,
        "token": token,
    }


@patch('src.endpoints.judge0_api.JUDGE0_URL', 'http://localhost:2358')
@patch('src.endpoints.judge0_api.requests.get')
def test_get_outputs_all_accepted_averages_time_and_memory(mock_get):
    """When every submission is Accepted the result must carry the arithmetic
    mean of time and memory across all submissions."""
    submissions = [
        _accepted("0.10", "1000", "t1"),
        _accepted("0.20", "2000", "t2"),
        _accepted("0.30", "3000", "t3"),
    ]
    mock_get.return_value = _make_batch_response(submissions)

    result = judge0_get_outputs(["t1", "t2", "t3"])

    assert result["status"]["description"] == "Accepted"
    assert result["stdout"] == "All testcases passed."
    assert float(result["time"]) == pytest.approx(0.20, abs=1e-9)
    assert float(result["memory"]) == pytest.approx(2000.0, abs=1e-9)


@patch('src.endpoints.judge0_api.JUDGE0_URL', 'http://localhost:2358')
@patch('src.endpoints.judge0_api.requests.get')
def test_get_outputs_all_accepted_clears_token_and_stderr(mock_get):
    """The synthetic average submission must NOT expose any individual token or
    error fields — they must all be None."""
    mock_get.return_value = _make_batch_response([
        _accepted("0.05", "512", "t1"),
        _accepted("0.15", "768", "t2"),
    ])

    result = judge0_get_outputs(["t1", "t2"])

    assert result["token"] is None
    assert result["stderr"] is None
    assert result["compile_output"] is None
    assert result["message"] is None


@patch('src.endpoints.judge0_api.JUDGE0_URL', 'http://localhost:2358')
@patch('src.endpoints.judge0_api.requests.get')
def test_get_outputs_all_accepted_preserves_status_id_from_first(mock_get):
    """The status id in the average result is taken from the first submission."""
    submissions = [
        _accepted("0.10", "1000", "t1"),
        _accepted("0.20", "2000", "t2"),
    ]
    mock_get.return_value = _make_batch_response(submissions)

    result = judge0_get_outputs(["t1", "t2"])

    assert result["status"]["id"] == submissions[0]["status"]["id"]


@patch('src.endpoints.judge0_api.JUDGE0_URL', 'http://localhost:2358')
@patch('src.endpoints.judge0_api.requests.get')
def test_get_outputs_single_accepted_submission(mock_get):
    """A single accepted submission should be the average of itself."""
    mock_get.return_value = _make_batch_response([_accepted("0.42", "8192", "t1")])

    result = judge0_get_outputs(["t1"])

    assert result["status"]["description"] == "Accepted"
    assert float(result["time"]) == pytest.approx(0.42, abs=1e-9)
    assert float(result["memory"]) == pytest.approx(8192.0, abs=1e-9)


@patch('src.endpoints.judge0_api.JUDGE0_URL', 'http://localhost:2358')
@patch('src.endpoints.judge0_api.requests.get')
def test_get_outputs_first_failure_returned_immediately(mock_get):
    """When at least one submission fails the *first* failing one is returned,
    not the average."""
    submissions = [
        _accepted("0.10", "1000", "t1"),
        _failed("Wrong Answer", "t2"),
        _failed("Time Limit Exceeded", "t3"),
    ]
    mock_get.return_value = _make_batch_response(submissions)

    result = judge0_get_outputs(["t1", "t2", "t3"])

    assert result["status"]["description"] == "Wrong Answer"
    assert result["token"] == "t2"


@patch('src.endpoints.judge0_api.JUDGE0_URL', 'http://localhost:2358')
@patch('src.endpoints.judge0_api.requests.get')
def test_get_outputs_failure_before_any_accepted(mock_get):
    """If the very first submission fails the function returns it directly."""
    submissions = [
        _failed("Runtime Error", "t1"),
        _accepted("0.10", "1000", "t2"),
    ]
    mock_get.return_value = _make_batch_response(submissions)

    result = judge0_get_outputs(["t1", "t2"])

    assert result["status"]["description"] == "Runtime Error"
    assert result["token"] == "t1"


@patch('src.endpoints.judge0_api.JUDGE0_URL', 'http://localhost:2358')
@patch('src.endpoints.judge0_api.requests.get')
def test_get_outputs_handles_none_time_and_memory(mock_get):
    """Submissions with None time/memory must be treated as 0 in the average."""
    submissions = [
        {**_accepted("0.00", "0", "t1"), "time": None, "memory": None},
        _accepted("0.20", "1000", "t2"),
    ]
    mock_get.return_value = _make_batch_response(submissions)

    result = judge0_get_outputs(["t1", "t2"])

    assert result["status"]["description"] == "Accepted"
    assert float(result["time"]) == pytest.approx(0.10, abs=1e-9)
    assert float(result["memory"]) == pytest.approx(500.0, abs=1e-9)


@patch('src.endpoints.judge0_api.JUDGE0_URL', 'http://localhost:2358')
@patch("src.endpoints.judge0_api.time.sleep", return_value=None)
@patch('src.endpoints.judge0_api.requests.get')
def test_get_outputs_polls_until_all_done(mock_get, mock_sleep):
    """If some submissions are still in-progress the function must keep polling
    until they settle, then return the average."""
    in_progress = Mock(
        status_code=200,
        json=lambda: {"submissions": [
            {"status": {"description": "In Queue"}, "token": "t1"},
            {"status": {"description": "Processing"}, "token": "t2"},
        ]},
        raise_for_status=lambda: None,
    )
    done = _make_batch_response([
        _accepted("0.10", "512", "t1"),
        _accepted("0.30", "1024", "t2"),
    ])
    mock_get.side_effect = [in_progress, done]

    result = judge0_get_outputs(["t1", "t2"])

    assert mock_get.call_count == 2
    assert result["status"]["description"] == "Accepted"
    assert float(result["time"]) == pytest.approx(0.20, abs=1e-9)


@patch('src.endpoints.judge0_api.JUDGE0_URL', 'http://localhost:2358')
@patch("src.endpoints.judge0_api.time.sleep", return_value=None)
@patch('src.endpoints.judge0_api.requests.get')
def test_get_outputs_batch_polling_timeout(mock_get, mock_sleep):
    """Exceeding max_attempts while submissions stay in-progress raises RuntimeError."""
    mock_get.return_value = Mock(
        status_code=200,
        json=lambda: {"submissions": [
            {"status": {"description": "Processing"}, "token": "t1"},
        ]},
        raise_for_status=lambda: None,
    )

    with pytest.raises(RuntimeError, match="timed out"):
        judge0_get_outputs(["t1"], max_attempts=3)


@patch('src.endpoints.judge0_api.JUDGE0_URL', 'http://localhost:2358')
@patch('src.endpoints.judge0_api.requests.get')
def test_get_outputs_average_formatted_as_two_decimal_strings(mock_get):
    """time and memory in the average result must be strings with exactly two
    decimal places, matching the f'{value:.2f}' format used in production."""
    mock_get.return_value = _make_batch_response([
        _accepted("0.1", "333", "t1"),
        _accepted("0.2", "667", "t2"),
    ])

    result = judge0_get_outputs(["t1", "t2"])

    assert isinstance(result["time"], str)
    assert isinstance(result["memory"], str)
    assert len(result["time"].split(".")[1]) == 2
    assert len(result["memory"].split(".")[1]) == 2