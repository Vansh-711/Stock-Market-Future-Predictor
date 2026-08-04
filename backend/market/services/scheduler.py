"""
Layer 2 — APScheduler-based live news ingestion scheduler.

Runs `run_live_ingest` for every user every N minutes.
Guarantees only one instance runs at a time (max_instances=1).
Logs every run outcome (success, partial failure, full failure).

Usage:
    from market.services.scheduler import start_scheduler, stop_scheduler
    start_scheduler()   # call once at app startup
    stop_scheduler()    # call on shutdown

DEPLOYMENT WARNING:
    Under gunicorn/uvicorn with multiple workers, each worker process will
    call AppConfig.ready() independently, spawning duplicate schedulers.
    To prevent this in production, either:
      1. Run with --workers 1 (simplest for a POC), OR
      2. Use gunicorn's --preload flag (runs ready() once before forking), OR
      3. Move the scheduler to a dedicated management command:
         `python manage.py run_live_scheduler` in a separate process/container.
"""
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.events import EVENT_JOB_ERROR, EVENT_JOB_EXECUTED

logger = logging.getLogger("signal_chain.scheduler")

_scheduler = None


def _run_scheduled_ingest():
    """
    The actual scheduled job. Runs inside APScheduler's thread pool.
    Imports are deferred to avoid AppRegistryNotReady errors.
    """
    from django.contrib.auth.models import User
    from market.services.live_ingest import run_live_ingest

    users = User.objects.all()
    for user in users:
        try:
            result = run_live_ingest(user)
            logger.info(
                f"[Scheduled] user={user.username} "
                f"created={result['created']} skipped={result['skipped']} "
                f"errors={len(result['errors'])}"
            )
            if result["errors"]:
                for err in result["errors"][:5]:  # cap log spam
                    logger.warning(f"[Scheduled] user={user.username} error: {err}")
        except Exception as exc:
            logger.error(f"[Scheduled] FATAL for user={user.username}: {exc}", exc_info=True)


def _job_listener(event):
    """APScheduler event listener for logging job outcomes."""
    if event.exception:
        logger.error(f"[Scheduler] Job crashed: {event.exception}", exc_info=True)
    else:
        logger.debug("[Scheduler] Job completed successfully.")


def start_scheduler(interval_minutes=15):
    """
    Start the background scheduler. Safe to call multiple times — 
    will not start a second scheduler if one is already running.
    """
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        logger.info("[Scheduler] Already running, skipping duplicate start.")
        return

    _scheduler = BackgroundScheduler(daemon=True)
    _scheduler.add_job(
        _run_scheduled_ingest,
        trigger="interval",
        minutes=interval_minutes,
        id="live_news_ingest",
        max_instances=1,           # <-- prevents overlapping runs
        replace_existing=True,
        coalesce=True,             # if multiple missed fires, run only once
    )
    _scheduler.add_listener(_job_listener, EVENT_JOB_ERROR | EVENT_JOB_EXECUTED)
    _scheduler.start()
    logger.info(f"[Scheduler] Started — live ingest every {interval_minutes} minutes (max_instances=1)")


def stop_scheduler():
    """Gracefully shut down the scheduler."""
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("[Scheduler] Stopped.")
        _scheduler = None
