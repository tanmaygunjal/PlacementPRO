FROM python:3.11-slim

WORKDIR /workspace

# Install system dependencies (e.g. gcc for compiling PostgreSQL drivers)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/app/ ./app/

# Create uploads directory structure (fallback local storage path)
RUN mkdir -p uploads/resumes

# Default fallback port for Google Cloud Run is 8080
EXPOSE 8080

# Run FastAPI app using uvicorn shell wrapping to read $PORT dynamically
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
