@echo off
REM Setup script for PostgreSQL database (cv_games_db) on Windows

REM Check if psql is available
where psql >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo PostgreSQL not found. Install it from https://www.postgresql.org/download/windows/.
    exit /b 1
)

REM Assume PostgreSQL service is running (user must start it via Services or installer)
REM Create database and user
psql -U postgres -c "CREATE DATABASE cv_games_db;" || (
    echo Failed to create database. Ensure 'postgres' user has access.
    exit /b 1
)
psql -U postgres -c "CREATE USER cv_games_user WITH PASSWORD 'cv_games_pass';" || (
    echo Failed to create user.
    exit /b 1
)
psql -U postgres -c "ALTER ROLE cv_games_user SET client_encoding TO 'utf8';"
psql -U postgres -c "ALTER ROLE cv_games_user SET default_transaction_isolation TO 'read committed';"
psql -U postgres -c "ALTER ROLE cv_games_user SET timezone TO 'UTC';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE cv_games_db TO cv_games_user;"

REM Verify connection
psql -U cv_games_user -d cv_games_db -h localhost -c "\q"
if %ERRORLEVEL% equ 0 (
    echo Database setup successful. Run 'psql -U cv_games_user -d cv_games_db -h localhost' to connect.
) else (
    echo Connection test failed. Check credentials and PostgreSQL status.
    exit /b 1
)

REM Import schema
psql -U cv_games_user -d cv_games_db -h localhost < database\schema.sql
if %ERRORLEVEL% equ 0 (
    echo Schema imported successfully.
) else (
    echo Failed to import schema. Check database\schema.sql.
    exit /b 1
)