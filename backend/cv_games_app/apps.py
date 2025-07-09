from django.apps import AppConfig


class CvGamesAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'cv_games_app'

    def ready(self):
        import cv_games_app.signals
