import asyncio
import pytest
from unittest.mock import Mock, patch, MagicMock, AsyncMock, call
from datetime import datetime, timezone
from fastapi import Request


from backend.src.services.posthog_analytics import (
    init_posthog,
    get_user_id_from_request,
    get_user_type_from_request,
    sanitize_request_body,
    track_api_call,
    categorize_endpoint,
    _resolve_feature_event,
    track_feature_event,
    identify_user,
    track_custom_event,
    shutdown_posthog,
)


# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def reset_posthog_client():
    """Ensure the global posthog_client is None before every test."""
    import backend.src.services.posthog_analytics as module

    original = module.posthog_client
    module.posthog_client = None
    yield
    module.posthog_client = original


@pytest.fixture
def mock_client():
    """A mock Posthog client already injected into the module."""
    import backend.src.services.posthog_analytics as module

    client = Mock()
    module.posthog_client = client
    return client


def make_request(
    path: str = "/auth/login",
    method: str = "POST",
    query_params: dict = None,
    headers: dict = None,
    user_state=None,
    path_params: dict = None,
):
    """Factory for a minimal FastAPI Request mock."""
    req = Mock(spec=Request)
    req.method = method
    req.url = Mock()
    req.url.path = path
    req.query_params = query_params or {}
    req.path_params = path_params or {}

    _headers = {"origin": "http://localhost", "user-agent": "pytest", "referer": None}
    if headers:
        _headers.update(headers)
    req.headers = Mock()
    req.headers.get = lambda k, default=None: _headers.get(k, default)

    req.state = Mock()
    if user_state is not None:
        req.state.user = user_state
    else:
        # hasattr(..., "user") returns False by default
        del req.state.user

    return req


# ---------------------------------------------------------------------------
# TestInitPosthog
# ---------------------------------------------------------------------------


class TestInitPosthog:

    def test_returns_none_when_api_key_missing(self):
        with patch("backend.src.services.posthog_analytics.POSTHOG_API_KEY", None):
            result = init_posthog()
        assert result is None

    def test_returns_client_when_api_key_present(self):
        with patch(
            "backend.src.services.posthog_analytics.POSTHOG_API_KEY", "phc_testkey"
        ), patch("backend.src.services.posthog_analytics.Posthog") as MockPosthog:
            mock_instance = Mock()
            MockPosthog.return_value = mock_instance
            result = init_posthog()
        assert result is mock_instance

    def test_sets_global_client_on_success(self):
        import backend.src.services.posthog_analytics as module

        with patch(
            "backend.src.services.posthog_analytics.POSTHOG_API_KEY", "phc_testkey"
        ), patch("backend.src.services.posthog_analytics.Posthog") as MockPosthog:
            MockPosthog.return_value = Mock()
            init_posthog()
        assert module.posthog_client is not None

    def test_returns_none_on_init_exception(self):
        with patch(
            "backend.src.services.posthog_analytics.POSTHOG_API_KEY", "phc_testkey"
        ), patch(
            "backend.src.services.posthog_analytics.Posthog",
            side_effect=Exception("connection refused"),
        ):
            result = init_posthog()
        assert result is None

    def test_global_client_remains_none_on_exception(self):
        import backend.src.services.posthog_analytics as module

        with patch("backend.src.services.posthog_analytics.POSTHOG_API_KEY", "phc_testkey"), patch(
            "backend.src.services.posthog_analytics.Posthog", side_effect=Exception("boom")
        ):
            init_posthog()
        assert module.posthog_client is None

    def test_passes_host_to_posthog_constructor(self):
        with patch("backend.src.services.posthog_analytics.POSTHOG_API_KEY", "phc_testkey"), patch(
            "backend.src.services.posthog_analytics.POSTHOG_HOST", "https://eu.posthog.com"
        ), patch("backend.src.services.posthog_analytics.Posthog") as MockPosthog:
            MockPosthog.return_value = Mock()
            init_posthog()
        _, kwargs = MockPosthog.call_args
        assert kwargs["host"] == "https://eu.posthog.com"


# ---------------------------------------------------------------------------
# TestGetUserIdFromRequest
# ---------------------------------------------------------------------------


