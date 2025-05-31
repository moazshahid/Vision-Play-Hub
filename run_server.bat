@echo off
echo ============================
echo Starting VisionPlay Hub...
echo ============================

:: Step 1: Navigate to backend directory and set up virtual environment
cd backend
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)
call venv\Scripts\activate
if errorlevel 1 (
    echo Failed to activate virtual environment. Check Python installation.
    exit /b 1
)

:: Step 2: Install Python dependencies
echo Installing Python dependencies...
pip install -r ..\requirements.txt
if errorlevel 1 (
    echo Failed to install Python dependencies. Check requirements.txt.
    exit /b 1
)

:: Step 3: Run Django migrations
echo Running Django migrations...
call python manage.py makemigrations
if errorlevel 1 (
    echo Migrations generation failed. Check for errors above.
    exit /b 1
)
call python manage.py migrate
if errorlevel 1 (
    echo Migrations application failed. Check for errors above.
    exit /b 1
)

:: Step 4: Navigate to frontend directory, clean node_modules, and install dependencies
cd ..
cd frontend
if exist node_modules (
    echo Cleaning old node_modules directory...
    rmdir /s /q node_modules
)
echo Installing Node.js dependencies...
call npm install
if errorlevel 1 (
    echo Failed to install Node.js dependencies. Check package.json.
    exit /b 1
)

:: Step 5: Clean old build directory
if exist build (
    echo Cleaning old build directory...
    rmdir /s /q build
)

:: Step 6: Build the React frontend
echo Building React frontend...
call npm run build
if errorlevel 1 (
    echo Frontend build failed. Check for errors above.
    exit /b 1
)

:: Step 7: Copy the compiled main.*.js to backend static folder
cd ..
for %%f in (frontend\build\static\js\main.*.js) do (
    echo Copying %%f to backend/static/js/app.js ...
    copy /Y "%%f" "backend\static\js\app.js"
)

:: Step 8: Copy the compiled main.*.css to backend static folder
for %%f in (frontend\build\static\css\main.*.css) do (
    echo Copying %%f to backend/static/css/app.css ...
    mkdir backend\static\css 2>nul
    copy /Y "%%f" "backend\static\css\app.css"
)

:: Step 9: Collect Django static files
cd backend
call python manage.py collectstatic --noinput
if errorlevel 1 (
    echo Static file collection failed. Check for errors above.
    exit /b 1
)

:: Step 10: Launch server and browser
start "" http://127.0.0.1:8000
call python manage.py runserver