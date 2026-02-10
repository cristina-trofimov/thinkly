import os
import importlib
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from fastapi import HTTPException


# ----------------------------
# Fake SQLAlchemy-like pieces
# ----------------------------
class Field:
    """Lets code do: Riddle.riddle_id == 3"""
    def __init__(self, name: str):
        self.name = name

    def __eq__(self, value):
        return ("eq", self.name, value)


class FakeRiddle:
    """
    Behaves like your SQLAlchemy Riddle model for our endpoints:
    - class attributes for filtering
    - __init__ for creation
    """
    riddle_id = Field("riddle_id")
    riddle_question = Field("riddle_question")

    def __init__(self, riddle_question: str, riddle_answer: str, riddle_file=None):
        self.riddle_id = None  # assigned by FakeSession.add
        self.riddle_question = riddle_question
        self.riddle_answer = riddle_answer
        self.riddle_file = riddle_file


class FakeQuery:
    def __init__(self, db):
        self.db = db
        self.predicates = []

    def filter(self, expr):
        self.predicates.append(expr)
        return self

    def _match(self, obj):
        for op, name, value in self.predicates:
            if op == "eq":
                if getattr(obj, name) != value:
                    return False
        return True

    def first(self):
        for obj in self.db._rows:
            if self._match(obj):
                return obj
        return None

    def all(self):
        if not self.predicates:
            return list(self.db._rows)
        return [obj for obj in self.db._rows if self._match(obj)]


class FakeSession:
    def __init__(self):
        self._rows = []
        self._next_id = 1

    def query(self, _model):
        return FakeQuery(self)

    def add(self, obj):
        if getattr(obj, "riddle_id", None) is None:
            obj.riddle_id = self._next_id
            self._next_id += 1
        self._rows.append(obj)

    def delete(self, obj):
        self._rows = [r for r in self._rows if r is not obj]

    def refresh(self, _obj):
        return None

    def rollback(self):
        return None

    def commit(self):
        return None


# ----------------------------
# Helpers to build a fake UploadFile-like object for internal function tests
# ----------------------------
class FakeUploadFile:
    def __init__(self, filename: str, content_type: str, content: bytes):
        self.filename = filename
        self.content_type = content_type
        self._content = content

    async def read(self):
        return self._content


# ----------------------------
# Test client fixture
# ----------------------------
@pytest.fixture()
def app_and_module(monkeypatch):
    # Ensure env exist BEFORE router import (supabase client created at import time)
    os.environ.setdefault("SUPABASE_URL", "http://localhost:54321")
    os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon-key")

    riddles_module = importlib.import_module("src.endpoints.riddles_api")

    # Patch model + commit helper
    monkeypatch.setattr(riddles_module, "Riddle", FakeRiddle)
    monkeypatch.setattr(riddles_module, "_commit_or_rollback", lambda db: None)

    # Override get_db to return fake db session
    fake_db = FakeSession()
    from DB_Methods.database import get_db

    def override_get_db():
        yield fake_db

    app = FastAPI()
    app.dependency_overrides[get_db] = override_get_db
    app.include_router(riddles_module.riddles_router, prefix="/riddles")

    return app, riddles_module, fake_db


@pytest.fixture()
def client(app_and_module):
    app, _, _ = app_and_module
    return TestClient(app)


