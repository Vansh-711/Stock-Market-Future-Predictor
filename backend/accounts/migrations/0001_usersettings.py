# Generated manually for Signal Chain V2-B.
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="UserSettings",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("gemini_api_key_encrypted", models.TextField(blank=True)),
                ("gemini_model", models.CharField(default="gemini-3.1-flash-lite", max_length=100)),
                ("ingest_delay_seconds", models.FloatField(default=2.0)),
                ("prefer_events", models.BooleanField(default=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="signal_settings", to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
