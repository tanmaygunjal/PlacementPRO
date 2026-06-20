import pytest
from datetime import datetime, timedelta

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

def test_admin_only_access(client):
    admin_headers = get_auth_headers(client, "admin@test.com", "admin")
    student_headers = get_auth_headers(client, "student@test.com", "student")
    
    # Non-admin trying to get stats
    resp = client.get("/api/admin/stats", headers=student_headers)
    assert resp.status_code == 403
    
    # Admin getting stats
    resp = client.get("/api/admin/stats", headers=admin_headers)
    assert resp.status_code == 200

def test_admin_dashboard_flows(client):
    admin_headers = get_auth_headers(client, "admin@test.com", "admin")
    student_headers = get_auth_headers(client, "student@test.com", "student")
    
    # 1. Register a student profile
    profile_resp = client.post(
        "/api/students/profile",
        json={
            "full_name": "Test Student",
            "roll_number": "ST999",
            "branch": "Computer Science",
            "cgpa": 9.0,
            "graduation_year": 2026,
            "skills": "Python"
        },
        headers=student_headers
    )
    assert profile_resp.status_code == 201
    student_id = profile_resp.json()["id"]
    
    # 2. Register a company & job via admin (first company is created unapproved)
    co_resp = client.post(
        "/api/jobs/companies",
        json={"name": "TestCorp", "description": "Testing corp"},
        headers=admin_headers
    )
    assert co_resp.status_code == 201
    company_id = co_resp.json()["id"]
    
    # Check stats count: 1 student, 1 company
    stats_resp = client.get("/api/admin/stats", headers=admin_headers)
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    assert stats["total_students"] == 1
    assert stats["total_companies"] == 1
    assert stats["total_jobs"] == 0
    assert stats["total_applications"] == 0
    
    # Approve company
    approve_resp = client.patch(
        f"/api/admin/companies/{company_id}/approve",
        json={"is_approved": True},
        headers=admin_headers
    )
    assert approve_resp.status_code == 200
    assert approve_resp.json()["company"]["is_approved"] is True
    
    # Check list companies
    list_co_resp = client.get("/api/admin/companies", headers=admin_headers)
    assert list_co_resp.status_code == 200
    companies = list_co_resp.json()
    assert len(companies) == 1
    assert companies[0]["is_approved"] is True
    
    # Post a job now that company is approved
    job_deadline = (datetime.utcnow() + timedelta(days=5)).isoformat()
    job_resp = client.post(
        "/api/jobs",
        json={
            "company_id": company_id,
            "title": "Intern",
            "description": "General work",
            "eligibility_cgpa": 6.0,
            "deadline": job_deadline
        },
        headers=admin_headers
    )
    assert job_resp.status_code == 201
    job_id = job_resp.json()["id"]
    
    # Mock resume upload for student
    import io
    resume_file = io.BytesIO(b"dummy resume")
    upload_resp = client.post(
        "/api/students/resume",
        files={"file": ("resume.pdf", resume_file, "application/pdf")},
        headers=student_headers
    )
    assert upload_resp.status_code == 200
    
    # Apply to job
    app_resp = client.post(
        "/api/applications",
        json={"job_id": job_id},
        headers=student_headers
    )
    assert app_resp.status_code == 201
    
    # Fetch Analytics
    analytics_resp = client.get("/api/admin/analytics", headers=admin_headers)
    assert analytics_resp.status_code == 200
    analytics = analytics_resp.json()
    assert len(analytics["application_statuses"]) == 1
    assert analytics["application_statuses"][0]["status"] == "applied"
    assert analytics["application_statuses"][0]["count"] == 1
    assert len(analytics["branch_registrations"]) == 1
    assert "Computer Science" in analytics["branch_registrations"][0]["branch"]
    
    # Delete job (fake job cleanup)
    del_job_resp = client.delete(f"/api/admin/jobs/{job_id}", headers=admin_headers)
    assert del_job_resp.status_code == 200
    
    # Verify stats count after job deletion
    stats_resp2 = client.get("/api/admin/stats", headers=admin_headers)
    assert stats_resp2.json()["total_jobs"] == 0
    
    # Delete student
    del_student_resp = client.delete(f"/api/admin/students/{student_id}", headers=admin_headers)
    assert del_student_resp.status_code == 200
    
    # Verify student is gone
    stats_resp3 = client.get("/api/admin/stats", headers=admin_headers)
    assert stats_resp3.json()["total_students"] == 0
