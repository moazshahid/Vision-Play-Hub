#!/bin/bash

# Setup script for PostgreSQL database (cv_games_db) on macOS/Linux

# Check if psql is available
if ! command -v psql >/dev/null 2>&1; then
    echo "PostgreSQL not found. Install it with 'brew install postgresql' (macOS) or 'sudo apt install postgresql' (Ubuntu)."
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "PostgreSQL is not running. Start it with 'brew services start postgresql' (macOS) or 'sudo service postgresql start' (Ubuntu)."
    exit 1
fi

# Define .pgpass file location
PGPASS_FILE="$HOME/.pgpass"

# Function to set up .pgpass file
setup_pgpass() {
    # Check if .pgpass exists and has correct permissions
    if [ ! -f "$PGPASS_FILE" ]; then
        touch "$PGPASS_FILE"
        chmod 600 "$PGPASS_FILE"
    elif [ "$(stat -f %A "$PGPASS_FILE" 2>/dev/null || stat -c %a "$PGPASS_FILE")" != "600" ]; then
        chmod 600 "$PGPASS_FILE"
    fi

    # Prompt for postgres password if not already in .pgpass
    if ! grep -q "localhost:5432:*:postgres:" "$PGPASS_FILE"; then
        read -s -p "Enter PostgreSQL 'postgres' user password: " POSTGRES_PASS
        echo
        echo "localhost:5432:*:postgres:$POSTGRES_PASS" >> "$PGPASS_FILE"
    fi

    # Ensure cv_games_user password is in .pgpass
    if ! grep -q "localhost:5432:cv_games_db:cv_games_user:cv_games_pass" "$PGPASS_FILE"; then
        echo "localhost:5432:cv_games_db:cv_games_user:cv_games_pass" >> "$PGPASS_FILE"
    fi
}

# Set up .pgpass
setup_pgpass

# Check if cv_games_db database exists
if psql -U postgres -t -c "SELECT 1 FROM pg_database WHERE datname = 'cv_games_db';" | grep -q 1; then
    echo "Database cv_games_db already exists, skipping creation."
else
    # Create database
    psql -U postgres -c "CREATE DATABASE cv_games_db;" || {
        echo "Failed to create database. Ensure 'postgres' user has access and the service is running."
        exit 1
    }
fi

# Check if cv_games_user exists
if psql -U postgres -t -c "SELECT 1 FROM pg_roles WHERE rolname = 'cv_games_user';" | grep -q 1; then
    echo "User cv_games_user already exists, skipping creation."
else
    # Create user
    psql -U postgres -c "CREATE USER cv_games_user WITH PASSWORD 'cv_games_pass';" || {
        echo "Failed to create user."
        exit 1
    }
fi

# Configure user settings
psql -U postgres -c "ALTER ROLE cv_games_user SET client_encoding TO 'utf8';" || {
    echo "Failed to set client_encoding."
    exit 1
}
psql -U postgres -c "ALTER ROLE cv_games_user SET default_transaction_isolation TO 'read committed';" || {
    echo "Failed to set transaction_isolation."
    exit 1
}
psql -U postgres -c "ALTER ROLE cv_games_user SET timezone TO 'UTC';" || {
    echo "Failed to set timezone."
    exit 1
}

# Grant database privileges
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE cv_games_db TO cv_games_user;" || {
    echo "Failed to grant database privileges."
    exit 1
}

# Grant schema permissions for public schema
psql -U postgres -d cv_games_db -c "GRANT USAGE, CREATE ON SCHEMA public TO cv_games_user;" || {
    echo "Failed to grant schema permissions."
    exit 1
}
psql -U postgres -d cv_games_db -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO cv_games_user;" || {
    echo "Failed to grant table privileges."
    exit 1
}
psql -U postgres -d cv_games_db -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO cv_games_user;" || {
    echo "Failed to set default table privileges."
    exit 1
}

# Ensure public schema is owned by postgres
psql -U postgres -d cv_games_db -c "ALTER SCHEMA public OWNER TO postgres;" || {
    echo "Failed to set schema ownership."
    exit 1
}

# Verify connection as cv_games_user
if psql -U cv_games_user -d cv_games_db -h localhost -c "\q" >/dev/null 2>&1; then
    echo "Database connection successful for cv_games_user."
else
    echo "Connection test failed. Check credentials in .pgpass and PostgreSQL status."
    exit 1
fi

# Test table creation to verify schema permissions
psql -U cv_games_user -d cv_games_db -h localhost -c "CREATE TABLE test_table (id SERIAL PRIMARY KEY); DROP TABLE test_table;" || {
    echo "Failed to create test table. Check schema permissions for cv_games_user."
    exit 1
}

# Import schema
if psql -U cv_games_user -d cv_games_db -h localhost < schema.sql >/dev/null 2>&1; then
    echo "Schema imported successfully."
else
    echo "Failed to import schema. Check database/schema.sql for errors."
    exit 1
fi

# Insert game data, checking for existence
echo "Inserting game data..."
# Define games as an array
games=(
    "SnakeGame|Arcade|2025-05-23"
    "Whack-A-Mole|Casual|2025-05-23"
    "Dessert Slash|Action|2025-06-02"
    "Air Hockey|Sports|2025-06-05"
    "SurfDash|Action|2025-07-06"
    "Tetris|Puzzle|2025-07-06"
    "SpaceWars|Arcade|2025-07-16"
)

for game in "${games[@]}"; do
    # Split game data into title, genre, release_date
    IFS='|' read -r title genre release_date <<< "$game"
    # Check if title exists
    if psql -U cv_games_user -d cv_games_db -h localhost -t -c "SELECT 1 FROM games WHERE title = '$title';" | grep -q 1; then
        echo "Game '$title' already exists, skipping insertion."
    else
        # Insert game
        psql -U cv_games_user -d cv_games_db -h localhost -c "INSERT INTO games (title, genre, release_date) VALUES ('$title', '$genre', '$release_date');" || {
            echo "Failed to insert game '$title'."
            exit 1
        }
        echo "Inserted game '$title'."
    fi
done
echo "Game data insertion completed."

echo "Database setup completed successfully. Run 'python manage.py migrate' to apply Django migrations."