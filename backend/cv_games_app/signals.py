from django.contrib.auth.signals import user_logged_in
from django.db.models.signals import post_save
from django.contrib.auth.models import User
from django.dispatch import receiver
import logging
from .models import Profile, UserProfiles
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
from django.contrib import messages

logger = logging.getLogger(__name__)

@receiver(user_logged_in)
def set_jwt_cookies(sender, user, request, **kwargs):
    """
    Generate JWT tokens and set as cookies for all login methods, including social logins.
    Also create UserProfiles and store user data in session.
    """
    logger.debug("User logged in: %s", user.username)
    try:
        # Create or get UserProfiles
        profile, created = UserProfiles.objects.get_or_create(
            user=user,
            defaults={
                'is_dark_mode': False,
                'is_colorblind_mode': False,
                'profile_image': None
            }
        )
        if created:
            logger.debug("Created UserProfiles for user: %s", user.username)

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        # Store user data in session
        request.session['username'] = user.username
        request.session['login_time'] = int(time.time())
        request.session['theme_mode'] = 'light' if profile.is_dark_mode else 'dark'
        request.session['color_filter'] = 'colorblind' if profile.is_colorblind_mode else 'trichromatic'
        request.session['profile_image'] = profile.profile_image.url if profile.profile_image else None

        # Set tokens as cookies (matching signup/signin views)
        response = request.response if hasattr(request, 'response') else None
        if response:
            response.set_cookie(
                'access_token',
                access_token,
                max_age=int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds()),
                httponly=False,
                domain='localhost',
                path='/',
                secure=False,
                samesite='Lax'
            )
            response.set_cookie(
                'refresh_token',
                refresh_token,
                max_age=int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds()),
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
            logger.debug("Set JWT cookies for user %s: access_token=%s, refresh_token=%s",
                         user.username, access_token[:10], refresh_token[:10])
            messages.success(request, f"Successfully signed in as {user.username}.")
        else:
            # Store in session if no response object (fallback)
            request.session['jwt_access_token'] = access_token
            request.session['jwt_refresh_token'] = refresh_token
            request.session['set_jwt_cookies'] = True
            logger.debug("Stored JWT tokens in session for user %s: access_token=%s, refresh_token=%s",
                         user.username, access_token[:10], refresh_token[:10])
    except Exception as e:
        logger.error("Error in set_jwt_cookies for user %s: %s", user.username, str(e))
        messages.error(request, "Error during login. Please try again.")

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """
    Create a Profile for the User when the User is first created.
    """
    if created and not hasattr(instance, 'profile'):
        Profile.objects.create(user=instance)
        UserProfiles.objects.create(
            user=instance,
            is_dark_mode=False,
            is_colorblind_mode=False,
            profile_image=None
        )
        logger.debug("Created Profile and UserProfiles for new user: %s", instance.username)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """
    Save the Profile when the User is saved.
    """
    if hasattr(instance, 'profile'):
        instance.profile.save()
        logger.debug("Saved Profile for user: %s", instance.username)