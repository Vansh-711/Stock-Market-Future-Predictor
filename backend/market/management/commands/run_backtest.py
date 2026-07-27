"""
Walks every historical NewsEvent, finds companies related to the event's
company, checks what actually happened to the related company's price in
the following N days, and aggregates hit-rate stats into BacktestPattern.

This is the credibility layer of the project: it turns "the AI thinks X will
happen" into "historically, this exact pattern has happened Y% of the time".

Usage: python manage.py run_backtest
Requires price history to be loadable via a `get_price_change(symbol, date, window_days)`
function -- wire this to yfinance or a local CSV cache (see data/prices.py).
"""
from collections import defaultdict
from django.core.management.base import BaseCommand
from market.models import NewsEvent, Relationship, BacktestPattern
from market.data.prices import get_price_change

WINDOWS = [1, 5, 10]

# Which direction we'd expect the RELATED company to move, given the event
# type on the TRIGGER company, for each relationship type.
EXPECTED_DIRECTION = {
    ("earnings_beat", "supplier"): "up",
    ("earnings_beat", "competitor"): "down",
    ("earnings_beat", "peer"): "up",
    ("earnings_miss", "supplier"): "down",
    ("earnings_miss", "competitor"): "up",
    ("earnings_miss", "peer"): "down",
    ("supply_disruption", "customer"): "down",
    ("supply_disruption", "competitor"): "up",
    ("guidance_cut", "supplier"): "down",
    ("guidance_cut", "competitor"): "up",
    ("guidance_raise", "supplier"): "up",
    ("guidance_raise", "competitor"): "down",
}


class Command(BaseCommand):
    help = "Compute historical hit-rate backtest patterns from NewsEvent + Relationship data."

    def handle(self, *args, **options):
        stats = defaultdict(lambda: {"hits": 0, "total": 0, "moves": []})

        events = NewsEvent.objects.select_related("company").all()
        for event in events:
            related = Relationship.objects.filter(company=event.company).select_related("related_company")
            for rel in related:
                key_lookup = (event.event_type, rel.relationship_type)
                expected = EXPECTED_DIRECTION.get(key_lookup)
                if not expected:
                    continue
                for window in WINDOWS:
                    change_pct = get_price_change(
                        rel.related_company.symbol, event.published_at, window
                    )
                    if change_pct is None:
                        continue
                    actual = "up" if change_pct > 0 else "down"
                    key = (event.event_type, rel.relationship_type, window)
                    stats[key]["total"] += 1
                    stats[key]["moves"].append(change_pct)
                    if actual == expected:
                        stats[key]["hits"] += 1

        written = 0
        for (event_type, rel_type, window), s in stats.items():
            if s["total"] < 3:
                continue  # not enough samples to be meaningful
            hit_rate = s["hits"] / s["total"]
            avg_move = sum(s["moves"]) / len(s["moves"])
            BacktestPattern.objects.update_or_create(
                trigger_event_type=event_type,
                relationship_type=rel_type,
                window_days=window,
                defaults={
                    "sample_size": s["total"],
                    "hit_rate": round(hit_rate, 4),
                    "avg_move_pct": round(avg_move, 4),
                    "predicted_direction": EXPECTED_DIRECTION[(event_type, rel_type)],
                },
            )
            written += 1

        self.stdout.write(self.style.SUCCESS(f"Wrote {written} backtest patterns."))
