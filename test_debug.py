import requests
import uuid

API_URL = "http://localhost:8000"
email = f"test_{uuid.uuid4()}@example.com"

# 1. Register a test user
res = requests.post(f"{API_URL}/auth/register", json={
    "username": "testuser",
    "email": email,
    "password": "password123"
})

# 2. Login
res = requests.post(f"{API_URL}/auth/login", data={
    "username": email,
    "password": "password123"
})
token = res.json().get("access_token")

# 3. Create companion
headers = {"Authorization": f"Bearer {token}"}
res = requests.post(f"{API_URL}/companion/", headers=headers, json={
    "name": "Alex",
    "personality_style": "supportive",
    "accountability_style": "gentle"
})

# 4. Chat
messages = [
    "hi bro wassup",
    "it's going great, any good news in the world?",
    "it seems you are stuck on hi there bro"
]

for msg in messages:
    print(f"\nUser: {msg}")
    res = requests.post(f"{API_URL}/chat/", headers=headers, json={"message": msg})
    print("Assistant:", res.json().get("reply", res.text))
