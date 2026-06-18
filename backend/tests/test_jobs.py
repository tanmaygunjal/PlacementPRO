import pytest
from datetime import datetime, timedelta

def get_auth_headers(client, email, role="student"):
    client.post(
        "/api/auth/register",
        json={"email": email, "password": "password123", "role": role}
    )
    login_response = client.post(
        "/api/auth/login",
        data={"username": email, "password": "password123"}
    )
    token = login_response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_create_company_and_job(client):
    admin_headers = get_auth_headers(client, "admin@example.com", "admin")
    
    # Create Company
    co_resp = client.post(
        "/api/jobs/companies",
        json={"name": "Google", "description": "Search engine", "website": "https://google.com"},
        headers=admin_headers
    )
    assert co_resp.status_code == 201
    company_id = co_resp.json()["id"]
    
    # Create Job
    job_deadline = (datetime.utcnow() + timedelta(days=5)).isoformat()
    job_resp = client.post(
        "/api/jobs",
        json={
            "company_id": company_id,
            "title": "Software Engineer",
            "description": "Coding python",
            "requirements": "Python, SQL",
            "location": "Bangalore",
            "ctc": 15.5,
            "eligibility_cgpa": 7.5,
            "deadline": job_deadline
        },
        headers=admin_headers
    )
    assert job_resp.status_code == 201
    assert job_resp.json()["title"] == "Software Engineer"
    assert job_resp.json()["eligibility_cgpa"] == 7.5

def test_job_application_eligibility(client):
    admin_headers = get_auth_headers(client, "admin@example.com", "admin")
    student_headers = get_auth_headers(client, "student@example.com", "student")
    
    # 1. Create company and job
    co_resp = client.post(
        "/api/jobs/companies",
        json={"name": "Meta", "description": "Social Network"},
        headers=admin_headers
    )
    company_id = co_resp.json()["id"]
    
    job_deadline = (datetime.utcnow() + timedelta(days=5)).isoformat()
    job_resp = client.post(
        "/api/jobs",
        json={
            "company_id": company_id,
            "title": "Backend Dev",
            "description": "Python, Django",
            "eligibility_cgpa": 8.0,
            "deadline": job_deadline
        },
        headers=admin_headers
    )
    job_id = job_resp.json()["id"]
    
    # 2. Try applying before creating student profile (should fail)
    app_resp = client.post(
        "/api/applications",
        json={"job_id": job_id},
        headers=student_headers
    )
    assert app_resp.status_code == 400
    assert "Student profile not found" in app_resp.json()["detail"]
    
    # 3. Create Student Profile with low CGPA (e.g. 7.0)
    profile_resp = client.post(
        "/api/students/profile",
        json={
            "full_name": "John Doe",
            "roll_number": "CS101",
            "branch": "Computer Science",
            "cgpa": 7.0,
            "graduation_year": 2026,
            "skills": "Python"
        },
        headers=student_headers
    )
    assert profile_resp.status_code == 201
    
    # Try applying without resume (should fail)
    app_resp = client.post(
        "/api/applications",
        json={"job_id": job_id},
        headers=student_headers
    )
    assert app_resp.status_code == 400
    assert "Resume not found" in app_resp.json()["detail"]
    
    # 4. Mock resume upload
    import io
    resume_file = io.BytesIO(b"dummy pdf resume content")
    upload_resp = client.post(
        "/api/students/resume",
        files={"file": ("resume.pdf", resume_file, "application/pdf")},
        headers=student_headers
    )
    assert upload_resp.status_code == 200
    
    # 5. Apply with low CGPA (7.0 < 8.0 eligibility) (should fail)
    app_resp = client.post(
        "/api/applications",
        json={"job_id": job_id},
        headers=student_headers
    )
    assert app_resp.status_code == 400
    assert "do not meet the minimum CGPA requirement" in app_resp.json()["detail"]
    
    # 6. Update student profile to high CGPA (8.5)
    update_resp = client.put(
        "/api/students/profile",
        json={
            "full_name": "John Doe",
            "roll_number": "CS101",
            "branch": "Computer Science",
            "cgpa": 8.5,
            "graduation_year": 2026,
            "skills": "Python"
        },
        headers=student_headers
    )
    assert update_resp.status_code == 200
    
    # 7. Apply again (should succeed)
    app_resp = client.post(
        "/api/applications",
        json={"job_id": job_id},
        headers=student_headers
    )
    assert app_resp.status_code == 201
    assert app_resp.json()["status"] == "applied"
