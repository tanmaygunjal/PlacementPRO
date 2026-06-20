import pytest
from datetime import datetime, timedelta

def get_auth_headers(client, email, role="student"):
    # Clear registration or reuse
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

def test_recruiter_profile_and_logo(client):
    recruiter_headers = get_auth_headers(client, "recruiter@example.com", "recruiter")
    
    # 1. Fetch own company details
    get_resp = client.get("/api/jobs/companies/my", headers=recruiter_headers)
    assert get_resp.status_code == 200
    company_id = get_resp.json()["id"]
    
    # 2. Update company details
    update_resp = client.put(
        "/api/jobs/companies/my",
        json={
            "company_name": "Updated Inc",
            "website": "https://updated.com",
            "industry": "Software",
            "description": "Building things"
        },
        headers=recruiter_headers
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["company_name"] == "Updated Inc"
    assert update_resp.json()["website"] == "https://updated.com"
    
    # 3. Logo upload mock check
    import io
    logo_file = io.BytesIO(b"dummy logo graphic")
    logo_resp = client.post(
        "/api/jobs/companies/my/logo",
        files={"file": ("logo.png", logo_file, "image/png")},
        headers=recruiter_headers
    )
    assert logo_resp.status_code == 200
    assert "logo_url" in logo_resp.json()

def test_recruiter_job_management_and_ownership(client):
    admin_headers = get_auth_headers(client, "admin@example.com", "admin")
    rec_headers_1 = get_auth_headers(client, "rec1@example.com", "recruiter")
    rec_headers_2 = get_auth_headers(client, "rec2@example.com", "recruiter")
    
    # Get company ID for recruiter 1
    co_resp_1 = client.get("/api/jobs/companies/my", headers=rec_headers_1)
    co_id_1 = co_resp_1.json()["id"]
    
    # Get company ID for recruiter 2
    co_resp_2 = client.get("/api/jobs/companies/my", headers=rec_headers_2)
    co_id_2 = co_resp_2.json()["id"]
    
    # Approve both companies first
    client.patch(f"/api/admin/companies/{co_id_1}/approve", json={"is_approved": True}, headers=admin_headers)
    client.patch(f"/api/admin/companies/{co_id_2}/approve", json={"is_approved": True}, headers=admin_headers)
    
    # 1. Rec1 posts job for company 1
    job_deadline = (datetime.utcnow() + timedelta(days=5)).isoformat()
    job_resp_1 = client.post(
        "/api/jobs",
        json={
            "company_id": co_id_1,
            "title": "Developer 1",
            "description": "Original description",
            "eligibility_cgpa": 6.5,
            "deadline": job_deadline
        },
        headers=rec_headers_1
    )
    assert job_resp_1.status_code == 201
    job_id_1 = job_resp_1.json()["id"]
    
    # 2. Rec1 edits job 1 (should succeed)
    edit_resp = client.put(
        f"/api/jobs/{job_id_1}",
        json={
            "company_id": co_id_1,
            "title": "Developer 1 (Modified)",
            "description": "Updated description",
            "eligibility_cgpa": 7.0,
            "deadline": job_deadline
        },
        headers=rec_headers_1
    )
    assert edit_resp.status_code == 200
    assert edit_resp.json()["title"] == "Developer 1 (Modified)"
    
    # 3. Rec2 attempts to edit job 1 (should fail with 403 Forbidden)
    illegal_edit_resp = client.put(
        f"/api/jobs/{job_id_1}",
        json={
            "company_id": co_id_1,
            "title": "Hacked Title",
            "description": "Hacked",
            "eligibility_cgpa": 5.0,
            "deadline": job_deadline
        },
        headers=rec_headers_2
    )
    assert illegal_edit_resp.status_code == 403
    
    # 4. Rec2 attempts to delete job 1 (should fail with 403 Forbidden)
    illegal_del_resp = client.delete(f"/api/jobs/{job_id_1}", headers=rec_headers_2)
    assert illegal_del_resp.status_code == 403
    
    # 5. Rec1 deletes job 1 (should succeed)
    del_resp = client.delete(f"/api/jobs/{job_id_1}", headers=rec_headers_1)
    assert del_resp.status_code == 200

def test_recruiter_applicant_management(client):
    admin_headers = get_auth_headers(client, "admin@example.com", "admin")
    rec_headers_1 = get_auth_headers(client, "rec1@example.com", "recruiter")
    rec_headers_2 = get_auth_headers(client, "rec2@example.com", "recruiter")
    student_headers = get_auth_headers(client, "student@example.com", "student")
    
    co_resp_1 = client.get("/api/jobs/companies/my", headers=rec_headers_1)
    co_id_1 = co_resp_1.json()["id"]
    client.patch(f"/api/admin/companies/{co_id_1}/approve", json={"is_approved": True}, headers=admin_headers)
    
    # Post job
    job_deadline = (datetime.utcnow() + timedelta(days=5)).isoformat()
    job_resp = client.post(
        "/api/jobs",
        json={
            "company_id": co_id_1,
            "title": "Engineer",
            "description": "Dev",
            "eligibility_cgpa": 6.0,
            "deadline": job_deadline
        },
        headers=rec_headers_1
    )
    job_id = job_resp.json()["id"]
    
    # Student creates profile
    client.post(
        "/api/students/profile",
        json={
            "full_name": "Test Student",
            "roll_number": "ST-001",
            "branch": "IT",
            "cgpa": 8.0,
            "graduation_year": 2026
        },
        headers=student_headers
    )
    # Upload resume
    import io
    resume_file = io.BytesIO(b"dummy pdf resume")
    client.post(
        "/api/students/resume",
        files={"file": ("resume.pdf", resume_file, "application/pdf")},
        headers=student_headers
    )
    # Apply to job
    app_resp = client.post("/api/applications", json={"job_id": job_id}, headers=student_headers)
    app_id = app_resp.json()["id"]
    
    # 1. Rec2 tries to view applicants for job 1 (should return 403)
    rec2_view_resp = client.get(f"/api/applications/job/{job_id}", headers=rec_headers_2)
    assert rec2_view_resp.status_code == 403
    
    # 2. Rec1 views applicants for job 1 (should return list)
    rec1_view_resp = client.get(f"/api/applications/job/{job_id}", headers=rec_headers_1)
    assert rec1_view_resp.status_code == 200
    assert len(rec1_view_resp.json()) == 1
    
    # 3. Rec1 updates application status to shortlisted
    status_resp = client.put(
        f"/api/applications/{app_id}/status",
        json={"status": "shortlisted"},
        headers=rec_headers_1
    )
    assert status_resp.status_code == 200
    assert status_resp.json()["status"] == "shortlisted"
