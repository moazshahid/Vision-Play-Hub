@echo off
echo ============================
echo Starting VisionPlay Hub...
echo ============================

:: Step 1: Activate virtual environment and run Django migrations
cd backend
call venv\Scripts\activate
call python manage.py makemigrations
call python manage.py migrate

:: Step 2: Build the React frontend
cd ..
cd frontend
call npm run build

:: Step 3: Copy the compiled main.*.js to backend static folder
for %%f in (build\static\js\main.*.js) do (
    echo Copying %%f to backend/static/js/app.js ...
    copy /Y "%%f" "..\backend\static/js/app.js"
)

:: Step 4: Copy the compiled main.*.css to backend static folder
for %%f in (build\static\css\main.*.css) do (
    echo Copying %%f to backend/static/css/app.css ...
    mkdir ..\backend\static\css 2>nul
    copy /Y "%%f" "..\backend\static/css/app.css"
)

:: Step 5: Collect Django static files
:: Step 4: Copy the compiled main.*.css to backend static folder
for %%f in (build\static\css\main.*.css) do (
    echo Copying %%f to backend/static/css/app.css ...
    mkdir ..\backend\static\css 2>nul
    copy /Y "%%f" "..\backend\static/css/app.css"
)

:: Step 5: Collect Django static files
cd ..
cd backend
call python manage.py collectstatic --noinput

:: Step 6: Launch server and browser
start "" http://127.0.0.1:8000
call python manage.py runserver