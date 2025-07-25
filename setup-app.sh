#!/bin/bash

# Exit on error
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "Starting setup for CV Games app..."

# Check if Docker is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed. Please install Docker Desktop and try again.${NC}"
    echo "Visit https://www.docker.com/products/docker-desktop/ for instructions."
    exit 1
fi

# Check if project folder is correct
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}Error: docker-compose.yml not found. Make sure you're in the project folder (dubai-team-1).${NC}"
    exit 1
fi

# Start containers
echo "Starting the app and database..."
docker-compose up -d || {
    echo -e "${RED}Error: Failed to start the app. Check if Docker is running or try again.${NC}"
    exit 1
}

# Wait for database to be ready
echo "Waiting for the database to be ready..."
until docker-compose exec -T db pg_isready -U cv_games_user -d cv_games_db > /dev/null 2>&1; do
    sleep 1
done
echo -e "${GREEN}Database is ready!${NC}"

# Run migrations
echo "Setting up the database structure..."
docker-compose exec -T backend python manage.py migrate || {
    echo -e "${RED}Error: Failed to set up database structure. Please contact the support team.${NC}"
    exit 1
}
echo -e "${GREEN}Database structure set up successfully!${NC}"

# Copy and execute init_data.sql
echo "Adding initial game data..."
docker cp ./database/init_data.sql dubai-team-1-db-1:/tmp/init_data.sql || {
    echo -e "${RED}Error: Failed to copy initial data file. Check if database/init_data.sql exists.${NC}"
    exit 1
}
docker-compose exec -T db psql -U cv_games_user -d cv_games_db -f /tmp/init_data.sql || {
    echo -e "${RED}Error: Failed to add initial game data. Please contact the support team.${NC}"
    exit 1
}
echo -e "${GREEN}Initial game data added successfully!${NC}"

echo -e "${GREEN}Setup complete! You can now access the app at http://localhost:8000/${NC}"
echo "To stop the app, run: ./stop-app.sh"
echo "To reset the database, run: ./reset-app.sh"