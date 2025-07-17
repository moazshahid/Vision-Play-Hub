@echo off
REM Setup script for PostgreSQL database (cv_games_db) on Windows

REM Check if psql is available
where psql >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo PostgreSQL not found. Install it from https://www.postgresql.org/download/windows/.
    exit /b 1
)

REM Define .pgpass file location
set PGPASS_FILE=%USERPROFILE%\.pgpass

REM Set up .pgpass file
if not exist "%PGPASS_FILE%" (
    type nul > "%PGPASS_FILE%"
    icacls "%PGPASS_FILE%" /inheritance:r >nul
    icacls "%PGPASS_FILE%" /grant:r "%USERNAME%:F" >nul
)
findstr "localhost:5432:*:postgres:" "%PGPASS_FILE%" >nul
if %ERRORLEVEL% neq 0 (
    set /p POSTGRES_PASS=Enter PostgreSQL 'postgres' user password: 
    echo localhost:5432:*:postgres:%POSTGRES_PASS% >> "%PGPASS_FILE%"
)
findstr "localhost:5432:cv_games_db:cv_games_user:cv_games_pass" "%PGPASS_FILE%" >nul
if %ERRORLEVEL% neq 0 (
    echo localhost:5432:cv_games_db:cv_games_user:cv_games_pass >> "%PGPASS_FILE%"
)

REM Check if cv_games_db database exists
psql -U postgres -t -c "SELECT 1 FROM pg_database WHERE datname = 'cv_games_db';" | findstr "1" >nul
if %ERRORLEVEL% equ 0 (
    echo Database cv_games_db already exists, skipping creation.
) else (
    REM Create database
    psql -U postgres -c "CREATE DATABASE cv_games_db;" || (
        echo Failed to create database. Ensure 'postgres' user has access and the service is running.
        exit /b 1
    )
)

REM Check if cv_games_user exists, create if not
psql -U postgres -t -c "SELECT 1 FROM pg_roles WHERE rolname = 'cv_games_user';" | findstr "1" >nul
if %ERRORLEVEL% equ 0 (
    echo User cv_games_user already exists, skipping creation.
) else (
    psql -U postgres -c "CREATE USER cv_games_user WITH PASSWORD 'cv_games_pass';" || (
        echo Failed to create user.
        exit /b 1
    )
)

REM Configure user settings
psql -U postgres -c "ALTER ROLE cv_games_user SET client_encoding TO 'utf8';" || (
    echo Failed to set client_encoding.
    exit /b 1
)
psql -U postgres -c "ALTER ROLE cv_games_user SET default_transaction_isolation TO 'read committed';" || (
    echo Failed to set transaction_isolation.
    exit /b 1
)
psql -U postgres -c "ALTER ROLE cv_games_user SET timezone TO 'UTC';" || (
    echo Failed to set timezone.
    exit /b 1
)

REM Grant database privileges
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE cv_games_db TO cv_games_user;" || (
    echo Failed to grant database privileges.
    exit /b 1
)

REM Grant schema permissions for public schema
psql -U postgres -d cv_games_db -c "GRANT USAGE, CREATE ON SCHEMA public TO cv_games_user;" || (
    echo Failed to grant schema permissions.
    exit /b 1
)
psql -U postgres -d cv_games_db -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO cv_games_user;" || (
    echo Failed to grant table privileges.
    exit /b 1
)
psql -U postgres -d cv_games_db -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO cv_games_user;" || (
    echo Failed to set default table privileges.
    exit /b 1
)

REM Ensure public schema is owned by postgres
psql -U postgres -d cv_games_db -c "ALTER SCHEMA public OWNER TO postgres;" || (
    echo Failed to set schema ownership.
    exit /b 1
)

REM Verify connection as cv_games_user
psql -U cv_games_user -d cv_games_db -h localhost -c "\q" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo Database connection successful for cv_games_user.
) else (
    echo Connection test failed. Check credentials in %PGPASS_FILE% and PostgreSQL status.
    exit /b 1
)

REM Test table creation to verify schema permissions
psql -U cv_games_user -d cv_games_db -h localhost -c "CREATE TABLE test_table (id SERIAL PRIMARY KEY); DROP TABLE test_table;" || (
    echo Failed to create test table. Check schema permissions for cv_games_user.
    exit /b 1
)

REM Import schema
psql -U cv_games_user -d cv_games_db -h localhost < schema.sql >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo Schema imported successfully.
) else (
    echo Failed to import schema. Check database\schema.sql for errors.
    exit /b 1
)

REM Insert game data, checking for existence
echo Inserting game data...
for %%g in (
    "SnakeGame Arcade 2025-05-23"
    "Whack-A-Mole Casual 2025-05-23"
    "Dessert Slash Action 2025-06-02"
    "Air Hockey Sports 2025-06-05"
    "SurfDash Action 2025-07-06"
    "Tetris Puzzle 2025-07-06"
    "SpaceWars Arcade 2025-07-16"
) do (
    for /f "tokens=1,2,3" %%a in (%%g) do (
        psql -U cv_games_user -d cv_games_db -h localhost -t -c "SELECT 1 FROM games WHERE title = '%%a';" | findstr "1" >nul
        if %ERRORLEVEL% equ 0 (
            echo Game '%%a' already exists, skipping insertion.
        ) else (
            psql -U cv_games_user -d cv_games_db -h localhost -c "INSERT INTO games (title, genre, release_date) VALUES ('%%a', '%%b', '%%c');" || (
                echo Failed to insert game '%%a'.
                exit /b 1
            )
            echo Inserted game '%%a'.
        )
    )
)
echo Game data insertion completed.

echo Database setup completed successfully. Run 'python manage.py migrate' to apply Django migrations.