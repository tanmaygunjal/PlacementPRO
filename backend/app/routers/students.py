import os
import json
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.user import User, UserRole
from app.models.student import Student
from app.models.job import Job
from app.models.application import Application
from app.schemas.user import StudentCreate, StudentResponse, StudentBase
from app.schemas.resume import (
    ResumeDataCreate, 
    ResumeDataResponse, 
    AtsCheckResult, 
    ReadinessResponse, 
    JobDeadlineInfo, 
    CheckDetail
)
from app.schemas.job import JobDetailResponse
from app.services import user_service
from app.auth.dependencies import get_current_active_user, RoleChecker

router = APIRouter(prefix="/students", tags=["Students"])

UPLOAD_DIR = "/tmp/uploads"

# Temporary in-memory storage for mock resume-builder data to avoid DB errors
MOCK_RESUME_STORE = {}

@router.post("/profile", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def create_profile(
    profile: StudentCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.STUDENT.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only users with role STUDENT can create a student profile"
        )
    return user_service.create_student_profile(db, current_user.id, profile)

@router.put("/profile", response_model=StudentResponse)
def update_profile(
    profile: StudentBase,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.STUDENT.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only users with role STUDENT can update a student profile"
        )
    return user_service.update_student_profile(db, current_user.id, profile)

@router.get("/profile", response_model=StudentResponse)
def get_profile(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found. Please create one."
        )
    return profile

@router.post("/resume", response_model=StudentResponse)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.STUDENT.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only students can upload resumes"
        )
        
    # Validate file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext != ".pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF resumes are allowed."
        )
        
    # Validate MIME type
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only PDF files are allowed."
        )
        
    # Read contents and check file size
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds the limit of 5MB."
        )
        
    # Create safe filename: resume_{student_id}{file_ext}
    filename = f"resume_{current_user.id}{file_ext}"
    resume_url = f"https://lejkebtkdhnhicdjolxb.supabase.co/storage/v1/object/public/resumes/{filename}"
    
    try:
        from app.database import supabase
        if supabase:
            try:
                supabase.storage.from_("resumes").upload(path=filename, file=contents, file_options={"content-type": file.content_type})
            except Exception as upload_err:
                try:
                    supabase.storage.from_("resumes").update(path=filename, file=contents, file_options={"content-type": file.content_type})
                except Exception as update_err:
                    raise Exception(f"Upload failed: {str(upload_err)} | Update fallback failed: {str(update_err)}")
        else:
            # Fallback to local storage (e.g. during tests)
            os.makedirs(UPLOAD_DIR, exist_ok=True)
            filepath = os.path.join(UPLOAD_DIR, filename)
            with open(filepath, "wb") as f:
                f.write(contents)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not save or upload resume file: {str(e)}"
        )
        
    return user_service.update_resume_url(db, current_user.id, resume_url)

@router.get("/{student_id}/resume")
def download_resume(
    student_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Check permissions: Admin/Recruiter can download any resume, Student can only download their own
    student_profile = db.query(Student).filter(Student.id == student_id).first()
    if not student_profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")
        
    if current_user.role == UserRole.STUDENT.value and current_user.id != student_profile.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view other students' resumes"
        )
        
    if not student_profile.resume_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found for this student"
        )
        
    filename = student_profile.resume_url.split("/")[-1]
    
    try:
        from app.database import supabase
        if supabase:
            file_bytes = supabase.storage.from_("resumes").download(filename)
        else:
            filepath = os.path.join(UPLOAD_DIR, filename)
            if not os.path.exists(filepath):
                raise Exception("Local resume file does not exist on disk")
            with open(filepath, "rb") as f:
                file_bytes = f.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resume file could not be retrieved: {str(e)}"
        )
        
    import mimetypes
    media_type, _ = mimetypes.guess_type(filename)
    if not media_type:
        media_type = "application/octet-stream"
        
    return Response(
        content=file_bytes,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{current_user.name}_resume{os.path.splitext(filename)[1]}"'
        }
    )

@router.get("", response_model=List[StudentResponse])
def get_all_students(
    min_cgpa: Optional[float] = None,
    branch: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(RoleChecker([UserRole.ADMIN.value, UserRole.RECRUITER.value])),
    db: Session = Depends(get_db)
):
    return user_service.list_students(db, min_cgpa=min_cgpa, branch=branch, search=search)