# ----------------------------
# Core endpoint tests (existing + stronger)
# ----------------------------
def test_create_riddle_no_file(client):
    resp = client.post(
        "/riddles/create",
        data={"question": "What has keys but can't open locks?", "answer": "A piano"},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["riddle_id"] == 1
    assert body["riddle_question"] == "What has keys but can't open locks?"
    assert body["riddle_answer"] == "A piano"
    assert body["riddle_file"] is None


def test_create_duplicate_question(client):
    client.post("/riddles/create", data={"question": "Q1", "answer": "A1"})
    resp = client.post("/riddles/create", data={"question": "Q1", "answer": "A2"})
    assert resp.status_code == 400, resp.text
    assert "already exists" in resp.json()["detail"].lower()


def test_list_riddles(client):
    client.post("/riddles/create", data={"question": "Q1", "answer": "A1"})
    client.post("/riddles/create", data={"question": "Q2", "answer": "A2"})
    resp = client.get("/riddles/")
    assert resp.status_code == 200, resp.text
    items = resp.json()
    assert len(items) == 2
    assert {r["riddle_question"] for r in items} == {"Q1", "Q2"}


def test_get_riddle_by_id(client):
    create = client.post("/riddles/create", data={"question": "QX", "answer": "AX"})
    rid = create.json()["riddle_id"]
    resp = client.get(f"/riddles/{rid}")
    assert resp.status_code == 200, resp.text
    assert resp.json()["riddle_id"] == rid
    assert resp.json()["riddle_question"] == "QX"


def test_edit_riddle_update_question_answer(client):
    create = client.post("/riddles/create", data={"question": "OldQ", "answer": "OldA"})
    rid = create.json()["riddle_id"]

    resp = client.put(
        f"/riddles/{rid}",
        data={"question": "NewQ", "answer": "NewA", "remove_file": "false"},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["riddle_question"] == "NewQ"
    assert resp.json()["riddle_answer"] == "NewA"


def test_delete_riddle(client):
    create = client.post("/riddles/create", data={"question": "DelQ", "answer": "DelA"})
    rid = create.json()["riddle_id"]

    resp = client.delete(f"/riddles/{rid}")
    assert resp.status_code == 204, resp.text

    get_resp = client.get(f"/riddles/{rid}")
    assert get_resp.status_code == 404


# ----------------------------
# Validation / Not found coverage
# ----------------------------
def test_create_requires_question_and_answer(client):
    r1 = client.post("/riddles/create", data={"question": "   ", "answer": "A"})
    assert r1.status_code == 400
    assert "required" in r1.json()["detail"].lower()

    r2 = client.post("/riddles/create", data={"question": "Q", "answer": "   "})
    assert r2.status_code == 400
    assert "required" in r2.json()["detail"].lower()


def test_get_riddle_not_found(client):
    resp = client.get("/riddles/9999")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Riddle not found"


def test_edit_riddle_not_found(client):
    resp = client.put("/riddles/9999", data={"question": "X"})
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Riddle not found"


def test_delete_riddle_not_found(client):
    resp = client.delete("/riddles/9999")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Riddle not found"


def test_edit_rejects_empty_question_or_answer(client):
    create = client.post("/riddles/create", data={"question": "Q1", "answer": "A1"})
    rid = create.json()["riddle_id"]

    r1 = client.put(f"/riddles/{rid}", data={"question": "   "})
    assert r1.status_code == 400
    assert "cannot be empty" in r1.json()["detail"].lower()

    r2 = client.put(f"/riddles/{rid}", data={"answer": "   "})
    assert r2.status_code == 400
    assert "cannot be empty" in r2.json()["detail"].lower()


def test_edit_duplicate_question_rejected(client):
    client.post("/riddles/create", data={"question": "Q1", "answer": "A1"})
    b = client.post("/riddles/create", data={"question": "Q2", "answer": "A2"})
    rid_b = b.json()["riddle_id"]

    resp = client.put(f"/riddles/{rid_b}", data={"question": "Q1"})
    assert resp.status_code == 400
    assert "already exists" in resp.json()["detail"].lower()


# ----------------------------
# Supabase upload / delete path coverage
# ----------------------------
def test_extract_storage_path_from_public_url_good(app_and_module):
    _, mod, _ = app_and_module
    url = "https://x.supabase.co/storage/v1/object/public/uploads/public/a.png"
    assert mod._extract_storage_path_from_public_url(url) == "public/a.png"


def test_extract_storage_path_from_public_url_bad(app_and_module):
    _, mod, _ = app_and_module
    assert mod._extract_storage_path_from_public_url("") is None
    assert mod._extract_storage_path_from_public_url("https://x.com/not-matching") is None
    # wrong bucket
    url = "https://x.supabase.co/storage/v1/object/public/otherbucket/public/a.png"
    assert mod._extract_storage_path_from_public_url(url) is None


def test_validate_upload_rejects_unsupported_type(app_and_module):
    _, mod, _ = app_and_module
    bad = FakeUploadFile("x.txt", "text/plain", b"hi")
    with pytest.raises(HTTPException) as e:
        mod._validate_upload(bad)
    assert e.value.status_code == 400


@pytest.mark.anyio
async def test_upload_to_supabase_oversize_raises_413(app_and_module, monkeypatch):
    _, mod, _ = app_and_module
    # shrink MAX_MB for the test so we don't allocate huge bytes
    monkeypatch.setattr(mod, "MAX_MB", 1)  # 1MB
    big = FakeUploadFile("big.bin", "application/pdf", b"x" * (1 * 1024 * 1024 + 1))

    with pytest.raises(HTTPException) as e:
        await mod._upload_to_supabase(big)
    assert e.value.status_code == 413


@pytest.mark.anyio
async def test_upload_to_supabase_error_dict_raises_500(app_and_module, monkeypatch):
    _, mod, _ = app_and_module

    class FakeStorageBucket:
        def upload(self, **kwargs):
            return {"error": "boom"}

        def get_public_url(self, path):
            return "https://example.com/should-not-happen"

    class FakeStorage:
        def from_(self, bucket):
            return FakeStorageBucket()

    class FakeSupabase:
        storage = FakeStorage()

    monkeypatch.setattr(mod, "supabase", FakeSupabase())

    f = FakeUploadFile("x.png", "image/png", b"123")
    with pytest.raises(HTTPException) as e:
        await mod._upload_to_supabase(f)
    assert e.value.status_code == 500
    assert "upload failed" in str(e.value.detail).lower()


def test_delete_from_supabase_by_public_url_noop_on_bad_url(app_and_module, monkeypatch):
    _, mod, _ = app_and_module

    # If url can't be parsed, it should just return, not crash
    mod._delete_from_supabase_by_public_url("https://example.com/not-supabase-shape")


def test_delete_endpoint_calls_delete_helper_when_file_exists(app_and_module, monkeypatch):
    app, mod, fake_db = app_and_module
    c = TestClient(app)

    called = {"n": 0}

    def fake_delete(_url: str):
        called["n"] += 1

    monkeypatch.setattr(mod, "_delete_from_supabase_by_public_url", fake_delete)

    # Create riddle directly in fake DB with a file
    r = FakeRiddle("Q", "A", riddle_file="https://x.supabase.co/storage/v1/object/public/uploads/public/a.png")
    fake_db.add(r)

    resp = c.delete(f"/riddles/{r.riddle_id}")
    assert resp.status_code == 204
    assert called["n"] == 1


# ----------------------------
# Endpoint file flows (mock upload/delete helpers)
# ----------------------------
def test_create_with_file_sets_url(app_and_module, monkeypatch):
    app, mod, _ = app_and_module
    c = TestClient(app)

    async def fake_upload(_file):
        return "https://example.com/storage/v1/object/public/uploads/public/test.png"

    monkeypatch.setattr(mod, "_upload_to_supabase", fake_upload)

    resp = c.post(
        "/riddles/create",
        data={"question": "QF", "answer": "AF"},
        files={"file": ("x.png", b"123", "image/png")},
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["riddle_file"] is not None


def test_edit_replace_file_deletes_old_and_uploads_new(app_and_module, monkeypatch):
    app, mod, fake_db = app_and_module
    c = TestClient(app)

    # set up existing riddle with old file
    r = FakeRiddle("Q", "A", riddle_file="https://x.supabase.co/storage/v1/object/public/uploads/public/old.png")
    fake_db.add(r)

    called = {"delete": 0, "upload": 0}

    def fake_delete(_url: str):
        called["delete"] += 1

    async def fake_upload(_file):
        called["upload"] += 1
        return "https://example.com/storage/v1/object/public/uploads/public/new.png"

    monkeypatch.setattr(mod, "_delete_from_supabase_by_public_url", fake_delete)
    monkeypatch.setattr(mod, "_upload_to_supabase", fake_upload)

    resp = c.put(
        f"/riddles/{r.riddle_id}",
        files={"file": ("new.png", b"123", "image/png")},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["riddle_file"].endswith("new.png")
    assert called["delete"] == 1
    assert called["upload"] == 1


def test_remove_file_true_deletes_and_sets_none(app_and_module, monkeypatch):
    app, mod, fake_db = app_and_module
    c = TestClient(app)

    r = FakeRiddle("Q", "A", riddle_file="https://x.supabase.co/storage/v1/object/public/uploads/public/a.png")
    fake_db.add(r)

    called = {"delete": 0}

    def fake_delete(_url: str):
        called["delete"] += 1

    monkeypatch.setattr(mod, "_delete_from_supabase_by_public_url", fake_delete)

    resp = c.put(f"/riddles/{r.riddle_id}", data={"remove_file": "true"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["riddle_file"] is None
    assert called["delete"] == 1


def test_remove_file_true_when_no_file_is_noop(app_and_module, monkeypatch):
    app, mod, fake_db = app_and_module
    c = TestClient(app)

    r = FakeRiddle("Q", "A", riddle_file=None)
    fake_db.add(r)

    called = {"delete": 0}

    def fake_delete(_url: str):
        called["delete"] += 1

    monkeypatch.setattr(mod, "_delete_from_supabase_by_public_url", fake_delete)

    resp = c.put(f"/riddles/{r.riddle_id}", data={"remove_file": "true"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["riddle_file"] is None
    assert called["delete"] == 0


def test_create_rejects_bad_file_type(app_and_module):
    app, _, _ = app_and_module
    c = TestClient(app)

    resp = c.post(
        "/riddles/create",
        data={"question": "Q", "answer": "A"},
        files={"file": ("x.txt", b"hi", "text/plain")},
    )
    assert resp.status_code == 400
    assert "unsupported file type" in resp.json()["detail"].lower()
