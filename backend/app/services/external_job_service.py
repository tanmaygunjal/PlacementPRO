import httpx
import asyncio
import logging
from sqlalchemy.orm import Session
from datetime import datetime
import os

from app.models.external_job import ExternalJob

# Configure logger
logger = logging.getLogger("external_jobs_scraper")

def categorize_job(title: str, description: str = "") -> str:
    combined_text = f"{title} {description}".lower()
    
    # Matching rules
    if any(keyword in combined_text for keyword in ["react", "vue", "angular", "frontend", "front-end", "ui", "ux", "designer"]):
        return "Frontend"
    elif any(keyword in combined_text for keyword in ["backend", "back-end", "django", "fastapi", "spring boot", "node.js", "express", "golang", "go developer", "java developer", "c#", ".net"]):
        return "Backend"
    elif any(keyword in combined_text for keyword in ["fullstack", "full stack", "full-stack", "mern", "mean"]):
        return "Fullstack"
    elif any(keyword in combined_text for keyword in ["machine learning", "ml", "data scientist", "data science", "deep learning", "ai", "artificial intelligence", "data analyst", "data engineer"]):
        return "Data Science & AI"
    elif any(keyword in combined_text for keyword in ["mobile", "android", "ios", "flutter", "react native", "swift", "kotlin"]):
        return "Mobile Development"
    elif any(keyword in combined_text for keyword in ["devops", "cloud", "aws", "azure", "gcp", "docker", "kubernetes", "sre", "site reliability", "infrastructure"]):
        return "DevOps & Cloud"
    elif any(keyword in combined_text for keyword in ["security", "cybersecurity", "penetration", "infosec"]):
        return "Cybersecurity"
    elif any(keyword in combined_text for keyword in ["qa", "quality assurance", "test", "testing", "automation engineer"]):
        return "QA & Testing"
    else:
        return "Software Engineering"

async def fetch_arbeitnow() -> list:
    url = "https://arbeitnow.com/api/job-board-api"
    jobs = []
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=10.0)
            if resp.status_code == 200:
                data = resp.json().get("data", [])
                for item in data[:20]:
                    slug = item.get("slug")
                    jobs.append({
                        "title": item.get("title"),
                        "company_name": item.get("company_name"),
                        "location": item.get("location"),
                        "salary": "Not specified",
                        "description": item.get("description"),
                        "apply_url": item.get("url"),
                        "source_api": "Arbeitnow",
                        "external_id": f"arbeitnow_{slug}"
                    })
    except Exception as e:
        logger.warning(f"Arbeitnow fetch failed: {e}. Generating mocks.")
        # Fallback mocks
        jobs = [
            {
                "title": "React Frontend Engineer",
                "company_name": "TechCorp Europe",
                "location": "Berlin, Germany (Remote)",
                "salary": "€60k - €70k",
                "description": "We are seeking a React specialist to build modern web interfaces.",
                "apply_url": "https://arbeitnow.com/jobs/react-frontend-techcorp",
                "source_api": "Arbeitnow",
                "external_id": "arbeitnow_mock_1"
            },
            {
                "title": "Django Python Developer",
                "company_name": "GreenWeb Berlin",
                "location": "Munich, Germany (Hybrid)",
                "salary": "€65k - €75k",
                "description": "Looking for a backend django dev for sustainable coding projects.",
                "apply_url": "https://arbeitnow.com/jobs/django-greenweb",
                "source_api": "Arbeitnow",
                "external_id": "arbeitnow_mock_2"
            }
        ]
    return jobs

async def fetch_adzuna() -> list:
    app_id = os.getenv("ADZUNA_APP_ID")
    app_key = os.getenv("ADZUNA_APP_KEY")
    
    # If no keys, fallback to mocks
    if not app_id or not app_key or app_id == "YOUR_ADZUNA_APP_ID":
        logger.info("Adzuna API keys not set. Generating mock results.")
        return [
            {
                "title": "Fullstack Cloud Developer",
                "company_name": "Adzuna Tech Ventures",
                "location": "New York, USA",
                "salary": "$90,000 - $110,000",
                "description": "Build full stack applications using AWS, node, and react in a fast-paced team.",
                "apply_url": "https://adzuna.com/jobs/fullstack-cloud-tech",
                "source_api": "Adzuna",
                "external_id": "adzuna_mock_1"
            },
            {
                "title": "DevOps Architect",
                "company_name": "Global Scale Inc",
                "location": "London, UK",
                "salary": "£80,050",
                "description": "Maintain pipelines, cloud instances, and docker configuration.",
                "apply_url": "https://adzuna.com/jobs/devops-architect-global",
                "source_api": "Adzuna",
                "external_id": "adzuna_mock_2"
            }
        ]
        
    url = f"https://api.adzuna.com/v1/api/jobs/us/search/1?app_id={app_id}&app_key={app_key}&results_per_page=15&what=developer"
    jobs = []
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=10.0)
            if resp.status_code == 200:
                results = resp.json().get("results", [])
                for item in results:
                    job_id = item.get("id")
                    company = item.get("company", {}).get("display_name", "Unknown Company")
                    location = item.get("location", {}).get("display_name", "Remote")
                    sal_min = item.get("salary_min")
                    sal_max = item.get("salary_max")
                    sal_str = f"${sal_min:,} - ${sal_max:,}" if sal_min and sal_max else "Not specified"
                    
                    jobs.append({
                        "title": item.get("title"),
                        "company_name": company,
                        "location": location,
                        "salary": sal_str,
                        "description": item.get("description"),
                        "apply_url": item.get("redirect_url"),
                        "source_api": "Adzuna",
                        "external_id": f"adzuna_{job_id}"
                    })
    except Exception as e:
        logger.error(f"Adzuna actual API call failed: {e}")
    return jobs

