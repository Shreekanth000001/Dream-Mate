from fastapi.testclient import TestClient
from apps.api.main import app
import os

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to DREAMMATE API"}
