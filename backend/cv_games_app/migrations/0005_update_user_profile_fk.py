from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('cv_games_app', '0004_userprofiles'),
    ]

    operations = [
        migrations.RunSQL(
            sql=[
                """
                DO $$
                DECLARE
                    constraint_name text;
                BEGIN
                    SELECT conname INTO constraint_name
                    FROM pg_constraint
                    WHERE conrelid = 'user_profiles'::regclass
                    AND confrelid = 'auth_user'::regclass
                    AND contype = 'f';
                    IF constraint_name IS NOT NULL THEN
                        EXECUTE 'ALTER TABLE public.user_profiles DROP CONSTRAINT ' || quote_ident(constraint_name);
                    END IF;
                    ALTER TABLE public.user_profiles
                    ADD CONSTRAINT user_profiles_user_id_fkey
                    FOREIGN KEY (user_id) REFERENCES public.auth_user(id) ON DELETE CASCADE;
                END $$;
                """
            ],
            reverse_sql=[
                """
                ALTER TABLE public.user_profiles DROP CONSTRAINT user_profiles_user_id_fkey;
                ALTER TABLE public.user_profiles
                ADD CONSTRAINT user_profiles_user_id_fkey
                FOREIGN KEY (user_id) REFERENCES public.auth_user(id) ON DELETE CASCADE;
                """
            ],
        ),
    ]