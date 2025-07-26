@echo off
setlocal enabledelayedexpansion

REM Colors (not fully supported in cmd.exe, just using echo instead)
set GREEN=[SUCCESS]
set RED=[ERROR]

echo Starting setup for CV Games app...

REM Check if Docker is installed
where docker-compose >nul 2>nul
if errorlevel 1 (
    echo %RED% Docker Compose is not installed. Please install Docker Desktop and try again.
    echo Visit https://www.docker.com/products/docker-desktop/ for instructions.
    exit /b 1
)

REM Check if docker-compose.yml exists
if not exist docker-compose.yml (
    echo %RED% docker-compose.yml not found. Make sure you're in the project folder (dubai-team-1).
    exit /b 1
)

REM Start the containers
echo Starting the app and database...
docker-compose up -d
if errorlevel 1 (
    echo %RED% Failed to start the app. Check if Docker is running or try again.
    exit /b 1
)

REM Wait for database to be ready
echo Waiting for the database to be ready...
:wait_for_db
docker-compose exec db pg_isready -U cv_games_user -d cv_games_db >nul 2>nul
if errorlevel 1 (
    timeout /t 1 >nul
    goto wait_for_db
)

echo %GREEN% Database is ready!

REM Run migrations
echo Setting up the database structure...
docker-compose exec backend python manage.py migrate
if errorlevel 1 (
    echo %RED% Failed to set up database structure. Please contact the support team.
    exit /b 1
)
echo %GREEN% Database structure set up successfully!

REM Copy init_data.sql into the container
echo Adding initial game data...
docker cp ./database/init_data.sql dubai-team-1-db-1:/tmp/init_data.sql
if errorlevel 1 (
    echo %RED% Failed to copy initial data file. Check if database\init_data.sql exists.
    exit /b 1
)

docker-compose exec db psql -U cv_games_user -d cv_games_db -f /tmp/init_data.sql
if errorlevel 1 (
    echo %RED% Failed to add initial game data. Please contact the support team.
    exit /b 1
)

echo %GREEN% Initial game data added successfully!

echo %GREEN% Setup complete! You can now access the app at http://localhost:8000/
echo To stop the app, use Docker Desktop or run: docker-compose down
echo To restart it later, run: docker-compose up -d
