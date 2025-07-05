from django.contrib.auth.signals import user_logged_in
from django.dispatch import receiver
import logging

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