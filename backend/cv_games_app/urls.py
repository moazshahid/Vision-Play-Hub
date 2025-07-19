from django.conf import settings
from django.conf.urls.static import static
from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('auth/signup/', views.signup, name='signup'),
    path('auth/login/', views.signin, name='login'),
    path('auth/logout/', views.signout, name='logout'),
    path('auth/leaderboard/', views.leaderboard, name='leaderboard'),
    path('auth/api/submit-score/', views.SubmitScoreAPIView.as_view(), name='api_submit_score'),
    path('ping/', views.ping, name='keep_alive'),
    path('record-session/', views.record_game_session, name='record_session'),
    path('api/user-profile/', views.UserProfileAPIView.as_view(), name='user_profile'),
    path('api/user-profile/upload/', views.UserProfileImageUploadAPIView.as_view(), name='user_profile_upload'),
    path('save-settings/', views.save_settings, name='save_settings'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)