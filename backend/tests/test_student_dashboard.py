import pytest
from datetime import datetime, timedelta

def get_auth_headers(client, email, role="student", name="Test User"):
    # Clear registration or reuse
    client.post(
        "/api/auth/register",
        json={"email": email, "password": "password123", "role": role, "name": name}
    )
    login_response = client.post(
        "/api/auth/login",
        data={"username": email, "password": "password123"}
    )
    token = login_response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_recommended_jobs_unauthorized(client):
    rec_headers = get_auth_headers(client, "rec_auth@example.com", "recruiter", "Recruiter User")
    resp = client.get("/api/students/recommended-jobs", headers=rec_headers)
    assert resp.status_code == 400
    assert "Only student users can access job recommendations" in resp.json()["detail"]

def test_recommended_jobs_empty_profile(client):
    student_headers = get_auth_headers(client, "student_empty@example.com", "student", "Empty Student")
    resp = client.get("/api/students/recommended-jobs", headers=student_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

def test_recommended_jobs_scoring_and_cgpa(client):
    admin_headers = get_auth_headers(client, "admin_rec@example.com", "admin", "Admin User")
    rec_headers = get_auth_headers(client, "rec_job@example.com", "recruiter", "Recruiter")
    
    # 1. Setup recruiter company
    co_resp = client.get("/api/jobs/companies/my", headers=rec_headers)
    co_id = co_resp.json()["id"]
    
    # Approve company
    client.patch(f"/api/admin/companies/{co_id}/approve", json={"is_approved": True}, headers=admin_headers)
    
    # 2. Post jobs with different CGPA limits and categories
    deadline = (datetime.utcnow() + timedelta(days=5)).isoformat()
    
    # Job A: Matches skills (python, sql) and category (Software). CGPA = 7.5
    job_a_resp = client.post(
        "/api/jobs",
        json={
            "company_id": co_id,
            "title": "Python Developer",
            "category": "Software",
            "description": "Building backends in python and sql",
            "requirements": "Knowledge of databases and query design",
            "eligibility_cgpa": 7.5,
            "deadline": deadline
        },
        headers=rec_headers
    )
    assert job_a_resp.status_code == 201
    
    # Job B: High CGPA requirement = 8.5
    job_b_resp = client.post(
        "/api/jobs",
        json={
            "company_id": co_id,
            "title": "React Specialist",
            "category": "Frontend",
            "description": "Vibrant react applications",
            "requirements": "Javascript UI components",
            "eligibility_cgpa": 8.5,
            "deadline": deadline
        },
        headers=rec_headers
    )
    assert job_b_resp.status_code == 201
    
    # Job C: Low CGPA requirement = 6.0, no skill matches
    job_c_resp = client.post(
        "/api/jobs",
        json={
            "company_id": co_id,
            "title": "General Dev",
            "category": "Testing",
            "description": "General assistant tasks",
            "requirements": "Manual checks",
            "eligibility_cgpa": 6.0,
            "deadline": deadline
        },
        headers=rec_headers
    )
    assert job_c_resp.status_code == 201
    
    # 3. Setup student profile with CGPA = 8.0, branch = Software, skills = python, sql
    student_headers = get_auth_headers(client, "student_matched@example.com", "student", "Matched Student")
    
    profile_resp = client.post(
        "/api/students/profile",
        json={
            "college": "State Technical",
            "branch": "Software",
            "graduation_year": 2026,
            "cgpa": 8.0,
            "skills": "python, sql"
        },
        headers=student_headers
    )
    assert profile_resp.status_code == 201
    
    # 4. Fetch recommended jobs
    rec_jobs_resp = client.get("/api/students/recommended-jobs", headers=student_headers)
    assert rec_jobs_resp.status_code == 200
    rec_jobs = rec_jobs_resp.json()
    
    # Check eligibility filtering: Student CGPA is 8.0.
    # Job B requires 8.5, so Job B should NOT be recommended.
    job_titles = [j["title"] for j in rec_jobs]
    assert "React Specialist" not in job_titles
    
    # Job A requires 7.5 and Job C requires 6.0. Student is eligible for both.
    assert "Python Developer" in job_titles
    assert "General Dev" in job_titles
    
    # Scoring verification: Job A matches skills (python, sql) and branch (Software matches category Software).
    # Job C matches nothing. Job A must be recommended FIRST.
    assert rec_jobs[0]["title"] == "Python Developer"

def test_application_eligibility_constraints(client):
    admin_headers = get_auth_headers(client, "admin_rec2@example.com", "admin", "Admin User")
    rec_headers = get_auth_headers(client, "rec_job2@example.com", "recruiter", "Recruiter")
    
    # Setup company
    co_resp = client.get("/api/jobs/companies/my", headers=rec_headers)
    co_id = co_resp.json()["id"]
    client.patch(f"/api/admin/companies/{co_id}/approve", json={"is_approved": True}, headers=admin_headers)
    
    # Post high requirement job: CGPA = 8.5
    deadline = (datetime.utcnow() + timedelta(days=5)).isoformat()
    job_resp = client.post(
        "/api/jobs",
        json={
            "company_id": co_id,
            "title": "Principal Architect",
            "category": "Engineering",
            "description": "Systems building",
            "eligibility_cgpa": 8.5,
            "deadline": deadline
        },
        headers=rec_headers
    )
    job_id = job_resp.json()["id"]
    
    # Student A registers with CGPA = 7.0, uploads a mock resume
    student_headers = get_auth_headers(client, "student_low_cgpa@example.com", "student", "Low CGPA Student")
    client.post(
        "/api/students/profile",
        json={
            "college": "State Technical",
            "branch": "Computer Science",
            "graduation_year": 2026,
            "cgpa": 7.0
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
    
    # Try to apply (should fail due to CGPA)
    app_resp_1 = client.post("/api/applications", json={"job_id": job_id}, headers=student_headers)
    assert app_resp_1.status_code == 400
    assert "minimum CGPA requirement" in app_resp_1.json()["detail"]
    
    # Student B registers, CGPA = 9.0 (eligible), but has NO resume uploaded
    student_headers_no_res = get_auth_headers(client, "student_no_resume@example.com", "student", "No Resume Student")
    client.post(
        "/api/students/profile",
        json={
            "college": "State Technical",
            "branch": "Computer Science",
            "graduation_year": 2026,
            "cgpa": 9.0
        },
        headers=student_headers_no_res
    )
    
    # Try to apply (should fail due to missing resume)
    app_resp_2 = client.post("/api/applications", json={"job_id": job_id}, headers=student_headers_no_res)
    assert app_resp_2.status_code == 400
    assert "Resume not found" in app_resp_2.json()["detail"]

def test_resume_upload_validations(client):
    student_headers = get_auth_headers(client, "student_upload_val@example.com", "student", "Upload Val User")
    
    import io
    
    # 1. Reject invalid file extension (e.g. .docx or .png)
    docx_file = io.BytesIO(b"dummy docx file")
    resp_1 = client.post(
        "/api/students/resume",
        files={"file": ("resume.docx", docx_file, "application/pdf")},
        headers=student_headers
    )
    assert resp_1.status_code == 400
    assert "Only PDF resumes are allowed" in resp_1.json()["detail"]
    
    # 2. Reject invalid MIME type (e.g. upload pdf extension but mime is application/json)
    fake_pdf_file = io.BytesIO(b"{}")
    resp_2 = client.post(
        "/api/students/resume",
        files={"file": ("resume.pdf", fake_pdf_file, "application/json")},
        headers=student_headers
    )
    assert resp_2.status_code == 400
    assert "Only PDF files are allowed" in resp_2.json()["detail"]
    
    # 3. Reject large PDF file (>5MB)
    large_pdf_data = b"a" * (5 * 1024 * 1024 + 10)
    large_pdf_file = io.BytesIO(large_pdf_data)
    resp_3 = client.post(
        "/api/students/resume",
        files={"file": ("resume.pdf", large_pdf_file, "application/pdf")},
        headers=student_headers
    )
    assert resp_3.status_code == 400
    assert "File size exceeds the limit of 5MB" in resp_3.json()["detail"]
    
    # 4. Accept valid PDF file (<=5MB)
    valid_pdf_data = b"dummy valid pdf data"
    valid_pdf_file = io.BytesIO(valid_pdf_data)
    resp_4 = client.post(
        "/api/students/resume",
        files={"file": ("resume.pdf", valid_pdf_file, "application/pdf")},
        headers=student_headers
    )
    assert resp_4.status_code == 200
    assert "resume_url" in resp_4.json()
