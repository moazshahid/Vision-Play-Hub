###Database Setup for CV Games
This folder contains files to set up the PostgreSQL database (cv_games_db) for the CV Games project.

##Prerequisites

#Python 3.8+: Ensure Python is installed.
#Virtual Environment: 
source venv/bin/activate  # macOS/Linux
venv\Scripts\activate     # Windows


##Dependencies: 
Install from project root:   pip install -r requirements.txt



##Install PostgreSQL

#macOS:

brew install postgresql
brew services start postgresql

Verify:psql --version



#Windows:

Download and install PostgreSQL from postgresql.org.
Run the installer, note the postgres user password (default admin user).
Verify (in Command Prompt or PowerShell):psql --version



##Set Up Database
Option 1: Automated Script
Run the platform-specific script to create cv_games_db and cv_games_user.

#macOS/Linux
chmod +x database/setup_db.sh
./database/setup_db.sh

#Windows
In Command Prompt:
database\setup_db.bat

#Option 2: Manual Setup

Log into PostgreSQL as the postgres user:psql -U postgres


Create database and user:CREATE DATABASE cv_games_db;
CREATE USER cv_games_user WITH PASSWORD 'cv_games_pass';
ALTER ROLE cv_games_user SET client_encoding TO 'utf8';
ALTER ROLE cv_games_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE cv_games_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE cv_games_db TO cv_games_user;
\q


#Verify connection: 
psql -U cv_games_user -d cv_games_db -h localhost

Password: cv_games_pass

#Import Schema
Apply the database schema:
psql -U cv_games_user -d cv_games_db -h localhost < database/schema.sql

#Apply Django Migrations
From the project root:
python manage.py makemigrations
python manage.py migrate

#Troubleshooting

psycopg2 Error: Ensure psycopg2-binary is in requirements.txt and installed.
Connection Refused: Verify PostgreSQL is running (brew services start postgresql on macOS, or check Windows services).
Permission Denied: Ensure cv_games_user has privileges on cv_games_db.

