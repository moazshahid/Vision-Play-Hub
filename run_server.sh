#!/bin/bash

# Setup script for VisionPlay Hub on macOS/Linux

echo "============================"
echo "Starting VisionPlay Hub..."
echo "============================"

# Step 1: Navigate to backend directory and set up virtual environment
cd backend
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi
source venv/bin/activate
if [ $? -ne 0 ]; then
    echo "Failed to activate virtual environment. Check Python installation."
    exit 1
fi

# Step 2: Install Python dependencies
echo "Installing Python dependencies..."
pip install -r ../requirements.txt
if [ $? -ne 0 ]; then
    echo "Failed to install Python dependencies. Check requirements.txt."
    exit 1
fi

# Step 3: Run Django migrations
echo "Running Django migrations..."
python manage.py makemigrations
if [ $? -ne 0 ]; then
    echo "Migrations generation failed. Check for errors above."
    exit 1
fi
python manage.py migrate
if [ $? -ne 0 ]; then
    echo "Migrations application failed. Check for errors above."
    exit 1
fi

# Step 4: Navigate to frontend directory, clean node_modules, and install dependencies
cd ../frontend
if [ -d "node_modules" ]; then
    echo "Cleaning old node_modules directory..."
    rm -rf node_modules
fi
echo "Installing Node.js dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "Failed to install Node.js dependencies. Check package.json."
    exit 1
fi

# Step 5: Clean old build directory
if [ -d "build" ]; then
    echo "Cleaning old build directory..."
    rm -rf build
fi

# Step 6: Build the React frontend
echo "Building React frontend..."
npm run build
if [ $? -ne 0 ]; then
    echo "Frontend build failed. Check for errors above."
    exit 1
fi

# Step 7: Copy the compiled main.*.js to backend static folder
cd ..
for file in frontend/build/static/js/main.*.js; do
    echo "Copying $file to backend/static/js/app.js ..."
    cp "$file" backend/static/js/app.js
done

# Step 8: Copy the compiled main.*.css to backend static folder
for file in frontend/build/static/css/main.*.css; do
    echo "Copying $file to backend/static/css/app.css ..."
    mkdir -p backend/static/css
    cp "$file" backend/static/css/app.css
done

# Step 9: Collect Django static files
cd backend
python manage.py collectstatic --noinput
if [ $? -ne 0 ]; then
    echo "Static file collection failed. Check for errors above."
    exit 1
fi

# Step 10: Launch server and browser
echo "Launching server and opening browser..."
open http://127.0.0.1:8000 &
python manage.py runserver