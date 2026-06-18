def test_register_user(client):
    response = client.post(
        "/api/auth/register",
        json={"email": "student@example.com", "password": "password123", "role": "student"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "student@example.com"
    assert data["role"] == "student"
    assert "id" in data

def test_register_existing_user(client):
    client.post(
        "/api/auth/register",
        json={"email": "student@example.com", "password": "password123", "role": "student"}
    )
    response = client.post(
        "/api/auth/register",
        json={"email": "student@example.com", "password": "anotherpassword", "role": "student"}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Email already registered"

def test_login_user(client):
    client.post(
        "/api/auth/register",
        json={"email": "student@example.com", "password": "password123", "role": "student"}
    )
    
    response = client.post(
        "/api/auth/login",
        data={"username": "student@example.com", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_incorrect_password(client):
    client.post(
        "/api/auth/register",
        json={"email": "student@example.com", "password": "password123", "role": "student"}
    )
    response = client.post(
        "/api/auth/login",
        data={"username": "student@example.com", "password": "wrongpassword"}
    )
    assert response.status_code == 401

def test_get_me(client):
    client.post(
        "/api/auth/register",
        json={"email": "student@example.com", "password": "password123", "role": "student"}
    )
    
    login_response = client.post(
        "/api/auth/login",
        data={"username": "student@example.com", "password": "password123"}
    )
    token = login_response.json()["access_token"]
    
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "student@example.com"
