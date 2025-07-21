from django.shortcuts import render, redirect
from django.contrib import messages
from django.http import JsonResponse
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import Games, Leaderboards
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
import logging
from django.views.decorators.csrf import ensure_csrf_cookie
import time
import json

logger = logging.getLogger(__name__)

@ensure_csrf_cookie
def csrf(request):
    return JsonResponse({'message': 'CSRF cookie set'})

class SubmitScoreAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            game_title = request.data.get('game')
            score = request.data.get('score')
            logger.debug("Received data: game=%s, score=%s", game_title, score)
            if not game_title or score is None:
                return Response({'error': 'Game title and score required'}, status=status.HTTP_400_BAD_REQUEST)
            score = int(score)
            if score < 0:
                return Response({'error': 'Score cannot be negative'}, status=status.HTTP_400_BAD_REQUEST)
            user = request.user
            game = Games.objects.get(title=game_title)  
            entry, created = Leaderboards.objects.update_or_create(
                user=user,
                game=game,
                defaults={
                    'score': score,
                    'ranking': 0,
                    'last_updated': timezone.now()
                }
            )
            all_entries = Leaderboards.objects.filter(game=game).order_by('-score', 'last_updated')
            for idx, entry in enumerate(all_entries, start=1):
                entry.ranking = idx
                entry.save()
            logger.info("Score saved for user=%s, game=%s, score=%d", user.username, game_title, score)
            return Response({'status': 'success'}, status=status.HTTP_201_CREATED)
        except Games.DoesNotExist:
            logger.error("Game not found: %s", game_title)
            return Response({'error': 'Game not found'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError:
            logger.error("Invalid score format")
            return Response({'error': 'Invalid score format'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error("Unexpected error: %s", str(e))
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def signup(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        email = request.POST.get('email')
        password = request.POST.get('password')
        if not all([username, email, password]):
            logger.warning("Missing signup fields")
            messages.error(request, 'All fields are required')
            return render(request, 'cv_games_app/signup.html')
        if User.objects.filter(username=username).exists():
            logger.warning("Username %s already exists", username)
            messages.error(request, 'Username already exists')
            return render(request, 'cv_games_app/signup.html')
        if User.objects.filter(email=email).exists():
            logger.warning("Email %s already exists", email)
            messages.error(request, 'Email already exists')
            return render(request, 'cv_games_app/signup.html')
        
        storage = messages.get_messages(request)
        storage.used = True
        
        try:
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password
            )
            user.save()
        except Exception as e:
            logger.error("User creation failed: %s", str(e))
            messages.error(request, f"Error creating account: {str(e)}")
            return render(request, 'cv_games_app/signup.html')
        
        try:
            login(request, user)
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
            response = redirect('home')
            response.set_cookie(
                'access_token',
                access_token,
                max_age=3600,
                httponly=False,
                domain='localhost',
                path='/',
                secure=False,
                samesite='Lax'
            )
            response.set_cookie(
                'refresh_token',
                refresh_token,
                max_age=86400,
                httponly=True,
                domain='localhost',
                path='/',
                secure=False,
                samesite='Lax'
            )
            response.set_cookie(
                'csrftoken',
                request.COOKIES.get('csrftoken', ''),
                max_age=31449600,
                httponly=False,
                domain='localhost',
                path='/',
                secure=False,
                samesite='Lax'
            )
            logger.info("User %s signed up successfully, access_token set: %s, httponly=False", username, access_token[:10] + '...')
            messages.success(request, f"Successfully signed up as {username}.")
            return response
        except Exception as e:
            logger.error("Post-user creation error (login/cookies): %s", str(e))
            messages.success(request, f"Account created for {username}. Please log in.")
            return redirect('login')
    return render(request, 'cv_games_app/signup.html')

@ensure_csrf_cookie
def signin(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            request.session['login_time'] = int(time.time())
            request.session['username'] = username
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
            response = redirect('home')
            response.set_cookie(
                'access_token',
                access_token,
                max_age=3600,
                httponly=False,
                domain='localhost',
                path='/',
                secure=False,
                samesite='Lax'
            )
            response.set_cookie(
                'refresh_token',
                refresh_token,
                max_age=86400,
                httponly=True,
                domain='localhost',
                path='/',
                secure=False,
                samesite='Lax'
            )
            response.set_cookie(
                'csrftoken',
                request.COOKIES.get('csrftoken', ''),
                max_age=31449600,
                httponly=False,
                domain='localhost',
                path='/',
                secure=False,
                samesite='Lax'
            )
            logger.info("User %s logged in successfully, access_token set: %s, httponly=False", username, access_token[:10] + '...')
            messages.success(request, f"Successfully signed in as {username}.")
            return response
        else:
            logger.warning("Invalid login attempt for username: %s", username)
            messages.error(request, 'Invalid username or password.')
            return render(request, 'cv_games_app/signin.html')
    return render(request, 'cv_games_app/signin.html')

def signout(request):
    storage = messages.get_messages(request)
    storage.used = True
    logout(request)
    request.session.flush()
    messages.success(request, 'You have been logged out.')
    return redirect('login')

def home(request):
    username = request.session.get('username')
    login_time = request.session.get('login_time')
    now = int(time.time())
    time_left = 0
    if login_time:
        elapsed = now - login_time
        time_left = max(0, 600 - elapsed)
    if not username:
        username = 'Guest'
    return render(request, 'index.html', {
        'username': username,
        'time_left': time_left,
        'messages': messages.get_messages(request)
    })

def leaderboard(request):
    games = Games.objects.all()
    leaderboard_data = []
    for game in games:
        entries = Leaderboards.objects.filter(game=game).order_by('ranking')
        leaderboard_data.append({'game': game, 'entries': entries})
    return render(request, 'cv_games_app/leaderboard.html', {'leaderboard_data': leaderboard_data})

def keep_session_alive(request):
    request.session.modified = True
    request.session['login_time'] = int(time.time())  
    now = int(time.time())
    login_time = request.session.get('login_time', now)
    time_left = max(0, 600 - (now - login_time))
    logger.info("Session kept alive for user=%s, time_left=%d", request.session.get('username', 'unknown'), time_left)
    return JsonResponse({'status': 'alive', 'time_left': time_left})