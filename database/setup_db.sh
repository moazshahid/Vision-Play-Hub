#!/bin/bash

# Setup script for PostgreSQL database (cv_games_db) on macOS/Linux

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "PostgreSQL not found. Install it with 'brew install postgresql' (macOS) or 'sudo apt install postgresql' (Ubuntu)."
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "PostgreSQL is not running. Start it with 'brew services start postgresql' (macOS) or 'sudo service postgresql start' (Ubuntu)."
    exit 1
fi

# Create database and user
psql -U postgres -c "CREATE DATABASE cv_games_db;" || {
    echo "Failed to create database. Ensure 'postgres' user has access."
    exit 1
}
psql -U postgres -c "CREATE USER cv_games_user WITH PASSWORD 'cv_games_pass';" || {
    echo "Failed to create user."
    exit 1
}
psql -U postgres -c "ALTER ROLE cv_games_user SET client_encoding TO 'utf8';"
psql -U postgres -c "ALTER ROLE cv_games_user SET default_transaction_isolation TO 'read committed';"
psql -U postgres -c "ALTER ROLE cv_games_user SET timezone TO 'UTC';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE cv_games_db TO cv_games_user;"

# Verify connection
psql -U cv_games_user -d cv_games_db -h localhost -c "\q" && {
    echo "Database setup successful. Run 'psql -U cv_games_user -d cv_games_db -h localhost' to connect."
} || {
    echo "Connection test failed. Check credentials and PostgreSQL status."
    exit 1
}

# Import schema
psql -U cv_games_user -d cv_games_db -h localhost < database/schema.sql && {
    echo "Schema imported successfully."
} || {
    echo "Failed to import schema. Check database/schema.sql."
    exit 1
}