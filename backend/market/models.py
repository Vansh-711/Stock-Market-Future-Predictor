from django.db import models
from django.conf import settings
import uuid


class Company(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="companies", null=True)
    symbol = models.CharField(max_length=10)
    name = models.CharField(max_length=200)
    sector = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    class Meta:
        unique_together = ("user", "symbol")

    def __str__(self):
        return self.symbol


class Relationship(models.Model):
    REL_TYPES = [
        ("supplier", "Supplier"),
        ("customer", "Customer"),
        ("competitor", "Competitor"),
        ("peer", "Sector peer"),
    ]
    company = models.ForeignKey(Company, related_name="relationships_from", on_delete=models.CASCADE)
    related_company = models.ForeignKey(Company, related_name="relationships_to", on_delete=models.CASCADE)
    relationship_type = models.CharField(max_length=20, choices=REL_TYPES)
    notes = models.CharField(max_length=300, blank=True)

    class Meta:
        unique_together = ("company", "related_company", "relationship_type")

    def __str__(self):
        return f"{self.company.symbol} -{self.relationship_type}-> {self.related_company.symbol}"


class NewsEvent(models.Model):
    EVENT_TYPES = [
        ("earnings_beat", "Earnings beat"),
        ("earnings_miss", "Earnings miss"),
        ("guidance_cut", "Guidance cut"),
        ("guidance_raise", "Guidance raise"),
        ("supply_disruption", "Supply disruption"),
        ("regulatory", "Regulatory action"),
        ("product_launch", "Product launch"),
        ("lawsuit", "Lawsuit"),
        ("other", "Other"),
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="news_events", null=True)
    company = models.ForeignKey(Company, related_name="events", on_delete=models.CASCADE)
    headline = models.CharField(max_length=500)
    event_type = models.CharField(max_length=30, choices=EVENT_TYPES)
    sentiment_score = models.FloatField(help_text="-1.0 (very negative) to 1.0 (very positive)")
    magnitude = models.FloatField(help_text="0-1 estimated significance of the event")
    published_at = models.DateTimeField()
    source = models.CharField(max_length=100, blank=True)
    is_live = models.BooleanField(default=False, help_text="True if ingested via live scheduler, False if from historical CSV upload")
    dedup_hash = models.CharField(max_length=64, blank=True, db_index=True, unique=True, null=True,
                                  help_text="SHA-256 of ticker+headline+date, prevents duplicate ingestion")

    class Meta:
        indexes = [models.Index(fields=["company", "published_at"])]

    @staticmethod
    def compute_dedup_hash(ticker: str, headline: str, published_date: str) -> str:
        """Deterministic hash for deduplication. Call before Gemini to avoid wasting LLM calls."""
        import hashlib
        raw = f"{ticker.upper().strip()}|{headline.strip()[:500]}|{published_date}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def __str__(self):
        return f"{self.company.symbol}: {self.headline[:60]}"


class BacktestPattern(models.Model):
    """Aggregate historical stats for a (trigger event type, relationship type, direction) combo."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="backtest_patterns", null=True)
    trigger_event_type = models.CharField(max_length=30)
    relationship_type = models.CharField(max_length=20)
    window_days = models.IntegerField()
    sample_size = models.IntegerField()
    hit_rate = models.FloatField(help_text="Fraction of historical instances where the predicted direction occurred")
    avg_move_pct = models.FloatField()
    predicted_direction = models.CharField(max_length=10, choices=[("up", "Up"), ("down", "Down")])
    computed_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "trigger_event_type", "relationship_type", "window_days")

    def __str__(self):
        return f"{self.trigger_event_type} x {self.relationship_type} ({self.window_days}d): {self.hit_rate:.0%}"


class GeneratedChain(models.Model):
    SOURCE_CHOICES = [
        ("backtest", "Historical Backtest"),
        ("live", "Live Market Data"),
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="generated_chains_list", null=True)
    trigger_event = models.ForeignKey(NewsEvent, related_name="generated_chains", on_delete=models.CASCADE)
    affected_company = models.ForeignKey(Company, related_name="affected_by_chains", on_delete=models.CASCADE)
    relationship_type = models.CharField(max_length=20)
    predicted_direction = models.CharField(max_length=10)
    model_confidence = models.FloatField(help_text="Probability from the logistic regression model")
    backtest_hit_rate = models.FloatField(null=True, blank=True)
    explanation = models.TextField()
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default="backtest")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.source}] {self.trigger_event.company.symbol} -> {self.affected_company.symbol}"


class PipelineJob(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("running", "Running"),
        ("completed", "Completed"),
        ("failed", "Failed"),
        ("cancelled", "Cancelled"),
    ]
    JOB_TYPE_CHOICES = [
        ("manual", "Manual Batch"),
        ("scheduled", "Scheduled Live Check"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="pipeline_jobs")
    job_type = models.CharField(max_length=20, choices=JOB_TYPE_CHOICES, default="manual")
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default="pending")
    current_phase = models.CharField(max_length=20, default="seed")
    progress_percent = models.FloatField(default=0)
    current_step = models.CharField(max_length=255, blank=True)
    items_total = models.PositiveIntegerField(default=0)
    items_done = models.PositiveIntegerField(default=0)
    upload_path = models.CharField(max_length=255, blank=True)
    adapter_id = models.CharField(max_length=50, blank=True)
    options_json = models.JSONField(default=dict, blank=True)
    cancel_requested = models.BooleanField(default=False)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.id} ({self.status})"


class PipelineLog(models.Model):
    LEVEL_CHOICES = [("info", "Info"), ("warning", "Warning"), ("error", "Error")]

    job = models.ForeignKey(PipelineJob, on_delete=models.CASCADE, related_name="logs")
    level = models.CharField(max_length=10, choices=LEVEL_CHOICES, default="info")
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
