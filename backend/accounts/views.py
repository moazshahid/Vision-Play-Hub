from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from cv_games_app.models import UserProfiles

@login_required
def profile_view(request):
    user = request.user
    # Create or get UserProfiles entry
    profile, created = UserProfiles.objects.get_or_create(
        user=user,
        defaults={
            'is_dark_mode': True,
            'is_colorblind_mode': False
        }
    )
    return render(request, 'accounts/profile.html', {'user': user, 'profile': profile})