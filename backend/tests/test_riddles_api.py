import os
import importlib
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient


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
        # expr is like ("eq","riddle_id",3)
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
        # ignore model; we only have one table in this fake
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
# Test client fixture
# ----------------------------
@pytest.fixture()
def client(monkeypatch):
    # Ensure these exist BEFORE router import (supabase client created at import time)
    os.environ.setdefault("SUPABASE_URL", "http://localhost:54321")
    os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon-key")

    # CHANGE THIS import path to your router file
    riddles_module = importlib.import_module("src.endpoints.riddles_api")

    # Patch the module's Riddle to our fake constructible+filterable model
    monkeypatch.setattr(riddles_module, "Riddle", FakeRiddle)

    # Patch commit helper so it doesn't touch anything real
    monkeypatch.setattr(riddles_module, "_commit_or_rollback", lambda db: None)

    # Patch Supabase helpers so no real network calls happen
    async def fake_upload(_file):
        return "https://example.com/storage/v1/object/public/uploads/public/test.png"

    def fake_delete(_public_url: str):
        return None

    monkeypatch.setattr(riddles_module, "_upload_to_supabase", fake_upload)
    monkeypatch.setattr(riddles_module, "_delete_from_supabase_by_public_url", fake_delete)

    # Override get_db to return fake db session
    fake_db = FakeSession()
    from DB_Methods.database import get_db

    def override_get_db():
        yield fake_db

    app = FastAPI()
    app.dependency_overrides[get_db] = override_get_db
    app.include_router(riddles_module.riddles_router, prefix="/riddles")
    return TestClient(app)


# ----------------------------
# Tests
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


def test_edit_riddle_remove_file_flag(client):
    create = client.post(
        "/riddles/create",
        data={"question": "HasFile", "answer": "Yes"},
        files={"file": ("x.png", b"fake-bytes", "image/png")},
    )
    assert create.status_code == 201, create.text
    rid = create.json()["riddle_id"]
    assert create.json()["riddle_file"] is not None

    resp = client.put(f"/riddles/{rid}", data={"remove_file": "true"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["riddle_file"] is None


def test_delete_riddle(client):
    create = client.post("/riddles/create", data={"question": "DelQ", "answer": "DelA"})
    rid = create.json()["riddle_id"]

    resp = client.delete(f"/riddles/{rid}")
    assert resp.status_code == 204, resp.text

    get_resp = client.get(f"/riddles/{rid}")
    assert get_resp.status_code == 404
def test_create_requires_question_and_answer(client):
    # empty question
    r1 = client.post("/riddles/create", data={"question": "   ", "answer": "A"})
    assert r1.status_code == 400
    assert "required" in r1.json()["detail"].lower()

    # empty answer
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

    # empty question
    r1 = client.put(f"/riddles/{rid}", data={"question": "   "})
    assert r1.status_code == 400
    assert "cannot be empty" in r1.json()["detail"].lower()

    # empty answer
    r2 = client.put(f"/riddles/{rid}", data={"answer": "   "})
    assert r2.status_code == 400
    assert "cannot be empty" in r2.json()["detail"].lower()


def test_edit_duplicate_question_rejected(client):
    client.post("/riddles/create", data={"question": "Q1", "answer": "A1"})
    b = client.post("/riddles/create", data={"question": "Q2", "answer": "A2"})
    rid_b = b.json()["riddle_id"]

    # try to change Q2 -> Q1 (duplicate)
    resp = client.put(f"/riddles/{rid_b}", data={"question": "Q1"})
    assert resp.status_code == 400
    assert "already exists" in resp.json()["detail"].lower()


def test_create_with_file_sets_url(client):
    resp = client.post(
        "/riddles/create",
        data={"question": "QF", "answer": "AF"},
        files={"file": ("x.png", b"123", "image/png")},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["riddle_file"] is not None
    assert "storage" in body["riddle_file"]


def test_edit_replace_file_updates_url_and_keeps_other_fields(client):
    # create with initial file
    create = client.post(
        "/riddles/create",
        data={"question": "Q", "answer": "A"},
        files={"file": ("a.png", b"a", "image/png")},
    )
    rid = create.json()["riddle_id"]
    old_url = create.json()["riddle_file"]

    # Replace with new file
    resp = client.put(
        f"/riddles/{rid}",
        files={"file": ("b.png", b"b", "image/png")},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["riddle_question"] == "Q"
    assert body["riddle_answer"] == "A"
    assert body["riddle_file"] is not None
    assert body["riddle_file"] == old_url  # because our fake upload returns same URL


def test_remove_file_true_when_no_file_is_noop(client):
    create = client.post("/riddles/create", data={"question": "Q", "answer": "A"})
    rid = create.json()["riddle_id"]
    assert create.json()["riddle_file"] is None

    resp = client.put(f"/riddles/{rid}", data={"remove_file": "true"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["riddle_file"] is None





