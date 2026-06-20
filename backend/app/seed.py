import sys
import os
from datetime import datetime, timedelta

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, Base, engine
from app.models import User, Student, Company, Job, Application
from app.auth.security import get_password_hash

def seed_db():
    db = SessionLocal()
    try:
        # Clear existing data to allow re-seeding cleanly
        db.query(Application).delete()
        db.query(Job).delete()
        db.query(Company).delete()
        db.query(Student).delete()
        db.query(User).delete()
        db.commit()
        
        print("Existing database records cleared.")

        # 1. Create Users
        password_hash = get_password_hash("password123")
        
        admin = User(
            name="Platform Admin",
            email="admin@placementpro.com",
            password_hash=password_hash,
            role="admin",
            is_verified=True
        )
        
        recruiter_google = User(
            name="Google Recruiter",
            email="google_jobs@google.com",
            password_hash=password_hash,
            role="recruiter",
            is_verified=True
        )
        
        recruiter_meta = User(
            name="Meta Careers",
            email="meta_jobs@meta.com",
            password_hash=password_hash,
            role="recruiter",
            is_verified=True
        )
        
        student_tanmay = User(
            name="Tanmay Gunjal",
            email="tanmay@gmail.com",
            password_hash=password_hash,
            role="student",
            is_verified=True
        )
        
        student_alice = User(
            name="Alice Smith",
            email="alice@student.com",
            password_hash=password_hash,
            role="student",
            is_verified=True
        )
        
        student_bob = User(
            name="Bob Johnson",
            email="bob@student.com",
            password_hash=password_hash,
            role="student",
            is_verified=True
        )

        db.add_all([admin, recruiter_google, recruiter_meta, student_tanmay, student_alice, student_bob])
        db.commit()
        
        # Reload users to get IDs
        db.refresh(student_tanmay)
        db.refresh(student_alice)
        db.refresh(student_bob)
        db.refresh(recruiter_google)
        db.refresh(recruiter_meta)

        # 2. Create Students
        student_tanmay_profile = Student(
            user_id=student_tanmay.id,
            college="MIT ADT University",
            branch="Computer Science & Engineering",
            graduation_year=2027,
            cgpa=9.23,
            skills="Python, SQL, Docker, React, FastAPI",
            resume_url="https://lejkebtkdhnhicdjolxb.supabase.co/storage/v1/object/public/resumes/resume_tanmay.pdf"
        )
        
        student_alice_profile = Student(
            user_id=student_alice.id,
            college="MIT ADT University",
            branch="Information Technology",
            graduation_year=2026,
            cgpa=8.85,
            skills="JavaScript, React, Node.js, Git",
            resume_url="https://lejkebtkdhnhicdjolxb.supabase.co/storage/v1/object/public/resumes/resume_alice.pdf"
        )
        
        student_bob_profile = Student(
            user_id=student_bob.id,
            college="MIT ADT University",
            branch="Electronics & Telecommunication",
            graduation_year=2026,
            cgpa=7.42,
            skills="C++, Python, Embedded Systems",
            resume_url=None
        )

        db.add_all([student_tanmay_profile, student_alice_profile, student_bob_profile])
        db.commit()
        
        # Reload student profiles to get their IDs
        db.refresh(student_tanmay_profile)
        db.refresh(student_alice_profile)
        db.refresh(student_bob_profile)

        # 3. Create Companies
        company_google = Company(
            user_id=recruiter_google.id,
            company_name="Google LLC",
            website="https://careers.google.com",
            industry="Software & Internet",
            logo_url="https://lejkebtkdhnhicdjolxb.supabase.co/storage/v1/object/public/logos/google.png",
            description="Google LLC is an American multinational technology company that specializes in Internet-related services and products.",
            is_approved=True
        )
        
        company_meta = Company(
            user_id=recruiter_meta.id,
            company_name="Meta Platforms Inc.",
            website="https://meta.com/careers",
            industry="Social Media & Technology",
            logo_url="https://lejkebtkdhnhicdjolxb.supabase.co/storage/v1/object/public/logos/meta.png",
            description="Meta builds technologies that help people connect, find communities, and grow businesses.",
            is_approved=True
        )

        db.add_all([company_google, company_meta])
        db.commit()
        
        # Reload companies to get IDs
        db.refresh(company_google)
        db.refresh(company_meta)

        # 4. Create Jobs
        job_swe = Job(
            company_id=company_google.id,
            title="Software Engineer Intern",
            category="Software Development",
            location="Bangalore, India (Hybrid)",
            salary="18 LPA",
            ctc=18.0,
            eligibility_cgpa=8.0,
            experience="Freshers / Interns",
            description="We are looking for brilliant computer science students to join our engineering teams for Summer 2026 internships.",
            requirements="Proficiency in Java, C++ or Python. Strong foundation in Data Structures and Algorithms. Minimum CGPA: 8.0.",
            deadline=datetime.utcnow() + timedelta(days=15),
            status="open"
        )
        
        job_cloud = Job(
            company_id=company_google.id,
            title="Associate Cloud Engineer",
            category="Cloud & DevOps",
            location="Pune, India",
            salary="22 LPA",
            ctc=22.0,
            eligibility_cgpa=7.5,
            experience="0-2 Years",
            description="Work with the Google Cloud Platform team assisting enterprises with deployment architectures and operations automation.",
            requirements="Familiarity with GCP/AWS, Linux administration, SQL, Python/Bash scripting. Minimum CGPA: 7.5.",
            deadline=datetime.utcnow() + timedelta(days=20),
            status="open"
        )
        
        job_frontend = Job(
            company_id=company_meta.id,
            title="Frontend Developer (React)",
            category="Frontend Engineering",
            location="Remote, India",
            salary="15 LPA",
            ctc=15.0,
            eligibility_cgpa=7.0,
            experience="Freshers",
            description="Develop user-facing features using React.js and help design modular, scalable frontend systems.",
            requirements="Advanced knowledge of HTML, CSS, React, and JavaScript. Understanding of state management. Minimum CGPA: 7.0.",
            deadline=datetime.utcnow() + timedelta(days=5),
            status="open"
        )

        db.add_all([job_swe, job_cloud, job_frontend])
        db.commit()
        
        # Reload jobs to get IDs
        db.refresh(job_swe)
        db.refresh(job_cloud)
        db.refresh(job_frontend)

        # 5. Create Applications
        app_1 = Application(
            student_id=student_tanmay_profile.id,
            job_id=job_swe.id,
            resume_url=student_tanmay_profile.resume_url,
            status="applied",
            applied_at=datetime.utcnow() - timedelta(days=2)
        )
        
        app_2 = Application(
            student_id=student_tanmay_profile.id,
            job_id=job_cloud.id,
            resume_url=student_tanmay_profile.resume_url,
            status="shortlisted",
            applied_at=datetime.utcnow() - timedelta(days=1)
        )
        
        app_3 = Application(
            student_id=student_alice_profile.id,
            job_id=job_frontend.id,
            resume_url=student_alice_profile.resume_url,
            status="interviewing",
            applied_at=datetime.utcnow() - timedelta(hours=12)
        )

        db.add_all([app_1, app_2, app_3])
        db.commit()

        print("Database seeded successfully with test records!")

    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
