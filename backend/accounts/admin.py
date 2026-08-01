from django.contrib import admin
from .models import UserSettings


@admin.register(UserSettings)
class UserSettingsAdmin(admin.ModelAdmin):
    list_display = ("user", "gemini_model", "prefer_events", "updated_at")
    readonly_fields = ("gemini_api_key_encrypted", "updated_at")

# Register your models here.
