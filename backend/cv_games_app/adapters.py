from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.contrib.auth.models import User
from .models import UserProfiles, Profile
import logging

logger = logging.getLogger(__name__)

class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    def save_user(self, request, sociallogin, form=None):
        user = super().save_user(request, sociallogin, form)
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
                logger.debug("Created UserProfiles for social user: %s", user.username)
            
            # Create Profile
            Profile.objects.get_or_create(user=user)
            logger.debug("Created Profile for social user: %s", user.username)

            # Store user data in session
            request.session['username'] = user.username
            request.session['theme_mode'] = 'light' if profile.is_dark_mode else 'dark'
            request.session['color_filter'] = 'colorblind' if profile.is_colorblind_mode else 'trichromatic'
            request.session['profile_image'] = profile.profile_image.url if profile.profile_image else None
        except Exception as e:
            logger.error("Error in CustomSocialAccountAdapter for user %s: %s", user.username, str(e))
        return user