@router.get("/readiness", response_model=ReadinessResponse)
def get_readiness(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.STUDENT.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only student accounts have placement readiness details"
        )
        
    profile = db.query(Student).filter(Student.user_id == current_user.id).first()
    
    # Defaults
    readiness_score = 0
    profile_complete = False
    resume_uploaded = False
    skills_count = 0
    missing_skills = []
    upcoming_deadlines = []
    interview_readiness = "Low"
    
    parsed_skills = []
    if profile and (profile.college or profile.branch):
        profile_complete = True
        readiness_score += 20
        
        # Resume status check
        if profile.resume_url:
            resume_uploaded = True
            readiness_score += 30
            
        # Skills check
        if profile.skills:
            parsed_skills = [s.strip().lower() for s in profile.skills.split(",") if s.strip()]
            skills_count = len(parsed_skills)
            readiness_score += min(skills_count * 5, 25)
            
        # CGPA check
        if profile.cgpa and profile.cgpa >= 8.0:
            readiness_score += 10
        elif profile.cgpa and profile.cgpa >= 7.0:
            readiness_score += 5
            
        # Interview readiness
        student_apps = db.query(Application).filter(Application.student_id == profile.id).all()
        if student_apps:
            readiness_score += 15
            statuses = [app.status for app in student_apps]
            if "offered" in statuses or "interviewing" in statuses:
                interview_readiness = "High"
            elif "shortlisted" in statuses or "applied" in statuses:
                interview_readiness = "Moderate"
                
    # Missing Core Skills
    core_skills = ["sql", "dbms", "aptitude", "python", "data structures", "algorithms"]
    for s in core_skills:
        if s not in parsed_skills:
            missing_skills.append(s.title() if s not in ["sql", "dbms"] else s.upper())
                
    # Upcoming Deadlines
    now = datetime.utcnow()
    one_week_later = now + timedelta(days=7)
    expiring_jobs = db.query(Job).filter(
        Job.status == "open",
        Job.deadline > now,
        Job.deadline <= one_week_later
    ).all()
    
    for job in expiring_jobs:
        upcoming_deadlines.append(
            JobDeadlineInfo(
                id=job.id,
                title=job.title,
                company_name=job.company.company_name,
                deadline=job.deadline.isoformat()
            )
        )
        
    return ReadinessResponse(
        readiness_score=min(readiness_score, 100),
        profile_complete=profile_complete,
        resume_uploaded=resume_uploaded,
        skills_count=skills_count,
        missing_skills=missing_skills,
        upcoming_deadlines=upcoming_deadlines,
        interview_readiness=interview_readiness
    )

