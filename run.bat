@echo off
echo Starting VocalTranslator...
echo.

:: Check if virtual environment exists
if not exist venv (
    echo Virtual environment not found.
    echo Please run setup.bat first to set up the application.
    pause
    exit /b 1
)

:: Activate virtual environment
call venv\Scripts\activate.bat

:: Start the application
python app.py 