#!/bin/bash

echo "============================"
echo "Starting VisionPlay Hub..."
echo "============================"

# Step 1: Activate virtual environment and run Django migrations
cd backend 
source ../venv/bin/activate
python manage.py makemigrations
python manage.py migrate

# Step 2: Build the React frontend
cd ../frontend 
npm run build

# Step 3: Copy the compiled main.*.js to backend static folder
echo "Copying compiled JS file to backend static directory..."
main_js=$(ls build/static/js/main.*.js | head -n 1)
cp -f "$main_js" ../backend/static/js/app.js

# Step 4: Collect Django static files
cd ../backend || exit
python manage.py collectstatic --noinput

# Step 5: Launch server and browser
open http://127.0.0.1:8000
python manage.py runserver
