FROM python:3.10-slim

WORKDIR /workspace

# Install system dependencies (e.g. gcc for compiling some packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application and frontend
COPY backend/app/ ./app/
COPY frontend/ ./frontend/



# Create uploads directory structure
RUN mkdir -p uploads/resumes

EXPOSE 8000

# Run FastAPI app using uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
