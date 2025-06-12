from django.shortcuts import render
from django.contrib.auth.models import User


def profile_view(request):
    try:
        user = User.objects.get(user_id=1)  # Simulate logged-in user
    except User.DoesNotExist:
        return render(request, 'accounts/profile.html', {'error': 'No user found.'})
    return render(request, 'accounts/profile.html', {'user': user})