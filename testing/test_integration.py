import os
import sys
from django.test import TestCase, Client
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from cv_games_app.models import Games

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cv_games.settings')

import django
django.setup()


class BackendSecurityAndDeploymentTests(TestCase):

    def setUp(self):
        self.client = Client()
        self.api_client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.fake_token = 'Bearer faketoken123'
    
    #This test targets the backend endpoint (/accounts/google/login/) and verifies its integration with the authentication system
    def test_google_auth_login_redirect(self):
        # Since actual Google OAuth needs external setup, test that the endpoint exists and redirects
        response = self.client.get('/accounts/google/login/')
        self.assertIn(response.status_code, [302, 301])

    #By testing the signup and login endpoints, this test directly addresses backend authentication endpoints, ensuring their integration with the user management system
    def test_manual_signup_and_login(self):
        signup_response = self.client.post('/auth/signup/', {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'strongpass123'
        })
        self.assertIn(signup_response.status_code, [200, 201])

        login_response = self.client.post('/auth/login/', {
            'username': 'newuser',
            'password': 'strongpass123'
        })
        self.assertIn(login_response.status_code, [200, 302])

    #This test targets session-related backend functionality, verifying database and session storage integration
    def test_cookies_and_session_management(self):
        login = self.client.login(username='testuser', password='testpass')
        self.assertTrue(login)

        # After login, session cookie should exist
        self.assertIn('sessionid', self.client.cookies)

        # Reload or new tab simulation (another client instance)
        new_client = Client()
        new_client.cookies = self.client.cookies
        response = new_client.get('/')
        self.assertIn(response.status_code, [200, 302])

        # Logout should clear session cookie
        self.client.logout()
        self.assertNotIn('sessionid', self.client.cookies or {})

    #By testing the database’s password storage mechanism, this test ensures the integrity of user data in the backend
    def test_password_encryption(self):
        user = User.objects.create_user(username='encryptuser', password='mypassword')
        self.assertNotEqual(user.password, 'mypassword')  # Password is hashed
        self.assertTrue(user.password.startswith('pbkdf2_'))

    #This test targets a database endpoint by ensuring the Games table functions correctly
    def test_games_table_integrity(self):
        game = Games.objects.create(title='Test Game')
        self.assertIsNotNone(game.pk)

    #By testing the signup endpoint’s error handling, this test ensures reliable backend behavior
    def test_signup_with_invalid_email(self):
        response = self.client.post('/auth/signup/', {
            'username': 'userinvalid',
            'email': 'invalid-email',
            'password': 'password123'
        })
        self.assertNotIn(response.status_code, [500])
        self.assertIn(response.status_code, [400, 200])

    #This test focuses on the login endpoint’s error handling, ensuring integration with the authentication system
    def test_login_with_invalid_credentials(self):
        response = self.client.post('/auth/login/', {
            'username': 'wronguser',
            'password': 'wrongpass'
        })
        self.assertIn(response.status_code, [200, 302])
        self.assertIn(b"Invalid", response.content or b"")

    #This test validates backend security and database integration
    def test_unauthenticated_access_denied(self):
        response = self.api_client.post('/auth/api/submit-score/', {'game': 1, 'score': 100})
        self.assertIn(response.status_code, [401, 403])

    #This test targets a critical backend endpoint, ensuring secure database interactions
    def test_score_submission_with_fake_token(self):
        self.api_client.credentials(HTTP_AUTHORIZATION=self.fake_token)
        response = self.api_client.post('/auth/api/submit-score/', {'game': 1, 'score': 100})
        self.assertIn(response.status_code, [401, 403])

    #This test targets the leaderboard endpoint’s authentication and database retrieval
    def test_leaderboard_requires_auth(self):
        try:
            response = self.client.get('/auth/leaderboard/')
            self.assertIn(response.status_code, [401, 403])
        except Exception as e:
            self.fail(f"Leaderboard crashed with error: {e}")


