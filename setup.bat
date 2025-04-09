@echo off
echo VocalTranslator Setup and Installation
echo =====================================
echo.

:: Check if Python is installed
python --version > nul 2>&1
if %errorlevel% neq 0 (
    echo Python is not installed or not in PATH.
    echo Please download and install Python 3.9+ from https://www.python.org/downloads/
    echo Then run this script again.
    pause
    exit /b 1
)

:: Check if virtual environment exists
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

:: Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

:: Upgrade pip
echo Upgrading pip...
python -m pip install --upgrade pip

:: Install wheel and setuptools
echo Installing wheel and setuptools...
pip install wheel setuptools

:: Install NumPy first
echo Installing NumPy...
pip install "numpy>=1.20.3,!=1.22.0,!=1.22.1,!=1.22.2"

:: Install PyTorch
echo Installing PyTorch...
pip install torch==2.0.1

:: Install dependencies in stages
echo Installing audio processing libraries...
pip install SpeechRecognition==3.10.0
pip install PyAudio==0.2.13
pip install soundfile>=0.12.0,<0.13.0
pip install librosa>=0.10.0,<0.11.0

echo Installing translation libraries...
pip install googletrans==4.0.0-rc1
pip install transformers>=4.33.0,<4.34.0

echo Installing speech synthesis libraries...
pip install gtts==2.3.2
pip install pyttsx3==2.90
pip install TTS>=0.17.0,<0.18.0

echo Installing web server dependencies...
pip install flask==2.3.3
pip install Werkzeug==2.3.7
pip install flask-socketio>=5.3.0,<5.4.0
pip install python-dotenv==1.0.0

echo Installing utility libraries...
pip install langdetect==1.0.9

:: Creating required directories
if not exist static\audio mkdir static\audio
if not exist voice_models mkdir voice_models

echo.
echo Installation complete!
echo.
echo To start the application, run: python app.py
echo.
pause 