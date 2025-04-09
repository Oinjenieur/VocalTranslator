FROM python:3.9-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# Set working directory
WORKDIR /app

# Copy requirements and installation scripts
COPY requirements.txt install.sh ./
RUN chmod +x install.sh

# Install system dependencies and Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    libsndfile1 \
    portaudio19-dev \
    python3-dev \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies with specific version constraints
RUN pip install --no-cache-dir -r requirements.txt

# Download TTS models
RUN python -c "from TTS.api import TTS; TTS('tts_models/en/ljspeech/tacotron2-DDC', progress_bar=True)"

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p static/audio voice_models

# Expose port
EXPOSE 5000

# Run application
CMD ["python", "app.py"]