class TestGetUserIdFromRequest:

    def test_returns_user_id_from_state_dict(self):
        req = make_request(user_state={"user_id": 42})
        assert get_user_id_from_request(req) == "42"

    def test_returns_user_id_from_state_object(self):
        user = Mock()
        user.user_id = 99
        req = make_request(user_state=user)
        # Make sure it does NOT look like a dict with "user_id" key
        req.state.user = user
        assert get_user_id_from_request(req) == "99"

    def test_returns_user_id_from_path_params(self):
        req = make_request(path_params={"user_id": "7"})
        assert get_user_id_from_request(req) == "7"

    def test_returns_anonymous_when_no_state_and_no_path_param(self):
        req = make_request()
        assert get_user_id_from_request(req) == "anonymous"

    def test_returns_anonymous_on_exception(self):
        req = Mock(spec=Request)
        req.state = Mock()
        req.state.user = Mock(side_effect=Exception("broken"))
        # Force hasattr to be True but accessing .user raises
        type(req.state).user = property(
            lambda self: (_ for _ in ()).throw(Exception("broken"))
        )
        result = get_user_id_from_request(req)
        assert result == "anonymous"

    def test_user_id_is_always_a_string(self):
        req = make_request(user_state={"user_id": 1001})
        result = get_user_id_from_request(req)
        assert isinstance(result, str)

    def test_state_dict_without_user_id_key_falls_through(self):
        """A state dict that lacks 'user_id' should not crash; falls to path_params."""
        req = make_request(
            user_state={"email": "x@example.com"}, path_params={"user_id": "5"}
        )
        assert get_user_id_from_request(req) == "5"


# ---------------------------------------------------------------------------
# TestGetUserTypeFromRequest
# ---------------------------------------------------------------------------


class TestGetUserTypeFromRequest:

    def test_returns_user_type_from_dict(self):
        req = make_request(user_state={"user_type": "admin"})
        assert get_user_type_from_request(req) == "admin"

    def test_falls_back_to_role_key(self):
        req = make_request(user_state={"role": "owner"})
        assert get_user_type_from_request(req) == "owner"

    def test_returns_user_type_from_object(self):
        user = Mock()
        user.user_type = "participant"
        req = make_request(user_state=user)
        assert get_user_type_from_request(req) == "participant"

    def test_returns_anonymous_when_no_user_state(self):
        req = make_request()
        assert get_user_type_from_request(req) == "anonymous"

    def test_returns_anonymous_on_exception(self):
        req = Mock(spec=Request)
        type(req.state).user = property(
            lambda self: (_ for _ in ()).throw(Exception("err"))
        )
        assert get_user_type_from_request(req) == "anonymous"


# ---------------------------------------------------------------------------
# TestSanitizeRequestBody
# ---------------------------------------------------------------------------


class TestSanitizeRequestBody:

    def test_dict_is_json_serialised(self):
        result = sanitize_request_body({"key": "value"})
        assert '"key"' in result
        assert '"value"' in result

    def test_list_is_json_serialised(self):
        result = sanitize_request_body([1, 2, 3])
        assert result == "[1, 2, 3]"

    def test_string_is_returned_as_is(self):
        assert sanitize_request_body("hello") == "hello"

    def test_long_body_is_truncated(self):
        body = "x" * 2000
        result = sanitize_request_body(body, max_length=100)
        assert len(result) <= 100 + len("... (truncated)")
        assert result.endswith("... (truncated)")

    def test_body_exactly_at_limit_is_not_truncated(self):
        body = "a" * 1000
        result = sanitize_request_body(body, max_length=1000)
        assert "truncated" not in result

    def test_unserializable_returns_fallback(self):
        class Unserializable:
            def __repr__(self):
                raise Exception("cannot repr")

        result = sanitize_request_body(Unserializable())
        # Falls back to str(); if that also fails the except path returns fallback string
        assert isinstance(result, str)

    def test_none_becomes_string(self):
        result = sanitize_request_body(None)
        assert result == "None"

    def test_custom_max_length_respected(self):
        result = sanitize_request_body("abcdefghij", max_length=5)
        assert result.startswith("abcde")
        assert "truncated" in result


# ---------------------------------------------------------------------------
# TestCategorizeEndpoint
# ---------------------------------------------------------------------------


