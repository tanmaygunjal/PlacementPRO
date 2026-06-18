import pytest

def get_auth_headers(client, email):
    client.post(
        "/api/auth/register",
        json={"email": email, "password": "password123", "role": "student"}
    )
    login_response = client.post(
        "/api/auth/login",
        data={"username": email, "password": "password123"}
    )
    token = login_response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_readiness_calculation(client):
    headers = get_auth_headers(client, "ready_student@example.com")
    
    # Check readiness when profile doesn't exist
    resp = client.get("/api/students/readiness", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["readiness_score"] == 0
    assert data["profile_complete"] is False
    assert len(data["missing_skills"]) == 6 # All 6 core skills are missing
    
    # Create profile
    client.post(
        "/api/students/profile",
        json={
            "full_name": "Test Student",
            "roll_number": "ROLL001",
            "branch": "IT",
            "cgpa": 8.5,
            "graduation_year": 2026,
            "skills": "Python, SQL, DBMS"
        },
        headers=headers
    )
    
    # Check readiness again (20 pts profile + 15 pts skills (3*5) + 10 pts cgpa = 45 pts)
    resp = client.get("/api/students/readiness", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["readiness_score"] == 45
    assert data["profile_complete"] is True
    assert "Aptitude" in data["missing_skills"]
    assert "SQL" not in data["missing_skills"]

def test_resume_builder_save_load(client):
    headers = get_auth_headers(client, "builder_student@example.com")
    
    # Fetch empty resume data first
    resp = client.get("/api/students/resume-builder", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["summary"] == ""
    
    # Save resume data
    resume_data = {
        "summary": "Ambitious coder looking for backend roles.",
        "education": [
            {"school": "XYZ College", "degree": "B.Tech", "year": 2026, "cgpa": 8.5}
        ],
        "experience": [
            {"company": "ACME Corp", "role": "Intern", "duration": "3 months", "description": "Developed REST APIs using Python."}
        ],
        "projects": [
            {"title": "E-Commerce", "tech_stack": "React, FastAPI", "description": "Built full stack platform."}
        ],
        "template_style": "modern"
    }
    
    save_resp = client.post("/api/students/resume-builder", json=resume_data, headers=headers)
    assert save_resp.status_code == 200
    data = save_resp.json()
    assert data["summary"] == "Ambitious coder looking for backend roles."
    assert data["template_style"] == "modern"
    assert len(data["education"]) == 1
    
    # Fetch again
    load_resp = client.get("/api/students/resume-builder", headers=headers)
    assert load_resp.status_code == 200
    assert load_resp.json()["summary"] == "Ambitious coder looking for backend roles."

def test_ats_checker_eval(client):
    headers = get_auth_headers(client, "ats_student@example.com")
    
    # Very short resume
    short_resume = {
        "summary": "Short text",
        "education": [],
        "experience": [],
        "projects": [],
        "template_style": "classic"
    }
    
    resp = client.post("/api/students/ats-check", json=short_resume, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["length_check"]["status"] == "too_short"
    assert data["score"] < 40 # should be very low
    
    # Full robust resume
    full_resume = {
        "summary": "Highly motivated, proactive, and results-driven Software Engineer with extensive experience in designing, building, and developing highly scalable, reliable web applications. Skilled in backend architectures, relational database modeling, and automated cloud deployments. Strong proficiency in Python, SQL databases, and containerization using Docker and Kubernetes. Proven track record of optimizing system performance, reducing code complexity, and leading junior developers. Additionally, I possess excellent communication skills, collaborate effectively across functions, and love working in fast-paced agile teams to solve complex, real-world technical problems.",
        "education": [
            {"school": "Engineering Institute of Technology and Applied Sciences", "degree": "B.Tech in Computer Science and Software Engineering", "year": 2025, "cgpa": 9.1}
        ],
        "experience": [
            {
                "company": "Tech Labs Incorporated Corporation", 
                "role": "Lead Software Developer Intern Analyst", 
                "duration": "June 2024 - Present", 
                "description": "Developed and optimized SQL queries across multiple PostgreSQL production instances, which successfully reduced backend query response latency by 35 percent and improved overall search speed. Designed, coded, and built robust RESTful microservices using FastAPI and secure JWT authentication. Led a team of four engineering interns to implement automated testing pipelines. Deployed scalable services to AWS ECS using Docker containers and customized GitHub Actions CI/CD workflows."
            },
            {
                "company": "Startup Hub Technology Labs", 
                "role": "Full Stack Developer Specialist", 
                "duration": "January 2024 - May 2024", 
                "description": "Built highly responsive and interactive user interfaces using React, HTML5, CSS3, and unified state management logic. Created server side API routes and database models using Django and Postgres. Integrated Stripe payment gateways and third-party authentication services. Monitored server health logs and resolved system bugs, which increased application uptime significantly by 15 percent."
            }
        ],
        "projects": [
            {
                "title": "Smart Placement Portal Tracking System", 
                "tech_stack": "Python, FastAPI, Postgres, Git, Docker, Bootstrap", 
                "description": "Designed and built an end-to-end placement tracking software that manages candidate resumes and job listings. Integrated automated scoring tools, formatting validators, and version control options. Created a highly interactive and clean dashboard using vanilla JS and CSS to display placement readiness indicators."
            },
            {
                "title": "ATS Engine Scanner and Resume Parser", 
                "tech_stack": "Python, NLP, Regex, NLTK, FastAPI", 
                "description": "Created a lightweight resume parser that scans document text for keyword matches, length, formatting warnings, and action verbs. Designed customizable reporting displays for candidates. Added PDF parsing support and template selection logic."
            }
        ],
        "template_style": "modern"
    }
    
    resp = client.post("/api/students/ats-check", json=full_resume, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["length_check"]["status"] == "optimal"
    assert "developed" in data["keyword_check"]["found"]
    assert "SQL" in data["skills_match"]["found"]
    assert data["score"] >= 80 # Should be quite high!


