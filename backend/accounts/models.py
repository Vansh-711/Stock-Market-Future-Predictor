from django.db import models
from django.contrib.auth.models import User


class UserSettings(models.Model):
    """Per-user LLM preferences. The API key is always stored encrypted."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="signal_settings")
    gemini_api_key_encrypted = models.TextField(blank=True)
    gemini_model = models.CharField(max_length=100, default="gemini-3.1-flash-lite")
    ingest_delay_seconds = models.FloatField(default=2.0)
    prefer_events = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Settings for {self.user.username}"

# Create your models here.