class TestCategorizeEndpoint:

    @pytest.mark.parametrize(
        "path, expected",
        [
            ("/auth/login", "authentication"),
            ("/auth/signup", "authentication"),
            ("/competitions/create", "competitions"),
            ("/algotime/leaderboard", "algotime"),
            ("/leaderboards/all", "leaderboards"),
            ("/questions/1", "questions"),
            ("/riddles/create", "riddles"),
            ("/judge0/submit", "code_execution"),
            ("/manage-accounts/users", "user_management"),
            ("/users/profile", "user_management"),
            ("/email/send", "email"),
            ("/admin/dashboard", "admin"),
            ("/log/errors", "logging"),
            ("/healthcheck", "other"),
            ("/", "other"),
        ],
    )
    def test_known_paths(self, path, expected):
        assert categorize_endpoint(path) == expected

    def test_unknown_path_returns_other(self):
        assert categorize_endpoint("/some/random/endpoint") == "other"

    def test_auth_takes_priority_over_admin(self):
        """'/auth/admin-reset' contains '/auth' → 'authentication', not 'admin'."""
        assert categorize_endpoint("/auth/admin-reset") == "authentication"


# ---------------------------------------------------------------------------
# TestResolveFeatureEvent
# ---------------------------------------------------------------------------


class TestResolveFeatureEvent:

    @pytest.mark.parametrize(
        "path, method, expected_event",
        [
            ("/competitions/create", "POST", "competition_created"),
            ("/competitions/5", "PUT", "competition_updated"),
            ("/competitions/5", "DELETE", "competition_deleted"),
            ("/algotime/create", "POST", "algotime_created"),
            ("/leaderboards/all", "GET", "leaderboard_viewed"),
            ("/auth/login", "POST", "user_login"),
            ("/auth/logout", "POST", "user_logout"),
            ("/auth/signup", "POST", "user_signup"),
            ("/auth/forgot-password", "POST", "password_reset_requested"),
            ("/auth/reset-password", "POST", "password_reset_completed"),
            ("/auth/change-password", "POST", "password_changed"),
            ("/questions/all", "GET", "questions_viewed"),
            ("/riddles/new", "POST", "riddle_created"),
            ("/email/send", "POST", "email_sent"),
            ("/admin/dashboard", "GET", "admin_dashboard_accessed"),
            ("/admin/dashboard", "POST", "admin_dashboard_accessed"),  # method-agnostic
            ("/judge0/submit", "POST", "code_submitted"),
            ("/manage-accounts/users/batch-delete", "DELETE", "users_deleted"),
        ],
    )
    def test_known_routes_return_correct_event(self, path, method, expected_event):
        assert _resolve_feature_event(path, method) == expected_event

    def test_returns_none_for_unmatched_path(self):
        assert _resolve_feature_event("/healthcheck", "GET") is None

    def test_wrong_method_returns_none(self):
        """GET on a POST-only route must not match."""
        assert _resolve_feature_event("/auth/login", "GET") is None

    def test_competitions_create_takes_priority_over_competitions_put(self):
        """/competitions/create with PUT should match competition_updated, not created."""
        result = _resolve_feature_event("/competitions/create", "PUT")
        assert result == "competition_updated"

    def test_batch_delete_requires_both_path_fragments(self):
        assert _resolve_feature_event("/manage-accounts/users", "DELETE") is None
        assert _resolve_feature_event("/batch-delete", "DELETE") is None
        assert (
            _resolve_feature_event("/manage-accounts/users/batch-delete", "DELETE")
            == "users_deleted"
        )


# ---------------------------------------------------------------------------
# TestTrackFeatureEvent
# ---------------------------------------------------------------------------


