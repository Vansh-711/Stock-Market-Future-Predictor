import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("market", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="PipelineJob",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("status", models.CharField(choices=[("pending", "Pending"), ("running", "Running"), ("completed", "Completed"), ("failed", "Failed"), ("cancelled", "Cancelled")], default="pending", max_length=12)),
                ("current_phase", models.CharField(default="seed", max_length=20)),
                ("progress_percent", models.FloatField(default=0)),
                ("current_step", models.CharField(blank=True, max_length=255)),
                ("items_total", models.PositiveIntegerField(default=0)),
                ("items_done", models.PositiveIntegerField(default=0)),
                ("options_json", models.JSONField(blank=True, default=dict)),
                ("cancel_requested", models.BooleanField(default=False)),
                ("error_message", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="pipeline_jobs", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="PipelineLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("level", models.CharField(choices=[("info", "Info"), ("warning", "Warning"), ("error", "Error")], default="info", max_length=10)),
                ("message", models.TextField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("job", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="logs", to="market.pipelinejob")),
            ],
            options={"ordering": ["created_at"]},
        ),
    ]
