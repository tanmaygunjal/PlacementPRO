import os
import json
import httpx
import logging
from io import BytesIO
import pypdf
from typing import Dict, Any, List

# Configure logging
logger = logging.getLogger("ai_service")

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """
    Extracts plain text from PDF file bytes using pypdf.
    """
    try:
        reader = pypdf.PdfReader(BytesIO(pdf_bytes))
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text.strip()
    except Exception as e:
        logger.error(f"Error parsing PDF resume: {e}")
        raise ValueError(f"Could not parse PDF document: {str(e)}")

def _get_mock_analysis(resume_text: str) -> Dict[str, Any]:
    """
    Offline mock rules-based resume analyzer. Detects keywords and generates structured feedback.
    """
    logger.info("Using offline mock resume analyzer fallback.")
    text_lower = resume_text.lower()
    
    # Check for common technologies
    techs = {
        "React": ["react", "vue", "angular", "next.js", "nextjs", "javascript", "typescript", "frontend", "html", "css"],
        "Python": ["python", "django", "fastapi", "flask", "numpy", "pandas", "pytorch", "tensorflow"],
        "SQL": ["sql", "postgres", "mysql", "sqlite", "oracle", "database", "sqlalchemy"],
        "Docker": ["docker", "kubernetes", "k8s", "container"],
        "AWS": ["aws", "gcp", "azure", "cloud", "s3", "ec2"],
        "Git": ["git", "github", "gitlab", "version control"],
        "NodeJS": ["node", "express", "backend"],
        "Java": ["java", "spring boot", "springboot", "maven"]
    }
    
    extracted_skills = []
    for skill, keywords in techs.items():
        if any(keyword in text_lower for keyword in keywords):
            extracted_skills.append(skill)
            
    # Default minimum skills if none found
    if not extracted_skills:
        extracted_skills = ["Software Engineering", "Problem Solving"]
        
    all_possible_skills = ["React", "Python", "SQL", "Docker", "AWS", "Git", "NodeJS", "Java", "Kubernetes", "CI/CD", "TypeScript", "FastAPI"]
    missing_skills = [s for s in all_possible_skills if s not in extracted_skills]
    # Cap missing skills list length
    missing_skills = missing_skills[:4]
    
    # Calculate dummy score based on skills found
    base_score = 55
    score_increment = 7 * len(extracted_skills)
    ats_score = min(92, base_score + score_increment)
    
    # Generate Strengths
    strengths = []
    if "React" in extracted_skills:
        strengths.append("Demonstrated familiarity with modern front-end frameworks (React ecosystem).")
    if "Python" in extracted_skills or "Java" in extracted_skills:
        strengths.append("Solid core programming experience in high-level backend languages.")
    if "SQL" in extracted_skills:
        strengths.append("Good understanding of relational database design and SQL structures.")
    if "Docker" in extracted_skills or "AWS" in extracted_skills:
        strengths.append("Exposure to cloud orchestration or container deployment paradigms.")
    
    if len(strengths) < 2:
        strengths.append("Clean resume layout outlining education milestones clearly.")
        strengths.append("Listing standard professional competencies and soft skills.")
        
    # Generate Weaknesses
    weaknesses = []
    if "Docker" not in extracted_skills:
        weaknesses.append("Lack of containerization tools (Docker/Kubernetes) listed on the profile.")
    if "AWS" not in extracted_skills:
        weaknesses.append("No cloud computing platform (AWS, Azure, or GCP) experience identified.")
    if "SQL" not in extracted_skills:
        weaknesses.append("Relational database design concepts and storage layers are absent.")
        
    if not weaknesses:
        weaknesses.append("Could benefit from specifying quantified impact metrics inside job duties.")
        weaknesses.append("CI/CD deployment systems exposure is not actively detailed.")
        
    # Suggestions
    suggestions = []
    if "Docker" in missing_skills:
        suggestions.append("Incorporate Docker container commands and deploy a personal project to show DevOps knowledge.")
    if "AWS" in missing_skills:
        suggestions.append("Register for AWS Free Tier and detail host configurations using EC2 or cloud bucket storage.")
    suggestions.append("Use active power verbs (e.g. 'Engineered', 'Orchestrated', 'Optimized') at the start of bullet points.")
    suggestions.append("Include numerical metrics (e.g. 'Improved efficiency by 25%') to prove project success rates.")
    
    return {
        "ats_score": ats_score,
        "extracted_skills": extracted_skills,
        "missing_skills": missing_skills,
        "improvement_suggestions": suggestions,
        "strengths": strengths,
        "weaknesses": weaknesses
    }

