from django.shortcuts import render, redirect
from django.contrib import messages
from accounts.models import Users
from .models import Games, Leaderboards
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