class TestTrackFeatureEvent:

    def test_calls_capture_with_resolved_event(self, mock_client):
        props = {"status_code": 200}
        track_feature_event("user-1", "/auth/login", "POST", props)
        mock_client.capture.assert_called_once_with(
            distinct_id="user-1", event="user_login", properties=props
        )

    def test_no_capture_when_path_not_matched(self, mock_client):
        track_feature_event("user-1", "/healthcheck", "GET", {})
        mock_client.capture.assert_not_called()

    def test_does_nothing_when_no_client(self):
        """posthog_client is None (reset by autouse fixture) → no error, no capture."""
        track_feature_event("user-1", "/auth/login", "POST", {})  # should not raise

    def test_exception_is_swallowed(self, mock_client):
        mock_client.capture.side_effect = Exception("network error")
        # Must not propagate
        track_feature_event("user-1", "/auth/login", "POST", {})

    def test_batch_delete_emits_users_deleted(self, mock_client):
        track_feature_event(
            "admin-1", "/manage-accounts/users/batch-delete", "DELETE", {}
        )
        mock_client.capture.assert_called_once_with(
            distinct_id="admin-1", event="users_deleted", properties={}
        )

    def test_base_properties_forwarded_unchanged(self, mock_client):
        props = {"key": "value", "status_code": 201}
        track_feature_event("u", "/auth/signup", "POST", props)
        _, kwargs = mock_client.capture.call_args
        assert kwargs["properties"] is props


# ---------------------------------------------------------------------------
# TestTrackApiCall
# ---------------------------------------------------------------------------


class TestTrackApiCall:

    def _run(self, coro):
        return asyncio.get_event_loop().run_until_complete(coro)

    def test_does_nothing_when_no_client(self):
        req = make_request()
        self._run(track_api_call(req, 200, 12.5))  # should not raise

    def test_capture_called_with_api_call_event(self, mock_client):
        with patch(
            "src.services.posthog_analytics.asyncio.to_thread", new=AsyncMock()
        ) as mock_thread:
            req = make_request("/auth/login", "POST", user_state={"user_id": 1})
            self._run(track_api_call(req, 200, 10.0))
            # First to_thread call is the capture
            first_call_args = mock_thread.call_args_list[0]
            assert first_call_args[0][0] == mock_client.capture

    def test_timestamp_is_timezone_aware(self, mock_client):
        """Properties must use datetime.now(timezone.utc), not utcnow()."""
        captured_props = {}

        async def fake_to_thread(fn, *args, **kwargs):
            if fn == mock_client.capture:
                captured_props.update(kwargs.get("properties", {}))

        with patch(
            "src.services.posthog_analytics.asyncio.to_thread", side_effect=fake_to_thread
        ):
            req = make_request()
            self._run(track_api_call(req, 200, 5.0))

        ts = datetime.fromisoformat(captured_props["timestamp"])
        assert ts.tzinfo is not None

    def test_has_error_false_when_no_error(self, mock_client):
        captured_props = {}

        async def fake_to_thread(fn, *args, **kwargs):
            if fn == mock_client.capture:
                captured_props.update(kwargs.get("properties", {}))

        with patch(
            "src.services.posthog_analytics.asyncio.to_thread", side_effect=fake_to_thread
        ):
            self._run(track_api_call(make_request(), 200, 1.0))

        assert captured_props["has_error"] is False
        assert "error" not in captured_props

    def test_has_error_true_when_error_passed(self, mock_client):
        captured_props = {}

        async def fake_to_thread(fn, *args, **kwargs):
            if fn == mock_client.capture:
                captured_props.update(kwargs.get("properties", {}))

        with patch(
            "src.services.posthog_analytics.asyncio.to_thread", side_effect=fake_to_thread
        ):
            self._run(
                track_api_call(make_request(), 500, 1.0, error="Something went wrong")
            )

        assert captured_props["has_error"] is True
        assert captured_props["error"] == "Something went wrong"

    def test_query_params_included_when_present(self, mock_client):
        captured_props = {}

        async def fake_to_thread(fn, *args, **kwargs):
            if fn == mock_client.capture:
                captured_props.update(kwargs.get("properties", {}))

        with patch(
            "src.services.posthog_analytics.asyncio.to_thread", side_effect=fake_to_thread
        ):
            req = make_request(query_params={"page": "1", "limit": "10"})
            self._run(track_api_call(req, 200, 3.0))

        assert "query_params" in captured_props
        assert captured_props["query_params"] == {"page": "1", "limit": "10"}

    def test_query_params_omitted_when_empty(self, mock_client):
        captured_props = {}

        async def fake_to_thread(fn, *args, **kwargs):
            if fn == mock_client.capture:
                captured_props.update(kwargs.get("properties", {}))

        with patch(
            "src.services.posthog_analytics.asyncio.to_thread", side_effect=fake_to_thread
        ):
            self._run(track_api_call(make_request(query_params={}), 200, 1.0))

        assert "query_params" not in captured_props

    def test_response_time_is_rounded(self, mock_client):
        captured_props = {}

        async def fake_to_thread(fn, *args, **kwargs):
            if fn == mock_client.capture:
                captured_props.update(kwargs.get("properties", {}))

        with patch(
            "src.services.posthog_analytics.asyncio.to_thread", side_effect=fake_to_thread
        ):
            self._run(track_api_call(make_request(), 200, 12.3456789))

        assert captured_props["response_time_ms"] == 12.35

    def test_exception_during_capture_is_caught(self, mock_client):
        async def exploding_thread(fn, *args, **kwargs):
            raise Exception("network timeout")

        with patch(
            "src.services.posthog_analytics.asyncio.to_thread", side_effect=exploding_thread
        ):
            self._run(track_api_call(make_request(), 200, 1.0))  # must not propagate

    def test_feature_event_also_dispatched(self, mock_client):
        dispatched_fns = []

        async def fake_to_thread(fn, *args, **kwargs):
            dispatched_fns.append(fn)

        with patch(
            "src.services.posthog_analytics.asyncio.to_thread", side_effect=fake_to_thread
        ):
            self._run(track_api_call(make_request("/auth/signup", "POST"), 201, 5.0))

        assert track_feature_event in dispatched_fns


