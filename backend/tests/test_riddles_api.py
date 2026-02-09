# backend/tests/test_riddles_api.py
import sys
import types
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

# ---------------------------
# Mock supabase BEFORE import
# ---------------------------
fake_supabase = types.ModuleType("supabase")

def _fake_create_client(url, key):
    # storage API shape used by your code:
    # supabase.storage.from_(BUCKET).upload(...)
    # supabase.storage.from_(BUCKET).get_public_url(path)
    # supabase.storage.from_(BUCKET).remove([path])
    bucket = MagicMock()
    bucket.upload.return_value = {}  # no error
    bucket.get_public_url.side_effect = lambda path: f"https://example.com/storage/v1/object/public/uploads/{path}"
    bucket.remove.return_value = {}  # no error

    storage = MagicMock()
    storage.from_.return_value = bucket

    client = MagicMock()
    client.storage = storage
    return client

fake_supabase.create_client = _fake_create_client
fake_supabase.Client = object
sys.modules["supabase"] = fake_supabase

# Now safe to import router
from endpoints.riddles_api import riddles_router  # noqa: E402
from DB_Methods import database  # noqa: E402


# ---------------------------
# Fixtures
# ---------------------------

@pytest.fixture
def mock_db():
    return MagicMock()

@pytest.fixture
def client(mock_db, monkeypatch):
    test_app = FastAPI()
    test_app.include_router(riddles_router)

    def override_get_db():
        yield mock_db

    test_app.dependency_overrides[database.get_db] = override_get_db

    # Make _commit_or_rollback a no-op so your router doesn't depend on DB internals
    import endpoints.riddles_api as riddles_api
    monkeypatch.setattr(riddles_api, "_commit_or_rollback", lambda db: None)

    return TestClient(test_app)


def _mock_query_first(mock_db, first_value):
    """Helper: mock db.query(...).filter(...).first() chain."""
    q = MagicMock()
    q.filter.return_value = q
    q.first.return_value = first_value
    mock_db.query.return_value = q
    return q

def _mock_query_all(mock_db, all_value):
    """Helper: mock db.query(...).all() chain."""
    q = MagicMock()
    q.all.return_value = all_value
    mock_db.query.return_value = q
    return q


# ---------------------------
# CREATE
# ---------------------------

def test_create_riddle_success_no_file(client, mock_db):
    # check_riddle_exists -> None
    _mock_query_first(mock_db, None)

    # Simulate db.refresh assigns an id
    def refresh_side_effect(instance):
        instance.riddle_id = 1
    mock_db.refresh.side_effect = refresh_side_effect

    resp = client.post(
        "/create",
        data={"question": "What has keys but can't open locks?", "answer": "A piano"},
    )

    assert resp.status_code == 201
    data = resp.json()
    assert data["riddle_id"] == 1
    assert data["riddle_question"] == "What has keys but can't open locks?"
    assert data["riddle_answer"] == "A piano"
    assert data["riddle_file"] is None
    mock_db.add.assert_called_once()


def test_create_riddle_success_with_file(client, mock_db):
    # check_riddle_exists -> None
    _mock_query_first(mock_db, None)

    def refresh_side_effect(instance):
        instance.riddle_id = 2
    mock_db.refresh.side_effect = refresh_side_effect

    files = {
        "file": ("pic.png", b"fake-image-bytes", "image/png"),
    }

    resp = client.post(
        "/create",
        data={"question": "Q with file", "answer": "A"},
        files=files,
    )

    assert resp.status_code == 201
    data = resp.json()
    assert data["riddle_id"] == 2
    assert data["riddle_file"] is not None
    assert "storage/v1/object/public/uploads/public/" in data["riddle_file"]


def test_create_riddle_duplicate(client, mock_db):
    # existing riddle found for same question
    existing = SimpleNamespace(riddle_id=99, riddle_question="Duplicate Question")
    _mock_query_first(mock_db, existing)

    resp = client.post(
        "/create",
        data={"question": "Duplicate Question", "answer": "Answer"},
    )

    assert resp.status_code == 400
    assert "already exists" in resp.json()["detail"]


