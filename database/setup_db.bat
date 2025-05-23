@echo off
REM Setup script for PostgreSQL database (cv_games_db) on Windows

REM Check if psql is available
where psql >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo PostgreSQL not found. Install it from https://www.postgresql.org/download/windows/.
    exit /b 1
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
psql -U postgres -c "ALTER ROLE cv_games_user SET client_encoding TO 'utf8';"
psql -U postgres -c "ALTER ROLE cv_games_user SET default_transaction_isolation TO 'read committed';"
psql -U postgres -c "ALTER ROLE cv_games_user SET timezone TO 'UTC';"

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
psql -U postgres -d cv_games_db -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO cv_games_user;"
psql -U postgres -d cv_games_db -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO cv_games_user;"

REM Ensure public schema is owned by postgres
psql -U postgres -d cv_games_db -c "ALTER SCHEMA public OWNER TO postgres;" || (
    echo Failed to set schema ownership.
    exit /b 1
)

REM Verify connection as cv_games_user
psql -U cv_games_user -d cv_games_db -h localhost -c "\q"
if %ERRORLEVEL% equ 0 (
    echo Database connection successful for cv_games_user.
) else (
    echo Connection test failed. Check credentials and PostgreSQL status.
    exit /b 1
)

REM Test table creation to verify schema permissions
psql -U cv_games_user -d cv_games_db -h localhost -c "CREATE TABLE test_table (id SERIAL PRIMARY KEY); DROP TABLE test_table;" || (
    echo Failed to create test table. Check schema permissions for cv_games_user.
    exit /b 1
)

REM Import schema
psql -U cv_games_user -d cv_games_db -h localhost < schema.sql
if %ERRORLEVEL% equ 0 (
    echo Schema imported successfully.
) else (
    echo Failed to import schema. Check database\schema.sql for errors.
    exit /b 1
)

echo Database setup completed successfully. Run 'python manage.py migrate' to apply Django migrations.