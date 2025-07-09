from django.urls import path, include
from . import views

urlpatterns = [
    path('profile/', views.profile_view, name='profile'),
    path('', include('allauth.urls')),
]