from django.db import models


class Company(models.Model):
    symbol = models.CharField(max_length=10, unique=True)
    name = models.CharField(max_length=200)
    sector = models.CharField(max_length=100)
    description = models.TextField(blank=True)

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
    company = models.ForeignKey(Company, related_name="events", on_delete=models.CASCADE)
    headline = models.CharField(max_length=500)
    event_type = models.CharField(max_length=30, choices=EVENT_TYPES)
    sentiment_score = models.FloatField(help_text="-1.0 (very negative) to 1.0 (very positive)")
    magnitude = models.FloatField(help_text="0-1 estimated significance of the event")
    published_at = models.DateTimeField()
    source = models.CharField(max_length=100, blank=True)

    class Meta:
        indexes = [models.Index(fields=["company", "published_at"])]

    def __str__(self):
        return f"{self.company.symbol}: {self.headline[:60]}"


class BacktestPattern(models.Model):
    """Aggregate historical stats for a (trigger event type, relationship type, direction) combo."""
    trigger_event_type = models.CharField(max_length=30)
    relationship_type = models.CharField(max_length=20)
    window_days = models.IntegerField()
    sample_size = models.IntegerField()
    hit_rate = models.FloatField(help_text="Fraction of historical instances where the predicted direction occurred")
    avg_move_pct = models.FloatField()
    predicted_direction = models.CharField(max_length=10, choices=[("up", "Up"), ("down", "Down")])
    computed_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("trigger_event_type", "relationship_type", "window_days")

    def __str__(self):
        return f"{self.trigger_event_type} x {self.relationship_type} ({self.window_days}d): {self.hit_rate:.0%}"


class GeneratedChain(models.Model):
    trigger_event = models.ForeignKey(NewsEvent, related_name="generated_chains", on_delete=models.CASCADE)
    affected_company = models.ForeignKey(Company, related_name="affected_by_chains", on_delete=models.CASCADE)
    relationship_type = models.CharField(max_length=20)
    predicted_direction = models.CharField(max_length=10)
    model_confidence = models.FloatField(help_text="Probability from the logistic regression model")
    backtest_hit_rate = models.FloatField(null=True, blank=True)
    explanation = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.trigger_event.company.symbol} -> {self.affected_company.symbol}"
