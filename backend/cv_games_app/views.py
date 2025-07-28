from django.shortcuts import render, redirect
from django.contrib import messages
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.http import JsonResponse, Http404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_POST
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Games, Leaderboards, Profile, UserProfiles, Sessions
from rest_framework_simplejwt.tokens import RefreshToken
import logging
import time
import json
from .forms import ProfilePictureForm
from django.contrib.auth.decorators import login_required
from django.contrib.auth import update_session_auth_hash
from .serializers import UserProfileSerializer

logger = logging.getLogger(__name__)

@ensure_csrf_cookie
def csrf(request):
    return JsonResponse({'message': 'CSRF cookie set'})

@require_POST
def ping(request):
    request.session.modified = True  # extend session expiry
    return JsonResponse({'status': 'pong', 'new_expiry': request.session.get_expiry_age()})

class SubmitScoreAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            game_title = request.data.get('game')
            score = request.data.get('score')
            logger.debug("Received data: game=%s, score=%s, user=%s (id=%s)", game_title, score, request.user.username, request.user.id)
            if not game_title or score is None:
                return Response({'error': 'Game title and score required'}, status=status.HTTP_400_BAD_REQUEST)
            score = int(score)
            if score < 0:
                return Response({'error': 'Score cannot be negative'}, status=status.HTTP_400_BAD_REQUEST)
            user = request.user
            if not User.objects.filter(id=user.id).exists():
                logger.error("User with ID %s does not exist in auth_user", user.id)
                return Response({'error': 'User not found in database'}, status=status.HTTP_404_NOT_FOUND)
            games = Games.objects.filter(title=game_title)
            if not games.exists():
                logger.error("Game not found: %s", game_title)
                return Response({'error': 'Game not found'}, status=status.HTTP_404_NOT_FOUND)
            if games.count() > 1:
                logger.warning("Multiple games found for title %s, using first one", game_title)
            game = games.first()
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
            logger.info("Score saved for user=%s (id=%s), game=%s, score=%d", user.username, user.id, game_title, score)
            return Response({'status': 'success'}, status=status.HTTP_201_CREATED)
        except ValueError:
            logger.error("Invalid score format")
            return Response({'error': 'Invalid score format'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error("Unexpected error in submit score: %s", str(e))
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
        try:
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password
            )
            user.save()
            UserProfiles.objects.create(user=user, is_dark_mode=False, is_colorblind_mode=False)
            Profile.objects.create(user=user)
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
            logger.info("User %s signed up successfully, access_token set: %s, httponly=False", username, access_token[:10])
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
            # Ensure Profile exists before login
            if not hasattr(user, 'profile'):
                from .models import Profile
                Profile.objects.create(user=user)
            login(request, user)
            # Ensure UserProfiles exists
            UserProfiles.objects.get_or_create(
                user=user,
                defaults={
                    'is_dark_mode': False,
                    'is_colorblind_mode': False
                }
            )
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
            logger.info("User %s logged in successfully, access_token set: %s, httponly=False", username, access_token[:10])
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

    # Fetch UserProfiles data if authenticated
    profile_image = request.session.get('profile_image')
    theme_mode = request.session.get('theme_mode', 'dark')
    color_filter = request.session.get('color_filter', 'trichromatic')
    if request.user.is_authenticated:
        try:
            user_profile = UserProfiles.objects.get(user=request.user)
            theme_mode = 'light' if user_profile.is_dark_mode else 'dark'
            color_filter = 'colorblind' if user_profile.is_colorblind_mode else 'trichromatic'
            profile_image = request.build_absolute_uri(user_profile.profile_image.url) if user_profile.profile_image else None
            # Update session with latest values
            request.session['theme_mode'] = theme_mode
            request.session['color_filter'] = color_filter
            request.session['profile_image'] = profile_image
            request.session['username'] = request.user.username
        except UserProfiles.DoesNotExist:
            logger.warning("UserProfiles not found for user: %s", request.user.username)
            UserProfiles.objects.create(
                user=request.user,
                is_dark_mode=False,
                is_colorblind_mode=False,
                profile_image=None
            )
            theme_mode = 'dark'
            color_filter = 'trichromatic'
            profile_image = None
            request.session['theme_mode'] = theme_mode
            request.session['color_filter'] = color_filter
            request.session['profile_image'] = profile_image
            request.session['username'] = request.user.username

    return render(request, 'index.html', {
        'username': username,
        'time_left': time_left,
        'messages': messages.get_messages(request),
        'profile_image': profile_image,
        'theme_mode': theme_mode,
        'color_filter': color_filter
    })

def leaderboard(request):
    games = Games.objects.all()
    leaderboard_data = []
    for game in games:
        entries = Leaderboards.objects.filter(game=game).order_by('ranking')
        leaderboard_data.append({'game': game, 'entries': entries})
    return render(request, 'cv_games_app/leaderboard.html', {'leaderboard_data': leaderboard_data})

def record_game_session(request):
    try:
        username = request.POST.get('username')
        game_name = request.POST.get('game_name')
        score = request.POST.get('score')
        start_time = request.POST.get('start_time')
        end_time = request.POST.get('end_time')
        if not all([username, game_name, score, start_time, end_time]):
            return JsonResponse({'error': 'All fields are required.'}, status=400)
        try:
            score = int(score)
        except ValueError:
            return JsonResponse({'error': 'Score must be an integer.'}, status=400)
        start_time = parse_datetime(start_time)
        end_time = parse_datetime(end_time)
        if not start_time or not end_time:
            return JsonResponse({'error': 'Invalid datetime format.'}, status=400)
        user = User.objects.get(username=username)
        game = Games.objects.get(title=game_name)
        Sessions.objects.create(
            user_id=user.id,
            game_id=game.game_id,
            start_time=start_time,
            end_time=end_time,
            score=score
        ).save()
        return JsonResponse({'status': 'session saved'})
    except User.DoesNotExist:
        return JsonResponse({'error': 'User not found'}, status=404)
    except Games.DoesNotExist:
        return JsonResponse({'error': 'Game not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

class UserProfileAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            profile = UserProfiles.objects.get(user=request.user)
            serializer = UserProfileSerializer(profile, context={'request': request})
            return Response(serializer.data)
        except UserProfiles.DoesNotExist:
            return Response({'error': 'Profile not found'}, status=404)

class UserProfileImageUploadAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        try:
            profile = UserProfiles.objects.get(user=request.user)
            profile.profile_image = request.FILES.get('profile_image')
            profile.save()
            serializer = UserProfileSerializer(profile, context={'request': request})
            return Response(serializer.data)
        except UserProfiles.DoesNotExist:
            return Response({'error': 'Profile not found'}, status=404)

@require_POST
def save_settings(request):
    try:
        profile = UserProfiles.objects.get(user=request.user)
        profile.is_dark_mode = request.POST.get('is_dark_mode') == 'true'
        profile.is_colorblind_mode = request.POST.get('is_colorblind_mode') == 'true'
        profile.save()
        messages.success(request, 'Settings saved successfully.')
        return redirect('profile')
    except UserProfiles.DoesNotExist:
        logger.error("Profile not found for user: %s", request.user.username)
        messages.error(request, 'Profile not found.')
        return redirect('profile')
    except Exception as e:
        logger.error("Error saving settings: %s", str(e))
        messages.error(request, 'Error saving settings.')
        return redirect('profile')

def keep_session_alive(request):
    request.session.modified = True  # refresh session expiry
    return JsonResponse({'status': 'alive'})

def faqs_view(request):
    return render(request, 'cv_games_app/faqs.html')

def about_us_view(request):
    return render(request, 'cv_games_app/aboutus.html')

@login_required
def profile_view(request):
    try:
        profile = request.user.profile
    except Profile.DoesNotExist:
        profile = Profile.objects.create(user=request.user)
    if request.method == 'POST':
        form = ProfilePictureForm(request.POST, request.FILES, instance=profile)
        if form.is_valid():
            form.save()
            # Return JSON response with the image URL
            return JsonResponse({
                'success': True,
                'message': 'Profile picture updated successfully.',
                'url': request.build_absolute_uri(profile.profile_picture.url) if profile.profile_picture else None
            })
        else:
            return JsonResponse({
                'success': False,
                'error': str(form.errors)
            })
    else:
        form = ProfilePictureForm(instance=profile)
    return render(request, 'cv_games_app/profile.html', {'form': form})

@login_required
def get_profile_pic(request):
    try:
        profile = request.user.profile
        profile_pic_url = request.build_absolute_uri(profile.profile_picture.url) if profile.profile_picture else None
        return JsonResponse({'profile_picture': profile_pic_url})
    except Profile.DoesNotExist:
        return JsonResponse({'profile_picture': None}, status=404)
    except Exception as e:
        logger.error("Error fetching profile picture: %s", str(e))
        return JsonResponse({'profile_picture': None}, status=500)

@login_required
def change_password(request):
    if request.method == 'POST':
        old_password = request.POST['old_password']
        new_password = request.POST['new_password']
        confirm_password = request.POST['confirm_password']

        if new_password != confirm_password:
            return JsonResponse({'error': 'New passwords do not match'}, status=400)

        user = request.user
        if not user.check_password(old_password):
            return JsonResponse({'error': 'Old password is incorrect'}, status=400)

        user.set_password(new_password)
        user.save()
        # Ensure Profile exists after password change
        if not hasattr(user, 'profile'):
            from .models import Profile
            Profile.objects.create(user=user)
        update_session_auth_hash(request, user)  # Keep the user logged in
        messages.success(request, 'Your password has been changed successfully.')
        return JsonResponse({'success': True})

    return render(request, 'profile.html')
