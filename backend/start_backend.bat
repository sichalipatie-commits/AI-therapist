@echo off
echo ============================================
echo  MindEase Backend — FastAPI + AI Models
echo ============================================
echo.

cd /d "%~dp0"

REM Create venv if it doesn't exist
if not exist venv (
    echo [1/3] Creating Python virtual environment...
    python -m venv venv
)

REM Activate venv
echo [2/3] Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo [3/3] Installing dependencies...
pip install -r requirements.txt --quiet

echo.
echo Starting FastAPI server on http://127.0.0.1:8000 ...
echo (Loading models may take 30-60 seconds on first run)
echo.

uvicorn main:app --host 127.0.0.1 --port 8000 --reload

pause
