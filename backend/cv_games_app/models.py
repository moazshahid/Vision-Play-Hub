from django.db import models
from accounts.models import Users

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

class Sessions(models.Model):
    session_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(Users, on_delete=models.CASCADE, db_column='user_id')
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
    user = models.ForeignKey(Users, on_delete=models.CASCADE, db_column='user_id')
    game = models.ForeignKey(Games, on_delete=models.CASCADE, db_column='game_id')
    ranking = models.IntegerField()
    score = models.IntegerField()
    last_updated = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'leaderboards'
        managed = False
        verbose_name_plural = 'Leaderboards'
        unique_together = ('user', 'game')
