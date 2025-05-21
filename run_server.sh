#!/bin/bash

echo "============================"
echo "Starting VisionPlay Hub..."
echo "============================"

# Step 1: Setup backend
cd backend || exit 1

# Create and activate virtual environment
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

# Install dependencies
if [ -f "requirements.txt" ]; then
    echo "Installing Python dependencies..."
    pip install -r requirements.txt
else
    echo "No requirements.txt found. Installing Django as fallback..."
    pip install django
fi

# Apply Django migrations
echo "Running Django migrations..."
python3 manage.py makemigrations
python3 manage.py migrate

# Step 2: Build React frontend
cd ../frontend || exit 1

if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
fi

echo "Building React frontend..."
npm run build

# Step 3: Copy compiled React assets to Django static directory
echo "Copying React build assets to Django static files..."

mkdir -p ../backend/static/js
mkdir -p ../backend/static/css

JS_FILE=$(ls build/static/js/main.*.js | head -n 1)
CSS_FILE=$(ls build/static/css/main.*.css | head -n 1)

cp -f "$JS_FILE" ../backend/static/js/app.js
cp -f "$CSS_FILE" ../backend/static/css/app.css

# Step 4: Collect Django static files
cd ../backend || exit 1
echo "Collecting static files..."
python3 manage.py collectstatic --noinput

# Step 5: Open browser (Gitpod may not support GUI apps; optional)
echo "Opening browser..."
xdg-open http://127.0.0.1:8000 2>/dev/null || open http://127.0.0.1:8000 || echo "Please open http://127.0.0.1:8000 manually."

# Step 6: Run Django server
echo "Running Django development server..."
python3 manage.py runserver