def _get_mock_matching(resume_text: str, job_title: str, job_description: str, job_requirements: str) -> Dict[str, Any]:
    """
    Offline mock rules-based job matcher.
    """
    logger.info("Using offline mock job matcher fallback.")
    resume_lower = resume_text.lower()
    desc_req_lower = f"{job_title} {job_description} {job_requirements}".lower()
    
    potential_skills = [
        "React", "Vue", "Angular", "Python", "FastAPI", "Django", "SQL", "PostgreSQL",
        "Docker", "Kubernetes", "AWS", "GCP", "Git", "NodeJS", "TypeScript", "Java", "CI/CD"
    ]
    
    matching_skills = []
    missing_skills = []
    
    # Check what skills are mentioned in the job post
    for skill in potential_skills:
        if skill.lower() in desc_req_lower:
            # Check if student has it
            if skill.lower() in resume_lower:
                matching_skills.append(skill)
            else:
                missing_skills.append(skill)
                
    # Fallback default matching
    if not matching_skills and not missing_skills:
        matching_skills = ["Software Engineering"]
        missing_skills = ["System Architecture"]
        
    total = len(matching_skills) + len(missing_skills)
    if total > 0:
        match_score = int((len(matching_skills) / total) * 100)
    else:
        match_score = 65
        
    # Bound match score between realistic range
    match_score = max(35, min(95, match_score))
    
    suggestions = []
    for skill in missing_skills[:3]:
        suggestions.append(f"Add projects highlighting {skill} or detail your basic familiarity with it.")
    suggestions.append("Tailor your professional summary to mention aligning fields in the job requirements.")
    suggestions.append(f"Highlight any experience related to the core responsibilities outlined in: '{job_title}'.")
    
    return {
        "match_score": match_score,
        "matching_skills": matching_skills,
        "missing_skills": missing_skills,
        "tailoring_suggestions": suggestions
    }

async def analyze_resume(resume_text: str) -> Dict[str, Any]:
    """
    Analyzes the extracted resume text using OpenAI API (GPT-4o-mini).
    Falls back to _get_mock_analysis if OPENAI_API_KEY is not configured.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or api_key == "YOUR_OPENAI_API_KEY" or api_key.strip() == "":
        return _get_mock_analysis(resume_text)
        
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    
    prompt = f"""
You are a professional ATS (Applicant Tracking System) recruiter and resume analyzer.
Analyze the following resume text. Evaluate it objectively and output a strict JSON object with:
- "ats_score": An integer (0 to 100) representing how well formatted and comprehensive it is.
- "extracted_skills": A JSON array of string names representing technical skills found.
- "missing_skills": A JSON array of string names representing standard technical skills that are missing but expected for standard developer profiles.
- "improvement_suggestions": A JSON array of actionable suggestions to improve the resume.
- "strengths": A JSON array of key strengths of the candidate.
- "weaknesses": A JSON array of gaps or missing criteria.

Resume text:
\"\"\"
{resume_text}
\"\"\"

Your response must be JSON only, matching this structure.
"""

    payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": "You are a professional ATS resume grader. You must output JSON only."},
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.2
    }
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, headers=headers, timeout=30.0)
            if resp.status_code == 200:
                data = resp.json()
                content_str = data["choices"][0]["message"]["content"]
                result = json.loads(content_str)
                return result
            else:
                logger.error(f"OpenAI API call failed: {resp.status_code} - {resp.text}")
                return _get_mock_analysis(resume_text)
    except Exception as e:
        logger.error(f"Error calling OpenAI API: {e}")
        return _get_mock_analysis(resume_text)

async def match_resume_to_job(
    resume_text: str,
    job_title: str,
    job_description: str,
    job_requirements: str
) -> Dict[str, Any]:
    """
    Compares the student's resume text against a target job listing.
    Falls back to _get_mock_matching if OPENAI_API_KEY is not configured.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or api_key == "YOUR_OPENAI_API_KEY" or api_key.strip() == "":
        return _get_mock_matching(resume_text, job_title, job_description, job_requirements)
        
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    
    prompt = f"""
You are an ATS matching engine. Compare the candidate's resume text against the target job details.
Evaluate how well the candidate matches the job, and return a strict JSON object with:
- "match_score": An integer (0 to 100) representing compatibility.
- "matching_skills": A JSON array of string technical skills that match between the resume and job requirements.
- "missing_skills": A JSON array of string technical skills mentioned in the job but missing in the resume.
- "tailoring_suggestions": A JSON array of specific recommendations to tailer this resume for this job.

Target Job Title: {job_title}
Target Job Description:
{job_description}

Target Job Requirements:
{job_requirements}

Candidate Resume Text:
\"\"\"
{resume_text}
\"\"\"

Your response must be JSON only, matching this structure.
"""

    payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": "You are a professional ATS job-matching system. You must output JSON only."},
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.2
    }
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, headers=headers, timeout=30.0)
            if resp.status_code == 200:
                data = resp.json()
                content_str = data["choices"][0]["message"]["content"]
                result = json.loads(content_str)
                return result
            else:
                logger.error(f"OpenAI API match call failed: {resp.status_code} - {resp.text}")
                return _get_mock_matching(resume_text, job_title, job_description, job_requirements)
    except Exception as e:
        logger.error(f"Error calling OpenAI API for match: {e}")
        return _get_mock_matching(resume_text, job_title, job_description, job_requirements)
