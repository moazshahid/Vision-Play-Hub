from django.db import models
from django.contrib.auth.models import User

class Games(models.Model):
    game_id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=255)
    genre = models.CharField(max_length=100, null=True, blank=True)
    release_date = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'games'
        managed = False
        verbose_name_plural = 'Games'

    def __str__(self):
        return self.title
    
class UserProfiles(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    profile_image = models.ImageField(upload_to='profile_images/', blank=True, null=True)
    is_dark_mode = models.BooleanField(default=False)
    is_colorblind_mode = models.BooleanField(default=False)

    class Meta:
        db_table = 'user_profiles'
        verbose_name_plural = 'User Profiles'

class Sessions(models.Model):
    session_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    game = models.ForeignKey(Games, on_delete=models.CASCADE, db_column='game_id')
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    score = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = 'sessions'
        managed = False
        verbose_name_plural = 'Sessions'

class Leaderboards(models.Model):
    leaderboard_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    game = models.ForeignKey(Games, on_delete=models.CASCADE, db_column='game_id')
    ranking = models.IntegerField()
    score = models.IntegerField()
    last_updated = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'leaderboards'
        managed = False
        verbose_name_plural = 'Leaderboards'
        unique_together = ('user', 'game')

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    profile_picture = models.ImageField(upload_to='profile_pics/', null=True, blank=True)

    def __str__(self):
        return self.user.username

# Signal to create a profile when a user is created
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()
