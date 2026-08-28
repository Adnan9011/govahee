from django.urls import path
from rest_framework_simplejwt.views import TokenBlacklistView

from accounts.views import (
    CookieTokenRefreshView,
    LoginView,
    LogoutView,
    RegisterView,
    SessionView,
    SetPasswordView,
)

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/session/", SessionView.as_view(), name="session"),
    path("auth/set-password/", SetPasswordView.as_view(), name="set-password"),
    path("token/", LoginView.as_view(), name="token"),
    path("token/refresh/", CookieTokenRefreshView.as_view(), name="token-refresh"),
    path("token/blacklist/", TokenBlacklistView.as_view(), name="token-blacklist"),
]
