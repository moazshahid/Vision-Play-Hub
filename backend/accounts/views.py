from django.shortcuts import render
from .models import Users

def profile_view(request):
    try:
        user = Users.objects.get(user_id=1)  # Simulate logged-in user
    except Users.DoesNotExist:
        return render(request, 'accounts/profile.html', {'error': 'No user found.'})
    return render(request, 'accounts/profile.html', {'user': user})