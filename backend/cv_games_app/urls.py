from django.urls import path
from . import views
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('', views.home, name='home'),
    path('auth/signup/', views.signup, name='signup'),
    path('auth/login/', views.signin, name='login'),
    path('auth/logout/', views.signout, name='logout'),
    path('auth/leaderboard/', views.leaderboard, name='leaderboard'),
    path('auth/api/submit-score/', views.SubmitScoreAPIView.as_view(), name='api_submit_score'),
    path('ping/', views.keep_session_alive, name='keep_alive'),
    path('faqs/', views.faqs_view, name='faqs'),
    path('about-us/', views.about_us_view, name='aboutus'),
    path('profile/', views.profile_view, name='profile'),
    path('api/profile-pic/', views.get_profile_pic, name='profile-pic'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)