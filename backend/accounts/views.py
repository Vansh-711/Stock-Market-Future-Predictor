from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


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
