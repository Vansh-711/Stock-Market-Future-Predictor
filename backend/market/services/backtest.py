from collections import defaultdict
from market.models import NewsEvent, Relationship, BacktestPattern, PipelineJob
from market.data.prices import get_price_change

WINDOWS = [1, 5, 10]

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

def run_backtest(job_id):
    from market.pipeline import add_log, update_job
    try:
        job = PipelineJob.objects.get(id=job_id)
        update_job(job, status="running", current_step="Gathering events and relationships", progress_percent=10)
        
        stats = defaultdict(lambda: {"hits": 0, "total": 0, "moves": []})
        events = NewsEvent.objects.select_related("company").all()
        total_events = events.count()
        
        update_job(job, items_total=total_events, items_done=0, current_step="Fetching historical prices")
        
        processed = 0
        for idx, event in enumerate(events):
            if idx % 10 == 0:
                job.refresh_from_db()
                if job.cancel_requested:
                    update_job(job, status="cancelled", current_step="Cancelled by user")
                    add_log(job, "Backtest cancelled.", "warning")
                    return
                pct = 10 + (idx / max(total_events, 1) * 80)
                update_job(job, items_done=idx, progress_percent=pct)

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
            processed += 1

        update_job(job, current_step="Writing patterns", progress_percent=95)
        
        written = 0
        for (event_type, rel_type, window), s in stats.items():
            if s["total"] < 3:
                continue
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

        update_job(job, status="completed", current_step="Backtest complete", progress_percent=100, items_done=total_events)
        add_log(job, f"Backtest completed: computed {written} patterns from {total_events} events.")
    except Exception as exc:
        job = PipelineJob.objects.filter(id=job_id).first()
        if job:
            update_job(job, status="failed", current_step="Backtest failed", error_message=str(exc))
            add_log(job, f"Backtest error: {type(exc).__name__}", "error")
