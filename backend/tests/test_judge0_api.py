import pytest, sys
from unittest.mock import Mock, patch
from pathlib import Path
from fastapi.testclient import TestClient
from main import app

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.endpoints.judge0_api import (
    judge0_get_output,
    submit_to_judge0,
    judge0_run_code,
)

client = TestClient(app)

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
        json=lambda: {"token": "abc123"},
        raise_for_status=lambda: None,
    )

    mock_get.return_value = Mock(
        status_code=200,
        json=lambda: {
            "status": {"description": "Accepted"},
            "stdout": "Hello\n"
        },
        raise_for_status=lambda: None,
    )

    result = submit_to_judge0(
        source_code="print('Hello')",
        language_id="71",
        stdin="",
    )

    assert result["status"]["description"] == "Accepted"
    assert result["stdout"] == "Hello\n"

@patch('src.endpoints.judge0_api.JUDGE0_URL', 'http://localhost:2358')
@patch("src.endpoints.judge0_api.time.sleep", return_value=None)
@patch("src.endpoints.judge0_api.requests.get")
@patch("src.endpoints.judge0_api.requests.post")
def test_judge0_polling_timeout(mock_post, mock_get, mock_sleep):
    mock_post.return_value = Mock(
        status_code=201,
        json=lambda: {"token": "abc123"},
        raise_for_status=lambda: None,
    )

    # Always return "Processing"
    mock_get.return_value = Mock(
        status_code=200,
        json=lambda: {
            "status": {"description": "Processing"}
        },
        raise_for_status=lambda: None,
    )

    with pytest.raises(RuntimeError, match="timed out"):
        submit_to_judge0(
            source_code="print('Hello')",
            language_id="71",
            stdin="",
        )

@patch('src.endpoints.judge0_api.JUDGE0_URL', 'http://localhost:2358')
@patch("src.endpoints.judge0_api.requests.post")
def test_judge0_network_error(mock_post):
    mock_post.side_effect = Exception("Connection failed")

    with pytest.raises(RuntimeError, match="Network error"):
        submit_to_judge0(
            source_code="print('Hello')",
            language_id="71",
            stdin="",
        )

@patch("src.endpoints.judge0_api.submit_to_judge0")
def test_judge0_route_success(mock_submit):
    mock_submit.return_value = {
        "status": {"description": "Accepted"},
        "stdout": "OK"
    }

    response = judge0_run_code({
        "source_code": "print('Hello')",
        "language_id": "71",
        "stdin": "",
        "expected_output": None
    })

    assert response['status_code'] == 200
    assert response["ok"] is True