# ---------------------------------------------------------------------------
# TestIdentifyUser
# ---------------------------------------------------------------------------


class TestIdentifyUser:

    def test_calls_identify_with_correct_args(self, mock_client):
        props = {"email": "test@example.com", "$name": "Test User"}
        identify_user("42", props)
        mock_client.identify.assert_called_once_with(distinct_id="42", properties=props)

    def test_user_id_coerced_to_string(self, mock_client):
        identify_user(7, {"email": "x@x.com"})
        call_kwargs = mock_client.identify.call_args[1]
        assert call_kwargs["distinct_id"] == "7"

    def test_does_nothing_when_no_client(self):
        identify_user("u1", {"email": "a@b.com"})  # should not raise

    def test_exception_is_caught(self, mock_client):
        mock_client.identify.side_effect = Exception("posthog down")
        identify_user("u1", {})  # must not propagate


# ---------------------------------------------------------------------------
# TestTrackCustomEvent
# ---------------------------------------------------------------------------


class TestTrackCustomEvent:

    def test_calls_capture_with_event_name(self, mock_client):
        track_custom_event("user-1", "my_event", {"foo": "bar"})
        mock_client.capture.assert_called_once_with(
            distinct_id="user-1", event="my_event", properties={"foo": "bar"}
        )

    def test_properties_defaults_to_empty_dict(self, mock_client):
        track_custom_event("user-1", "bare_event")
        _, kwargs = mock_client.capture.call_args
        assert kwargs["properties"] == {}

    def test_user_id_coerced_to_string(self, mock_client):
        track_custom_event(99, "event", {})
        _, kwargs = mock_client.capture.call_args
        assert kwargs["distinct_id"] == "99"

    def test_does_nothing_when_no_client(self):
        track_custom_event("u", "event", {})  # should not raise

    def test_exception_is_caught(self, mock_client):
        mock_client.capture.side_effect = RuntimeError("failed")
        track_custom_event("u", "event", {})  # must not propagate

    def test_none_properties_replaced_with_empty_dict(self, mock_client):
        track_custom_event("u", "event", None)
        _, kwargs = mock_client.capture.call_args
        assert kwargs["properties"] == {}


# ---------------------------------------------------------------------------
# TestShutdownPosthog
# ---------------------------------------------------------------------------


class TestShutdownPosthog:

    def test_calls_shutdown_on_client(self, mock_client):
        shutdown_posthog()
        mock_client.shutdown.assert_called_once()

    def test_does_nothing_when_no_client(self):
        shutdown_posthog()  # client is None from autouse fixture; must not raise

    def test_exception_during_shutdown_is_caught(self, mock_client):
        mock_client.shutdown.side_effect = Exception("cannot reach server")
        shutdown_posthog()  # must not propagate

    def test_client_still_set_after_shutdown(self, mock_client):
        """shutdown_posthog does not clear the global reference."""
        import backend.src.services.posthog_analytics as module

        shutdown_posthog()
        assert module.posthog_client is mock_client
