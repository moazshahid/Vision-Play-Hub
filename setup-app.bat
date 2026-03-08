batch
@echo off
setlocal enabledelayedexpansion

REM Colors for output (basic echo for CMD compatibility)
set "GREEN=[SUCCESS]"
set "RED=[ERROR]"

echo Starting setup for CV Games app...

REM Check if Docker is installed and running
echo Checking for Docker...
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo %RED% Docker is not installed. Please install Docker Desktop from https://www.docker.com/products/docker-desktop/ and try again.
    exit /b 1
)

REM Check if Docker Desktop is running
docker info >nul 2>nul
if %errorlevel% neq 0 (
    echo %RED% Docker Desktop is not running. Please start Docker Desktop and try again.
    exit /b 1
)

REM Check if docker-compose.yml exists in the current directory
if not exist "docker-compose.yml" (
    echo %RED% docker-compose.yml not found. Ensure you are in the 'dubai-team-1' project directory and the file exists.
    exit /b 1
)

REM Start the containers
echo Starting the app and database containers...
docker-compose up -d
if %errorlevel% neq 0 (
    echo %RED% Failed to start containers. Ensure Docker Desktop is running and docker-compose.yml is valid.
    exit /b 1
)

REM Wait for database to be ready
echo Waiting for the database to be ready...
:wait_for_db
docker-compose exec -T db pg_isready -U cv_games_user -d cv_games_db >nul 2>nul
if %errorlevel% neq 0 (
    timeout /t 2 >nul
    goto wait_for_db
)
echo %GREEN% Database is ready!

REM Run Django migrations
echo Setting up the database structure...
docker-compose exec -T backend python manage.py migrate
if %errorlevel% neq 0 (
    echo %RED% Failed to apply database migrations. Check backend logs or contact the support team.
    exit /b 1
)
echo %GREEN% Database structure set up successfully!

REM Check if init_data.sql exists
if not exist "database\init_data.sql" (
    echo %RED% database\init_data.sql not found. Ensure the file exists in the 'database' subdirectory.
    exit /b 1
)

REM Copy init_data.sql into the container
echo Adding initial game data...
docker cp "database\init_data.sql" vision-play-hub-db-1:/tmp/init_data.sql
if %errorlevel% neq 0 (
    echo %RED% Failed to copy initial data file. Check if database\init_data.sql exists and Docker is running.
    exit /b 1
)

REM Execute init_data.sql
docker-compose exec -T db psql -U cv_games_user -d cv_games_db -f /tmp/init_data.sql
if %errorlevel% neq 0 (
    echo %RED% Failed to load initial game data. Check the init_data.sql file or contact the support team.
    exit /b 1
)
echo %GREEN% Initial game data added successfully!

echo %GREEN% Setup complete! Access the app at http://localhost:8000/
echo To stop the app, use Docker Desktop or run: docker-compose down
echo To restart later, run: docker-compose up -d
