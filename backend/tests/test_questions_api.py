import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
from types import SimpleNamespace

from main import app
from endpoints import questions_api
from endpoints.questions_api import questions_router

client = TestClient(app)