@router.get("/resume-builder", response_model=ResumeDataResponse)
def get_resume_data(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Mock fallback to in-memory store
    user_id = current_user.id
    if user_id not in MOCK_RESUME_STORE:
        return {
            "id": user_id,
            "summary": "",
            "education": [],
            "experience": [],
            "projects": [],
            "template_style": "classic"
        }
    return MOCK_RESUME_STORE[user_id]

@router.post("/resume-builder", response_model=ResumeDataResponse)
def save_resume_data(
    resume_data: ResumeDataCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id
    MOCK_RESUME_STORE[user_id] = {
        "id": user_id,
        "summary": resume_data.summary or "",
        "education": [item.dict() for item in resume_data.education],
        "experience": [item.dict() for item in resume_data.experience],
        "projects": [item.dict() for item in resume_data.projects],
        "template_style": resume_data.template_style
    }
    return MOCK_RESUME_STORE[user_id]

@router.post("/ats-check", response_model=AtsCheckResult)
def ats_check(
    resume_data: ResumeDataCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    content_text = ""
    if resume_data.summary:
        content_text += resume_data.summary + " "
    for edu in resume_data.education:
        content_text += f"{edu.school} {edu.degree} "
    for exp in resume_data.experience:
        content_text += f"{exp.company} {exp.role} {exp.description} "
    for proj in resume_data.projects:
        content_text += f"{proj.title} {proj.tech_stack} {proj.description} "
        
    words = content_text.split()
    word_count = len(words)
    
    length_score = 0
    length_status = "error"
    length_msg = ""
    
    if word_count < 100:
        length_score = 5
        length_status = "too_short"
        length_msg = f"Your resume is extremely short ({word_count} words). Aim for at least 250 words."
    elif word_count < 250:
        length_score = 15
        length_status = "brief"
        length_msg = f"Your resume is a bit brief ({word_count} words). Add more details about your roles."
    elif word_count <= 650:
        length_score = 25
        length_status = "optimal"
        length_msg = f"Your resume length is optimal ({word_count} words) for a single page."
    else:
        length_score = 10
        length_status = "too_long"
        length_msg = f"Your resume is long ({word_count} words). Reduce it to fit on a single page."
        
    action_verbs = ["developed", "designed", "optimized", "implemented", "led", "built", "created", "analyzed"]
    found_verbs = []
    missing_verbs = []
    
    lowered_content = content_text.lower()
    for verb in action_verbs:
        if verb in lowered_content:
            found_verbs.append(verb)
        else:
            missing_verbs.append(verb)
            
    keyword_score = min(len(found_verbs) * 4, 25)
    keyword_msg = f"Found {len(found_verbs)} of {len(action_verbs)} standard action verbs."
    
    core_skills = ["python", "sql", "dbms", "docker", "javascript", "react", "fastapi", "django", "git"]
    found_skills = []
    missing_skills = []
    
    for skill in core_skills:
        if skill in lowered_content:
            found_skills.append(skill.upper() if skill in ["sql", "dbms", "git"] else skill.title())
        else:
            missing_skills.append(skill.upper() if skill in ["sql", "dbms", "git"] else skill.title())
            
    skills_score = min(len(found_skills) * 5, 30)
    skills_msg = f"Matched {len(found_skills)} core industry skills."
    
    format_score = 20
    formatting_warnings = []
    
    if not resume_data.summary or len(resume_data.summary) < 20:
        format_score -= 5
        formatting_warnings.append("Professional profile summary is missing or too brief.")
    if not resume_data.education:
        format_score -= 5
        formatting_warnings.append("No education listings found. Add your degree details.")
    if not resume_data.experience:
        format_score -= 5
        formatting_warnings.append("No work experience added. Consider adding internships or projects.")
    if not resume_data.projects:
        format_score -= 5
        formatting_warnings.append("No projects listed. Projects show hands-on experience.")
        
    total_score = length_score + keyword_score + skills_score + format_score
    
    return AtsCheckResult(
        score=max(total_score, 0),
        length_check=CheckDetail(score=length_score, status=length_status, message=length_msg),
        keyword_check=CheckDetail(score=keyword_score, status="success" if keyword_score >= 16 else "warning", message=keyword_msg, found=found_verbs, missing=missing_verbs),
        skills_match=CheckDetail(score=skills_score, status="success" if skills_score >= 15 else "warning", message=skills_msg, found=found_skills, missing=missing_skills),
        formatting_warnings=formatting_warnings
    )

@router.get("/recommended-jobs", response_model=List[JobDetailResponse])
def get_recommended_jobs(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.STUDENT.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only student users can access job recommendations."
        )
        
    student_profile = db.query(Student).filter(Student.user_id == current_user.id).first()
    
    # Query all active/open jobs
    open_jobs = db.query(Job).filter(
        Job.status == "open",
        Job.deadline > datetime.utcnow()
    ).all()
    
    if not student_profile:
        return open_jobs[:10]
        
    # Get student skills
    student_skills = []
    if student_profile.skills:
        student_skills = [s.strip().lower() for s in student_profile.skills.split(",") if s.strip()]
        
    scored_jobs = []
    for job in open_jobs:
        # Check CGPA eligibility
        if student_profile.cgpa is not None and job.eligibility_cgpa and student_profile.cgpa < job.eligibility_cgpa:
            continue
            
        score = 0
        job_text = f"{job.title} {job.category or ''} {job.description} {job.requirements or ''}".lower()
        
        # 10 points per matching skill
        for skill in student_skills:
            if skill in job_text:
                score += 10
                
        # 15 bonus points for branch matching category
        if student_profile.branch and job.category and student_profile.branch.lower() in job.category.lower():
            score += 15
            
        scored_jobs.append((job, score))
        
    # Sort by score descending, then deadline ascending
    scored_jobs.sort(key=lambda x: (-x[1], x[0].deadline))
    
    return [item[0] for item in scored_jobs]
