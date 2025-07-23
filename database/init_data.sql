--
-- PostgreSQL database initialization
--

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET client_min_messages = warning;

--
-- Create games table
--

CREATE TABLE public.games (
    game_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL UNIQUE,
    genre VARCHAR(100),
    release_date DATE
);

ALTER TABLE public.games OWNER TO cv_games_user;

--
-- Create leaderboards table
--

CREATE TABLE public.leaderboards (
    leaderboard_id SERIAL PRIMARY KEY,
    ranking INTEGER NOT NULL,
    score INTEGER NOT NULL,
    last_updated TIMESTAMP WITHOUT TIME ZONE,
    user_id INTEGER,
    game_id INTEGER,
    CONSTRAINT leaderboards_user_id_game_id_key UNIQUE (user_id, game_id),
    CONSTRAINT leaderboards_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(game_id),
    CONSTRAINT leaderboards_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_user(id)
);

ALTER TABLE public.leaderboards OWNER TO cv_games_user;

--
-- Create sessions table
--

CREATE TABLE public.sessions (
    session_id SERIAL PRIMARY KEY,
    start_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    end_time TIMESTAMP WITHOUT TIME ZONE,
    score INTEGER,
    user_id INTEGER,
    game_id INTEGER,
    CONSTRAINT sessions_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(game_id),
    CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_user(id)
);

ALTER TABLE public.sessions OWNER TO cv_games_user;

--
-- Insert games data
--

INSERT INTO public.games (title, genre, release_date) VALUES
    ('SnakeGame', 'Arcade', '2025-05-23'),
    ('Whack-A-Mole', 'Casual', '2025-05-23'),
    ('Dessert Slash', 'Action', '2025-06-02'),
    ('Air Hockey', 'Sports', '2025-06-05'),
    ('SurfDash', 'Action', '2025-07-06'),
    ('Tetris', 'Puzzle', '2025-07-06'),
    ('SpaceWars', 'Arcade', '2025-07-16')
ON CONFLICT (title) DO NOTHING;

--
-- Insert default site for django.contrib.sites
--

INSERT INTO public.django_site (id, domain, name) VALUES
    (1, 'localhost:8000', 'localhost')
ON CONFLICT (id) DO NOTHING;

--
-- Insert default social app for django-allauth
--

INSERT INTO public.socialaccount_socialapp (id, provider, provider_id, name, client_id, secret, key, settings) VALUES
    (1, 'google', 'google', 'Google', '772340795124-8bhbar3gft6vdoc8cjkkkmkh1dndl1vk.apps.googleusercontent.com', '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','','{}')
ON CONFLICT (id) DO NOTHING;

--
-- Insert social app site mapping
--

INSERT INTO public.socialaccount_socialapp_sites (id, socialapp_id, site_id) VALUES
    (1, 1, 1)
ON CONFLICT (id) DO NOTHING;

--
-- Grant privileges
--

ALTER DEFAULT PRIVILEGES FOR ROLE cv_games_user IN SCHEMA public GRANT ALL ON TABLES TO cv_games_user;

--
-- Database initialization complete
--