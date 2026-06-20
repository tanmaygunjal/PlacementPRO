import pytest
from unittest.mock import patch, AsyncMock
from app.models.resume_analysis import ResumeAnalysis
from app.services.ai_service import _get_mock_analysis, _get_mock_matching

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

def test_mock_analysis_helper():
    text = "John Doe. Senior Software Developer. Experience with React, Python, FastAPI and SQL databases."
    res = _get_mock_analysis(text)
    assert res["ats_score"] > 60
    assert "React" in res["extracted_skills"]
    assert "Python" in res["extracted_skills"]
    assert "SQL" in res["extracted_skills"]
    assert "extracted_skills" in res
    assert "missing_skills" in res
    assert "strengths" in res
    assert "weaknesses" in res

def test_mock_matching_helper():
    text = "Experience with React and Python"
    res = _get_mock_matching(text, "React Frontend Engineer", "Build web apps in React", "React, TypeScript")
    assert "React" in res["matching_skills"]
    assert "TypeScript" in res["missing_skills"]
    assert res["match_score"] > 0
    assert "tailoring_suggestions" in res

@pytest.mark.asyncio
@patch("app.routers.resume_analyzer._get_student_resume_text", new_callable=AsyncMock)
def test_resume_analyzer_flows(mock_resume_text, client, db):
    # Setup mock return for resume text extraction
    mock_resume_text.return_value = "Expert developer in React and Python backend."
    
    admin_headers = get_auth_headers(client, "admin@test.com", "admin")
    student_headers = get_auth_headers(client, "student@test.com", "student")
    
    # 1. Register student profile so they have profile record
    profile_resp = client.post(
        "/api/students/profile",
        json={
            "full_name": "Test Student",
            "roll_number": "ST888",
            "branch": "Computer Science",
            "cgpa": 9.5,
            "graduation_year": 2026,
            "skills": "" # Empty skills, should be auto-updated
        },
        headers=student_headers
    )
    assert profile_resp.status_code == 201
    
    # Try to scan without resume_url set
    scan_fail_resp = client.post("/api/resume-analyzer/analyze", headers=student_headers)
    assert scan_fail_resp.status_code == 400
    assert "upload a resume" in scan_fail_resp.json()["detail"].lower()
    
    # Mock resume file upload
    import io
    resume_file = io.BytesIO(b"dummy resume pdf bytes")
    upload_resp = client.post(
        "/api/students/resume",
        files={"file": ("resume.pdf", resume_file, "application/pdf")},
        headers=student_headers
    )
    assert upload_resp.status_code == 200
    
    # 2. Trigger AI analysis
    scan_resp = client.post("/api/resume-analyzer/analyze", headers=student_headers)
    assert scan_resp.status_code == 200
    analysis = scan_resp.json()
    assert analysis["ats_score"] > 0
    assert "React" in analysis["extracted_skills"]
    assert "Python" in analysis["extracted_skills"]
    
    # Verify student skills was auto-seeded
    student_check = client.get("/api/auth/me", headers=student_headers)
    assert "React" in student_check.json()["student_profile"]["skills"]
    
    # 3. Retrieve latest analysis
    get_resp = client.get("/api/resume-analyzer/latest", headers=student_headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["ats_score"] == analysis["ats_score"]
    
    # 4. Non-students block
    admin_get_resp = client.get("/api/resume-analyzer/latest", headers=admin_headers)
    assert admin_get_resp.status_code == 403
    
    # 5. Create a job listing for matching
    company_resp = client.post(
        "/api/jobs/companies",
        json={"name": "Match Corp", "description": "Match testing"},
        headers=admin_headers
    )
    company_id = company_resp.json()["id"]
    
    # Approve company
    client.patch(f"/api/admin/companies/{company_id}/approve", json={"is_approved": True}, headers=admin_headers)
    
    job_resp = client.post(
        "/api/jobs",
        json={
            "company_id": company_id,
            "title": "React and Python Developer",
            "description": "Looking for React developer with Python skills.",
            "requirements": "React, Python, TypeScript",
            "deadline": "2026-12-31T00:00:00"
        },
        headers=admin_headers
    )
    job_id = job_resp.json()["id"]
    
    # 6. Test job matching
    match_resp = client.post(
        "/api/resume-analyzer/match-job",
        json={"job_id": job_id},
        headers=student_headers
    )
    assert match_resp.status_code == 200
    match = match_resp.json()
    assert match["match_score"] > 0
    assert "React" in match["matching_skills"]
    assert "TypeScript" in match["missing_skills"]
