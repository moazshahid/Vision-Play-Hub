import logging

logger = logging.getLogger(__name__)

class JWTCookieMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # Check if session flags are set
        if request.session.get('set_jwt_cookies'):
            access_token = request.session.get('jwt_access_token')
            refresh_token = request.session.get('jwt_refresh_token')
            if access_token and refresh_token:
                response.set_cookie(
                    'access_token',
                    access_token,
                    max_age=3600,
                    httponly=False,
                    domain='localhost',
                    path='/',
                    secure=False,
                    samesite='Lax'
                )
                response.set_cookie(
                    'refresh_token',
                    refresh_token,
                    max_age=86400,
                    httponly=True,
                    domain='localhost',
                    path='/',
                    secure=False,
                    samesite='Lax'
                )
                logger.debug("Set JWT cookies: access_token=%s, refresh_token=%s", 
                             access_token[:10], refresh_token[:10])
                
                # Clear session flags
                request.session.pop('set_jwt_cookies', None)
                request.session.pop('jwt_access_token', None)
                request.session.pop('jwt_refresh_token', None)
            else:
                logger.error("No JWT tokens found in session for user %s", 
                             getattr(request.user, 'username', 'anonymous'))
        
        return response