@echo off
cd /d "%~dp0"
if exist ".venv\Scripts\python.exe" (
  ".venv\Scripts\python.exe" app.py
) else (
  python app.py
)
if errorlevel 1 (
  echo Install dependencies first: python -m pip install -r requirements.txt
  pause
)
