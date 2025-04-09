#!/bin/bash

# Update system packages
echo "Updating system packages..."
apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    libsndfile1 \
    portaudio19-dev \
    python3-dev \
    git

# Create virtual environment
echo "Creating virtual environment..."
python -m venv venv
source venv/bin/activate

# Install base dependencies
echo "Installing base dependencies..."
pip install --upgrade pip
pip install wheel setuptools

# Install numpy first with specific version
echo "Installing NumPy..."
pip install "numpy>=1.20.3,!=1.22.0,!=1.22.1,!=1.22.2"

# Install PyTorch
echo "Installing PyTorch..."
pip install torch==2.0.1

# Install other dependencies in stages
echo "Installing audio processing libraries..."
pip install SpeechRecognition==3.10.0
pip install PyAudio==0.2.13
pip install soundfile>=0.12.0,<0.13.0
pip install librosa>=0.10.0,<0.11.0

echo "Installing translation libraries..."
pip install googletrans==4.0.0-rc1
pip install transformers>=4.33.0,<4.34.0

echo "Installing speech synthesis libraries..."
pip install gtts==2.3.2
pip install pyttsx3==2.90
pip install TTS>=0.17.0,<0.18.0

echo "Installing web server dependencies..."
pip install flask==2.3.3
pip install Werkzeug==2.3.7
pip install flask-socketio>=5.3.0,<5.4.0
pip install python-dotenv==1.0.0
pip install gunicorn==21.2.0

echo "Installing utility libraries..."
pip install langdetect==1.0.9

echo "Installation complete!" 