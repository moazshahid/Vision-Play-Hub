from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('cv_games_app', '0004_userprofiles'),
    ]

    operations = [
        migrations.RunSQL(
            sql=[
                'ALTER TABLE public.user_profiles DROP CONSTRAINT user_profiles_user_id_fkey;',
                'ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_user(id) ON DELETE CASCADE;',
            ],
            reverse_sql=[
                'ALTER TABLE public.user_profiles DROP CONSTRAINT user_profiles_user_id_fkey;',
                'ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;',
            ],
        ),
    ]