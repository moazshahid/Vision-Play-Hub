from django.shortcuts import render, redirect
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from accounts.models import Users
from .models import Games, Leaderboards
import json
from datetime import datetime
import logging

# Setup logging for debugging
logger = logging.getLogger(__name__)

@csrf_exempt
def submit_score(request):
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
                    'ranking': 1,  # Placeholder; update ranking logic later
                    'last_updated': datetime.now()
                }
            )
            logger.info("Score saved for user=%s, game=%s, score=%d", user.username, game_title, score)
            return JsonResponse({'status': 'success'}, status=201)
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
        username = request.POST['username']
        email = request.POST['email']
        password = request.POST['password']
        if Users.objects.filter(username=username).exists():
            messages.error(request, 'Username already exists')
            return render(request, 'cv_games_app/signup.html')
        if Users.objects.filter(email=email).exists():
            messages.error(request, 'Email already exists')
            return render(request, 'cv_games_app/signup.html')
        user = Users.objects.create(
            username=username,
            email=email,
            password_hash=password
        )
        user.save()
        messages.success(request, 'Account created successfully')
        return redirect('login')
    return render(request, 'cv_games_app/signup.html')

def signin(request):
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        try:
            user = Users.objects.get(username=username)
            if user.password_hash == password:
                request.session['user_id'] = user.user_id
                return redirect('home')
            else:
                messages.error(request, 'Invalid password')
                return render(request, 'cv_games_app/signin.html')
        except Users.DoesNotExist:
            messages.error(request, 'Username does not exist')
            return render(request, 'cv_games_app/signin.html')
    return render(request, 'cv_games_app/signin.html')

def signout(request):
    request.session.flush()
    return redirect('login')

def leaderboard(request):
    games = Games.objects.all()
    leaderboard_data = []
    for game in games:
        entries = Leaderboards.objects.filter(game=game).order_by('ranking')
        leaderboard_data.append({'game': game, 'entries': entries})
    return render(request, 'cv_games_app/leaderboard.html', {'leaderboard_data': leaderboard_data})
