from django.contrib.auth import authenticate, login, logout
from django.conf import settings
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from cryptography.fernet import Fernet, InvalidToken
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from .authentication import SpaSessionAuthentication


@csrf_exempt
@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def signup(request):
    data = request.data
    if User.objects.filter(username=data.get("username")).exists():
        return Response({"errors": {"username": ["Already taken."]}}, status=400)
    user = User.objects.create_user(
        username=data.get("username"),
        email=data.get("email", ""),
        password=data.get("password"),
    )
    login(request, user)
    return Response({"id": user.id, "username": user.username, "email": user.email}, status=201)


@csrf_exempt
@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def login_view(request):
    data = request.data
    user = authenticate(request, username=data.get("username"), password=data.get("password"))
    if user is None:
        return Response({"detail": "Incorrect username or password."}, status=401)
    login(request, user)
    return Response({"id": user.id, "username": user.username, "email": user.email})


@csrf_exempt
@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def logout_view(request):
    logout(request)
    return Response({"message": "Logged out."})


@api_view(["GET"])
@permission_classes([AllowAny])
def me(request):
    if not request.user.is_authenticated:
        return Response({"detail": "Not authenticated."}, status=401)
    u = request.user
    return Response({"id": u.id, "username": u.username, "email": u.email})


def _cipher():
    return Fernet(settings.FIELD_ENCRYPTION_KEY.encode())


def _settings_payload(user_settings):
    key_set = bool(user_settings.gemini_api_key_encrypted)
    key_suffix = ""
    if key_set:
        try:
            key_suffix = _cipher().decrypt(user_settings.gemini_api_key_encrypted.encode()).decode()[-4:]
        except (InvalidToken, UnicodeDecodeError):
            # Do not expose or log encrypted values if an old key cannot decrypt them.
            key_set = False
    return {
        "key_set": key_set,
        "key_suffix": key_suffix,
        "gemini_model": user_settings.gemini_model,
        "ingest_delay_seconds": user_settings.ingest_delay_seconds,
        "prefer_events": user_settings.prefer_events,
    }


@csrf_exempt
@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
@authentication_classes([SpaSessionAuthentication])
def llm_settings(request):
    from .models import UserSettings

    user_settings, _ = UserSettings.objects.get_or_create(user=request.user)
    if request.method == "GET":
        return Response(_settings_payload(user_settings))

    data = request.data
    model = data.get("gemini_model", user_settings.gemini_model)
    delay = data.get("ingest_delay_seconds", user_settings.ingest_delay_seconds)
    prefer_events = data.get("prefer_events", user_settings.prefer_events)
    api_key = data.get("gemini_api_key")

    if not isinstance(model, str) or not model.strip() or len(model) > 100:
        return Response({"detail": "Enter a valid Gemini model name."}, status=400)
    try:
        delay = float(delay)
    except (TypeError, ValueError):
        return Response({"detail": "Ingest delay must be a number."}, status=400)
    if not 0 <= delay <= 60:
        return Response({"detail": "Ingest delay must be between 0 and 60 seconds."}, status=400)
    if not isinstance(prefer_events, bool):
        return Response({"detail": "Prefer events must be true or false."}, status=400)
    if api_key is not None:
        if not isinstance(api_key, str):
            return Response({"detail": "Gemini key must be text."}, status=400)
        if api_key.strip():
            user_settings.gemini_api_key_encrypted = _cipher().encrypt(api_key.strip().encode()).decode()
        elif data.get("clear_api_key") is True:
            user_settings.gemini_api_key_encrypted = ""

    user_settings.gemini_model = model.strip()
    user_settings.ingest_delay_seconds = delay
    user_settings.prefer_events = prefer_events
    user_settings.save()
    return Response(_settings_payload(user_settings))


@csrf_exempt
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@authentication_classes([SpaSessionAuthentication])
def test_llm_connection(request):
    from .models import UserSettings

    user_settings, _ = UserSettings.objects.get_or_create(user=request.user)
    if not user_settings.gemini_api_key_encrypted:
        return Response({"detail": "Save a Gemini API key before testing the connection."}, status=400)
    try:
        api_key = _cipher().decrypt(user_settings.gemini_api_key_encrypted.encode()).decode()
        from google import genai
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=user_settings.gemini_model,
            contents="Reply with exactly: connection ok",
        )
        if not (response.text or "").strip():
            raise RuntimeError("Gemini returned an empty response")
    except Exception:
        # Deliberately do not send provider details, which can contain sensitive request data.
        return Response({"detail": "Could not reach Gemini. Check the key, model, and network, then try again."}, status=400)
    return Response({"detail": "Gemini connection verified."})
