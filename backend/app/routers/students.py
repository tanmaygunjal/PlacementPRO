import os
import json
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.user import User, UserRole, StudentProfile
from app.models.resume import StudentResume
from app.models.job import Job, Application, ApplicationStatus
from app.schemas.user import StudentProfileCreate, StudentProfileResponse, StudentProfileBase
from app.schemas.resume import (
    ResumeDataCreate, 
    ResumeDataResponse, 
    AtsCheckResult, 
    ReadinessResponse, 
    JobDeadlineInfo, 
    CheckDetail
)
from app.services import user_service
from app.auth.dependencies import get_current_active_user, RoleChecker

router = APIRouter(prefix="/students", tags=["Students"])

UPLOAD_DIR = "/tmp/uploads"

@router.post("/profile", response_model=StudentProfileResponse, status_code=status.HTTP_201_CREATED)
def create_profile(
    profile: StudentProfileCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only users with role STUDENT can create a student profile"
        )
    return user_service.create_student_profile(db, current_user.id, profile)

@router.put("/profile", response_model=StudentProfileResponse)
def update_profile(
    profile: StudentProfileBase,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only users with role STUDENT can update a student profile"
        )
    return user_service.update_student_profile(db, current_user.id, profile)

@router.get("/profile", response_model=StudentProfileResponse)
def get_profile(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile = db.query(StudentProfile).filter(StudentProfile.id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found. Please create one."
        )
    return profile

@router.post("/resume", response_model=StudentProfileResponse)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only students can upload resumes"
        )
        
    # Validate file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in [".pdf", ".doc", ".docx"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF, DOC, or DOCX files are allowed."
        )
        
    # Create safe filename: resume_{student_id}{ext}
    filename = f"resume_{current_user.id}{file_ext}"
    
    try:
        contents = await file.read()
        from app.database import supabase
        if supabase:
            try:
                supabase.storage.from_("resumes").upload(path=filename, file=contents, file_options={"content-type": file.content_type})
            except Exception as upload_err:
                # If upload fails, try updating/overwriting the file
                try:
                    supabase.storage.from_("resumes").update(path=filename, file=contents, file_options={"content-type": file.content_type})
                except Exception as update_err:
                    raise Exception(f"Upload failed: {str(upload_err)} | Update fallback failed: {str(update_err)}")
        else:
            # Fallback to local storage (e.g. during tests or if Supabase keys are placeholders)
            os.makedirs(UPLOAD_DIR, exist_ok=True)
            filepath = os.path.join(UPLOAD_DIR, filename)
            with open(filepath, "wb") as f:
                f.write(contents)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not save or upload resume file: {str(e)}"
        )
        
    return user_service.update_resume_filename(db, current_user.id, filename)

@router.get("/{student_id}/resume")
def download_resume(
    student_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Check permissions: Admin/Recruiter can download any resume, Student can only download their own
    if current_user.role == UserRole.STUDENT and current_user.id != student_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view other students' resumes"
        )
        
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not profile or not profile.resume_filename:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found for this student"
        )
        
    try:
        from app.database import supabase
        if supabase:
            file_bytes = supabase.storage.from_("resumes").download(profile.resume_filename)
        else:
            # Fallback to local storage
            filepath = os.path.join(UPLOAD_DIR, profile.resume_filename)
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
    media_type, _ = mimetypes.guess_type(profile.resume_filename)
    if not media_type:
        media_type = "application/octet-stream"
        
    return Response(
        content=file_bytes,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{profile.full_name}_resume{os.path.splitext(profile.resume_filename)[1]}"'
        }
    )

@router.get("", response_model=List[StudentProfileResponse])
def get_all_students(
    min_cgpa: Optional[float] = None,
    branch: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.RECRUITER])),
    db: Session = Depends(get_db)
):
    return user_service.list_students(db, min_cgpa=min_cgpa, branch=branch, search=search)


@router.get("/readiness", response_model=ReadinessResponse)
def get_readiness(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only student accounts have placement readiness details"
        )
        
    profile = db.query(StudentProfile).filter(StudentProfile.id == current_user.id).first()
    
    # Defaults
    readiness_score = 0
    profile_complete = False
    resume_uploaded = False
    skills_count = 0
    missing_skills = []
    upcoming_deadlines = []
    interview_readiness = "Low"
    
    parsed_skills = []
    if profile:
        profile_complete = True
        readiness_score += 20
        
        # Resume status check
        if profile.resume_filename:
            resume_uploaded = True
            readiness_score += 30
            
        # Skills check
        if profile.skills:
            parsed_skills = [s.strip().lower() for s in profile.skills.split(",") if s.strip()]
            skills_count = len(parsed_skills)
            readiness_score += min(skills_count * 5, 25)
            
        # CGPA check
        if profile.cgpa >= 8.0:
            readiness_score += 10
        elif profile.cgpa >= 7.0:
            readiness_score += 5
            
        # Interview readiness
        student_apps = db.query(Application).filter(Application.student_id == current_user.id).all()
        if student_apps:
            readiness_score += 15
            statuses = [app.status for app in student_apps]
            if ApplicationStatus.OFFERED in statuses or ApplicationStatus.INTERVIEWING in statuses:
                interview_readiness = "High"
            elif ApplicationStatus.SHORTLISTED in statuses or ApplicationStatus.APPLIED in statuses:
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
        Job.is_active == True,
        Job.deadline > now,
        Job.deadline <= one_week_later
    ).all()
    
    for job in expiring_jobs:
        upcoming_deadlines.append(
            JobDeadlineInfo(
                id=job.id,
                title=job.title,
                company_name=job.company.name,
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
    db_resume = db.query(StudentResume).filter(StudentResume.id == current_user.id).first()
    if not db_resume:
        return {
            "id": current_user.id,
            "summary": "",
            "education": [],
            "experience": [],
            "projects": [],
            "template_style": "classic"
        }
        
    return {
        "id": db_resume.id,
        "summary": db_resume.summary or "",
        "education": json.loads(db_resume.education) if db_resume.education else [],
        "experience": json.loads(db_resume.experience) if db_resume.experience else [],
        "projects": json.loads(db_resume.projects) if db_resume.projects else [],
        "template_style": db_resume.template_style
    }


@router.post("/resume-builder", response_model=ResumeDataResponse)
def save_resume_data(
    resume_data: ResumeDataCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    db_resume = db.query(StudentResume).filter(StudentResume.id == current_user.id).first()
    
    serialized_edu = json.dumps([item.dict() for item in resume_data.education])
    serialized_exp = json.dumps([item.dict() for item in resume_data.experience])
    serialized_proj = json.dumps([item.dict() for item in resume_data.projects])
    
    if not db_resume:
        db_resume = StudentResume(
            id=current_user.id,
            summary=resume_data.summary,
            education=serialized_edu,
            experience=serialized_exp,
            projects=serialized_proj,
            template_style=resume_data.template_style
        )
        db.add(db_resume)
    else:
        db_resume.summary = resume_data.summary
        db_resume.education = serialized_edu
        db_resume.experience = serialized_exp
        db_resume.projects = serialized_proj
        db_resume.template_style = resume_data.template_style
        
    db.commit()
    db.refresh(db_resume)
    
    return {
        "id": db_resume.id,
        "summary": db_resume.summary or "",
        "education": json.loads(db_resume.education) if db_resume.education else [],
        "experience": json.loads(db_resume.experience) if db_resume.experience else [],
        "projects": json.loads(db_resume.projects) if db_resume.projects else [],
        "template_style": db_resume.template_style
    }


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

