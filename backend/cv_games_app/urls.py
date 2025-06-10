from django.urls import path
from . import views

urlpatterns = [
    path('signup/', views.signup, name='signup'),
    path('login/', views.signin, name='login'),
    path('logout/', views.signout, name='logout'),
    path('leaderboard/', views.leaderboard, name='leaderboard'),
    path('submit_score/', views.submit_score, name='submit_score'),
]