async def fetch_jsearch() -> list:
    rapid_key = os.getenv("RAPIDAPI_KEY")
    
    if not rapid_key or rapid_key == "YOUR_RAPIDAPI_KEY":
        logger.info("JSearch RapidAPI Key not set. Generating mock results.")
        return [
            {
                "title": "Machine Learning Engineer",
                "company_name": "AI Labs JSearch",
                "location": "San Francisco, CA",
                "salary": "$140,000 - $160,000",
                "description": "Design and build NLP model interfaces and train neural systems.",
                "apply_url": "https://jsearch.jobs/ml-engineer-ai-labs",
                "source_api": "JSearch",
                "external_id": "jsearch_mock_1"
            },
            {
                "title": "Android App Developer",
                "company_name": "MobileFirst Solutions",
                "location": "Chicago, IL (Remote)",
                "salary": "$115,000",
                "description": "Develop high-performance native Android apps using Kotlin and Jetpack Compose.",
                "apply_url": "https://jsearch.jobs/android-dev-mobilefirst",
                "source_api": "JSearch",
                "external_id": "jsearch_mock_2"
            }
        ]
        
    url = "https://jsearch.p.rapidapi.com/search"
    headers = {
        "X-RapidAPI-Key": rapid_key,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
    }
    params = {
        "query": "Software Engineer",
        "num_pages": "1"
    }
    jobs = []
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers, params=params, timeout=10.0)
            if resp.status_code == 200:
                data = resp.json().get("data", [])
                for item in data:
                    job_id = item.get("job_id")
                    city = item.get("job_city")
                    country = item.get("job_country")
                    loc = f"{city}, {country}" if city and country else "Remote"
                    sal = item.get("job_min_salary")
                    sal_str = f"${sal:,}" if sal else "Not specified"
                    
                    jobs.append({
                        "title": item.get("job_title"),
                        "company_name": item.get("employer_name"),
                        "location": loc,
                        "salary": sal_str,
                        "description": item.get("job_description"),
                        "apply_url": item.get("job_apply_link"),
                        "source_api": "JSearch",
                        "external_id": f"jsearch_{job_id}"
                    })
    except Exception as e:
        logger.error(f"JSearch actual API call failed: {e}")
    return jobs

async def fetch_and_store_jobs(db: Session) -> int:
    logger.info("Starting external jobs fetch task...")
    
    # Run scrapers in parallel
    results = await asyncio.gather(
        fetch_arbeitnow(),
        fetch_adzuna(),
        fetch_jsearch(),
        return_exceptions=True
    )
    
    all_jobs = []
    for res in results:
        if isinstance(res, list):
            all_jobs.extend(res)
            
    # Deduplicate and save
    new_jobs_count = 0
    for job_data in all_jobs:
        ext_id = job_data["external_id"]
        
        # Check if already stored
        exists = db.query(ExternalJob).filter(ExternalJob.external_id == ext_id).first()
        if exists:
            continue
            
        category = categorize_job(job_data["title"], job_data["description"] or "")
        
        db_job = ExternalJob(
            title=job_data["title"],
            company_name=job_data["company_name"],
            location=job_data["location"],
            salary=job_data["salary"],
            description=job_data["description"],
            category=category,
            apply_url=job_data["apply_url"],
            source_api=job_data["source_api"],
            external_id=ext_id
        )
        db.add(db_job)
        new_jobs_count += 1
        
    db.commit()
    logger.info(f"Finished fetch. Added {new_jobs_count} new external jobs.")
    return new_jobs_count

async def start_background_scraping():
    # Helper loop to fetch every 12 hours
    logger.info("Initializing background job scraping loop scheduler...")
    while True:
        # Fetch DB session manually
        from app.database import SessionLocal
        db = SessionLocal()
        try:
            await fetch_and_store_jobs(db)
        except Exception as e:
            logger.error(f"Background scraping loop error: {e}")
        finally:
            db.close()
            
        # Wait 12 hours (12 * 3600 seconds)
        await asyncio.sleep(12 * 3600)
