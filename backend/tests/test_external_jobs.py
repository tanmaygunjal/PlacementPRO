import pytest
from unittest.mock import patch, AsyncMock
from app.services.external_job_service import categorize_job

# Helper function to get authorization headers
def get_auth_headers(client, email, role="student"):
    client.post(
        "/api/auth/register",
        json={"email": email, "password": "password123", "role": role, "name": f"{role.capitalize()} User"}
    )
    login_response = client.post(
        "/api/auth/login",
        data={"username": email, "password": "password123"}
    )
    token = login_response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_categorize_job_helper():
    # Test frontend category matching
    assert categorize_job("React Developer") == "Frontend"
    assert categorize_job("Senior UI Engineer", "Design beautiful interfaces") == "Frontend"
    
    # Test backend category matching
    assert categorize_job("FastAPI Backend Engineer") == "Backend"
    assert categorize_job("Java Spring Boot Developer") == "Backend"
    
    # Test fullstack category matching
    assert categorize_job("Full-stack Engineer") == "Fullstack"
    assert categorize_job("MERN Stack Developer") == "Fullstack"
    
    # Test data science category matching
    assert categorize_job("Machine Learning Engineer") == "Data Science & AI"
    assert categorize_job("AI Research Scientist") == "Data Science & AI"
    
    # Test mobile category matching
    assert categorize_job("iOS Developer") == "Mobile Development"
    assert categorize_job("Flutter Developer") == "Mobile Development"
    
    # Test DevOps matching
    assert categorize_job("DevOps Engineer", "Manage AWS infrastructure") == "DevOps & Cloud"
    
    # Test cybersecurity matching
    assert categorize_job("Cybersecurity Analyst") == "Cybersecurity"
    
    # Test QA & Testing
    assert categorize_job("QA Engineer", "Automation testing") == "QA & Testing"
    
    # Test default
    assert categorize_job("Random job title", "Nothing matches") == "Software Engineering"

@pytest.mark.asyncio
@patch("app.services.external_job_service.fetch_arbeitnow", new_callable=AsyncMock)
@patch("app.services.external_job_service.fetch_adzuna", new_callable=AsyncMock)
@patch("app.services.external_job_service.fetch_jsearch", new_callable=AsyncMock)
def test_external_jobs_integration(mock_jsearch, mock_adzuna, mock_arbeitnow, client):
    # Setup mock returns
    mock_arbeitnow.return_value = [
        {
            "title": "React Frontend Developer",
            "company_name": "Arbeit Co",
            "location": "Berlin",
            "salary": "Not specified",
            "description": "Need React expert",
            "apply_url": "http://arbeit.com/react",
            "source_api": "Arbeitnow",
            "external_id": "arbeitnow_react"
        }
    ]
    mock_adzuna.return_value = [
        {
            "title": "Backend Python Developer",
            "company_name": "Adzuna Co",
            "location": "London",
            "salary": "$80,000",
            "description": "Django, FastAPI developer",
            "apply_url": "http://adzuna.com/python",
            "source_api": "Adzuna",
            "external_id": "adzuna_python"
        }
    ]
    mock_jsearch.return_value = [
        {
            "title": "Machine Learning Engineer",
            "company_name": "JSearch Co",
            "location": "San Francisco",
            "salary": "$150,000",
            "description": "AI ML Scientist",
            "apply_url": "http://jsearch.com/ml",
            "source_api": "JSearch",
            "external_id": "jsearch_ml"
        }
    ]
    
    # Register/login users
    admin_headers = get_auth_headers(client, "admin@test.com", "admin")
    student_headers = get_auth_headers(client, "student@test.com", "student")
    
    # 1. Non-admin cannot trigger fetch
    fetch_resp_student = client.post("/api/external-jobs/fetch", headers=student_headers)
    assert fetch_resp_student.status_code == 403
    
    # 2. Admin triggers fetch successfully
    fetch_resp_admin = client.post("/api/external-jobs/fetch", headers=admin_headers)
    assert fetch_resp_admin.status_code == 200
    assert fetch_resp_admin.json()["new_jobs_added"] == 3
    
    # 3. Retrieve jobs
    get_resp = client.get("/api/external-jobs", headers=student_headers)
    assert get_resp.status_code == 200
    jobs = get_resp.json()
    assert len(jobs) == 3
    
    # Asserting data mapping & auto-categorization
    react_job = next(j for j in jobs if j["source_api"] == "Arbeitnow")
    assert react_job["title"] == "React Frontend Developer"
    assert react_job["category"] == "Frontend"
    
    python_job = next(j for j in jobs if j["source_api"] == "Adzuna")
    assert python_job["title"] == "Backend Python Developer"
    assert python_job["category"] == "Backend"
    
    ml_job = next(j for j in jobs if j["source_api"] == "JSearch")
    assert ml_job["title"] == "Machine Learning Engineer"
    assert ml_job["category"] == "Data Science & AI"
    
    # 4. Categories list endpoint
    cat_resp = client.get("/api/external-jobs/categories", headers=student_headers)
    assert cat_resp.status_code == 200
    categories = cat_resp.json()
    assert len(categories) == 3
    assert set(categories) == {"Frontend", "Backend", "Data Science & AI"}
    
    # 5. Filters check
    # Filter by category
    cat_filter_resp = client.get("/api/external-jobs?category=Backend", headers=student_headers)
    assert len(cat_filter_resp.json()) == 1
    assert cat_filter_resp.json()[0]["title"] == "Backend Python Developer"
    
    # Filter by search query
    search_filter_resp = client.get("/api/external-jobs?search=React", headers=student_headers)
    assert len(search_filter_resp.json()) == 1
    assert search_filter_resp.json()[0]["title"] == "React Frontend Developer"
    
    # Filter by location
    loc_filter_resp = client.get("/api/external-jobs?location=London", headers=student_headers)
    assert len(loc_filter_resp.json()) == 1
    assert loc_filter_resp.json()[0]["title"] == "Backend Python Developer"
    
    # Filter by source
    source_filter_resp = client.get("/api/external-jobs?source=JSearch", headers=student_headers)
    assert len(source_filter_resp.json()) == 1
    assert source_filter_resp.json()[0]["title"] == "Machine Learning Engineer"
    
    # 6. Deduplication check (run fetch again, no new jobs should be added)
    fetch_again_resp = client.post("/api/external-jobs/fetch", headers=admin_headers)
    assert fetch_again_resp.status_code == 200
    assert fetch_again_resp.json()["new_jobs_added"] == 0
    
    # Database count remains 3
    get_resp_after = client.get("/api/external-jobs", headers=student_headers)
    assert len(get_resp_after.json()) == 3
