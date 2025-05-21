#!/bin/bash

echo "============================"
echo "Starting VisionPlay Hub..."
echo "============================"

# Step 1: Activate virtual environment and run Django migrations
# python3 -m venv venv   
source venv/bin/activate
cd backend 
#pip install django 
python3 manage.py makemigrations
python3 manage.py migrate

# Step 2: Build the React frontend
cd ../frontend
#npm install 
npm run build

# Step 3: Copy the compiled main.*.js to backend static folder
echo "Copying compiled JS file to backend static directory..."
main_js=$(ls build/static/js/main.*.js | head -n 1)
cp -f "$main_js" ../backend/static/js/app.js

# Step 4: Collect Django static files
cd ../backend || exit
python3 manage.py collectstatic --noinput

# Step 5: Launch server and browser
open http://127.0.0.1:8000
python3 manage.py runserver