def test_create_riddle_missing_required_fields_returns_400(client, mock_db):
    # even if DB is mocked, validation happens first
    resp = client.post(
        "/create",
        data={"question": "   ", "answer": "Answer"},
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Question and Answer are required."


def test_create_riddle_unsupported_file_type_400(client, mock_db):
    _mock_query_first(mock_db, None)

    resp = client.post(
        "/create",
        data={"question": "Q", "answer": "A"},
        files={"file": ("bad.txt", b"nope", "text/plain")},
    )

    assert resp.status_code == 400
    assert resp.json()["detail"] == "Unsupported file type. Use image/audio/video/pdf."


def test_create_riddle_file_too_large_400(client, mock_db, monkeypatch):
    _mock_query_first(mock_db, None)

    # Patch MAX_MB to something tiny so we don't allocate huge memory
    import endpoints.riddles_api as riddles_api
    monkeypatch.setattr(riddles_api, "MAX_MB", 0)  # max 0MB => any content fails

    resp = client.post(
        "/create",
        data={"question": "Q", "answer": "A"},
        files={"file": ("x.pdf", b"123", "application/pdf")},
    )

    assert resp.status_code == 400
    assert "File too large" in resp.json()["detail"]


# ---------------------------
# LIST
# ---------------------------

def test_list_riddles_success(client, mock_db):
    r1 = SimpleNamespace(riddle_id=1, riddle_question="Q1", riddle_answer="A1", riddle_file=None)
    r2 = SimpleNamespace(riddle_id=2, riddle_question="Q2", riddle_answer="A2", riddle_file="img.png")

    _mock_query_all(mock_db, [r1, r2])

    resp = client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    assert data[0]["riddle_id"] == 1
    assert data[1]["riddle_file"] == "img.png"


# ---------------------------
# GET ONE
# ---------------------------

def test_get_riddle_by_id_success(client, mock_db):
    target = SimpleNamespace(riddle_id=10, riddle_question="Found me", riddle_answer="Yes", riddle_file=None)
    _mock_query_first(mock_db, target)

    resp = client.get("/10")
    assert resp.status_code == 200
    assert resp.json()["riddle_question"] == "Found me"


def test_get_riddle_by_id_not_found(client, mock_db):
    _mock_query_first(mock_db, None)

    resp = client.get("/999")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Riddle not found"


# ---------------------------
# EDIT
# ---------------------------

def test_edit_riddle_not_found(client, mock_db):
    _mock_query_first(mock_db, None)

    resp = client.put("/123", data={"question": "New Q"})
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Riddle not found"


def test_edit_riddle_updates_question_answer(client, mock_db):
    r = SimpleNamespace(riddle_id=5, riddle_question="Old Q", riddle_answer="Old A", riddle_file=None)

    # edit_riddle does:
    # 1) db.query().filter().first() -> riddle
    # 2) if question changes, it calls check_riddle_exists(db, q) -> db.query().filter().first()
    q = MagicMock()
    q.filter.return_value = q
    q.first.side_effect = [r, None]  # first call gets riddle, second call says no duplicate
    mock_db.query.return_value = q

    mock_db.refresh.side_effect = lambda obj: None

    resp = client.put("/5", data={"question": "New Q", "answer": "New A"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["riddle_question"] == "New Q"
    assert data["riddle_answer"] == "New A"


def test_edit_riddle_remove_existing_file(client, mock_db, monkeypatch):
    r = SimpleNamespace(
        riddle_id=7,
        riddle_question="Q",
        riddle_answer="A",
        riddle_file="https://example.com/storage/v1/object/public/uploads/public/123_old.pdf",
    )

    _mock_query_first(mock_db, r)

    # Spy on delete helper
    import endpoints.riddles_api as riddles_api
    delete_spy = MagicMock()
    monkeypatch.setattr(riddles_api, "_delete_from_supabase_by_public_url", delete_spy)

    resp = client.put("/7", data={"remove_file": "true"})
    assert resp.status_code == 200
    assert resp.json()["riddle_file"] is None
    delete_spy.assert_called_once()


def test_edit_riddle_replace_file_deletes_old_and_uploads_new(client, mock_db, monkeypatch):
    r = SimpleNamespace(
        riddle_id=8,
        riddle_question="Q",
        riddle_answer="A",
        riddle_file="https://example.com/storage/v1/object/public/uploads/public/old.png",
    )

    _mock_query_first(mock_db, r)

    import endpoints.riddles_api as riddles_api
    delete_spy = MagicMock()
    monkeypatch.setattr(riddles_api, "_delete_from_supabase_by_public_url", delete_spy)

    files = {"file": ("new.png", b"abc", "image/png")}

    resp = client.put("/8", data={"remove_file": "false"}, files=files)
    assert resp.status_code == 200
    data = resp.json()
    assert data["riddle_file"] is not None
    delete_spy.assert_called_once()  # old removed before upload


# ---------------------------
# DELETE
# ---------------------------

def test_delete_riddle_success_no_file(client, mock_db):
    target = SimpleNamespace(riddle_id=5, riddle_question="Delete me", riddle_file=None)
    _mock_query_first(mock_db, target)

    resp = client.delete("/5")
    assert resp.status_code == 204
    mock_db.delete.assert_called_once_with(target)


def test_delete_riddle_success_with_file_deletes_file(client, mock_db, monkeypatch):
    target = SimpleNamespace(
        riddle_id=6,
        riddle_question="Delete file",
        riddle_file="https://example.com/storage/v1/object/public/uploads/public/todel.png",
    )
    _mock_query_first(mock_db, target)

    import endpoints.riddles_api as riddles_api
    delete_spy = MagicMock()
    monkeypatch.setattr(riddles_api, "_delete_from_supabase_by_public_url", delete_spy)

    resp = client.delete("/6")
    assert resp.status_code == 204
    delete_spy.assert_called_once_with(target.riddle_file)
    mock_db.delete.assert_called_once_with(target)


def test_delete_riddle_not_found(client, mock_db):
    _mock_query_first(mock_db, None)

    resp = client.delete("/999")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Riddle not found"
