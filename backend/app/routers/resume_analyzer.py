import os
import json
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.student import Student
from app.models.job import Job
from app.models.external_job import ExternalJob
from app.models.resume_analysis import ResumeAnalysis
from app.models.user import User, UserRole
from app.schemas.resume_analysis import ResumeAnalysisResponse, JobMatchRequest, JobMatchResponse
from app.services import ai_service
from app.auth.dependencies import get_current_active_user

router = APIRouter(prefix="/resume-analyzer", tags=["Resume Analyzer"])

async def _get_student_resume_text(student: Student) -> str:
    """
    Helper to download or read local student resume PDF and extract text.
    """
    if not student.resume_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must upload a resume before using the AI Analyzer."
        )
        
    filename = os.path.basename(student.resume_url)
    local_path = os.path.join("uploads", "resumes", filename)
    pdf_bytes = None
    
    # Try local storage first
    if os.path.exists(local_path):
        try:
            with open(local_path, "rb") as f:
                pdf_bytes = f.read()
        except Exception:
            pass
            
    # Try downloading from Supabase bucket
    if not pdf_bytes:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(student.resume_url, timeout=10.0)
                if resp.status_code == 200:
                    pdf_bytes = resp.content
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Could not connect to resume storage: {str(e)}"
            )
            
    if not pdf_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume file could not be read. Please upload a fresh resume file."
        )
        
    try:
        resume_text = ai_service.extract_text_from_pdf(pdf_bytes)
        if not resume_text:
            raise ValueError("Parsed text is empty")
        return resume_text
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to extract text from your resume PDF: {str(e)}"
        )

@router.post("/analyze", response_model=ResumeAnalysisResponse)
async def analyze_student_resume(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.STUDENT.value or not current_user.student_profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only student accounts can analyze resumes."
        )
        
    student = current_user.student_profile
    if not student.resume_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must upload a resume before using the AI Analyzer."
        )
    resume_text = await _get_student_resume_text(student)
    
    # Analyze text using AI Service
    analysis_data = await ai_service.analyze_resume(resume_text)
    
    # Update student profile skills automatically if currently empty
    extracted = analysis_data.get("extracted_skills", [])
    if extracted and not student.skills:
        student.skills = ", ".join(extracted)
        db.add(student)
        
    # Check if analysis already exists
    analysis = db.query(ResumeAnalysis).filter(ResumeAnalysis.student_id == student.id).first()
    if analysis:
        analysis.resume_url = student.resume_url
        analysis.ats_score = analysis_data.get("ats_score", 70)
        analysis.extracted_skills = json.dumps(extracted)
        analysis.missing_skills = json.dumps(analysis_data.get("missing_skills", []))
        analysis.improvement_suggestions = json.dumps(analysis_data.get("improvement_suggestions", []))
        analysis.strengths = json.dumps(analysis_data.get("strengths", []))
        analysis.weaknesses = json.dumps(analysis_data.get("weaknesses", []))
        analysis.created_at = db.query(ResumeAnalysis.created_at).filter(ResumeAnalysis.id == analysis.id).first()[0]
    else:
        analysis = ResumeAnalysis(
            student_id=student.id,
            resume_url=student.resume_url,
            ats_score=analysis_data.get("ats_score", 70),
            extracted_skills=json.dumps(extracted),
            missing_skills=json.dumps(analysis_data.get("missing_skills", [])),
            improvement_suggestions=json.dumps(analysis_data.get("improvement_suggestions", [])),
            strengths=json.dumps(analysis_data.get("strengths", [])),
            weaknesses=json.dumps(analysis_data.get("weaknesses", []))
        )
        
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    
    return analysis

@router.get("/latest", response_model=ResumeAnalysisResponse)
def get_latest_analysis(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.STUDENT.value or not current_user.student_profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only student accounts can fetch resume analysis."
        )
        
    student = current_user.student_profile
    analysis = db.query(ResumeAnalysis).filter(ResumeAnalysis.student_id == student.id).first()
    
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No previous resume analysis found. Please run the AI analyzer first."
        )
        
    # Check if student uploaded a newer resume since last analysis
    if analysis.resume_url != student.resume_url:
        raise HTTPException(
            status_code=status.HTTP_425_TOO_EARLY,
            detail="A new resume has been uploaded since your last analysis. Please run a fresh AI scan."
        )
        
    return analysis

@router.post("/match-job", response_model=JobMatchResponse)
async def match_resume_with_job(
    request: JobMatchRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.STUDENT.value or not current_user.student_profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only student accounts can run resume job matching."
        )
        
    student = current_user.student_profile
    if not student.resume_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must upload a resume before matching against jobs."
        )
    
    # Fetch job description
    job_title = ""
    job_desc = ""
    job_req = ""
    
    if request.job_id:
        job = db.query(Job).filter(Job.id == request.job_id).first()
        if not job:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Internal job listing not found.")
        job_title = job.title
        job_desc = job.description or ""
        job_req = job.requirements or ""
    elif request.external_job_id:
        ext_job = db.query(ExternalJob).filter(ExternalJob.external_id == request.external_job_id).first()
        if not ext_job:
            # Try to search by ID or external_id
            ext_job = db.query(ExternalJob).filter(ExternalJob.id == int(request.external_job_id) if request.external_job_id.isdigit() else False).first()
        if not ext_job:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="External job listing not found.")
        job_title = ext_job.title
        job_desc = ext_job.description or ""
        job_req = ext_job.category or "" # Fallback requirements
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide either an internal job_id or an external_job_id."
        )
        
    # Get resume text on the fly
    resume_text = await _get_student_resume_text(student)
    
    # Run matching service
    matching_result = await ai_service.match_resume_to_job(
        resume_text=resume_text,
        job_title=job_title,
        job_description=job_desc,
        job_requirements=job_req
    )
    
    return matching_result
