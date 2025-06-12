from django.urls import path
from . import views

urlpatterns = [
    path('signup/', views.signup, name='signup'),
    path('login/', views.signin, name='login'),
    path('logout/', views.signout, name='logout'),
    path('leaderboard/', views.leaderboard, name='leaderboard'),
    path('api/submit-score/', views.SubmitScoreAPIView.as_view(), name='api_submit_score'),
]