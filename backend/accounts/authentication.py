from rest_framework.authentication import SessionAuthentication


class SpaSessionAuthentication(SessionAuthentication):
    """Development-only session authentication for the trusted local SPA origin.

    V1 already uses CSRF-exempt cookie authentication for login/logout. This
    keeps authenticated configuration requests consistent until the project
    moves to a CSRF-token strategy for production deployment.
    """

    def enforce_csrf(self, request):
        return
