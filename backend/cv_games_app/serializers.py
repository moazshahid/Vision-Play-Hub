from rest_framework import serializers
from .models import UserProfiles

class UserProfileSerializer(serializers.ModelSerializer):
    profile_image = serializers.ImageField(use_url=True)

    class Meta:
        model = UserProfiles
        fields = ['is_dark_mode', 'is_colorblind_mode', 'profile_image']