from django.shortcuts import render, redirect
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from accounts.models import Users
from .models import Games, Leaderboards
import json
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def submit_score(request):
    if request.method == "OPTIONS":
        response = JsonResponse({"message": "CORS preflight success"})
        response["Access-Control-Allow-Origin"] = "http://localhost:3000"
        response["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type"
        response["Access-Control-Allow-Credentials"] = "true"
        return response
    logger.debug("submit_score called with method: %s", request.method)
    if request.method == 'POST':
        if 'user_id' not in request.session:
            logger.warning("No user_id in session")
            return JsonResponse({'error': 'User not authenticated'}, status=401)
        try:
            data = json.loads(request.body)
            game_title = data.get('game')
            score = data.get('score')
            logger.debug("Received data: game=%s, score=%s", game_title, score)
            if not game_title or score is None:
                return JsonResponse({'error': 'Game title and score required'}, status=400)
            score = int(score)
            if score < 0:
                return JsonResponse({'error': 'Score cannot be negative'}, status=400)
            user = Users.objects.get(user_id=request.session['user_id'])
            game = Games.objects.get(title=game_title)
            Leaderboards.objects.update_or_create(
                user=user,
                game=game,
                defaults={
                    'score': score,
                    'ranking': 1,
                    'last_updated': datetime.now()
                }
            )
            logger.info("Score saved for user=%s, game=%s, score=%d", user.username, game_title, score)
            response = JsonResponse({'status': 'success'}, status=201)
            response["Access-Control-Allow-Origin"] = "http://localhost:3000"
            response["Access-Control-Allow-Credentials"] = "true"
            return response
        except (Users.DoesNotExist, Games.DoesNotExist) as e:
            logger.error("Not found: %s", str(e))
            return JsonResponse({'error': 'User or game not found'}, status=404)
        except json.JSONDecodeError:
            logger.error("Invalid JSON in request body")
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except ValueError:
            logger.error("Invalid score format")
            return JsonResponse({'error': 'Invalid score format'}, status=400)
        except Exception as e:
            logger.error("Unexpected error: %s", str(e))
            return JsonResponse({'error': str(e)}, status=500)
    logger.warning("Invalid request method: %s", request.method)
    return JsonResponse({'error': 'Invalid method'}, status=405)

def signup(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        email = request.POST.get('email')
        password = request.POST.get('password')
        if not all([username, email, password]):
            logger.warning("Missing signup fields")
            messages.error(request, 'All fields are required')
            return render(request, 'cv_games_app/signup.html')
        if Users.objects.filter(username=username).exists():
            logger.warning("Username %s already exists", username)
            messages.error(request, 'Username already exists')
            return render(request, 'cv_games_app/signup.html')
        if Users.objects.filter(email=email).exists():
            logger.warning("Email %s already exists", email)
            messages.error(request, 'Email already exists')
            return render(request, 'cv_games_app/signup.html')
        try:
            user = Users.objects.create(
                username=username,
                email=email,
                password_hash=password
            )
            user.save()
            request.session['user_id'] = user.user_id
            request.session.save()
            logger.info("User %s signed up, sessionid=%s", username, request.session.session_key)
            messages.success(request, 'Account created successfully')
            return redirect('home')
        except Exception as e:
            logger.error("Signup error: %s", str(e))
            messages.error(request, 'Error creating account')
            return render(request, 'cv_games_app/signup.html')
    logger.debug("Rendering signup page")
    return render(request, 'cv_games_app/signup.html')

def signin(request):
    logger.debug("signin called with method: %s, sessionid=%s", request.method, request.session.session_key)
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        logger.debug("Attempting login for user: %s", username)
        if not username or not password:
            logger.warning("Missing username or password")
            messages.error(request, 'Username and password are required')
            return render(request, 'cv_games_app/signin.html')
        try:
            user = Users.objects.get(username=username)
            if user.password_hash == password:
                request.session['user_id'] = user.user_id
                request.session.create()  # Create new session
                request.session.save()
                logger.info("User %s logged in, sessionid=%s", username, request.session.session_key)
                return redirect('home')
            else:
                logger.warning("Invalid password for user %s", username)
                messages.error(request, 'Invalid password')
                return render(request, 'cv_games_app/signin.html')
        except Users.DoesNotExist:
            logger.warning("Username %s does not exist", username)
            messages.error(request, 'Username does not exist')
            return render(request, 'cv_games_app/signin.html')
        except Exception as e:
            logger.error("Login error: %s", str(e))
            messages.error(request, 'An error occurred during login')
            return render(request, 'cv_games_app/signin.html')
    logger.debug("Rendering signin page")
    return render(request, 'cv_games_app/signin.html')

def signout(request):
    logger.info("User id=%s signing out", request.session.get('user_id'))
    request.session.flush()
    return redirect('login')

def leaderboard(request):
    games = Games.objects.all()
    leaderboard_data = []
    for game in games:
        entries = Leaderboards.objects.filter(game=game).order_by('ranking')
        leaderboard_data.append({'game': game, 'entries': entries})
    return render(request, 'cv_games_app/leaderboard.html', {'leaderboard_data': leaderboard_data})