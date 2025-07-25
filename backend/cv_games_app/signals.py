from django.contrib.auth.signals import user_logged_in
from django.db.models.signals import post_save
from django.contrib.auth.models import User
from django.dispatch import receiver
import logging
from .models import Profile  # Adjust the import if your app or model name differs

logger = logging.getLogger(__name__)

try:
    from rest_framework_simplejwt.tokens import RefreshToken
except ImportError as e:
    logger.error("Failed to import RefreshToken: %s", str(e))
    raise

@receiver(user_logged_in)
def set_jwt_cookies(sender, user, request, **kwargs):
    """
    Generate JWT tokens and store in session for middleware to set as httponly cookies.
    """
    logger.debug("User logged in: %s", user.username)
    try:
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        
        # Store tokens in session
        request.session['jwt_access_token'] = access_token
        request.session['jwt_refresh_token'] = refresh_token
        request.session['set_jwt_cookies'] = True
        logger.debug("Stored JWT tokens in session for user %s: access_token=%s, refresh_token=%s", 
                     user.username, access_token[:10], refresh_token[:10])
    except Exception as e:
        logger.error("Error generating JWT tokens for user %s: %s", user.username, str(e))

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """
    Create a Profile for the User when the User is first created.
    This ensures every new user has a Profile, complementing the signup view.
    """
    if created and not hasattr(instance, 'profile'):
        Profile.objects.create(user=instance)
        logger.debug("Created Profile for new user: %s", instance.username)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """
    Save the Profile when the User is saved, ensuring it stays in sync.
    This handles updates to the User that might affect the Profile.
    """
    if hasattr(instance, 'profile'):
        instance.profile.save()
        logger.debug("Saved Profile for user: %s", instance.username)